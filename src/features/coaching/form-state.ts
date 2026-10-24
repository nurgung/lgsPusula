export type PracticeFormState =
  | { status: "idle" }
  | { status: "error"; message: string };

export const INITIAL_PRACTICE_STATE: PracticeFormState = { status: "idle" };
