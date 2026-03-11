import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaRegStar, FaStar } from "react-icons/fa6";
import { ContentTopNav } from "../../components/ContentTopNav";
import { InlineSpinner } from "../../components/InlineSpinner";
import { LogoutConfirmModal } from "../../components/LogoutConfirmModal";
import { MobileSidebarDrawer } from "../../components/MobileSidebarDrawer";
import { OcrInfoBadge } from "../../components/OcrInfoBadge";
import { Sidebar } from "../../components/Sidebar";
import { PointChargeModal } from "../../components/PointChargeModal";
import { PointChargeSuccessModal } from "../../components/PointChargeSuccessModal";
import tempProfileImage from "../../assets/icon/temp.png";
import { isAuthenticationError } from "../../lib/apiClient";
import { logout } from "../../lib/authApi";
import { bookmarkInterviewTurn, getInterviewSessionResults, submitInterviewAnswer } from "../../lib/interviewApi";
import { getQuestionCategoryDisplayName, sanitizeQuestionTag } from "../../lib/categoryPresentation";
import {
  clearTechInterviewSession,
  loadTechInterviewSession,
  saveTechInterviewSession,
} from "../../lib/interviewSessionFlow";
import { consumePointChargeSuccessResult } from "../../lib/pointChargeFlow";
import { extractProfile, formatPoint, parsePoint } from "../../lib/profileUtils";
import { isAlreadySavedQuestionError } from "../../lib/savedQuestionUtils";
import { getMyProfile, getMyProfileImageUrl } from "../../lib/userApi";

const QuestionMetaChip = ({ label }) => (
  <span className="inline-flex rounded-full border border-[#d9dde5] bg-[#f7f8fb] px-2.5 py-1 text-[11px] text-[#505866]">
    {label}
  </span>
);

const DocumentMetaChip = ({ label, ocrUsed }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d9dde5] bg-[#f7f8fb] px-2.5 py-1 text-[11px] text-[#505866]">
    <span>{label}</span>
    {ocrUsed ? <OcrInfoBadge compact /> : null}
  </span>
);

const PaidFallbackNoticeToast = ({ onClose }) => (
  <div
    role="status"
    aria-live="polite"
    aria-atomic="true"
    className="fixed bottom-4 right-4 z-[230] w-[min(360px,calc(100vw-32px))] rounded-2xl border border-[#d8dbe3] bg-white p-4 shadow-[0_18px_48px_rgba(15,23,42,0.16)]"
  >
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[13px] font-semibold text-[#111827]">대체 AI API 사용</p>
        <p className="mt-1 text-[12px] leading-[1.65] text-[#4b5563]">
          개발자의 돈으로 호출된 API입니다 ㅜㅜ
        </p>
        <p className="mt-1 text-[12px] leading-[1.65] text-[#6b7280]">
          Gemini 오류로 인해 이번 세션은 다른 AI API로 처리했습니다.
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="안내 닫기"
        className="rounded-full border border-[#d8dde7] px-2 py-1 text-[11px] text-[#4f5664]"
      >
        닫기
      </button>
    </div>
  </div>
);

const scoreToStars = (score) => {
  const numeric = Number(score);
  if (!Number.isFinite(numeric) || numeric <= 0) return 1;
  return Math.max(1, Math.min(5, Math.round(numeric / 20)));
};

const StarRating = ({ score }) => {
  const stars = scoreToStars(score);
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, index) => (
        index < stars
          ? <FaStar key={index} className="text-[16px] text-[#f59e0b]" />
          : <FaRegStar key={index} className="text-[16px] text-[#d9dde5]" />
      ))}
    </div>
  );
};

const normalizeSelectedDocumentMeta = (value) => {
  if (!value) return null;
  if (typeof value === "string") {
    const label = value.trim();
    return label ? { label, ocrUsed: false } : null;
  }
  if (typeof value === "object") {
    const rawLabel = value.label || value.fileName || value.name || "";
    const label = typeof rawLabel === "string" ? rawLabel.trim() : "";
    if (!label) return null;
    return {
      label,
      ocrUsed: Boolean(value.ocrUsed),
    };
  }
  return null;
};

export const InterviewSessionPage = () => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("사용자");
  const [userPoint, setUserPoint] = useState(0);
  const [profileImageUrl, setProfileImageUrl] = useState(tempProfileImage);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showPointChargeModal, setShowPointChargeModal] = useState(false);
  const [showPointChargeSuccessModal, setShowPointChargeSuccessModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const [sessionId, setSessionId] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [answer, setAnswer] = useState("");
  const [pendingResult, setPendingResult] = useState(null);
  const [completed, setCompleted] = useState(false);
  const [pageErrorMessage, setPageErrorMessage] = useState("");
  const [submitErrorMessage, setSubmitErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [finalizingSession, setFinalizingSession] = useState(false);
  const [bookmarking, setBookmarking] = useState(false);
  const [sessionMetadata, setSessionMetadata] = useState({});
  const [sessionResults, setSessionResults] = useState(null);
  const [loadingResults, setLoadingResults] = useState(false);
  const [showPaidFallbackNotice, setShowPaidFallbackNotice] = useState(false);

  useEffect(() => {
    const charged = consumePointChargeSuccessResult();
    if (!charged) return;
    const nextPoint = parsePoint(charged?.currentPoint);
    setUserPoint(nextPoint);
    setShowPointChargeSuccessModal(true);
  }, []);

  useEffect(() => {
    const snapshot = loadTechInterviewSession();
    if (!snapshot?.sessionId) {
      navigate("/content/interview", { replace: true });
      return;
    }

    setSessionId(snapshot.sessionId);
    setCurrentQuestion(snapshot.currentQuestion || null);
    setPendingResult(snapshot.pendingResult || null);
    setCompleted(Boolean(snapshot.completed));
    setSessionMetadata(snapshot.metadata || {});
  }, [navigate]);

  useEffect(() => {
    if (!sessionId) return;
    saveTechInterviewSession({
      sessionId,
      currentQuestion,
      pendingResult,
      completed,
      metadata: sessionMetadata,
    });
  }, [completed, currentQuestion, pendingResult, sessionId, sessionMetadata]);

  useEffect(() => {
    const loadProfileData = async () => {
      try {
        const profilePayload = await getMyProfile();
        const profile = extractProfile(profilePayload);
        setUserName(profile?.name || "사용자");
        setUserPoint(parsePoint(profile?.point));
        setProfileImageUrl(getMyProfileImageUrl());
      } catch (error) {
        if (isAuthenticationError(error)) {
          navigate("/login", { replace: true });
        }
      }
    };

    loadProfileData();
  }, [navigate]);

  const currentQuestionTitle = useMemo(() => {
    if (completed && !currentQuestion) return "면접이 종료되었습니다";
    if (!currentQuestion) return "진행 중인 질문을 찾을 수 없습니다";
    return `질문 ${currentQuestion.turnNo}`;
  }, [completed, currentQuestion]);

  const isMockInterview = sessionMetadata.apiBasePath === "/api/interview/mock";
  const isQuestionSetPractice = Boolean(sessionMetadata.fromQuestionSet);
  const sessionNavigation = isMockInterview
    ? { activeKey: "interview_start", homePath: "/content/interview" }
    : isQuestionSetPractice
      ? { activeKey: "question_set", homePath: "/content/question-sets" }
      : { activeKey: "tech_practice", homePath: "/content/tech-practice" };
  const { activeKey: sidebarActiveKey, homePath: sessionHomePath } = sessionNavigation;
  const isLastQuestion = Boolean(
    currentQuestion &&
    Number(sessionMetadata.questionCount || 0) > 0 &&
    currentQuestion.turnNo >= Number(sessionMetadata.questionCount || 0)
  );
  const usedBedrockAtStart = String(sessionMetadata?.providerUsed || "").toUpperCase() === "BEDROCK";
  const usedBedrockInResults = useMemo(
    () => Boolean((sessionResults?.turns || []).some((turn) => String(turn?.evaluation?.providerUsed || "").toUpperCase() === "BEDROCK")),
    [sessionResults]
  );

  useEffect(() => {
    if (sessionMetadata?.paidFallbackNoticeDismissed) return;
    if (!usedBedrockAtStart && !usedBedrockInResults) return;
    setShowPaidFallbackNotice(true);
  }, [sessionMetadata?.paidFallbackNoticeDismissed, usedBedrockAtStart, usedBedrockInResults]);

  useEffect(() => {
    if (!finalizingSession) return undefined;

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [finalizingSession]);

  const selectedDocumentMetas = useMemo(
    () => Object.values(sessionMetadata.selectedDocuments || {}).map(normalizeSelectedDocumentMeta).filter(Boolean),
    [sessionMetadata.selectedDocuments]
  );

  const loadSessionResults = useCallback(async () => {
    if (!sessionId) return;
    setLoadingResults(true);
    setPageErrorMessage("");
    try {
      const result = await getInterviewSessionResults(sessionMetadata.apiBasePath || "/api/interview/tech", sessionId);
      setSessionResults(result);
    } catch (error) {
      setPageErrorMessage(error?.message || "면접 결과를 불러오지 못했습니다.");
    } finally {
      setLoadingResults(false);
    }
  }, [sessionId, sessionMetadata.apiBasePath]);

  useEffect(() => {
    if (!completed || sessionResults) return;
    void loadSessionResults();
  }, [completed, loadSessionResults, sessionResults]);

  const handleRetryResults = () => {
    void loadSessionResults();
  };

  const handleSidebarNavigate = (item) => {
    if (finalizingSession) return;
    setIsMobileMenuOpen(false);
    if (item?.path) {
      navigate(item.path);
    }
  };

  const handleLogoutConfirm = async () => {
    try {
      await logout();
    } catch {
      // ignore
    } finally {
      setShowLogoutModal(false);
      clearTechInterviewSession();
      navigate("/login", { replace: true });
    }
  };

  const handleSubmitAnswer = async () => {
    if (!sessionId || !currentQuestion) {
      setSubmitErrorMessage("진행 중인 질문 정보가 없습니다.");
      return;
    }
    if (!answer.trim()) {
      setSubmitErrorMessage("답변을 입력해 주세요.");
      return;
    }

    setSubmitting(true);
    setSubmitErrorMessage("");
    let completedResponse = false;
    let nextQuestionResponse = null;
    try {
      const response = await submitInterviewAnswer(sessionMetadata.apiBasePath || "/api/interview/tech", sessionId, answer.trim());
      completedResponse = Boolean(response?.completed);
      nextQuestionResponse = response?.nextQuestion || null;
      setAnswer("");
      setPendingResult(null);
      if (completedResponse) {
        setFinalizingSession(true);
        setCompleted(true);
        setCurrentQuestion(null);
        try {
          await loadSessionResults();
        } finally {
          setFinalizingSession(false);
        }
      } else {
        setCompleted(false);
        setCurrentQuestion(nextQuestionResponse);
      }
    } catch (error) {
      setSubmitErrorMessage(error?.message || "답변 제출에 실패했습니다.");
    } finally {
      if (!completedResponse) {
        setFinalizingSession(false);
      }
      setSubmitting(false);
    }
  };

  const resolveTurnId = (value) => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && /^\d+$/.test(value.trim())) return Number(value.trim());
    return null;
  };

  const handleBookmark = async (rawTurnId = pendingResult?.answeredTurnId) => {
    const turnId = resolveTurnId(rawTurnId);
    if (!turnId) {
      setPageErrorMessage("저장할 질문 정보를 찾지 못했습니다. 다시 시도해 주세요.");
      return;
    }
    const resultTurn = sessionResults?.turns?.find((item) => item.turnId === turnId);
    if (resultTurn?.bookmarked || pendingResult?.bookmarked) return;

    setBookmarking(true);
    setPageErrorMessage("");
    try {
      await bookmarkInterviewTurn(
        sessionMetadata.apiBasePath || "/api/interview/tech",
        turnId
      );
      setPendingResult((prev) => (prev?.answeredTurnId === turnId ? { ...prev, bookmarked: true } : prev));
      setSessionResults((prev) =>
        prev
          ? {
              ...prev,
              turns: prev.turns.map((item) => (item.turnId === turnId ? { ...item, bookmarked: true } : item)),
            }
          : prev
      );
    } catch (error) {
      if (isAlreadySavedQuestionError(error)) {
        setPendingResult((prev) => (prev?.answeredTurnId === turnId ? { ...prev, bookmarked: true } : prev));
        setSessionResults((prev) =>
          prev
            ? {
                ...prev,
                turns: prev.turns.map((item) => (item.turnId === turnId ? { ...item, bookmarked: true } : item)),
              }
            : prev
        );
        return;
      }
      setPageErrorMessage(error?.message || "질문 저장에 실패했습니다.");
    } finally {
      setBookmarking(false);
    }
  };

  if (!sessionId) {
    return null;
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-white pt-[54px]">
      <ContentTopNav
        point={formatPoint(userPoint)}
        onClickCharge={() => {
          if (finalizingSession) return;
          setShowPointChargeModal(true);
        }}
        onOpenMenu={() => {
          if (finalizingSession) return;
          setIsMobileMenuOpen(true);
        }}
      />

      <MobileSidebarDrawer
        open={isMobileMenuOpen}
        activeKey={sidebarActiveKey}
        onClose={() => setIsMobileMenuOpen(false)}
        onNavigate={handleSidebarNavigate}
        userName={userName}
        profileImageUrl={profileImageUrl}
        onLogout={() => {
          if (finalizingSession) return;
          setIsMobileMenuOpen(false);
          setShowLogoutModal(true);
        }}
      />

      <div className="flex min-h-[calc(100vh-54px)]">
        <div className="hidden w-[272px] shrink-0 md:block">
          <Sidebar
            activeKey={sidebarActiveKey}
            onNavigate={handleSidebarNavigate}
            userName={userName}
            profileImageUrl={profileImageUrl}
            onLogout={() => {
              if (finalizingSession) return;
              setShowLogoutModal(true);
            }}
          />
        </div>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="border-b border-[#eceff4] bg-white/95 px-4 py-3 backdrop-blur sm:px-5 md:px-8">
            <div className="mx-auto flex w-full max-w-[980px] flex-wrap gap-2">
              {selectedDocumentMetas.length > 0
                ? selectedDocumentMetas.map((item) => (
                    <DocumentMetaChip
                      key={`${item.label}-${item.ocrUsed ? "ocr" : "plain"}`}
                      label={item.label}
                      ocrUsed={item.ocrUsed}
                    />
                  ))
                : <QuestionMetaChip label="문서 미선택" />}
              {sessionMetadata.difficultyLabel ? <QuestionMetaChip label={`난이도 ${sessionMetadata.difficultyLabel}`} /> : null}
              {sessionMetadata.categoryName ? <QuestionMetaChip label={sessionMetadata.categoryName} /> : null}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-6 pt-6 sm:px-5 md:px-8 md:pt-10">
            <div className="mx-auto w-full max-w-[980px]">
              <div className="rounded-[24px] border border-[#e4e7ee] bg-[linear-gradient(180deg,#ffffff_0%,#f7f9fc_100%)] p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-[12px] font-semibold tracking-[0.08em] text-[#7a8190]">
                      {isMockInterview ? "MOCK INTERVIEW" : "TECH INTERVIEW"}
                    </p>
                    <h1 className="mt-2 text-[28px] font-semibold text-[#161a22] sm:text-[34px]">{currentQuestionTitle}</h1>
                    <p className="mt-2 text-[13px] leading-[1.6] text-[#5e6472]">
                      {isMockInterview
                        ? "모의면접 중에는 다음 문제에 집중하시고, 종료 후 질문·답변·평가를 한 번에 확인하실 수 있습니다."
                        : isQuestionSetPractice
                          ? "내 질문 세트 연습은 종료 후 질문, 내 답변, 모범답안을 한 번에 확인합니다."
                          : "답변별 즉시 평가 대신, 종료 후 전체 결과를 한 번에 정리해 보여드립니다."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (finalizingSession) return;
                      clearTechInterviewSession();
                      navigate(sessionHomePath, { replace: true });
                    }}
                    disabled={finalizingSession}
                    className="rounded-[12px] border border-[#d8dde7] px-3 py-2 text-[12px] text-[#4f5664]"
                  >
                    시작 화면으로
                  </button>
                </div>

                {currentQuestion ? (
                  <>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {currentQuestion.category ? <QuestionMetaChip label={getQuestionCategoryDisplayName(currentQuestion.category)} /> : null}
                      {currentQuestion.sourceTag === "USER" ? <QuestionMetaChip label="사용자 생성" /> : null}
                      {currentQuestion.difficulty ? <QuestionMetaChip label={`난이도 ${currentQuestion.difficulty}`} /> : null}
                      {(currentQuestion.tags || []).map(sanitizeQuestionTag).filter(Boolean).map((tag) => (
                        <QuestionMetaChip key={tag} label={`#${tag}`} />
                      ))}
                    </div>

                    <div className="mt-5 rounded-[18px] border border-[#dfe3eb] bg-white px-5 py-6">
                      <p className="text-[13px] font-medium text-[#7a8190]">질문</p>
                      <p className="mt-3 whitespace-pre-wrap text-[18px] leading-[1.8] text-[#171b24]">
                        {currentQuestion.questionText}
                      </p>
                    </div>

                    {!pendingResult ? (
                      <div className="mt-5">
                        <label className="block">
                          <span className="mb-2 block text-[13px] font-medium text-[#495061]">답변</span>
                          <textarea
                            value={answer}
                            onChange={(event) => setAnswer(event.target.value)}
                            placeholder="질문의 의도, 핵심 개념, 실무 사례 순서로 답변을 구성해 보세요."
                            className="min-h-[220px] w-full rounded-[18px] border border-[#dfe3eb] bg-white px-4 py-4 text-[14px] leading-[1.7] text-[#171b24] outline-none focus:border-[#8aa2e8]"
                          />
                        </label>

                        {submitErrorMessage ? <p className="mt-3 text-[12px] text-[#dc4b4b]">{submitErrorMessage}</p> : null}

                        <div className="mt-4 flex items-center justify-between gap-3">
                          {submitting ? (
                            <InlineSpinner label={isLastQuestion ? "면접 결과를 정리하고 있습니다." : "다음 질문을 준비하고 있습니다."} />
                          ) : (
                            <span />
                          )}
                          <button
                            type="button"
                            onClick={handleSubmitAnswer}
                            disabled={submitting}
                            className="rounded-[14px] bg-[#171b24] px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
                          >
                            {submitting ? (isLastQuestion ? "결과 정리 중..." : "다음 문제 준비 중...") : isMockInterview ? "다음 문제" : "답변 제출"}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : null}

                {completed && sessionResults ? (
                  <div className="mt-5 rounded-[18px] border border-[#dfe3eb] bg-white px-5 py-6">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[16px] font-medium text-[#171b24]">면접 결과</p>
                        <p className="mt-1 text-[13px] leading-[1.7] text-[#5e6472]">
                          질문, 답변, 평가를 한 번에 확인하시고 필요한 항목만 저장하실 수 있습니다.
                        </p>
                      </div>
                    </div>

                    {loadingResults ? (
                      <p className="mt-5 text-[13px] text-[#5e6472]">평가 결과를 정리하고 있습니다...</p>
                    ) : !sessionResults ? (
                      <div className="mt-5 rounded-[14px] border border-[#e4e7ee] bg-[#fbfcfe] p-4">
                        <p className="text-[13px] text-[#5e6472]">평가 결과를 불러오지 못했습니다. 다시 시도해 주세요.</p>
                        <button
                          type="button"
                          onClick={handleRetryResults}
                          className="mt-3 rounded-[12px] border border-[#171b24] px-3 py-2 text-[12px] font-semibold text-[#171b24]"
                        >
                          결과 다시 불러오기
                        </button>
                      </div>
                    ) : (
                      <div className="mt-5 grid gap-4">
                        {(sessionResults?.turns || []).map((turn) => (
                          <article key={turn.turnId} className="rounded-[18px] border border-[#e4e7ee] bg-[#fbfcfe] p-5">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <p className="text-[12px] font-semibold tracking-[0.08em] text-[#7a8190]">QUESTION {turn.turnNo}</p>
                                <p className="mt-2 whitespace-pre-wrap text-[16px] leading-[1.7] text-[#171b24]">
                                  {turn.questionText}
                                </p>
                              </div>
                              {!isQuestionSetPractice ? (
                                turn.sourceTag === "INTRO" ? null : (
                                <button
                                  type="button"
                                  onClick={() => handleBookmark(turn.turnId)}
                                  disabled={bookmarking || turn.bookmarked}
                                  className="rounded-[12px] border border-[#d8dde7] px-3 py-2 text-[12px] text-[#4f5664] disabled:opacity-60"
                                >
                                  {turn.bookmarked ? "저장됨" : bookmarking ? "저장 중..." : "질문 저장"}
                                </button>
                                )
                              ) : null}
                            </div>

                            <div className="mt-4 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
                              <section className="rounded-[16px] bg-white p-4">
                                <p className="text-[12px] font-semibold text-[#5d6676]">내 답변</p>
                                <p className="mt-2 whitespace-pre-wrap text-[13px] leading-[1.7] text-[#252b36]">
                                  {turn.answerText || "-"}
                                </p>
                              </section>
                              <section className="rounded-[16px] bg-white p-4">
                                <p className="text-[12px] font-semibold text-[#5d6676]">평가</p>
                                <div className="mt-2 flex items-center gap-3">
                                  <StarRating score={turn.evaluation?.score} />
                                  <span className="text-[12px] text-[#6b7280]">
                                    {turn.evaluation?.score ? `${turn.evaluation.score}점` : "평가 대기"}
                                  </span>
                                </div>
                                <p className="mt-3 whitespace-pre-wrap text-[13px] leading-[1.7] text-[#252b36]">
                                  {turn.evaluation?.feedback || "-"}
                                </p>
                                <div className="mt-3 rounded-[12px] bg-[#f6f8fb] p-3">
                                  <p className="text-[11px] font-semibold text-[#5d6676]">보완 포인트</p>
                                  <p className="mt-1 whitespace-pre-wrap text-[12px] leading-[1.6] text-[#4f5664]">
                                    {turn.evaluation?.bestPractice?.trim() || "-"}
                                  </p>
                                </div>
                                <div className="mt-3 rounded-[12px] bg-[#f6f8fb] p-3">
                                  <p className="text-[11px] font-semibold text-[#5d6676]">모범답안</p>
                                  <p className="mt-1 whitespace-pre-wrap text-[12px] leading-[1.6] text-[#4f5664]">
                                    {turn.evaluation?.modelAnswer || "-"}
                                  </p>
                                </div>
                              </section>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}

                {completed && !pendingResult && !loadingResults && !sessionResults ? (
                  <div className="mt-5 rounded-[18px] border border-[#dfe3eb] bg-white px-5 py-6">
                    <p className="text-[16px] font-medium text-[#171b24]">면접이 종료되었습니다.</p>
                    <p className="mt-2 text-[13px] leading-[1.7] text-[#5e6472]">
                      {isQuestionSetPractice
                        ? "내 질문 세트 연습이 완료되었습니다. 세트 화면으로 돌아가 다음 연습을 이어갈 수 있습니다."
                        : "새 면접을 시작하거나 저장된 질문을 확인하여 다음 연습을 이어가실 수 있습니다."}
                    </p>
                  </div>
                ) : null}

                {pageErrorMessage ? <p className="mt-4 text-[12px] text-[#dc4b4b]">{pageErrorMessage}</p> : null}
              </div>
            </div>
          </div>
        </main>
      </div>

      {showLogoutModal ? (
        <LogoutConfirmModal onCancel={() => setShowLogoutModal(false)} onConfirm={handleLogoutConfirm} />
      ) : null}
      {showPointChargeModal ? (
        <PointChargeModal
          onClose={() => setShowPointChargeModal(false)}
          onCharged={(result) => {
            const nextPoint = parsePoint(result?.currentPoint);
            setUserPoint(nextPoint);
            setShowPointChargeSuccessModal(true);
          }}
        />
      ) : null}
      {showPointChargeSuccessModal ? (
        <PointChargeSuccessModal onClose={() => setShowPointChargeSuccessModal(false)} />
      ) : null}
      {finalizingSession ? (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-[#0f172acc]">
          <div className="rounded-[18px] border border-[#334155] bg-[#111827] px-6 py-5 text-center">
            <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-[#64748b] border-t-white" />
            <p className="mt-3 text-[14px] font-medium text-white">세션 평가를 마무리하는 중입니다</p>
            <p className="mt-1 text-[12px] text-[#cbd5e1]">완료될 때까지 다른 화면으로 이동할 수 없습니다.</p>
          </div>
        </div>
      ) : null}
      {showPaidFallbackNotice ? (
        <PaidFallbackNoticeToast
          onClose={() => {
            setShowPaidFallbackNotice(false);
            setSessionMetadata((prev) => ({ ...prev, paidFallbackNoticeDismissed: true }));
          }}
        />
      ) : null}
    </div>
  );
};
