import { describe, expect, it } from "vitest";
import { addDays, nextWeekday, previousWeekday, resolveDueDate } from "@/lib/dates";

describe("dates", () => {
  const tuesday = "2026-03-03";

  it("resolves weekdays, tomorrow, end of day, and next week", () => {
    expect(resolveDueDate("I'll ship it by Friday", tuesday)).toBe("2026-03-06");
    expect(resolveDueDate("document it before Thursday", tuesday)).toBe("2026-03-05");
    expect(resolveDueDate("share it by tomorrow", tuesday)).toBe("2026-03-04");
    expect(resolveDueDate("post it by end of day", tuesday)).toBe(tuesday);
    expect(resolveDueDate("ask next week", tuesday)).toBe("2026-03-10");
    expect(resolveDueDate("book the review for Monday", tuesday)).toBe("2026-03-09");
    expect(resolveDueDate("due 2026-04-02", tuesday)).toBe("2026-04-02");
    expect(resolveDueDate("send it by March 12", tuesday)).toBe("2026-03-12");
    expect(resolveDueDate("in 3 days", tuesday)).toBe("2026-03-06");
  });

  it("keeps by-Friday on a Friday and rolls next Friday forward", () => {
    const friday = "2026-03-06";
    expect(resolveDueDate("by Friday", friday)).toBe(friday);
    expect(nextWeekday(friday, 5, true)).toBe(addDays(friday, 7));
  });

  it("walks back to a weekday", () => {
    expect(previousWeekday("2026-03-10", 2, 1)).toBe("2026-03-03");
  });
});
