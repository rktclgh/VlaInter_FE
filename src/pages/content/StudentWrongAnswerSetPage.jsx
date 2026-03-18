import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { AcademicProfileRequiredModal } from "../../components/AcademicProfileRequiredModal";
import { ContentTopNav } from "../../components/ContentTopNav";
import { MobileSidebarDrawer } from "../../components/MobileSidebarDrawer";
import { PointChargeModal } from "../../components/PointChargeModal";
import { PointChargeSuccessModal } from "../../components/PointChargeSuccessModal";
import { ProtectedImage } from "../../components/ProtectedImage";
import { Sidebar } from "../../components/Sidebar";
import { useToast } from "../../hooks/useToast";
import tempProfileImage from "../../assets/icon/temp.png";
import { downloadProtectedResource } from "../../lib/apiClient";
import { logout } from "../../lib/authApi";
import { consumePointChargeSuccessResult } from "../../lib/pointChargeFlow";
import { extractProfile, formatPoint, parsePoint } from "../../lib/profileUtils";
import { hasAcademicProfile } from "../../lib/serviceMode";
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

const VisualAssetModal = ({ open, title, assets, onClose }) => {
  if (!open) return null;

  const handleDownloadProtectedAsset = async (asset) => {
    try {
      const { blob } = await downloadProtectedResource(asset.downloadUrl);
      const objectUrl = URL.createObjectURL(blob);
      const openedWindow = window.open(objectUrl, "_blank", "noopener,noreferrer");
      if (!openedWindow) {
        const link = document.createElement("a");
        link.href = objectUrl;
        link.target = "_blank";
        link.rel = "noreferrer";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch {
      // ignore and keep the embedded preview available
    }
  };

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
                  <button
                    type="button"
                    onClick={() => {
                      void handleDownloadProtectedAsset(asset);
                    }}
                    className="rounded-[10px] border border-[#d1d5db] px-3 py-2 text-[11px] font-semibold text-[#374151]"
                  >
                    새 창으로
                  </button>
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

export const StudentWrongAnswerSetPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setId } = useParams();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [wrongSet, setWrongSet] = useState(null);
  const [courses, setCourses] = useState([]);
  const [userName, setUserName] = useState("사용자");
  const [isAdmin, setIsAdmin] = useState(false);
  const [userPoint, setUserPoint] = useState(0);
  const [profileImageUrl, setProfileImageUrl] = useState(tempProfileImage);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showPointChargeModal, setShowPointChargeModal] = useState(false);
  const [showPointChargeSuccessModal, setShowPointChargeSuccessModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [creatingRetest, setCreatingRetest] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
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
          setWrongSet(null);
          return;
        }
        const [coursesPayload, setPayload] = await Promise.all([
          getMyStudentCourses(),
          getStudentWrongAnswerSetDetail(setId),
        ]);
        if (cancelled) return;
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
  const studentMenuSections = useMemo(() => getStudentSidebarSections(courses, { isAdmin }), [courses, isAdmin]);
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
      showToast("재시험 세션을 생성했습니다.", { type: "success" });
      if (payload?.sessionId) {
        navigate(`/content/student/sessions/${payload.sessionId}`);
      }
    } catch (error) {
      showToast(error?.message || "재시험 세션 생성에 실패했습니다.", { type: "error" });
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
                            {item.sourceFileName || (Array.isArray(item.sourceVisualAssets) && item.sourceVisualAssets.length > 0) ? (
                              <div className="rounded-[16px] bg-white p-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div>
                                    <p className="text-[12px] font-semibold text-[#5d6676]">원문 족보 출처</p>
                                    {item.sourceFileName ? (
                                      <p className="mt-2 text-[13px] font-semibold text-[#111827]">{item.sourceFileName}</p>
                                    ) : null}
                                  </div>
                                  {Array.isArray(item.sourceVisualAssets) && item.sourceVisualAssets.length > 0 ? (
                                    <button
                                      type="button"
                                      onClick={() => setSourceAssetViewer({
                                        title: item.sourceFileName || `문제 ${item.questionOrder} 원문`,
                                        assets: item.sourceVisualAssets,
                                      })}
                                      className="rounded-[10px] border border-[#d1d5db] px-3 py-2 text-[11px] font-semibold text-[#374151]"
                                    >
                                      원문 이미지 보기
                                    </button>
                                  ) : null}
                                </div>
                                {Array.isArray(item.sourceVisualAssets) && item.sourceVisualAssets.length > 0 ? (
                                  <div className="mt-3 grid grid-cols-3 gap-2">
                                    {item.sourceVisualAssets.slice(0, 3).map((asset) => (
                                      <button
                                        key={asset.assetId}
                                        type="button"
                                        onClick={() => setSourceAssetViewer({
                                          title: item.sourceFileName || `문제 ${item.questionOrder} 원문`,
                                          assets: item.sourceVisualAssets,
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
