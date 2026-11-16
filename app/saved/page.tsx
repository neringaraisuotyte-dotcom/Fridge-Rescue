"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

type SavedMeal = { meal_id: string; meal_name: string; meal_thumb: string };

export default function SavedPage() {
  const [items, setItems] = useState<SavedMeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [configured] = useState(isSupabaseConfigured());
  const [signedIn, setSignedIn] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) { setLoading(false); return; }
    let active = true;
    async function refresh() {
      const { data: { user } } = await supabase!.auth.getUser();
      if (!active) return;
      setSignedIn(Boolean(user));
      if (!user) { setItems([]); setLoading(false); return; }
      const { data, error: queryError } = await supabase!.from("saved_recipes").select("meal_id,meal_name,meal_thumb").eq("user_id", user.id).order("created_at", { ascending: false });
      if (!active) return;
      if (queryError) setError("Nepavyko įkelti kolekcijos. Patikrink, ar Supabase SQL sąranka atlikta.");
      else setItems(data ?? []);
      setLoading(false);
    }
    void refresh();
    return () => { active = false; };
  }, []);

  return <section className="page-wrap saved-page"><p className="eyebrow">TAVO ASMENINĖ KOLEKCIJA</p><div className="section-heading"><div><h1>Išsaugoti receptai</h1><p className="recipe-description">Visi patiekalai, prie kurių norėsi sugrįžti.</p></div>{signedIn && <span className="result-count">{items.length} receptų</span>}</div>
    {!configured ? <div className="notice">Supabase dar nesukonfigūruotas. Sąrankos instrukcijos pateiktos README.</div> : loading ? <div className="empty-state"><span className="loader" /> Kraunama kolekcija…</div> : !signedIn ? <div className="empty-state"><span className="empty-icon">♡</span><h2>Prisijunk prie savo kolekcijos</h2><p>Išsaugoti receptai bus čia.</p><Link href="/account" className="button-primary">Prisijungti →</Link></div> : error ? <div className="notice error-notice">{error}</div> : items.length === 0 ? <div className="empty-state"><span className="empty-icon">♡</span><h2>Kolekcija dar tuščia</h2><p>Rask patinkantį receptą ir išsisaugok jį vėlesniam laikui.</p><Link href="/" className="button-primary">Ieškoti receptų →</Link></div> : <div className="recipe-grid">{items.map((meal) => <Link href={`/recipes/${meal.meal_id}`} className="recipe-card" key={meal.meal_id}><div className="recipe-image"><Image src={meal.meal_thumb} alt={meal.meal_name} fill sizes="(max-width: 700px) 100vw, (max-width: 1000px) 50vw, 33vw" /></div><div className="recipe-card-info"><span className="card-kicker">TAVO IŠSAUGOTAS RECEPTAS</span><h3>{meal.meal_name}</h3><span className="view-recipe">Atidaryti receptą →</span></div></Link>)}</div>}
  </section>;
}
