import { createFileRoute } from "@tanstack/react-router";

import { errorResponse, isResponse, json, requireUser } from "@/lib/api.server";

export const Route = createFileRoute("/api/public/user/profile")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireUser(request);
        if (isResponse(auth)) return auth;

        const supabaseUrl = process.env.SUPABASE_URL!;
        const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY!;
        const authHeader = request.headers.get("authorization");

        const response = await fetch(`${supabaseUrl}/functions/v1/keystroke-similarity/profile`, {
          method: "GET",
          headers: {
            Authorization: authHeader || "",
            apikey: supabaseKey,
          },
        });

        const data = await response.json();
        if (!response.ok) return errorResponse(data.error || "Failed to fetch profile", response.status);

        return json(data);
      },
    },
  },
});