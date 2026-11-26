/** True only in the GitHub Pages build (STATIC_DEMO=true), which has no server. */
export const STATIC_DEMO = process.env.NEXT_PUBLIC_STATIC_DEMO === "true";

/** Link to a meeting record. The static build has no dynamic routes, so records live at /meetings/?id=… */
export function meetingHref(id: string, hash = ""): string {
  const suffix = hash ? `#${hash}` : "";
  return STATIC_DEMO ? `/meetings/?id=${encodeURIComponent(id)}${suffix}` : `/meetings/${id}${suffix}`;
}
