import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { errorResponse, isResponse, json, readJson, requireUser } from "@/lib/api.server";

const schema = z.object({
  combined_score: z.number().optional(),
  keystroke_score: z.number().optional(),
  sensor_score: z.number().optional(),
  triggered_at: z.string().datetime().optional(),
});

export const Route = createFileRoute("/api/public/alerts")({
  server: {
    handlers: {
      // Insert-only: notification dispatch lives in /alerts/trigger and /alerts/:id/notify.
      POST: async ({ request }) => {
        const auth = await requireUser(request);
        if (isResponse(auth)) return auth;

        const parsed = schema.safeParse(await readJson(request));
        if (!parsed.success) return errorResponse("invalid payload");

        const { data, error } = await auth.supabase
          .from("alerts")
          .insert({
            user_id: auth.userId,
            combined_score: parsed.data.combined_score ?? null,
            keystroke_score: parsed.data.keystroke_score ?? null,
            sensor_score: parsed.data.sensor_score ?? null,
            triggered_at: parsed.data.triggered_at ?? new Date().toISOString(),
          })
          .select("*")
          .single();

        if (error) return errorResponse(error.message, 400);
        return json(data, 201);
      },

      GET: async ({ request }) => {
        const auth = await requireUser(request);
        if (isResponse(auth)) return auth;

        const { data, error } = await auth.supabase
          .from("alerts")
          .select("*")
          .order("triggered_at", { ascending: false });

        if (error) return errorResponse(error.message, 400);
        return json({ alerts: data ?? [] });
      },
    },
  },
});
