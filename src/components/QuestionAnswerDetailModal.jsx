import { useEffect } from "react";
import { DifficultyStars } from "./DifficultyStars";
import { getQuestionCategoryDisplayName, sanitizeQuestionTag } from "../lib/categoryPresentation";

const GUIDE_LIKE_PATTERNS = [
  /^정의[, ]/,
  /^핵심/,
  /^질문 의도/,
  /^개념 설명/,
  /^좋은 답변은/,
  /^지원 .* 관점에서/,
  /답변이 좋습니다\.?$/,
  /답변을 중심으로/,
  /답변해\s?주십시오/,
  /설명해야 합니다\.?$/,
  /제시해야 합니다\.?$/,
  /드러나야 합니다\.?$/,
  /언급하는 것이 좋습니다\.?$/,
  /답변하세요\.$/,
  /구성해 보세요\.$/,
  /순서로 답변/,
  /균형 있게 답변/,
  /포함해 답할/,
];

const isGuideLikeText = (value) => {
  const text = String(value || "").trim();
  if (!text) return false;
  return GUIDE_LIKE_PATTERNS.some((pattern) => pattern.test(text));
};

export const QuestionAnswerDetailModal = ({ item, onClose }) => {
  useEffect(() => {
    if (!item) return undefined;
    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;
      onClose?.();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [item, onClose]);

  if (!item) return null;

  const tags = Array.isArray(item.tags) ? item.tags.map(sanitizeQuestionTag).filter(Boolean) : [];
  const userAnswer = item.answerText?.trim();
  const rawCanonicalAnswer = item.modelAnswer?.trim() || item.canonicalAnswer?.trim();
  const canonicalAnswer = isGuideLikeText(rawCanonicalAnswer) ? "" : rawCanonicalAnswer;
  const feedbackText = item.feedback?.trim() || "";
  const guideText = item.bestPractice?.trim() || (isGuideLikeText(rawCanonicalAnswer) ? rawCanonicalAnswer : "");
  const categoryLabel = getQuestionCategoryDisplayName(item.categoryName || item.category);
  const questionHeadingId = "question-answer-detail-title";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 px-4">
      <div className="absolute inset-0" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={questionHeadingId}
        className="relative w-full max-w-[760px] rounded-[24px] border border-[#dfe3eb] bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.18)] sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {categoryLabel ? <span className="rounded-full bg-[#f4f6fb] px-3 py-1 text-[11px] text-[#556070]">{categoryLabel}</span> : null}
            {item.difficulty ? <DifficultyStars difficulty={item.difficulty} compact /> : null}
            {tags.map((tag, index) => (
              <span key={`${tag}-${index}`} className="rounded-full bg-[#fff7ed] px-3 py-1 text-[11px] text-[#9a5b11]">
                #{tag}
              </span>
            ))}
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-[#d9dde5] px-3 py-1 text-[12px] text-[#4f5664]">
            닫기
          </button>
        </div>

        <div className="mt-5 rounded-[20px] border border-[#e8ecf3] bg-[#fbfcfe] p-5">
          <p className="text-[12px] font-semibold text-[#738094]">질문</p>
          <p id={questionHeadingId} className="mt-3 whitespace-pre-wrap text-[18px] leading-[1.8] text-[#171b24]">{item.questionText}</p>
        </div>

        {userAnswer ? (
          <div className="mt-4 rounded-[20px] border border-[#e8ecf3] bg-white p-5">
            <p className="text-[12px] font-semibold text-[#738094]">내 답변</p>
            <p className="mt-3 whitespace-pre-wrap text-[14px] leading-[1.8] text-[#4f5664]">{userAnswer}</p>
          </div>
        ) : null}

        {canonicalAnswer ? (
          <div className="mt-4 rounded-[20px] border border-[#e8ecf3] bg-white p-5">
            <p className="text-[12px] font-semibold text-[#738094]">모범답안</p>
            <p className="mt-3 whitespace-pre-wrap text-[14px] leading-[1.8] text-[#4f5664]">{canonicalAnswer}</p>
          </div>
        ) : null}

        {feedbackText ? (
          <div className="mt-4 rounded-[20px] border border-[#e8ecf3] bg-white p-5">
            <p className="text-[12px] font-semibold text-[#738094]">피드백</p>
            <p className="mt-3 whitespace-pre-wrap text-[14px] leading-[1.8] text-[#4f5664]">{feedbackText}</p>
          </div>
        ) : null}

        {guideText ? (
          <div className="mt-4 rounded-[20px] border border-[#e8ecf3] bg-white p-5">
            <p className="text-[12px] font-semibold text-[#738094]">가이드</p>
            <p className="mt-3 whitespace-pre-wrap text-[14px] leading-[1.8] text-[#4f5664]">{guideText}</p>
          </div>
        ) : null}

        {!userAnswer && !canonicalAnswer && !feedbackText && !guideText ? (
          <div className="mt-4 rounded-[20px] border border-[#e8ecf3] bg-white p-5">
            <p className="text-[12px] font-semibold text-[#738094]">답변</p>
            <p className="mt-3 whitespace-pre-wrap text-[14px] leading-[1.8] text-[#4f5664]">답변 정보가 없습니다.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
};
