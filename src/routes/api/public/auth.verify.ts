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

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 10;
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();

function checkRateLimit(userId: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const record = rateLimitMap.get(userId);

  if (!record || now - record.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(userId, { count: 1, windowStart: now });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1, resetAt: now + RATE_LIMIT_WINDOW_MS };
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetAt: record.windowStart + RATE_LIMIT_WINDOW_MS };
  }

  record.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - record.count, resetAt: record.windowStart + RATE_LIMIT_WINDOW_MS };
}

export const Route = createFileRoute("/api/public/auth/verify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireUser(request);
        if (isResponse(auth)) return auth;

        const rateLimit = checkRateLimit(auth.userId);
        if (!rateLimit.allowed) {
          return errorResponse("Rate limit exceeded. Please wait before trying again.", 429);
        }

        const parsed = schema.safeParse(await readJson(request));
        if (!parsed.success) return errorResponse("Invalid keystroke data");

        const supabaseUrl = process.env["SUPABASE_URL"]!;
        const supabaseKey = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
        const authHeader = request.headers.get("authorization");

        const response = await fetch(`${supabaseUrl}/functions/v1/keystroke-similarity/verify`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader || "",
            apikey: supabaseKey,
          },
          body: JSON.stringify(parsed.data),
        });

        const data = await response.json();
        if (!response.ok) return errorResponse(data.error || "Verification failed", response.status);

        return json(data, response.status, {
          "X-RateLimit-Limit": RATE_LIMIT_MAX_REQUESTS.toString(),
          "X-RateLimit-Remaining": rateLimit.remaining.toString(),
          "X-RateLimit-Reset": Math.ceil(rateLimit.resetAt / 1000).toString(),
        });
      },
    },
  },
});