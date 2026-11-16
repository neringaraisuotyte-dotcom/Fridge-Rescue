"use client";

import { useEffect, useState } from "react";
import { getLastApiOperation, subscribeToApiOperations, type ApiOperation } from "@/lib/api-telemetry";

const MODE_KEY = "fridge-rescue:developer-mode";

export function DeveloperMode() {
  const [enabled, setEnabled] = useState(false);
  const [latest, setLatest] = useState<ApiOperation | null>(null);

  useEffect(() => {
    setEnabled(window.localStorage.getItem(MODE_KEY) === "true");
    setLatest(getLastApiOperation());
    return subscribeToApiOperations(setLatest);
  }, []);

  function toggle() {
    setEnabled((current) => {
      const next = !current;
      window.localStorage.setItem(MODE_KEY, String(next));
      return next;
    });
  }

  return <div className="developer-mode-dock">
    <button type="button" className={`developer-mode-toggle ${enabled ? "is-active" : ""}`} aria-pressed={enabled} onClick={toggle}>
      🛠️ Developer Mode <span>{enabled ? "ON" : "OFF"}</span>
    </button>
    {enabled && <aside className="developer-mode-panel" aria-live="polite" aria-label="Paskutinės API operacijos informacija">
      <div className="developer-panel-heading"><strong>🛠️ Developer Mode</strong><span>PASKUTINĖ API OPERACIJA</span></div>
      {!latest ? <p>Dar neužfiksuota API operacijų.</p> : <dl>
        <div><dt>Sistema</dt><dd>{latest.system}</dd></div>
        <div><dt>Endpoint</dt><dd className="developer-endpoint" title={latest.endpoint}>{latest.endpoint}</dd></div>
        <div><dt>Metodas</dt><dd><code>{latest.method}</code></dd></div>
        <div><dt>HTTP statusas</dt><dd>{latest.status ?? "Atsakymo negauta"}</dd></div>
        <div><dt>Pavyko</dt><dd className={latest.success ? "operation-ok" : "operation-failed"}>{latest.success ? "Taip ✓" : "Ne ✕"}</dd></div>
        <div><dt>Trukmė</dt><dd>{latest.durationMs} ms</dd></div>
      </dl>}
    </aside>}
  </div>;
}
