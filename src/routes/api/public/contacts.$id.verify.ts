import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { errorResponse, isResponse, json, readJson, requireUser } from "@/lib/api.server";
import { verifyCode } from "@/lib/contact-verification.server";

const schema = z.object({ code: z.string().regex(/^\d{6}$/) });

export const Route = createFileRoute("/api/public/contacts/$id/verify")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const auth = await requireUser(request);
        if (isResponse(auth)) return auth;
        const parsed = schema.safeParse(await readJson(request));
        if (!parsed.success) return errorResponse("code must be 6 digits");
        const r = await verifyCode(auth.supabase, params.id, parsed.data.code);
        return r.ok ? json(r) : errorResponse(r.error, r.status);
      },
    },
  },
});
