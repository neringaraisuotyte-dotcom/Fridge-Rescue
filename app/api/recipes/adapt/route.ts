import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getIngredients, type Meal } from "@/lib/meals";

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!apiKey) return NextResponse.json({ error: "Serveryje nenustatytas OpenRouter API raktas." }, { status: 503 });
  if (!supabaseUrl || !supabaseKey) return NextResponse.json({ error: "Supabase dar nesukonfigūruotas." }, { status: 503 });

  const accessToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!accessToken) return NextResponse.json({ error: "Prisijunk, kad galėtum pritaikyti receptą." }, { status: 401 });
  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
  const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
  if (authError || !user) return NextResponse.json({ error: "Sesija nebegalioja. Prisijunk iš naujo." }, { status: 401 });

  let body: { meal?: Meal; request?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Netaisyklinga užklausa." }, { status: 400 });
  }
  const meal = body.meal;
  const instruction = typeof body.request === "string" ? body.request.trim() : "";
  if (!meal || typeof meal.idMeal !== "string" || typeof meal.strMeal !== "string" || typeof meal.strInstructions !== "string" || !instruction || instruction.length > 500) {
    return NextResponse.json({ error: "Pateik receptą ir trumpą pritaikymo prašymą (iki 500 simbolių)." }, { status: 400 });
  }
  const ingredients = getIngredients(meal);
  if (!ingredients.length || !meal.strInstructions.trim()) {
    return NextResponse.json({ error: "Pasirinktas receptas neturi ingredientų arba gaminimo instrukcijos." }, { status: 400 });
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000", "X-Title": "Fridge Rescue" },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || "openrouter/auto",
        max_tokens: 1600,
        messages: [
          { role: "system", content: "Esi Fridge Rescue receptų gelbėtojas. Pagal vartotojo situaciją paruošk pilną, aiškų ir praktišką pasirinkto recepto variantą lietuviškai. Būtinai pritaikyk ingredientų kiekius žmonių skaičiui, pasiūlyk trūkstamų produktų pakaitalus, atsižvelk į nurodytą laiką ir pageidaujamą aštrumą. Naudok originalias instrukcijas kaip pagrindą, bet pakeisk jas pagal situaciją. Neapsiribok bendru patarimu — pateik ingredientus ir žingsnis po žingsnio gaminimo eigą. Atsakymą struktūruok antraštėmis: „Pritaikytas receptas“, „Ingredientai“, „Gaminimo eiga“, „Laikas ir porcijos“, „Kas pakeista“. Jei trūksta duomenų kiekiams apskaičiuoti, aiškiai tai pasakyk. Jei prašymas susijęs su alergija, primink patikrinti etiketes ir kryžminę taršą; neteik medicininių garantijų." },
          { role: "user", content: JSON.stringify({ original_recipe: { id: meal.idMeal, name: meal.strMeal, category: meal.strCategory, cuisine: meal.strArea, ingredients, original_instructions: meal.strInstructions.slice(0, 5000) }, user_situation: instruction }) },
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    });
    const data = await response.json();
    if (!response.ok) {
      console.error("OpenRouter request failed", response.status, data?.error?.message);
      return NextResponse.json({ error: "AI paslauga laikinai nepasiekiama. Pabandyk vėliau." }, { status: 502 });
    }
    const answer = data.choices?.[0]?.message?.content;
    if (typeof answer !== "string" || !answer.trim()) throw new Error("Empty OpenRouter response");
    return NextResponse.json({ answer: answer.trim() });
  } catch {
    return NextResponse.json({ error: "Nepavyko gauti AI pasiūlymo. Pabandyk dar kartą." }, { status: 502 });
  }
}
