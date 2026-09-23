import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { dispatchAlert } from "@/lib/alert-dispatch.server";
import { errorResponse, isResponse, json, readJson, requireUser } from "@/lib/api.server";

const schema = z.object({
  combined_score: z.number().optional(),
  triggered_at: z.string().datetime().optional(),
  // 0 notifies right away; 60-90 holds the alert open for a local cancel.
  grace_seconds: z.number().int().min(0).max(90).optional(),
});

export const Route = createFileRoute("/api/public/alerts/trigger")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireUser(request);
        if (isResponse(auth)) return auth;

        const parsed = schema.safeParse(await readJson(request));
        if (!parsed.success) return errorResponse("invalid payload");

        const graceSeconds = parsed.data.grace_seconds ?? 0;

        const { data: alert, error } = await auth.supabase
          .from("alerts")
          .insert({
            user_id: auth.userId,
            combined_score: parsed.data.combined_score ?? null,
            triggered_at: parsed.data.triggered_at ?? new Date().toISOString(),
          })
          .select("*")
          .single();

        if (error) return errorResponse(error.message, 400);

        if (graceSeconds > 0) {
          return json(
            {
              ...alert,
              grace_seconds: graceSeconds,
              state: "awaiting_grace_window",
            },
            201,
          );
        }

        const dispatched = await dispatchAlert(auth.supabase, alert.id);
        if (!dispatched.ok) return errorResponse(dispatched.error, dispatched.status);

        return json({ ...dispatched.alert, state: "notified" }, 201);
      },
    },
  },
});
