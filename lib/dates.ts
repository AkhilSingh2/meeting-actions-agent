const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

const MONTHS: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const LONG_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function isISODate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

export function todayISO(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parts(iso: string): { year: number; month: number; day: number } {
  const [year, month, day] = iso.split("-").map((part) => Number(part));
  return { year: year ?? 1970, month: month ?? 1, day: day ?? 1 };
}

export function weekdayIndex(iso: string): number {
  const { year, month, day } = parts(iso);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function addDays(iso: string, days: number): string {
  const { year, month, day } = parts(iso);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  const nextMonth = String(date.getUTCMonth() + 1).padStart(2, "0");
  const nextDay = String(date.getUTCDate()).padStart(2, "0");
  return `${date.getUTCFullYear()}-${nextMonth}-${nextDay}`;
}

export function previousWeekday(from: string, weekday: number, minDaysAgo: number): string {
  let cursor = addDays(from, -Math.max(0, minDaysAgo));
  while (weekdayIndex(cursor) !== weekday) cursor = addDays(cursor, -1);
  return cursor;
}

export function mostRecentWeekday(from: string, weekday: number): string {
  if (weekdayIndex(from) === weekday) return from;
  return previousWeekday(from, weekday, 1);
}

/**
 * Upcoming weekday, including today.
 * When `forceNextWeek` is set, today rolls forward seven days.
 * "by Friday" on a Friday is today. "next Friday" on a Friday is a week out.
 */
export function nextWeekday(from: string, weekday: number, forceNextWeek = false): string {
  const current = weekdayIndex(from);
  let delta = (weekday - current + 7) % 7;
  if (forceNextWeek && delta === 0) delta = 7;
  return addDays(from, delta);
}

export function formatDisplayDate(iso: string): string {
  if (!isISODate(iso)) return iso;
  const { year, month, day } = parts(iso);
  const week = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][weekdayIndex(iso)] ?? "";
  return `${week} ${day} ${SHORT_MONTHS[month - 1] ?? ""} ${year}`;
}

export function formatLongDate(iso: string): string {
  if (!isISODate(iso)) return iso;
  const { year, month, day } = parts(iso);
  return `${day} ${LONG_MONTHS[month - 1] ?? ""} ${year}`;
}

export function formatTimestamp(ms: number | null): string {
  if (ms == null) return "";
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (value: number) => value.toString().padStart(2, "0");
  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  return `${pad(minutes)}:${pad(seconds)}`;
}

const WEEKDAY_PATTERN = WEEKDAYS.join("|");

/**
 * Resolve a due date written in a sentence against the meeting date.
 * Dates are calendar dates with no time zone. Rules are documented in docs/LEARNING.md.
 */
export function resolveDueDate(text: string, meetingDate: string): string | null {
  if (!isISODate(meetingDate)) return null;
  const source = text.toLowerCase();

  const iso = source.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (iso?.[1]) return iso[1];

  if (
    /\b(?:by|before|due|on|for|no later than)\s+(?:the\s+)?end of day\b/.test(source) ||
    /\beod\b/.test(source)
  ) {
    return meetingDate;
  }
  if (/\b(?:by|before|due|on|for|no later than)\s+today\b/.test(source)) return meetingDate;
  if (/\btomorrow\b/.test(source)) return addDays(meetingDate, 1);
  if (/\bnext week\b/.test(source)) return addDays(meetingDate, 7);
  if (/\bend of (?:the )?week\b|\beow\b/.test(source)) {
    return nextWeekday(meetingDate, 5);
  }

  const relative = source.match(/\bin\s+(\d{1,3})\s+days?\b/);
  if (relative?.[1]) return addDays(meetingDate, Number(relative[1]));

  const weekday = source.match(
    new RegExp(
      `\\b(?:by|before|due|on|for|no later than|this)\\s+(next\\s+)?(${WEEKDAY_PATTERN})\\b`,
    ),
  );
  if (weekday?.[2]) {
    const index = WEEKDAYS.indexOf(weekday[2] as (typeof WEEKDAYS)[number]);
    if (index >= 0) return nextWeekday(meetingDate, index, Boolean(weekday[1]));
  }

  const monthDay = source.match(
    /\b(?:by|before|due|on|for)\s+([a-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b/,
  );
  if (monthDay?.[1] && monthDay[2]) {
    const month = MONTHS[monthDay[1]];
    const day = Number(monthDay[2]);
    if (month === undefined || day < 1 || day > 31) return null;
    const { year } = parts(meetingDate);
    const candidate = toISO(year, month, day);
    if (!candidate) return null;
    return candidate < meetingDate ? toISO(year + 1, month, day) : candidate;
  }

  const bare = source.trim().match(new RegExp(`^(next\\s+)?(${WEEKDAY_PATTERN})$`));
  if (bare?.[2]) {
    const index = WEEKDAYS.indexOf(bare[2] as (typeof WEEKDAYS)[number]);
    if (index >= 0) return nextWeekday(meetingDate, index, Boolean(bare[1]));
  }
  if (source.trim() === "tomorrow") return addDays(meetingDate, 1);
  if (source.trim() === "next week") return addDays(meetingDate, 7);
  if (source.trim() === "today" || source.trim() === "eod" || source.trim() === "end of day") return meetingDate;

  return null;
}

function toISO(year: number, monthIndex: number, day: number): string | null {
  const date = new Date(Date.UTC(year, monthIndex, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== monthIndex || date.getUTCDate() !== day) {
    return null;
  }
  const month = String(monthIndex + 1).padStart(2, "0");
  const dayText = String(day).padStart(2, "0");
  return `${year}-${month}-${dayText}`;
}

export function stripDueClause(text: string): string {
  return text
    .replace(
      /\s*(?:,|\u2014|-)?\s*\b(?:by|before|due|no later than|on|for)\s+(?:today|tomorrow|eod|end of day|end of (?:the )?week|eow|next week|(?:next\s+)?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)|20\d{2}-\d{2}-\d{2}|[A-Za-z]{3,9}\.?\s+\d{1,2}(?:st|nd|rd|th)?)\b[.?!]?$/i,
      "",
    )
    .replace(/\s+\b(?:tomorrow|today|next week)\b[.?!]?$/i, "")
    .trim();
}
