"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReviewBoard } from "@/components/review/ReviewBoard";
import { useMeetings } from "@/components/providers/MeetingProvider";

export function ReviewScreen({ id }: { id: string }) {
  const router = useRouter();
  const { ready, today, meetings, updateMeeting, deleteMeeting } = useMeetings();
  if (!ready) return <p role="status">Loading the record…</p>;
  const meeting = meetings.find((item) => item.id === id);
  if (!meeting) {
    return (
      <div className="q-hero">
        <h1 className="q-display">No record here.</h1>
        <p className="q-lede">It may have been removed from this browser.</p>
        <Link className="q-btn q-btn--primary" href="/">
          New meeting
        </Link>
      </div>
    );
  }
  return (
    <ReviewBoard
      meeting={meeting}
      today={today}
      onChange={updateMeeting}
      onRemove={() => {
        deleteMeeting(id);
        router.push("/history");
      }}
    />
  );
}
