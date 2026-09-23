import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import type { Json } from "@/integrations/supabase/types";
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
        const typingBaseline = parsed.data.typing_baseline as Json | undefined;
        const sensorBaseline = parsed.data.sensor_baseline as Json | undefined;
        if (!typingBaseline && !sensorBaseline) {
          return errorResponse("typing_baseline or sensor_baseline required");
        }

        const calibratedAt = parsed.data.calibration_date ?? new Date().toISOString();
        let typingBaselineId: string | null = null;
        let sensorBaselineId: string | null = null;

        if (typingBaseline) {
          const { data, error } = await auth.supabase
            .from("typing_baselines")
            .insert({
              user_id: auth.userId,
              baseline_features: typingBaseline,
              calibration_date: calibratedAt,
            })
            .select("id")
            .single();
          if (error) return errorResponse(error.message, 400);
          typingBaselineId = data.id;
        }

        if (sensorBaseline) {
          const { data, error } = await auth.supabase
            .from("sensor_baselines")
            .insert({
              user_id: auth.userId,
              baseline_features: sensorBaseline,
              calibration_date: calibratedAt,
            })
            .select("id")
            .single();
          if (error) return errorResponse(error.message, 400);
          sensorBaselineId = data.id;
        }

        return json({
          typing_baseline_id: typingBaselineId,
          sensor_baseline_id: sensorBaselineId,
          calibration_date: calibratedAt,
        });
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
