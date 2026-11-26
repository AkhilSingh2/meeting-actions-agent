"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { ReviewScreen } from "@/components/review/ReviewScreen";
import { STATIC_DEMO } from "@/lib/demo/static-demo";

/** /meetings/?id=… — the record route for the static demo build, which has no dynamic routes. */
export default function MeetingByQueryPage() {
  return (
    <Suspense fallback={<p role="status">Loading the record…</p>}>
      <MeetingByQuery />
    </Suspense>
  );
}

function MeetingByQuery() {
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get("id") ?? "";
  useEffect(() => {
    if (!STATIC_DEMO && id) router.replace(`/meetings/${encodeURIComponent(id)}${window.location.hash}`);
  }, [id, router]);
  if (!STATIC_DEMO) return <p role="status">Loading the record…</p>;
  return <ReviewScreen id={id} />;
}
