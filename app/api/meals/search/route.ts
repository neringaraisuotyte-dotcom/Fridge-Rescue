import { NextRequest, NextResponse } from "next/server";
import type { MealSummary } from "@/lib/meals";
import { withOperationHeaders } from "@/lib/api-operation-headers";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  const mode = request.nextUrl.searchParams.get("mode") ?? "ingredient";
  if (mode !== "ingredient" && mode !== "name") {
    return NextResponse.json({ error: "Neteisingas paieškos būdas." }, { status: 400 });
  }
  if (!query || query.length > 80) {
    return NextResponse.json({ error: "Įrašyk paieškos žodį (iki 80 simbolių)." }, { status: 400 });
  }

  const endpoint = /^\d+$/.test(query) ? "lookup.php?i=" : mode === "name" ? "search.php?s=" : "filter.php?i=";
  const upstreamEndpoint = `https://www.themealdb.com/api/json/v1/1/${endpoint}${encodeURIComponent(query)}`;
  const startedAt = performance.now();
  let upstreamStatus: number | null = null;
  const operation = (status: number | null, success: boolean) => ({ system: "TheMealDB", endpoint: upstreamEndpoint, method: "GET", status, success, durationMs: performance.now() - startedAt });
  try {
    const response = await fetch(upstreamEndpoint, { next: { revalidate: 300 } });
    upstreamStatus = response.status;
    if (!response.ok) return withOperationHeaders(NextResponse.json({ error: "Receptų paslauga laikinai nepasiekiama. Pabandyk dar kartą." }, { status: 502 }), operation(upstreamStatus, false));
    const data = await response.json() as { meals: MealSummary[] | null };
    return withOperationHeaders(NextResponse.json({ meals: (data.meals ?? []).map(({ idMeal, strMeal, strMealThumb }) => ({ idMeal, strMeal, strMealThumb })) }), operation(upstreamStatus, true));
  } catch {
    return withOperationHeaders(NextResponse.json({ error: "Receptų paslauga laikinai nepasiekiama. Pabandyk dar kartą." }, { status: 502 }), operation(upstreamStatus, false));
  }
}
