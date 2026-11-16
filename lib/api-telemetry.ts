export type ApiOperation = {
  system: string;
  endpoint: string;
  method: string;
  status: number | null;
  success: boolean;
  durationMs: number;
  recordedAt: string;
};

const STORAGE_KEY = "fridge-rescue:last-api-operation";
const EVENT_NAME = "fridge-rescue:api-operation";

export function recordApiOperation(operation: ApiOperation) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(operation));
  } catch {
    // The in-memory event still updates the panel if storage is unavailable.
  }
  window.dispatchEvent(new CustomEvent<ApiOperation>(EVENT_NAME, { detail: operation }));
}

export function getLastApiOperation(): ApiOperation | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value ? JSON.parse(value) as ApiOperation : null;
  } catch {
    return null;
  }
}

export function subscribeToApiOperations(listener: (operation: ApiOperation) => void) {
  if (typeof window === "undefined") return () => undefined;
  const handler = (event: Event) => listener((event as CustomEvent<ApiOperation>).detail);
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}

function safeEndpoint(input: RequestInfo | URL) {
  const raw = input instanceof Request ? input.url : String(input);
  try {
    const url = new URL(raw, window.location.origin);
    const queryKeys = [...url.searchParams.keys()];
    const redactedQuery = queryKeys.length ? `?${queryKeys.map((key) => `${key}=…`).join("&")}` : "";
    return `${url.origin === window.location.origin ? "" : url.origin}${url.pathname}${redactedQuery}`;
  } catch {
    return raw.split("?")[0];
  }
}

function systemForUrl(url: string) {
  try {
    const host = new URL(url, window.location.origin).hostname;
    if (host.endsWith("supabase.co")) return "Supabase";
    if (host.endsWith("themealdb.com")) return "TheMealDB";
    if (host === "openrouter.ai") return "OpenRouter";
    return "Fridge Rescue";
  } catch {
    return "Fridge Rescue";
  }
}

export async function trackedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const start = performance.now();
  const endpoint = safeEndpoint(input);
  const request = input instanceof Request ? input : null;
  const method = (init?.method ?? request?.method ?? "GET").toUpperCase();
  try {
    const response = await fetch(input, init);
    const upstreamSystem = response.headers.get("x-fridge-system");
    const operation: ApiOperation = upstreamSystem ? {
      system: upstreamSystem,
      endpoint: response.headers.get("x-fridge-endpoint") ?? endpoint,
      method: response.headers.get("x-fridge-method") ?? method,
      status: Number(response.headers.get("x-fridge-status")) || null,
      success: response.headers.get("x-fridge-success") === "true",
      durationMs: Number(response.headers.get("x-fridge-duration-ms")) || Math.round(performance.now() - start),
      recordedAt: new Date().toISOString(),
    } : {
      system: systemForUrl(input instanceof Request ? input.url : String(input)),
      endpoint,
      method,
      status: response.status,
      success: response.ok,
      durationMs: Math.round(performance.now() - start),
      recordedAt: new Date().toISOString(),
    };
    recordApiOperation(operation);
    return response;
  } catch (cause) {
    recordApiOperation({ system: systemForUrl(input instanceof Request ? input.url : String(input)), endpoint, method, status: null, success: false, durationMs: Math.round(performance.now() - start), recordedAt: new Date().toISOString() });
    throw cause;
  }
}
