import { parseDocx } from "@/lib/parse/docx";
import { parseTranscript } from "@/lib/parse";
import type { ParsedTranscript } from "@/lib/types";

export async function parseUpload(file: { filename: string; buffer: Buffer }): Promise<ParsedTranscript> {
  const extension = file.filename.split(".").pop()?.toLowerCase();
  if (extension === "docx") return parseDocx(file.buffer);
  return parseTranscript(file.buffer.toString("utf8"), file.filename);
}
