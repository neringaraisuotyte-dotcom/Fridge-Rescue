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

  let body: { meal?: Meal; request?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Netaisyklinga užklausa." }, { status: 400 });
  }
  const meal = body.meal;
  const instruction = body.request?.trim();
  if (!meal?.strMeal || !Array.isArray(getIngredients(meal)) || !instruction || instruction.length > 500) {
    return NextResponse.json({ error: "Pateik receptą ir trumpą pritaikymo prašymą (iki 500 simbolių)." }, { status: 400 });
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000", "X-Title": "Fridge Rescue" },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || "openrouter/auto",
        max_tokens: 900,
        messages: [
          { role: "system", content: "Esi Fridge Rescue virtuvės asistentas. Lietuviškai pasiūlyk praktišką pateikto recepto pritaikymą pagal vartotojo prašymą. Išlaikyk aiškų formatą: trumpas paaiškinimas, pakeisti ingredientai ir jų kiekiai, gaminimo veiksmai. Jei prašymas susijęs su alergija, aiškiai perspėk patikrinti produktų etiketes ir kryžminę taršą. Neteik medicininių garantijų." },
          { role: "user", content: JSON.stringify({ recipe: { name: meal.strMeal, ingredients: getIngredients(meal), instructions: meal.strInstructions?.slice(0, 5000) }, adaptation_request: instruction }) },
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
