import { createFileRoute } from "@tanstack/react-router";

import { errorResponse, isResponse, json, requireUser } from "@/lib/api.server";
import { sendVerification } from "@/lib/contact-verification.server";

export const Route = createFileRoute("/api/public/contacts/$id/send-verification")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const auth = await requireUser(request);
        if (isResponse(auth)) return auth;
        const r = await sendVerification(auth.supabase, params.id, auth.email ?? "A Rhythm user", {
          enforceCooldown: true,
        });
        return r.ok ? json(r) : errorResponse(r.error, r.status);
      },
    },
  },
});
