import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ContentTopNav } from "../../components/ContentTopNav";
import { MobileSidebarDrawer } from "../../components/MobileSidebarDrawer";
import { Sidebar } from "../../components/Sidebar";
import { PointChargeModal } from "../../components/PointChargeModal";
import { PointChargeSuccessModal } from "../../components/PointChargeSuccessModal";
import tempProfileImage from "../../assets/icon/temp.png";
import { logout } from "../../lib/authApi";
import { bookmarkInterviewTurn, submitInterviewAnswer } from "../../lib/interviewApi";
import {
  clearTechInterviewSession,
  loadTechInterviewSession,
  saveTechInterviewSession,
} from "../../lib/interviewSessionFlow";
import { consumePointChargeSuccessResult } from "../../lib/pointChargeFlow";
import { getMyProfile, getMyProfileImageUrl } from "../../lib/userApi";

const formatPoint = (value) => {
  const safeNumber = Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
  return `${new Intl.NumberFormat("ko-KR").format(safeNumber)}P`;
};

const parsePoint = (rawValue) => {
  if (typeof rawValue === "number") return rawValue;
  if (typeof rawValue === "string") {
    const normalized = rawValue.replace(/,/g, "").trim();
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const extractProfile = (payload) => {
  if (!payload || typeof payload !== "object") return {};
  if (payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)) return payload.data;
  if (payload.result && typeof payload.result === "object" && !Array.isArray(payload.result)) return payload.result;
  if (payload.user && typeof payload.user === "object" && !Array.isArray(payload.user)) return payload.user;
  return payload;
};

const QuestionMetaChip = ({ label }) => (
  <span className="inline-flex rounded-full border border-[#d9dde5] bg-[#f7f8fb] px-2.5 py-1 text-[11px] text-[#505866]">
    {label}
  </span>
);

const LogoutConfirmModal = ({ onCancel, onConfirm }) => {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/35 px-4">
      <div className="w-full max-w-[420px] rounded-[16px] border border-[#d9d9d9] bg-white p-5">
        <p className="text-[15px] font-medium text-[#252525]">
          정말 로그아웃 하시겠습니까?
          <br />
          종료하지 않은 면접 내용은 저장되지 않습니다
        </p>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-[10px] border border-[#d6d6d6] px-3 py-1.5 text-[12px] text-[#666]"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-[10px] border border-[#1f1f1f] bg-[#1f1f1f] px-3 py-1.5 text-[12px] text-white"
          >
            로그아웃
          </button>
        </div>
      </div>
    </div>
  );
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
  const [bookmarking, setBookmarking] = useState(false);
  const [sessionMetadata, setSessionMetadata] = useState({});

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
      } catch {
        navigate("/login", { replace: true });
      }
    };

    loadProfileData();
  }, [navigate]);

  const currentQuestionTitle = useMemo(() => {
    if (completed) return "면접이 종료되었습니다";
    if (!currentQuestion) return "진행 중인 질문을 찾을 수 없습니다";
    return `질문 ${currentQuestion.turnNo}`;
  }, [completed, currentQuestion]);

  const handleSidebarNavigate = (item) => {
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
    try {
      const response = await submitInterviewAnswer(sessionMetadata.apiBasePath || "/api/interview/tech", sessionId, answer.trim());
      setPendingResult({
        answeredTurnId: response?.answeredTurnId,
        answeredQuestion: currentQuestion,
        evaluation: response?.evaluation || null,
        nextQuestion: response?.nextQuestion || null,
        completed: Boolean(response?.completed),
        bookmarked: false,
      });
      setAnswer("");
      if (response?.completed) {
        setCompleted(true);
        setCurrentQuestion(null);
      }
    } catch (error) {
      setSubmitErrorMessage(error?.message || "답변 제출에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleMoveNext = () => {
    if (!pendingResult?.nextQuestion) {
      clearTechInterviewSession();
      navigate("/content/interview", { replace: true });
      return;
    }

    setCurrentQuestion(pendingResult.nextQuestion);
    setPendingResult(null);
    setCompleted(false);
  };

  const handleBookmark = async () => {
    if (!pendingResult?.answeredTurnId || pendingResult.bookmarked) {
      return;
    }

    setBookmarking(true);
    setPageErrorMessage("");
    try {
      await bookmarkInterviewTurn(
        sessionMetadata.apiBasePath || "/api/interview/tech",
        pendingResult.answeredTurnId
      );
      setPendingResult((prev) => (prev ? { ...prev, bookmarked: true } : prev));
    } catch (error) {
      setPageErrorMessage(error?.message || "질문 저장에 실패했습니다.");
    } finally {
      setBookmarking(false);
    }
  };

  if (!sessionId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white pt-[54px]">
      <ContentTopNav
        point={formatPoint(userPoint)}
        onClickCharge={() => setShowPointChargeModal(true)}
        onOpenMenu={() => setIsMobileMenuOpen(true)}
      />

      <MobileSidebarDrawer
        open={isMobileMenuOpen}
        activeKey="interview_start"
        onClose={() => setIsMobileMenuOpen(false)}
        onNavigate={handleSidebarNavigate}
        userName={userName}
        profileImageUrl={profileImageUrl}
        fallbackProfileImageUrl={tempProfileImage}
        onLogout={() => {
          setIsMobileMenuOpen(false);
          setShowLogoutModal(true);
        }}
      />

      <div className="flex min-h-[calc(100vh-54px)]">
        <div className="hidden w-[272px] shrink-0 md:block">
          <Sidebar
            activeKey="interview_start"
            onNavigate={handleSidebarNavigate}
            userName={userName}
            profileImageUrl={profileImageUrl}
            fallbackProfileImageUrl={tempProfileImage}
            onLogout={() => setShowLogoutModal(true)}
          />
        </div>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="border-b border-[#eceff4] bg-white/95 px-4 py-3 backdrop-blur sm:px-5 md:px-8">
            <div className="mx-auto flex w-full max-w-[980px] flex-wrap gap-2">
              {(sessionMetadata.selectedDocuments?.resume || sessionMetadata.selectedDocuments?.introduce || sessionMetadata.selectedDocuments?.portfolio)
                ? Object.values(sessionMetadata.selectedDocuments || {})
                    .filter(Boolean)
                    .map((label) => <QuestionMetaChip key={label} label={label} />)
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
                    <p className="text-[12px] font-semibold tracking-[0.08em] text-[#7a8190]">TECH INTERVIEW</p>
                    <h1 className="mt-2 text-[28px] font-semibold text-[#161a22] sm:text-[34px]">{currentQuestionTitle}</h1>
                    <p className="mt-2 text-[13px] leading-[1.6] text-[#5e6472]">
                      답변 제출 후 피드백과 모범 답안을 바로 확인할 수 있다.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      clearTechInterviewSession();
                      navigate("/content/interview", { replace: true });
                    }}
                    className="rounded-[12px] border border-[#d8dde7] px-3 py-2 text-[12px] text-[#4f5664]"
                  >
                    시작 화면으로
                  </button>
                </div>

                {currentQuestion ? (
                  <>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {currentQuestion.category ? <QuestionMetaChip label={currentQuestion.category} /> : null}
                      {currentQuestion.difficulty ? <QuestionMetaChip label={currentQuestion.difficulty} /> : null}
                      {currentQuestion.sourceTag ? <QuestionMetaChip label={currentQuestion.sourceTag} /> : null}
                      {(currentQuestion.tags || []).map((tag) => (
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

                        <div className="mt-4 flex justify-end">
                          <button
                            type="button"
                            onClick={handleSubmitAnswer}
                            disabled={submitting}
                            className="rounded-[14px] bg-[#171b24] px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
                          >
                            {submitting ? "제출 중..." : "답변 제출"}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : null}

                {pendingResult ? (
                  <div className="mt-5 rounded-[18px] border border-[#dfe3eb] bg-white px-5 py-6">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-[13px] font-medium text-[#7a8190]">AI 피드백</p>
                        <h2 className="mt-1 text-[24px] font-semibold text-[#171b24]">
                          점수 {pendingResult.evaluation?.score ?? 0}
                        </h2>
                      </div>
                      <button
                        type="button"
                        onClick={handleBookmark}
                        disabled={bookmarking || pendingResult.bookmarked}
                        className="rounded-[12px] border border-[#d8dde7] px-3 py-2 text-[12px] text-[#4f5664] disabled:opacity-60"
                      >
                        {pendingResult.bookmarked ? "저장 완료" : bookmarking ? "저장 중..." : "질문 저장"}
                      </button>
                    </div>

                    <div className="mt-5 grid gap-4 lg:grid-cols-2">
                      <section className="rounded-[16px] bg-[#f6f8fb] p-4">
                        <p className="text-[12px] font-semibold text-[#5d6676]">피드백</p>
                        <p className="mt-2 whitespace-pre-wrap text-[13px] leading-[1.7] text-[#252b36]">
                          {pendingResult.evaluation?.feedback || "-"}
                        </p>
                      </section>
                      <section className="rounded-[16px] bg-[#f6f8fb] p-4">
                        <p className="text-[12px] font-semibold text-[#5d6676]">모범 답안 가이드</p>
                        <p className="mt-2 whitespace-pre-wrap text-[13px] leading-[1.7] text-[#252b36]">
                          {pendingResult.evaluation?.bestPractice || "-"}
                        </p>
                      </section>
                    </div>

                    <div className="mt-5 flex justify-end">
                      <button
                        type="button"
                        onClick={handleMoveNext}
                        className="rounded-[14px] bg-[#171b24] px-4 py-2.5 text-[13px] font-semibold text-white"
                      >
                        {pendingResult.completed ? "면접 종료" : "다음 질문"}
                      </button>
                    </div>
                  </div>
                ) : null}

                {completed && !pendingResult ? (
                  <div className="mt-5 rounded-[18px] border border-[#dfe3eb] bg-white px-5 py-6">
                    <p className="text-[16px] font-medium text-[#171b24]">면접이 종료되었습니다.</p>
                    <p className="mt-2 text-[13px] leading-[1.7] text-[#5e6472]">
                      새 면접을 시작하거나 저장된 질문을 확인해 다음 연습을 이어갈 수 있다.
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
    </div>
  );
};
