import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { errorResponse, json, publicClient, readJson } from "@/lib/api.server";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const Route = createFileRoute("/api/public/auth/signup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = schema.safeParse(await readJson(request));
        if (!parsed.success) return errorResponse("email and password (min 8 chars) required");

        const supabase = publicClient();
        const { data, error } = await supabase.auth.signUp(parsed.data);
        if (error) return errorResponse(error.message, 400);

        return json({
          user_id: data.user?.id ?? null,
          email: data.user?.email ?? null,
          // null until the email address is confirmed
          access_token: data.session?.access_token ?? null,
          refresh_token: data.session?.refresh_token ?? null,
          email_confirmation_required: data.session === null,
        });
      },
    },
  },
});
