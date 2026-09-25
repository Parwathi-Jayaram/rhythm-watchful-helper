import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

function friendly(message: string, mode: "login" | "signup") {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "That email and password don't match. Please try again.";
  if (m.includes("already registered") || m.includes("already exists")) return "An account with this email already exists. Try logging in instead.";
  if (m.includes("not confirmed")) return "Please confirm your email first — check your inbox for the link.";
  if (m.includes("weak") || m.includes("pwned") || m.includes("known")) return "This password is too easy to guess. Please choose a stronger one.";
  if (m.includes("password")) return "Password must be at least 8 characters.";
  if (m.includes("email")) return "Please enter a valid email address.";
  return mode === "login" ? "We couldn't log you in. Please try again." : "We couldn't create your account. Please try again.";
}

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(""); setInfo("");
    if (mode === "signup" && password.length < 8) return setError("Password must be at least 8 characters.");
    setBusy(true);
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) return setError(friendly(error.message, mode));
      navigate({ to: "/home", search: { view: "closed" } });
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/home` } });
      setBusy(false);
      if (error) return setError(friendly(error.message, mode));
      if (data.user && data.user.identities?.length === 0) return setError(friendly("already registered", mode));
      if (data.session) navigate({ to: "/home" });
      else setInfo("Check your email to confirm your account. The link brings you straight to setup.");
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-background p-5">
      <form onSubmit={submit} className="w-full max-w-[420px] rounded-[20px] border border-border bg-card p-7">
        <h1 className="text-3xl font-semibold">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{mode === "login" ? "Log in to manage Rhythm." : "Start setting up Rhythm."}</p>
        <label className="mt-6 block text-sm font-medium">Email<Input type="email" required autoComplete="email" className="mt-2 h-11 rounded-lg text-base" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label className="mt-4 block text-sm font-medium">Password<Input type="password" required autoComplete={mode === "login" ? "current-password" : "new-password"} className="mt-2 h-11 rounded-lg text-base" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {error && <p role="alert" className="mt-4 rounded-lg bg-muted p-3 text-sm text-destructive">{error}</p>}
        {info && <p className="mt-4 rounded-lg bg-secondary p-3 text-sm">{info}</p>}
        <Button type="submit" variant="calm" size="lg" disabled={busy} className="mt-6 h-12 w-full rounded-xl text-base">{busy ? "Please wait…" : mode === "login" ? "Log in" : "Sign up"}</Button>
        <p className="mt-5 text-center text-sm text-muted-foreground">
          {mode === "login" ? <>No account yet? <Link to="/signup" className="font-medium text-primary">Sign up</Link></> : <>Already have an account? <Link to="/login" className="font-medium text-primary">Log in</Link></>}
        </p>
      </form>
    </main>
  );
}
