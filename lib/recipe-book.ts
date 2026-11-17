import { getIngredients, type Meal } from "@/lib/meals";

// Search each initial to include the collection, rather than a random sample.
export async function getRecipeBook() {
  const groups = await Promise.all(Array.from("abcdefghijklmnopqrstuvwxyz", async (letter) => {
    const response = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?f=${letter}`, {
      next: { revalidate: 3600 }, signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error("Recipe book unavailable");
    const data = await response.json() as { meals: Meal[] | null };
    if (data.meals !== null && !Array.isArray(data.meals)) throw new Error("Invalid recipe book");
    return data.meals ?? [];
  }));
  return [...new Map(groups.flat().map((meal) => [meal.idMeal, meal])).values()];
}

export function recipeBookContext(meals: Meal[]) {
  return meals.map((meal) => ({ id: meal.idMeal, name: meal.strMeal,
    category: meal.strCategory, cuisine: meal.strArea,
    ingredients: getIngredients(meal).map(({ ingredient }) => ingredient) }));
}

export function selectBookRecipes(content: string, meals: Meal[]) {
  const result: unknown = JSON.parse(content);
  if (!result || typeof result !== "object" || !("recipe_ids" in result)
    || !Array.isArray(result.recipe_ids) || !result.recipe_ids.every((id: unknown) => typeof id === "string")) {
    throw new Error("Invalid recipe selection");
  }
  const ids = new Set(result.recipe_ids);
  if ([...ids].some((id) => !meals.some((meal) => meal.idMeal === id))) {
    throw new Error("Recipe outside book");
  }
  return [...ids].slice(0, 3).map((id) => {
    const meal = meals.find((entry) => entry.idMeal === id)!;
    return { idMeal: meal.idMeal, strMeal: meal.strMeal, strMealThumb: meal.strMealThumb };
  });
}
