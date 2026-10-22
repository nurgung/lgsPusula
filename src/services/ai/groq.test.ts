import { describe, expect, it, vi } from "vitest";
import type { AiBrief } from "@/features/ai/brief";
import { completeWithGroq, GROQ_CHAT_URL, GROQ_MODEL, type GroqCaller } from "./groq";

const brief: AiBrief = {
  ruleId: "coaching.hold",
  practiceWindow: "2026-10-09/2026-10-22",
  examWindow: "2026-07-24/2026-10-22",
  lines: ["Kısa bir tekrar faydalı olabilir."],
};

describe("completeWithGroq", () => {
  it("posts only to the Groq chat URL and does not echo the key", async () => {
    const call = vi.fn<GroqCaller>(async () => ({
      status: 200,
      body: JSON.stringify({
        choices: [
          { message: { content: '{"text":"İstersen kısa bir tekrar yapabilirsin."}' } },
        ],
      }),
    }));
    const result = await completeWithGroq(brief, {
      apiKey: "secret-key",
      model: GROQ_MODEL,
      timeoutMs: 1000,
      call,
    });
    expect(result.ok).toBe(true);
    expect(call).toHaveBeenCalledOnce();
    const request = call.mock.calls[0]?.[0];
    if (!request) throw new Error("missing request");
    expect(request?.url).toBe(GROQ_CHAT_URL);
    expect(JSON.stringify(request?.init.headers)).toContain("secret-key");
    expect(JSON.stringify(result)).not.toContain("secret-key");
    const body = JSON.parse(String(request?.init.body));
    expect(body.model).toBe(GROQ_MODEL);
    expect(body.messages[1].content).not.toContain("secret-key");
  });

  it("maps a timeout and a quota response to a rule fallback", async () => {
    const timeout = await completeWithGroq(brief, {
      apiKey: "secret-key",
      model: GROQ_MODEL,
      timeoutMs: 1000,
      call: async () => {
        throw Object.assign(new Error("timed out"), { name: "TimeoutError" });
      },
    });
    expect(timeout).toEqual({ ok: false, reason: "timeout" });

    const quota = await completeWithGroq(brief, {
      apiKey: "secret-key",
      model: GROQ_MODEL,
      timeoutMs: 1000,
      call: async () => ({ status: 429, body: "" }),
    });
    expect(quota).toEqual({ ok: false, reason: "quota" });
  });

  it("refuses a model id that is not the allowlisted one", async () => {
    const call = vi.fn();
    const result = await completeWithGroq(brief, {
      apiKey: "secret-key",
      model: "other-model",
      timeoutMs: 1000,
      call,
    });
    expect(result).toEqual({ ok: false, reason: "error" });
    expect(call).not.toHaveBeenCalled();
  });
});
