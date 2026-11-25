import { todayISO } from "@/lib/dates";
import { loadStored, STORAGE_KEY, type Persisted } from "@/lib/store/memory";

const listeners = new Set<() => void>();
let snapshot: Persisted | null = null;

function emit() {
  for (const listener of listeners) listener();
}

export function subscribeMeetings(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getMeetingSnapshot(): Persisted {
  if (!snapshot) {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    snapshot = loadStored(raw, todayISO());
  }
  return snapshot;
}

export function getMeetingServerSnapshot(): null {
  return null;
}

export function commitMeetings(next: Persisted) {
  snapshot = next;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  emit();
}
