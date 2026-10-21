export type ReportFormState = { status: "idle" } | { status: "error"; message: string };

export const INITIAL_REPORT_FORM_STATE: ReportFormState = { status: "idle" };
