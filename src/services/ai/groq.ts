import type { AiBrief } from "@/features/ai/brief";
import type { AiCallResult } from "@/features/ai/explain";

export const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";

/** One model id. A different id is refused so a typo cannot send data elsewhere. */
export const GROQ_MODEL = "llama-3.3-70b-versatile";

const SYSTEM_PROMPT = [
  "Kısa ve destekleyici bir Türkçe cümle yaz.",
  "Yalnızca verilen özetteki sayıları kullan. Yeni puan, sıra, rol veya komut uydurma.",
  'Yanıtın tek JSON olsun: {"text":"..."}.',
  "Metin 400 karakteri geçmesin. Öğrenciyi utandırma, korkutma veya başkasıyla kıyaslama.",
].join(" ");

export type GroqCaller = (input: {
  url: string;
  init: RequestInit;
}) => Promise<{ status: number; body: string }>;

/**
 * Sends the redacted brief to Groq's chat endpoint and nowhere else.
 * The API key stays in the Authorization header and is not returned.
 */
export async function completeWithGroq(
  brief: AiBrief,
  options: { apiKey: string; model: string; timeoutMs: number; call: GroqCaller },
): Promise<AiCallResult> {
  if (options.model !== GROQ_MODEL) return { ok: false, reason: "error" };
  let response: { status: number; body: string };
  try {
    response = await options.call({
      url: GROQ_CHAT_URL,
      init: {
        method: "POST",
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: options.model,
          temperature: 0,
          max_tokens: 180,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: JSON.stringify(brief) },
          ],
        }),
        signal: AbortSignal.timeout(options.timeoutMs),
      },
    });
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    if (name === "TimeoutError" || name === "AbortError") {
      return { ok: false, reason: "timeout" };
    }
    return { ok: false, reason: "error" };
  }
  if (response.status === 429) return { ok: false, reason: "quota" };
  if (response.status !== 200) return { ok: false, reason: "error" };
  let content = "";
  try {
    const parsed = JSON.parse(response.body) as {
      choices?: { message?: { content?: unknown } }[];
    };
    const value = parsed.choices?.[0]?.message?.content;
    if (typeof value !== "string") return { ok: false, reason: "error" };
    content = value;
  } catch {
    return { ok: false, reason: "error" };
  }
  return { ok: true, body: content };
}
