"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import type { MealSummary } from "@/lib/meals";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { trackedFetch } from "@/lib/api-telemetry";

type KitchenItem = { id: string; name: string };

export function MyKitchen() {
  const [items, setItems] = useState<KitchenItem[]>([]);
  const [value, setValue] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState<MealSummary[]>([]);
  const [suggestionError, setSuggestionError] = useState("");
  const [suggestionBusy, setSuggestionBusy] = useState(false);
  const [suggestedFrom, setSuggestedFrom] = useState<string[]>([]);
  const supabase = getSupabaseBrowserClient();

  const loadItems = useCallback(async () => {
    if (!supabase) { setLoading(false); setError("Supabase dar nesukonfigūruotas."); return; }
    const { data: { session } } = await supabase.auth.getSession();
    setUserId(session?.user.id ?? null);
    if (!session) { setItems([]); setSuggestions([]); setSuggestedFrom([]); setLoading(false); return; }
    const { data, error: queryError } = await supabase.from("kitchen_items").select("id,name").eq("user_id", session.user.id).order("name");
    if (queryError) setError("Nepavyko gauti virtuvės produktų. Patikrink, ar Supabase pritaikyta nauja migracija.");
    else setItems(data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadItems();
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
      setItems([]); setSuggestions([]); setSuggestedFrom([]);
      if (!session) { setItems([]); setSuggestions([]); setSuggestedFrom([]); setLoading(false); return; }
      setLoading(true);
      window.setTimeout(() => { void loadItems(); }, 0);
    });
    return () => subscription.unsubscribe();
  }, [loadItems, supabase]);

  async function addItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = value.trim().replace(/\s+/g, " ");
    if (!name || !userId || !supabase) return;
    setBusy(true); setError("");
    const { data, error: insertError } = await supabase.from("kitchen_items").insert({ user_id: userId, name }).select("id,name").single();
    if (insertError) setError(insertError.code === "23505" ? "Šis produktas jau yra tavo sąraše." : "Nepavyko išsaugoti produkto.");
    else { setItems((current) => [...current, data].sort((a, b) => a.name.localeCompare(b.name, "lt"))); setSuggestions([]); setSuggestedFrom([]); setValue(""); }
    setBusy(false);
  }

  async function removeItem(item: KitchenItem) {
    if (!supabase) return;
    setError("");
    const { error: deleteError } = await supabase.from("kitchen_items").delete().eq("id", item.id).eq("user_id", userId);
    if (deleteError) setError("Nepavyko pašalinti produkto.");
    else { setItems((current) => current.filter(({ id }) => id !== item.id)); setSuggestions([]); setSuggestedFrom([]); }
  }

  async function suggestRecipes() {
    if (!supabase || !userId || items.length === 0) return;
    setSuggestionBusy(true); setSuggestionError(""); setSuggestions([]); setSuggestedFrom([]);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Prisijunk, kad galėtum gauti receptų pasiūlymus.");
      const response = await trackedFetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ useKitchen: true, request: "Pasiūlyk receptus pagal mano virtuvės produktus." }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Nepavyko parinkti receptų.");
      setSuggestions(payload.recipes ?? []);
      setSuggestedFrom(payload.kitchenProducts ?? items.map(({ name }) => name));
    } catch (cause) {
      setSuggestionError(cause instanceof Error ? cause.message : "Nepavyko parinkti receptų.");
    } finally {
      setSuggestionBusy(false);
    }
  }

  return <section className="kitchen-card" aria-labelledby="my-kitchen-heading">
    <div className="kitchen-heading"><div><p className="eyebrow">TAVO PRODUKTŲ SĄRAŠAS</p><h2 id="my-kitchen-heading">Mano virtuvė</h2></div><span aria-hidden="true">🥕</span></div>
    <p>Tvarkyk turimus produktus ir paprašyk AI pasiūlyti receptų būtent iš jų.</p>
    {!userId && !loading && <div className="notice">Prisijunk, kad galėtum išsaugoti virtuvės produktus ir pagal juos gauti receptų pasiūlymus. <Link href="/account">Prisijungti →</Link></div>}
    {userId && <form className="kitchen-form" onSubmit={addItem}><label className="sr-only" htmlFor="kitchen-item">Produktas</label><input id="kitchen-item" value={value} onChange={(event) => setValue(event.target.value)} maxLength={100} placeholder="Pvz., kiaušiniai, ryžiai, pomidorai" disabled={busy} /><button className="button-primary" disabled={busy || !value.trim()}>{busy ? "Saugoma…" : "Pridėti"}</button></form>}
    {error && <div className="notice error-notice" role="alert">{error}</div>}
    {loading ? <p className="inline-note">Kraunamas produktų sąrašas…</p> : userId && (items.length ? <ul className="kitchen-items">{items.map((item) => <li key={item.id}><span>{item.name}</span><button type="button" aria-label={`Pašalinti ${item.name}`} onClick={() => void removeItem(item)}>Pašalinti</button></li>)}</ul> : <p className="kitchen-empty">Sąrašas tuščias. Pridėk produktų, kad AI galėtų pasiūlyti receptų.</p>)}
    {userId && <div className="kitchen-suggestions">
      <div className="kitchen-suggestions-heading"><div><h3>Receptai iš tavo virtuvės</h3><p>AI parinks receptus pagal čia išsaugotus produktus.</p></div><button className="button-primary" type="button" onClick={() => void suggestRecipes()} disabled={suggestionBusy || items.length === 0}>{suggestionBusy ? "Ieškoma…" : "✨ Rasti receptus pagal Mano virtuvę"}</button></div>
      {suggestionError && <div className="notice error-notice" role="alert">{suggestionError}</div>}
      {suggestedFrom.length > 0 && <p className="inline-note">Pasiūlymai pagal: {suggestedFrom.join(", ")}</p>}
      {!suggestionBusy && suggestions.length > 0 && <div className="recipe-grid kitchen-recipe-grid">{suggestions.map((meal) => <article className="recipe-card" key={meal.idMeal}><Link href={`/recipes/${encodeURIComponent(meal.idMeal)}`}><div className="recipe-image"><Image src={meal.strMealThumb} alt={meal.strMeal} fill sizes="(max-width: 700px) 100vw, (max-width: 1000px) 50vw, 33vw" /></div><div className="recipe-card-info"><span className="card-kicker">PASIŪLYTA PAGAL MANO VIRTUVĘ</span><h3>{meal.strMeal}</h3><span className="view-recipe">Peržiūrėti receptą →</span></div></Link></article>)}</div>}
      {!suggestionBusy && suggestions.length === 0 && suggestedFrom.length > 0 && !suggestionError && <p className="kitchen-empty">Pagal šiuos produktus receptų nerasta. Pridėk dar produktų arba bandyk vėl.</p>}
    </div>}
  </section>;
}
