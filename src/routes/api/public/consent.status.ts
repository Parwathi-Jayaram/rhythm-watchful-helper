import { createFileRoute } from "@tanstack/react-router";

import { errorResponse, isResponse, json, requireUser } from "@/lib/api.server";

export const Route = createFileRoute("/api/public/consent/status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireUser(request);
        if (isResponse(auth)) return auth;

        const { data, error } = await auth.supabase
          .from("consents")
          .select("id, consent_given, consent_timestamp, consent_version")
          .order("consent_timestamp", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) return errorResponse(error.message, 400);

        return json({
          consent_given: data?.consent_given ?? false,
          consent_timestamp: data?.consent_timestamp ?? null,
          consent_version: data?.consent_version ?? null,
        });
      },
    },
  },
});
