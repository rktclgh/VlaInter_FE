import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ContentTopNav } from "../../components/ContentTopNav";
import { MobileSidebarDrawer } from "../../components/MobileSidebarDrawer";
import { OcrInfoBadge } from "../../components/OcrInfoBadge";
import { ResumeSessionModal } from "../../components/ResumeSessionModal";
import { Sidebar } from "../../components/Sidebar";
import { GeminiOverloadModal } from "../../components/GeminiOverloadModal";
import { JobSkillExampleModal } from "../../components/JobSkillExampleModal";
import { PointChargeModal } from "../../components/PointChargeModal";
import { PointChargeSuccessModal } from "../../components/PointChargeSuccessModal";
import { StarRatingInput } from "../../components/DifficultyStars";
import tempProfileImage from "../../assets/icon/temp.png";
import { isAuthenticationError } from "../../lib/apiClient";
import { logout } from "../../lib/authApi";
import { filterSkillCategoriesByBranchAndJob, searchCategoryByText } from "../../lib/categoryPresentation";
import { ratingToDifficulty } from "../../lib/difficultyRating";
import { createInterviewCategory, dismissMockSession, getInterviewCategories, getLatestIncompleteMockSession, getMyInterviewSets, getReadyMockDocuments, startMockInterview } from "../../lib/interviewApi";
import { buildResumedSessionSnapshot } from "../../lib/resumeInterviewSession";
import { saveTechInterviewSession } from "../../lib/interviewSessionFlow";
import { clearInterviewStartDraft, loadInterviewStartDraft, saveInterviewStartDraft } from "../../lib/interviewStartDraft";
import { consumePointChargeSuccessResult } from "../../lib/pointChargeFlow";
import { extractProfile, formatPoint, parsePoint } from "../../lib/profileUtils";
import { getMyProfile, getMyProfileImageUrl } from "../../lib/userApi";
import { isGeminiOverloadError } from "../../lib/geminiErrorUtils";
import { INTERVIEW_LANGUAGE_OPTIONS, normalizeInterviewLanguage } from "../../lib/interviewLanguage";

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
        이력서 업로드와 AI 분석이 완료되어야 면접을 시작하실 수 있습니다. 자기소개서와 포트폴리오는 선택 사항입니다.
      </p>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-[10px] border border-[#d6d6d6] px-3 py-1.5 text-[12px] text-[#666]">닫기</button>
        <button type="button" onClick={onMoveToUpload} className="rounded-[10px] border border-[#171b24] bg-[#171b24] px-3 py-1.5 text-[12px] text-white">이력서 업로드 페이지로 이동</button>
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
    {children}
  </section>
);

const FilterChip = ({ label, active = false, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-full p-px transition ${
      active ? GRADIENT_BORDER_CLASS : "bg-[#EDEDED]"
    }`}
  >
    <span className={`inline-flex min-h-[1.625rem] min-w-[3.1875rem] items-center justify-center rounded-full bg-white px-3 text-[0.75rem] font-normal tracking-[0.02em] ${
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
  minHeightClass = "min-h-[3rem]",
  children,
}) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className={`rounded-[1rem] p-px transition disabled:opacity-50 ${active ? GRADIENT_BORDER_CLASS : "bg-[#C9C9C9]"} ${className}`}
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
    className="inline-flex h-[2.5rem] w-[2.5rem] items-center justify-center rounded-full bg-white text-[0.9375rem] font-medium text-[#9E9E9E] shadow-[inset_0_0_0.1875rem_rgba(0,0,0,0.25)] transition hover:bg-[#fafafa]"
    aria-label="직무와 기술 입력 예시 보기"
  >
    ?
  </button>
);

const toggleSkillSelection = (prev, nextId) => {
  if (prev.includes(nextId)) {
    return prev.filter((id) => id !== nextId);
  }
  if (prev.length >= 3) {
    return prev;
  }
  return [...prev, nextId];
};

const prioritizeCreatedSelection = (prev, nextId, limit = 3) => {
  const deduped = prev.filter((id) => id !== nextId);
  return [...deduped.slice(-(limit - 1)), nextId];
};
const normalizeCategoryName = (value) => String(value || "").trim().toLowerCase();

const getFirstFileId = (options = []) => String(options[0]?.fileId || options[0]?.file_id || "");
const GRADIENT_BORDER_CLASS = "bg-[linear-gradient(45deg,#5D83DE_0%,#FF1C91_100%)]";
const SECTION_TITLE_CLASS = "text-[0.875rem] font-medium tracking-[0.02em] text-[#4B4B4B]";
const SECTION_DESCRIPTION_CLASS = "mt-1 text-[0.75rem] font-normal leading-[1.7] tracking-[0.02em] text-[#9E9E9E]";
const TEXT_INPUT_CLASS = "min-h-[2.5625rem] w-full rounded-[0.6875rem] border border-[#EDEDED] bg-white px-[0.9375rem] py-[0.75rem] text-[0.75rem] font-normal tracking-[0.02em] text-[#4B4B4B] shadow-[inset_0_0_0.1875rem_rgba(0,0,0,0.25)] placeholder:text-[#CCCCCC] disabled:bg-[#FAFAFA] disabled:text-[#BDBDBD]";
const SUB_COPY_CLASS = "text-[0.75rem] font-normal leading-[1.65] tracking-[0.02em] text-[#8F8F8F]";
const hasQuestionSetQuestions = (set) => {
  const count = Number(set?.questionCount || 0);
  if (count > 0) return true;
  return Array.isArray(set?.questions) && set.questions.length > 0;
};
const getSetBranchName = (set) => String(
  set?.branchName
  || set?.questions?.find((question) => String(question?.branchName || "").trim())?.branchName
  || ""
).trim();
const getSetJobNames = (set) => {
  const direct = Array.isArray(set?.jobNames) ? set.jobNames : [set?.jobName];
  const questionJobs = Array.isArray(set?.questions) ? set.questions.map((question) => question?.jobName) : [];
  return [...direct, ...questionJobs]
    .filter(Boolean)
    .map((name) => String(name).trim())
    .filter((name, index, all) => all.findIndex((candidate) => candidate.toLowerCase() === name.toLowerCase()) === index);
};
const getSetSkillLabels = (set) => {
  const direct = Array.isArray(set?.skillNames) ? set.skillNames : [set?.skillName];
  const questionSkills = Array.isArray(set?.questions)
    ? set.questions.map((question) => question?.skillName || question?.categoryName)
    : [];
  return [...direct, ...questionSkills]
    .filter(Boolean)
    .map((name) => String(name).trim())
    .filter((name, index, all) => all.findIndex((candidate) => candidate.toLowerCase() === name.toLowerCase()) === index);
};

export const InterviewStartPage = () => {
  const navigate = useNavigate();
  const initialDraft = useMemo(() => loadInterviewStartDraft(), []);
  const [userName, setUserName] = useState("사용자");
  const [userJob, setUserJob] = useState("");
  const [userPoint, setUserPoint] = useState(0);
  const [profileImageUrl, setProfileImageUrl] = useState(tempProfileImage);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showPointChargeModal, setShowPointChargeModal] = useState(false);
  const [showPointChargeSuccessModal, setShowPointChargeSuccessModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const [categoryTree, setCategoryTree] = useState([]);
  const [filesByType, setFilesByType] = useState({ RESUME: [], INTRODUCE: [], PORTFOLIO: [] });
  const [selectedFiles, setSelectedFiles] = useState(initialDraft?.selectedFiles || { RESUME: "", INTRODUCE: "", PORTFOLIO: "" });
  const [branchFilter, setBranchFilter] = useState(initialDraft?.branchFilter || "");
  const [branchQuery, setBranchQuery] = useState(initialDraft?.branchQuery || "");
  const [jobFilter, setJobFilter] = useState(initialDraft?.jobFilter || "");
  const [jobQuery, setJobQuery] = useState(initialDraft?.jobQuery || "");
  const [skillQuery, setSkillQuery] = useState(initialDraft?.skillQuery || "");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState(initialDraft?.selectedCategoryIds || []);
  const [myQuestionSets, setMyQuestionSets] = useState([]);
  const [selectedQuestionSetId, setSelectedQuestionSetId] = useState(initialDraft?.selectedQuestionSetId || "");
  const [selectedRating, setSelectedRating] = useState(initialDraft?.selectedRating || 3);
  const [selectedQuestionCount, setSelectedQuestionCount] = useState(initialDraft?.selectedQuestionCount || 5);
  const [selectedLanguage, setSelectedLanguage] = useState(normalizeInterviewLanguage(initialDraft?.selectedLanguage));
  const [includeSelfIntroduction, setIncludeSelfIntroduction] = useState(initialDraft?.includeSelfIntroduction || false);
  const [loadingPage, setLoadingPage] = useState(true);
  const [startingInterview, setStartingInterview] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [pageErrorMessage, setPageErrorMessage] = useState("");
  const [showGeminiOverloadModal, setShowGeminiOverloadModal] = useState(false);
  const [showPrereqGuideModal, setShowPrereqGuideModal] = useState(false);
  const [pendingResumeSession, setPendingResumeSession] = useState(null);
  const [resumeModalBusy, setResumeModalBusy] = useState(false);
  const [resumeSessionChecked, setResumeSessionChecked] = useState(false);
  const [showExampleModal, setShowExampleModal] = useState(false);

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
      setUserJob(typeof profile?.jobName === "string" ? profile.jobName.trim() : "");
      setUserPoint(parsePoint(profile?.point));
      setProfileImageUrl(getMyProfileImageUrl());
    } catch (error) {
      if (isAuthenticationError(error)) {
        navigate("/login", { replace: true });
        return;
      }
    }

    try {
      const [filesPayload, categoriesPayload, mySetsPayload] = await Promise.all([
        getReadyMockDocuments(),
        getInterviewCategories(),
        getMyInterviewSets(),
      ]);
      const nextCategoryTree = Array.isArray(categoriesPayload) ? categoriesPayload : [];
      const nextJobs = nextCategoryTree
        .filter((item) => Number(item?.depth) === 1 && Boolean(item?.categoryId))
        .map((item) => ({
          categoryId: Number(item.categoryId),
          parentId: item.parentId ? Number(item.parentId) : null,
          name: String(item?.name || "").trim(),
          displayName: String(item?.name || "").trim(),
        }));
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
      const defaultBranch = matchedJob?.parentId ? String(matchedJob.parentId) : nextJobs[0]?.parentId ? String(nextJobs[0].parentId) : "";

      setCategoryTree(nextCategoryTree);
      setMyQuestionSets(Array.isArray(mySetsPayload) ? mySetsPayload.filter((item) => !item?.aiGenerated && hasQuestionSetQuestions(item)) : []);
      setFilesByType(nextFilesByType);
      setBranchFilter((prev) => prev || defaultBranch);
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

  useEffect(() => {
    if (loadingPage || resumeSessionChecked) return;
    let cancelled = false;

    const loadIncompleteSession = async () => {
      try {
        const response = await getLatestIncompleteMockSession();
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
  }, [loadingPage, resumeSessionChecked]);

  const jobs = useMemo(
    () => (categoryTree || [])
      .filter((item) => Number(item.depth) === 1)
      .map((item) => ({
        ...item,
        categoryId: Number(item.categoryId),
        parentId: item.parentId ? Number(item.parentId) : null,
        displayName: String(item.name || "").trim(),
      }))
      .sort((left, right) => String(left.name || "").localeCompare(String(right.name || ""), "ko")),
    [categoryTree]
  );
  const branchItems = useMemo(
    () => (categoryTree || []).filter((item) => Number(item.depth) === 0).sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "ko")),
    [categoryTree]
  );
  const visibleBranches = useMemo(() => (
    branchItems.filter((branch) => searchCategoryByText(branch, branchQuery))
  ), [branchItems, branchQuery]);
  const visibleJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (!searchCategoryByText(job, jobQuery)) return false;
      return !branchFilter || String(job.parentId || "") === String(branchFilter);
    });
  }, [branchFilter, jobQuery, jobs]);
  const skillItems = useMemo(
    () => filterSkillCategoriesByBranchAndJob({
      categories: categoryTree || [],
      branchId: branchFilter,
      jobId: jobFilter,
      keyword: "",
    })
      .map((item) => ({
        ...item,
        categoryId: Number(item.categoryId),
        parentId: item.parentId ? Number(item.parentId) : null,
        displayName: String(item.name || "").trim(),
        isLeaf: true,
      }))
      .sort((left, right) => {
        if (Boolean(left.isCommon) !== Boolean(right.isCommon)) return left.isCommon ? -1 : 1;
        return String(left.name || "").localeCompare(String(right.name || ""), "ko");
      }),
    [branchFilter, categoryTree, jobFilter]
  );
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
    setSelectedCategoryIds([]);
  }, [jobFilter, visibleJobs]);

  useEffect(() => {
    if (!selectedCategoryIds.length) return;
    const availableIds = new Set(skillItems.map((item) => String(item.categoryId)));
    setSelectedCategoryIds((prev) => {
      const next = prev.filter((id) => availableIds.has(String(id)));
      if (next.length === prev.length && next.every((id, index) => id === prev[index])) {
        return prev;
      }
      return next;
    });
  }, [selectedCategoryIds, skillItems]);

  const selectedSkills = useMemo(
    () => skillItems.filter((item) => selectedCategoryIds.includes(String(item.categoryId))),
    [selectedCategoryIds, skillItems]
  );
  const selectedBranch = useMemo(
    () => branchItems.find((item) => String(item.categoryId) === String(branchFilter)) || null,
    [branchFilter, branchItems]
  );
  const selectedJob = useMemo(() => jobs.find((item) => String(item.categoryId) === String(jobFilter)) || null, [jobFilter, jobs]);
  const normalizedBranchQuery = normalizeCategoryName(branchQuery);
  const normalizedJobQuery = normalizeCategoryName(jobQuery);
  const normalizedSkillQuery = normalizeCategoryName(skillQuery);
  const branchAlreadyExists = Boolean(
    normalizedBranchQuery &&
      branchItems.some((branch) => normalizeCategoryName(branch.name) === normalizedBranchQuery)
  );
  const jobAlreadyExists = Boolean(
    branchFilter &&
      normalizedJobQuery &&
      visibleJobs.some((job) => normalizeCategoryName(job.displayName || job.name) === normalizedJobQuery)
  );
  const skillAlreadyExists = Boolean(
    jobFilter &&
      normalizedSkillQuery &&
      skillItems.some((item) => normalizeCategoryName(item.displayName || item.name) === normalizedSkillQuery)
  );
  const canCreateJob = Boolean(branchFilter && normalizedJobQuery && !jobAlreadyExists);
  const canCreateBranch = Boolean(normalizedBranchQuery && !branchAlreadyExists);
  const canCreateSkill = Boolean(jobFilter && normalizedSkillQuery && !skillAlreadyExists);
  const selectedQuestionSet = useMemo(
    () => myQuestionSets.find((item) => String(item.setId) === String(selectedQuestionSetId)) || null,
    [myQuestionSets, selectedQuestionSetId]
  );
  const visibleQuestionSets = useMemo(() => {
    const normalizedBranchName = String(
      branchItems.find((item) => String(item.categoryId) === String(branchFilter))?.name || ""
    ).trim().toLowerCase();
    const normalizedJobName = String(selectedJob?.displayName || selectedJob?.name || "").trim().toLowerCase();

    const scored = myQuestionSets.map((set) => {
      const setBranchName = getSetBranchName(set).toLowerCase();
      const setJobNames = getSetJobNames(set).map((name) => name.toLowerCase());
      const branchMatched = normalizedBranchName && setBranchName === normalizedBranchName;
      const jobMatched = normalizedJobName && (setJobNames.includes(normalizedJobName) || setJobNames.includes("공통"));
      const questionCount = Array.isArray(set?.questions) ? set.questions.length : Number(set?.questionCount || 0);
      const score = (branchMatched ? 2 : 0) + (jobMatched ? 1 : 0);

      return {
        set,
        score,
        questionCount,
      };
    });

    return scored
      .sort((left, right) => {
        if (right.score !== left.score) return right.score - left.score;
        if (right.questionCount !== left.questionCount) return right.questionCount - left.questionCount;
        const leftTime = new Date(left.set?.updatedAt || left.set?.createdAt || "").getTime() || 0;
        const rightTime = new Date(right.set?.updatedAt || right.set?.createdAt || "").getTime() || 0;
        return rightTime - leftTime;
      })
      .map((item) => item.set);
  }, [branchFilter, branchItems, myQuestionSets, selectedJob]);

  useEffect(() => {
    if (!selectedQuestionSetId) return;
    if (visibleQuestionSets.some((set) => String(set.setId) === String(selectedQuestionSetId))) return;
    setSelectedQuestionSetId("");
  }, [selectedQuestionSetId, visibleQuestionSets]);

  useEffect(() => {
    if (loadingPage) return;
    setSelectedFiles((prev) => {
      const next = { ...prev };
      let changed = false;
      DOCUMENT_TYPES.forEach((item) => {
        const options = filesByType[item.key] || [];
        const current = String(prev[item.key] || "");
        const exists = options.some((file) => String(file?.fileId || file?.file_id || "") === current);
        if (exists) return;
        if (item.key === "RESUME") {
          const fallbackValue = getFirstFileId(options);
          if (current !== fallbackValue) {
            next[item.key] = fallbackValue;
            changed = true;
          }
          return;
        }
        if (current !== "") {
          next[item.key] = "";
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [filesByType, loadingPage]);

  useEffect(() => {
    if (loadingPage) return;
    saveInterviewStartDraft({
      selectedFiles,
      branchFilter,
      branchQuery,
      jobFilter,
      jobQuery,
      skillQuery,
      selectedCategoryIds,
      selectedQuestionSetId,
      selectedRating,
      selectedQuestionCount,
      selectedLanguage,
      includeSelfIntroduction,
    });
  }, [
    branchFilter,
    branchQuery,
    includeSelfIntroduction,
    jobFilter,
    jobQuery,
    loadingPage,
    selectedCategoryIds,
    selectedFiles,
    selectedLanguage,
    selectedQuestionCount,
    selectedQuestionSetId,
    selectedRating,
    skillQuery,
  ]);

  const selectedFileObjects = useMemo(() => DOCUMENT_TYPES.reduce((acc, item) => {
    acc[item.key] = filesByType[item.key].find((file) => String(file?.fileId || file?.file_id || "") === String(selectedFiles[item.key] || "")) || null;
    return acc;
  }, {}), [filesByType, selectedFiles]);
  const totalInterviewQuestionCount = Math.max(5, Number(selectedQuestionCount) || 5) + (includeSelfIntroduction ? 1 : 0);

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
      clearInterviewStartDraft();
      navigate("/login", { replace: true });
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
      const refreshed = await getInterviewCategories();
      const nextCategoryTree = Array.isArray(refreshed) ? refreshed : [];
      setCategoryTree(nextCategoryTree);
      const matched = nextCategoryTree.find(
        (item) => Number(item?.depth) === 1
          && String(item?.parentId || "") === String(branchFilter)
          && String(item?.name || "").trim().toLowerCase() === displayName.toLowerCase()
      ) || nextCategoryTree.find((item) => Number(item?.depth) === 1 && String(item?.parentId || "") === String(branchFilter)) || null;
      setJobFilter(matched?.categoryId ? String(matched.categoryId) : "");
      setSelectedCategoryIds([]);
      setSkillQuery("");
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
      setJobFilter("");
      setSelectedCategoryIds([]);
      setJobQuery("");
      setSkillQuery("");
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
      const created = await createInterviewCategory({
        parentId: Number(jobFilter),
        name: skillQuery.trim(),
      });
      const displayName = (created?.name || skillQuery.trim()).trim();
      const refreshed = await getInterviewCategories();
      const nextCategoryTree = Array.isArray(refreshed) ? refreshed : [];
      setCategoryTree(nextCategoryTree);
      const matched = nextCategoryTree.find(
        (item) => Number(item?.depth) === 2
          && String(item?.parentId || "") === String(jobFilter)
          && String(item?.name || "").trim().toLowerCase() === displayName.toLowerCase()
      ) || nextCategoryTree.find((item) => Number(item?.depth) === 2 && String(item?.parentId || "") === String(jobFilter)) || null;
      if (matched?.categoryId) {
        setSelectedCategoryIds((prev) => prioritizeCreatedSelection(prev, String(matched.categoryId)));
        setSelectedQuestionSetId("");
      }
      setSkillQuery("");
    } catch (error) {
      setPageErrorMessage(error?.message || "기술 카테고리 생성에 실패했습니다.");
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleStartInterview = async () => {
    const clampedQuestionCount = Math.min(20, Math.max(5, Number(selectedQuestionCount) || 5));
    const hasRequiredDocuments = Boolean(selectedFileObjects.RESUME);
    const selectedDocumentIds = DOCUMENT_TYPES
      .map((item) => selectedFiles[item.key])
      .filter((value, index, array) => value && array.indexOf(value) === index)
      .map((value) => Number(value));

    if (!hasRequiredDocuments) {
      setShowPrereqGuideModal(true);
      setPageErrorMessage("이력서를 선택해 주세요.");
      return;
    }
    const resolvedJobName = (selectedJob?.displayName || selectedJob?.name || jobQuery.trim()).trim();
    const resolvedSkillNames = selectedSkills.map((skill) => (skill.displayName || skill.name || "").trim()).filter(Boolean);
    if (!resolvedJobName) {
      setPageErrorMessage("모의면접에는 직무 입력이 필요합니다.");
      return;
    }
    if (!selectedQuestionSet && !resolvedSkillNames.length) {
      setPageErrorMessage("모의면접에는 기술 카테고리를 선택하거나 내 질문 세트를 골라 주세요.");
      return;
    }

    setStartingInterview(true);
    setPageErrorMessage("");
    try {
      const response = await startMockInterview({
        documentFileIds: selectedDocumentIds,
        questionSetId: selectedQuestionSet ? Number(selectedQuestionSet.setId) : null,
        categoryIds: selectedCategoryIds.map((id) => Number(id)).filter(Number.isFinite),
        jobName: resolvedJobName,
        difficulty: ratingToDifficulty(selectedRating),
        language: selectedLanguage,
        includeSelfIntroduction,
        questionCount: clampedQuestionCount,
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
          language: normalizeInterviewLanguage(response.language || selectedLanguage),
          difficulty: ratingToDifficulty(selectedRating),
          difficultyRating: selectedRating,
          categoryId: null,
          categoryName: selectedQuestionSet
            ? ((Array.isArray(selectedQuestionSet.skillNames) ? selectedQuestionSet.skillNames : [selectedQuestionSet.skillName]).filter(Boolean).join(", "))
            : resolvedSkillNames.join(", "),
          jobName: resolvedJobName,
          questionCount: totalInterviewQuestionCount,
          requestedQuestionCount: clampedQuestionCount,
          includeSelfIntroduction,
          questionSetId: selectedQuestionSet ? Number(selectedQuestionSet.setId) : null,
          providerUsed: response.providerUsed || null,
          fallbackDepth: Number(response.fallbackDepth || 0),
          paidFallbackPopupPending: String(response.providerUsed || "").toUpperCase() === "BEDROCK",
        },
      });
      clearInterviewStartDraft();

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

  const handleResumeInterview = async () => {
    if (!pendingResumeSession) return;
    setResumeModalBusy(true);
    try {
      const snapshot = buildResumedSessionSnapshot(pendingResumeSession, {
        apiBasePath: "/api/interview/mock",
        requestedQuestionCount: Math.max(Number(pendingResumeSession.questionCount || 0), 1),
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

  const handleDismissInterviewResume = async () => {
    if (!pendingResumeSession?.sessionId) {
      setPendingResumeSession(null);
      return;
    }
    setResumeModalBusy(true);
    try {
      await dismissMockSession(pendingResumeSession.sessionId);
      setPendingResumeSession(null);
    } catch (error) {
      setPageErrorMessage(error?.message || "미완료 면접 세션 종료에 실패했습니다.");
    } finally {
      setResumeModalBusy(false);
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-white pt-[3.75rem]">
      <ContentTopNav
        variant="mockStart"
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
        variant="mockStart"
        onClose={() => setIsMobileMenuOpen(false)}
        onNavigate={handleSidebarNavigate}
        userName={userName}
        userRole={userJob}
        profileImageUrl={profileImageUrl}
        point={formatPoint(userPoint)}
        onClickCharge={() => {
          if (startingInterview) return;
          setShowPointChargeModal(true);
        }}
        interactionDisabled={startingInterview}
        onLogout={() => {
          if (startingInterview) return;
          setIsMobileMenuOpen(false);
          setShowLogoutModal(true);
        }}
      />

      <div className="flex min-h-[calc(100vh-3.75rem)]">
        <div className="hidden w-[17rem] shrink-0 md:block">
          <Sidebar
            activeKey="interview_start"
            variant="mockStart"
            onNavigate={handleSidebarNavigate}
            userName={userName}
            userRole={userJob}
            profileImageUrl={profileImageUrl}
            onLogout={() => {
              if (startingInterview) return;
              setShowLogoutModal(true);
            }}
          />
        </div>

        <main className="flex min-w-0 flex-1 flex-col bg-white">
          <div className="flex-1 overflow-y-auto px-4 pb-10 pt-8 sm:px-6 md:px-8 md:pt-10 xl:px-10">
            <div className="mx-auto w-full max-w-[98rem]">
              <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.08fr)_minmax(20rem,0.92fr)] xl:gap-12">
                <div className="space-y-8">
                  <section>
                    <h1 className="text-[clamp(2.1rem,3vw,2.25rem)] font-medium tracking-[0] text-[#000000]">
                      실전 모의 면접 시작하기
                    </h1>
                    <p className="mt-3 max-w-[49rem] text-[0.9375rem] leading-[1.9] tracking-[0] text-[#5C5C5C]">
                      실전 모의면접은 서류와 직무를 기반으로 한 맞춤 면접 시스템입니다. 서류 선택 시 AI 분석이 완료된 서류만 선택하실 수 있습니다.
                      직무와 기술 카테고리를 함께 선택하시면 문서 질문과 기술 질문을 섞어 면접을 생성합니다.
                    </p>
                  </section>

                  <section className="flex w-full max-w-[36.5rem] items-center justify-between gap-4 rounded-[1.25rem] bg-[#FDFDFD] px-5 py-4 shadow-[0_0_0.1875rem_rgba(0,0,0,0.25)]">
                    <div>
                      <p className="text-[0.875rem] font-medium tracking-[0.02em] text-[#9E9E9E]">입력 가이드</p>
                      <p className="mt-1 text-[0.9375rem] font-normal tracking-[0.02em] text-[#535353]">계열, 직무, 기술의 범위에 대한 가이드입니다</p>
                    </div>
                    <HelpIconButton onClick={() => setShowExampleModal(true)} />
                  </section>

                  <CategoryCard title="계열 선택" description="계열을 먼저 선택하면 직무 및 기술 후보를 빠르게 선택 가능합니다">
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
                      <input
                        value={branchQuery}
                        onChange={(event) => setBranchQuery(event.target.value)}
                        placeholder="계열 검색 또는 새 계열 입력"
                        className={`${TEXT_INPUT_CLASS} md:max-w-[31.1875rem]`}
                      />
                      {canCreateBranch ? (
                        <button
                          type="button"
                          disabled={creatingCategory}
                          onClick={handleCreateBranch}
                          className="min-h-[2.5625rem] rounded-[0.875rem] border border-[#D8D8D8] bg-white px-4 text-[0.75rem] font-medium tracking-[0.02em] text-[#444444] disabled:opacity-60"
                        >
                          {creatingCategory ? "생성 중..." : "계열 추가"}
                        </button>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <FilterChip label="전체" active={!branchFilter} onClick={() => setBranchFilter("")} />
                      {visibleBranches.map((branch) => (
                        <FilterChip
                          key={branch.categoryId}
                          label={branch.name}
                          active={branchFilter === String(branch.categoryId)}
                          onClick={() => setBranchFilter(String(branch.categoryId))}
                        />
                      ))}
                    </div>
                    {!visibleBranches.length && !loadingPage ? <p className={SUB_COPY_CLASS}>표시할 계열이 없습니다.</p> : null}
                    <p className={`text-[0.75rem] tracking-[0.02em] ${branchAlreadyExists ? "text-[#d14343]" : "text-[#9A9A9A]"}`}>
                      {branchAlreadyExists
                        ? "같은 이름의 계열이 이미 있습니다. 중복 입력은 제한됩니다."
                        : "없는 계열은 직접 추가할 수 있습니다."}
                    </p>
                  </CategoryCard>

                  <CategoryCard title="직무 선택" description="직무 추가는 한글로만 입력 가능합니다">
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
                      <input
                        value={jobQuery}
                        onChange={(event) => setJobQuery(event.target.value)}
                        placeholder="직무 검색 또는 새 직무 입력"
                        className={`${TEXT_INPUT_CLASS} md:max-w-[31.1875rem]`}
                      />
                      {canCreateJob ? (
                        <button
                          type="button"
                          disabled={creatingCategory}
                          onClick={handleCreateJob}
                          className="min-h-[2.5625rem] rounded-[0.875rem] border border-[#D8D8D8] bg-white px-4 text-[0.75rem] font-medium tracking-[0.02em] text-[#444444] disabled:opacity-60"
                        >
                          {creatingCategory ? "생성 중..." : "직무 추가"}
                        </button>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {visibleJobs.map((job) => (
                        <FilterChip
                          key={job.categoryId}
                          label={job.displayName || job.name}
                          active={String(job.categoryId) === jobFilter}
                          onClick={() => setJobFilter(String(job.categoryId))}
                        />
                      ))}
                    </div>
                    {!visibleJobs.length && !loadingPage ? <p className={SUB_COPY_CLASS}>표시할 직무가 없습니다.</p> : null}
                    <p className={`text-[0.75rem] tracking-[0.02em] ${jobAlreadyExists ? "text-[#d14343]" : "text-[#9A9A9A]"}`}>
                      {jobAlreadyExists
                        ? "같은 이름의 직무가 이미 있습니다."
                        : "새로 만든 직무는 바로 선택됩니다."}
                    </p>
                  </CategoryCard>

                  <CategoryCard title="기술 카테고리 선택" description="모의면접에는 40% 비율로 기술질문이 포함되며, 최대 3개까지 선택 가능합니다">
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
                      <input
                        value={skillQuery}
                        onChange={(event) => setSkillQuery(event.target.value)}
                        placeholder={jobFilter ? "기술 검색 또는 새 기술 입력" : "직무를 먼저 선택해 주세요"}
                        disabled={!jobFilter}
                        className={`${TEXT_INPUT_CLASS} md:max-w-[31.1875rem]`}
                      />
                      {canCreateSkill ? (
                        <button
                          type="button"
                          disabled={creatingCategory}
                          onClick={handleCreateSkill}
                          className="min-h-[2.5625rem] rounded-[0.875rem] border border-[#D8D8D8] bg-white px-4 text-[0.75rem] font-medium tracking-[0.02em] text-[#444444] disabled:opacity-60"
                        >
                          {creatingCategory ? "생성 중..." : "기술 추가"}
                        </button>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {visibleSkills.map((skill) => (
                        <FilterChip
                          key={skill.categoryId}
                          label={skill.isCommon ? `${skill.label} · 공통` : skill.label}
                          active={selectedCategoryIds.includes(String(skill.categoryId))}
                          onClick={() => {
                            const nextId = String(skill.categoryId);
                            if (!selectedCategoryIds.includes(nextId) && selectedCategoryIds.length >= 3) {
                              setPageErrorMessage("기술 카테고리는 최대 3개까지 선택하실 수 있습니다.");
                              return;
                            }
                            setPageErrorMessage("");
                            setSelectedQuestionSetId("");
                            setSelectedCategoryIds((prev) => toggleSkillSelection(prev, nextId));
                          }}
                        />
                      ))}
                    </div>
                    {selectedSkills.length ? (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {selectedSkills.map((skill) => (
                          <SummaryChip key={`selected-skill-${skill.categoryId}`} tone={skill.isCommon ? "accent" : "default"}>
                            <span className="inline-flex items-center gap-2">
                              <span>{skill.displayName || skill.name}</span>
                              <button
                                type="button"
                                onClick={() => setSelectedCategoryIds((prev) => prev.filter((id) => id !== String(skill.categoryId)))}
                                className="text-[0.75rem]"
                                aria-label={`${skill.displayName || skill.name} 제거`}
                              >
                                ×
                              </button>
                            </span>
                          </SummaryChip>
                        ))}
                      </div>
                    ) : null}
                    {!visibleSkills.length && jobFilter ? <p className={SUB_COPY_CLASS}>현재 직무에 등록된 기술이 없습니다. 직접 추가하시면 바로 사용하실 수 있습니다.</p> : null}
                    <p className={`text-[0.75rem] tracking-[0.02em] ${skillAlreadyExists ? "text-[#d14343]" : "text-[#9A9A9A]"}`}>
                      {skillAlreadyExists
                        ? "같은 이름의 기술이 이미 있습니다."
                        : "선택한 기술 전체에서 질문 후보를 생성합니다."}
                    </p>
                  </CategoryCard>

                  <CategoryCard title="내 질문 세트로 기술질문 대체" description="AI가 생성할 기술질문 대신 저장된 질문 세트를 사용할 수 있습니다">
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setSelectedQuestionSetId("")}
                        className={`flex w-full max-w-[31.1875rem] items-center justify-between rounded-[1rem] p-px text-left ${
                          !selectedQuestionSetId ? GRADIENT_BORDER_CLASS : "bg-[#EDEDED]"
                        }`}
                      >
                        <div className="flex w-full items-center justify-between rounded-[calc(1rem-1px)] bg-white px-5 py-4">
                          <div>
                            <p className="text-[0.9375rem] font-medium tracking-[0.02em] text-[#000000]">기술 카테고리 생성 사용</p>
                            <p className="mt-1 text-[0.75rem] font-normal tracking-[0.02em] text-[#717171]">선택한 기술 카테고리를 기준으로 AI 기술질문을 생성합니다.</p>
                          </div>
                          <span className="inline-flex h-[2.0625rem] w-[2.0625rem] items-center justify-center rounded-full bg-white text-[0.875rem] text-[#000000] shadow-[inset_0_0_0.1875rem_rgba(0,0,0,0.25)]">⌃</span>
                        </div>
                      </button>
                      {visibleQuestionSets.map((set) => {
                        const selected = selectedQuestionSetId === String(set.setId);
                        const skillLabels = getSetSkillLabels(set);
                        const branchLabel = getSetBranchName(set) || set.jobName || "계열 미지정";
                        return (
                          <button
                            key={set.setId}
                            type="button"
                            onClick={() => {
                              setSelectedQuestionSetId(String(set.setId));
                              setSelectedCategoryIds([]);
                              setPageErrorMessage("");
                            }}
                            className={`block w-full max-w-[31.1875rem] rounded-[1rem] p-px text-left ${
                              selected ? GRADIENT_BORDER_CLASS : "bg-[#EDEDED]"
                            }`}
                          >
                            <span className="block rounded-[calc(1rem-1px)] bg-white px-5 py-4">
                              <p className="truncate text-[0.9375rem] font-medium tracking-[0.02em] text-[#000000]">{set.title}</p>
                              <p className="mt-1 truncate text-[0.75rem] tracking-[0.02em] text-[#717171]">
                                {branchLabel} · {(skillLabels.length ? skillLabels.slice(0, 3).join(", ") : "기술 없음")}
                              </p>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {!visibleQuestionSets.length ? <p className={SUB_COPY_CLASS}>현재 선택한 직무에서 사용할 수 있는 내 질문 세트가 없습니다.</p> : null}
                  </CategoryCard>
                </div>

                <div className="space-y-8">
                  <CategoryCard title="서류 선택" description="AI 분석이 끝난 서류만 선택 가능합니다">
                    <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                      {DOCUMENT_TYPES.map((documentType) => {
                        const files = filesByType[documentType.key] || [];
                        const currentValue = String(selectedFiles[documentType.key] || "");
                        const isOptionalDocument = documentType.key !== "RESUME";
                        return (
                          <div key={documentType.key} className="space-y-2">
                            <p className="text-[0.8125rem] font-medium tracking-[0.02em] text-[#4B4B4B]">{documentType.label}</p>
                            {isOptionalDocument ? (
                              <SelectionPillButton
                                active={!currentValue}
                                onClick={() => setSelectedFiles((prev) => ({ ...prev, [documentType.key]: "" }))}
                                className="w-full max-w-[13.8125rem]"
                              >
                                미선택
                              </SelectionPillButton>
                            ) : null}
                            {files.map((file) => {
                              const fileId = String(file?.fileId || file?.file_id || "");
                              const active = currentValue === fileId;
                              return (
                                <SelectionPillButton
                                  key={`${documentType.key}-${fileId}`}
                                  active={active}
                                  onClick={() => setSelectedFiles((prev) => ({ ...prev, [documentType.key]: fileId }))}
                                  className="w-full max-w-[13.8125rem]"
                                >
                                  <span className="flex min-w-0 items-center gap-2">
                                    <span className="truncate">{resolveDisplayFileName(file)}</span>
                                    {file?.ocrUsed ? <OcrInfoBadge compact /> : null}
                                  </span>
                                </SelectionPillButton>
                              );
                            })}
                            {!loadingPage && !files.length ? (
                              <SelectionPillButton disabled className="w-full max-w-[13.8125rem]">
                                {documentType.key === "RESUME" ? "이력서 없음" : `${documentType.label} 없음`}
                              </SelectionPillButton>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </CategoryCard>

                  <CategoryCard title="난이도 및 문항 수" description="모의 면접은 최소 5문항이며, 기술질문은 전체 문항의 40% 비율로 자동 배분됩니다">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center">
                      <div className="w-fit min-w-[8rem] rounded-[0.875rem] bg-white px-4 py-3 shadow-[0_0_0.1875rem_rgba(0,0,0,0.25)]">
                        <div className="flex items-center">
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
                      <div className="w-full max-w-[8rem] rounded-[0.875rem] bg-white px-4 py-3 shadow-[0_0_0.1875rem_rgba(0,0,0,0.25)]">
                        <div className="flex items-center justify-between gap-2">
                          <label htmlFor="interview-question-count" className="text-[0.75rem] font-normal tracking-[0.02em] text-[#4B4B4B]">문항 수</label>
                          <input
                            id="interview-question-count"
                            type="number"
                            aria-label="문항 수"
                            min={5}
                            max={20}
                            value={selectedQuestionCount}
                            onChange={(event) => {
                              const clamped = Math.min(20, Math.max(5, Number(event.target.value) || 5));
                              setSelectedQuestionCount(clamped);
                            }}
                            className="w-12 bg-transparent text-right text-[0.875rem] font-normal tracking-[0.02em] text-[#4B4B4B]"
                          />
                        </div>
                      </div>
                    </div>
                    <label className="inline-flex cursor-pointer items-center gap-2 pt-1 text-[0.75rem] tracking-[0.02em] text-[#666666]">
                      <input
                        type="checkbox"
                        checked={includeSelfIntroduction}
                        onChange={(event) => setIncludeSelfIntroduction(event.target.checked)}
                        className="sr-only"
                      />
                      <span
                        aria-hidden="true"
                        className={`inline-flex h-4 w-4 items-center justify-center rounded-sm border text-[11px] leading-none ${
                          includeSelfIntroduction ? "border-[#575757] bg-[#575757] text-white" : "border-[#cfcfcf] bg-white text-transparent"
                        }`}
                      >
                        ✓
                      </span>
                      첫 질문에 자기소개 문항 추가
                    </label>
                  </CategoryCard>

                  <CategoryCard title="언어 선택" description="모의 면접은 영어로 진행하게 되면 질문과 답변, 피드백을 모두 영어로 작성하게 됩니다">
                    <div className="flex flex-wrap gap-3">
                      {INTERVIEW_LANGUAGE_OPTIONS.map((option) => (
                        <SelectionPillButton
                          key={option.value}
                          active={selectedLanguage === option.value}
                          onClick={() => setSelectedLanguage(option.value)}
                          className="min-w-[7.125rem]"
                          minHeightClass="min-h-[2.125rem]"
                          innerClassName="px-5 text-[0.8125rem]"
                        >
                          {option.label}
                        </SelectionPillButton>
                      ))}
                    </div>
                  </CategoryCard>

                  <CategoryCard title="선택 요약" description="모의 면접 진행 시 선택한 메타 정보를 상단에 요약하여 알려드립니다">
                    <div className="flex flex-wrap gap-2">
                      {selectedBranch ? <SummaryChip>{selectedBranch.name}</SummaryChip> : null}
                      {selectedJob ? <SummaryChip tone="accent">{selectedJob.displayName || selectedJob.name}</SummaryChip> : null}
                      {selectedQuestionSet ? (
                        <SummaryChip>질문 세트: {selectedQuestionSet.title}</SummaryChip>
                      ) : selectedSkills.length ? selectedSkills.map((skill) => (
                        <SummaryChip key={`summary-skill-${skill.categoryId}`}>{skill.displayName || skill.name}</SummaryChip>
                      )) : (
                        <SummaryChip>기술 미선택</SummaryChip>
                      )}
                      <SummaryChip>문항 {totalInterviewQuestionCount}개</SummaryChip>
                      {DOCUMENT_TYPES.map((type) => {
                        const file = selectedFileObjects[type.key];
                        return (
                          <SummaryChip key={type.key} tone={file ? "accent" : "default"}>
                            <span className="inline-flex items-center gap-1.5">
                              <span>{file ? resolveDisplayFileName(file) : `${type.label} 미선택`}</span>
                              {file?.ocrUsed ? <OcrInfoBadge compact /> : null}
                            </span>
                          </SummaryChip>
                        );
                      })}
                    </div>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => navigate("/content/files")}
                        className="text-[0.75rem] font-medium tracking-[0.02em] text-[#757575] underline-offset-2 hover:underline"
                      >
                        이력서 및 자기소개서 업로드로 이동
                      </button>
                    </div>
                    {pageErrorMessage ? <p className="text-[0.75rem] tracking-[0.02em] text-[#dc4b4b]">{pageErrorMessage}</p> : null}
                    <div className="flex items-center justify-between gap-3 pt-6">
                      {startingInterview ? <InlineSpinner label="면접 세션과 질문을 생성하고 있습니다." /> : <span />}
                      <button
                        type="button"
                        onClick={handleStartInterview}
                        disabled={loadingPage || startingInterview}
                        className={`rounded-full p-px transition ${
                          loadingPage || startingInterview ? "bg-[#D6D6D6]" : GRADIENT_BORDER_CLASS
                        }`}
                      >
                        <span className={`inline-flex min-h-[3rem] min-w-[8.625rem] items-center justify-center rounded-full bg-white px-6 text-[1rem] font-medium tracking-[0.02em] ${
                          loadingPage || startingInterview ? "text-[#B1B1B1]" : "text-[#000000]"
                        }`}>
                          {startingInterview ? "면접 생성 중..." : "시작하기 →"}
                        </span>
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
      <JobSkillExampleModal open={showExampleModal} onClose={() => setShowExampleModal(false)} />
      {showPrereqGuideModal ? (
        <InterviewPrerequisiteGuideModal
          onClose={() => setShowPrereqGuideModal(false)}
          onMoveToUpload={() => {
            setShowPrereqGuideModal(false);
            navigate("/content/files");
          }}
        />
      ) : null}
      <ResumeSessionModal
        open={Boolean(pendingResumeSession)}
        title="완료하지 못한 면접 세션이 있습니다"
        description="이전에 진행 중이던 실전 모의면접이 남아 있습니다. 이어서 진행하시겠습니까?"
        onContinue={() => void handleResumeInterview()}
        onDismiss={() => void handleDismissInterviewResume()}
        busy={resumeModalBusy}
      />
    </div>
  );
};
