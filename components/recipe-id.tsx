"use client";

import { useState } from "react";

export function RecipeId({ id }: { id: string }) {
  const [message, setMessage] = useState("");

  async function copyId() {
    try {
      await navigator.clipboard.writeText(id);
      setMessage("ID nukopijuotas.");
    } catch {
      setMessage("Nepavyko nukopijuoti. Pažymėk ID ir nukopijuok rankiniu būdu.");
    }
  }

  return <div className="recipe-id">
    <span>Recepto ID: <span className="recipe-id-value">{id}</span></span>
    <button type="button" onClick={copyId} aria-label={`Kopijuoti recepto ID ${id}`}>Kopijuoti ID</button>
    <span className="recipe-id-message" role="status">{message}</span>
  </div>;
}
