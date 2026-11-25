import { compareMeetings } from "@/lib/meeting";
import { buildSeedMeetings } from "@/lib/samples/seed";
import { meetingSchema, persistedSchema } from "@/lib/schema";
import type { Meeting } from "@/lib/types";

export const STORAGE_KEY = "quorum.meetings.v1";

export type Persisted = {
  version: 1;
  meetings: Meeting[];
  removedSeedIds: string[];
};

export function freshState(today: string): Persisted {
  return { version: 1, meetings: buildSeedMeetings(today), removedSeedIds: [] };
}

export function parsePersisted(raw: unknown): Persisted | null {
  const parsed = persistedSchema.safeParse(raw);
  if (!parsed.success) return null;
  const meetings = parsed.data.meetings.flatMap((meeting) => {
    const checked = meetingSchema.safeParse(meeting);
    return checked.success ? [checked.data] : [];
  });
  return {
    version: 1,
    meetings,
    removedSeedIds: parsed.data.removedSeedIds,
  };
}

export function mergeState(stored: Persisted | null, today: string): Persisted {
  if (!stored) return freshState(today);
  const seeds = buildSeedMeetings(today);
  const seedIds = new Set(seeds.map((meeting) => meeting.id));
  const removed = new Set(stored.removedSeedIds);
  const map = new Map<string, Meeting>();
  for (const seed of seeds) {
    if (!removed.has(seed.id)) map.set(seed.id, seed);
  }
  for (const meeting of stored.meetings) {
    if (seedIds.has(meeting.id) && removed.has(meeting.id)) continue;
    map.set(meeting.id, meeting);
  }
  return {
    version: 1,
    meetings: [...map.values()].sort(compareMeetings),
    removedSeedIds: [...removed],
  };
}

export function upsertMeeting(state: Persisted, meeting: Meeting): Persisted {
  const others = state.meetings.filter((item) => item.id !== meeting.id);
  return {
    ...state,
    meetings: [meeting, ...others].sort(compareMeetings),
    removedSeedIds: state.removedSeedIds.filter((id) => id !== meeting.id),
  };
}

export function replaceMeeting(state: Persisted, meeting: Meeting): Persisted {
  return {
    ...state,
    meetings: state.meetings.map((item) => (item.id === meeting.id ? meeting : item)),
  };
}

export function removeMeeting(state: Persisted, id: string): Persisted {
  const target = state.meetings.find((meeting) => meeting.id === id);
  const removedSeedIds =
    target?.sample && !state.removedSeedIds.includes(id)
      ? [...state.removedSeedIds, id]
      : state.removedSeedIds;
  return {
    ...state,
    meetings: state.meetings.filter((meeting) => meeting.id !== id),
    removedSeedIds,
  };
}

export function restoreSamples(state: Persisted, today: string): Persisted {
  const seeds = buildSeedMeetings(today);
  const seedIds = new Set(seeds.map((meeting) => meeting.id));
  const user = state.meetings.filter((meeting) => !meeting.sample && !seedIds.has(meeting.id));
  return {
    version: 1,
    meetings: [...seeds, ...user].sort(compareMeetings),
    removedSeedIds: [],
  };
}

export function loadStored(raw: string | null, today: string): Persisted {
  if (!raw) return freshState(today);
  try {
    return mergeState(parsePersisted(JSON.parse(raw)), today);
  } catch {
    return freshState(today);
  }
}
