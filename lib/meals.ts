export type Meal = {
  idMeal: string;
  strMeal: string;
  strMealThumb: string;
  strCategory?: string | null;
  strArea?: string | null;
  strInstructions?: string | null;
  strTags?: string | null;
  strYoutube?: string | null;
  [key: `strIngredient${number}`]: string | null | undefined;
  [key: `strMeasure${number}`]: string | null | undefined;
};

export type MealSummary = Pick<Meal, "idMeal" | "strMeal" | "strMealThumb">;

export function getIngredients(meal: Meal) {
  return Array.from({ length: 20 }, (_, index) => {
    const number = index + 1;
    const ingredient = meal[`strIngredient${number}`]?.trim();
    const measure = meal[`strMeasure${number}`]?.trim();
    return ingredient ? { ingredient, measure: measure || "" } : null;
  }).filter((entry): entry is { ingredient: string; measure: string } => entry !== null);
}
