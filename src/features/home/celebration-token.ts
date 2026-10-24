import { createHmac, timingSafeEqual } from "node:crypto";
import { STAGE_LEVELS, type StageId } from "@/features/mascot/constants";
import type { BadgeView } from "@/features/mascot/rules";
import type { CelebrationKind } from "./celebration";

export const CELEBRATION_TTL_MS = 15 * 60 * 1000;
const MAX_TOKEN_LENGTH = 500;

const BADGE_IDS: readonly BadgeView["id"][] = [
  "first_step",
  "goal_met",
  "steady_days",
  "reviewer",
  "exam_noted",
];

type TokenBody = {
  studentId: string;
  kind: CelebrationKind;
  exp: number;
};

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(`celebration\u0000${payload}`)
    .digest("base64url");
}

function sameText(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function isBadgeId(value: string): value is BadgeView["id"] {
  return BADGE_IDS.some((id) => id === value);
}

function isStageId(value: string): value is StageId {
  return STAGE_LEVELS.some((level) => level.id === value);
}

function isKind(value: unknown): value is CelebrationKind {
  if (!value || typeof value !== "object") return false;
  const kind = value as { reason?: unknown; badgeId?: unknown; stageId?: unknown };
  if (kind.reason === "goal" || kind.reason === "practice") return true;
  if (kind.reason === "badge" && typeof kind.badgeId === "string" && isBadgeId(kind.badgeId)) {
    return true;
  }
  if (kind.reason === "stage" && typeof kind.stageId === "string" && isStageId(kind.stageId)) {
    return true;
  }
  return false;
}

/** Short-lived proof that this server saw a real crossing. The text is rebuilt later. */
export function signCelebration(
  input: { studentId: string; kind: CelebrationKind; expiresAt: number },
  secret: string,
): string {
  const body: TokenBody = {
    studentId: input.studentId,
    kind: input.kind,
    exp: input.expiresAt,
  };
  const payload = Buffer.from(JSON.stringify(body)).toString("base64url");
  return `${payload}.${signPayload(payload, secret)}`;
}

export function readCelebration(
  token: string,
  secret: string,
  now: number,
): { studentId: string; kind: CelebrationKind } | null {
  if (token.length === 0 || token.length > MAX_TOKEN_LENGTH) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, mac] = parts;
  if (!payload || !mac) return null;
  if (!sameText(mac, signPayload(payload, secret))) return null;

  try {
    const parsed: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!parsed || typeof parsed !== "object") return null;
    const body = parsed as { studentId?: unknown; kind?: unknown; exp?: unknown };
    if (typeof body.studentId !== "string" || body.studentId.length < 32) return null;
    if (typeof body.exp !== "number" || !Number.isFinite(body.exp) || body.exp <= now) {
      return null;
    }
    if (!isKind(body.kind)) return null;
    return { studentId: body.studentId, kind: body.kind };
  } catch {
    return null;
  }
}

export function withCelebrationParam(
  path: string,
  token: string | null,
  name = "kutlama",
): string {
  if (!token) return path;
  const hashAt = path.indexOf("#");
  const base = hashAt === -1 ? path : path.slice(0, hashAt);
  const hash = hashAt === -1 ? "" : path.slice(hashAt);
  const join = base.includes("?") ? "&" : "?";
  return `${base}${join}${name}=${encodeURIComponent(token)}${hash}`;
}
