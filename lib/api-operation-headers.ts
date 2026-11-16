import type { NextResponse } from "next/server";

export type UpstreamOperation = {
  system: string;
  endpoint: string;
  method: string;
  status: number | null;
  success: boolean;
  durationMs: number;
};

export function withOperationHeaders<T extends NextResponse>(response: T, operation: UpstreamOperation): T {
  response.headers.set("x-fridge-system", operation.system);
  response.headers.set("x-fridge-endpoint", operation.endpoint);
  response.headers.set("x-fridge-method", operation.method);
  response.headers.set("x-fridge-status", String(operation.status ?? 0));
  response.headers.set("x-fridge-success", String(operation.success));
  response.headers.set("x-fridge-duration-ms", String(Math.max(0, Math.round(operation.durationMs))));
  return response;
}
