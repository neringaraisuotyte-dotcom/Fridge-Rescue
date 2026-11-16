"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AdaptRecipe } from "@/components/adapt-recipe";
import { FavoriteButton } from "@/components/favorite-button";
import { getIngredients, type Meal } from "@/lib/meals";

export default function RecipePage() {
  const params = useParams<{ id: string }>();
  const [meal, setMeal] = useState<Meal | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch(`/api/meals/${encodeURIComponent(params.id)}`).then(async (response) => {
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Nepavyko gauti recepto.");
      if (active) setMeal(payload.meal);
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : "Nepavyko gauti recepto.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [params.id]);

  if (loading) return <div className="page-wrap empty-state"><span className="loader" /> Kraunamas receptas…</div>;
  if (error || !meal) return <div className="page-wrap"><Link href="/" className="back-link">← Grįžti į paiešką</Link><div className="notice error-notice">{error || "Receptas nerastas."}</div></div>;
  const ingredients = getIngredients(meal);

  return <div className="page-wrap recipe-page">
    <Link href="/" className="back-link">← Visi receptai</Link>
    <section className="recipe-hero">
      <div className="recipe-detail-image"><Image src={meal.strMealThumb} alt={meal.strMeal} fill priority sizes="(max-width: 760px) 100vw, 50vw" /></div>
      <div className="recipe-detail-intro"><p className="eyebrow">{[meal.strArea, meal.strCategory].filter(Boolean).join(" · ") || "THEMEALDB RECEPTAS"}</p><h1>{meal.strMeal}</h1><p className="recipe-description">Peržiūrėk ingredientus ir gaminimo eigą, o receptą pritaikyk pagal tai, ką turi namuose.</p><FavoriteButton meal={meal} />
        {meal.strTags && <div className="tag-list">{meal.strTags.split(",").map((tag) => <span key={tag}>{tag.trim()}</span>)}</div>}
      </div>
    </section>
    <div className="recipe-columns"><section className="ingredients-panel"><p className="eyebrow">KO REIKĖS</p><h2>Ingredientai <span>({ingredients.length})</span></h2><ul>{ingredients.map(({ ingredient, measure }) => <li key={ingredient}><span className="ingredient-check">✓</span><span>{ingredient}</span><span className="measure">{measure}</span></li>)}</ul></section>
      <section className="instructions-panel"><p className="eyebrow">ŽINGSNIS PO ŽINGSNIO</p><h2>Gaminimo eiga</h2>{meal.strInstructions?.split(/\r?\n|(?<=\.)\s+(?=[A-Z])/).filter((step) => step.trim()).map((step, index) => <article className="instruction-step" key={`${index}-${step.slice(0, 18)}`}><span>{String(index + 1).padStart(2, "0")}</span><p>{step.trim()}</p></article>)}</section>
    </div>
    <AdaptRecipe meal={meal} />
  </div>;
}
