"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { SaveAiRecipe } from "@/components/save-ai-recipe";
import type { MealSummary } from "@/lib/meals";
import type { AiRecipeDraft } from "@/lib/ai-recipes";
import { trackedFetch } from "@/lib/api-telemetry";

export function AiHelp() {
  const [signedIn, setSignedIn] = useState(false);
  const [ingredients, setIngredients] = useState("");
  const [question, setQuestion] = useState("");
  const [minutes, setMinutes] = useState<number | null>(null);
  const [people, setPeople] = useState<number | null>(null);
  const [goal, setGoal] = useState("");
  const preferences = [
    minutes ? `Gaminimui turiu iki ${minutes} minučių.` : "",
    people ? `Gaminsiu ${people} žmonėms.` : "",
    goal ? `Norimas rezultatas: ${goal}.` : "",
  ].filter(Boolean).join(" ");
  const [recipes, setRecipes] = useState<MealSummary[]>([]);
  const [answer, setAnswer] = useState("");
  const [draft, setDraft] = useState<AiRecipeDraft | null>(null);
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
    setBusy(true); setError(""); setAnswer(""); setRecipes([]); setDraft(null);
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase?.auth.getSession() ?? { data: { session: null } };
    if (!data.session) { setError("Prisijunk, kad galėtum gauti AI pagalbą."); setBusy(false); return; }
    try {
      const response = await trackedFetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` },
        body: JSON.stringify({ ingredients, request: question, preferences }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "AI pagalbos užklausa nepavyko.");
      setAnswer(payload.answer);
      setRecipes(payload.recipes ?? []);
      if (payload.recipes?.length) setDraft({ user_id: data.session.user.id, original_recipe_name: payload.recipes.map((recipe: MealSummary) => recipe.strMeal).join(", "), original_recipe_id: payload.recipes.length === 1 ? payload.recipes[0].idMeal : null, user_request: question, parameters: { minutes, people, goal, ingredients, recipe_ids: payload.recipes.map((recipe: MealSummary) => recipe.idMeal) }, ai_result: payload.answer });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "AI pagalbos užklausa nepavyko.");
    } finally { setBusy(false); }
  }

  return <section className="ai-help-section" id="ai-help">
    <div className="ai-help-intro"><p className="eyebrow">OPENROUTER VIRTUVĖS ASISTENTAS</p><h2>AI receptų paieška</h2><p>Aprašyk, ko norėtum — AI pasiūlys receptų iš „TheMealDB“ kolekcijos. Receptų pagal išsaugotus produktus ieškok paskyros skiltyje <Link href="/account#my-kitchen">Mano virtuvė</Link>.</p></div>
    {!isSupabaseConfigured() && <div className="notice">AI pagalbai reikia Supabase paskyros ir OpenRouter API rakto. Sąrankos žingsniai pateikti README.</div>}
    <form className="ai-help-form" onSubmit={submit}>
      <div className="adapt-options">
        <fieldset disabled={busy}><legend>Kiek laiko turiu?</legend><div>{[15, 30, 60].map((value) => <button type="button" key={value} aria-pressed={minutes === value} onClick={() => setMinutes(minutes === value ? null : value)}>{value} min.</button>)}</div></fieldset>
        <fieldset disabled={busy}><legend>Kiek žmonių?</legend><div>{[1, 2, 4, 6].map((value) => <button type="button" key={value} aria-pressed={people === value} onClick={() => setPeople(people === value ? null : value)}>{value}</button>)}</div></fieldset>
        <fieldset disabled={busy}><legend>Ko noriu?</legend><div>{["paprasčiau", "pigiau", "sveikiau", "kuo panašiau į originalą"].map((value) => <button type="button" key={value} aria-pressed={goal === value} onClick={() => setGoal(goal === value ? "" : value)}>{value}</button>)}</div></fieldset>
      </div>
      <label>Turimi ingredientai <span>(nebūtina)</span><input value={ingredients} onChange={(event) => setIngredients(event.target.value)} maxLength={300} placeholder="Pvz., chicken, rice, spinach" /></label>
      <label>Kuo galiu padėti?<textarea value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={500} required={!preferences && !ingredients.trim()} placeholder="Pvz., ką galėčiau pagaminti per 20 minučių?" /></label>
      <div className="ai-help-footer"><span>{question.length}/500</span><button className="button-primary" disabled={busy || !(question.trim() || preferences || ingredients.trim())}>{busy ? "Ruošiu atsakymą…" : "Rasti receptus knygoje"}<span aria-hidden="true"> ✦</span></button></div>
    </form>
    {signedIn && !answer && <p className="ai-help-auth">Gavęs AI atsakymą, galėsi spausti „Išsaugoti AI receptą“. Jį rasi skiltyje <Link href="/account#my-ai-recipes">Mano AI receptai</Link>.</p>}
    {!signedIn && isSupabaseConfigured() && <p className="ai-help-auth">Norint siųsti klausimą, reikia <Link href="/account">prisijungti prie paskyros</Link>.</p>}
    {error && <div className="notice error-notice" role="alert">{error} {error.includes("Prisijunk") && <Link href="/account">Prisijungti →</Link>}</div>}
    {answer && <div className="ai-answer"><p className="eyebrow">AI ATSAKYMAS</p><div>{answer}</div>{recipes.length > 0 && <ul>{recipes.map((recipe) => <li key={recipe.idMeal}><Link href={`/recipes/${encodeURIComponent(recipe.idMeal)}`}>{recipe.strMeal} →</Link></li>)}</ul>}<p className="ai-disclaimer">AI pasiūlymą įvertink prieš gamindamas, ypač jei jis susijęs su alergijomis.</p>{draft && <SaveAiRecipe draft={draft} />}</div>}
  </section>;
}
