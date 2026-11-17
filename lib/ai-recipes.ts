export type AiRecipeDraft = {
  user_id: string;
  original_recipe_name: string;
  original_recipe_id: string | null;
  user_request: string;
  parameters: { minutes: number | null; people: number | null; goal: string; ingredients?: string };
  ai_result: string;
};

export type SavedAiRecipe = AiRecipeDraft & { id: string; created_at: string };
