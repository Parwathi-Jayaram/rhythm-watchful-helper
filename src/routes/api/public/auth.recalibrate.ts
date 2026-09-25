import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { errorResponse, isResponse, json, readJson, requireUser } from "@/lib/api.server";

const schema = z.object({
  keystrokeData: z.object({
    events: z.array(
      z.object({
        key: z.string(),
        type: z.enum(["down", "up"]),
        timestamp: z.number(),
        pressure: z.number().optional(),
      })
    ),
    text: z.string(),
  }),
});

export const Route = createFileRoute("/api/public/auth/recalibrate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireUser(request);
        if (isResponse(auth)) return auth;

        const parsed = schema.safeParse(await readJson(request));
        if (!parsed.success) return errorResponse("Invalid keystroke data");

        const supabaseUrl = process.env["SUPABASE_URL"]!;
        const supabaseKey = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
        const authHeader = request.headers.get("authorization");

        const response = await fetch(`${supabaseUrl}/functions/v1/keystroke-similarity/recalibrate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader || "",
            apikey: supabaseKey,
          },
          body: JSON.stringify(parsed.data),
        });

        const data = await response.json();
        if (!response.ok) return errorResponse(data.error || "Recalibration failed", response.status);

        return json(data);
      },
    },
  },
});