import { createFileRoute } from "@tanstack/react-router";

import { errorResponse, isResponse, json, requireUser } from "@/lib/api.server";

export const Route = createFileRoute("/api/public/contacts/$id")({
  server: {
    handlers: {
      DELETE: async ({ request, params }) => {
        const auth = await requireUser(request);
        if (isResponse(auth)) return auth;

        const { data, error } = await auth.supabase
          .from("emergency_contacts")
          .delete()
          .eq("id", params.id)
          .select("id")
          .maybeSingle();

        if (error) return errorResponse(error.message, 400);
        if (!data) return errorResponse("Contact not found", 404);
        return json({ deleted: data.id });
      },
    },
  },
});
