/** Two fields are mm:ss. Three fields are hh:mm:ss. Fractional seconds may use "." or ",". */
export function parseTimestamp(value: string): number | null {
  const match = value
    .trim()
    .match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:[.,](\d{1,3}))?$/);
  if (!match?.[1] || !match[2]) return null;
  const first = Number(match[1]);
  const second = Number(match[2]);
  if (second > 59) return null;
  const fraction = Number((match[4] ?? "0").padEnd(3, "0").slice(0, 3));
  if (match[3] == null) {
    if (first > 180) return null;
    return (first * 60 + second) * 1000 + fraction;
  }
  const seconds = Number(match[3]);
  if (seconds > 59) return null;
  return (first * 3600 + second * 60 + seconds) * 1000 + fraction;
}
