export type MfaEnrollState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "ready"; factorId: string; secret: string };

export type MfaVerifyState =
  | { status: "idle" }
  | { status: "error"; message: string; fieldErrors?: { code?: string } };

export const INITIAL_MFA_ENROLL_STATE: MfaEnrollState = { status: "idle" };
export const INITIAL_MFA_VERIFY_STATE: MfaVerifyState = { status: "idle" };
