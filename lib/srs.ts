import { supermemo, type SuperMemoGrade, type SuperMemoItem } from "supermemo";

export type { SuperMemoGrade };

export type SrsItemState = SuperMemoItem & {
  dueDate?: string;
  lastReviewedAt?: string;
};

export const defaultSrsState: SrsItemState = {
  interval: 0,
  repetition: 0,
  efactor: 2.5,
};

export function scheduleNextReview(
  state: SuperMemoItem,
  grade: SuperMemoGrade,
): SuperMemoItem {
  return supermemo(state, grade);
}

/** SM-2 step plus a due date `interval` days from now. */
export function applyGrade(
  state: SrsItemState,
  grade: SuperMemoGrade,
  now = new Date(),
): SrsItemState {
  const next = supermemo(
    {
      interval: state.interval,
      repetition: state.repetition,
      efactor: state.efactor,
    },
    grade,
  );
  const due = new Date(now);
  due.setDate(due.getDate() + next.interval);
  return {
    ...next,
    dueDate: due.toISOString(),
    lastReviewedAt: now.toISOString(),
  };
}

export function isDue(state: SrsItemState, now = new Date()): boolean {
  if (!state.dueDate) return true;
  return new Date(state.dueDate).getTime() <= now.getTime();
}
