export type MascotFormState =
  | { status: "idle" }
  | {
      status: "error";
      message: string;
      fieldErrors?: Record<string, string>;
      values?: Record<string, string>;
    };

export const INITIAL_MASCOT_FORM_STATE: MascotFormState = { status: "idle" };
