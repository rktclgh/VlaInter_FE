import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { StarRatingInput } from "../../components/DifficultyStars";
import { ContentTopNav } from "../../components/ContentTopNav";
import { MobileSidebarDrawer } from "../../components/MobileSidebarDrawer";
import { PointChargeModal } from "../../components/PointChargeModal";
import { PointChargeSuccessModal } from "../../components/PointChargeSuccessModal";
import { Sidebar } from "../../components/Sidebar";
import tempProfileImage from "../../assets/icon/temp.png";
import { logout } from "../../lib/authApi";
import { consumePointChargeSuccessResult } from "../../lib/pointChargeFlow";
import { extractProfile, formatPoint, parsePoint } from "../../lib/profileUtils";
import { getStudentMyMenuItems, getStudentSidebarActiveKey, getStudentSidebarSections } from "../../lib/studentNavigation";
import {
  analyzeStudentCourseMaterial,
  createStudentCourseSession,
  createStudentWrongAnswerRetest,
  deleteStudentCourseMaterial,
  deleteStudentExamSession,
  getMyProfile,
  getMyProfileImageUrl,
  getMyStudentCourses,
  getStudentCourseMaterials,
  getStudentCourseSessions,
  getStudentCourseWrongAnswerSets,
  getStudentCourseMaterialDownloadUrl,
  uploadStudentCourseMaterial,
} from "../../lib/userApi";

const ConfirmModal = ({ open, title, description, pending, confirmLabel = "삭제", onCancel, onConfirm }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/45 px-4">
      <div className="w-full max-w-[420px] rounded-[24px] border border-[#dfe3ee] bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
        <h2 className="text-[22px] font-semibold text-[#111827]">{title}</h2>
        <p className="mt-3 text-[14px] leading-[1.8] text-[#5b6475]">{description}</p>
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
            {pending ? "처리 중..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

const AnalysisLockOverlay = ({ open, fileName, pendingRequest }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-[#0f172acc] px-6">
      <div className="w-full max-w-[420px] rounded-[28px] border border-white/15 bg-[#111827] px-6 py-7 text-center text-white shadow-[0_28px_100px_rgba(15,23,42,0.45)]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-white/5">
          <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-white/25 border-t-white" />
        </div>
        <p className="mt-5 text-[22px] font-semibold">{pendingRequest ? "분석 요청 중" : "AI 분석 진행 중"}</p>
        <p className="mt-3 text-[14px] leading-[1.8] text-white/80">
          {fileName ? `"${fileName}" 자료를 분석하고 있습니다.` : "과목 자료를 분석하고 있습니다."}
          <br />
          완료될 때까지 잠시만 기다려 주세요.
        </p>
        <p className="mt-4 text-[12px] font-medium tracking-[0.01em] text-[#cbd5e1]">
          한 번에 한 개의 문서만 분석할 수 있습니다. 분석 중에는 다른 자료 분석 요청과 페이지 내 조작이 잠시 잠깁니다.
        </p>
      </div>
    </div>
  );
};

const VisualAssetModal = ({ open, title, assets, onClose }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[150] bg-black/70 px-4 py-6">
      <div className="mx-auto flex h-full w-full max-w-[1080px] flex-col rounded-[24px] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.32)]">
        <div className="flex items-center justify-between border-b border-[#e5e7eb] px-5 py-4">
          <div>
            <p className="text-[18px] font-semibold text-[#111827]">{title}</p>
            <p className="mt-1 text-[12px] text-[#6b7280]">원문 페이지/슬라이드/이미지를 그대로 보여줍니다.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[10px] border border-[#d1d5db] px-3 py-2 text-[12px] font-semibold text-[#374151]"
          >
            닫기
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            {assets.map((asset) => (
              <figure key={asset.assetId} className="overflow-hidden rounded-[18px] border border-[#e5e7eb] bg-[#fafbff]">
                <div className="border-b border-[#e5e7eb] bg-white px-4 py-3">
                  <p className="text-[13px] font-semibold text-[#111827]">{asset.label}</p>
                  <p className="mt-1 text-[11px] text-[#7c8497]">
                    {asset.pageNo ? `페이지 ${asset.pageNo}` : asset.slideNo ? `슬라이드 ${asset.slideNo}` : "원본 이미지"}
                    {asset.width && asset.height ? ` · ${asset.width} × ${asset.height}` : ""}
                  </p>
                </div>
                <img
                  src={asset.downloadUrl}
                  alt={asset.label}
                  loading="lazy"
                  className="w-full bg-[#f8fafc] object-contain"
                />
              </figure>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const materialStatusLabel = (material) => {
  if (material?.ingested) return "분석 완료";
  if (material?.ingestionStatus === "QUEUED") return "분석 대기";
  if (material?.ingestionStatus === "PROCESSING") return "분석 중";
  if (material?.ingestionStatus === "FAILED") return "분석 실패";
  return "분석 전";
};

const isMaterialAnalysisDisabled = (material, analyzingMaterialId, uploading, hasOngoingMaterialIngestion) => {
  if (uploading) return true;
  if (analyzingMaterialId !== null) return true;
  if (hasOngoingMaterialIngestion) return true;
  if (material?.ingested) return true;
  return material?.ingestionStatus === "QUEUED" || material?.ingestionStatus === "PROCESSING";
};

const materialAnalyzeButtonLabel = (material, analyzingMaterialId) => {
  if (analyzingMaterialId === material?.materialId) return "분석 요청 중...";
  if (material?.ingested) return "분석 완료";
  if (material?.ingestionStatus === "QUEUED") return "분석 대기";
  if (material?.ingestionStatus === "PROCESSING") return "분석 중";
  return "AI 분석";
};

const materialKindMeta = (materialKind) => {
  if (materialKind === "PAST_EXAM") {
    return {
      title: "족보",
      emptyMessage: "아직 업로드된 족보가 없습니다.",
      uploadLabel: "족보 업로드",
      successLabel: "족보",
      toneClass: "bg-[#fff7ed] text-[#c2410c]",
    };
  }

  return {
    title: "강의자료",
    emptyMessage: "아직 업로드된 강의자료가 없습니다.",
    uploadLabel: "강의자료 업로드",
    successLabel: "강의자료",
    toneClass: "bg-[#eef2ff] text-[#4338ca]",
  };
};

const visualAssetTypeLabel = (assetType) => {
  switch (assetType) {
    case "PDF_PAGE_RENDER":
      return "PDF 페이지";
    case "PPT_SLIDE_RENDER":
      return "PPT 슬라이드";
    case "DOCX_EMBEDDED_IMAGE":
      return "DOCX 이미지";
    case "ORIGINAL_IMAGE":
      return "원본 이미지";
    default:
      return "원문 이미지";
  }
};

const EXAM_STYLE_OPTIONS = [
  { key: "DEFINITION", label: "정의형" },
  { key: "CODING", label: "코딩형" },
  { key: "CALCULATION", label: "계산형" },
];

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

const examModeLabel = (mode) => {
  switch (mode) {
    case "PAST_EXAM":
      return "족보형";
    case "PAST_EXAM_PRACTICE":
      return "족보 그대로 연습";
    case "WRONG_ANSWER_RETEST":
      return "오답노트 재시험";
    default:
      return "일반형";
  }
};

export const StudentCoursePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { courseId } = useParams();
  const normalizedCourseId = Number(courseId);

  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("사용자");
  const [userPoint, setUserPoint] = useState(0);
  const [profileImageUrl, setProfileImageUrl] = useState(tempProfileImage);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showPointChargeModal, setShowPointChargeModal] = useState(false);
  const [showPointChargeSuccessModal, setShowPointChargeSuccessModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const [courses, setCourses] = useState([]);
  const [course, setCourse] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [wrongAnswerSets, setWrongAnswerSets] = useState([]);

  const [pageErrorMessage, setPageErrorMessage] = useState("");
  const [materialMessage, setMaterialMessage] = useState("");
  const [materialErrorMessage, setMaterialErrorMessage] = useState("");
  const [sessionMessage, setSessionMessage] = useState("");
  const [sessionErrorMessage, setSessionErrorMessage] = useState("");

  const [uploading, setUploading] = useState(false);
  const [analyzingMaterialId, setAnalyzingMaterialId] = useState(null);
  const [downloadingMaterialId, setDownloadingMaterialId] = useState(null);
  const [deletingMaterialId, setDeletingMaterialId] = useState(null);
  const [creatingSessionCount, setCreatingSessionCount] = useState(null);
  const [deletingSessionId, setDeletingSessionId] = useState(null);
  const [creatingRetestSetId, setCreatingRetestSetId] = useState(null);
  const [sessionGenerationMode, setSessionGenerationMode] = useState("STANDARD");
  const [sessionQuestionCount, setSessionQuestionCount] = useState(5);
  const [sessionDifficultyLevel, setSessionDifficultyLevel] = useState(3);
  const [sessionQuestionStyles, setSessionQuestionStyles] = useState([]);

  const [materialDeleteTarget, setMaterialDeleteTarget] = useState(null);
  const [sessionDeleteTarget, setSessionDeleteTarget] = useState(null);
  const [visualAssetViewer, setVisualAssetViewer] = useState(null);

  useEffect(() => {
    const charged = consumePointChargeSuccessResult();
    if (!charged) return;
    setUserPoint(parsePoint(charged?.currentPoint));
    setShowPointChargeSuccessModal(true);
  }, []);

  const loadCourseData = useCallback(async (availableCourses) => {
    const matchedCourse = (availableCourses || []).find((item) => String(item?.courseId) === String(normalizedCourseId)) || null;
    if (!matchedCourse) {
      setCourse(null);
      setMaterials([]);
      setSessions([]);
      setWrongAnswerSets([]);
      return;
    }
    setCourse(matchedCourse);
    const [materialsPayload, sessionsPayload, wrongAnswerPayload] = await Promise.all([
      getStudentCourseMaterials(matchedCourse.courseId),
      getStudentCourseSessions(matchedCourse.courseId),
      getStudentCourseWrongAnswerSets(matchedCourse.courseId),
    ]);
    setMaterials(Array.isArray(materialsPayload) ? materialsPayload : []);
    setSessions(Array.isArray(sessionsPayload) ? sessionsPayload : []);
    setWrongAnswerSets(Array.isArray(wrongAnswerPayload) ? wrongAnswerPayload : []);
  }, [normalizedCourseId]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [profilePayload, coursesPayload] = await Promise.all([
          getMyProfile(),
          getMyStudentCourses(),
        ]);
        if (cancelled) return;
        const profile = extractProfile(profilePayload);
        setUserName(String(profile?.name || "사용자"));
        setUserPoint(parsePoint(profile?.point));
        setProfileImageUrl(getMyProfileImageUrl());
        const nextCourses = Array.isArray(coursesPayload) ? coursesPayload : [];
        setCourses(nextCourses);
        await loadCourseData(nextCourses);
      } catch (error) {
        if (!cancelled) {
          setPageErrorMessage(error?.message || "과목 정보를 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [loadCourseData]);

  const pointSummaryText = useMemo(() => formatPoint(userPoint), [userPoint]);
  const studentMenuSections = useMemo(() => getStudentSidebarSections(courses), [courses]);
  const studentMyMenuItems = useMemo(() => getStudentMyMenuItems(), []);
  const sidebarActiveKey = useMemo(() => getStudentSidebarActiveKey(location.pathname), [location.pathname]);
  const readyMaterialCount = useMemo(
    () => materials.filter((material) => material?.materialKind !== "PAST_EXAM" && material?.ingested).length,
    [materials]
  );
  const lectureMaterials = useMemo(
    () => materials.filter((material) => material?.materialKind !== "PAST_EXAM"),
    [materials]
  );
  const pastExamMaterials = useMemo(
    () => materials.filter((material) => material?.materialKind === "PAST_EXAM"),
    [materials]
  );
  const readyPastExamCount = useMemo(
    () => materials.filter((material) => material?.materialKind === "PAST_EXAM" && material?.ingested).length,
    [materials]
  );
  const hasOngoingMaterialIngestion = useMemo(
    () =>
      materials.some(
        (material) => material?.ingestionStatus === "QUEUED" || material?.ingestionStatus === "PROCESSING"
      ),
    [materials]
  );
  const activeIngestionMaterial = useMemo(
    () =>
      materials.find(
        (material) => material?.ingestionStatus === "QUEUED" || material?.ingestionStatus === "PROCESSING"
      ) || null,
    [materials]
  );
  const isAnalysisLocked = analyzingMaterialId !== null || hasOngoingMaterialIngestion;

  const refreshCourse = useCallback(async () => {
    const refreshedCourses = await getMyStudentCourses();
    const nextCourses = Array.isArray(refreshedCourses) ? refreshedCourses : [];
    setCourses(nextCourses);
    await loadCourseData(nextCourses);
  }, [loadCourseData]);

  useEffect(() => {
    if (!hasOngoingMaterialIngestion) return undefined;
    const timer = window.setInterval(() => {
      void (async () => {
        try {
          await refreshCourse();
        } catch (error) {
          console.error("student course ingestion polling failed", error);
        }
      })();
    }, 4000);
    return () => window.clearInterval(timer);
  }, [hasOngoingMaterialIngestion, refreshCourse]);

  const handleUploadMaterial = async (file, materialKind = "LECTURE_MATERIAL") => {
    if (!file || !course || uploading || isAnalysisLocked) return;
    setUploading(true);
    setMaterialMessage("");
    setMaterialErrorMessage("");
    try {
      await uploadStudentCourseMaterial(course.courseId, file, materialKind);
      const kindMeta = materialKindMeta(materialKind);
      setMaterialMessage(`${kindMeta.successLabel}를 업로드했습니다.`);
      await refreshCourse();
    } catch (error) {
      setMaterialErrorMessage(error?.message || "자료 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
    }
  };

  const handleAnalyzeMaterial = async (material) => {
    if (!course || !material || analyzingMaterialId || hasOngoingMaterialIngestion) return;
    setAnalyzingMaterialId(material.materialId);
    setMaterialMessage("");
    setMaterialErrorMessage("");
    try {
      await analyzeStudentCourseMaterial(course.courseId, material.materialId);
      setMaterialMessage(`"${material.fileName}" 분석을 요청했습니다.`);
      await refreshCourse();
    } catch (error) {
      setMaterialErrorMessage(error?.message || "AI 분석 요청에 실패했습니다.");
    } finally {
      setAnalyzingMaterialId(null);
    }
  };

  const handleDownloadMaterial = async (material) => {
    if (!course || !material || downloadingMaterialId) return;
    setDownloadingMaterialId(material.materialId);
    setMaterialMessage("");
    setMaterialErrorMessage("");
    try {
      const payload = await getStudentCourseMaterialDownloadUrl(course.courseId, material.materialId);
      if (!payload?.downloadUrl) {
        setMaterialErrorMessage("다운로드 링크를 받지 못했습니다.");
        return;
      }
      window.open(payload.downloadUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      setMaterialErrorMessage(error?.message || "다운로드 링크 생성에 실패했습니다.");
    } finally {
      setDownloadingMaterialId(null);
    }
  };

  const handleDeleteMaterial = async () => {
    if (!course || !materialDeleteTarget || deletingMaterialId) return;
    setDeletingMaterialId(materialDeleteTarget.materialId);
    setMaterialMessage("");
    setMaterialErrorMessage("");
    try {
      await deleteStudentCourseMaterial(course.courseId, materialDeleteTarget.materialId);
      setMaterialMessage(`"${materialDeleteTarget.fileName}" 자료를 삭제했습니다.`);
      setMaterialDeleteTarget(null);
      await refreshCourse();
    } catch (error) {
      setMaterialErrorMessage(error?.message || "자료 삭제에 실패했습니다.");
    } finally {
      setDeletingMaterialId(null);
    }
  };

  const handleCreateSession = async (questionCount) => {
    if (!course || creatingSessionCount) return;
    setCreatingSessionCount(questionCount);
    setSessionMessage("");
    setSessionErrorMessage("");
    try {
      await createStudentCourseSession(course.courseId, {
        questionCount,
        generationMode: sessionGenerationMode,
        difficultyLevel: sessionGenerationMode === "PAST_EXAM" || sessionGenerationMode === "PAST_EXAM_PRACTICE" ? null : sessionDifficultyLevel,
        questionStyles: sessionGenerationMode === "STANDARD" ? sessionQuestionStyles : [],
      });
      setSessionMessage(`${examModeLabel(sessionGenerationMode)} ${questionCount}문항 모의고사를 생성했습니다.`);
      await refreshCourse();
    } catch (error) {
      setSessionErrorMessage(error?.message || "모의고사 생성에 실패했습니다.");
    } finally {
      setCreatingSessionCount(null);
    }
  };

  const toggleQuestionStyle = (styleKey) => {
    setSessionQuestionStyles((prev) => {
      if (prev.includes(styleKey)) {
        return prev.length === 1 ? prev : prev.filter((item) => item !== styleKey);
      }
      return [...prev, styleKey];
    });
  };

  const handleCreateRetest = async (wrongSet) => {
    if (!wrongSet || creatingRetestSetId) return;
    setCreatingRetestSetId(wrongSet.setId);
    setSessionMessage("");
    setSessionErrorMessage("");
    try {
      const payload = await createStudentWrongAnswerRetest(wrongSet.setId);
      setSessionMessage(`"${wrongSet.title}" 재시험 세션을 생성했습니다.`);
      await refreshCourse();
      if (payload?.sessionId) {
        navigate(`/content/student/sessions/${payload.sessionId}`);
      }
    } catch (error) {
      setSessionErrorMessage(error?.message || "재시험 세션 생성에 실패했습니다.");
    } finally {
      setCreatingRetestSetId(null);
    }
  };

  const handleDeleteSession = async () => {
    if (!sessionDeleteTarget || deletingSessionId) return;
    setDeletingSessionId(sessionDeleteTarget.sessionId);
    setSessionMessage("");
    setSessionErrorMessage("");
    try {
      await deleteStudentExamSession(sessionDeleteTarget.sessionId);
      setSessionMessage(`"${sessionDeleteTarget.title}" 세션을 삭제했습니다.`);
      setSessionDeleteTarget(null);
      await refreshCourse();
    } catch (error) {
      setSessionErrorMessage(error?.message || "모의고사 삭제에 실패했습니다.");
    } finally {
      setDeletingSessionId(null);
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
        <p className="text-[14px] text-[#555]">과목 페이지를 불러오는 중입니다...</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-6 text-center">
        <div>
          <p className="text-[15px] font-medium text-[#111827]">과목을 찾을 수 없습니다.</p>
          {pageErrorMessage ? <p className="mt-2 text-[13px] text-[#d84a4a]">{pageErrorMessage}</p> : null}
          <button
            type="button"
            onClick={() => navigate("/content/student")}
            className="mt-4 rounded-[12px] bg-[#111827] px-4 py-2.5 text-[13px] font-semibold text-white"
          >
            과목 홈으로 돌아가기
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
              <div className="mx-auto w-full max-w-[1080px] rounded-[28px] border border-[#e4e6ee] bg-white px-6 py-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:px-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-[12px] font-semibold tracking-[0.12em] text-[#7c8497]">{course.universityName} · {course.departmentName}</p>
                    <h1 className="mt-3 text-[30px] font-semibold text-[#111827] sm:text-[36px]">{course.courseName}</h1>
                    <p className="mt-2 text-[14px] text-[#5b6475]">{course.professorName || "교수명 미입력"}</p>
                    <p className="mt-3 max-w-[760px] text-[14px] leading-[1.8] text-[#5b6475]">
                      {course.description || "과목 설명은 아직 없습니다."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate("/content/student")}
                    className="rounded-[14px] border border-[#d1d5db] px-4 py-2.5 text-[13px] font-semibold text-[#374151]"
                  >
                    과목 홈으로
                  </button>
                </div>

                {pageErrorMessage ? <p className="mt-4 text-[13px] text-[#d84a4a]">{pageErrorMessage}</p> : null}

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <div className="rounded-[18px] border border-[#e6e9f2] bg-[#fbfcfe] p-4">
                    <p className="text-[12px] text-[#7c8497]">업로드 자료</p>
                    <p className="mt-2 text-[26px] font-semibold text-[#111827]">{materials.length}</p>
                  </div>
                  <div className="rounded-[18px] border border-[#e6e9f2] bg-[#fbfcfe] p-4">
                    <p className="text-[12px] text-[#7c8497]">분석 완료</p>
                    <p className="mt-2 text-[26px] font-semibold text-[#111827]">{readyMaterialCount}</p>
                  </div>
                  <div className="rounded-[18px] border border-[#e6e9f2] bg-[#fbfcfe] p-4">
                    <p className="text-[12px] text-[#7c8497]">모의고사 세션</p>
                    <p className="mt-2 text-[26px] font-semibold text-[#111827]">{sessions.length}</p>
                  </div>
                </div>

                <section className="mt-6 rounded-[20px] border border-[#e6e9f2] bg-[#fbfcfe] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[18px] font-semibold text-[#111827]">과목 자료</p>
                      <p className="mt-1 text-[12px] text-[#6b7280]">강의자료는 PDF/DOCX/PPTX, 족보는 PDF/DOCX/PPTX/JPG/JPEG/PNG 형식을 업로드할 수 있습니다.</p>
                    </div>
                  </div>
                  {materialMessage ? <p className="mt-3 text-[12px] text-[#1f8f55]">{materialMessage}</p> : null}
                  {materialErrorMessage ? <p className="mt-3 text-[12px] text-[#d84a4a]">{materialErrorMessage}</p> : null}
                  <div className="mt-4 grid gap-4 xl:grid-cols-2">
                    {[
                      { key: "LECTURE_MATERIAL", items: lectureMaterials },
                      { key: "PAST_EXAM", items: pastExamMaterials },
                    ].map((section) => {
                      const meta = materialKindMeta(section.key);
                      return (
                        <div key={section.key} className="rounded-[16px] border border-[#e5e7eb] bg-white p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[15px] font-semibold text-[#111827]">{meta.title}</p>
                              <p className="mt-1 text-[12px] text-[#7c8497]">{section.items.length}개 업로드됨</p>
                            </div>
                            <label className={`cursor-pointer rounded-[10px] px-3 py-2 text-[11px] font-semibold ${uploading ? "bg-[#d1d5db] text-white" : "bg-[#111827] text-white"}`}>
                              {uploading ? "업로드 중..." : meta.uploadLabel}
                              <input
                                type="file"
                                accept={
                                  section.key === "PAST_EXAM"
                                    ? ".pdf,.docx,.pptx,.jpg,.jpeg,.png,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/jpeg,image/png"
                                    : ".pdf,.docx,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                                }
                                className="hidden"
                                disabled={uploading || isAnalysisLocked}
                                onChange={(event) => {
                                  const file = event.target.files?.[0];
                                  void handleUploadMaterial(file, section.key);
                                  event.target.value = "";
                                }}
                              />
                            </label>
                          </div>
                          <div className="mt-4">
                            {section.items.length === 0 ? (
                              <p className="text-[13px] text-[#7c8497]">{meta.emptyMessage}</p>
                            ) : (
                              <div className="grid gap-3 sm:grid-cols-2">
                                {section.items.map((material) => (
                                  <div key={material.materialId} className="rounded-[14px] border border-[#e5e7eb] bg-[#fcfcfd] p-3">
                                    <div className="flex items-start justify-between gap-2">
                                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${meta.toneClass}`}>
                                        {meta.title}
                                      </span>
                                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                                        material?.ingested
                                          ? "bg-[#e8fff1] text-[#14804a]"
                                          : material?.ingestionStatus === "FAILED"
                                            ? "bg-[#fff1f1] text-[#dc2626]"
                                            : "bg-[#f3f4f6] text-[#4b5563]"
                                      }`}>
                                        {materialStatusLabel(material)}
                                      </span>
                                    </div>
                                    <p className="mt-3 line-clamp-2 text-[13px] font-semibold leading-[1.5] text-[#111827]">{material.fileName}</p>
                                    <p className="mt-2 text-[11px] text-[#7c8497]">
                                      {new Date(material.createdAt).toLocaleDateString("ko-KR")}
                                    </p>
                                    {material.extractionMethod ? (
                                      <p className="mt-1 text-[11px] font-medium text-[#4158c7]">{material.extractionMethod}</p>
                                    ) : null}
                                    {Array.isArray(material.visualAssets) && material.visualAssets.length > 0 ? (
                                      <div className="mt-3 rounded-[12px] border border-[#e5e7eb] bg-white p-2.5">
                                        <div className="flex items-center justify-between gap-2">
                                          <div>
                                            <p className="text-[11px] font-semibold text-[#111827]">원문 이미지 {material.visualAssets.length}개</p>
                                            <p className="mt-0.5 text-[10px] text-[#7c8497]">
                                              {visualAssetTypeLabel(material.visualAssets[0]?.assetType)}
                                              {material.visualAssets.length > 1 ? ` 외 ${material.visualAssets.length - 1}개` : ""}
                                            </p>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => setVisualAssetViewer({ title: material.fileName, assets: material.visualAssets })}
                                            className="rounded-[8px] border border-[#d1d5db] px-2.5 py-1.5 text-[10px] font-semibold text-[#374151]"
                                          >
                                            보기
                                          </button>
                                        </div>
                                        <div className="mt-2 grid grid-cols-3 gap-2">
                                          {material.visualAssets.slice(0, 3).map((asset) => (
                                            <button
                                              key={asset.assetId}
                                              type="button"
                                              onClick={() => setVisualAssetViewer({ title: material.fileName, assets: material.visualAssets })}
                                              className="overflow-hidden rounded-[10px] border border-[#e5e7eb] bg-[#f8fafc]"
                                            >
                                              <img
                                                src={asset.downloadUrl}
                                                alt={asset.label}
                                                loading="lazy"
                                                className="h-20 w-full object-cover"
                                              />
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    ) : null}
                                    {material?.ingestionStatus === "FAILED" && material?.errorMessage ? (
                                      <p className="mt-2 line-clamp-3 text-[11px] leading-[1.6] text-[#dc2626]">{material.errorMessage}</p>
                                    ) : null}
                                    <div className="mt-3 grid grid-cols-3 gap-2">
                                      <button
                                        type="button"
                                        onClick={() => void handleAnalyzeMaterial(material)}
                                        disabled={isMaterialAnalysisDisabled(material, analyzingMaterialId, uploading, hasOngoingMaterialIngestion)}
                                        className="rounded-[9px] border border-[#d1d5db] bg-white px-2 py-2 text-[10px] font-semibold text-[#374151] disabled:opacity-55"
                                      >
                                        {materialAnalyzeButtonLabel(material, analyzingMaterialId)}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => void handleDownloadMaterial(material)}
                                        disabled={Boolean(downloadingMaterialId)}
                                        className="rounded-[9px] border border-[#d1d5db] bg-white px-2 py-2 text-[10px] font-semibold text-[#374151] disabled:opacity-55"
                                      >
                                        {downloadingMaterialId === material.materialId ? "생성 중..." : "다운로드"}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setMaterialDeleteTarget(material)}
                                        disabled={Boolean(deletingMaterialId)}
                                        className="rounded-[9px] border border-[#fecaca] bg-[#fff5f5] px-2 py-2 text-[10px] font-semibold text-[#dc2626] disabled:opacity-55"
                                      >
                                        삭제
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className="mt-6 rounded-[20px] border border-[#e6e9f2] bg-[#fbfcfe] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[18px] font-semibold text-[#111827]">모의고사 세션</p>
                      <p className="mt-1 text-[12px] text-[#6b7280]">
                        강의자료 {readyMaterialCount}개를 기반으로 실제 대학 시험 스타일 문제를 생성합니다.
                        {sessionGenerationMode === "PAST_EXAM" ? ` 분석 완료 족보 ${readyPastExamCount}개로 난이도와 출제 경향을 맞춥니다.` : ""}
                        {sessionGenerationMode === "PAST_EXAM_PRACTICE" ? ` 분석 완료 족보 ${readyPastExamCount}개를 바탕으로 실제 문제를 그대로 복원 연습합니다.` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 rounded-[16px] border border-[#e5e7eb] bg-white p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex rounded-[12px] border border-[#d1d5db] bg-white p-1">
                        {[
                          { key: "STANDARD", label: "일반형" },
                          { key: "PAST_EXAM", label: "족보형" },
                          { key: "PAST_EXAM_PRACTICE", label: "족보 그대로 연습" },
                        ].map((mode) => (
                          <button
                            key={mode.key}
                            type="button"
                            onClick={() => setSessionGenerationMode(mode.key)}
                            disabled={Boolean(creatingSessionCount)}
                            className={`rounded-[10px] px-3 py-1.5 text-[11px] font-semibold ${
                              sessionGenerationMode === mode.key
                                ? "bg-[#111827] text-white"
                                : "text-[#4b5563]"
                            } disabled:opacity-55`}
                          >
                            {mode.label}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 rounded-[12px] border border-[#d1d5db] px-3 py-2">
                        <span className="text-[11px] font-semibold text-[#6b7280]">문항 수</span>
                        <input
                          type="number"
                          min={3}
                          max={20}
                          value={sessionQuestionCount}
                          onChange={(event) => {
                            const nextValue = Number(event.target.value);
                            if (!Number.isFinite(nextValue)) return;
                            setSessionQuestionCount(Math.min(20, Math.max(3, nextValue)));
                          }}
                          className="w-[68px] rounded-[8px] border border-[#d1d5db] px-2 py-1 text-[12px] font-semibold text-[#111827]"
                        />
                      </div>
                    </div>

                    {sessionGenerationMode === "STANDARD" ? (
                      <>
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          {EXAM_STYLE_OPTIONS.map((style) => {
                            const active = sessionQuestionStyles.includes(style.key);
                            return (
                              <button
                                key={style.key}
                                type="button"
                                onClick={() => toggleQuestionStyle(style.key)}
                                disabled={Boolean(creatingSessionCount)}
                                className={`rounded-[10px] border px-3 py-2 text-[11px] font-semibold transition ${
                                  active
                                    ? "border-[#111827] bg-[#111827] text-white"
                                    : "border-[#d1d5db] bg-white text-[#4b5563]"
                                } disabled:opacity-55`}
                              >
                                {style.label}
                              </button>
                            );
                          })}
                        </div>
                        <p className="mt-2 text-[11px] text-[#7c8497]">
                          문제 스타일을 1개 이상 직접 선택해 주세요. 코딩형만 원하면 코딩형만 선택해야 합니다.
                        </p>
                      </>
                    ) : (
                      <div className="mt-4 rounded-[12px] border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3 text-[12px] leading-[1.7] text-[#5b6475]">
                        {sessionGenerationMode === "PAST_EXAM_PRACTICE"
                          ? "족보 그대로 연습은 사용자가 문제 스타일을 고르지 않습니다. 업로드한 족보 문제 유형을 따라 그대로 복원합니다."
                          : "족보형은 사용자가 문제 스타일을 고르지 않습니다. 업로드한 족보의 실제 문제 출제 유형에 맞춰 문제를 만듭니다."}
                      </div>
                    )}

                    {sessionGenerationMode === "STANDARD" ? (
                      <div className="mt-4 flex items-center gap-3 rounded-[12px] border border-[#f3ddad] bg-[#fff8e8] px-4 py-3">
                        <span className="text-[12px] font-semibold text-[#8a5a00]">난이도</span>
                        <StarRatingInput value={sessionDifficultyLevel} onChange={setSessionDifficultyLevel} />
                        <span className="text-[12px] font-semibold text-[#8a5a00]">{sessionDifficultyLevel} / 5</span>
                      </div>
                    ) : sessionGenerationMode === "PAST_EXAM_PRACTICE" ? (
                      <div className="mt-4 rounded-[12px] border border-[#dbe4ff] bg-[#f5f8ff] px-4 py-3 text-[12px] leading-[1.7] text-[#44506a]">
                        족보 그대로 연습은 업로드한 족보 문제를 우선적으로 복원해 연습지처럼 만듭니다. 이미지 족보는 OCR로 읽은 뒤, 족보 문맥 안에서만 AI가 깨진 문장을 후보정합니다.
                      </div>
                    ) : (
                      <div className="mt-4 rounded-[12px] border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3 text-[12px] leading-[1.7] text-[#5b6475]">
                        족보형은 강의자료를 기반으로 문제를 만들되, 업로드한 족보의 난이도와 출제 문장 스타일을 반영합니다.
                      </div>
                    )}

                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        disabled={
                          Boolean(creatingSessionCount) ||
                          (sessionGenerationMode !== "PAST_EXAM_PRACTICE" && readyMaterialCount === 0) ||
                          (sessionGenerationMode === "STANDARD" && sessionQuestionStyles.length === 0) ||
                          ((sessionGenerationMode === "PAST_EXAM" || sessionGenerationMode === "PAST_EXAM_PRACTICE") && readyPastExamCount === 0)
                        }
                        onClick={() => void handleCreateSession(sessionQuestionCount)}
                        className="rounded-[12px] bg-[#111827] px-4 py-3 text-[12px] font-semibold text-white disabled:opacity-55"
                      >
                        {creatingSessionCount ? "세션 생성 중..." : `${examModeLabel(sessionGenerationMode)} 세션 생성`}
                      </button>
                    </div>
                  </div>
                  {sessionMessage ? <p className="mt-3 text-[12px] text-[#1f8f55]">{sessionMessage}</p> : null}
                  {sessionErrorMessage ? <p className="mt-3 text-[12px] text-[#d84a4a]">{sessionErrorMessage}</p> : null}
                  <div className="mt-4 space-y-3">
                    {sessions.length === 0 ? (
                      <p className="text-[13px] text-[#7c8497]">아직 생성된 모의고사 세션이 없습니다.</p>
                    ) : (
                      sessions.map((session) => (
                        <div key={session.sessionId} className="rounded-[14px] border border-[#e5e7eb] bg-white px-4 py-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-[14px] font-semibold text-[#111827]">{session.title}</p>
                              <p className="mt-1 text-[12px] text-[#7c8497]">
                                {session.questionCount}문항 · 만점 {session.maxScore}점 · 자료 {session.sourceMaterialCount}개 · {new Date(session.createdAt).toLocaleString("ko-KR")}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <span className="rounded-full bg-[#eef2ff] px-2.5 py-1 text-[10px] font-semibold text-[#4338ca]">
                                  {examModeLabel(session.generationMode)}
                                </span>
                                {session.difficultyLevel ? (
                                  <span className="rounded-full bg-[#fff8e8] px-2.5 py-1 text-[10px] font-semibold text-[#8a5a00]">
                                    난이도 {session.difficultyLevel} / 5
                                  </span>
                                ) : null}
                                {(session.questionStyles || []).map((style) => (
                                  <span
                                    key={`${session.sessionId}-${style}`}
                                    className="rounded-full bg-[#f3f4f6] px-2.5 py-1 text-[10px] font-semibold text-[#4b5563]"
                                  >
                                    {examStyleLabel(style)}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => navigate(`/content/student/sessions/${session.sessionId}`)}
                                className="rounded-[10px] border border-[#d1d5db] bg-white px-3 py-2 text-[11px] font-semibold text-[#374151]"
                              >
                                세션 풀어보기
                              </button>
                              <button
                                type="button"
                                onClick={() => setSessionDeleteTarget(session)}
                                disabled={Boolean(deletingSessionId)}
                                className="rounded-[10px] border border-[#fecaca] bg-[#fff5f5] px-3 py-2 text-[11px] font-semibold text-[#dc2626] disabled:opacity-55"
                              >
                                삭제
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <section className="mt-6 rounded-[20px] border border-[#e6e9f2] bg-[#fbfcfe] p-5">
                  <div>
                    <p className="text-[18px] font-semibold text-[#111827]">오답노트</p>
                    <p className="mt-1 text-[12px] text-[#6b7280]">세션 결과에서 저장한 문제들을 다시 보고, 새 재시험 세션으로 이어갈 수 있습니다.</p>
                  </div>
                  <div className="mt-4 space-y-3">
                    {wrongAnswerSets.length === 0 ? (
                      <p className="text-[13px] text-[#7c8497]">아직 저장된 오답노트가 없습니다.</p>
                    ) : (
                      wrongAnswerSets.map((wrongSet) => (
                        <div key={wrongSet.setId} className="rounded-[14px] border border-[#e5e7eb] bg-white px-4 py-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-[14px] font-semibold text-[#111827]">{wrongSet.title}</p>
                              <p className="mt-1 text-[12px] text-[#7c8497]">
                                {wrongSet.questionCount}문항 · {new Date(wrongSet.updatedAt).toLocaleString("ko-KR")}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => navigate(`/content/student/wrong-answer-sets/${wrongSet.setId}`)}
                                className="rounded-[10px] border border-[#d1d5db] bg-white px-3 py-2 text-[11px] font-semibold text-[#374151]"
                              >
                                상세 보기
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleCreateRetest(wrongSet)}
                                disabled={creatingRetestSetId === wrongSet.setId}
                                className="rounded-[10px] border border-[#111827] bg-[#111827] px-3 py-2 text-[11px] font-semibold text-white disabled:opacity-55"
                              >
                                {creatingRetestSetId === wrongSet.setId ? "생성 중..." : "재시험"}
                              </button>
                            </div>
                          </div>
                          {Array.isArray(wrongSet.previewQuestions) && wrongSet.previewQuestions.length > 0 ? (
                            <ul className="mt-2 space-y-1 text-[12px] leading-[1.7] text-[#4b5563]">
                              {wrongSet.previewQuestions.map((question, index) => (
                                <li key={`${wrongSet.setId}-preview-${index}`}>• {question}</li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </div>
            </div>
          </main>
        </div>
      </div>

      <ConfirmModal
        open={Boolean(materialDeleteTarget)}
        title="과목 자료 삭제"
        description={`"${materialDeleteTarget?.fileName || "선택한 자료"}"를 정말 삭제하시겠습니까? 분석 결과와 연결 정보도 함께 삭제됩니다.`}
        pending={Boolean(deletingMaterialId)}
        onCancel={() => {
          if (deletingMaterialId) return;
          setMaterialDeleteTarget(null);
        }}
        onConfirm={() => void handleDeleteMaterial()}
      />
      <ConfirmModal
        open={Boolean(sessionDeleteTarget)}
        title="모의고사 삭제"
        description={`"${sessionDeleteTarget?.title || "선택한 모의고사"}"를 정말 삭제하시겠습니까? 세션 문항과 오답노트 기록도 함께 삭제됩니다.`}
        pending={Boolean(deletingSessionId)}
        onCancel={() => {
          if (deletingSessionId) return;
          setSessionDeleteTarget(null);
        }}
        onConfirm={() => void handleDeleteSession()}
      />
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
      <AnalysisLockOverlay
        open={isAnalysisLocked}
        fileName={activeIngestionMaterial?.fileName}
        pendingRequest={analyzingMaterialId !== null && !activeIngestionMaterial}
      />
      <VisualAssetModal
        open={Boolean(visualAssetViewer)}
        title={visualAssetViewer ? `${visualAssetViewer.title} 원문 이미지` : ""}
        assets={Array.isArray(visualAssetViewer?.assets) ? visualAssetViewer.assets : []}
        onClose={() => setVisualAssetViewer(null)}
      />
    </>
  );
};
