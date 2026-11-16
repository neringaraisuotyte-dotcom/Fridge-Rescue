"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SavedRecipeEditor } from "@/components/saved-recipe-editor";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { SavedMeal } from "@/lib/saved-recipes";

export function SavedRecipesManager() {
  const [items, setItems] = useState<SavedMeal[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured());
  const [configured] = useState(isSupabaseConfigured());
  const [categoryFilter, setCategoryFilter] = useState("");
  const [textFilter, setTextFilter] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    let active = true;

    async function refresh() {
      const { data: { user } } = await supabase!.auth.getUser();
      if (!active) return;
      setUserId(user?.id ?? null);
      if (!user) {
        setItems([]);
        setLoading(false);
        return;
      }

      const { data, error: queryError } = await supabase!
        .from("saved_recipes")
        .select("meal_id,meal_name,meal_thumb,category,note")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (!active) return;
      if (queryError) setError("Nepavyko įkelti receptų. Patikrink Supabase SQL sąranką.");
      else {
        setError("");
        setItems(data ?? []);
      }
      setLoading(false);
    }

    void refresh();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        setUserId(null);
        setItems([]);
        setLoading(false);
        setCategoryFilter("");
        setTextFilter("");
      } else if (event === "SIGNED_IN") {
        setItems([]);
        setLoading(true);
        window.setTimeout(() => { if (active) void refresh(); }, 0);
      }
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const categories = useMemo(
    () => [...new Set(items.map((item) => item.category).filter((category): category is string => Boolean(category)))].sort((a, b) => a.localeCompare(b, "lt")),
    [items],
  );
  const filteredItems = useMemo(() => {
    const normalizedText = textFilter.trim().toLocaleLowerCase("lt");
    return items.filter((item) => {
      const matchesCategory = !categoryFilter || item.category === categoryFilter;
      const matchesText = !normalizedText || item.meal_name.toLocaleLowerCase("lt").includes(normalizedText);
      return matchesCategory && matchesText;
    });
  }, [items, categoryFilter, textFilter]);

  function updateItem(updated: SavedMeal) {
    setItems((current) => current.map((item) => item.meal_id === updated.meal_id ? updated : item));
  }

  function removeItem(mealId: string) {
    setItems((current) => current.filter((item) => item.meal_id !== mealId));
  }

  return <section id="my-saved-recipes" className="account-saved-section">
    <p className="eyebrow">TAVO ASMENINĖ KOLEKCIJA</p>
    <div className="section-heading">
      <div><h1>Mano išsaugoti receptai</h1><p className="recipe-description">Tavo išsaugoti ir asmeniškai susitvarkyti receptai.</p></div>
      {userId && <span className="result-count">{filteredItems.length} iš {items.length} receptų</span>}
    </div>

    {!configured ? <div className="notice">Supabase dar nesukonfigūruotas. Sąrankos instrukcijos pateiktos README.</div>
      : loading ? <div className="empty-state"><span className="loader" /> Kraunama kolekcija…</div>
      : !userId ? <div className="empty-state"><span className="empty-icon">♡</span><h2>Prisijunk prie savo receptų</h2><p>Išsaugotus receptus gali matyti tik prisijungęs vartotojas.</p><Link href="/account" className="button-primary">Prisijungti →</Link></div>
      : error ? <div className="notice error-notice" role="alert">{error}</div>
      : items.length === 0 ? <div className="empty-state"><span className="empty-icon">♡</span><h2>Dar neišsaugojai receptų</h2><p>Rask patinkantį receptą ir išsisaugok jį čia.</p><Link href="/" className="button-primary">Ieškoti receptų →</Link></div>
      : <>
        <div className="saved-filters">
          <label>Ieškoti pavadinimo<input type="search" value={textFilter} onChange={(event) => setTextFilter(event.target.value)} placeholder="Pvz., chicken" /></label>
          <label>Filtruoti kategoriją<select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="">Visos kategorijos</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
        </div>
        {filteredItems.length === 0 ? <div className="empty-state"><span className="empty-icon">⌕</span><h2>Receptų pagal filtrą nėra</h2><p>Pakeisk paieškos žodį arba pasirink kitą kategoriją.</p><button className="button-secondary" onClick={() => { setTextFilter(""); setCategoryFilter(""); }}>Išvalyti filtrus</button></div>
          : <div className="recipe-grid">{filteredItems.map((meal) => <article className="recipe-card saved-recipe-card" key={meal.meal_id}>
            <Link href={`/recipes/${meal.meal_id}`} className="recipe-image"><Image src={meal.meal_thumb} alt={meal.meal_name} fill sizes="(max-width: 700px) 100vw, (max-width: 1000px) 50vw, 33vw" /></Link>
            <div className="recipe-card-info"><span className="card-kicker">TAVO IŠSAUGOTAS RECEPTAS</span><Link href={`/recipes/${meal.meal_id}`} className="saved-card-title">{meal.meal_name}</Link>{meal.category && <span className="saved-category-badge">{meal.category}</span>}</div>
            <SavedRecipeEditor meal={meal} userId={userId} onSaved={updateItem} onRemoved={removeItem} />
          </article>)}</div>}
      </>}
  </section>;
}

