"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

export function AuthPanel() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const configured = isSupabaseConfigured();

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    void supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUserEmail(session?.user.email ?? null));
    return () => subscription.unsubscribe();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    setBusy(true);
    setMessage("");
    const result = mode === "signup"
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    if (result.error) setMessage(result.error.message);
    else if (mode === "signup" && !result.data.session) setMessage("Patikrink el. paštą ir patvirtink paskyrą.");
    else setMessage("Sėkmingai prisijungei.");
    setBusy(false);
  }

  async function signOut() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    setMessage(error?.message ?? "Atsijungei.");
  }

  return <section className="auth-card" id="account-login">
    <div className="auth-icon">✳</div>
    {userEmail ? <>
      <p className="eyebrow">TAVO PASKYRA</p><h2>Sveiki sugrįžę!</h2><p className="auth-copy">Prisijungta kaip <strong>{userEmail}</strong></p>
      <Link href="#my-saved-recipes" className="button-primary full-button">Mano išsaugoti receptai <span>↓</span></Link>
      <Link href="#my-ai-recipes" className="button-secondary full-button">Mano AI receptai <span>↓</span></Link>
      <button className="button-secondary full-button" onClick={signOut}>Atsijungti</button>
    </> : <>
      <p className="eyebrow">TAVO RECEPTŲ KOLEKCIJA</p><h2>{mode === "login" ? "Prisijunk" : "Sukurk paskyrą"}</h2>
      <p className="auth-copy">Prisijunk, kad išsisaugotum receptus ir galėtum juos pritaikyti su AI.</p>
      {!configured ? <div className="notice">Paskyros dar neįjungtos. Įrašyk Supabase projekto URL ir publishable key į `.env.local` — instrukcijos pateiktos README.</div> : <form className="auth-form" onSubmit={submit}>
        <label>El. paštas<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="vardas@pastas.lt" /></label>
        <label>Slaptažodis<input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={6} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Bent 6 simboliai" /></label>
        <button className="button-primary full-button" disabled={busy}>{busy ? "Palauk…" : mode === "login" ? "Prisijungti" : "Registruotis"}<span>→</span></button>
      </form>}
      {message && <p className="form-message" role="status">{message}</p>}
      {configured && <p className="auth-switch">{mode === "login" ? "Dar neturi paskyros?" : "Jau turi paskyrą?"} <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMessage(""); }}>{mode === "login" ? "Registruokis" : "Prisijunk"}</button></p>}
    </>}
  </section>;
}
