import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getIngredients, type Meal } from "@/lib/meals";
import { withOperationHeaders } from "@/lib/api-operation-headers";

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!apiKey) return NextResponse.json({ error: "Serveryje nenustatytas OpenRouter API raktas." }, { status: 503 });
  if (!supabaseUrl || !supabaseKey) return NextResponse.json({ error: "Supabase dar nesukonfigūruotas." }, { status: 503 });

  const accessToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!accessToken) return NextResponse.json({ error: "Prisijunk, kad galėtum pritaikyti receptą." }, { status: 401 });
  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${accessToken}` } } });
  const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
  if (authError || !user) return NextResponse.json({ error: "Sesija nebegalioja. Prisijunk iš naujo." }, { status: 401 });

  // Read the kitchen with the user's JWT so Supabase RLS remains the authority
  // for which products this request can see.
  const { data: kitchenRows, error: kitchenError } = await supabase
    .from("kitchen_items")
    .select("name")
    .eq("user_id", user.id)
    .order("name");
  if (kitchenError) {
    console.error("Could not read user's kitchen", kitchenError.message);
    return NextResponse.json({ error: "Nepavyko gauti tavo virtuvės produktų. Patikrink Supabase migraciją." }, { status: 503 });
  }
  const kitchenItems = (kitchenRows ?? []).map((item) => item.name);

  let body: { meal?: Meal; request?: unknown; preferences?: { minutes?: unknown; people?: unknown; goal?: unknown } };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Netaisyklinga užklausa." }, { status: 400 });
  }
  const meal = body.meal;
  const instruction = typeof body.request === "string" ? body.request.trim() : "";
  const preferences = body.preferences ?? {};
  if (typeof preferences !== "object" || Array.isArray(preferences)
    || (preferences.minutes != null && ![15, 30, 60].includes(preferences.minutes as number))
    || (preferences.people != null && ![1, 2, 4, 6].includes(preferences.people as number))
    || (preferences.goal != null && !["", "paprasčiau", "pigiau", "sveikiau", "kuo panašiau į originalą"].includes(preferences.goal as string))) {
    return NextResponse.json({ error: "Netinkami greitieji pasirinkimai." }, { status: 400 });
  }
  const selectedPreferences = [
    preferences.minutes ? `Gaminimui turiu iki ${preferences.minutes} minučių.` : "",
    preferences.people ? `Pritaikyk receptą ${preferences.people} žmonėms.` : "",
    preferences.goal ? `Norimas rezultatas: ${preferences.goal}.` : "",
  ].filter(Boolean).join(" ");
  if (!meal || typeof meal.idMeal !== "string" || typeof meal.strMeal !== "string" || typeof meal.strInstructions !== "string" || !(instruction || selectedPreferences) || instruction.length > 500) {
    return NextResponse.json({ error: "Pateik receptą ir trumpą pritaikymo prašymą (iki 500 simbolių)." }, { status: 400 });
  }
  const ingredients = getIngredients(meal);
  if (!ingredients.length || !meal.strInstructions.trim()) {
    return NextResponse.json({ error: "Pasirinktas receptas neturi ingredientų arba gaminimo instrukcijos." }, { status: 400 });
  }

  const endpoint = "https://openrouter.ai/api/v1/chat/completions";
  const startedAt = performance.now();
  let upstreamStatus: number | null = null;
  const operation = (status: number | null, success: boolean) => ({ system: "OpenRouter", endpoint, method: "POST", status, success, durationMs: performance.now() - startedAt });
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000", "X-Title": "Fridge Rescue" },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || "openrouter/auto",
        max_tokens: 1600,
        messages: [
          { role: "system", content: "Esi Fridge Rescue receptų gelbėtojas. Pagal vartotojo situaciją paruošk pilną, aiškų ir praktišką pasirinkto recepto variantą lietuviškai. Palygink recepto ingredientus su vartotojo Mano virtuvės produktų sąrašu. Aiškiai išvardyk, ką vartotojas jau turi, ko trūksta ir kokiais produktais galima pakeisti trūkstamus ingredientus. Nelaikyk produkto turimu, jei jis nėra pateiktas Mano virtuvės sąraše. Jei sąrašas tuščias, pasakyk, kad virtuvės produktų nėra nurodyta. Būtinai pritaikyk ingredientų kiekius žmonių skaičiui, atsižvelk į nurodytą laiką ir pageidaujamą tikslą. Naudok originalias instrukcijas kaip pagrindą, bet pakeisk jas pagal situaciją. Pateik ingredientus ir žingsnis po žingsnio gaminimo eigą. Atsakymą struktūruok antraštėmis: „Pritaikytas receptas“, „Ką jau turi“, „Ko trūksta“, „Galimi pakaitalai“, „Ingredientai“, „Gaminimo eiga“, „Laikas ir porcijos“, „Kas pakeista“. Jei trūksta duomenų kiekiams apskaičiuoti, aiškiai tai pasakyk. Jei prašymas susijęs su alergija, primink patikrinti etiketes ir kryžminę taršą; neteik medicininių garantijų." },
          { role: "user", content: JSON.stringify({ original_recipe: { id: meal.idMeal, name: meal.strMeal, category: meal.strCategory, cuisine: meal.strArea, ingredients, original_instructions: meal.strInstructions.slice(0, 5000) }, my_kitchen_products: kitchenItems, user_situation: instruction, selected_preferences: selectedPreferences }) },
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    });
    upstreamStatus = response.status;
    const data = await response.json();
    if (!response.ok) {
      console.error("OpenRouter request failed", response.status, data?.error?.message);
      return withOperationHeaders(NextResponse.json({ error: "AI paslauga laikinai nepasiekiama. Pabandyk vėliau." }, { status: 502 }), operation(upstreamStatus, false));
    }
    const answer = data.choices?.[0]?.message?.content;
    if (typeof answer !== "string" || !answer.trim()) throw new Error("Empty OpenRouter response");
    return withOperationHeaders(NextResponse.json({ answer: answer.trim() }), operation(upstreamStatus, true));
  } catch (cause) {
    console.error("OpenRouter adaptation request failed", cause instanceof Error ? cause.message : String(cause));
    return withOperationHeaders(NextResponse.json({ error: "Nepavyko gauti AI pasiūlymo. Pabandyk dar kartą." }, { status: 502 }), operation(upstreamStatus, false));
  }
}
