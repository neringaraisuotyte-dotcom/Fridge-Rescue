"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Meal } from "@/lib/meals";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

export function FavoriteButton({ meal }: { meal: Meal }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const configured = isSupabaseConfigured();

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    let active = true;
    const refresh = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      setUserId(user?.id ?? null);
      if (user) {
        const { data } = await supabase.from("saved_recipes").select("meal_id").eq("user_id", user.id).eq("meal_id", meal.idMeal).maybeSingle();
        if (active) setSaved(Boolean(data));
      } else setSaved(false);
    };
    void refresh();
    return () => { active = false; };
  }, [meal.idMeal]);

  async function toggle() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !userId) return;
    setBusy(true);
    setNotice("");
    const result = saved
      ? await supabase.from("saved_recipes").delete().eq("user_id", userId).eq("meal_id", meal.idMeal)
      : await supabase.from("saved_recipes").insert({ user_id: userId, meal_id: meal.idMeal, meal_name: meal.strMeal, meal_thumb: meal.strMealThumb });
    if (result.error) setNotice("Nepavyko atnaujinti išsaugotų receptų. Patikrink Supabase lentelės sąranką.");
    else setSaved(!saved);
    setBusy(false);
  }

  if (!configured) return <p className="inline-note">Norint išsaugoti receptus, reikia sukonfigūruoti Supabase.</p>;
  if (!userId) return <p className="inline-note"><Link href="/account">Prisijunk</Link>, kad išsisaugotum šį receptą.</p>;
  return <div className="favorite-control"><button className={`button-secondary ${saved ? "is-saved" : ""}`} onClick={toggle} disabled={busy}>{saved ? "♥ Išsaugota" : "♡ Išsaugoti receptą"}</button>{notice && <span className="inline-note" role="alert">{notice}</span>}</div>;
}
