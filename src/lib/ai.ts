import Anthropic from "@anthropic-ai/sdk";

/**
 * AI writing assistant for the composer — caption generation, polishing,
 * hashtag suggestions and translation. Arabic-aware.
 *
 * Gated by ANTHROPIC_API_KEY: when unset the feature degrades gracefully
 * (the API route returns 501). Model is configurable via AI_MODEL so a
 * reseller can trade cost for quality (defaults to Claude Opus 5.5).
 */

export const isAiConfigured = () => !!process.env.ANTHROPIC_API_KEY;

const MODEL = process.env.AI_MODEL || "claude-opus-5-5";

const client = () => new Anthropic(); // reads ANTHROPIC_API_KEY from the env

export type AiAction = "generate" | "improve" | "hashtags" | "translate_ar" | "translate_en";

export interface AiRequest {
  action: AiAction;
  /** The brief (for generate) or the existing caption (for the rest). */
  text: string;
  /** Optional target platform to tune length/style. */
  platform?: string;
  /** Optional tone, e.g. "friendly", "professional", "playful". */
  tone?: string;
}

const PLATFORM_HINT: Record<string, string> = {
  twitter: "Keep it under 280 characters.",
  instagram: "Instagram style: engaging, emoji-friendly, a few relevant hashtags at the end.",
  linkedin: "LinkedIn style: professional and value-driven, minimal emoji.",
  facebook: "Facebook style: conversational and clear.",
  tiktok: "TikTok style: short, punchy, trend-aware.",
  youtube: "YouTube style: a strong title-like opener then a short description.",
};

function buildPrompt(req: AiRequest): { system: string; user: string } {
  const platformHint = req.platform ? PLATFORM_HINT[req.platform] || "" : "";
  const toneHint = req.tone ? `Tone: ${req.tone}.` : "";
  const common =
    "You are a senior social media copywriter fluent in Arabic and English. " +
    "Match the language of the input (reply in Arabic if the input is Arabic). " +
    "Return ONLY the finished text with no preamble, quotes, or explanation.";

  switch (req.action) {
    case "generate":
      return {
        system: common,
        user: `Write a social media post about the following. ${platformHint} ${toneHint}\n\nBrief:\n${req.text}`,
      };
    case "improve":
      return {
        system: common,
        user: `Improve this social media caption — make it clearer and more engaging while keeping its meaning and language. ${platformHint} ${toneHint}\n\nCaption:\n${req.text}`,
      };
    case "hashtags":
      return {
        system:
          "You are a social media hashtag expert fluent in Arabic and English. " +
          "Return ONLY a single line of 5–10 relevant hashtags separated by spaces, no other text. " +
          "Use hashtags in the same language as the input where natural.",
        user: `Suggest hashtags for this post:\n${req.text}`,
      };
    case "translate_ar":
      return {
        system: "You are a professional translator. Return ONLY the translation, nothing else.",
        user: `Translate this social media caption into natural, fluent Arabic:\n${req.text}`,
      };
    case "translate_en":
      return {
        system: "You are a professional translator. Return ONLY the translation, nothing else.",
        user: `Translate this social media caption into natural, fluent English:\n${req.text}`,
      };
  }
}

export async function runAi(req: AiRequest): Promise<string> {
  if (!isAiConfigured()) throw new Error("AI is not configured. Set ANTHROPIC_API_KEY in .env.");
  if (!req.text?.trim()) throw new Error("Nothing to work with — add some text first.");

  const { system, user } = buildPrompt(req);
  const response = await client().messages.create({
    model: MODEL,
    max_tokens: 1024,
    system,
    messages: [{ role: "user", content: user }],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
  if (!text) throw new Error("The assistant returned an empty response. Please try again.");
  return text;
}
