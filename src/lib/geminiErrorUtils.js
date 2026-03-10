const GEMINI_KEYWORDS = [
  "gemini",
  "generativelanguage",
  "generatecontent",
];

const OVERLOAD_KEYWORDS = [
  "429",
  "503",
  "unavailable",
  "high demand",
  "read timed out",
  "timed out",
  "timeout",
  "과부하",
];

export function isGeminiOverloadError(error) {
  const status = Number(error?.status || 0);
  const message = String(error?.message || "").toLowerCase();

  const hasGeminiKeyword = GEMINI_KEYWORDS.some((keyword) => message.includes(keyword));
  const hasOverloadKeyword = OVERLOAD_KEYWORDS.some((keyword) => message.includes(keyword));
  if (status === 429 || status === 503) {
    return hasGeminiKeyword || hasOverloadKeyword;
  }
  return hasGeminiKeyword && hasOverloadKeyword;
}
