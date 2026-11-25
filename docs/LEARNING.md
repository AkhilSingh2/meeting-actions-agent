# Quorum, a study guide

This is a reading path through the meeting agent in this repository. The code is the text. The sections below say what to open, what decision it embodies, and what to try once you can see the decision.

You do not need an API key. `npm run dev` and `npm test` are enough.

## 1. What this agent is

An agent here is a pipeline with a boundary around the model, not a loop that keeps calling tools until it feels done.

```
transcript → cues → classify and fill slots → citations → review → export
```

The only optional model call sits in the middle and must return a schema. Everything else is ordinary TypeScript. That split is the design: the product can run, be tested, and be explained with the model turned off.

Open `lib/pipeline.ts`. `chooseEngine` decides. Demo mode, a missing model id, or a missing key stays on the heuristic. A thrown model error falls back to the heuristic and the warning is shown on the review board. The user is told which engine ran.

## 2. Demo mode is a product decision

`DEMO_MODE` defaults to on. `lib/env.ts` treats every value other than the string `false` as demo. In demo mode:

- extraction does not call a provider, even if a key is present
- export builds the HTTP request and returns it
- `deliver` is ignored

The UI copy says “stops before the network” because that is what the handler does. Read `app/api/export/route.ts` and the test that injects `fetch` in `tests/export.test.ts`. The preview path never calls that function.

Putting the gate in one function matters. A button labeled “Send” that sometimes sends is how demos leak tokens.

## 3. Normalize before you extract

Models and rules both get worse when the same meeting arrives as five shapes. `lib/parse` turns all of them into cues:

```ts
{ id, speaker, startMs, endMs, text, line }
```

| Input | What the parser looks for |
| --- | --- |
| WebVTT | `WEBVTT`, timing arrows, optional `Name:` prefix |
| Teams | `<v Speaker>text</v>` inside a VTT cue |
| SubRip | Index lines and comma milliseconds |
| Zoom text | A line that is a timestamp plus a name, then the words |
| Meet text | A name, a timestamp on the next line, then the words |
| Dialogue | `Name: text`, `[time] Name: text`, or `Name (time): text` |
| Word | Mammoth reads the paragraphs, then the text parsers run |

`parse/index.ts` does not import the docx parser. The browser bundle builds sample meetings and must not pull Mammoth into the client. Uploads go through `lib/parse/upload.ts` on the server.

Cue ids are `c1`, `c2`, … in order. The line number is that order. Later stages are not allowed to invent ids.

Try this. Add a fixture to `tests/parse.test.ts` before you change a parser. A broken speaker regex should fail there, not on the review board.

## 4. Speaker and owner are different slots

The speaker is who said the line. The owner is who has the work.

- “I’ll ship the flag by Friday.” Owner is the speaker.
- “Sam, can you document the flag before Thursday?” Owner is Sam. The citation still names the person who asked, and the board says “Said by …” when those differ.
- “Someone needs to check the contrast.” Owner is empty. That is a real state, not a failure.

`lib/extract/owners.ts` resolves a first name only when one attendee has it. Two Sams stay as the shorter name rather than a silent wrong pick.

## 5. The heuristic is a set of rules you can read

`lib/extract/heuristic.ts` splits cues into sentences, then tries patterns in order:

1. A personal commitment with a deliverable verb: “I’ll…”, “Name will…”, “Name, can you…”, “Name to …” when Name is an attendee.
2. “Someone needs to …” with a deliverable verb.
3. “We will …” or “we need to …” only when the sentence also has a date. Without that gate, “we should talk” becomes a fake task.
4. Decision phrases such as “we decided”, “let’s go with”, “we agreed”, checked only if the sentence was not a commitment.
5. Risk words: risk, blocker, concern, slip.
6. A question mark on a sentence long enough to be a question. “Right?” is ignored. “Can you grab coffee?” is ignored because it has no work verb.

“I’ll be right there” matches “I’ll” and then fails the verb list. That is deliberate. The verb list is the precision knob. Widening it raises recall and also pulls in chatter.

The rule score is not a probability. It goes up when the pattern is explicit, an owner is present, and a date is present. The UI says so. Do not chart it as confidence from data.

### Dates

`lib/dates.ts` resolves dates against the meeting date, as calendar dates, not timestamps.

| Phrase | Rule |
| --- | --- |
| by Friday | The next Friday, including today if the meeting is on Friday |
| next Friday, when today is Friday | Seven days later |
| tomorrow | The next calendar day |
| end of day / eod | The meeting date |
| next week | Seven days after the meeting |
| 2026-04-02, or 2 April | That calendar date, rolling to next year if it is already past |

The rules are tested in `tests/dates.test.ts`. If you change one, change the test in the same edit so the README does not drift from the code.

## 6. Citations are part of the record

A citation is `{ cueId, line, speaker, startMs, quote }`. The quote is the sentence, not a paraphrase. The review board links to `#cue-c3`, focuses that node, and highlights the quote if it still sits inside the cue.

This is why extraction returns structure instead of a paragraph. A paragraph cannot be clicked back to a line without a second, lossy search.

When the model path runs, `lib/llm/normalize.ts` drops cue ids that are not in the transcript and lowers the score. A cited id the model invented is worse than an honest gap.

## 7. Structured output

`lib/schema.ts` defines `llmExtractionSchema` with Zod. `lib/llm/run.ts` calls the AI SDK:

```ts
const { output } = await generateText({
  model,
  output: Output.object({ schema: llmExtractionSchema }),
  prompt,
});
```

The prompt in `lib/llm/prompt.ts` prints each cue as `[c3 | 03:18 | Sam Okonkwo] …` and tells the model to cite those ids, return `YYYY-MM-DD` or null, and skip small talk.

The schema is a shape guarantee. It does not make the owner true. Normalization still checks ids and dates. The email is not part of the schema on purpose: prose is rendered by `draftEmail` from the fields, so the draft and the board cannot disagree unless a person edits the draft.

Providers:

- `openai` via `@ai-sdk/openai`, needs `OPENAI_API_KEY` and `LLM_MODEL`
- `anthropic` via `@ai-sdk/anthropic`, needs `ANTHROPIC_API_KEY` and `LLM_MODEL`
- `ollama` via the OpenAI-compatible client pointed at `OLLAMA_BASE_URL`

Quorum does not pick a default model name. A stale default is a silent failure. If `LLM_MODEL` is empty, the call does not happen.

## 8. Evals

`lib/evals/gold.ts` holds the transcripts and the phrases a careful reader would mark. `lib/evals/score.ts` matches greedily: a prediction hits a gold item when its text contains every required phrase. Matching is one-to-one, so an extra prediction lowers precision and a missed gold item lowers recall.

F1 is `2PR / (P + R)`.

Owner and due date are scored only on matched actions. A missed action does not also count as a wrong owner. The Evals page says this.

The indirect case is the one the heuristic should miss. `tests/evals.test.ts` asserts that recall on that case is below 1 and that the miss mentions “timeout budget”. If you “fix” the score by deleting the case, that test fails. If you teach the heuristic the pattern, update the gold and write down what new false positives you accepted.

Micro-averaging pools counts across cases. A perfect score on four easy lines should not hide a miss on a fifth if you add the counts up. That is what the aggregate row does.

`npm run eval:live` uses the same gold actions against a live model. It skips cleanly when demo mode is on or credentials are missing, so CI can call `npm run eval` and leave the live script for a person who has a key.

Small sets overfit. These six transcripts were written next to the rules. They tell you when a rule breaks. They do not tell you how the heuristic behaves on a transcript you have not seen. The exercise section is the remedy.

## 9. Exports

File exports are pure functions in `lib/export/files.ts`. Markdown, CSV, and ICS are built in the browser. ICS is an all-day event per dated action that is not dropped, folded to 75 characters, with commas escaped. Undated actions are omitted. The dialog says so by showing only dated events.

Ticket exports are built on the server so the token never enters the client bundle.

| Target | Request |
| --- | --- |
| Jira | `POST {JIRA_BASE_URL}/rest/api/3/issue`, basic auth, ADF description |
| Linear | `POST https://api.linear.app/graphql`, `issueCreate` |
| GitHub | `POST /repos/{owner}/{repo}/issues`. `GITHUB_REPO` must match `owner/name`. |
| Notion | `POST /v1/pages`. Only the title property is set. Owner, date, and citation are page content, so a database does not need a matching column for each field. |
| Slack | `POST chat.postMessage`. One message for the meeting. |

`buildPlan(..., revealSecrets: false)` redacts `Authorization` before the response is sent. The live sender uses a second plan that is not returned. `assertDeliverableUrl` refuses a non-HTTPS host other than localhost.

Dropped actions are not sent. Blank text is not sent.

## 10. History

Samples are built by running the real pipeline, then a few status overlays are applied by phrase (`lib/samples/seed.ts`). The dates are computed from the day you first open the app, so “by Friday” stays a real Friday. After that, the browser copy wins. `Restore sample records` rebuilds the samples and keeps meetings you created.

Status is `open`, `in_progress`, `done`, or `dropped`. Overdue means the due date is before today and the item is not done or dropped. The word “Overdue” is in the text, not only in a color.

There is no account and no sync. Say that in the interface. A portfolio demo that implies a backend it does not have is worse than a short sentence.

## 11. Accessibility and the design system

Tokens live in `lib/design/tokens.ts`. The layout prints them as CSS variables. `tests/store.test.ts` checks the text pairs at WCAG AA (4.5:1), in light and dark. If you change a color, the test fails until the pair still clears.

The review board uses real headings, a labeled transcript region, and native `<dialog>` via `showModal()` so focus moves into the export sheet and back. Status controls have names that include the action text, because “Status” repeated ten times is not a name. The motion is a short translate. Opacity is not animated: a fading element fails contrast checks and hides text from people who land during the fade. `prefers-reduced-motion: reduce` cuts animation, transition, and smooth scrolling.

The theme script in `app/layout.tsx` runs before paint and stores the choice in `localStorage`. The first server render does not know the theme, so `<html>` carries `suppressHydrationWarning`.

## 12. Exercises

Do these in a branch. Each one should add a test that fails before the change.

1. **A new timestamp.** Some exports write `0:01:02.5` with a single-digit minute and a tenth of a second. Add a fixture, then teach `parseTimestamp` without breaking `00:01:02` as hours-minutes-seconds.
2. **Your own eval case.** Record a one-minute conversation, transcribe it by hand, and add it to `lib/evals/gold.ts` with the items you would actually track. Run `npm run eval`. Write down one miss and decide whether the rule or the gold label is wrong.
3. **“In two weeks.”** Extend `resolveDueDate` and add a date test. Check that “next week” still means seven days.
4. **The indirect miss.** Handle “needs a timeout budget from Leah before Monday” well enough to pick up Leah and the Monday. Re-run the eval. Read the extras, not just the new hit. If precision drops, show the sentence that became a false action.
5. **A webhook exporter.** Add a dry-run target that POSTs one JSON body per action to `WEBHOOK_URL`. Keep demo mode from calling it. Assert the preview does not contain a secret header value.
6. **Break contrast on purpose.** Lighten `--muted` until `npm test` fails, then put it back. That is the point of the token test.
7. **Live comparison.** With `DEMO_MODE=false` and a model you can call, run `npm run eval:live` on the gold actions. Compare the miss list with the heuristic. Do not tune the gold set to flatter the model.

## 13. References

- [AI SDK: generating structured data](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data)
- [WCAG 2.2, contrast (minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- [WCAG 2.2, non-text contrast and target size are worth a separate pass](https://www.w3.org/TR/WCAG22/)
- [RFC 5545, iCalendar](https://www.rfc-editor.org/rfc/rfc5545)
- [Jira Cloud REST, create issue](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-post)
- [Linear, `issueCreate`](https://developers.linear.app/docs/graphql/working-with-the-graphql-api)
- [GitHub, create an issue](https://docs.github.com/en/rest/issues/issues#create-an-issue)
- [Notion, create a page](https://developers.notion.com/reference/post-page)
- [Slack, `chat.postMessage`](https://docs.slack.dev/reference/methods/chat.postMessage)
