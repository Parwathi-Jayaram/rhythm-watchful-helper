import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { errorResponse, json, publicClient, readJson } from "@/lib/api.server";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const Route = createFileRoute("/api/public/auth/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = schema.safeParse(await readJson(request));
        if (!parsed.success) return errorResponse("email and password required");

        const supabase = publicClient();
        const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
        if (error || !data.session) return errorResponse("Invalid email or password", 401);

        return json({
          user_id: data.user.id,
          email: data.user.email,
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
        });
      },
    },
  },
});
