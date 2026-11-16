import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!apiKey) return NextResponse.json({ error: "Serveryje nenustatytas OpenRouter API raktas." }, { status: 503 });
  if (!supabaseUrl || !supabaseKey) return NextResponse.json({ error: "Supabase dar nesukonfigūruotas." }, { status: 503 });

  const accessToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!accessToken) return NextResponse.json({ error: "Prisijunk prie paskyros, kad galėtum kreiptis į AI." }, { status: 401 });
  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
  if (authError || !user) return NextResponse.json({ error: "Sesija nebegalioja. Prisijunk iš naujo." }, { status: 401 });

  let body: { ingredients?: unknown; request?: unknown; preferences?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Netaisyklinga užklausa." }, { status: 400 });
  }
  const ingredients = typeof body.ingredients === "string" ? body.ingredients.trim() : "";
  const question = typeof body.request === "string" ? body.request.trim() : "";
  const preferences = typeof body.preferences === "string" ? body.preferences.trim() : "";
  if (!(question || preferences) || question.length > 500 || ingredients.length > 300 || preferences.length > 200) {
    return NextResponse.json({ error: "Įrašyk klausimą (iki 500 simbolių); ingredientų sąrašas gali būti iki 300 simbolių." }, { status: 400 });
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
        "X-Title": "Fridge Rescue",
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || "openrouter/auto",
        max_tokens: 900,
        messages: [
          { role: "system", content: "Esi Fridge Rescue virtuvės asistentas. Atsakyk lietuviškai, draugiškai ir praktiškai. Padėk vartotojui su receptų idėjomis, ingredientų pakeitimais, gaminimo patarimais ar kitais virtuvės klausimais. Jei pateikti ingredientai, pirmiausia remkis jais ir pasiūlyk paprastus veiksmus. Jei klausimas susijęs su alergija, primink patikrinti etiketes ir kryžminę taršą; neteik medicininių garantijų. Atsakymą pateik aiškiai, trumpomis pastraipomis arba sąrašu." },
          { role: "user", content: JSON.stringify({ available_ingredients: ingredients || "nenurodyta", question, selected_preferences: preferences }) },
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    });
    const responseText = await response.text();
    let data: { error?: { message?: string }; choices?: Array<{ message?: { content?: unknown } }> };
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error("OpenRouter returned a non-JSON response", response.status, response.headers.get("content-type"));
      return NextResponse.json({ error: "OpenRouter grąžino netikėtą atsakymą. Daugiau informacijos yra serverio terminale." }, { status: 502 });
    }
    if (!response.ok) {
      console.error("OpenRouter help request failed", response.status, data?.error?.message);
      return NextResponse.json({ error: `OpenRouter atmetė užklausą (HTTP ${response.status}). Patikrink API raktą, modelį arba paskyros limitą.` }, { status: 502 });
    }
    const answer = data.choices?.[0]?.message?.content;
    if (typeof answer !== "string" || !answer.trim()) throw new Error("Empty OpenRouter response");
    return NextResponse.json({ answer: answer.trim() });
  } catch (cause) {
    const name = cause instanceof Error ? cause.name : "UnknownError";
    const message = cause instanceof Error ? cause.message : String(cause);
    console.error("OpenRouter help request threw an error", name, message);
    if (name === "TimeoutError") return NextResponse.json({ error: "OpenRouter neatsakė per 30 sekundžių. Pabandyk dar kartą." }, { status: 504 });
    return NextResponse.json({ error: "Serveris negalėjo prisijungti prie OpenRouter. Patikrink interneto ryšį; išsami priežastis rodoma serverio terminale." }, { status: 502 });
  }
}
