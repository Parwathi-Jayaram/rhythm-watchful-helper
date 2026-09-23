import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { errorResponse, isResponse, json, readJson, requireUser } from "@/lib/api.server";

// Derived feature vectors only — never raw keystrokes or raw sensor waveforms.
const schema = z.object({
  typing_baseline: z.record(z.unknown()).optional(),
  sensor_baseline: z.record(z.unknown()).optional(),
  calibration_date: z.string().datetime().optional(),
});

export const Route = createFileRoute("/api/public/baselines/sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireUser(request);
        if (isResponse(auth)) return auth;

        const parsed = schema.safeParse(await readJson(request));
        if (!parsed.success) return errorResponse("typing_baseline or sensor_baseline required");
        const { typing_baseline, sensor_baseline, calibration_date } = parsed.data;
        if (!typing_baseline && !sensor_baseline) {
          return errorResponse("typing_baseline or sensor_baseline required");
        }

        const calibratedAt = calibration_date ?? new Date().toISOString();
        const saved: Record<string, string> = {};

        if (typing_baseline) {
          const { data, error } = await auth.supabase
            .from("typing_baselines")
            .insert({
              user_id: auth.userId,
              baseline_features: typing_baseline,
              calibration_date: calibratedAt,
            })
            .select("id")
            .single();
          if (error) return errorResponse(error.message, 400);
          saved.typing_baseline_id = data.id;
        }

        if (sensor_baseline) {
          const { data, error } = await auth.supabase
            .from("sensor_baselines")
            .insert({
              user_id: auth.userId,
              baseline_features: sensor_baseline,
              calibration_date: calibratedAt,
            })
            .select("id")
            .single();
          if (error) return errorResponse(error.message, 400);
          saved.sensor_baseline_id = data.id;
        }

        return json({ ...saved, calibration_date: calibratedAt });
      },

      // Cross-device recovery: fetch the most recent baselines back.
      GET: async ({ request }) => {
        const auth = await requireUser(request);
        if (isResponse(auth)) return auth;

        const [typing, sensor] = await Promise.all([
          auth.supabase
            .from("typing_baselines")
            .select("id, baseline_features, calibration_date")
            .order("calibration_date", { ascending: false })
            .limit(1)
            .maybeSingle(),
          auth.supabase
            .from("sensor_baselines")
            .select("id, baseline_features, calibration_date")
            .order("calibration_date", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        return json({ typing_baseline: typing.data, sensor_baseline: sensor.data });
      },
    },
  },
});
