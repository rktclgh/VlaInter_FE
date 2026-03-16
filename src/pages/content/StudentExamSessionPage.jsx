import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ContentTopNav } from "../../components/ContentTopNav";
import { MobileSidebarDrawer } from "../../components/MobileSidebarDrawer";
import { PointChargeModal } from "../../components/PointChargeModal";
import { PointChargeSuccessModal } from "../../components/PointChargeSuccessModal";
import { Sidebar } from "../../components/Sidebar";
import { STUDENT_MENU_SECTIONS } from "../../components/sidebarMenuItems";
import tempProfileImage from "../../assets/icon/temp.png";
import { logout } from "../../lib/authApi";
import { consumePointChargeSuccessResult } from "../../lib/pointChargeFlow";
import { formatPoint, parsePoint } from "../../lib/profileUtils";
import {
  getMyProfile,
  getMyProfileImageUrl,
  getStudentExamSessionDetail,
  submitStudentExamAnswers,
} from "../../lib/userApi";

export const StudentExamSessionPage = () => {
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [userName, setUserName] = useState("사용자");
  const [userPoint, setUserPoint] = useState(0);
  const [profileImageUrl, setProfileImageUrl] = useState(tempProfileImage);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showPointChargeModal, setShowPointChargeModal] = useState(false);
  const [showPointChargeSuccessModal, setShowPointChargeSuccessModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    const charged = consumePointChargeSuccessResult();
    if (!charged) return;
    setUserPoint(parsePoint(charged?.currentPoint));
    setShowPointChargeSuccessModal(true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [profilePayload, sessionPayload] = await Promise.all([
          getMyProfile(),
          getStudentExamSessionDetail(sessionId),
        ]);
        if (cancelled) return;
        setUserName(String(profilePayload?.name || "사용자"));
        setUserPoint(parsePoint(profilePayload?.point));
        setProfileImageUrl(getMyProfileImageUrl());
        setSession(sessionPayload);
        const initialAnswers = Object.fromEntries(
          (Array.isArray(sessionPayload?.questions) ? sessionPayload.questions : []).map((question) => [
            question.questionId,
            String(question.answerText || ""),
          ])
        );
        setAnswers(initialAnswers);
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error?.message || "모의고사 세션을 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const pointSummaryText = useMemo(() => formatPoint(userPoint), [userPoint]);

  const handleSubmit = async () => {
    if (submitting || !session) return;
    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const payload = await submitStudentExamAnswers(
        session.sessionId,
        (Array.isArray(session.questions) ? session.questions : []).map((question) => ({
          questionId: question.questionId,
          answerText: String(answers[question.questionId] || ""),
        }))
      );
      setSession(payload);
      setSuccessMessage("답안이 제출되고 채점 결과가 저장되었습니다.");
    } catch (error) {
      setErrorMessage(error?.message || "답안 제출에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const requestLogout = () => setShowLogoutModal(true);

  const confirmLogout = async () => {
    try {
      await logout();
    } catch {
      // ignore
    } finally {
      setShowLogoutModal(false);
      navigate("/login", { replace: true });
    }
  };

  const onSelectSidebar = (item) => {
    setIsMobileMenuOpen(false);
    if (item?.path) navigate(item.path);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-6 text-center">
        <p className="text-[14px] text-[#555]">모의고사 세션을 준비하는 중입니다...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-6 text-center">
        <div>
          <p className="text-[15px] font-medium text-[#111827]">세션을 불러오지 못했습니다.</p>
          {errorMessage ? <p className="mt-2 text-[13px] text-[#d84a4a]">{errorMessage}</p> : null}
          <button
            type="button"
            onClick={() => navigate("/content/student")}
            className="mt-4 rounded-[12px] bg-[#111827] px-4 py-2.5 text-[13px] font-semibold text-white"
          >
            학생 홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen overflow-x-hidden bg-white pt-[3.75rem]">
        <ContentTopNav
          point={pointSummaryText}
          onClickCharge={() => setShowPointChargeModal(true)}
          onOpenMenu={() => setIsMobileMenuOpen(true)}
        />
        <MobileSidebarDrawer
          open={isMobileMenuOpen}
          activeKey="student_home"
          onClose={() => setIsMobileMenuOpen(false)}
          onNavigate={onSelectSidebar}
          userName={userName}
          profileImageUrl={profileImageUrl}
          point={pointSummaryText}
          onClickCharge={() => setShowPointChargeModal(true)}
          onLogout={() => {
            setIsMobileMenuOpen(false);
            requestLogout();
          }}
          menuSectionsOverride={STUDENT_MENU_SECTIONS}
        />
        <div className="flex min-h-[calc(100vh-3.75rem)]">
          <div className="hidden w-[17rem] shrink-0 md:block">
            <Sidebar
              activeKey="student_home"
              onNavigate={onSelectSidebar}
              userName={userName}
              profileImageUrl={profileImageUrl}
              onLogout={requestLogout}
              menuSectionsOverride={STUDENT_MENU_SECTIONS}
            />
          </div>
          <main className="flex min-w-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto px-4 pb-6 pt-6 sm:px-5 md:px-8 md:pt-10">
              <div className="mx-auto w-full max-w-[1080px] rounded-[28px] border border-[#e4e6ee] bg-white px-6 py-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:px-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-[12px] font-semibold tracking-[0.12em] text-[#7c8497]">STUDENT EXAM</p>
                    <h1 className="mt-3 text-[30px] font-semibold text-[#111827] sm:text-[36px]">{session.title}</h1>
                    <p className="mt-3 text-[14px] leading-[1.8] text-[#5b6475]">
                      {session.questionCount}문항 · 자료 {session.sourceMaterialCount}개 · 상태 {session.status}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate("/content/student")}
                    className="rounded-[14px] border border-[#d1d5db] px-4 py-2.5 text-[13px] font-semibold text-[#374151]"
                  >
                    학생 홈으로
                  </button>
                </div>

                <div className="mt-6 rounded-[18px] border border-[#e6e9f2] bg-[#fbfcfe] p-4 text-[13px] text-[#4b5563]">
                  <p>제출 문항 수: {session.answeredCount}/{session.questionCount}</p>
                  <p className="mt-1">총점: {session.totalScore ?? "-"}점</p>
                  <p className="mt-1">제출 시각: {session.submittedAt ? new Date(session.submittedAt).toLocaleString("ko-KR") : "미제출"}</p>
                </div>

                {successMessage ? <p className="mt-4 text-[13px] text-[#1f8f55]">{successMessage}</p> : null}
                {errorMessage ? <p className="mt-4 text-[13px] text-[#d84a4a]">{errorMessage}</p> : null}

                <div className="mt-6 space-y-4">
                  {(Array.isArray(session.questions) ? session.questions : []).map((question) => (
                    <section key={question.questionId} className="rounded-[20px] border border-[#e6e9f2] bg-white p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[12px] font-semibold tracking-[0.08em] text-[#7c8497]">
                            QUESTION {question.questionOrder}
                          </p>
                          <h2 className="mt-2 text-[18px] font-semibold text-[#111827]">{question.questionText}</h2>
                        </div>
                        <div className="text-right text-[12px] text-[#7c8497]">
                          <p>점수: {question.score ?? "-"}</p>
                          <p className="mt-1">{question.isCorrect == null ? "미채점" : question.isCorrect ? "정답권" : "보강 필요"}</p>
                        </div>
                      </div>
                      <textarea
                        value={answers[question.questionId] || ""}
                        onChange={(event) => {
                          const value = event.target.value;
                          setAnswers((prev) => ({ ...prev, [question.questionId]: value }));
                        }}
                        className="mt-4 min-h-[140px] w-full rounded-[14px] border border-[#d7dbe7] px-4 py-3 text-[14px] leading-[1.7] text-[#111827]"
                        placeholder="여기에 답안을 작성하세요."
                      />
                      {question.feedback ? (
                        <div className="mt-3 rounded-[14px] border border-[#ecf2ff] bg-[#f8fbff] px-4 py-3 text-[13px] leading-[1.7] text-[#45607c]">
                          {question.feedback}
                        </div>
                      ) : null}
                    </section>
                  ))}
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleSubmit}
                    className="rounded-[14px] bg-[#111827] px-5 py-3 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {submitting ? "제출 중..." : "답안 제출 및 채점"}
                  </button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      {showPointChargeModal ? (
        <PointChargeModal
          onClose={() => setShowPointChargeModal(false)}
          onCharged={(result) => {
            setUserPoint(parsePoint(result?.currentPoint));
            setShowPointChargeSuccessModal(true);
          }}
        />
      ) : null}
      {showPointChargeSuccessModal ? (
        <PointChargeSuccessModal onClose={() => setShowPointChargeSuccessModal(false)} />
      ) : null}
      {showLogoutModal ? (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/35 px-4">
          <div className="w-full max-w-[420px] rounded-[16px] border border-[#d9d9d9] bg-white p-5">
            <p className="text-[15px] font-medium text-[#252525]">
              정말 로그아웃 하시겠습니까?
              <br />
              종료하지 않은 작업은 저장되지 않을 수 있습니다.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="rounded-[10px] border border-[#d6d6d6] px-3 py-1.5 text-[12px] text-[#666]"
              >
                취소
              </button>
              <button
                type="button"
                onClick={confirmLogout}
                className="rounded-[10px] border border-[#1f1f1f] bg-[#1f1f1f] px-3 py-1.5 text-[12px] text-white"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};
