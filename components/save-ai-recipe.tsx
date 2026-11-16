"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { AiRecipeDraft } from "@/lib/ai-recipes";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function SaveAiRecipe({ draft }: { draft: AiRecipeDraft }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const saving = useRef(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setUserId(session?.user.id ?? null);
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  async function save() {
    if (saving.current || saved) return;
    saving.current = true;
    setBusy(true);
    setError("");
    try {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) throw new Error("Prisijunk, kad galėtum išsaugoti receptą.");
      const { data, error: authError } = await supabase.auth.getUser();
      if (authError || data.user?.id !== draft.user_id) throw new Error("Prisijunk ta paskyra, kuria sugeneravai receptą.");
      const { error: saveError } = await supabase.from("ai_recipes").insert({ ...draft, user_id: data.user.id });
      if (saveError) {
        if (saveError.code === "PGRST205" || saveError.code === "42P01") {
          throw new Error("AI receptų saugojimas dar neįjungtas. Supabase SQL Editor paleisk AI receptų lentelės sukūrimo SQL failą.");
        }
        throw new Error("Nepavyko išsaugoti AI recepto. Patikrink ryšį bei prisijungimą ir bandyk dar kartą.");
      }
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Nepavyko išsaugoti recepto.");
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  if (userId !== draft.user_id) return null;
  return <div className="save-ai-recipe">
    <button type="button" className="button-primary" onClick={save} disabled={busy || saved}>{saved ? "AI receptas išsaugotas" : busy ? "Išsaugoma…" : "Išsaugoti AI receptą"}</button>
    <p role={saved ? "status" : undefined}>{saved ? "Išsaugota tavo asmeninėje paskyroje. " : "Išsaugotas receptas bus tavo asmeninėje paskyroje. "}<Link href="/account#my-ai-recipes">Mano AI receptai →</Link></p>
    {error && <p className="notice error-notice" role="alert">{error}</p>}
  </div>;
}
