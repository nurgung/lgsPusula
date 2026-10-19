export type StudyFormState =
  | { status: "idle" }
  | {
      status: "error";
      message: string;
      fieldErrors?: Record<string, string>;
      values?: Record<string, string>;
    }
  | { status: "success"; message: string };

export const INITIAL_STUDY_FORM_STATE: StudyFormState = { status: "idle" };
