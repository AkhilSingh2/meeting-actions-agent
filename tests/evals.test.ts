import { describe, expect, it } from "vitest";
import { runEval } from "@/lib/evals/run";
import { buildSeedMeetings } from "@/lib/samples/seed";
import { meetingSchema } from "@/lib/schema";

describe("eval set", () => {
  const report = runEval();

  it("scores the clear meetings without misses", () => {
    for (const id of ["northline", "harbor", "zoom-vtt", "meet-txt", "messy"]) {
      const item = report.cases.find((entry) => entry.id === id);
      expect(item?.actions.misses, id).toEqual([]);
      expect(item?.actions.extras, id).toEqual([]);
      expect(item?.decisions.misses, id).toEqual([]);
      expect(item?.questions.misses, id).toEqual([]);
      expect(item?.risks.misses, id).toEqual([]);
      expect(item?.ownerAccuracy, id).toBe(1);
      expect(item?.dueAccuracy, id).toBe(1);
    }
  });

  it("keeps the indirect commitment as a visible miss", () => {
    const indirect = report.cases.find((entry) => entry.id === "indirect");
    expect(indirect?.actions.recall).toBeLessThan(1);
    expect(indirect?.actions.misses.join(" ")).toContain("timeout budget");
    expect(indirect?.actions.extras).toEqual([]);
    expect(indirect?.decisions.recall).toBe(1);
  });

  it("cites the source sentence for matched items", () => {
    expect(report.aggregate.citationAccuracy).toBe(1);
  });

  it("round-trips sample meetings through the storage schema", () => {
    const meetings = buildSeedMeetings("2026-11-25");
    expect(meetings).toHaveLength(4);
    for (const meeting of meetings) {
      expect(meetingSchema.safeParse(meeting).success).toBe(true);
      expect(meeting.outcome.actions.length).toBeGreaterThan(0);
      expect(meeting.outcome.email.subject).toContain(meeting.title);
    }
    const northline = meetings.find((meeting) => meeting.id === "northline-critique");
    expect(northline?.outcome.actions.some((action) => action.status === "done")).toBe(true);
    expect(northline?.outcome.actions.some((action) => action.status === "in_progress")).toBe(true);
  });
});
