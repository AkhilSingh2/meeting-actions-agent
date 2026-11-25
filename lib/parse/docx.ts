import mammoth from "mammoth";
import { parsePlaintext } from "@/lib/parse/plaintext";
import type { ParsedTranscript } from "@/lib/types";

export async function parseDocx(buffer: Buffer): Promise<ParsedTranscript> {
  const result = await mammoth.extractRawText({ buffer });
  const parsed = parsePlaintext(result.value || "");
  const warnings = [
    ...parsed.warnings,
    ...result.messages.map((message) => message.message).filter(Boolean),
  ];
  return { ...parsed, format: "docx", warnings };
}
