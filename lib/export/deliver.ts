import { assertDeliverableUrl, type PlannedRequest } from "@/lib/export/plan";
import { redact } from "@/lib/redact";

export type DeliveryResult = {
  ok: boolean;
  status: number;
  detail: string;
};

export async function deliverRequests(
  requests: PlannedRequest[],
  secrets: string[],
  fetchImpl: typeof fetch = fetch,
): Promise<DeliveryResult[]> {
  const results: DeliveryResult[] = [];
  for (const request of requests) {
    try {
      assertDeliverableUrl(request.url);
      const response = await fetchImpl(request.url, {
        method: request.method,
        headers: request.headers,
        body: JSON.stringify(request.body),
      });
      const text = await response.text();
      results.push({
        ok: response.ok,
        status: response.status,
        detail: redact(text, secrets).slice(0, 500),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "The request failed.";
      results.push({ ok: false, status: 0, detail: redact(message, secrets).slice(0, 500) });
    }
  }
  return results;
}
