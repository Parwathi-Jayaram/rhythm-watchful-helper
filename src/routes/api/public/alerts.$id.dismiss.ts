import { createFileRoute } from "@tanstack/react-router";

import { errorResponse, isResponse, json, requireUser } from "@/lib/api.server";

const GRACE_WINDOW_SECONDS = 90;

export const Route = createFileRoute("/api/public/alerts/$id/dismiss")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const auth = await requireUser(request);
        if (isResponse(auth)) return auth;

        const { data: alert, error } = await auth.supabase
          .from("alerts")
          .select("id, triggered_at, notification_sent_at")
          .eq("id", params.id)
          .maybeSingle();

        if (error) return errorResponse(error.message, 400);
        if (!alert) return errorResponse("Alert not found", 404);

        const elapsedSeconds =
          (Date.now() - new Date(alert.triggered_at).getTime()) / 1000;
        const withinGraceWindow = elapsedSeconds <= GRACE_WINDOW_SECONDS;

        const { data: updated, error: updateError } = await auth.supabase
          .from("alerts")
          .update({ user_response: "dismissed" })
          .eq("id", params.id)
          .select("*")
          .single();

        if (updateError) return errorResponse(updateError.message, 400);

        return json({
          ...updated,
          within_grace_window: withinGraceWindow,
          cancelled_before_send: alert.notification_sent_at === null,
          grace_window_seconds: GRACE_WINDOW_SECONDS,
        });
      },
    },
  },
});
