"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

export function AiHelp() {
  const [signedIn, setSignedIn] = useState(false);
  const [ingredients, setIngredients] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    let active = true;
    void supabase.auth.getUser().then(({ data }) => { if (active) setSignedIn(Boolean(data.user)); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(Boolean(session?.user)));
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setAnswer("");
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase?.auth.getSession() ?? { data: { session: null } };
    if (!data.session) {
      setError("Prisijunk, kad galėtum gauti AI pagalbą.");
      setBusy(false);
      return;
    }
    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` },
        body: JSON.stringify({ ingredients, request: question }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "AI pagalbos užklausa nepavyko.");
      setAnswer(payload.answer);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "AI pagalbos užklausa nepavyko.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="ai-help-section" id="ai-help">
    <div className="ai-help-intro"><p className="eyebrow">OPENROUTER VIRTUVĖS ASISTENTAS</p><h2>Prireikė pagalbos?</h2><p>Parašyk, ką turi šaldytuve arba ko norėtum sužinoti — AI pasiūlys idėjų ir patarimų.</p></div>
    {!isSupabaseConfigured() && <div className="notice">AI pagalbai reikia Supabase paskyros ir OpenRouter API rakto. Sąrankos žingsniai pateikti README.</div>}
    <form className="ai-help-form" onSubmit={submit}>
      <label>Turimi ingredientai <span>(nebūtina)</span><input value={ingredients} onChange={(event) => setIngredients(event.target.value)} maxLength={300} placeholder="Pvz., chicken, rice, spinach" /></label>
      <label>Kuo galiu padėti?<textarea value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={500} required placeholder="Pvz., ką galėčiau pagaminti per 20 minučių?" /></label>
      <div className="ai-help-footer"><span>{question.length}/500</span><button className="button-primary" disabled={busy || !question.trim()}>{busy ? "Ruošiu atsakymą…" : "Paklausti OpenRouter AI"}<span aria-hidden="true"> ✦</span></button></div>
    </form>
    {!signedIn && isSupabaseConfigured() && <p className="ai-help-auth">Norint siųsti klausimą, reikia <Link href="/account">prisijungti prie paskyros</Link>.</p>}
    {error && <div className="notice error-notice" role="alert">{error} {error.includes("Prisijunk") && <Link href="/account">Prisijungti →</Link>}</div>}
    {answer && <div className="ai-answer"><p className="eyebrow">AI ATSAKYMAS</p><div>{answer}</div><p className="ai-disclaimer">AI pasiūlymą įvertink prieš gamindamas, ypač jei jis susijęs su alergijomis.</p></div>}
  </section>;
}
