import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Check, ChevronLeft, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { addContact, deleteContact, listContacts, type SavedContact } from "@/lib/contacts-api";

export const Route = createFileRoute("/_authenticated/home")({
  validateSearch: (search: Record<string, unknown>): { view?: "closed" } => (search["view"] === "closed" ? { view: "closed" } : {}),
  head: () => ({
    meta: [
      { title: "Rhythm — A quiet typing safety companion" },
      { name: "description", content: "Rhythm notices sudden changes in typing timing and checks that you are okay." },
      { property: "og:title", content: "Rhythm — A quiet typing safety companion" },
      { property: "og:description", content: "A calm prototype that notices sudden changes in typing timing without reading words." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Screen = "setup" | "done" | "closed" | "soft" | "full" | "alarm";

/** A contact row in the UI. `id` is set once it's saved to the database. */
type Contact = {
  key: number;
  id?: string;
  name: string;
  phone: string;
  verificationStatus?: string;
  warning?: string | null;
  testCode?: string;
};

function fromSaved(saved: SavedContact, testCode?: string): Contact {
  return {
    key: Date.now() + Math.floor(Math.random() * 1000),
    id: saved.id,
    name: saved.name,
    phone: saved.phone ?? "",
    verificationStatus: saved.verification_status,
    warning: saved.warning,
    testCode,
  };
}

const BAR_HEIGHTS = [18, 29, 22, 42, 26, 35, 19, 47, 29, 38, 23, 32, 18, 40, 25, 34, 21];

function RhythmBars({ active = false }: { active?: boolean }) {
  return (
    <div className="flex h-14 items-center justify-center gap-2" aria-label="Typing rhythm activity">
      {BAR_HEIGHTS.map((height, index) => (
        <span
          key={`${height}-${index}`}
          className={`w-1.5 rounded-full bg-primary ${active ? "rhythm-bar" : "opacity-65"}`}
          style={{ height, animationDelay: `${(index % 5) * 0.65}s` }}
        />
      ))}
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3 text-lg font-semibold">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground" aria-hidden="true">
        <span className="flex items-end gap-0.5">
          <i className="h-2 w-1 rounded-full bg-current" />
          <i className="h-4 w-1 rounded-full bg-current" />
          <i className="h-3 w-1 rounded-full bg-current" />
        </span>
      </span>
      Rhythm
    </div>
  );
}

function ProgressRing({ value, label, size = 176 }: { value: number; label: string; size?: number }) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--muted)" strokeWidth="5" />
        <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--primary)" strokeWidth="5" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - value)} />
      </svg>
      <span className="absolute text-center text-3xl font-bold">{label}</span>
    </div>
  );
}

function VerificationBadge({ contact }: { contact: Contact }) {
  if (!contact.id) return null;
  const verified = contact.verificationStatus === "verified";
  return (
    <span className={`rounded-full px-3 py-1 text-sm font-medium ${verified ? "bg-secondary text-success" : "bg-muted text-muted-foreground"}`}>
      {verified ? "Verified" : "Not verified"}
    </span>
  );
}

function Setup({ contacts, setContacts, onComplete }: { contacts: Contact[]; setContacts: Dispatch<SetStateAction<Contact[]>>; onComplete: () => Promise<string | null> }) {
  const [step, setStep] = useState(1);
  const [consent, setConsent] = useState(false);
  const [learning, setLearning] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (step !== 2 || learning >= 8) return;
    const timer = window.setInterval(() => setLearning((current) => Math.min(8, current + 1)), 1000);
    return () => window.clearInterval(timer);
  }, [step, learning]);

  const updateContact = (key: number, field: "name" | "phone", value: string) => {
    setContacts((all) => all.map((contact) => contact.key === key ? { ...contact, [field]: value } : contact));
  };

  const finish = async () => {
    setSaving(true);
    setError("");
    const failure = await onComplete();
    setSaving(false);
    if (failure) setError(failure);
  };

  return (
    <main className="min-h-screen bg-background px-6 py-8 md:px-12">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col">
        <Brand />
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center py-10">
          <div className="mb-12 grid grid-cols-3 gap-3" aria-label={`Setup step ${step} of 3`}>
            {["Consent", "Learn your typing", "Emergency contacts"].map((item, index) => (
              <div key={item} className="flex items-center gap-3">
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-semibold ${index + 1 <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {index + 1 < step ? <Check className="h-4 w-4" /> : index + 1}
                </span>
                <span className={`hidden text-sm font-medium sm:block ${index + 1 <= step ? "text-foreground" : "text-muted-foreground"}`}>{item}</span>
              </div>
            ))}
          </div>

          {step === 1 && (
            <section className="max-w-2xl">
              <p className="mb-3 text-sm font-semibold text-primary">Step 1 of 3</p>
              <h1 className="text-4xl font-semibold leading-tight md:text-5xl">Your words stay private.</h1>
              <p className="mt-5 max-w-xl text-lg leading-8 text-muted-foreground">Rhythm reads only the timing between your keystrokes, never the words you type.</p>
              <div className="mt-10 flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-card p-5 text-base font-medium" onClick={() => setConsent((value) => !value)}>
                <Checkbox checked={consent} onCheckedChange={(value) => setConsent(value === true)} onClick={(event) => event.stopPropagation()} />
                I understand this is not a medical device
              </div>
              <Button variant="calm" size="lg" className="mt-8 h-12 rounded-xl px-7 text-base" disabled={!consent} onClick={() => setStep(2)}>Continue</Button>
            </section>
          )}

          {step === 2 && (
            <section className="text-center">
              <p className="mb-3 text-sm font-semibold text-primary">Step 2 of 3</p>
              <h1 className="text-4xl font-semibold">Learn your typing</h1>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground">The quick brown fox jumps over the lazy dog while questioning why programmers often work late at night, fueled by coffee and curiosity. Every keystroke tells a story: the rhythm of your typing, the pauses between words, and the pressure behind each letter reveal patterns unique to you. Numbers like 2024 and symbols such as @, #, and % add extra texture, helping the system learn how YOU type — not just what you type.</p>
              <div className="mt-8 flex justify-center"><ProgressRing value={learning / 8} label={`${learning}:00`} /></div>
              <div className="mx-auto mt-5 max-w-md"><RhythmBars active /></div>
              <p className="mt-3 text-sm text-muted-foreground">{learning < 8 ? `${8 - learning} minutes remaining` : "Your rhythm is ready"}</p>
              <Button variant="calm" size="lg" className="mt-7 h-12 rounded-xl px-7 text-base" disabled={learning < 8} onClick={() => setStep(3)}>Continue</Button>
            </section>
          )}

          {step === 3 && (
            <section>
              <p className="mb-3 text-sm font-semibold text-primary">Step 3 of 3</p>
              <h1 className="text-4xl font-semibold">Add emergency contacts</h1>
              <p className="mt-4 text-lg text-muted-foreground">Choose someone you trust to receive an alert.</p>
              <div className="mt-8 space-y-4">
                {contacts.map((contact) => (
                  <div key={contact.key} className="grid gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
                    <label className="text-sm font-medium">Name<Input className="mt-2 h-11 rounded-lg text-base" value={contact.name} onChange={(event) => updateContact(contact.key, "name", event.target.value)} /></label>
                    <label className="text-sm font-medium">Phone number<Input className="mt-2 h-11 rounded-lg text-base" value={contact.phone} onChange={(event) => updateContact(contact.key, "phone", event.target.value)} /></label>
                    <div className="flex items-center gap-3 md:pb-0.5">
                      <VerificationBadge contact={contact} />
                    </div>
                  </div>
                ))}
              </div>
              {contacts.length < 3 && <Button variant="link" className="mt-3 px-0 text-base" onClick={() => setContacts((all) => [...all, { key: Date.now(), name: "", phone: "" }])}><Plus />Add another contact</Button>}
              {error && <p className="mt-4 rounded-xl bg-muted p-4 text-sm font-medium text-destructive">{error}</p>}
              <div className="mt-8 flex items-center gap-3">
                <Button variant="quiet" size="lg" className="h-12 rounded-xl" onClick={() => setStep(2)}><ChevronLeft />Back</Button>
                <Button variant="calm" size="lg" className="h-12 rounded-xl px-7 text-base" disabled={saving} onClick={finish}>{saving ? "Saving…" : "Finish setup"}</Button>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}

function Done({ onClose, contactCount }: { onClose: () => void; contactCount: number }) {
  return (
    <main className="grid min-h-screen place-items-center bg-background p-5">
      <section className="flex h-[560px] w-full max-w-[420px] flex-col rounded-[20px] border border-border bg-card p-7">
        <Brand />
        <div className="flex flex-1 flex-col justify-center">
          <span className="mb-3 flex items-center gap-2 text-sm font-medium text-success"><i className="h-2 w-2 rounded-full bg-success" />Setup complete</span>
          <h1 className="text-4xl font-semibold leading-tight">Initial setup done.</h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground">You can close now. Rhythm keeps watching quietly in the background.</p>
        </div>
        <div className="border-t border-border pt-5">
          <Button variant="calm" size="lg" className="h-12 w-full rounded-xl text-base" onClick={onClose}>Close</Button>
          <p className="mt-3 text-center text-sm text-muted-foreground">{contactCount} emergency contact{contactCount === 1 ? "" : "s"} added</p>
        </div>
      </section>
    </main>
  );
}

function Closed({
  contacts,
  setContacts,
  toast,
  onSave,
  onRemove,
  loading,
}: {
  contacts: Contact[];
  setContacts: Dispatch<SetStateAction<Contact[]>>;
  toast: string;
  onSave: (key: number) => Promise<string | null>;
  onRemove: (contact: Contact) => Promise<string | null>;
  loading: boolean;
}) {
  const [savingKey, setSavingKey] = useState<number | null>(null);
  const [removingKey, setRemovingKey] = useState<number | null>(null);
  const [error, setError] = useState("");

  const updateContact = (key: number, field: "name" | "phone", value: string) => {
    setContacts((all) => all.map((contact) => contact.key === key ? { ...contact, [field]: value } : contact));
  };

  const save = async (key: number) => {
    setSavingKey(key);
    setError("");
    const failure = await onSave(key);
    setSavingKey(null);
    if (failure) setError(failure);
  };

  const remove = async (contact: Contact) => {
    setRemovingKey(contact.key);
    setError("");
    const failure = await onRemove(contact);
    setRemovingKey(null);
    if (failure) setError(failure);
  };

  return (
    <main className="grid min-h-screen place-items-center bg-background p-5">
      <section className="w-full max-w-[420px] rounded-[20px] border border-border bg-card p-7">
        <Brand />
        <h2 className="mt-7 text-2xl font-semibold">Emergency contacts</h2>
        <p className="mt-1 text-sm text-muted-foreground">The people Rhythm alerts if you need help.</p>
        <div className="mt-5 space-y-3">
          {loading && <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">Loading your contacts…</p>}
          {!loading && contacts.map((contact) => (
            <div key={contact.key} className="grid gap-3 rounded-xl border border-border p-4">
              {contact.id ? (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold">{contact.name}</p>
                      <p className="truncate text-sm text-muted-foreground">{contact.phone}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="shrink-0 rounded-full text-muted-foreground hover:text-destructive" aria-label={`Remove ${contact.name || "contact"}`} disabled={removingKey === contact.key} onClick={() => remove(contact)}><Trash2 /></Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <VerificationBadge contact={contact} />
                    {contact.testCode && <span className="text-xs text-muted-foreground">Test code: {contact.testCode}</span>}
                  </div>
                  {contact.warning && <p className="text-sm text-muted-foreground">{contact.warning}</p>}
                </>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <label className="flex-1 text-sm font-medium">Name<Input className="mt-2 h-10 rounded-lg text-base" value={contact.name} onChange={(event) => updateContact(contact.key, "name", event.target.value)} /></label>
                    <Button variant="ghost" size="icon" className="mt-6 shrink-0 rounded-full text-muted-foreground hover:text-destructive" aria-label={`Remove ${contact.name || "contact"}`} onClick={() => remove(contact)}><Trash2 /></Button>
                  </div>
                  <label className="text-sm font-medium">Phone number<Input className="mt-2 h-10 rounded-lg text-base" value={contact.phone} onChange={(event) => updateContact(contact.key, "phone", event.target.value)} /></label>
                  <Button variant="calm" className="h-10 rounded-lg" disabled={savingKey === contact.key || !contact.name.trim() || !contact.phone.trim()} onClick={() => save(contact.key)}>
                    {savingKey === contact.key ? "Saving…" : "Save contact"}
                  </Button>
                </>
              )}
            </div>
          ))}
          {!loading && contacts.length === 0 && <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">No contacts yet. Add someone you trust.</p>}
          {contacts.length < 3 && <Button variant="link" className="px-0 text-base" onClick={() => setContacts((all) => [...all, { key: Date.now(), name: "", phone: "" }])}><Plus />Add another contact</Button>}
        </div>
        {error && <p className="mt-4 rounded-xl bg-muted p-4 text-sm font-medium text-destructive">{error}</p>}
        <p className="mt-7 text-sm text-muted-foreground">Rhythm is watching quietly in the background.</p>
      </section>
      {toast && <div className="toast-enter fixed bottom-8 left-1/2 -translate-x-1/2 rounded-xl bg-foreground px-5 py-3 text-sm font-medium text-background">{toast}</div>}
    </main>
  );
}

function SoftCheckIn({ onOkay, onMinute, onExpire }: { onOkay: () => void; onMinute: () => void; onExpire: () => void }) {
  const [seconds, setSeconds] = useState(10);
  useEffect(() => {
    const timer = window.setInterval(() => setSeconds((current) => current - 1), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => { if (seconds <= 0) onExpire(); }, [seconds, onExpire]);
  return <main className="relative min-h-screen overflow-hidden bg-desktop p-8">
    <div className="mx-auto mt-12 max-w-5xl opacity-45"><div className="h-14 w-64 rounded-xl bg-background" /><div className="mt-24 grid grid-cols-3 gap-6"><div className="h-64 rounded-2xl bg-background"/><div className="h-64 rounded-2xl bg-background"/><div className="h-64 rounded-2xl bg-background"/></div></div>
    <section className="absolute bottom-8 right-8 w-[380px] max-w-[calc(100%-2rem)] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
      <div className="p-6"><div className="mb-4 h-2.5 w-2.5 rounded-full bg-alert"/><h1 className="text-xl font-semibold leading-7">Your typing looks different from usual. Are you okay?</h1><div className="mt-5 flex gap-3"><Button variant="calm" className="h-11 flex-1 rounded-xl text-base" onClick={onOkay}>I'm okay</Button><Button variant="quiet" className="h-11 flex-1 rounded-xl text-base" onClick={onMinute}>Give me a minute</Button></div></div>
      <div className="h-1.5 bg-alert-soft"><div className="h-full bg-alert transition-[width] duration-1000 ease-linear" style={{ width: `${seconds * 10}%` }} /></div>
    </section>
  </main>;
}

function FullCheckIn({ onOkay, onHelp, onExpire }: { onOkay: () => void; onHelp: () => void; onExpire: () => void }) {
  const [seconds, setSeconds] = useState(20);
  const holdTimer = useRef<number | null>(null);
  useEffect(() => { const timer = window.setInterval(() => setSeconds((current) => current - 1), 1000); return () => window.clearInterval(timer); }, []);
  useEffect(() => { if (seconds <= 0) onExpire(); }, [seconds, onExpire]);
  useEffect(() => {
    const down = (event: KeyboardEvent) => { if (event.key === "Enter" && holdTimer.current === null) holdTimer.current = window.setTimeout(onOkay, 1000); };
    const up = (event: KeyboardEvent) => { if (event.key === "Enter" && holdTimer.current !== null) { window.clearTimeout(holdTimer.current); holdTimer.current = null; } };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); if (holdTimer.current !== null) window.clearTimeout(holdTimer.current); };
  }, [onOkay]);
  return <main className="grid min-h-screen place-items-center bg-background p-6"><section className="w-full max-w-xl text-center"><h1 className="text-5xl font-bold">Are you okay?</h1><div className="mt-10 flex justify-center"><ProgressRing value={seconds / 20} label={`${Math.max(0, seconds)}`} size={220} /></div><div className="mt-10 grid gap-4 sm:grid-cols-2"><Button variant="calm" className="h-16 rounded-2xl text-lg" onClick={onOkay}>I'm okay</Button><Button variant="quiet" className="h-16 rounded-2xl text-lg" onClick={onHelp}>I need help now</Button></div><p className="mt-7 text-sm leading-6 text-muted-foreground">Hold Enter for 1 second, or click, to answer.<br/>Random key presses won't dismiss this.</p></section></main>;
}

function Alarm({ onCancel }: { onCancel: () => void }) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<number | null>(null);
  const start = () => { setHolding(true); timer.current = window.setTimeout(onCancel, 2000); };
  const stop = () => { setHolding(false); if (timer.current !== null) { window.clearTimeout(timer.current); timer.current = null; } };
  useEffect(() => () => { if (timer.current !== null) window.clearTimeout(timer.current); }, []);
  return <main className="grid min-h-screen place-items-center bg-alarm p-6 text-alarm-foreground"><section className="w-full max-w-xl text-center"><div className="mx-auto mb-7 grid h-16 w-16 place-items-center rounded-full border-2 border-alarm-foreground text-2xl font-bold">!</div><h1 className="text-5xl font-bold">Alerting your contacts</h1><div className="mx-auto mt-10 max-w-md divide-y divide-alarm-foreground/25 rounded-2xl border border-alarm-foreground/40 text-left">{[["Maya", "Delivered"], ["Alex", "Sending"]].map(([name, status]) => <div key={name} className="flex items-center justify-between p-5"><span className="font-semibold">{name}</span><span>{status}</span></div>)}</div><div className="relative mx-auto mt-10 h-16 max-w-md overflow-hidden rounded-2xl border-2 border-alarm-foreground"><div className={`absolute inset-y-0 left-0 bg-alarm-foreground/25 ${holding ? "w-full transition-[width] duration-[2000ms] ease-linear" : "w-0"}`} /><Button variant="ghost" className="relative h-full w-full rounded-none text-lg text-alarm-foreground hover:bg-transparent" onPointerDown={start} onPointerUp={stop} onPointerLeave={stop} onKeyDown={(event) => { if ((event.key === "Enter" || event.key === " ") && !holding) start(); }} onKeyUp={stop}>I'm okay — hold to cancel</Button></div><p className="mt-6 text-sm text-alarm-foreground/80">Alarm is playing and rising to full volume.</p></section></main>;
}

function LogoutButton() {
  const navigate = useNavigate();
  return (
    <Button variant="quiet" className="fixed right-5 top-5 z-50 h-10 rounded-xl" onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/login", replace: true }); }}>
      Log out
    </Button>
  );
}

function Index() {
  const { view } = Route.useSearch();
  return <><LogoutButton /><Screens initial={view === "closed" ? "closed" : "setup"} /></>;
}

function Screens({ initial }: { initial: Screen }) {
  const [screen, setScreen] = useState<Screen>(initial);
  const [toast, setToast] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }, []);

  const reloadContacts = useCallback(async () => {
    try {
      const saved = await listContacts();
      setContacts(saved.map((contact) => fromSaved(contact)));
    } catch {
      // Signed-out or network failure — the gate handles sign-in; keep the list as-is.
    } finally {
      setLoadingContacts(false);
    }
  }, []);

  useEffect(() => { void reloadContacts(); }, [reloadContacts]);

  /** Save every unsaved contact row to the database. Returns an error message or null. */
  const saveNewContacts = useCallback(async (): Promise<string | null> => {
    const unsaved = contacts.filter((contact) => !contact.id && contact.name.trim() && contact.phone.trim());
    try {
      for (const contact of unsaved) {
        await addContact({ name: contact.name.trim(), phone: contact.phone.trim() });
      }
    } catch (err) {
      return err instanceof Error ? err.message : "Could not save contacts";
    }
    await reloadContacts();
    return null;
  }, [contacts, reloadContacts]);

  const saveOne = useCallback(async (key: number): Promise<string | null> => {
    const contact = contacts.find((item) => item.key === key);
    if (!contact) return null;
    try {
      const { contact: saved, testCode } = await addContact({ name: contact.name.trim(), phone: contact.phone.trim() });
      setContacts((all) => all.map((item) => item.key === key ? { ...fromSaved(saved, testCode), key } : item));
      showToast("Contact saved");
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : "Could not save contact";
    }
  }, [contacts, showToast]);

  const removeOne = useCallback(async (contact: Contact): Promise<string | null> => {
    if (!contact.id) {
      setContacts((all) => all.filter((item) => item.key !== contact.key));
      return null;
    }
    try {
      await deleteContact(contact.id);
      setContacts((all) => all.filter((item) => item.key !== contact.key));
      showToast("Contact removed");
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : "Could not remove contact";
    }
  }, [showToast]);

  const backHome = useCallback(() => { setScreen("closed"); showToast("Thanks — glad you're okay"); }, [showToast]);

  if (screen === "setup") return <Setup contacts={contacts} setContacts={setContacts} onComplete={async () => {
    const failure = await saveNewContacts();
    if (!failure) setScreen("done");
    return failure;
  }} />;
  if (screen === "soft") return <SoftCheckIn onOkay={backHome} onMinute={() => setScreen("full")} onExpire={() => setScreen("full")} />;
  if (screen === "full") return <FullCheckIn onOkay={backHome} onHelp={() => setScreen("alarm")} onExpire={() => setScreen("alarm")} />;
  if (screen === "alarm") return <Alarm onCancel={backHome} />;
  if (screen === "done") return <Done contactCount={contacts.filter((contact) => contact.id).length} onClose={() => setScreen("closed")} />;
  return <Closed contacts={contacts} setContacts={setContacts} toast={toast} onSave={saveOne} onRemove={removeOne} loading={loadingContacts} />;
}
