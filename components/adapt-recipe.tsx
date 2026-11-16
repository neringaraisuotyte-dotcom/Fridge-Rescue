"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import type { Meal } from "@/lib/meals";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

export function AdaptRecipe({ meal }: { meal: Meal }) {
  const [instruction, setInstruction] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setAnswer("");
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase?.auth.getSession() ?? { data: { session: null } };
    if (!data.session) {
      setError("Prisijunk prie paskyros, kad galėtum paprašyti AI pritaikymo.");
      setBusy(false);
      return;
    }
    try {
      const response = await fetch("/api/recipes/adapt", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` },
        body: JSON.stringify({ meal, request: instruction }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "AI pritaikymas nepavyko.");
      setAnswer(payload.answer);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "AI pritaikymas nepavyko.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="adapt-card">
    <div className="adapt-heading"><span className="adapt-icon">✳</span><div><p className="eyebrow">TAVO VIRTUVĖS ASISTENTAS</p><h2>Pritaikyk šį receptą</h2></div></div>
    <p>Trūksta ingrediento? Nori vegetariško varianto? Parašyk, ko reikia, ir AI pasiūlys pakeitimus.</p>
    {!isSupabaseConfigured() && <div className="notice">AI pritaikymui reikia Supabase prisijungimo ir OpenRouter rakto. Sąrankos instrukcijos — README faile.</div>}
    <form className="adapt-form" onSubmit={submit}>
      <label className="sr-only" htmlFor="adaptation-request">Kaip pritaikyti receptą?</label>
      <textarea id="adaptation-request" value={instruction} onChange={(event) => setInstruction(event.target.value)} maxLength={500} required placeholder="Pvz., pritaikyk receptą be pieno produktų..." />
      <div className="adapt-form-footer"><span>{instruction.length}/500</span><button className="button-primary" disabled={busy || !instruction.trim()}>{busy ? "Galvojama…" : "Pritaikyti receptą"}<span> ✦</span></button></div>
    </form>
    {error && <div className="notice error-notice" role="alert">{error} {error.startsWith("Prisijunk") && <Link href="/account">Prisijungti →</Link>}</div>}
    {answer && <div className="ai-answer"><p className="eyebrow">AI PASIŪLYMAS</p><div>{answer}</div><p className="ai-disclaimer">AI pasiūlymą peržiūrėk prieš gamindamas, ypač jei keiti alergiją sukeliančius produktus.</p></div>}
  </section>;
}
