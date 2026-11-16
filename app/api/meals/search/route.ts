import { NextRequest, NextResponse } from "next/server";
import type { MealSummary } from "@/lib/meals";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query || query.length > 80) {
    return NextResponse.json({ error: "Įrašyk paieškos žodį (iki 80 simbolių)." }, { status: 400 });
  }

  try {
    const response = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(query)}`, { next: { revalidate: 300 } });
    if (!response.ok) throw new Error("TheMealDB returned an error");
    const data = await response.json() as { meals: MealSummary[] | null };
    return NextResponse.json({ meals: data.meals ?? [] });
  } catch {
    return NextResponse.json({ error: "Receptų paslauga laikinai nepasiekiama. Pabandyk dar kartą." }, { status: 502 });
  }
}
