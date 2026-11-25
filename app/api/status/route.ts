import { exporterReadiness, isDemoMode, llmReadiness } from "@/lib/env";

export const runtime = "nodejs";

export function GET() {
  return Response.json({
    demoMode: isDemoMode(),
    llm: llmReadiness(),
    exporters: exporterReadiness(),
  });
}
