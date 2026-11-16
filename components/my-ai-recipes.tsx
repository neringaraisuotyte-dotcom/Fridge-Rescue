"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { SavedAiRecipe } from "@/lib/ai-recipes";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function MyAiRecipes() {
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUserId(session?.user.id ?? null));
    return () => subscription.unsubscribe();
  }, []);
  if (!userId) return null;
  return <AiRecipeCollection key={userId} userId={userId} />;
}

function AiRecipeCollection({ userId }: { userId: string }) {
  const [recipes, setRecipes] = useState<SavedAiRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const supabase = getSupabaseBrowserClient();
        if (!supabase) throw new Error("Prisijunk, kad matytum savo AI receptus.");
        const { data, error } = await supabase.from("ai_recipes")
          .select("id,user_id,original_recipe_name,original_recipe_id,user_request,parameters,ai_result,created_at")
          .eq("user_id", userId).order("created_at", { ascending: false });
        if (error) throw new Error("Nepavyko įkelti AI receptų. Patikrink, ar atlikta AI receptų Supabase sąranka, ir atnaujink puslapį.");
        if (active) setRecipes(data ?? []);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Nepavyko įkelti AI receptų.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [userId]);

  return <section id="my-ai-recipes" className="my-ai-recipes">
    <p className="eyebrow">TAVO ASMENINĖ KOLEKCIJA</p><h2>Mano AI receptai</h2>
    {loading ? <p role="status">Kraunami AI receptai…</p> : error ? <p className="notice error-notice" role="alert">{error}</p> : recipes.length === 0 ? <p>Dar neturi išsaugotų AI receptų. Po AI atsakymu spausk „Išsaugok pritaikytą receptą“.</p> : recipes.map((recipe) => <details className="saved-ai-recipe" key={recipe.id}>
      <summary>{recipe.original_recipe_name} <time dateTime={recipe.created_at}>{new Date(recipe.created_at).toLocaleString("lt-LT")}</time></summary>
      {recipe.original_recipe_id && <p><Link href={`/recipes/${encodeURIComponent(recipe.original_recipe_id)}`}>Originalus receptas →</Link></p>}
      <h3>Tavo prašymas</h3><p>{recipe.user_request || "Pasirinkti greitieji parametrai"}</p>
      <ul>
        {recipe.parameters.minutes && <li>Laikas: {recipe.parameters.minutes} min.</li>}
        {recipe.parameters.people && <li>Žmonių skaičius: {recipe.parameters.people}</li>}
        {recipe.parameters.goal && <li>Tikslas: {recipe.parameters.goal}</li>}
        {recipe.parameters.ingredients && <li>Turimi ingredientai: {recipe.parameters.ingredients}</li>}
      </ul>
      <h3>AI receptas</h3><div className="saved-ai-result">{recipe.ai_result}</div>
    </details>)}
  </section>;
}
