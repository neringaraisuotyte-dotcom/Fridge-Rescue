import { NextRequest, NextResponse } from "next/server";
import type { Meal } from "@/lib/meals";
import { withOperationHeaders } from "@/lib/api-operation-headers";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^\d{1,12}$/.test(id)) return NextResponse.json({ error: "Neteisingas recepto ID." }, { status: 400 });

  const endpoint = `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${encodeURIComponent(id)}`;
  const startedAt = performance.now();
  let upstreamStatus: number | null = null;
  const operation = (status: number | null, success: boolean) => ({ system: "TheMealDB", endpoint, method: "GET", status, success, durationMs: performance.now() - startedAt });
  try {
    const response = await fetch(endpoint, { next: { revalidate: 3600 } });
    upstreamStatus = response.status;
    if (!response.ok) return withOperationHeaders(NextResponse.json({ error: "Recepto paslauga laikinai nepasiekiama. Pabandyk dar kartą." }, { status: 502 }), operation(upstreamStatus, false));
    const data = await response.json() as { meals: Meal[] | null };
    const meal = data.meals?.[0];
    if (!meal) return withOperationHeaders(NextResponse.json({ error: "Šis receptas nerastas." }, { status: 404 }), operation(upstreamStatus, true));
    return withOperationHeaders(NextResponse.json({ meal }), operation(upstreamStatus, true));
  } catch {
    return withOperationHeaders(NextResponse.json({ error: "Recepto paslauga laikinai nepasiekiama. Pabandyk dar kartą." }, { status: 502 }), operation(upstreamStatus, false));
  }
}
