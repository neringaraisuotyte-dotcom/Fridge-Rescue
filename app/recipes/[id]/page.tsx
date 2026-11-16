"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { FavoriteButton } from "@/components/favorite-button";
import { RecipeId } from "@/components/recipe-id";
import { getIngredients, type Meal } from "@/lib/meals";
import { trackedFetch } from "@/lib/api-telemetry";

export default function RecipePage() {
  const params = useParams<{ id: string }>();
  return <RecipeDetails key={params.id} id={params.id} />;
}

function RecipeDetails({ id }: { id: string }) {
  const [meal, setMeal] = useState<Meal | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    trackedFetch(`/api/meals/${encodeURIComponent(id)}`, { signal: controller.signal }).then(async (response) => {
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Nepavyko gauti recepto.");
      if (active) setMeal(payload.meal);
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : "Nepavyko gauti recepto.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [id]);

  if (loading) return <div className="page-wrap empty-state"><span className="loader" /> Kraunamas receptas…</div>;
  if (error || !meal) return <div className="page-wrap"><Link href="/" className="back-link">← Grįžti į paiešką</Link><div className="notice error-notice">{error || "Receptas nerastas."}</div></div>;
  const ingredients = getIngredients(meal);

  return <div className="page-wrap recipe-page">
    <Link href="/" className="back-link">← Visi receptai</Link>
    <section className="recipe-hero">
      <div className="recipe-detail-image"><Image src={meal.strMealThumb} alt={meal.strMeal} fill priority sizes="(max-width: 760px) 100vw, 50vw" /></div>
      <div className="recipe-detail-intro"><p className="eyebrow">THEMEALDB RECEPTAS</p><h1>{meal.strMeal}</h1><RecipeId id={meal.idMeal} /><dl className="recipe-metadata"><div><dt>Kategorija</dt><dd>{meal.strCategory || "Nenurodyta"}</dd></div><div><dt>Kilmės šalis arba regionas</dt><dd>{meal.strArea || "Nenurodyta"}</dd></div></dl><p className="recipe-description">Peržiūrėk ingredientus ir gaminimo eigą, o receptą pritaikyk pagal tai, ką turi namuose.</p><FavoriteButton meal={meal} />
        {meal.strTags && <div className="tag-list">{meal.strTags.split(",").map((tag) => <span key={tag}>{tag.trim()}</span>)}</div>}
      </div>
    </section>
    <div className="recipe-columns"><section className="ingredients-panel"><p className="eyebrow">KO REIKĖS</p><h2>Ingredientai <span>({ingredients.length})</span></h2><ul>{ingredients.map(({ ingredient, measure }, index) => <li key={`${index}-${ingredient}`}><span className="ingredient-check">✓</span><span>{ingredient}</span><span className="measure">{measure}</span></li>)}</ul></section>
      <section className="instructions-panel"><p className="eyebrow">ŽINGSNIS PO ŽINGSNIO</p><h2>Gaminimo eiga</h2>{meal.strInstructions?.split(/\r?\n|(?<=\.)\s+(?=[A-Z])/).filter((step) => step.trim()).map((step, index) => <article className="instruction-step" key={`${index}-${step.slice(0, 18)}`}><span>{String(index + 1).padStart(2, "0")}</span><p>{step.trim()}</p></article>)}</section>
    </div>
  </div>;
}
