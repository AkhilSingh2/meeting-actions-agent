import type { ActionStatus, Meeting } from "@/lib/types";

export const statusLabel: Record<ActionStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  done: "Done",
  dropped: "Dropped",
};

export function compareMeetings(a: Meeting, b: Meeting): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  return a.createdAt < b.createdAt ? 1 : -1;
}

export function openActions(meetings: Meeting[]) {
  return meetings.flatMap((meeting) =>
    meeting.outcome.actions
      .filter((action) => action.text.trim() && (action.status === "open" || action.status === "in_progress"))
      .map((action) => ({ meeting, action })),
  );
}

export function isOverdue(dueDate: string | null, status: string, today: string): boolean {
  if (!dueDate) return false;
  if (status === "done" || status === "dropped") return false;
  return dueDate < today;
}
