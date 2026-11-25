"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import { todayISO } from "@/lib/dates";
import {
  commitMeetings,
  getMeetingServerSnapshot,
  getMeetingSnapshot,
  subscribeMeetings,
} from "@/lib/store/browser";
import { removeMeeting, replaceMeeting, restoreSamples, upsertMeeting } from "@/lib/store/memory";
import type { Meeting } from "@/lib/types";

type MeetingApi = {
  ready: boolean;
  today: string;
  meetings: Meeting[];
  saveMeeting: (meeting: Meeting) => void;
  updateMeeting: (meeting: Meeting) => void;
  deleteMeeting: (id: string) => void;
  restore: () => void;
};

const MeetingContext = createContext<MeetingApi | null>(null);

export function MeetingProvider({ children }: { children: React.ReactNode }) {
  const state = useSyncExternalStore(subscribeMeetings, getMeetingSnapshot, getMeetingServerSnapshot);
  const today = state ? todayISO() : "";

  const saveMeeting = useCallback((meeting: Meeting) => {
    commitMeetings(upsertMeeting(getMeetingSnapshot(), meeting));
  }, []);
  const updateMeeting = useCallback((meeting: Meeting) => {
    commitMeetings(replaceMeeting(getMeetingSnapshot(), meeting));
  }, []);
  const deleteMeeting = useCallback((id: string) => {
    commitMeetings(removeMeeting(getMeetingSnapshot(), id));
  }, []);
  const restore = useCallback(() => {
    commitMeetings(restoreSamples(getMeetingSnapshot(), todayISO()));
  }, []);

  const api = useMemo<MeetingApi>(
    () => ({
      ready: state !== null,
      today,
      meetings: state?.meetings ?? [],
      saveMeeting,
      updateMeeting,
      deleteMeeting,
      restore,
    }),
    [state, today, saveMeeting, updateMeeting, deleteMeeting, restore],
  );

  return <MeetingContext.Provider value={api}>{children}</MeetingContext.Provider>;
}

export function useMeetings(): MeetingApi {
  const value = useContext(MeetingContext);
  if (!value) throw new Error("useMeetings must be used inside MeetingProvider");
  return value;
}
