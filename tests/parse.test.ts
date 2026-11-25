import { describe, expect, it } from "vitest";
import { parseDocx } from "@/lib/parse/docx";
import { parseTranscript } from "@/lib/parse";
import { zipStore } from "./helpers/zip";

const zoomVtt = `WEBVTT

1
00:00:01.000 --> 00:00:04.000
Mina Cole: Hello everyone, let's start.

2
00:00:04.500 --> 00:00:08.000
Owen Park: Sounds good to me.
`;

const teamsVtt = `WEBVTT

00:00:01.000 --> 00:00:04.000
<v Mina Cole>Hello from Teams</v>

00:00:05.000 --> 00:00:08.000
<v Owen Park>Thanks Mina</v>
`;

const srt = `1
00:00:01,000 --> 00:00:04,000
Mina Cole: We should look at the notes.

2
00:00:05,000 --> 00:00:08,000
Owen Park: I have them here.
`;

describe("parsers", () => {
  it("reads Zoom WebVTT speaker prefixes and timestamps", () => {
    const parsed = parseTranscript(zoomVtt, "zoom.vtt");
    expect(parsed.format).toBe("webvtt");
    expect(parsed.speakers).toEqual(["Mina Cole", "Owen Park"]);
    expect(parsed.cues[0]?.startMs).toBe(1000);
    expect(parsed.cues[0]?.text).toContain("Hello everyone");
  });

  it("reads Teams voice tags", () => {
    const parsed = parseTranscript(teamsVtt, "teams.vtt");
    expect(parsed.format).toBe("teams-vtt");
    expect(parsed.speakers).toEqual(["Mina Cole", "Owen Park"]);
    expect(parsed.cues[1]?.text).toBe("Thanks Mina");
  });

  it("reads SubRip", () => {
    const parsed = parseTranscript(srt, "notes.srt");
    expect(parsed.format).toBe("srt");
    expect(parsed.cues).toHaveLength(2);
    expect(parsed.cues[0]?.speaker).toBe("Mina Cole");
  });

  it("reads a Zoom text export", () => {
    const parsed = parseTranscript(`00:01:02 Mina Cole
Let's ship the short flow.

00:01:20 Owen Park
I'll send the notes.
`);
    expect(parsed.format).toBe("zoom-txt");
    expect(parsed.cues[0]?.speaker).toBe("Mina Cole");
    expect(parsed.cues[0]?.startMs).toBe(62_000);
    expect(parsed.cues[1]?.text).toContain("send the notes");
  });

  it("reads a Meet text export", () => {
    const parsed = parseTranscript(`Mina Cole
00:02:10
We decided to pause.

Owen Park
00:02:18
I'll write the note.
`);
    expect(parsed.format).toBe("meet-txt");
    expect(parsed.speakers).toEqual(["Mina Cole", "Owen Park"]);
    expect(parsed.cues[1]?.startMs).toBe(138_000);
  });

  it("reads speaker dialogue and keeps continuations", () => {
    const parsed = parseTranscript(`Mina Cole: The first line
continues here.
Owen Park: The second line.`);
    expect(parsed.format).toBe("dialogue");
    expect(parsed.cues[0]?.text).toBe("The first line continues here.");
    expect(parsed.cues).toHaveLength(2);
  });

  it("reads a Word document through the dialogue parser", async () => {
    const buffer = zipStore({
      "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
      "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
      "word/document.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Mina Cole: I'll send the revised notes by Friday.</w:t></w:r></w:p>
    <w:p><w:r><w:t>Owen Park: We decided to keep the short draft.</w:t></w:r></w:p>
  </w:body>
</w:document>`,
    });
    const parsed = await parseDocx(buffer);
    expect(parsed.format).toBe("docx");
    expect(parsed.cues.map((cue) => cue.speaker)).toEqual(["Mina Cole", "Owen Park"]);
  });
});
