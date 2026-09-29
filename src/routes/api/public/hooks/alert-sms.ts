import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { dispatchAlert } from "@/lib/alert-dispatch.server";

const schema = z.object({ alert_id: z.string().uuid() });

// Called by the database trigger on every new alerts row.
export const Route = createFileRoute("/api/public/hooks/alert-sms")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = request.headers.get("x-hook-secret");
        if (!secret || secret.length > 200) return new Response("Unauthorized", { status: 401 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: valid } = await supabaseAdmin.rpc("verify_alert_hook_secret", { _secret: secret });
        if (!valid) {
          console.warn("[alert-sms] Rejected hook call with bad secret");
          return new Response("Unauthorized", { status: 401 });
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "invalid json" }, { status: 400 });
        }
        const parsed = schema.safeParse(body);
        if (!parsed.success) return Response.json({ error: "invalid payload" }, { status: 400 });

        const r = await dispatchAlert(supabaseAdmin, parsed.data.alert_id);
        if (!r.ok) return Response.json({ error: r.error }, { status: r.status });
        return Response.json({
          ok: true,
          duplicate: r.duplicate ?? false,
          delivered: Array.isArray(r.alert.delivery_status) ? r.alert.delivery_status.length : 0,
        });
      },
    },
  },
});
