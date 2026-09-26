import { supabase } from "@/integrations/supabase/client";

export type SavedContact = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  relationship: string | null;
  verification_status: string;
  warning: string | null;
};

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not signed in");
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

export async function listContacts(): Promise<SavedContact[]> {
  const res = await fetch("/api/public/contacts", { headers: await authHeaders() });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? "Could not load contacts");
  return body.contacts ?? [];
}

export async function addContact(input: {
  name: string;
  phone?: string;
  email?: string;
  relationship?: string;
}): Promise<{ contact: SavedContact; testCode?: string }> {
  const res = await fetch("/api/public/contacts", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(input),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? "Could not save contact");
  return { contact: body.contact, testCode: body.verification?.test_code };
}

export async function deleteContact(id: string): Promise<void> {
  const res = await fetch(`/api/public/contacts/${id}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Could not remove contact");
  }
}
