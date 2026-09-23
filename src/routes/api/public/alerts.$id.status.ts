import { createFileRoute } from "@tanstack/react-router";

import { errorResponse, isResponse, json, requireUser } from "@/lib/api.server";

export const Route = createFileRoute("/api/public/alerts/$id/status")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const auth = await requireUser(request);
        if (isResponse(auth)) return auth;

        const { data, error } = await auth.supabase
          .from("alerts")
          .select("*")
          .eq("id", params.id)
          .maybeSingle();

        if (error) return errorResponse(error.message, 400);
        if (!data) return errorResponse("Alert not found", 404);

        const state = data.user_response === "dismissed"
          ? "dismissed"
          : data.notification_sent_at
            ? "notified"
            : "pending";

        return json({ ...data, state });
      },
    },
  },
});
