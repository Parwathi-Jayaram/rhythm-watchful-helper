import { createFileRoute } from "@tanstack/react-router";
import { Check, ChevronLeft, Plus, Settings, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

// No head() here: the home route inherits title/description/og/twitter from
// __root.tsx, and ships no og:image so serve-time hosting can inject the
// project's social preview (explicit og:image or latest screenshot).
export const Route = createFileRoute("/")({
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

type Screen = "setup" | "home" | "soft" | "full" | "alarm";
type Contact = { id: number; name: string; phone: string; status: "Not tested" | "Sent" | "Delivered" };

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

function Setup({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(1);
  const [consent, setConsent] = useState(false);
  const [learning, setLearning] = useState(0);
  const [contacts, setContacts] = useState<Contact[]>([{ id: 1, name: "Maya", phone: "+1 555 014 7280", status: "Not tested" }]);

  useEffect(() => {
    if (step !== 2 || learning >= 8) return;
    const timer = window.setInterval(() => setLearning((current) => Math.min(8, current + 1)), 1000);
    return () => window.clearInterval(timer);
  }, [step, learning]);

  const updateContact = (id: number, key: "name" | "phone", value: string) => {
    setContacts((all) => all.map((contact) => contact.id === id ? { ...contact, [key]: value } : contact));
  };

  const testContact = (id: number) => {
    setContacts((all) => all.map((contact) => contact.id === id ? { ...contact, status: "Sent" } : contact));
    window.setTimeout(() => setContacts((all) => all.map((contact) => contact.id === id ? { ...contact, status: "Delivered" } : contact)), 1200);
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
              <label className="mt-10 flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-card p-5 text-base font-medium">
                <Checkbox checked={consent} onCheckedChange={(value) => setConsent(value === true)} />
                I understand this is not a medical device
              </label>
              <Button variant="calm" size="lg" className="mt-8 h-12 rounded-xl px-7 text-base" disabled={!consent} onClick={() => setStep(2)}>Continue</Button>
            </section>
          )}

          {step === 2 && (
            <section className="text-center">
              <p className="mb-3 text-sm font-semibold text-primary">Step 2 of 3</p>
              <h1 className="text-4xl font-semibold">Learn your typing</h1>
              <p className="mt-4 text-lg text-muted-foreground">Keep typing normally in any app</p>
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
                  <div key={contact.id} className="grid gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
                    <label className="text-sm font-medium">Name<Input className="mt-2 h-11 rounded-lg text-base" value={contact.name} onChange={(event) => updateContact(contact.id, "name", event.target.value)} /></label>
                    <label className="text-sm font-medium">Phone number<Input className="mt-2 h-11 rounded-lg text-base" value={contact.phone} onChange={(event) => updateContact(contact.id, "phone", event.target.value)} /></label>
                    <div className="flex items-center gap-3 md:pb-0.5">
                      <Button variant="quiet" className="h-10 rounded-lg" onClick={() => testContact(contact.id)}>Send test alert</Button>
                      <span className={`rounded-full px-3 py-1 text-sm font-medium ${contact.status === "Delivered" ? "bg-secondary text-success" : "bg-muted text-muted-foreground"}`}>{contact.status}</span>
                    </div>
                  </div>
                ))}
              </div>
              {contacts.length < 3 && <Button variant="link" className="mt-3 px-0 text-base" onClick={() => setContacts((all) => [...all, { id: Date.now(), name: "", phone: "", status: "Not tested" }])}><Plus />Add another contact</Button>}
              <div className="mt-8 flex items-center gap-3">
                <Button variant="quiet" size="lg" className="h-12 rounded-xl" onClick={() => setStep(2)}><ChevronLeft />Back</Button>
                <Button variant="calm" size="lg" className="h-12 rounded-xl px-7 text-base" onClick={onComplete}>Finish setup</Button>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}

function Home({ onTrigger, toast, onReset }: { onTrigger: () => void; toast: string; onReset: () => void }) {
  const [settings, setSettings] = useState(false);
  const [paused, setPaused] = useState<"watching" | "timed" | "away">("watching");
  const [sensitivity, setSensitivity] = useState("Balanced");
  const [startup, setStartup] = useState(true);
  const status = paused === "timed" ? "Paused until 4:30 PM" : paused === "away" ? "Paused while you're away" : "Watching quietly";
  return (
    <main className="grid min-h-screen place-items-center bg-background p-5">
      <section className="relative flex h-[560px] w-full max-w-[420px] flex-col overflow-hidden rounded-[20px] border border-border bg-card p-7">
        <div className="flex items-center justify-between"><Brand /><Button variant="ghost" size="icon" className="rounded-full" aria-label="Open settings" onClick={() => setSettings(true)}><Settings /></Button></div>
        <div className="flex flex-1 flex-col justify-center">
          <span className="mb-3 flex items-center gap-2 text-sm font-medium text-success"><i className="h-2 w-2 rounded-full bg-success" />Active</span>
          <h1 className="max-w-xs text-4xl font-semibold leading-tight">{status}</h1>
          <div className="mt-8"><RhythmBars active={paused === "watching"} /></div>
          <div className="mt-8 space-y-3">
            <Button variant="calm" size="lg" className="h-12 w-full rounded-xl text-base" onClick={() => setPaused("timed")}>Pause for 30 minutes</Button>
            <Button variant="quiet" size="lg" className="h-12 w-full rounded-xl text-base" onClick={() => setPaused("away")}>I'm stepping away</Button>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-5 text-sm text-muted-foreground">
          <span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-success" />2 emergency contacts added</span>
          <Button variant="ghost" className="h-auto px-2 py-1 text-sm text-muted-foreground" onClick={onTrigger}>Simulate trigger</Button>
        </div>

        {settings && <div className="absolute inset-0 z-10 bg-card p-7">
          <div className="flex items-center justify-between"><h2 className="text-2xl font-semibold">Settings</h2><Button variant="ghost" size="icon" aria-label="Close settings" onClick={() => setSettings(false)}><X /></Button></div>
          <div className="mt-8 space-y-7">
            <div><p className="font-medium">Emergency contacts</p><p className="mt-1 text-sm text-muted-foreground">Maya and Alex</p></div>
            <div><p className="mb-3 font-medium">Sensitivity</p><div className="grid grid-cols-3 rounded-xl bg-muted p-1">{["Relaxed", "Balanced", "Sensitive"].map((level) => <Button key={level} variant={sensitivity === level ? "calm" : "ghost"} className="rounded-lg px-2" onClick={() => setSensitivity(level)}>{level}</Button>)}</div></div>
            <label className="flex items-center justify-between gap-4"><span><span className="block font-medium">Pause with Windows startup</span><span className="mt-1 block text-sm text-muted-foreground">Start paused when you sign in</span></span><Switch checked={startup} onCheckedChange={setStartup} /></label>
            <Button variant="ghost" className="w-full justify-start px-0 text-destructive hover:text-destructive" onClick={onReset}><Trash2 />Delete all my data</Button>
          </div>
        </div>}
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

function Index() {
  const [screen, setScreen] = useState<Screen>("setup");
  const [toast, setToast] = useState("");
  const backHome = useCallback(() => { setScreen("home"); setToast("Thanks, back to watching"); window.setTimeout(() => setToast(""), 2600); }, []);
  if (screen === "setup") return <Setup onComplete={() => setScreen("home")} />;
  if (screen === "soft") return <SoftCheckIn onOkay={backHome} onMinute={() => setScreen("full")} onExpire={() => setScreen("full")} />;
  if (screen === "full") return <FullCheckIn onOkay={backHome} onHelp={() => setScreen("alarm")} onExpire={() => setScreen("alarm")} />;
  if (screen === "alarm") return <Alarm onCancel={backHome} />;
  return <Home onTrigger={() => setScreen("soft")} toast={toast} onReset={() => setScreen("setup")} />;
}
