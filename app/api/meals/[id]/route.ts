import { NextRequest, NextResponse } from "next/server";
import type { Meal } from "@/lib/meals";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^\d{1,12}$/.test(id)) return NextResponse.json({ error: "Neteisingas recepto ID." }, { status: 400 });

  try {
    const response = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${encodeURIComponent(id)}`, { next: { revalidate: 3600 } });
    if (!response.ok) throw new Error("TheMealDB returned an error");
    const data = await response.json() as { meals: Meal[] | null };
    const meal = data.meals?.[0];
    if (!meal) return NextResponse.json({ error: "Šis receptas nerastas." }, { status: 404 });
    return NextResponse.json({ meal });
  } catch {
    return NextResponse.json({ error: "Recepto paslauga laikinai nepasiekiama. Pabandyk dar kartą." }, { status: 502 });
  }
}
