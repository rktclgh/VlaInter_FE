import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ContentTopNav } from "../../components/ContentTopNav";
import { MobileSidebarDrawer } from "../../components/MobileSidebarDrawer";
import { OcrInfoBadge } from "../../components/OcrInfoBadge";
import { Sidebar } from "../../components/Sidebar";
import { GeminiOverloadModal } from "../../components/GeminiOverloadModal";
import { PointChargeModal } from "../../components/PointChargeModal";
import { PointChargeSuccessModal } from "../../components/PointChargeSuccessModal";
import { StarRatingInput, StarIcons } from "../../components/DifficultyStars";
import tempProfileImage from "../../assets/icon/temp.png";
import { logout } from "../../lib/authApi";
import { searchCategoryByText } from "../../lib/categoryPresentation";
import { ratingToDifficulty } from "../../lib/difficultyRating";
import { createInterviewCategory, createInterviewCatalogJob, createInterviewCatalogSkill, getInterviewCatalogJobs, getInterviewCatalogSkills, getInterviewCategories, getReadyMockDocuments, startMockInterview } from "../../lib/interviewApi";
import { saveTechInterviewSession } from "../../lib/interviewSessionFlow";
import { consumePointChargeSuccessResult } from "../../lib/pointChargeFlow";
import { extractProfile, formatPoint, parsePoint } from "../../lib/profileUtils";
import { getMyProfile, getMyProfileImageUrl } from "../../lib/userApi";
import { isGeminiOverloadError } from "../../lib/geminiErrorUtils";

const DOCUMENT_TYPES = [
  { key: "RESUME", label: "이력서" },
  { key: "INTRODUCE", label: "자기소개서" },
  { key: "PORTFOLIO", label: "포트폴리오" },
];

const extractFileList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.files)) return payload.files;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};
const toTimestamp = (rawDateTime) => {
  const time = new Date(rawDateTime || "").getTime();
  return Number.isNaN(time) ? 0 : time;
};
const resolveDisplayFileName = (file) => (
  file?.originalFileName || file?.original_filename || file?.fileName || file?.file_name || file?.name || "미선택"
);
const buildSelectedDocumentMeta = (file, type) => {
  if (!file) return null;
  return {
    fileId: file?.fileId || file?.file_id || null,
    fileType: type,
    label: resolveDisplayFileName(file),
    ocrUsed: Boolean(file?.ocrUsed),
  };
};
const LogoutConfirmModal = ({ onCancel, onConfirm }) => (
  <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/35 px-4">
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="interview-start-logout-title"
      aria-describedby="interview-start-logout-description"
      className="w-full max-w-105 rounded-2xl border border-[#d9d9d9] bg-white p-5"
    >
      <p id="interview-start-logout-title" className="text-[15px] font-medium text-[#252525]">
        정말 로그아웃 하시겠습니까?
      </p>
      <p id="interview-start-logout-description" className="mt-1 text-[13px] text-[#4f5664]">
        종료하지 않은 면접 내용은 저장되지 않습니다.
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-[10px] border border-[#d6d6d6] px-3 py-1.5 text-[12px] text-[#666]">취소</button>
        <button type="button" onClick={onConfirm} className="rounded-[10px] border border-[#1f1f1f] bg-[#1f1f1f] px-3 py-1.5 text-[12px] text-white">로그아웃</button>
      </div>
    </div>
  </div>
);

const InlineSpinner = ({ label }) => (
  <div className="inline-flex items-center gap-2 text-[12px] text-[#5e6472]">
    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#cbd5e1] border-t-[#171b24]" />
    <span>{label}</span>
  </div>
);

const BlockingLoadingOverlay = ({ title, description }) => (
  <div className="fixed inset-0 z-120 flex items-center justify-center bg-[#0f172a]/55 px-4">
    <div className="w-full max-w-105 rounded-2xl border border-white/25 bg-white/95 p-5 text-center shadow-[0_18px_48px_rgba(15,23,42,0.28)]">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#cbd5e1] border-t-[#171b24] animate-spin" />
      <p className="mt-4 text-[16px] font-semibold text-[#111827]">{title}</p>
      <p className="mt-2 text-[13px] leading-[1.6] text-[#4b5563]">{description}</p>
    </div>
  </div>
);

const InterviewPrerequisiteGuideModal = ({ onClose, onMoveToUpload }) => (
  <div className="fixed inset-0 z-120 flex items-center justify-center bg-black/55 px-4">
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="interview-prereq-title"
      aria-describedby="interview-prereq-description"
      className="w-full max-w-115 rounded-2xl border border-[#d9d9d9] bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.22)]"
    >
      <p id="interview-prereq-title" className="text-[16px] font-semibold text-[#1f2937]">면접 시작 전 필수 준비가 필요합니다</p>
      <p id="interview-prereq-description" className="mt-2 text-[13px] leading-[1.7] text-[#4f5664]">
        이력서/자기소개서 업로드와 AI 분석이 완료되어야 면접을 시작하실 수 있습니다.
      </p>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-[10px] border border-[#d6d6d6] px-3 py-1.5 text-[12px] text-[#666]">닫기</button>
        <button type="button" onClick={onMoveToUpload} className="rounded-[10px] border border-[#171b24] bg-[#171b24] px-3 py-1.5 text-[12px] text-white">이력서 및 자기소개서 업로드 페이지로 이동</button>
      </div>
    </div>
  </div>
);

const CategoryCard = ({ title, description, children }) => (
  <section className="rounded-3xl border border-[#e4e7ee] bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.04)] sm:p-6">
    <div className="mb-4">
      <p className="text-[12px] font-semibold tracking-[0.08em] text-[#7a8190]">{title}</p>
      {description ? <p className="mt-1 text-[13px] leading-[1.7] text-[#5e6472]">{description}</p> : null}
    </div>
    {children}
  </section>
);

const FilterChip = ({ label, active = false, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-full border px-3 py-1 text-[12px] transition ${active ? "border-[#171b24] bg-[#171b24] text-white" : "border-[#d9dde5] bg-white text-[#505866]"}`}
  >
    {label}
  </button>
);

export const InterviewStartPage = () => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("사용자");
  const [userPoint, setUserPoint] = useState(0);
  const [profileImageUrl, setProfileImageUrl] = useState(tempProfileImage);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showPointChargeModal, setShowPointChargeModal] = useState(false);
  const [showPointChargeSuccessModal, setShowPointChargeSuccessModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const [jobItems, setJobItems] = useState([]);
  const [categoryTree, setCategoryTree] = useState([]);
  const [skillItems, setSkillItems] = useState([]);
  const [filesByType, setFilesByType] = useState({ RESUME: [], INTRODUCE: [], PORTFOLIO: [] });
  const [selectedFiles, setSelectedFiles] = useState({ RESUME: "", INTRODUCE: "", PORTFOLIO: "" });
  const [branchFilter, setBranchFilter] = useState("");
  const [branchQuery, setBranchQuery] = useState("");
  const [jobFilter, setJobFilter] = useState("");
  const [jobQuery, setJobQuery] = useState("");
  const [skillQuery, setSkillQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedRating, setSelectedRating] = useState(3);
  const [selectedQuestionCount, setSelectedQuestionCount] = useState(5);
  const [loadingPage, setLoadingPage] = useState(true);
  const [startingInterview, setStartingInterview] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [pageErrorMessage, setPageErrorMessage] = useState("");
  const [showGeminiOverloadModal, setShowGeminiOverloadModal] = useState(false);
  const [showPrereqGuideModal, setShowPrereqGuideModal] = useState(false);

  useEffect(() => {
    const charged = consumePointChargeSuccessResult();
    if (!charged) return;
    setUserPoint(parsePoint(charged?.currentPoint));
    setShowPointChargeSuccessModal(true);
  }, []);

  const loadPageData = useCallback(async () => {
    let profile = {};
    try {
      const profilePayload = await getMyProfile();
      profile = extractProfile(profilePayload);
      setUserName(profile?.name || "사용자");
      setUserPoint(parsePoint(profile?.point));
      setProfileImageUrl(getMyProfileImageUrl());
    } catch {
      navigate("/login", { replace: true });
      return;
    }

    try {
      const [jobsPayload, filesPayload, categoriesPayload] = await Promise.all([
        getInterviewCatalogJobs(),
        getReadyMockDocuments(),
        getInterviewCategories(),
      ]);
      const nextJobs = (Array.isArray(jobsPayload) ? jobsPayload : []).map((job) => ({
        categoryId: Number(job?.jobId),
        name: String(job?.name || "").trim(),
        displayName: String(job?.name || "").trim(),
      })).filter((job) => Number.isFinite(job.categoryId) && job.name);
      const nextCategoryTree = Array.isArray(categoriesPayload) ? categoriesPayload : [];
      const rawFiles = extractFileList(filesPayload);
      const nextFilesByType = { RESUME: [], INTRODUCE: [], PORTFOLIO: [] };

      rawFiles.forEach((file) => {
        const type = file?.fileType || file?.file_type;
        if (!nextFilesByType[type]) return;
        nextFilesByType[type].push(file);
      });

      Object.keys(nextFilesByType).forEach((type) => {
        nextFilesByType[type].sort((a, b) => toTimestamp(b?.createdAt || b?.created_at) - toTimestamp(a?.createdAt || a?.created_at));
      });

      const profileJobName = typeof profile?.jobName === "string" ? profile.jobName.trim() : "";
      const matchedJob = profileJobName
        ? nextJobs.find((item) => [item.displayName, item.name].filter(Boolean).some((name) => name.trim().toLowerCase() === profileJobName.toLowerCase()))
        : null;
      const defaultJob = matchedJob?.categoryId ? String(matchedJob.categoryId) : nextJobs[0]?.categoryId ? String(nextJobs[0].categoryId) : "";

      setJobItems(nextJobs);
      setCategoryTree(nextCategoryTree);
      setSkillItems([]);
      setFilesByType(nextFilesByType);
      setSelectedFiles({
        RESUME: String(nextFilesByType.RESUME[0]?.fileId || nextFilesByType.RESUME[0]?.file_id || ""),
        INTRODUCE: String(nextFilesByType.INTRODUCE[0]?.fileId || nextFilesByType.INTRODUCE[0]?.file_id || ""),
        PORTFOLIO: String(nextFilesByType.PORTFOLIO[0]?.fileId || nextFilesByType.PORTFOLIO[0]?.file_id || ""),
      });
      setJobFilter((prev) => prev || defaultJob);
    } catch (error) {
      setPageErrorMessage(error?.message || "면접 설정 데이터를 불러오지 못했습니다.");
    } finally {
      setLoadingPage(false);
    }
  }, [navigate]);

  useEffect(() => {
    void loadPageData();
  }, [loadPageData]);

  const jobs = useMemo(() => jobItems, [jobItems]);
  const branchItems = useMemo(
    () => (categoryTree || []).filter((item) => Number(item.depth) === 0).sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "ko")),
    [categoryTree]
  );
  const visibleBranches = useMemo(() => (
    branchItems.filter((branch) => searchCategoryByText(branch, branchQuery))
  ), [branchItems, branchQuery]);
  const jobNameToBranchId = useMemo(() => {
    const mapping = new Map();
    (categoryTree || [])
      .filter((item) => Number(item.depth) === 1)
      .forEach((jobCategory) => {
        const key = String(jobCategory.name || "").trim().toLowerCase();
        if (!key) return;
        const branchId = String(jobCategory.parentId || "");
        if (!branchId) return;
        mapping.set(key, branchId);
      });
    return mapping;
  }, [categoryTree]);
  const visibleJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (!searchCategoryByText(job, jobQuery)) return false;
      if (!branchFilter) return true;
      const jobKey = String(job.displayName || job.name || "").trim().toLowerCase();
      return jobNameToBranchId.get(jobKey) === branchFilter;
    });
  }, [branchFilter, jobQuery, jobNameToBranchId, jobs]);
  const visibleSkills = useMemo(() => {
    const keyword = skillQuery.trim().toLowerCase();
    return skillItems
      .filter((category) => searchCategoryByText(category, keyword))
      .map((category) => ({
        ...category,
        label: category.displayName || category.name,
      }));
  }, [skillItems, skillQuery]);

  useEffect(() => {
    if (!jobFilter) return;
    if (visibleJobs.some((job) => String(job.categoryId) === String(jobFilter))) return;
    setJobFilter("");
    setSelectedCategoryId("");
  }, [jobFilter, visibleJobs]);

  useEffect(() => {
    if (selectedCategoryId && !visibleSkills.some((item) => String(item.categoryId) === String(selectedCategoryId))) {
      setSelectedCategoryId("");
    }
  }, [selectedCategoryId, visibleSkills]);

  const canCreateJob = Boolean(jobQuery.trim() && !visibleJobs.some((job) => (job.displayName || job.name || "").trim().toLowerCase() === jobQuery.trim().toLowerCase()));
  const canCreateBranch = Boolean(branchQuery.trim() && !branchItems.some((branch) => (branch.name || "").trim().toLowerCase() === branchQuery.trim().toLowerCase()));
  const canCreateSkill = Boolean(jobFilter && skillQuery.trim() && !visibleSkills.some((skill) => skill.label.trim().toLowerCase() === skillQuery.trim().toLowerCase()));

  const selectedSkill = useMemo(() => skillItems.find((item) => String(item.categoryId) === String(selectedCategoryId)) || null, [skillItems, selectedCategoryId]);
  const selectedJob = useMemo(() => jobs.find((item) => String(item.categoryId) === String(jobFilter)) || null, [jobFilter, jobs]);
  const selectedFileObjects = useMemo(() => DOCUMENT_TYPES.reduce((acc, item) => {
    acc[item.key] = filesByType[item.key].find((file) => String(file?.fileId || file?.file_id || "") === String(selectedFiles[item.key] || "")) || null;
    return acc;
  }, {}), [filesByType, selectedFiles]);

  useEffect(() => {
    const loadSkills = async () => {
      if (!jobFilter) {
        setSkillItems([]);
        return;
      }
      const targetJob = jobs.find((item) => String(item.categoryId) === String(jobFilter));
      const jobName = (targetJob?.displayName || targetJob?.name || "").trim();
      if (!jobName) {
        setSkillItems([]);
        return;
      }
      try {
        const payload = await getInterviewCatalogSkills({ jobName, query: skillQuery.trim() });
        const nextSkills = (Array.isArray(payload) ? payload : []).map((skill) => ({
          categoryId: Number(skill?.skillId),
          parentId: Number(skill?.jobId || targetJob?.categoryId || 0),
          name: String(skill?.name || "").trim(),
          displayName: String(skill?.name || "").trim(),
          isLeaf: true,
        })).filter((item) => Number.isFinite(item.categoryId) && item.name);
        setSkillItems(nextSkills);
      } catch (error) {
        setPageErrorMessage(error?.message || "기술 목록을 불러오지 못했습니다.");
      }
    };

    void loadSkills();
  }, [jobFilter, jobs, skillQuery]);

  const handleSidebarNavigate = (item) => {
    if (startingInterview) return;
    setIsMobileMenuOpen(false);
    if (item?.path) navigate(item.path);
  };

  const handleLogoutConfirm = async () => {
    try {
      await logout();
    } catch {
      // ignore
    } finally {
      setShowLogoutModal(false);
      navigate("/login", { replace: true });
    }
  };

  const handleCreateJob = async () => {
    if (!jobQuery.trim()) return;
    setCreatingCategory(true);
    setPageErrorMessage("");
    try {
      const created = await createInterviewCatalogJob(jobQuery.trim());
      const displayName = (created?.name || jobQuery.trim()).trim();
      const refreshed = await getInterviewCatalogJobs();
      const nextJobs = (Array.isArray(refreshed) ? refreshed : []).map((job) => ({
        categoryId: Number(job?.jobId),
        name: String(job?.name || "").trim(),
        displayName: String(job?.name || "").trim(),
      })).filter((job) => Number.isFinite(job.categoryId) && job.name);
      setJobItems(nextJobs);
      const matched = nextJobs.find((job) => job.name.toLowerCase() === displayName.toLowerCase()) || nextJobs.at(0);
      setJobFilter(matched?.categoryId ? String(matched.categoryId) : "");
      setJobQuery(displayName);
    } catch (error) {
      setPageErrorMessage(error?.message || "직무 생성에 실패했습니다.");
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleCreateBranch = async () => {
    if (!branchQuery.trim()) return;
    setCreatingCategory(true);
    setPageErrorMessage("");
    try {
      const created = await createInterviewCategory({
        parentId: null,
        name: branchQuery.trim(),
      });
      const displayName = (created?.name || branchQuery.trim()).trim();
      const refreshed = await getInterviewCategories();
      const nextCategoryTree = Array.isArray(refreshed) ? refreshed : [];
      setCategoryTree(nextCategoryTree);
      const matched = nextCategoryTree.find(
        (item) => Number(item?.depth) === 0 && String(item?.name || "").trim().toLowerCase() === displayName.toLowerCase()
      ) || nextCategoryTree.find((item) => Number(item?.depth) === 0) || null;
      setBranchFilter(matched?.categoryId ? String(matched.categoryId) : "");
      setBranchQuery(displayName);
    } catch (error) {
      setPageErrorMessage(error?.message || "계열 생성에 실패했습니다.");
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleCreateSkill = async () => {
    if (!jobFilter || !skillQuery.trim()) return;
    setCreatingCategory(true);
    setPageErrorMessage("");
    try {
      const jobName = (selectedJob?.displayName || selectedJob?.name || jobQuery.trim()).trim();
      if (!jobName) {
        setPageErrorMessage("직무를 먼저 선택해 주세요.");
        return;
      }
      const created = await createInterviewCatalogSkill({
        jobName,
        skillName: skillQuery.trim(),
      });
      const displayName = (created?.name || skillQuery.trim()).trim();
      const refreshed = await getInterviewCatalogSkills({ jobName });
      const nextSkills = (Array.isArray(refreshed) ? refreshed : []).map((skill) => ({
        categoryId: Number(skill?.skillId),
        parentId: Number(skill?.jobId || selectedJob?.categoryId || 0),
        name: String(skill?.name || "").trim(),
        displayName: String(skill?.name || "").trim(),
        isLeaf: true,
      })).filter((item) => Number.isFinite(item.categoryId) && item.name);
      setSkillItems(nextSkills);
      const matched = nextSkills.find((item) => item.name.toLowerCase() === displayName.toLowerCase()) || nextSkills.at(0);
      setSelectedCategoryId(matched?.categoryId ? String(matched.categoryId) : "");
      setSkillQuery(displayName);
    } catch (error) {
      setPageErrorMessage(error?.message || "기술 카테고리 생성에 실패했습니다.");
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleStartInterview = async () => {
    const selectedDocumentIds = DOCUMENT_TYPES
      .map((item) => selectedFiles[item.key])
      .filter((value, index, array) => value && array.indexOf(value) === index)
      .map((value) => Number(value));

    if (selectedDocumentIds.length === 0) {
      setShowPrereqGuideModal(true);
      setPageErrorMessage("");
      return;
    }
    const resolvedJobName = (selectedJob?.displayName || selectedJob?.name || jobQuery.trim()).trim();
    const resolvedSkillName = (selectedSkill?.displayName || selectedSkill?.name || skillQuery.trim()).trim();
    if (!resolvedJobName) {
      setPageErrorMessage("모의면접에는 직무 입력이 필요합니다.");
      return;
    }
    if (!resolvedSkillName) {
      setPageErrorMessage("모의면접에는 기술 입력이 필요합니다.");
      return;
    }

    setStartingInterview(true);
    setPageErrorMessage("");
    try {
      const response = await startMockInterview({
        documentFileIds: selectedDocumentIds,
        jobName: resolvedJobName,
        skillName: resolvedSkillName,
        difficulty: ratingToDifficulty(selectedRating),
        questionCount: Math.max(5, Number(selectedQuestionCount) || 5),
      });

      if (!response?.sessionId || !response?.currentQuestion) {
        setPageErrorMessage("면접 세션은 생성되었지만 첫 질문을 불러오지 못했습니다.");
        return;
      }

      saveTechInterviewSession({
        sessionId: response.sessionId,
        currentQuestion: response.currentQuestion,
        pendingResult: null,
        completed: false,
        metadata: {
          apiBasePath: "/api/interview/mock",
          selectedDocuments: {
            resume: buildSelectedDocumentMeta(selectedFileObjects.RESUME, "RESUME"),
            introduce: buildSelectedDocumentMeta(selectedFileObjects.INTRODUCE, "INTRODUCE"),
            portfolio: buildSelectedDocumentMeta(selectedFileObjects.PORTFOLIO, "PORTFOLIO"),
          },
          difficulty: ratingToDifficulty(selectedRating),
          difficultyRating: selectedRating,
          categoryId: null,
          categoryName: resolvedSkillName,
          jobName: resolvedJobName,
          questionCount: Math.max(5, Number(selectedQuestionCount) || 5),
        },
      });

      navigate("/content/interview/session");
    } catch (error) {
      if (isGeminiOverloadError(error)) {
        setShowGeminiOverloadModal(true);
        setPageErrorMessage("");
        return;
      }
      setPageErrorMessage(error?.message || "면접 시작에 실패했습니다.");
    } finally {
      setStartingInterview(false);
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-white pt-13.5">
      <ContentTopNav
        point={formatPoint(userPoint)}
        onClickCharge={() => {
          if (startingInterview) return;
          setShowPointChargeModal(true);
        }}
        onOpenMenu={() => {
          if (startingInterview) return;
          setIsMobileMenuOpen(true);
        }}
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
          if (startingInterview) return;
          setIsMobileMenuOpen(false);
          setShowLogoutModal(true);
        }}
      />

      <div className="flex min-h-[calc(100vh-54px)]">
        <div className="hidden w-68 shrink-0 md:block">
          <Sidebar
            activeKey="interview_start"
            onNavigate={handleSidebarNavigate}
            userName={userName}
            profileImageUrl={profileImageUrl}
            fallbackProfileImageUrl={tempProfileImage}
            onLogout={() => {
              if (startingInterview) return;
              setShowLogoutModal(true);
            }}
          />
        </div>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-4 pb-6 pt-6 sm:px-5 md:px-8 md:pt-10">
            <div className="mx-auto w-full max-w-7xl space-y-5">
              <section className="rounded-3xl border border-[#e4e7ee] bg-[linear-gradient(180deg,#ffffff_0%,#f7f9fc_100%)] p-5 sm:p-6">
                <p className="text-[12px] font-semibold tracking-[0.08em] text-[#7a8190]">MOCK INTERVIEW</p>
                <h1 className="mt-2 text-[30px] font-semibold tracking-[-0.02em] text-[#161a22] sm:text-[42px]">
                  서류와 직무를 고르고
                  <br />
                  실전처럼 면접을 시작합니다
                </h1>
                <p className="mt-3 max-w-180 text-[14px] leading-[1.7] text-[#5e6472] sm:text-[15px]">
                  분석 완료된 서류만 선택하실 수 있습니다. 직무와 기술 카테고리를 함께 선택하시면 문서 질문과 기술 질문을 섞어 면접을 생성합니다.
                </p>
              </section>

              <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_0.85fr]">
                <div className="space-y-5">
                  <CategoryCard title="계열 선택" description="최상위 루트(계열)를 먼저 선택하면 직무/기술 후보를 더 빠르게 좁힐 수 있습니다.">
                    <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                      <input
                        value={branchQuery}
                        onChange={(event) => setBranchQuery(event.target.value)}
                        placeholder="계열 검색 또는 새 계열 입력"
                        className="rounded-[14px] border border-[#dfe3eb] px-4 py-3 text-[13px] outline-none focus:border-[#8aa2e8]"
                      />
                      {canCreateBranch ? (
                        <button type="button" disabled={creatingCategory} onClick={handleCreateBranch} className="rounded-[14px] border border-[#171b24] px-4 py-3 text-[13px] font-semibold text-[#171b24] disabled:opacity-60">
                          {creatingCategory ? "생성 중..." : "계열 추가"}
                        </button>
                      ) : <div />}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <FilterChip
                        label="전체 계열"
                        active={!branchFilter}
                        onClick={() => setBranchFilter("")}
                      />
                      {visibleBranches.map((branch) => (
                        <FilterChip
                          key={branch.categoryId}
                          label={branch.name}
                          active={branchFilter === String(branch.categoryId)}
                          onClick={() => setBranchFilter(String(branch.categoryId))}
                        />
                      ))}
                      {!visibleBranches.length && !loadingPage ? <span className="text-[12px] text-[#7a8190]">표시할 계열이 없습니다.</span> : null}
                    </div>
                  </CategoryCard>

                  <CategoryCard title="직무 선택" description="직무는 한글 기준으로 선택하시고, 없으면 바로 추가해 주세요.">
                    <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                      <input
                        value={jobQuery}
                        onChange={(event) => setJobQuery(event.target.value)}
                        placeholder="직무 검색 또는 새 직무 입력"
                        className="rounded-[14px] border border-[#dfe3eb] px-4 py-3 text-[13px] outline-none focus:border-[#8aa2e8]"
                      />
                      {canCreateJob ? (
                        <button type="button" disabled={creatingCategory} onClick={handleCreateJob} className="rounded-[14px] border border-[#171b24] px-4 py-3 text-[13px] font-semibold text-[#171b24] disabled:opacity-60">
                          {creatingCategory ? "생성 중..." : "직무 추가"}
                        </button>
                      ) : <div />}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {visibleJobs.map((job) => (
                        <FilterChip
                          key={job.categoryId}
                          label={job.displayName || job.name}
                          active={String(job.categoryId) === jobFilter}
                          onClick={() => setJobFilter(String(job.categoryId))}
                        />
                      ))}
                      {!visibleJobs.length && !loadingPage ? <span className="text-[12px] text-[#7a8190]">표시할 직무가 없습니다.</span> : null}
                    </div>
                  </CategoryCard>

                  <CategoryCard title="기술 카테고리 선택" description="모의면접에는 기술질문이 40% 비율로 포함됩니다. 직무를 먼저 고른 뒤 기술을 선택하거나 직접 추가해 주세요.">
                    <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                      <input
                        value={skillQuery}
                        onChange={(event) => setSkillQuery(event.target.value)}
                        placeholder={jobFilter ? "기술 검색 또는 새 기술 입력" : "직무를 먼저 선택해 주세요"}
                        disabled={!jobFilter}
                        className="rounded-[14px] border border-[#dfe3eb] px-4 py-3 text-[13px] outline-none focus:border-[#8aa2e8] disabled:bg-[#f4f6f8]"
                      />
                      {canCreateSkill ? (
                        <button type="button" disabled={creatingCategory} onClick={handleCreateSkill} className="rounded-[14px] border border-[#171b24] px-4 py-3 text-[13px] font-semibold text-[#171b24] disabled:opacity-60">
                          {creatingCategory ? "생성 중..." : "기술 추가"}
                        </button>
                      ) : <div />}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {visibleSkills.map((skill) => (
                        <FilterChip
                          key={skill.categoryId}
                          label={skill.label}
                          active={String(skill.categoryId) === selectedCategoryId}
                          onClick={() => setSelectedCategoryId(String(skill.categoryId))}
                        />
                      ))}
                      {!visibleSkills.length && jobFilter ? <span className="text-[12px] text-[#7a8190]">현재 직무에 등록된 기술이 없습니다. 직접 추가하시면 바로 사용하실 수 있습니다.</span> : null}
                    </div>
                  </CategoryCard>

                  <CategoryCard title="서류 선택" description="AI 분석이 끝난 서류만 노출됩니다. 포트폴리오는 선택 사항이며, 문서가 1개 이상이면 시작하실 수 있습니다. OCR fallback이 사용된 문서는 배지를 함께 표시합니다.">
                    <div className="grid gap-4 md:grid-cols-3">
                      {DOCUMENT_TYPES.map((documentType) => {
                        const files = filesByType[documentType.key] || [];
                        return (
                          <div key={documentType.key} className="rounded-[18px] border border-[#e4e7ee] bg-[#f8fafc] p-4">
                            <p className="text-[12px] font-semibold text-[#6a7383]">{documentType.label}</p>
                            <div className="mt-3 space-y-2">
                              <button
                                type="button"
                                onClick={() => setSelectedFiles((prev) => ({ ...prev, [documentType.key]: "" }))}
                                className={`block w-full rounded-xl border px-3 py-2 text-left text-[12px] ${!selectedFiles[documentType.key] ? "border-[#171b24] bg-[#171b24] text-white" : "border-[#d7dce5] bg-white text-[#485160]"}`}
                              >
                                미선택
                              </button>
                              {files.map((file) => {
                                const fileId = String(file?.fileId || file?.file_id || "");
                                const active = String(selectedFiles[documentType.key] || "") === fileId;
                                return (
                                  <button
                                    key={`${documentType.key}-${fileId}`}
                                    type="button"
                                    onClick={() => setSelectedFiles((prev) => ({ ...prev, [documentType.key]: fileId }))}
                                    className={`block w-full rounded-xl border px-3 py-2 text-left text-[12px] ${active ? "border-[#171b24] bg-[#171b24] text-white" : "border-[#d7dce5] bg-white text-[#485160]"}`}
                                  >
                                    <span className="flex min-w-0 items-center gap-2">
                                      <span className="truncate">{resolveDisplayFileName(file)}</span>
                                      {file?.ocrUsed ? <OcrInfoBadge compact /> : null}
                                    </span>
                                  </button>
                                );
                              })}
                              {!loadingPage && !files.length ? <p className="text-[11px] text-[#7a8190]">분석 완료된 파일이 없습니다.</p> : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 rounded-[14px] border border-[#e6eaf2] bg-[#fbfcfe] px-4 py-3">
                      <p className="text-[12px] leading-[1.7] text-[#5e6472]">
                        면접 시작 전, 이력서/자기소개서 업로드 및 AI 분석 완료가 반드시 선행되어야 합니다.
                      </p>
                      <div className="mt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => navigate("/content/files")}
                          className="rounded-[10px] border border-[#171b24] px-3 py-1.5 text-[12px] font-semibold text-[#171b24]"
                        >
                          이력서 및 자기소개서 업로드 페이지로 이동
                        </button>
                      </div>
                    </div>
                  </CategoryCard>
                </div>

                <div className="space-y-5">
                  <CategoryCard title="난이도와 문항 수" description="모의면접은 최소 5문항이며, 기술질문은 전체의 40% 비율로 자동 배분됩니다.">
                    <div className="rounded-[18px] border border-[#eef1f5] bg-[#fafbfd] p-4">
                      <p className="text-[12px] font-semibold text-[#6a7383]">난이도</p>
                      <div className="mt-3 flex items-center gap-3">
                        <StarRatingInput value={selectedRating} onChange={setSelectedRating} />
                        <div className="inline-flex items-center gap-2 rounded-full border border-[#f3ddad] bg-[#fff8e8] px-3 py-1 text-[12px] text-[#8a5a00]">
                          <StarIcons rating={selectedRating} />
                          <span className="font-medium">{selectedRating} / 5</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 rounded-[18px] border border-[#eef1f5] bg-[#fafbfd] p-4">
                      <p className="text-[12px] font-semibold text-[#6a7383]">문항 수</p>
                      <div className="mt-3 flex items-center gap-3">
                        <input
                          type="number"
                          min={5}
                          max={20}
                          value={selectedQuestionCount}
                          onChange={(event) => setSelectedQuestionCount(Math.max(5, Number(event.target.value) || 5))}
                          className="w-30 rounded-[14px] border border-[#dfe3eb] px-4 py-3 text-[13px] outline-none focus:border-[#8aa2e8]"
                        />
                        <span className="text-[12px] text-[#6a7383]">최소 5문항, 최대 20문항</span>
                      </div>
                    </div>
                  </CategoryCard>

                  <CategoryCard title="선택 요약" description="세션 상단에 그대로 표시되는 메타 정보입니다.">
                    <div className="flex flex-wrap gap-2">
                      {selectedJob ? <span className="rounded-full border border-[#d8dde7] bg-white px-3 py-1 text-[12px] text-[#4f5664]">{selectedJob.displayName || selectedJob.name}</span> : null}
                      <span className="rounded-full border border-[#d8dde7] bg-white px-3 py-1 text-[12px] text-[#4f5664]">
                        {selectedSkill?.displayName || selectedSkill?.name || "기술 미선택"}
                      </span>
                      <span className="rounded-full border border-[#d8dde7] bg-white px-3 py-1 text-[12px] text-[#4f5664]">문항 {selectedQuestionCount}개</span>
                      {DOCUMENT_TYPES.map((type) => {
                        const file = selectedFileObjects[type.key];
                        return (
                          <span key={type.key} className="inline-flex items-center gap-1.5 rounded-full border border-[#d8dde7] bg-white px-3 py-1 text-[12px] text-[#4f5664]">
                            <span>{file ? resolveDisplayFileName(file) : `${type.label} 미선택`}</span>
                            {file?.ocrUsed ? <OcrInfoBadge compact /> : null}
                          </span>
                        );
                      })}
                    </div>
                    {pageErrorMessage ? <p className="mt-4 text-[12px] text-[#dc4b4b]">{pageErrorMessage}</p> : null}
                    <div className="mt-6 flex items-center justify-between gap-3">
                      {startingInterview ? <InlineSpinner label="면접 세션과 질문을 생성하고 있습니다." /> : <span />}
                      <button type="button" onClick={handleStartInterview} disabled={loadingPage || startingInterview} className="rounded-[14px] bg-[#171b24] px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60">
                        {startingInterview ? "면접 생성 중..." : "면접 시작"}
                      </button>
                    </div>
                  </CategoryCard>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {startingInterview ? (
        <BlockingLoadingOverlay
          title="면접 세션을 준비하는 중입니다"
          description="질문 생성이 완료될 때까지 잠시만 기다려 주세요. 이 과정에서는 다른 화면으로 이동할 수 없습니다."
        />
      ) : null}
      {showLogoutModal ? <LogoutConfirmModal onCancel={() => setShowLogoutModal(false)} onConfirm={handleLogoutConfirm} /> : null}
      {showPointChargeModal ? (
        <PointChargeModal
          onClose={() => setShowPointChargeModal(false)}
          onCharged={(result) => {
            setUserPoint(parsePoint(result?.currentPoint));
            setShowPointChargeSuccessModal(true);
          }}
        />
      ) : null}
      {showPointChargeSuccessModal ? <PointChargeSuccessModal onClose={() => setShowPointChargeSuccessModal(false)} /> : null}
      {showGeminiOverloadModal ? <GeminiOverloadModal onClose={() => setShowGeminiOverloadModal(false)} /> : null}
      {showPrereqGuideModal ? (
        <InterviewPrerequisiteGuideModal
          onClose={() => setShowPrereqGuideModal(false)}
          onMoveToUpload={() => {
            setShowPrereqGuideModal(false);
            navigate("/content/files");
          }}
        />
      ) : null}
    </div>
  );
};
