export type FamilyFormState =
  | { status: "idle" }
  | {
      status: "error";
      message: string;
      fieldErrors?: Record<string, string>;
      values?: { code?: string };
    }
  | { status: "success"; message: string; code?: string };

export const INITIAL_FAMILY_FORM_STATE: FamilyFormState = { status: "idle" };
