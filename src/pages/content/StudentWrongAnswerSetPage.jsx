import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ContentTopNav } from "../../components/ContentTopNav";
import { MobileSidebarDrawer } from "../../components/MobileSidebarDrawer";
import { PointChargeModal } from "../../components/PointChargeModal";
import { PointChargeSuccessModal } from "../../components/PointChargeSuccessModal";
import { Sidebar } from "../../components/Sidebar";
import tempProfileImage from "../../assets/icon/temp.png";
import { logout } from "../../lib/authApi";
import { consumePointChargeSuccessResult } from "../../lib/pointChargeFlow";
import { formatPoint, parsePoint } from "../../lib/profileUtils";
import { getStudentMyMenuItems, getStudentSidebarSections } from "../../lib/studentNavigation";
import {
  createStudentWrongAnswerRetest,
  getMyProfile,
  getMyProfileImageUrl,
  getMyStudentCourses,
  getStudentWrongAnswerSetDetail,
} from "../../lib/userApi";

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

export const StudentWrongAnswerSetPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setId } = useParams();
  const [loading, setLoading] = useState(true);
  const [wrongSet, setWrongSet] = useState(null);
  const [courses, setCourses] = useState([]);
  const [userName, setUserName] = useState("사용자");
  const [userPoint, setUserPoint] = useState(0);
  const [profileImageUrl, setProfileImageUrl] = useState(tempProfileImage);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showPointChargeModal, setShowPointChargeModal] = useState(false);
  const [showPointChargeSuccessModal, setShowPointChargeSuccessModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [creatingRetest, setCreatingRetest] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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
        const [profilePayload, coursesPayload, setPayload] = await Promise.all([
          getMyProfile(),
          getMyStudentCourses(),
          getStudentWrongAnswerSetDetail(setId),
        ]);
        if (cancelled) return;
        setUserName(String(profilePayload?.name || "사용자"));
        setUserPoint(parsePoint(profilePayload?.point));
        setProfileImageUrl(getMyProfileImageUrl());
        setCourses(Array.isArray(coursesPayload) ? coursesPayload : []);
        setWrongSet(setPayload);
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error?.message || "오답노트를 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [setId]);

  const pointSummaryText = useMemo(() => formatPoint(userPoint), [userPoint]);
  const studentMenuSections = useMemo(() => getStudentSidebarSections(courses), [courses]);
  const studentMyMenuItems = useMemo(() => getStudentMyMenuItems(), []);
  const sidebarActiveKey = useMemo(() => {
    if (Number.isFinite(Number(wrongSet?.courseId))) {
      return `student_course_${wrongSet.courseId}`;
    }
    if (location.pathname.startsWith("/content/student/mypage")) {
      return "student_mypage";
    }
    return "student_home";
  }, [location.pathname, wrongSet?.courseId]);

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

  const handleCreateRetest = async () => {
    if (!wrongSet || creatingRetest) return;
    setCreatingRetest(true);
    setErrorMessage("");
    try {
      const payload = await createStudentWrongAnswerRetest(wrongSet.setId);
      if (payload?.sessionId) {
        navigate(`/content/student/sessions/${payload.sessionId}`);
      }
    } catch (error) {
      setErrorMessage(error?.message || "재시험 세션 생성에 실패했습니다.");
      setCreatingRetest(false);
    }
  };

  const onSelectSidebar = (item) => {
    setIsMobileMenuOpen(false);
    if (item?.path) navigate(item.path);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-6 text-center">
        <p className="text-[14px] text-[#555]">오답노트를 불러오는 중입니다...</p>
      </div>
    );
  }

  if (!wrongSet) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-6 text-center">
        <div>
          <p className="text-[15px] font-medium text-[#111827]">오답노트를 찾을 수 없습니다.</p>
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
                      <p className="text-[12px] font-semibold tracking-[0.12em] text-[#7c8497]">WRONG ANSWER NOTE</p>
                      <h1 className="mt-3 text-[30px] font-semibold text-[#111827] sm:text-[36px]">{wrongSet.title}</h1>
                      <p className="mt-3 text-[14px] leading-[1.8] text-[#5b6475]">
                        {wrongSet.questionCount}문항 · {new Date(wrongSet.updatedAt).toLocaleString("ko-KR")}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/content/student/courses/${wrongSet.courseId}`)}
                        className="rounded-[14px] border border-[#d1d5db] px-4 py-2.5 text-[13px] font-semibold text-[#374151]"
                      >
                        과목 페이지로
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleCreateRetest()}
                        disabled={creatingRetest}
                        className="rounded-[14px] bg-[#111827] px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-55"
                      >
                        {creatingRetest ? "재시험 생성 중..." : "재시험 시작"}
                      </button>
                    </div>
                  </div>
                  {errorMessage ? <p className="mt-4 text-[13px] text-[#d84a4a]">{errorMessage}</p> : null}
                </section>

                <section className="rounded-[24px] border border-[#e4e6ee] bg-white px-6 py-6 shadow-[0_24px_80px_rgba(15,23,42,0.06)] sm:px-8">
                  <div className="space-y-4">
                    {(wrongSet.items || []).map((item) => (
                      <article key={`${wrongSet.setId}-${item.questionId}`} className="rounded-[18px] border border-[#e5e7eb] bg-[#fbfcfe] p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-[12px] font-semibold tracking-[0.08em] text-[#7c8497]">QUESTION {item.questionOrder}</p>
                            <p className="mt-2 whitespace-pre-wrap text-[17px] leading-[1.8] text-[#111827]">{item.questionText}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full bg-[#f3f4f6] px-2.5 py-1 text-[11px] font-semibold text-[#4b5563]">
                              {examStyleLabel(item.questionStyle)}
                            </span>
                            <span className="rounded-full bg-[#eef2ff] px-2.5 py-1 text-[11px] font-semibold text-[#4338ca]">
                              배점 {item.maxScore}점
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                          <div className="space-y-4">
                            <div className="rounded-[16px] bg-white p-4">
                              <p className="text-[12px] font-semibold text-[#5d6676]">내 이전 답안</p>
                              <p className="mt-2 whitespace-pre-wrap text-[13px] leading-[1.8] text-[#374151]">
                                {item.answerText || "기록된 답안이 없습니다."}
                              </p>
                              <p className="mt-3 text-[12px] font-semibold text-[#111827]">
                                이전 점수: {item.score ?? 0} / {item.maxScore}
                              </p>
                              {item.feedback ? (
                                <p className="mt-2 whitespace-pre-wrap text-[12px] leading-[1.7] text-[#45607c]">
                                  {item.feedback}
                                </p>
                              ) : null}
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div className="rounded-[16px] bg-white p-4">
                              <p className="text-[12px] font-semibold text-[#5d6676]">정답 / 모범해설</p>
                              <p className="mt-2 whitespace-pre-wrap text-[13px] leading-[1.8] text-[#374151]">
                                {item.canonicalAnswer}
                              </p>
                            </div>
                            <div className="rounded-[16px] bg-white p-4">
                              <p className="text-[12px] font-semibold text-[#5d6676]">채점 기준</p>
                              <p className="mt-2 whitespace-pre-wrap text-[13px] leading-[1.8] text-[#374151]">
                                {item.gradingCriteria}
                              </p>
                            </div>
                            {item.referenceExample ? (
                              <div className="rounded-[16px] bg-white p-4">
                                <p className="text-[12px] font-semibold text-[#5d6676]">예시 / 참고 형식</p>
                                <p className="mt-2 whitespace-pre-wrap text-[13px] leading-[1.8] text-[#374151]">
                                  {item.referenceExample}
                                </p>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
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
