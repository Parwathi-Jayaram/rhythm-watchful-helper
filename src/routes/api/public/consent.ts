import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { errorResponse, isResponse, json, readJson, requireUser } from "@/lib/api.server";

const schema = z.object({
  consent_given: z.boolean(),
  consent_version: z.string().min(1),
  consent_timestamp: z.string().datetime().optional(),
});

export const Route = createFileRoute("/api/public/consent")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireUser(request);
        if (isResponse(auth)) return auth;

        const parsed = schema.safeParse(await readJson(request));
        if (!parsed.success) return errorResponse("consent_given and consent_version required");

        const { data, error } = await auth.supabase
          .from("profiles")
          .upsert({
            id: auth.userId,
            email: auth.email ?? null,
            consent_given: parsed.data.consent_given,
            consent_version: parsed.data.consent_version,
            consent_timestamp: parsed.data.consent_timestamp ?? new Date().toISOString(),
          })
          .select("id, consent_given, consent_timestamp, consent_version")
          .single();

        if (error) return errorResponse(error.message, 400);
        return json(data);
      },
    },
  },
});
