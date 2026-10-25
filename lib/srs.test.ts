import { describe, expect, it } from "vitest";
import { applyGrade, defaultSrsState } from "./srs";

describe("applyGrade", () => {
  const now = new Date("2026-10-25T00:00:00.000Z");

  it("schedules the next day after a successful first recall", () => {
    const next = applyGrade(defaultSrsState, 5, now);
    expect(next.interval).toBe(1);
    expect(next.repetition).toBe(1);
    expect(next.efactor).toBeGreaterThan(2.5);
    expect(new Date(next.dueDate ?? "").getTime()).toBeGreaterThan(now.getTime());
    expect(next.lastReviewedAt).toBe(now.toISOString());
  });

  it("resets the streak when the recall fails", () => {
    const learned = applyGrade(defaultSrsState, 5, now);
    const forgotten = applyGrade(learned, 1, now);
    expect(forgotten.repetition).toBe(0);
    expect(forgotten.interval).toBe(1);
  });
});
