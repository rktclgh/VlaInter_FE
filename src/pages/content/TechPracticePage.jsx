import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ContentTopNav } from "../../components/ContentTopNav";
import { MobileSidebarDrawer } from "../../components/MobileSidebarDrawer";
import { GeminiOverloadModal } from "../../components/GeminiOverloadModal";
import { JobSkillExampleModal } from "../../components/JobSkillExampleModal";
import { PointChargeModal } from "../../components/PointChargeModal";
import { PointChargeSuccessModal } from "../../components/PointChargeSuccessModal";
import { ResumeSessionModal } from "../../components/ResumeSessionModal";
import { Sidebar } from "../../components/Sidebar";
import { StarIcons, StarRatingInput } from "../../components/DifficultyStars";
import tempProfileImage from "../../assets/icon/temp.png";
import { isAuthenticationError } from "../../lib/apiClient";
import { logout } from "../../lib/authApi";
import { filterSkillCategoriesByBranchAndJob, getCategoryDisplayName, searchCategoryByText } from "../../lib/categoryPresentation";
import { ratingToDifficulty } from "../../lib/difficultyRating";
import { buildResumedSessionSnapshot } from "../../lib/resumeInterviewSession";
import { saveTechInterviewSession } from "../../lib/interviewSessionFlow";
import { consumePointChargeSuccessResult } from "../../lib/pointChargeFlow";
import { createInterviewCategory, dismissTechSession, getInterviewCategories, getLatestIncompleteTechSession, startTechInterview } from "../../lib/interviewApi";
import { isGeminiOverloadError } from "../../lib/geminiErrorUtils";
import { getInterviewLanguageLabel, INTERVIEW_LANGUAGE_OPTIONS, normalizeInterviewLanguage } from "../../lib/interviewLanguage";
import { extractProfile } from "../../lib/profileUtils";
import { getMyProfile, getMyProfileImageUrl } from "../../lib/userApi";

const QUESTION_COUNT = 5;
const DEFAULT_RATING = 3;
const QUICK_START_PAGE_SIZE = 3;

const formatPoint = (value) => `${new Intl.NumberFormat("ko-KR").format(Number(value) || 0)}P`;
const parsePoint = (rawValue) => {
  if (typeof rawValue === "number") return rawValue;
  if (typeof rawValue === "string") {
    const normalized = rawValue.replace(/,/g, "").trim();
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};
const LogoutConfirmModal = ({ onCancel, onConfirm }) => (
  <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/35 px-4">
    <div className="w-full max-w-105 rounded-2xl border border-[#d9d9d9] bg-white p-5">
      <p className="text-[15px] font-medium text-[#252525]">정말 로그아웃 하시겠습니까?<br />저장되지 않은 작업은 유지되지 않습니다.</p>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-[10px] border border-[#d6d6d6] px-3 py-1.5 text-[12px] text-[#666]">취소</button>
        <button type="button" onClick={onConfirm} className="rounded-[10px] border border-[#1f1f1f] bg-[#1f1f1f] px-3 py-1.5 text-[12px] text-white">로그아웃</button>
      </div>
    </div>
  </div>
);

const CategoryCard = ({ title, description, children, className = "" }) => (
  <section className={`space-y-3 ${className}`}>
    <div>
      <p className={SECTION_TITLE_CLASS}>{title}</p>
      {description ? <p className={SECTION_DESCRIPTION_CLASS}>{description}</p> : null}
    </div>
    <div className="max-w-208 space-y-3">
      {children}
    </div>
  </section>
);

const FilterChip = ({ label, active = false, onClick, disabled = false }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`rounded-full p-px transition disabled:opacity-50 ${
      active ? GRADIENT_BORDER_CLASS : "bg-[#EDEDED]"
    }`}
  >
    <span className={`inline-flex min-h-6.5 min-w-12.75 items-center justify-center rounded-full bg-white px-3 text-[0.75rem] font-normal tracking-[0.02em] ${
      active ? "text-[#000000]" : "text-[#B5B5B5]"
    }`}>
      {label}
    </span>
  </button>
);

const SelectionPillButton = ({
  active = false,
  disabled = false,
  onClick,
  className = "",
  innerClassName = "",
  minHeightClass = "min-h-[2.625rem]",
  children,
}) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className={`rounded-2xl p-px transition disabled:opacity-50 ${active ? GRADIENT_BORDER_CLASS : "bg-[#C9C9C9]"} ${className}`}
  >
    <span className={`flex h-full w-full items-center justify-center rounded-[calc(1rem-1px)] bg-white px-4 text-center text-[0.8125rem] font-medium tracking-[0.02em] ${
      active ? "text-[#000000]" : "text-[#AFAFAF]"
    } ${minHeightClass} ${innerClassName}`}>
      {children}
    </span>
  </button>
);

const SummaryChip = ({ children, tone = "default" }) => (
  <span
    className={`inline-flex items-center rounded-full border bg-white px-3 py-1.5 text-[0.75rem] font-normal tracking-[0.02em] ${
      tone === "accent"
        ? "border-[#CFCFCF] text-[#000000]"
        : "border-[#E3E3E3] text-[#6D6D6D]"
    }`}>
    {children}
  </span>
);

const HelpIconButton = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-[0.9375rem] font-medium text-[#9E9E9E] shadow-[inset_0_0_0.1875rem_rgba(0,0,0,0.25)] transition hover:bg-[#fafafa]"
    aria-label="직무와 기술 입력 예시 보기"
  >
    ?
  </button>
);

const QuickStartCard = ({ category, rating, onStart, disabled, starting }) => {
  const tags = [category.branchName, category.jobName, category.name].filter(Boolean).slice(0, 3);

  return (
    <article className="rounded-2xl border border-[#EDEDED] bg-white px-5 py-4 shadow-[0_0_0.1875rem_rgba(0,0,0,0.08)]">
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <SummaryChip key={`${category.categoryId}-${tag}`}>{tag}</SummaryChip>
        ))}
      </div>
      <h3 className="mt-4 text-[1.5rem] font-medium tracking-[0] text-[#000000]">{category.name}</h3>
      <p className="mt-1 text-[0.75rem] leading-[1.7] tracking-[0.02em] text-[#9E9E9E]">선택한 난이도로 바로 연습을 시작할 수 있습니다.</p>
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="rounded-[0.875rem] bg-white px-3 py-2 shadow-[0_0_0.1875rem_rgba(0,0,0,0.18)]">
          <StarIcons rating={rating} sizeClass="text-[10px]" />
        </div>
        <SelectionPillButton active={!disabled} disabled={disabled} onClick={onStart} className="min-w-26" minHeightClass="min-h-[2.125rem]">
          {starting ? "시작 중..." : "빠른 시작"}
        </SelectionPillButton>
      </div>
    </article>
  );
};

const normalizeCategoryName = (value) => String(value || "").trim().toLowerCase();
const GRADIENT_BORDER_CLASS = "bg-[linear-gradient(45deg,#5D83DE_0%,#FF1C91_100%)]";
const SECTION_TITLE_CLASS = "text-[0.875rem] font-medium tracking-[0.02em] text-[#4B4B4B]";
const SECTION_DESCRIPTION_CLASS = "mt-1 text-[0.75rem] font-normal leading-[1.7] tracking-[0.02em] text-[#9E9E9E]";
const TEXT_INPUT_CLASS = "min-h-10.25 w-full rounded-[0.6875rem] border border-[#EDEDED] bg-white px-[0.9375rem] py-[0.75rem] text-[0.75rem] font-normal tracking-[0.02em] text-[#4B4B4B] shadow-[inset_0_0_0.1875rem_rgba(0,0,0,0.25)] placeholder:text-[#CCCCCC] disabled:bg-[#FAFAFA] disabled:text-[#BDBDBD]";
const SUB_COPY_CLASS = "text-[0.75rem] font-normal leading-[1.65] tracking-[0.02em] text-[#8F8F8F]";

export const TechPracticePage = () => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("사용자");
  const [userPoint, setUserPoint] = useState(0);
  const [profileImageUrl, setProfileImageUrl] = useState(tempProfileImage);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showPointChargeModal, setShowPointChargeModal] = useState(false);
  const [showPointChargeSuccessModal, setShowPointChargeSuccessModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [startingCategoryId, setStartingCategoryId] = useState(null);
  const [categories, setCategories] = useState([]);
  const [branchFilter, setBranchFilter] = useState("");
  const [branchQuery, setBranchQuery] = useState("");
  const [jobFilter, setJobFilter] = useState("");
  const [jobQuery, setJobQuery] = useState("");
  const [categoryQuery, setCategoryQuery] = useState("");
  const [selectedSkillId, setSelectedSkillId] = useState("");
  const [selectedRating, setSelectedRating] = useState(DEFAULT_RATING);
  const [selectedLanguage, setSelectedLanguage] = useState("KO");
  const [quickStartPage, setQuickStartPage] = useState(0);
  const [pageErrorMessage, setPageErrorMessage] = useState("");
  const [showGeminiOverloadModal, setShowGeminiOverloadModal] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [pendingResumeSession, setPendingResumeSession] = useState(null);
  const [resumeModalBusy, setResumeModalBusy] = useState(false);
  const [resumeSessionChecked, setResumeSessionChecked] = useState(false);
  const [showExampleModal, setShowExampleModal] = useState(false);
  const isStartingPractice = startingCategoryId !== null;

  const loadCatalog = async ({ preferredBranchName = "", preferredJobName = "", preferredSkillName = "" } = {}) => {
    const payload = await getInterviewCategories();
    const nextCategories = Array.isArray(payload) ? payload : [];
    setCategories(nextCategories);

    const branches = nextCategories.filter((item) => Number(item?.depth) === 0);
    const jobs = nextCategories.filter((item) => Number(item?.depth) === 1);
    const skills = nextCategories.filter((item) => Number(item?.depth) === 2);

    const normalizedPreferredBranchName = String(preferredBranchName || "").trim().toLowerCase();
    const matchedBranch = normalizedPreferredBranchName
      ? branches.find((branch) => String(branch?.name || "").trim().toLowerCase() === normalizedPreferredBranchName)
      : null;
    const nextBranchFilter = matchedBranch?.categoryId ? String(matchedBranch.categoryId) : "";
    if (nextBranchFilter) {
      setBranchFilter(nextBranchFilter);
    } else {
      setBranchFilter((prev) => {
        if (prev && branches.some((branch) => String(branch.categoryId) === String(prev))) return prev;
        return "";
      });
    }

    const normalizedPreferredJobName = String(preferredJobName || "").trim().toLowerCase();
    const scopedJobs = nextBranchFilter ? jobs.filter((job) => String(job.parentId || "") === String(nextBranchFilter)) : jobs;
    const matchedJob = normalizedPreferredJobName
      ? scopedJobs.find((job) => String(job?.name || "").trim().toLowerCase() === normalizedPreferredJobName)
        || jobs.find((job) => String(job?.name || "").trim().toLowerCase() === normalizedPreferredJobName)
      : null;
    const nextJobFilter = matchedJob?.categoryId ? String(matchedJob.categoryId) : "";
    if (nextJobFilter) {
      setJobFilter(nextJobFilter);
    } else {
      setJobFilter((prev) => {
        if (prev && jobs.some((job) => String(job.categoryId) === String(prev))) return prev;
        return "";
      });
    }

    const normalizedPreferredSkillName = String(preferredSkillName || "").trim().toLowerCase();
    if (normalizedPreferredSkillName) {
      const scopedSkills = nextJobFilter ? skills.filter((skill) => String(skill.parentId || "") === String(nextJobFilter)) : skills;
      const preferredSkill = scopedSkills.find((skill) => String(skill?.name || "").trim().toLowerCase() === normalizedPreferredSkillName)
        || skills.find((skill) => String(skill?.name || "").trim().toLowerCase() === normalizedPreferredSkillName);
      if (preferredSkill) {
        setCategoryQuery(String(preferredSkill.name || "").trim());
        setSelectedSkillId(String(preferredSkill.categoryId || ""));
      }
    }
  };

  useEffect(() => {
    const charged = consumePointChargeSuccessResult();
    if (!charged) return;
    setUserPoint(parsePoint(charged?.currentPoint));
    setShowPointChargeSuccessModal(true);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const profilePayload = await getMyProfile();
        const profile = extractProfile(profilePayload);
        setUserName(profile?.name || "사용자");
        setUserPoint(parsePoint(profile?.point));
        setProfileImageUrl(getMyProfileImageUrl());
      } catch (error) {
        if (isAuthenticationError(error)) {
          navigate("/login", { replace: true });
          return;
        }
      }

      try {
        await loadCatalog();
      } catch (error) {
        setPageErrorMessage(error?.message || "기술질문 연습 카테고리를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [navigate]);

  useEffect(() => {
    if (loading || resumeSessionChecked) return;
    let cancelled = false;

    const loadIncompleteSession = async () => {
      try {
        const response = await getLatestIncompleteTechSession("TECH");
        if (!cancelled) {
          setPendingResumeSession(response || null);
        }
      } catch {
        if (!cancelled) {
          setPendingResumeSession(null);
        }
      } finally {
        if (!cancelled) {
          setResumeSessionChecked(true);
        }
      }
    };

    void loadIncompleteSession();
    return () => {
      cancelled = true;
    };
  }, [loading, resumeSessionChecked]);

  const branchItems = useMemo(() => categories.filter((item) => Number(item.depth) === 0), [categories]);
  const visibleBranches = useMemo(() => branchItems.filter((branch) => searchCategoryByText(branch, branchQuery)), [branchItems, branchQuery]);
  const jobs = useMemo(() => categories.filter((item) => Number(item.depth) === 1), [categories]);
  const categoryMap = useMemo(() => new Map(categories.map((item) => [item.categoryId, item])), [categories]);
  const visibleJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (!searchCategoryByText(job, jobQuery)) return false;
      return !branchFilter || String(job.parentId || "") === String(branchFilter);
    });
  }, [branchFilter, jobQuery, jobs]);
  const skillCategories = useMemo(() => categories.filter((item) => Number(item.depth) === 2), [categories]);
  const visibleSkills = useMemo(() => {
    return filterSkillCategoriesByBranchAndJob({
      categories,
      branchId: branchFilter,
      jobId: jobFilter,
      keyword: categoryQuery,
    })
      .map((category) => ({
        ...category,
        name: category.displayName || getCategoryDisplayName(category),
        jobName: getCategoryDisplayName(jobs.find((job) => job.categoryId === category.parentId)) || "기타",
        branchName: getCategoryDisplayName(categoryMap.get(categoryMap.get(category.parentId)?.parentId)) || "기타",
      }));
  }, [branchFilter, categories, categoryMap, categoryQuery, jobFilter, jobs]);
  const selectedSkillCategory = useMemo(
    () => visibleSkills.find((category) => String(category.categoryId) === String(selectedSkillId)) || null,
    [selectedSkillId, visibleSkills]
  );

  const selectedBranch = useMemo(() => branchItems.find((item) => String(item.categoryId) === String(branchFilter)) || null, [branchFilter, branchItems]);
  const selectedJob = useMemo(() => jobs.find((item) => String(item.categoryId) === String(jobFilter)) || null, [jobFilter, jobs]);
  const normalizedBranchQuery = normalizeCategoryName(branchQuery);
  const normalizedJobQuery = normalizeCategoryName(jobQuery);
  const normalizedCategoryQuery = normalizeCategoryName(categoryQuery);
  const branchAlreadyExists = Boolean(
    normalizedBranchQuery &&
      branchItems.some((branch) => normalizeCategoryName(branch.name) === normalizedBranchQuery)
  );
  const jobAlreadyExists = Boolean(
    branchFilter &&
      normalizedJobQuery &&
      visibleJobs.some((job) => normalizeCategoryName(job.displayName || job.name) === normalizedJobQuery)
  );
  const categoryAlreadyExists = Boolean(
    jobFilter &&
      normalizedCategoryQuery &&
      skillCategories
        .filter((item) => String(item.parentId || "") === String(jobFilter))
        .some((item) => normalizeCategoryName(item.displayName || item.name) === normalizedCategoryQuery)
  );
  const canCreateBranch = Boolean(normalizedBranchQuery && !branchAlreadyExists);
  const canCreateJob = Boolean(branchFilter && normalizedJobQuery && !jobAlreadyExists);
  const canCreateCategory = Boolean(jobFilter && normalizedCategoryQuery && !categoryAlreadyExists);
  const availableJobsForBranch = useMemo(() => jobs.filter((job) => !branchFilter || String(job.parentId || "") === String(branchFilter)), [branchFilter, jobs]);
  const availableSkillsForJob = useMemo(() => filterSkillCategoriesByBranchAndJob({
    categories,
    branchId: branchFilter,
    jobId: jobFilter,
    keyword: "",
  }), [branchFilter, categories, jobFilter]);
  const quickStartPageCount = Math.max(1, Math.ceil(visibleSkills.length / QUICK_START_PAGE_SIZE));
  const quickStartCategories = useMemo(
    () => visibleSkills.slice(quickStartPage * QUICK_START_PAGE_SIZE, (quickStartPage + 1) * QUICK_START_PAGE_SIZE),
    [quickStartPage, visibleSkills]
  );
  const primaryStartCategory = selectedSkillCategory || quickStartCategories[0] || visibleSkills[0] || null;

  useEffect(() => {
    if (!branchFilter) return;
    if (availableJobsForBranch.some((job) => String(job.categoryId) === String(jobFilter))) return;
    setJobFilter("");
    setSelectedSkillId("");
  }, [availableJobsForBranch, branchFilter, jobFilter]);

  useEffect(() => {
    if (!selectedSkillId) return;
    if (availableSkillsForJob.some((skill) => String(skill.categoryId) === String(selectedSkillId))) return;
    setSelectedSkillId("");
  }, [availableSkillsForJob, selectedSkillId]);

  useEffect(() => {
    setQuickStartPage(0);
  }, [branchFilter, jobFilter, categoryQuery]);

  useEffect(() => {
    if (quickStartPage < quickStartPageCount) return;
    setQuickStartPage(Math.max(0, quickStartPageCount - 1));
  }, [quickStartPage, quickStartPageCount]);

  const handleSidebarNavigate = (item) => {
    if (isStartingPractice) return;
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

  const handleStartPractice = async (category) => {
    if (isStartingPractice) return;
    if (!category) return;
    setStartingCategoryId(category.categoryId || category.name);
    setPageErrorMessage("");
    try {
      const response = await startTechInterview({
        categoryId: category.categoryId || null,
        questionCount: QUESTION_COUNT,
        difficulty: ratingToDifficulty(selectedRating),
        language: selectedLanguage,
      });
      if (!response?.sessionId || !response?.currentQuestion) {
        setPageErrorMessage("연습 세션은 생성되었지만 첫 질문을 불러오지 못했습니다.");
        return;
      }
      saveTechInterviewSession({
        sessionId: response.sessionId,
        currentQuestion: response.currentQuestion,
        pendingResult: null,
        completed: false,
        metadata: {
          apiBasePath: "/api/interview/tech",
          language: normalizeInterviewLanguage(response.language || selectedLanguage),
          categoryName: category.name,
          difficultyLabel: ratingToDifficulty(selectedRating),
          difficultyRating: selectedRating,
          questionCount: QUESTION_COUNT,
          selectedDocuments: {},
          providerUsed: response.providerUsed || null,
          fallbackDepth: Number(response.fallbackDepth || 0),
          paidFallbackPopupPending: String(response.providerUsed || "").toUpperCase() === "BEDROCK",
        },
      });
      navigate("/content/interview/session");
    } catch (error) {
      if (isGeminiOverloadError(error)) {
        setShowGeminiOverloadModal(true);
        setPageErrorMessage("");
        return;
      }
      setPageErrorMessage(error?.message || "기술질문 연습 시작에 실패했습니다.");
    } finally {
      setStartingCategoryId(null);
    }
  };

  const handleCreateCategory = async () => {
    if (!jobFilter || !categoryQuery.trim()) return;
    setCreatingCategory(true);
    setPageErrorMessage("");
    try {
      const created = await createInterviewCategory({
        parentId: Number(jobFilter),
        name: categoryQuery.trim(),
      });
      const displayName = (created?.name || categoryQuery.trim()).trim();
      await loadCatalog({
        preferredBranchName: selectedBranch?.name || "",
        preferredJobName: selectedJob?.name || "",
        preferredSkillName: displayName,
      });
      setSelectedSkillId(String(created?.categoryId || ""));
    } catch (error) {
      setPageErrorMessage(error?.message || "카테고리 생성에 실패했습니다.");
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleCreateJob = async () => {
    if (!branchFilter || !jobQuery.trim()) return;
    setCreatingCategory(true);
    setPageErrorMessage("");
    try {
      const created = await createInterviewCategory({
        parentId: Number(branchFilter),
        name: jobQuery.trim(),
      });
      const displayName = (created?.name || jobQuery.trim()).trim();
      await loadCatalog({ preferredBranchName: selectedBranch?.name || "", preferredJobName: displayName });
      setJobQuery("");
      setCategoryQuery("");
      setSelectedSkillId("");
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
      await loadCatalog({ preferredBranchName: displayName });
      setBranchQuery("");
      setJobQuery("");
      setCategoryQuery("");
      setSelectedSkillId("");
    } catch (error) {
      setPageErrorMessage(error?.message || "계열 생성에 실패했습니다.");
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleResumePractice = async () => {
    if (!pendingResumeSession) return;
    setResumeModalBusy(true);
    try {
      const snapshot = buildResumedSessionSnapshot(pendingResumeSession, {
        apiBasePath: "/api/interview/tech",
      });
      if (!snapshot) {
        setPendingResumeSession(null);
        return;
      }
      saveTechInterviewSession(snapshot);
      navigate("/content/interview/session");
    } finally {
      setResumeModalBusy(false);
    }
  };

  const handleDismissPracticeResume = async () => {
    if (!pendingResumeSession?.sessionId) {
      setPendingResumeSession(null);
      return;
    }
    setResumeModalBusy(true);
    try {
      await dismissTechSession(pendingResumeSession.sessionId);
      setPendingResumeSession(null);
    } catch (error) {
      setPageErrorMessage(error?.message || "미완료 기술질문 세션 종료에 실패했습니다.");
    } finally {
      setResumeModalBusy(false);
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-white pt-15">
      <ContentTopNav
        variant="mockStart"
        point={formatPoint(userPoint)}
        onClickCharge={() => { if (!isStartingPractice) setShowPointChargeModal(true); }}
        onOpenMenu={() => { if (!isStartingPractice) setIsMobileMenuOpen(true); }}
      />

      <MobileSidebarDrawer
        open={isMobileMenuOpen}
        activeKey="tech_practice"
        variant="mockStart"
        onClose={() => setIsMobileMenuOpen(false)}
        onNavigate={handleSidebarNavigate}
        userName={userName}
        profileImageUrl={profileImageUrl}
        point={formatPoint(userPoint)}
        onClickCharge={() => { if (!isStartingPractice) setShowPointChargeModal(true); }}
        interactionDisabled={isStartingPractice}
        onLogout={() => { setIsMobileMenuOpen(false); setShowLogoutModal(true); }}
      />

      <div className="flex min-h-[calc(100vh-3.75rem)]">
        <div className="hidden w-68 shrink-0 md:block">
          <Sidebar
            activeKey="tech_practice"
            variant="mockStart"
            onNavigate={handleSidebarNavigate}
            userName={userName}
            profileImageUrl={profileImageUrl}
            onLogout={() => setShowLogoutModal(true)}
          />
        </div>

        <main className="flex min-w-0 flex-1 flex-col bg-white">
          <div className="flex-1 overflow-y-auto px-4 pb-10 pt-8 sm:px-6 md:px-8 md:pt-10 xl:px-10">
          <div className="mx-auto w-full max-w-392">
            <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.08fr)_minmax(16rem,16.375rem)] xl:gap-9">
              <section className="min-w-0 flex-1 xl:max-w-208">
                <header>
                  <h1 className="text-[clamp(2.1rem,3vw,2.25rem)] font-medium tracking-[0] text-[#000000]">기술질문 연습</h1>
                  <p className="mt-3 max-w-196 text-[0.9375rem] leading-[1.9] tracking-[0] text-[#5C5C5C]">
                    직무 및 기술에 대한 분야별 맞춤 면접 시스템입니다. 직무와 기술 카테고리, 난이도를 고르면 해당 기준에 맞는 기술질문 연습을 바로 시작하실 수 있습니다.
                  </p>
                </header>

                <section className="mt-5 flex w-full max-w-146 items-center justify-between gap-4 rounded-[1.25rem] bg-[#FDFDFD] px-5 py-4 shadow-[0_0_0.1875rem_rgba(0,0,0,0.25)]">
                  <div>
                    <p className="text-[0.875rem] font-medium tracking-[0.02em] text-[#9E9E9E]">입력 가이드</p>
                    <p className="mt-1 text-[0.9375rem] font-normal tracking-[0.02em] text-[#535353]">계열, 직무, 기술의 범위에 대한 가이드입니다</p>
                  </div>
                  <HelpIconButton onClick={() => setShowExampleModal(true)} />
                </section>

                <div className="mt-8 max-w-208 space-y-7">
                  <CategoryCard title="계열 선택" description="계열을 먼저 선택하면 직무 및 기술 후보를 빠르게 선택 가능합니다">
                    <input
                      value={branchQuery}
                      onChange={(event) => setBranchQuery(event.target.value)}
                      placeholder="계열 검색 또는 새 계열 입력"
                      className={`${TEXT_INPUT_CLASS} max-w-124.75`}
                    />
                    <div className="flex flex-wrap gap-2">
                      {visibleBranches.map((branch) => (
                        <FilterChip
                          key={branch.categoryId}
                          label={branch.name}
                          active={branchFilter === String(branch.categoryId)}
                          onClick={() => {
                            setBranchFilter(String(branch.categoryId));
                            setJobFilter("");
                            setSelectedSkillId("");
                          }}
                        />
                      ))}
                    </div>
                    {!visibleBranches.length && !loading ? <p className={SUB_COPY_CLASS}>표시할 계열이 없습니다.</p> : null}
                    {canCreateBranch ? (
                      <button type="button" disabled={creatingCategory} onClick={handleCreateBranch} className="min-h-10.25 w-fit rounded-[0.875rem] border border-[#D8D8D8] bg-white px-4 text-[0.75rem] font-medium tracking-[0.02em] text-[#444444] disabled:opacity-60">
                        {creatingCategory ? "생성 중..." : "계열 추가"}
                      </button>
                    ) : null}
                    <p className={`text-[0.75rem] tracking-[0.02em] ${branchAlreadyExists ? "text-[#d14343]" : "text-[#9A9A9A]"}`}>
                      {branchAlreadyExists ? "같은 이름의 계열이 이미 있습니다. 중복 입력은 제한됩니다." : "없는 계열은 직접 추가할 수 있습니다."}
                    </p>
                  </CategoryCard>

                  <CategoryCard title="직무 선택" description="직무 추가는 한글로만 입력 가능합니다">
                    <input
                      value={jobQuery}
                      onChange={(event) => setJobQuery(event.target.value)}
                      placeholder="직무 검색 또는 새 직무 입력"
                      disabled={!branchFilter}
                      className={`${TEXT_INPUT_CLASS} max-w-124.75`}
                    />
                    <div className="flex flex-wrap gap-2">
                      {visibleJobs.map((job) => (
                        <FilterChip
                          key={job.categoryId}
                          label={job.displayName || getCategoryDisplayName(job)}
                          active={jobFilter === String(job.categoryId)}
                          onClick={() => {
                            setJobFilter(String(job.categoryId));
                            setSelectedSkillId("");
                          }}
                          disabled={!branchFilter}
                        />
                      ))}
                    </div>
                    {!visibleJobs.length && !loading ? <p className={SUB_COPY_CLASS}>표시할 직무가 없습니다.</p> : null}
                    {canCreateJob ? (
                      <button type="button" disabled={creatingCategory} onClick={handleCreateJob} className="min-h-10.25 w-fit rounded-[0.875rem] border border-[#D8D8D8] bg-white px-4 text-[0.75rem] font-medium tracking-[0.02em] text-[#444444] disabled:opacity-60">
                        {creatingCategory ? "생성 중..." : "직무 추가"}
                      </button>
                    ) : null}
                    <p className={`text-[0.75rem] tracking-[0.02em] ${jobAlreadyExists ? "text-[#d14343]" : "text-[#9A9A9A]"}`}>
                      {jobAlreadyExists ? "같은 이름의 직무가 이미 있습니다." : "새로 만든 직무는 바로 선택됩니다."}
                    </p>
                  </CategoryCard>

                  <CategoryCard title="기술 카테고리 선택" description="모의면접에는 40% 비율로 기술질문이 포함되며, 최대 3개까지 선택 가능합니다">
                    <input
                      value={categoryQuery}
                      onChange={(event) => setCategoryQuery(event.target.value)}
                      placeholder="기술 검색 또는 새 기술 입력"
                      disabled={!jobFilter}
                      className={`${TEXT_INPUT_CLASS} max-w-124.75`}
                    />
                    <div className="flex flex-wrap gap-2">
                      {visibleSkills.map((skill) => (
                        <FilterChip
                          key={skill.categoryId}
                          label={skill.isCommon ? `${skill.name} · 공통` : skill.name}
                          active={selectedSkillId === String(skill.categoryId)}
                          onClick={() => setSelectedSkillId(String(skill.categoryId))}
                          disabled={!jobFilter}
                        />
                      ))}
                    </div>
                    {!visibleSkills.length && jobFilter ? <p className={SUB_COPY_CLASS}>현재 직무에 등록된 기술이 없습니다. 직접 추가하시면 바로 사용하실 수 있습니다.</p> : null}
                    {canCreateCategory ? (
                      <button type="button" disabled={creatingCategory} onClick={handleCreateCategory} className="min-h-10.25 w-fit rounded-[0.875rem] border border-[#D8D8D8] bg-white px-4 text-[0.75rem] font-medium tracking-[0.02em] text-[#444444] disabled:opacity-60">
                        {creatingCategory ? "생성 중..." : "기술 추가"}
                      </button>
                    ) : null}
                    <p className={`text-[0.75rem] tracking-[0.02em] ${categoryAlreadyExists ? "text-[#d14343]" : "text-[#9A9A9A]"}`}>
                      {categoryAlreadyExists ? "같은 이름의 기술이 이미 있습니다." : "선택한 기술을 기준으로 질문을 생성합니다."}
                    </p>
                  </CategoryCard>

                  <CategoryCard title="난이도 및 언어" description="기술 질문은 음성으로 진행하게 되면 질문과 답변, 피드백을 모두 영어로 작성하게 됩니다">
                    <div className="flex flex-col gap-3">
                      <div className="w-fit min-w-32 rounded-[0.875rem] bg-white px-4 py-3 shadow-[0_0_0.1875rem_rgba(0,0,0,0.25)]">
                        <StarRatingInput
                          value={selectedRating}
                          onChange={setSelectedRating}
                          size="sm"
                          activeColorClass="text-[#FFD900]"
                          inactiveColorClass="text-[#EAEAEA]"
                          hoverColorClass="hover:text-[#FFD900]"
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {INTERVIEW_LANGUAGE_OPTIONS.map((option) => (
                        <SelectionPillButton
                          key={option.value}
                          active={selectedLanguage === option.value}
                          onClick={() => setSelectedLanguage(option.value)}
                          className="w-full max-w-35.25"
                          minHeightClass="min-h-[2.25rem]"
                        >
                          {option.label}
                        </SelectionPillButton>
                      ))}
                    </div>
                    <p className={SUB_COPY_CLASS}>현재 선택: {getInterviewLanguageLabel(selectedLanguage)}</p>
                  </CategoryCard>
                </div>

                {pageErrorMessage ? <p className="mt-5 text-[12px] text-[#dc4b4b]">{pageErrorMessage}</p> : null}
              </section>

              <aside className="w-full xl:max-w-65.5 xl:shrink-0 xl:pt-[8.4rem]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={SECTION_TITLE_CLASS}>빠른 시작</p>
                  </div>
                  <div className="flex items-center gap-2 text-[0.75rem] text-[#6D6D6D]">
                    <button
                      type="button"
                      onClick={() => setQuickStartPage((prev) => Math.max(0, prev - 1))}
                      disabled={quickStartPage === 0}
                      className="disabled:cursor-not-allowed disabled:text-[#c7bdb4]"
                    >
                      ‹
                    </button>
                    <span>{quickStartPageCount === 0 ? "0 / 0" : `${quickStartPage + 1} / ${quickStartPageCount}`}</span>
                    <button
                      type="button"
                      onClick={() => setQuickStartPage((prev) => Math.min(quickStartPageCount - 1, prev + 1))}
                      disabled={quickStartPage >= quickStartPageCount - 1}
                      className="disabled:cursor-not-allowed disabled:text-[#c7bdb4]"
                    >
                      ›
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {loading ? <p className={SUB_COPY_CLASS}>기술 카테고리를 불러오는 중입니다.</p> : null}
                  {!loading && quickStartCategories.length === 0 ? <p className={SUB_COPY_CLASS}>조건에 맞는 빠른 시작 항목이 없습니다.</p> : null}
                  {quickStartCategories.map((category) => (
                    <QuickStartCard
                      key={category.categoryId}
                      category={category}
                      rating={selectedRating}
                      disabled={isStartingPractice}
                      starting={startingCategoryId === category.categoryId}
                      onStart={() => handleStartPractice(category)}
                    />
                  ))}
                </div>
                <div className="mt-6 flex justify-end">
                  <SelectionPillButton
                    active={Boolean(primaryStartCategory) && !isStartingPractice}
                    disabled={!primaryStartCategory || isStartingPractice}
                    onClick={() => primaryStartCategory && handleStartPractice(primaryStartCategory)}
                    className="w-full max-w-42"
                    innerClassName="gap-2 text-[1.5rem] font-medium tracking-[0]"
                    minHeightClass="min-h-[3rem]"
                  >
                    <span>{startingCategoryId === primaryStartCategory?.categoryId ? "시작 중" : "시작하기"}</span>
                    <span aria-hidden="true">→</span>
                  </SelectionPillButton>
                </div>
              </aside>
            </div>
          </div>
          </div>
        </main>
      </div>

      {showLogoutModal ? <LogoutConfirmModal onCancel={() => setShowLogoutModal(false)} onConfirm={handleLogoutConfirm} /> : null}
      {showPointChargeModal ? <PointChargeModal onClose={() => setShowPointChargeModal(false)} onCharged={(result) => {
        setUserPoint(parsePoint(result?.currentPoint));
        setShowPointChargeModal(false);
        setShowPointChargeSuccessModal(true);
      }} /> : null}
      {showPointChargeSuccessModal ? <PointChargeSuccessModal onClose={() => setShowPointChargeSuccessModal(false)} currentPoint={userPoint} /> : null}
      {showGeminiOverloadModal ? <GeminiOverloadModal onClose={() => setShowGeminiOverloadModal(false)} /> : null}
      <JobSkillExampleModal open={showExampleModal} onClose={() => setShowExampleModal(false)} />
      <ResumeSessionModal
        open={Boolean(pendingResumeSession)}
        title="완료하지 못한 기술질문 세션이 있습니다"
        description="이전에 진행 중이던 기술질문 연습 세션이 남아 있습니다. 이어서 진행하시겠습니까?"
        onContinue={() => void handleResumePractice()}
        onDismiss={() => void handleDismissPracticeResume()}
        busy={resumeModalBusy}
      />
      {isStartingPractice ? (
        <div className="fixed inset-0 z-200 flex items-center justify-center bg-[#0f172acc]">
          <div className="rounded-[18px] border border-[#334155] bg-[#111827] px-6 py-5 text-center">
            <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-[#64748b] border-t-white" />
            <p className="mt-3 text-[14px] font-medium text-white">질문을 준비하고 있습니다</p>
            <p className="mt-1 text-[12px] text-[#cbd5e1]">잠시만 기다려 주세요. 다른 페이지로 이동할 수 없습니다.</p>
          </div>
        </div>
      ) : null}
    </div>
  );
};
