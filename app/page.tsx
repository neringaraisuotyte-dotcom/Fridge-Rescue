"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import type { MealSummary } from "@/lib/meals";
import { RecipeId } from "@/components/recipe-id";

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [meals, setMeals] = useState<MealSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    setError("");
    try {
      const response = await fetch(`/api/meals/search?q=${encodeURIComponent(query.trim())}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Paieška nepavyko.");
      setMeals(payload.meals ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Nepavyko pasiekti receptų.");
      setMeals([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <section className="hero">
        <div className="hero-content">
          <p className="eyebrow"><span className="eyebrow-dot" /> TAVO ŠALDYTUVO IDĖJŲ GELBĖTOJAS</p>
          <h1>Kas šiandien<br /><em>ant stalo?</em></h1>
          <p className="hero-copy">Įrašyk ingredientą arba recepto ID ir atrask, ką skanaus gali pagaminti.</p>
          <form className="search-form" onSubmit={search}>
            <span className="search-icon" aria-hidden="true">⌕</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pvz., chicken, salmon arba 52772" aria-label="Įvesk ingredientą arba recepto ID" maxLength={80} />
            <button type="submit" disabled={loading || !query.trim()}>{loading ? "Ieškoma…" : "Ieškoti"}<span aria-hidden="true"> →</span></button>
          </form>
          <div className="suggestions"><span>Populiaru:</span>{["Chicken", "Pasta", "Salmon"].map((item) => <button key={item} onClick={() => setQuery(item)}>{item}</button>)}</div>
        </div>
        <div className="hero-art" aria-hidden="true"><div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" /><div className="plate"><div className="plate-food">🥗</div></div><span className="floating-note note-top">šviežia idėja ✦</span><span className="floating-note note-bottom">#nešvaistom</span></div>
        <span className="hero-number" aria-hidden="true">01 — 03</span>
      </section>

      <section className="results-section" id="recipes">
        <div className="section-heading"><div><p className="eyebrow">ATRASK KAŽKĄ SKANAUS</p><h2>{searched ? `Paieškos rezultatai${query ? `: „${query}“` : ""}` : "Receptai laukia tavęs"}</h2></div><span className="result-count">{searched && !loading ? `${meals.length} ${meals.length === 1 ? "receptas" : "receptų"}` : "TheMealDB kolekcija"}</span></div>
        {error && <div className="notice error-notice" role="alert">{error}</div>}
        {loading && <div className="empty-state"><span className="loader" /> Ieškome receptų…</div>}
        {!loading && searched && meals.length === 0 && !error && <div className="empty-state"><span className="empty-icon">⌕</span><h3>Nieko neradome</h3><p>Pabandyk kitą ingredientą ar patiekalo pavadinimą.</p></div>}
        {!loading && meals.length > 0 && <div className="recipe-grid">{meals.map((meal, index) => <article className="recipe-card" key={meal.idMeal}><Link href={`/recipes/${encodeURIComponent(meal.idMeal)}`}>
          <div className="recipe-image"><Image src={meal.strMealThumb} alt={meal.strMeal} fill sizes="(max-width: 700px) 100vw, (max-width: 1000px) 50vw, 33vw" priority={index < 3} /><span className="card-arrow" aria-hidden="true">↗</span></div>
          <div className="recipe-card-info"><span className="card-kicker">THEMEALDB · RECEPTAS</span><h3>{meal.strMeal}</h3><span className="view-recipe">Peržiūrėti receptą <span aria-hidden="true">→</span></span></div>
        </Link><RecipeId id={meal.idMeal} /></article>)}</div>}
        {!searched && <div className="welcome-cards"><article><span>01</span><h3>Ieškok ingredientu</h3><p>Pasirink produktą ir rask su juo susijusių patiekalų.</p></article><article><span>02</span><h3>Išsisaugok mėgstamus</h3><p>Sukurk savo asmeninę receptų kolekciją.</p></article><article><span>03</span><h3>Pritaikyk su AI</h3><p>Paprašyk OpenRouter padėti pritaikyti receptą.</p></article></div>}
      </section>
    </>
  );
}
