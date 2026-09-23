import { createFileRoute } from "@tanstack/react-router";

import { dispatchAlert } from "@/lib/alert-dispatch.server";
import { errorResponse, isResponse, json, requireUser } from "@/lib/api.server";

export const Route = createFileRoute("/api/public/alerts/$id/notify")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const auth = await requireUser(request);
        if (isResponse(auth)) return auth;

        const dispatched = await dispatchAlert(auth.supabase, params.id);
        if (!dispatched.ok) return errorResponse(dispatched.error, dispatched.status);

        return json({ ...dispatched.alert, state: "notified" });
      },
    },
  },
});
