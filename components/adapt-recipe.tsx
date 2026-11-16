"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import type { Meal } from "@/lib/meals";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

export function AdaptRecipe({ meal }: { meal: Meal }) {
  const [instruction, setInstruction] = useState("");
  const [minutes, setMinutes] = useState<number | null>(null);
  const [people, setPeople] = useState<number | null>(null);
  const [goal, setGoal] = useState("");
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
        body: JSON.stringify({ meal, request: instruction, preferences: { minutes, people, goal } }),
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
    <p>AI automatiškai gaus pasirinkto recepto ingredientus ir gaminimo instrukciją. Aprašyk savo situaciją, kad galėtų paruošti tau pritaikytą variantą.</p>
    <p className="adapt-recipe-context">Pritaikomas receptas: <strong>{meal.strMeal}</strong></p>
    {!isSupabaseConfigured() && <div className="notice">AI pritaikymui reikia Supabase prisijungimo ir OpenRouter rakto. Sąrankos instrukcijos — README faile.</div>}
    <form className="adapt-form" onSubmit={submit}>
      <div className="adapt-options">
        <fieldset disabled={busy}><legend>Kiek laiko turiu?</legend><div>{[15, 30, 60].map((value) => <button type="button" key={value} aria-pressed={minutes === value} onClick={() => setMinutes(minutes === value ? null : value)}>{value} min.</button>)}</div></fieldset>
        <fieldset disabled={busy}><legend>Kiek žmonių?</legend><div>{[1, 2, 4, 6].map((value) => <button type="button" key={value} aria-pressed={people === value} onClick={() => setPeople(people === value ? null : value)}>{value}</button>)}</div></fieldset>
        <fieldset disabled={busy}><legend>Ko noriu?</legend><div>{["paprasčiau", "pigiau", "sveikiau", "kuo panašiau į originalą"].map((value) => <button type="button" key={value} aria-pressed={goal === value} onClick={() => setGoal(goal === value ? "" : value)}>{value}</button>)}</div></fieldset>
      </div>
      <p className="inline-note">Pasirink, kas svarbu. Pakartotinai paspaudus pasirinkimas panaikinamas. Papildomą situaciją gali aprašyti žemiau.</p>
      <label htmlFor="adaptation-request">Tavo situacija</label>
      <div className="adapt-suggestions" aria-label="Pavyzdiniai prašymai">
        <button type="button" onClick={() => setInstruction("Neturiu pieno ir sviesto, turiu tik 30 minučių.")}>Be pieno · iki 30 min.</button>
        <button type="button" onClick={() => setInstruction("Gaminsiu keturiems žmonėms ir nenoriu labai aštraus maisto.")}>4 žmonėms · švelniau</button>
      </div>
      <textarea id="adaptation-request" value={instruction} onChange={(event) => setInstruction(event.target.value)} maxLength={500} disabled={busy} placeholder="Pvz., Neturiu pieno ir sviesto." />
      <div className="adapt-form-footer"><span>{instruction.length}/500</span><button className="button-primary" disabled={busy || !(instruction.trim() || minutes || people || goal)}>{busy ? "Pritaikomas receptas…" : "✨ Pritaikyti receptą"}</button></div>
    </form>
    {error && <div className="notice error-notice" role="alert">{error} {error.startsWith("Prisijunk") && <Link href="/account">Prisijungti →</Link>}</div>}
    {answer && <div className="ai-answer"><p className="eyebrow">AI PASIŪLYMAS</p><div>{answer}</div><p className="ai-disclaimer">AI pasiūlymą peržiūrėk prieš gamindamas, ypač jei keiti alergiją sukeliančius produktus.</p></div>}
  </section>;
}
