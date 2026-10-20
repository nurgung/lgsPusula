export type OutcomeFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string>;
};

export const initialOutcomeFormState: OutcomeFormState = { status: "idle" };
