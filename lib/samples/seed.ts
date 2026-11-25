import { mostRecentWeekday, previousWeekday } from "@/lib/dates";
import { extractHeuristic } from "@/lib/extract/heuristic";
import { formatLabel, parseTranscript } from "@/lib/parse";
import { sampleMeta } from "@/lib/samples/transcripts";
import { compareMeetings } from "@/lib/meeting";
import type { Meeting } from "@/lib/types";

export function buildSeedMeetings(today: string): Meeting[] {
  return sampleMeta
    .map((spec) => {
      const date = spec.recent
        ? mostRecentWeekday(today, spec.weekday)
        : previousWeekday(today, spec.weekday, spec.minDaysAgo);
      const parsed = parseTranscript(spec.transcript);
      const outcome = extractHeuristic(parsed, { title: spec.title, meetingDate: date });
      for (const action of outcome.actions) {
        const overlay = spec.statuses.find((status) => action.text.toLowerCase().includes(status.match));
        if (overlay) action.status = overlay.status;
      }
      const meeting: Meeting = {
        id: spec.id,
        title: spec.title,
        date,
        sourceLabel: formatLabel(parsed.format),
        format: parsed.format,
        createdAt: `${date}T15:00:00.000Z`,
        attendees: parsed.speakers,
        rawText: spec.transcript,
        cues: parsed.cues,
        outcome,
        sample: true,
      };
      return meeting;
    })
    .sort(compareMeetings);
}
