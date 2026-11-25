import { runPipeline } from "@/lib/pipeline";
import type { EngineRequest } from "@/lib/types";

export const runtime = "nodejs";

const MAX_TEXT = 200_000;
const MAX_FILE = 2_000_000;
const engines = new Set<EngineRequest>(["auto", "heuristic", "llm"]);

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return Response.json({ error: "Choose a .docx, .vtt, .srt, or .txt file." }, { status: 400 });
      }
      if (file.size > MAX_FILE) return Response.json({ error: "That file is larger than 2 MB." }, { status: 400 });
      const meetingDate = String(form.get("meetingDate") ?? "");
      const title = String(form.get("title") ?? "");
      const engine = readEngine(String(form.get("engine") ?? "auto"));
      if (!isDate(meetingDate)) return Response.json({ error: "Enter a meeting date." }, { status: 400 });
      const buffer = Buffer.from(await file.arrayBuffer());
      const meeting = await runPipeline({
        buffer,
        filename: file.name,
        title: title.slice(0, 120),
        meetingDate,
        engine,
      });
      if (meeting.cues.length === 0) {
        return Response.json({ error: "No spoken lines were found in that file." }, { status: 400 });
      }
      return Response.json({ meeting });
    }

    const body = (await request.json()) as {
      text?: string;
      filename?: string;
      title?: string;
      meetingDate?: string;
      engine?: string;
    };
    const text = body.text ?? "";
    if (!text.trim()) return Response.json({ error: "Paste a transcript or choose a file." }, { status: 400 });
    if (text.length > MAX_TEXT) return Response.json({ error: "That transcript is longer than 200,000 characters." }, { status: 400 });
    if (!isDate(body.meetingDate ?? "")) return Response.json({ error: "Enter a meeting date." }, { status: 400 });
    const meeting = await runPipeline({
      text,
      filename: body.filename,
      title: (body.title ?? "").slice(0, 120),
      meetingDate: body.meetingDate ?? "",
      engine: readEngine(body.engine ?? "auto"),
    });
    if (meeting.cues.length === 0) {
      return Response.json({ error: "No spoken lines were found in that transcript." }, { status: 400 });
    }
    return Response.json({ meeting });
  } catch {
    return Response.json({ error: "Quorum could not read that transcript." }, { status: 400 });
  }
}

function isDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function readEngine(value: string): EngineRequest {
  return engines.has(value as EngineRequest) ? (value as EngineRequest) : "auto";
}
