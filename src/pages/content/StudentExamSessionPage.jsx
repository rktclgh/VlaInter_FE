import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { AcademicProfileRequiredModal } from "../../components/AcademicProfileRequiredModal";
import { ContentTopNav } from "../../components/ContentTopNav";
import { MobileSidebarDrawer } from "../../components/MobileSidebarDrawer";
import { PointChargeModal } from "../../components/PointChargeModal";
import { PointChargeSuccessModal } from "../../components/PointChargeSuccessModal";
import { ProtectedImage } from "../../components/ProtectedImage";
import { Sidebar } from "../../components/Sidebar";
import { StarIcons } from "../../components/DifficultyStars";
import { useToast } from "../../hooks/useToast";
import tempProfileImage from "../../assets/icon/temp.png";
import { logout } from "../../lib/authApi";
import { getInterviewLanguageLabel } from "../../lib/interviewLanguage";
import { consumePointChargeSuccessResult } from "../../lib/pointChargeFlow";
import { extractProfile, formatPoint, parsePoint } from "../../lib/profileUtils";
import { hasAcademicProfile } from "../../lib/serviceMode";
import { getStudentMyMenuItems, getStudentSidebarSections } from "../../lib/studentNavigation";
import {
  createStudentWrongAnswerSet,
  deleteStudentExamSession,
  getMyProfile,
  getMyProfileImageUrl,
  getMyStudentCourses,
  getStudentExamSessionDetail,
  submitStudentExamAnswers,
} from "../../lib/userApi";

const DeleteSessionConfirmModal = ({ open, pending, onCancel, onConfirm }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/45 px-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-[420px] rounded-[24px] border border-[#dfe3ee] bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.22)]"
      >
        <h2 className="text-[22px] font-semibold text-[#111827]">모의고사 삭제</h2>
        <p className="mt-3 text-[14px] leading-[1.8] text-[#5b6475]">
          정말 모의고사 세션을 삭제하시겠습니까?
        </p>
        <p className="mt-3 text-[12px] leading-[1.7] text-[#8a93a5]">
          세션 문항, 제출 답안, 저장된 오답노트 기록까지 함께 삭제됩니다.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="rounded-[12px] border border-[#d1d5db] px-4 py-2.5 text-[13px] font-semibold text-[#4b5563] disabled:opacity-60"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="rounded-[12px] bg-[#dc2626] px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
          >
            {pending ? "삭제 중..." : "삭제"}
          </button>
        </div>
      </div>
    </div>
  );
};

const examModeLabel = (mode) => {
  switch (mode) {
    case "FAST_REVIEW":
      return "패스트 모의고사";
    case "PAST_EXAM":
      return "족보형";
    case "PAST_EXAM_PRACTICE":
      return "족보 그대로 연습";
    case "WRONG_ANSWER_RETEST":
      return "오답노트 재시험";
    default:
      return "모의고사";
  }
};

const examStyleLabel = (style) => {
  switch (style) {
    case "DEFINITION":
      return "정의형";
    case "CODING":
      return "코딩형";
    case "CALCULATION":
      return "계산형";
    case "ESSAY":
      return "서술형";
    case "PRACTICAL":
      return "실습형";
    default:
      return style || "기타";
  }
};

const questionStatusLabel = (question) => {
  if (question?.score == null) return "미채점";
  if (question?.isCorrect) return "통과";
  if ((question?.score || 0) > 0) return "부분점수";
  return "보강 필요";
};

const questionStatusTone = (question) => {
  if (question?.score == null) return "bg-[#f3f4f6] text-[#4b5563]";
  if (question?.isCorrect) return "bg-[#e8fff1] text-[#14804a]";
  if ((question?.score || 0) > 0) return "bg-[#fff7ed] text-[#c2410c]";
  return "bg-[#fff1f1] text-[#dc2626]";
};

const visualAssetTypeLabel = (assetType) => {
  switch (assetType) {
    case "PDF_PAGE_RENDER":
      return "PDF 페이지";
    case "PPT_SLIDE_RENDER":
      return "PPT 슬라이드";
    case "DOCX_EMBEDDED_IMAGE":
      return "문서 이미지";
    case "ORIGINAL_IMAGE":
      return "원본 이미지";
    default:
      return "원문 이미지";
  }
};

const normalizeReferenceExample = (value) => {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "";
  if (normalized.toLowerCase() === "null") return "";
  return normalized;
};

const VisualAssetModal = ({ open, title, assets, onClose }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/60 px-4 py-8" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[92vh] w-full max-w-[1080px] overflow-hidden rounded-[28px] border border-[#d7dbe7] bg-white shadow-[0_30px_90px_rgba(15,23,42,0.35)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#e5e7eb] px-6 py-4">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.08em] text-[#7c8497]">SOURCE ASSETS</p>
            <h2 className="mt-1 text-[20px] font-semibold text-[#111827]">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[12px] border border-[#d1d5db] px-3 py-2 text-[12px] font-semibold text-[#4b5563]"
          >
            닫기
          </button>
        </div>
        <div className="max-h-[calc(92vh-84px)] overflow-y-auto px-6 py-6">
          <div className="grid gap-5 md:grid-cols-2">
            {(assets || []).map((asset) => (
              <div key={asset.assetId} className="overflow-hidden rounded-[20px] border border-[#e5e7eb] bg-[#fcfcfd]">
                <div className="flex items-center justify-between gap-3 border-b border-[#edf0f5] px-4 py-3">
                  <div>
                    <p className="text-[13px] font-semibold text-[#111827]">{asset.label}</p>
                    <p className="mt-1 text-[11px] text-[#7c8497]">
                      {visualAssetTypeLabel(asset.assetType)}
                      {asset.pageNo ? ` · 페이지 ${asset.pageNo}` : ""}
                      {asset.slideNo ? ` · 슬라이드 ${asset.slideNo}` : ""}
                    </p>
                  </div>
                  <a
                    href={asset.downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-[10px] border border-[#d1d5db] px-3 py-2 text-[11px] font-semibold text-[#374151]"
                  >
                    새 창으로
                  </a>
                </div>
                <ProtectedImage
                  src={asset.downloadUrl}
                  alt={asset.label}
                  className="max-h-[520px] w-full bg-[#f8fafc] object-contain"
                  placeholderClassName="min-h-[240px] w-full bg-[#f8fafc]"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const buildInitialSelectedQuestionIds = (questions) => {
  const normalizedQuestions = Array.isArray(questions) ? questions : [];
  const preferred = normalizedQuestions
    .filter((question) => (question?.score ?? 0) < (question?.maxScore ?? 0))
    .map((question) => question.questionId);
  if (preferred.length > 0) return preferred;
  return normalizedQuestions.slice(0, 3).map((question) => question.questionId);
};

export const StudentExamSessionPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { sessionId } = useParams();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [answers, setAnswers] = useState({});
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([]);
  const [wrongAnswerSetTitle, setWrongAnswerSetTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [savingWrongAnswerSet, setSavingWrongAnswerSet] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [userName, setUserName] = useState("사용자");
  const [isAdmin, setIsAdmin] = useState(false);
  const [userPoint, setUserPoint] = useState(0);
  const [profileImageUrl, setProfileImageUrl] = useState(tempProfileImage);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showPointChargeModal, setShowPointChargeModal] = useState(false);
  const [showPointChargeSuccessModal, setShowPointChargeSuccessModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [courses, setCourses] = useState([]);
  const [sourceAssetViewer, setSourceAssetViewer] = useState(null);
  const [requiresAcademicProfile, setRequiresAcademicProfile] = useState(false);

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
        const profilePayload = await getMyProfile();
        if (cancelled) return;
        const profile = extractProfile(profilePayload);
        setUserName(String(profile?.name || "사용자"));
        setIsAdmin(profile?.role === "ADMIN");
        setUserPoint(parsePoint(profile?.point));
        setProfileImageUrl(getMyProfileImageUrl());
        const profileReady = hasAcademicProfile(profile);
        setRequiresAcademicProfile(!profileReady);
        if (!profileReady) {
          setCourses([]);
          setSession(null);
          setAnswers({});
          return;
        }
        const [sessionPayload, coursesPayload] = await Promise.all([
          getStudentExamSessionDetail(sessionId),
          getMyStudentCourses(),
        ]);
        if (cancelled) return;
        setSession(sessionPayload);
        setCourses(Array.isArray(coursesPayload) ? coursesPayload : []);
        setAnswers(
          Object.fromEntries(
            (Array.isArray(sessionPayload?.questions) ? sessionPayload.questions : []).map((question) => [
              question.questionId,
              String(question.answerText || ""),
            ])
          )
        );
        setActiveQuestionIndex(0);
        setWrongAnswerSetTitle(`${sessionPayload?.title || "모의고사"} 오답노트`);
        if (sessionPayload?.status === "SUBMITTED") {
          setSelectedQuestionIds(buildInitialSelectedQuestionIds(sessionPayload?.questions));
        }
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

  const questions = useMemo(() => (Array.isArray(session?.questions) ? session.questions : []), [session?.questions]);
  const activeQuestion = questions[activeQuestionIndex] || null;
  const activeReferenceExample = normalizeReferenceExample(activeQuestion?.referenceExample);
  const isLastQuestion = activeQuestionIndex >= questions.length - 1;
  const pointSummaryText = useMemo(() => formatPoint(userPoint), [userPoint]);
  const studentMenuSections = useMemo(() => getStudentSidebarSections(courses, { isAdmin }), [courses, isAdmin]);
  const studentMyMenuItems = useMemo(() => getStudentMyMenuItems(), []);
  const sidebarActiveKey = useMemo(() => {
    if (Number.isFinite(Number(session?.courseId))) {
      return `student_course_${session.courseId}`;
    }
    if (location.pathname.startsWith("/content/student/mypage")) {
      return "student_mypage";
    }
    return "student_home";
  }, [location.pathname, session?.courseId]);
  const answeredCount = useMemo(
    () => Object.values(answers).filter((value) => String(value || "").trim()).length,
    [answers]
  );

  const handleSubmit = async () => {
    if (submitting || !session) return;
    setSubmitting(true);
    setErrorMessage("");
    try {
      const payload = await submitStudentExamAnswers(
        session.sessionId,
        questions.map((question) => ({
          questionId: question.questionId,
          answerText: String(answers[question.questionId] || ""),
        }))
      );
      setSession(payload);
      setSelectedQuestionIds(buildInitialSelectedQuestionIds(payload?.questions));
      setActiveQuestionIndex(0);
      showToast("답안이 제출되고 채점 결과가 저장되었습니다.", { type: "success" });
    } catch (error) {
      showToast(error?.message || "답안 제출에 실패했습니다.", { type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveWrongAnswerSet = async () => {
    if (!session || savingWrongAnswerSet) return;
    if (selectedQuestionIds.length === 0) {
      showToast("오답노트로 저장할 문제를 1개 이상 선택해 주세요.", { type: "error" });
      return;
    }
    setSavingWrongAnswerSet(true);
    setErrorMessage("");
    try {
      const payload = await createStudentWrongAnswerSet(session.sessionId, {
        title: wrongAnswerSetTitle,
        questionIds: selectedQuestionIds,
      });
      showToast(`오답노트가 저장되었습니다. (${payload.questionCount}문항)`, { type: "success" });
    } catch (error) {
      showToast(error?.message || "오답노트 저장에 실패했습니다.", { type: "error" });
    } finally {
      setSavingWrongAnswerSet(false);
    }
  };

  const handleDeleteSession = async () => {
    if (!session || deleting) return;
    setDeleting(true);
    setErrorMessage("");
    try {
      await deleteStudentExamSession(session.sessionId);
      navigate("/content/student", { replace: true });
    } catch (error) {
      showToast(error?.message || "모의고사 세션 삭제에 실패했습니다.", { type: "error" });
      setDeleting(false);
      setShowDeleteModal(false);
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

  const toggleSelectedQuestion = (questionId) => {
    setSelectedQuestionIds((prev) => (
      prev.includes(questionId)
        ? prev.filter((item) => item !== questionId)
        : [...prev, questionId]
    ));
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-6 text-center">
        <p className="text-[14px] text-[#555]">모의고사 세션을 준비하는 중입니다...</p>
      </div>
    );
  }

  const pageContent = !session ? (
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
  ) : (
    <div className="min-h-screen overflow-x-hidden bg-white pt-[3.75rem]">
        <ContentTopNav
          point={pointSummaryText}
          onClickCharge={() => setShowPointChargeModal(true)}
          onOpenMenu={() => setIsMobileMenuOpen(true)}
        />
        <MobileSidebarDrawer
          open={isMobileMenuOpen}
          activeKey={sidebarActiveKey}
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
          menuSectionsOverride={studentMenuSections}
          myMenuItemsOverride={studentMyMenuItems}
        />
        <div className="flex min-h-[calc(100vh-3.75rem)]">
          <div className="hidden w-[17rem] shrink-0 md:block">
            <Sidebar
              activeKey={sidebarActiveKey}
              onNavigate={onSelectSidebar}
              userName={userName}
              profileImageUrl={profileImageUrl}
              onLogout={requestLogout}
              menuSectionsOverride={studentMenuSections}
              myMenuItemsOverride={studentMyMenuItems}
            />
          </div>
          <main className="flex min-w-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto px-4 pb-6 pt-6 sm:px-5 md:px-8 md:pt-10">
              <div className="mx-auto w-full max-w-[1080px] space-y-5">
                <section className="rounded-[28px] border border-[#e4e6ee] bg-white px-6 py-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:px-8">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-[12px] font-semibold tracking-[0.12em] text-[#7c8497]">STUDENT EXAM</p>
                      <h1 className="mt-3 text-[30px] font-semibold text-[#111827] sm:text-[36px]">{session.title}</h1>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-[#eef2ff] px-3 py-1 text-[11px] font-semibold text-[#4338ca]">
                          {examModeLabel(session.generationMode)}
                        </span>
                        <span className="rounded-full bg-[#ecfeff] px-3 py-1 text-[11px] font-semibold text-[#0f766e]">
                          {getInterviewLanguageLabel(session.language)}
                        </span>
                        {session.difficultyLevel ? (
                          <span className="inline-flex items-center gap-2 rounded-full bg-[#fff8e8] px-3 py-1 text-[11px] font-semibold text-[#8a5a00]">
                            <StarIcons rating={session.difficultyLevel} sizeClass="text-[11px]" />
                            {session.difficultyLevel} / 5
                          </span>
                        ) : null}
                        {(session.questionStyles || []).map((style) => (
                          <span
                            key={`${session.sessionId}-${style}`}
                            className="rounded-full bg-[#f3f4f6] px-3 py-1 text-[11px] font-semibold text-[#4b5563]"
                          >
                            {examStyleLabel(style)}
                          </span>
                        ))}
                      </div>
                      <p className="mt-3 text-[14px] leading-[1.8] text-[#5b6475]">
                        {session.questionCount}문항 · 만점 {session.maxScore}점 · 강의자료 {session.sourceMaterialCount}개 반영
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/content/student/courses/${session.courseId}`)}
                        className="rounded-[14px] border border-[#d1d5db] px-4 py-2.5 text-[13px] font-semibold text-[#374151]"
                      >
                        과목 페이지로
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDeleteModal(true)}
                        className="rounded-[14px] border border-[#fecaca] bg-[#fff5f5] px-4 py-2.5 text-[13px] font-semibold text-[#dc2626]"
                      >
                        모의고사 삭제
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 md:grid-cols-4">
                    <div className="rounded-[18px] border border-[#e6e9f2] bg-[#fbfcfe] p-4">
                      <p className="text-[12px] text-[#7c8497]">풀이 진행</p>
                      <p className="mt-2 text-[24px] font-semibold text-[#111827]">{answeredCount}/{session.questionCount}</p>
                    </div>
                    <div className="rounded-[18px] border border-[#e6e9f2] bg-[#fbfcfe] p-4">
                      <p className="text-[12px] text-[#7c8497]">현재 상태</p>
                      <p className="mt-2 text-[24px] font-semibold text-[#111827]">{session.status}</p>
                    </div>
                    <div className="rounded-[18px] border border-[#e6e9f2] bg-[#fbfcfe] p-4">
                      <p className="text-[12px] text-[#7c8497]">현재 점수</p>
                      <p className="mt-2 text-[24px] font-semibold text-[#111827]">
                        {session.totalScore ?? 0}<span className="text-[16px] text-[#7c8497]"> / {session.maxScore}</span>
                      </p>
                    </div>
                    <div className="rounded-[18px] border border-[#e6e9f2] bg-[#fbfcfe] p-4">
                      <p className="text-[12px] text-[#7c8497]">제출 시각</p>
                      <p className="mt-2 text-[13px] font-semibold leading-[1.7] text-[#111827]">
                        {session.submittedAt ? new Date(session.submittedAt).toLocaleString("ko-KR") : "미제출"}
                      </p>
                    </div>
                  </div>

                  {errorMessage ? <p className="mt-4 text-[13px] text-[#d84a4a]">{errorMessage}</p> : null}
                </section>

                <section className="rounded-[24px] border border-[#e4e6ee] bg-white px-6 py-6 shadow-[0_24px_80px_rgba(15,23,42,0.06)] sm:px-8">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[18px] font-semibold text-[#111827]">문제 네비게이션</p>
                      <p className="mt-1 text-[12px] text-[#6b7280]">
                        한 문제씩 풀고 이전 문제로 돌아갈 수 있습니다.
                      </p>
                    </div>
                    <div className="text-[12px] text-[#6b7280]">
                      현재 문제 {activeQuestionIndex + 1} / {questions.length}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {questions.map((question, index) => {
                      const active = index === activeQuestionIndex;
                      const answered = String(answers[question.questionId] || "").trim().length > 0;
                      return (
                        <button
                          key={question.questionId}
                          type="button"
                          onClick={() => setActiveQuestionIndex(index)}
                          className={`min-w-[44px] rounded-[12px] border px-3 py-2 text-[12px] font-semibold transition ${
                            active
                              ? "border-[#111827] bg-[#111827] text-white"
                              : answered
                                ? "border-[#dbeafe] bg-[#eff6ff] text-[#1d4ed8]"
                                : "border-[#d1d5db] bg-white text-[#4b5563]"
                          }`}
                        >
                          {index + 1}
                        </button>
                      );
                    })}
                  </div>
                </section>

                {activeQuestion ? (
                  <section className="rounded-[24px] border border-[#e4e6ee] bg-white px-6 py-6 shadow-[0_24px_80px_rgba(15,23,42,0.06)] sm:px-8">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[12px] font-semibold tracking-[0.08em] text-[#7c8497]">
                          QUESTION {activeQuestion.questionOrder}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="rounded-full bg-[#f3f4f6] px-2.5 py-1 text-[11px] font-semibold text-[#4b5563]">
                            {examStyleLabel(activeQuestion.questionStyle)}
                          </span>
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${questionStatusTone(activeQuestion)}`}>
                            {questionStatusLabel(activeQuestion)}
                          </span>
                          <span className="rounded-full bg-[#eef2ff] px-2.5 py-1 text-[11px] font-semibold text-[#4338ca]">
                            배점 {activeQuestion.maxScore}점
                          </span>
                        </div>
                      </div>
                      {session.status === "SUBMITTED" ? (
                        <label className="inline-flex items-center gap-2 rounded-[12px] border border-[#d1d5db] px-3 py-2 text-[12px] font-semibold text-[#374151]">
                          <input
                            type="checkbox"
                            checked={selectedQuestionIds.includes(activeQuestion.questionId)}
                            onChange={() => toggleSelectedQuestion(activeQuestion.questionId)}
                          />
                          오답노트에 저장
                        </label>
                      ) : null}
                    </div>

                    <div className="mt-5 rounded-[20px] border border-[#e6e9f2] bg-[#fbfcfe] p-5">
                      <p className="whitespace-pre-wrap text-[18px] leading-[1.9] text-[#111827]">
                        {activeQuestion.questionText}
                      </p>
                      {activeReferenceExample ? (
                        <div className="mt-4 rounded-[16px] border border-[#e6e9f2] bg-white px-4 py-4">
                          <p className="text-[12px] font-semibold text-[#5d6676]">예시 / 참고 형식</p>
                          <p className="mt-2 whitespace-pre-wrap text-[13px] leading-[1.8] text-[#374151]">
                            {activeReferenceExample}
                          </p>
                        </div>
                      ) : null}
                      {activeQuestion.sourceFileName || (Array.isArray(activeQuestion.sourceVisualAssets) && activeQuestion.sourceVisualAssets.length > 0) ? (
                        <div className="mt-4 rounded-[16px] border border-[#e6e9f2] bg-white px-4 py-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-[12px] font-semibold text-[#5d6676]">원문 족보 출처</p>
                              {activeQuestion.sourceFileName ? (
                                <p className="mt-2 text-[13px] font-semibold text-[#111827]">{activeQuestion.sourceFileName}</p>
                              ) : null}
                              <p className="mt-1 text-[12px] leading-[1.7] text-[#6b7280]">
                                원문 이미지가 있으면 문제 문맥과 도표를 직접 확인할 수 있습니다.
                              </p>
                            </div>
                            {Array.isArray(activeQuestion.sourceVisualAssets) && activeQuestion.sourceVisualAssets.length > 0 ? (
                              <button
                                type="button"
                                onClick={() => setSourceAssetViewer({
                                  title: activeQuestion.sourceFileName || `문제 ${activeQuestion.questionOrder} 원문`,
                                  assets: activeQuestion.sourceVisualAssets,
                                })}
                                className="rounded-[10px] border border-[#d1d5db] px-3 py-2 text-[11px] font-semibold text-[#374151]"
                              >
                                원문 이미지 보기
                              </button>
                            ) : null}
                          </div>
                          {Array.isArray(activeQuestion.sourceVisualAssets) && activeQuestion.sourceVisualAssets.length > 0 ? (
                            <div className="mt-3 grid grid-cols-3 gap-2">
                              {activeQuestion.sourceVisualAssets.slice(0, 3).map((asset) => (
                                <button
                                  key={asset.assetId}
                                  type="button"
                                  onClick={() => setSourceAssetViewer({
                                    title: activeQuestion.sourceFileName || `문제 ${activeQuestion.questionOrder} 원문`,
                                    assets: activeQuestion.sourceVisualAssets,
                                  })}
                                  className="overflow-hidden rounded-[12px] border border-[#e5e7eb] bg-[#f8fafc]"
                                >
                                  <ProtectedImage
                                    src={asset.downloadUrl}
                                    alt={asset.label}
                                    className="h-24 w-full object-cover"
                                    placeholderClassName="h-24 w-full bg-[#eef2f7]"
                                  />
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    {session.status === "SUBMITTED" ? (
                      <div className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                        <div className="rounded-[18px] border border-[#e6e9f2] bg-white p-5">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-[14px] font-semibold text-[#111827]">내 답안</p>
                            <p className="text-[13px] font-semibold text-[#111827]">
                              {activeQuestion.score ?? 0} / {activeQuestion.maxScore}점
                            </p>
                          </div>
                          <p className="mt-3 whitespace-pre-wrap text-[14px] leading-[1.8] text-[#374151]">
                            {activeQuestion.answerText || "제출한 답안이 없습니다."}
                          </p>
                          {activeQuestion.feedback ? (
                            <div className="mt-4 rounded-[14px] border border-[#ecf2ff] bg-[#f8fbff] px-4 py-3 text-[13px] leading-[1.8] text-[#45607c]">
                              {activeQuestion.feedback}
                            </div>
                          ) : null}
                        </div>
                        <div className="space-y-4">
                          <div className="rounded-[18px] border border-[#e6e9f2] bg-white p-5">
                            <p className="text-[14px] font-semibold text-[#111827]">정답 / 모범해설</p>
                            <p className="mt-3 whitespace-pre-wrap text-[13px] leading-[1.8] text-[#374151]">
                              {activeQuestion.canonicalAnswer}
                            </p>
                          </div>
                          <div className="rounded-[18px] border border-[#e6e9f2] bg-white p-5">
                            <p className="text-[14px] font-semibold text-[#111827]">채점 기준</p>
                            <p className="mt-3 whitespace-pre-wrap text-[13px] leading-[1.8] text-[#374151]">
                              {activeQuestion.gradingCriteria}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-5">
                        <label className="block">
                          <span className="mb-2 block text-[13px] font-medium text-[#495061]">답안 작성</span>
                          <textarea
                            value={answers[activeQuestion.questionId] || ""}
                            onChange={(event) => {
                              const value = event.target.value;
                              setAnswers((prev) => ({ ...prev, [activeQuestion.questionId]: value }));
                            }}
                            className="min-h-[240px] w-full rounded-[18px] border border-[#dfe3eb] bg-white px-4 py-4 text-[14px] leading-[1.8] text-[#111827]"
                            placeholder="문제 해결 과정, 핵심 개념, 계산식, 코드/명령어, 결론을 구체적으로 작성하세요."
                          />
                        </label>
                      </div>
                    )}

                    <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveQuestionIndex((prev) => Math.max(0, prev - 1))}
                          disabled={activeQuestionIndex === 0}
                          className="rounded-[12px] border border-[#d1d5db] px-4 py-2.5 text-[13px] font-semibold text-[#374151] disabled:opacity-50"
                        >
                          이전 문제
                        </button>
                        {session.status === "SUBMITTED" || !isLastQuestion ? (
                          <button
                            type="button"
                            onClick={() => setActiveQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                            disabled={activeQuestionIndex >= questions.length - 1}
                            className="rounded-[12px] border border-[#d1d5db] px-4 py-2.5 text-[13px] font-semibold text-[#374151] disabled:opacity-50"
                          >
                            다음 문제
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={submitting}
                            onClick={handleSubmit}
                            className="rounded-[12px] bg-[#111827] px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-55"
                          >
                            {submitting ? "제출 및 채점 중..." : "답안 제출 및 채점"}
                          </button>
                        )}
                      </div>

                      {session.status === "SUBMITTED" ? (
                        <div className="text-[12px] text-[#6b7280]">
                          선택한 문제 {selectedQuestionIds.length}개
                        </div>
                      ) : (
                        <div className="text-[12px] text-[#6b7280]">
                          {isLastQuestion ? "마지막 문제입니다. 제출 후 채점이 진행됩니다." : "다음 문제로 이동하면서 계속 답안을 작성할 수 있습니다."}
                        </div>
                      )}
                    </div>
                  </section>
                ) : null}

                {session.status === "SUBMITTED" ? (
                  <section className="rounded-[24px] border border-[#e4e6ee] bg-white px-6 py-6 shadow-[0_24px_80px_rgba(15,23,42,0.06)] sm:px-8">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-[18px] font-semibold text-[#111827]">오답노트 저장</p>
                        <p className="mt-1 text-[12px] text-[#6b7280]">
                          저장하고 싶은 문제를 선택해 새 오답노트 세트로 묶을 수 있습니다.
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={savingWrongAnswerSet}
                        onClick={handleSaveWrongAnswerSet}
                        className="rounded-[14px] bg-[#111827] px-5 py-3 text-[13px] font-semibold text-white disabled:opacity-55"
                      >
                        {savingWrongAnswerSet ? "저장 중..." : "오답노트 저장"}
                      </button>
                    </div>
                    <div className="mt-4">
                      <label className="block">
                        <span className="mb-2 block text-[12px] font-semibold text-[#5d6676]">세트 제목</span>
                        <input
                          type="text"
                          value={wrongAnswerSetTitle}
                          onChange={(event) => setWrongAnswerSetTitle(event.target.value)}
                          className="w-full rounded-[14px] border border-[#dfe3eb] px-4 py-3 text-[14px] text-[#111827]"
                          placeholder="예: 중간고사 1차 오답노트"
                        />
                      </label>
                    </div>
                  </section>
                ) : null}
              </div>
            </div>
          </main>
        </div>
      </div>
  );

  return (
    <>
      {pageContent}
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
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/35 px-4">
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
      <DeleteSessionConfirmModal
        open={showDeleteModal}
        pending={deleting}
        onCancel={() => {
          if (deleting) return;
          setShowDeleteModal(false);
        }}
        onConfirm={() => void handleDeleteSession()}
      />
      <AcademicProfileRequiredModal
        open={requiresAcademicProfile}
        onMoveToMyPage={() => navigate("/content/student/mypage")}
      />
      <VisualAssetModal
        open={Boolean(sourceAssetViewer)}
        title={sourceAssetViewer?.title || "원문 이미지"}
        assets={sourceAssetViewer?.assets || []}
        onClose={() => setSourceAssetViewer(null)}
      />
    </>
  );
};
