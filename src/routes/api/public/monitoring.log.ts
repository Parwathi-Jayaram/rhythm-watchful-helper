import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { errorResponse, isResponse, json, readJson, requireUser } from "@/lib/api.server";

// Audit trail only: scores produced by on-device inference, never raw signals.
const schema = z.object({
  combined_score: z.number(),
  keystroke_score: z.number().optional(),
  sensor_score: z.number().optional(),
  device_inference_time_ms: z.number().int().nonnegative().optional(),
  captured_at: z.string().datetime().optional(),
});

export const Route = createFileRoute("/api/public/monitoring/log")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireUser(request);
        if (isResponse(auth)) return auth;

        const parsed = schema.safeParse(await readJson(request));
        if (!parsed.success) return errorResponse("combined_score is required");

        const { data, error } = await auth.supabase
          .from("monitoring_log")
          .insert({
            user_id: auth.userId,
            combined_score: parsed.data.combined_score,
            keystroke_score: parsed.data.keystroke_score ?? null,
            sensor_score: parsed.data.sensor_score ?? null,
            device_inference_time_ms: parsed.data.device_inference_time_ms ?? null,
            captured_at: parsed.data.captured_at ?? new Date().toISOString(),
          })
          .select("id, captured_at")
          .single();

        if (error) return errorResponse(error.message, 400);
        return json(data, 201);
      },
    },
  },
});
