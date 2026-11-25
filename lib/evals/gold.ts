import { transcripts } from "@/lib/samples/transcripts";

export type GoldLabel = {
  includes: string[];
  owner?: string | null;
  dueDate?: string | null;
};

export type GoldCase = {
  id: string;
  title: string;
  meetingDate: string;
  transcript: string;
  filename?: string;
  decisions: GoldLabel[];
  actions: GoldLabel[];
  questions: GoldLabel[];
  risks: GoldLabel[];
};

const zoom = `WEBVTT

1
00:00:04.000 --> 00:00:08.000
Mina Cole: Let's go with the public beta for the reading list.

2
00:00:09.000 --> 00:00:13.000
Owen Park: I'll send the beta checklist by Friday.

3
00:00:14.000 --> 00:00:18.000
Mina Cole: Owen, can you also book the review for Monday?

4
00:00:19.000 --> 00:00:22.000
Owen Park: Is the privacy copy still unresolved?
`;

const meet = `Mina Cole
00:02:10
We decided to pause the referral experiment.

Owen Park
00:02:18
I'll write the pause note by tomorrow.

Mina Cole
00:02:30
There's a risk the partner data arrives late.
`;

const messy = `Alex Rivera: Hey, I'll be right there.
Leah Okada: Sounds good.
Alex Rivera: We decided to freeze the schema for the export.
Leah Okada: Right?
Alex Rivera: I'll send the field list by Friday.
Leah Okada: Can you grab coffee after?
Chris Hale: There's a risk the review slips if legal is out.
Leah Okada: What is still missing from the field list?`;

const indirect = `Priya Shah: The design note needs a timeout budget from Leah before Monday.
Sam Okonkwo: I'll send the revised diagram tomorrow.
Priya Shah: We decided to keep the export in this release.`;

export const goldCases: GoldCase[] = [
  {
    id: "northline",
    title: "Northline critique",
    meetingDate: "2026-03-03",
    transcript: transcripts.northline,
    decisions: [
      { includes: ["two-step", "onboarding"] },
      { includes: ["product tour"] },
      { includes: ["offline reading"] },
    ],
    actions: [
      { includes: ["feature flag", "short flow"], owner: "Sam Okonkwo", dueDate: "2026-03-06" },
      { includes: ["document", "flag"], owner: "Sam Okonkwo", dueDate: "2026-03-05" },
      { includes: ["empty-state", "copy"], owner: "Jonah Adel", dueDate: "2026-03-04" },
      { includes: ["contrast", "permission"], owner: null, dueDate: null },
      { includes: ["vendor", "delivery"], owner: "Priya Shah", dueDate: "2026-03-10" },
    ],
    questions: [{ includes: ["empty-state", "import"] }],
    risks: [{ includes: ["illustrations", "slip"] }],
  },
  {
    id: "harbor",
    title: "Harbor reliability",
    meetingDate: "2026-03-05",
    transcript: transcripts.harbor,
    decisions: [{ includes: ["roll back", "two percent"] }],
    actions: [
      { includes: ["rollback checklist"], owner: "Chris Hale", dueDate: "2026-03-06" },
      { includes: ["timeout budget"], owner: "Leah Okada", dueDate: "2026-03-09" },
      { includes: ["platform rotation"], owner: "Alex Rivera", dueDate: "2026-03-09" },
      { includes: ["post it"], owner: "Leah Okada", dueDate: "2026-03-05" },
    ],
    questions: [{ includes: ["certificate renewal"] }],
    risks: [{ includes: ["blocker", "certificates"] }],
  },
  {
    id: "zoom-vtt",
    title: "Reading list beta",
    meetingDate: "2026-03-03",
    filename: "beta.vtt",
    transcript: zoom,
    decisions: [{ includes: ["public beta", "reading list"] }],
    actions: [
      { includes: ["beta checklist"], owner: "Owen Park", dueDate: "2026-03-06" },
      { includes: ["book", "review"], owner: "Owen Park", dueDate: "2026-03-09" },
    ],
    questions: [{ includes: ["privacy copy"] }],
    risks: [],
  },
  {
    id: "meet-txt",
    title: "Referral pause",
    meetingDate: "2026-03-04",
    transcript: meet,
    decisions: [{ includes: ["pause", "referral"] }],
    actions: [{ includes: ["pause note"], owner: "Owen Park", dueDate: "2026-03-05" }],
    questions: [],
    risks: [{ includes: ["partner data"] }],
  },
  {
    id: "messy",
    title: "Export schema",
    meetingDate: "2026-03-04",
    transcript: messy,
    decisions: [{ includes: ["freeze", "schema"] }],
    actions: [{ includes: ["field list"], owner: "Alex Rivera", dueDate: "2026-03-06" }],
    questions: [{ includes: ["missing", "field list"] }],
    risks: [{ includes: ["review", "slips"] }],
  },
  {
    id: "indirect",
    title: "Indirect ask",
    meetingDate: "2026-03-04",
    transcript: indirect,
    decisions: [{ includes: ["keep the export"] }],
    actions: [
      { includes: ["timeout budget"], owner: "Leah", dueDate: "2026-03-09" },
      { includes: ["revised diagram"], owner: "Sam Okonkwo", dueDate: "2026-03-05" },
    ],
    questions: [],
    risks: [],
  },
];
