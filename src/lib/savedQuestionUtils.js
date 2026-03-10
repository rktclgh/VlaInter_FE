export function isAlreadySavedQuestionError(error) {
  const code = String(error?.code || "").trim().toUpperCase();
  if (code === "ALREADY_SAVED") return true;
  const status = Number(error?.status || error?.response?.status || 0);
  if (status === 409) return true;
  const responseCode = String(error?.response?.data?.code || "").trim().toUpperCase();
  if (responseCode === "ALREADY_SAVED") return true;
  const message = String(error?.message || "").trim();
  return message.includes("이미 저장된 질문");
}
