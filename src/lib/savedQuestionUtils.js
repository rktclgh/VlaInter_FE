export function isAlreadySavedQuestionError(error) {
  const message = String(error?.message || "").trim();
  return message.includes("이미 저장된 질문");
}
