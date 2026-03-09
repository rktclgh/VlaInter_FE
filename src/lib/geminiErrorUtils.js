const GEMINI_KEYWORDS = [
  "gemini",
  "generativelanguage",
  "generatecontent",
];

const OVERLOAD_KEYWORDS = [
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

  if (status === 503) return true;

  const hasGeminiKeyword = GEMINI_KEYWORDS.some((keyword) => message.includes(keyword));
  const hasOverloadKeyword = OVERLOAD_KEYWORDS.some((keyword) => message.includes(keyword));
  return hasGeminiKeyword && hasOverloadKeyword;
}
