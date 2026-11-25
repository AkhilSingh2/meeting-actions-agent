export const transcripts = {
  northline: `Mira Chen (00:01:12): Thanks for making time. The onboarding still asks for three permissions before someone can read a page.
Priya Shah (00:02:04): Let's go with the two-step onboarding. We decided to drop the product tour.
Sam Okonkwo (00:03:18): I'll ship the feature flag for the short flow by Friday.
Priya Shah (00:03:40): Sam, can you also document the flag before Thursday?
Jonah Adel (00:04:26): Are we still unsure which empty-state line actually gets people to import a book?
Mira Chen (00:05:02): There's a risk the illustrations slip if the vendor delivers late.
Jonah Adel (00:05:40): I'll share the revised empty-state copy by tomorrow.
Mira Chen (00:06:11): We agreed to keep offline reading out of this release.
Sam Okonkwo (00:06:48): Someone needs to check the contrast on the permission sheet.
Priya Shah (00:07:20): I'll ask the vendor for a delivery date next week.`,

  harbor: `Alex Rivera (00:00:42): The checkout API timed out twice during yesterday's deploy.
Leah Okada (00:01:16): We decided to roll back any change that raises error rate above two percent.
Chris Hale (00:02:05): I'll draft the rollback checklist by tomorrow.
Alex Rivera (00:02:33): Leah, can you add a timeout budget to the design note before Monday?
Leah Okada (00:03:11): There's a blocker on the staging certificates. They expire this week.
Chris Hale (00:03:40): Do we know who owns the certificate renewal?
Alex Rivera (00:04:18): I'll follow up with the platform rotation on Monday.
Leah Okada (00:04:52): We should also write a short status note. I'll post it by end of day.`,

  field: `Noor Alami (00:00:28): Four readers tried to renew a loan and stalled on the same screen.
Elena Voss (00:01:14): Let's go with a single renew button and drop the branch picker.
Noor Alami (00:02:02): I'll prototype the single-button renewal by Wednesday.
Elena Voss (00:02:36): Are we confident the hold policy is explained anywhere in the flow?
Marcus Bell (00:03:20): There's a concern that staff will override renewals without a note.
Elena Voss (00:03:58): Marcus, can you write the override note requirement by Friday?
Noor Alami (00:04:41): We agreed to test this with three library branches next week.`,

  plan: `Priya Shah (00:00:18): Quick pass on what is still open from Monday.
Sam Okonkwo (00:00:46): I'll finalize the flag documentation by tomorrow.
Mira Chen (00:01:22): The illustration vendor still has not confirmed. That remains a risk for the release.
Jonah Adel (00:02:03): I'll book the writing review for Friday.
Priya Shah (00:02:28): Who is holding the vendor thread?
Mira Chen (00:02:55): I'll take the vendor thread and send a status by end of day.
Sam Okonkwo (00:03:30): We decided to keep the short onboarding as the default for the next build.`,
} as const;

export const sampleMeta = [
  {
    id: "northline-critique",
    title: "Northline critique",
    blurb: "Onboarding review",
    transcript: transcripts.northline,
    weekday: 2,
    minDaysAgo: 12,
    recent: false,
    statuses: [
      { match: "document the flag", status: "done" as const },
      { match: "feature flag", status: "in_progress" as const },
      { match: "delivery date", status: "dropped" as const },
    ],
  },
  {
    id: "harbor-reliability",
    title: "Harbor reliability",
    blurb: "API sync",
    transcript: transcripts.harbor,
    weekday: 4,
    minDaysAgo: 6,
    recent: false,
    statuses: [
      { match: "rollback checklist", status: "done" as const },
      { match: "timeout budget", status: "in_progress" as const },
      { match: "post it", status: "done" as const },
    ],
  },
  {
    id: "field-notes",
    title: "Field notes",
    blurb: "Library interviews",
    transcript: transcripts.field,
    weekday: 1,
    minDaysAgo: 4,
    recent: false,
    statuses: [{ match: "prototype", status: "in_progress" as const }],
  },
  {
    id: "week-plan",
    title: "Week plan",
    blurb: "Open commitments",
    transcript: transcripts.plan,
    weekday: 3,
    minDaysAgo: 0,
    recent: true,
    statuses: [],
  },
];
