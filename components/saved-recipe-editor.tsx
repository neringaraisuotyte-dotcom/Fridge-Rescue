"use client";

import { FormEvent, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { SavedMeal } from "@/lib/saved-recipes";

const categories = ["Pusryčiai", "Greita", "Šventėms", "Pietūs", "Vakarienė", "Desertai", "Kita"];

export function SavedRecipeEditor({ meal, userId, onSaved, onRemoved }: {
  meal: SavedMeal;
  userId: string;
  onSaved: (meal: SavedMeal) => void;
  onRemoved: (mealId: string) => void;
}) {
  const [category, setCategory] = useState(meal.category ?? "");
  const [note, setNote] = useState(meal.note ?? "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    setBusy(true);
    setMessage("");
    const { error } = await supabase
      .from("saved_recipes")
      .update({ category: category || null, note: note.trim() || null })
      .eq("user_id", userId)
      .eq("meal_id", meal.meal_id);
    if (error) setMessage("Nepavyko išsaugoti. Patikrink Supabase migraciją.");
    else {
      onSaved({ ...meal, category: category || null, note: note.trim() || null });
      setMessage("Pakeitimai išsaugoti.");
    }
    setBusy(false);
  }

  async function remove() {
    if (!window.confirm(`Pašalinti „${meal.meal_name}“ iš Mano receptų?`)) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    setBusy(true);
    setMessage("");
    const { error } = await supabase
      .from("saved_recipes")
      .delete()
      .eq("user_id", userId)
      .eq("meal_id", meal.meal_id);
    if (error) {
      setMessage("Nepavyko pašalinti recepto. Pabandyk dar kartą.");
      setBusy(false);
    } else {
      onRemoved(meal.meal_id);
    }
  }

  return <form className="saved-recipe-editor" onSubmit={save}>
    <label>Kategorija
      <select value={category} onChange={(event) => { setCategory(event.target.value); setMessage(""); }}>
        <option value="">Be kategorijos</option>
        {categories.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
    </label>
    <label>Asmeninė pastaba
      <textarea value={note} onChange={(event) => { setNote(event.target.value); setMessage(""); }} maxLength={500} placeholder="Pvz., kitą kartą dėsiu mažiau druskos…" />
    </label>
    <div className="saved-editor-footer">
      <span className="saved-editor-message" role="status">{message}</span>
      <div className="saved-editor-actions"><button className="remove-recipe-button" type="button" onClick={remove} disabled={busy}>Pašalinti</button><button className="button-secondary" type="submit" disabled={busy}>{busy ? "Saugoma…" : "Išsaugoti"}</button></div>
    </div>
  </form>;
}
