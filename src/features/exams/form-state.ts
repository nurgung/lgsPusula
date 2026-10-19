export type ExamFormState =
  | { status: "idle" }
  | {
      status: "error";
      message: string;
      fieldErrors?: Record<string, string>;
      values?: Record<string, string>;
    }
  | { status: "success"; message: string };

export const INITIAL_EXAM_FORM_STATE: ExamFormState = { status: "idle" };
