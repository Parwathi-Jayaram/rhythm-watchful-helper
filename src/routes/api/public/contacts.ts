import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { errorResponse, isResponse, json, readJson, requireUser } from "@/lib/api.server";
import { publicContact, sendVerification } from "@/lib/contact-verification.server";

const schema = z.object({
  name: z.string().min(1),
  phone: z.string().min(3).optional(),
  email: z.string().email().optional(),
  relationship: z.string().optional(),
});

export const Route = createFileRoute("/api/public/contacts")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireUser(request);
        if (isResponse(auth)) return auth;

        const { data, error } = await auth.supabase
          .from("emergency_contacts")
          .select("*")
          .order("created_at", { ascending: true });

        if (error) return errorResponse(error.message, 400);
        return json({ contacts: (data ?? []).map(publicContact) });
      },

      POST: async ({ request }) => {
        const auth = await requireUser(request);
        if (isResponse(auth)) return auth;

        const parsed = schema.safeParse(await readJson(request));
        if (!parsed.success) return errorResponse("name and a phone or email are required");
        if (!parsed.data.phone && !parsed.data.email) {
          return errorResponse("a phone number or email address is required");
        }

        const { data, error } = await auth.supabase
          .from("emergency_contacts")
          .insert({
            user_id: auth.userId,
            name: parsed.data.name,
            phone: parsed.data.phone ?? null,
            email: parsed.data.email ?? null,
            relationship: parsed.data.relationship ?? null,
            verification_status: parsed.data.phone ? "pending" : "unverified",
          })
          .select("*")
          .single();

        if (error) return errorResponse(error.message, 400);
        if (!data.phone) return json({ contact: publicContact(data), verification: null }, 201);

        const verification = await sendVerification(auth.supabase, data.id, auth.email ?? "A Rhythm user");
        return json(
          verification.ok
            ? { contact: verification.contact, verification }
            : { contact: publicContact(data), verification: { error: verification.error } },
          201,
        );
      },
    },
  },
});
