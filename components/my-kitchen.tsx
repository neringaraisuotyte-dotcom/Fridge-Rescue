"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type KitchenItem = { id: string; name: string };

export function MyKitchen() {
  const [items, setItems] = useState<KitchenItem[]>([]);
  const [value, setValue] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const supabase = getSupabaseBrowserClient();

  const loadItems = useCallback(async () => {
    if (!supabase) { setLoading(false); setError("Supabase dar nesukonfigūruotas."); return; }
    const { data: { session } } = await supabase.auth.getSession();
    setUserId(session?.user.id ?? null);
    if (!session) { setItems([]); setLoading(false); return; }
    const { data, error: queryError } = await supabase.from("kitchen_items").select("id,name").eq("user_id", session.user.id).order("name");
    if (queryError) setError("Nepavyko gauti virtuvės produktų. Patikrink, ar Supabase pritaikyta nauja migracija.");
    else setItems(data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadItems();
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
      if (!session) { setItems([]); setLoading(false); return; }
      // Avoid awaiting Supabase calls inside its auth callback.
      window.setTimeout(() => { void loadItems(); }, 0);
    });
    return () => subscription.unsubscribe();
  }, [loadItems, supabase]);

  async function addItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = value.trim().replace(/\s+/g, " ");
    if (!name || !userId || !supabase) return;
    setBusy(true); setError("");
    const { data, error: insertError } = await supabase.from("kitchen_items").insert({ user_id: userId, name }).select("id,name").single();
    if (insertError) setError(insertError.code === "23505" ? "Šis produktas jau yra tavo sąraše." : "Nepavyko išsaugoti produkto.");
    else { setItems((current) => [...current, data].sort((a, b) => a.name.localeCompare(b.name, "lt"))); setValue(""); }
    setBusy(false);
  }

  async function removeItem(item: KitchenItem) {
    if (!supabase) return;
    setError("");
    const { error: deleteError } = await supabase.from("kitchen_items").delete().eq("id", item.id).eq("user_id", userId);
    if (deleteError) setError("Nepavyko pašalinti produkto.");
    else setItems((current) => current.filter(({ id }) => id !== item.id));
  }

  return <section className="kitchen-card" aria-labelledby="my-kitchen-heading">
    <div className="kitchen-heading"><div><p className="eyebrow">TAVO PRODUKTŲ SĄRAŠAS</p><h2 id="my-kitchen-heading">Mano virtuvė</h2></div><span aria-hidden="true">🥕</span></div>
    <p>Įrašyk turimus produktus. Jie bus išsaugoti tavo paskyroje, o AI, pritaikydamas receptą, palygins juos su recepto ingredientais.</p>
    {!userId && !loading && <div className="notice">Prisijunk, kad galėtum išsaugoti savo virtuvės produktus. <Link href="/account">Prisijungti →</Link></div>}
    {userId && <form className="kitchen-form" onSubmit={addItem}><label className="sr-only" htmlFor="kitchen-item">Produktas</label><input id="kitchen-item" value={value} onChange={(event) => setValue(event.target.value)} maxLength={100} placeholder="Pvz., kiaušiniai, ryžiai, pomidorai" disabled={busy} /><button className="button-primary" disabled={busy || !value.trim()}>{busy ? "Saugoma…" : "Pridėti"}</button></form>}
    {error && <div className="notice error-notice" role="alert">{error}</div>}
    {loading ? <p className="inline-note">Kraunamas produktų sąrašas…</p> : userId && (items.length ? <ul className="kitchen-items">{items.map((item) => <li key={item.id}><span>{item.name}</span><button type="button" aria-label={`Pašalinti ${item.name}`} onClick={() => void removeItem(item)}>Pašalinti</button></li>)}</ul> : <p className="kitchen-empty">Sąrašas tuščias. Pridėk pirmą produktą.</p>)}
  </section>;
}
