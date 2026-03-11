import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ContentTopNav } from "../../components/ContentTopNav";
import { MobileSidebarDrawer } from "../../components/MobileSidebarDrawer";
import { PointChargeModal } from "../../components/PointChargeModal";
import { PointChargeSuccessModal } from "../../components/PointChargeSuccessModal";
import { QuestionAnswerDetailModal } from "../../components/QuestionAnswerDetailModal";
import { Sidebar } from "../../components/Sidebar";
import { DifficultyStars, StarIcons } from "../../components/DifficultyStars";
import tempProfileImage from "../../assets/icon/temp.png";
import { isAuthenticationError } from "../../lib/apiClient";
import { logout } from "../../lib/authApi";
import {
  buildCategoryMap,
  buildVisibleCategories,
  filterSkillCategoriesByBranchAndJob,
  getBranchDisplayName,
  getCategoryDisplayName,
  getJobDisplayName,
  getSkillDisplayName,
  isCommonJobCategory,
  sanitizeQuestionTag,
  searchCategoryByText,
} from "../../lib/categoryPresentation";
import { ratingToDifficulty } from "../../lib/difficultyRating";
import { consumePointChargeSuccessResult } from "../../lib/pointChargeFlow";
import {
  addQuestionToInterviewSet,
  createInterviewSet,
  deleteInterviewSet,
  deleteSavedInterviewQuestion,
  getInterviewCategories,
  getSavedInterviewQuestions,
} from "../../lib/interviewApi";
import { getMyProfile, getMyProfileImageUrl } from "../../lib/userApi";

const PAGE_SIZE = 12;
const formatPoint = (value) => `${new Intl.NumberFormat("ko-KR").format(Number(value) || 0)}P`;
const parsePoint = (rawValue) => {
  if (typeof rawValue === "number") return rawValue;
  if (typeof rawValue === "string") {
    const parsed = Number(rawValue.replace(/,/g, "").trim());
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};
const extractProfile = (payload) => payload?.data || payload?.result || payload?.user || payload || {};
const formatDate = (value) => {
  const date = new Date(value || "");
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
};
const normalizeDateInput = (value) => {
  const date = new Date(value || "");
  if (Number.isNaN(date.getTime())) return "";
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const LogoutConfirmModal = ({ onCancel, onConfirm }) => (
  <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/35 px-4">
    <div className="w-full max-w-[420px] rounded-[16px] border border-[#d9d9d9] bg-white p-5">
      <p className="text-[15px] font-medium text-[#252525]">정말 로그아웃 하시겠습니까?<br />저장되지 않은 작업은 유지되지 않습니다.</p>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-[10px] border border-[#d6d6d6] px-3 py-1.5 text-[12px] text-[#666]">취소</button>
        <button type="button" onClick={onConfirm} className="rounded-[10px] border border-[#1f1f1f] bg-[#1f1f1f] px-3 py-1.5 text-[12px] text-white">로그아웃</button>
      </div>
    </div>
  </div>
);

const DeleteConfirmModal = ({ targetQuestion, deleting, onCancel, onConfirm }) => (
  <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 px-4">
    <div className="w-full max-w-[460px] rounded-[16px] border border-[#d9d9d9] bg-white p-5">
      <p className="text-[15px] font-medium text-[#252525]">저장된 질문을 삭제하시겠습니까?</p>
      <p className="mt-2 text-[13px] leading-[1.6] text-[#4f5664]">
        {targetQuestion?.questionText
          ? `삭제 대상: ${targetQuestion.questionText.slice(0, 80)}${targetQuestion.questionText.length > 80 ? "..." : ""}`
          : "선택한 질문이 삭제됩니다."}
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onCancel} disabled={deleting} className="rounded-[10px] border border-[#d6d6d6] px-3 py-1.5 text-[12px] text-[#666] disabled:opacity-60">취소</button>
        <button type="button" onClick={onConfirm} disabled={deleting} className="rounded-[10px] border border-[#7f1d1d] bg-[#7f1d1d] px-3 py-1.5 text-[12px] text-white disabled:opacity-60">{deleting ? "삭제 중..." : "삭제"}</button>
      </div>
    </div>
  </div>
);

const CreateSetFromSavedModal = ({
  title,
  setTitle,
  onChangeTitle,
  saving,
  selectedCount,
  summaryLabel,
  errorMessage,
  onCancel,
  onConfirm,
}) => (
  <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 px-4">
    <div className="w-full max-w-[520px] rounded-[18px] border border-[#d9d9d9] bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.18)]">
      <p className="text-[16px] font-semibold text-[#252525]">{title}</p>
      <p className="mt-2 text-[13px] leading-[1.7] text-[#4f5664]">
        선택한 저장 질문 {selectedCount}개를 새 문답 세트로 묶습니다.
        <br />
        {summaryLabel || "현재 세트 구조상 같은 직무/기술 질문끼리만 묶을 수 있습니다."}
      </p>
      <input
        value={setTitle}
        onChange={(event) => onChangeTitle(event.target.value)}
        placeholder="세트 제목을 입력해 주세요"
        className="mt-4 w-full rounded-[14px] border border-[#dfe3eb] px-4 py-3 text-[13px] outline-none focus:border-[#8aa2e8]"
      />
      {errorMessage ? <p className="mt-3 text-[12px] text-[#dc4b4b]">{errorMessage}</p> : null}
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onCancel} disabled={saving} className="rounded-[10px] border border-[#d6d6d6] px-3 py-1.5 text-[12px] text-[#666] disabled:opacity-60">취소</button>
        <button type="button" onClick={onConfirm} disabled={saving} className="rounded-[10px] border border-[#171b24] bg-[#171b24] px-3 py-1.5 text-[12px] text-white disabled:opacity-60">{saving ? "세트 생성 중..." : "새 세트 만들기"}</button>
      </div>
    </div>
  </div>
);

const CategoryChip = ({ label, active = false, onClick }) => (
  <button type="button" onClick={onClick} className={`rounded-full border px-3 py-1 text-[11px] transition ${active ? "border-[#171b24] bg-[#171b24] text-white" : "border-[#d9dde5] bg-white text-[#556070]"}`}>
    {label}
  </button>
);

const DifficultyChip = ({ label, active = false, onClick }) => (
  <button type="button" onClick={onClick} className={`rounded-full border px-3 py-1 text-[11px] transition ${active ? "border-[#9d6320] bg-[#fff5ea] text-[#9d6320]" : "border-[#eceff4] bg-white text-[#6b7280]"}`}>
    {label}
  </button>
);

export const SavedQuestionsPage = () => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("사용자");
  const [userPoint, setUserPoint] = useState(0);
  const [profileImageUrl, setProfileImageUrl] = useState(tempProfileImage);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showPointChargeModal, setShowPointChargeModal] = useState(false);
  const [showPointChargeSuccessModal, setShowPointChargeSuccessModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [jobFilter, setJobFilter] = useState("");
  const [categoryQuery, setCategoryQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedRating, setSelectedRating] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [deleteTargetQuestion, setDeleteTargetQuestion] = useState(null);
  const [deletingQuestion, setDeletingQuestion] = useState(false);
  const [pageErrorMessage, setPageErrorMessage] = useState("");
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [selectedSavedIds, setSelectedSavedIds] = useState([]);
  const [showCreateSetModal, setShowCreateSetModal] = useState(false);
  const [newSetTitle, setNewSetTitle] = useState("");
  const [creatingSet, setCreatingSet] = useState(false);
  const [createSetErrorMessage, setCreateSetErrorMessage] = useState("");

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
        const [savedQuestions, categoryList] = await Promise.all([getSavedInterviewQuestions(), getInterviewCategories()]);
        setItems(Array.isArray(savedQuestions) ? savedQuestions : []);
        setCategories(buildVisibleCategories(Array.isArray(categoryList) ? categoryList : []));
      } catch (error) {
        setPageErrorMessage(error?.message || "저장된 질문을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [navigate]);

  const leafCategories = useMemo(() => categories.filter((item) => item?.isLeaf), [categories]);
  const jobs = useMemo(() => categories.filter((item) => Number(item?.depth) === 1), [categories]);
  const categoryMap = useMemo(() => buildCategoryMap(categories), [categories]);
  const selectedJob = useMemo(() => jobs.find((job) => String(job.categoryId) === String(jobFilter)) || null, [jobFilter, jobs]);
  const selectedJobBranchId = useMemo(() => String(selectedJob?.parentId || ""), [selectedJob?.parentId]);
  const selectedJobBranchName = useMemo(
    () => (selectedJob ? getBranchDisplayName(categoryMap, selectedJob.categoryId) : ""),
    [categoryMap, selectedJob]
  );

  const visibleCategories = useMemo(() => {
    const keyword = categoryQuery.trim().toLowerCase();
    const matched = jobFilter
      ? filterSkillCategoriesByBranchAndJob({
          categories,
          branchId: selectedJobBranchId,
          jobId: jobFilter,
          keyword,
        })
      : leafCategories.filter((category) => searchCategoryByText(category, keyword));
    return showAllCategories ? matched : matched.slice(0, 8);
  }, [categories, categoryQuery, jobFilter, leafCategories, selectedJobBranchId, showAllCategories]);

  const enrichedItems = useMemo(() => items.map((item) => {
    return {
      ...item,
      branchName: item.branchName || getBranchDisplayName(categoryMap, item.categoryId) || "기타",
      jobName: item.jobName || getJobDisplayName(categoryMap, item.categoryId) || "기타",
      skillName: item.skillName || getSkillDisplayName(categoryMap, item.categoryId) || "미분류",
      categoryName: item.category || item.skillName || getSkillDisplayName(categoryMap, item.categoryId) || "미분류",
    };
  }), [items, categoryMap]);

  const filteredItems = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return enrichedItems.filter((item) => {
      const createdDateKey = normalizeDateInput(item.createdAt);
      if (jobFilter) {
        const itemJobName = String(item.jobName || "").trim();
        const itemBranchName = String(item.branchName || "").trim();
        const targetJobName = String(selectedJob?.name || "").trim();
        if (!itemBranchName || itemBranchName !== selectedJobBranchName) return false;
        if (itemJobName !== targetJobName && itemJobName !== "공통") return false;
      }
      if (selectedCategoryId && String(item.categoryId || "") !== selectedCategoryId) return false;
      if (selectedRating && item.difficulty !== ratingToDifficulty(selectedRating)) return false;
      if (dateFrom && createdDateKey < dateFrom) return false;
      if (dateTo && createdDateKey > dateTo) return false;
      if (!keyword) return true;
      return [item.questionText, item.categoryName, item.modelAnswer, item.canonicalAnswer, item.bestPractice, item.feedback, item.answerText, ...(item.tags || [])].filter(Boolean).join(" ").toLowerCase().includes(keyword);
    });
  }, [dateFrom, dateTo, enrichedItems, jobFilter, query, selectedCategoryId, selectedJob?.name, selectedJobBranchName, selectedRating]);

  const selectedItems = useMemo(
    () => enrichedItems.filter((item) => selectedSavedIds.includes(item.savedQuestionId)),
    [enrichedItems, selectedSavedIds]
  );

  const selectableSelectedItems = useMemo(
    () => selectedItems.filter((item) => item.questionKind === "TECH" && item.categoryId && item.jobName && item.categoryName),
    [selectedItems]
  );

  const selectedBranchNames = useMemo(() => {
    const keys = new Set(
      selectableSelectedItems.map((item) => String(item.branchName || "").trim()).filter(Boolean)
    );
    return [...keys];
  }, [selectableSelectedItems]);

  const selectedGroupSummary = useMemo(() => {
    if (!selectableSelectedItems.length) return "";
    const first = selectableSelectedItems[0];
    const jobNames = [...new Set(selectableSelectedItems.map((item) => String(item.jobName || "").trim()).filter(Boolean))];
    const skillNames = [...new Set(selectableSelectedItems.map((item) => String(item.skillName || item.categoryName || "").trim()).filter(Boolean))];
    return `${first.branchName} · ${jobNames.slice(0, 2).join(", ")} · ${skillNames.slice(0, 3).join(", ")}${skillNames.length > 3 ? ` 외 ${skillNames.length - 3}개` : ""}`;
  }, [selectableSelectedItems]);

  useEffect(() => {
    setPage(1);
  }, [query, jobFilter, categoryQuery, selectedCategoryId, selectedRating, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const pagedItems = filteredItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const handleSidebarNavigate = (item) => {
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

  const handleDelete = async () => {
    const savedQuestionId = deleteTargetQuestion?.savedQuestionId;
    if (!savedQuestionId) return;
    setDeletingQuestion(true);
    try {
      await deleteSavedInterviewQuestion(savedQuestionId);
      setItems((prev) => prev.filter((item) => item.savedQuestionId !== savedQuestionId));
      setSelectedSavedIds((prev) => prev.filter((id) => id !== savedQuestionId));
      setSelectedQuestion((prev) => (prev?.savedQuestionId === savedQuestionId ? null : prev));
      setDeleteTargetQuestion(null);
    } catch (error) {
      setPageErrorMessage(error?.message || "저장된 질문 삭제에 실패했습니다.");
    } finally {
      setDeletingQuestion(false);
    }
  };

  const handleToggleSavedQuestion = (savedQuestionId) => {
    const target = enrichedItems.find((item) => item.savedQuestionId === savedQuestionId);
    if (!target) return;
    setSelectedSavedIds((prev) => {
      if (prev.includes(savedQuestionId)) {
        return prev.filter((id) => id !== savedQuestionId);
      }
      const currentBranches = new Set(
        enrichedItems
          .filter((item) => prev.includes(item.savedQuestionId))
          .map((item) => String(item.branchName || "").trim())
          .filter(Boolean)
      );
      const nextBranchName = String(target.branchName || "").trim();
      if (currentBranches.size > 0 && nextBranchName && !currentBranches.has(nextBranchName)) {
        setPageErrorMessage("새 문답 세트에는 같은 계열의 저장 질문만 함께 담을 수 있습니다.");
        return prev;
      }
      setPageErrorMessage("");
      return [...prev, savedQuestionId];
    });
  };

  const handleOpenCreateSetModal = () => {
    setCreateSetErrorMessage("");
    setNewSetTitle("");
    if (!selectedSavedIds.length) {
      setPageErrorMessage("새 세트로 묶을 저장 질문을 먼저 선택해 주세요.");
      return;
    }
    if (!selectableSelectedItems.length) {
      setPageErrorMessage("현재는 기술 질문 저장본만 새 문답 세트로 만들 수 있습니다.");
      return;
    }
    setShowCreateSetModal(true);
  };

  const handleCreateSetFromSaved = async () => {
    const normalizedTitle = newSetTitle.trim();
    if (!normalizedTitle) {
      setCreateSetErrorMessage("세트 제목을 입력해 주세요.");
      return;
    }
    if (!selectableSelectedItems.length) {
      setCreateSetErrorMessage("현재는 기술 질문 저장본만 새 문답 세트로 만들 수 있습니다.");
      return;
    }
    if (selectableSelectedItems.length !== selectedSavedIds.length) {
      setCreateSetErrorMessage("문서 질문은 아직 세트에 함께 담을 수 없습니다. 기술 질문만 선택해 주세요.");
      return;
    }
    if (selectedBranchNames.length !== 1) {
      setCreateSetErrorMessage("하나의 문답 세트에는 같은 계열의 저장 질문만 담을 수 있습니다.");
      return;
    }

    const base = selectableSelectedItems[0];
    setCreatingSet(true);
    setCreateSetErrorMessage("");
    try {
      const createdSet = await createInterviewSet({
        title: normalizedTitle,
        branchName: base.branchName,
        description: `저장된 질문 ${selectableSelectedItems.length}개로 만든 세트`,
        visibility: "PRIVATE",
      });

      const failedRows = [];
      for (const item of selectableSelectedItems) {
        try {
          await addQuestionToInterviewSet(createdSet.setId, {
            questionText: item.questionText,
            canonicalAnswer: item.canonicalAnswer || item.modelAnswer || "",
            categoryId: item.categoryId,
            jobName: item.jobName,
            skillName: item.skillName || item.categoryName,
            difficulty: item.difficulty || "MEDIUM",
            tags: item.tags || [],
          });
        } catch (error) {
          failedRows.push(error?.message || "질문 추가 실패");
        }
      }

      if (failedRows.length > 0) {
        try {
          await deleteInterviewSet(createdSet.setId);
        } catch (rollbackError) {
          console.error(`저장 질문 세트 롤백에 실패했습니다. setId=${createdSet.setId}`, rollbackError);
        }
        setCreateSetErrorMessage(`질문 세트 생성 중 일부 문답 저장에 실패했습니다. ${failedRows[0]}`);
        return;
      }

      setSelectedSavedIds([]);
      setShowCreateSetModal(false);
      setPageErrorMessage("새 문답 세트를 생성했습니다. 내 질문 세트에서 확인해 주세요.");
    } catch (error) {
      setCreateSetErrorMessage(error?.message || "저장 질문으로 세트를 만드는 데 실패했습니다.");
    } finally {
      setCreatingSet(false);
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-white pt-[54px]">
      <ContentTopNav point={formatPoint(userPoint)} onClickCharge={() => setShowPointChargeModal(true)} onOpenMenu={() => setIsMobileMenuOpen(true)} />
      <MobileSidebarDrawer open={isMobileMenuOpen} activeKey="saved_question" onClose={() => setIsMobileMenuOpen(false)} onNavigate={handleSidebarNavigate} userName={userName} profileImageUrl={profileImageUrl} onLogout={() => { setIsMobileMenuOpen(false); setShowLogoutModal(true); }} />
      <div className="flex min-h-[calc(100vh-54px)]">
        <div className="hidden w-[272px] shrink-0 md:block"><Sidebar activeKey="saved_question" onNavigate={handleSidebarNavigate} userName={userName} profileImageUrl={profileImageUrl} onLogout={() => setShowLogoutModal(true)} /></div>
        <main className="flex min-w-0 flex-1 flex-col px-4 pb-8 pt-6 sm:px-5 md:px-8 md:pt-10">
          <div className="mx-auto w-full max-w-[1280px]">
            <section className="rounded-[24px] border border-[#e4e7ee] bg-[linear-gradient(180deg,#ffffff_0%,#f7f9fc_100%)] p-6">
              <p className="text-[12px] font-semibold tracking-[0.08em] text-[#7a8190]">SAVED QUESTIONS</p>
              <h1 className="mt-2 text-[30px] font-semibold tracking-[-0.02em] text-[#161a22] sm:text-[40px]">질문 카드를 빠르게 다시 찾습니다</h1>
              <p className="mt-3 text-[14px] leading-[1.7] text-[#5e6472]">직무, 카테고리, 난이도, 날짜 기준으로 추려서 필요한 질문만 바로 다시 보실 수 있습니다.</p>
            </section>

            <section className="mt-5 rounded-[24px] border border-[#e4e7ee] bg-white p-5 sm:p-6">
              <div className="grid gap-3 xl:grid-cols-[1.2fr_180px_1fr_auto_auto]">
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="질문, 답변, 태그 검색" className="rounded-[14px] border border-[#dfe3eb] px-4 py-3 text-[13px] outline-none focus:border-[#8aa2e8]" />
                <select value={jobFilter} onChange={(event) => { setJobFilter(event.target.value); setSelectedCategoryId(""); }} className="rounded-[14px] border border-[#dfe3eb] px-4 py-3 text-[13px] outline-none focus:border-[#8aa2e8]">
                  <option value="">전체 직무</option>
                  {jobs
                    .slice()
                    .sort((left, right) => {
                      const leftCommon = isCommonJobCategory(left) ? 0 : 1;
                      const rightCommon = isCommonJobCategory(right) ? 0 : 1;
                      if (leftCommon !== rightCommon) return leftCommon - rightCommon;
                      return String(left.displayName || left.name || "").localeCompare(String(right.displayName || right.name || ""), "ko");
                    })
                    .map((job) => <option key={job.categoryId} value={String(job.categoryId)}>{getCategoryDisplayName(job)}</option>)}
                </select>
                <input value={categoryQuery} onChange={(event) => setCategoryQuery(event.target.value)} placeholder="카테고리 검색" className="rounded-[14px] border border-[#dfe3eb] px-4 py-3 text-[13px] outline-none focus:border-[#8aa2e8]" />
                <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="rounded-[14px] border border-[#dfe3eb] px-4 py-3 text-[13px] outline-none focus:border-[#8aa2e8]" />
                <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="rounded-[14px] border border-[#dfe3eb] px-4 py-3 text-[13px] outline-none focus:border-[#8aa2e8]" />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <CategoryChip label="전체 카테고리" active={!selectedCategoryId} onClick={() => setSelectedCategoryId("")} />
                {visibleCategories.map((category) => (
                  <CategoryChip
                    key={category.categoryId}
                    label={`${category.displayName || getCategoryDisplayName(category)}${category.isCommon ? " · 공통" : ""}`}
                    active={selectedCategoryId === String(category.categoryId)}
                    onClick={() => setSelectedCategoryId(String(category.categoryId))}
                  />
                ))}
                {(jobFilter
                  ? filterSkillCategoriesByBranchAndJob({
                      categories,
                      branchId: selectedJobBranchId,
                      jobId: jobFilter,
                    }).length
                  : leafCategories.length) > 8 ? (
                  <CategoryChip
                    label={
                      showAllCategories
                        ? "접기"
                        : `+${
                            (jobFilter
                              ? filterSkillCategoriesByBranchAndJob({
                                  categories,
                                  branchId: selectedJobBranchId,
                                  jobId: jobFilter,
                                }).length
                              : leafCategories.length) - 8
                          }`
                    }
                    onClick={() => setShowAllCategories((prev) => !prev)}
                  />
                ) : null}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <DifficultyChip label="전체 난이도" active={!selectedRating} onClick={() => setSelectedRating("")} />
                {[1, 2, 3, 4, 5].map((rating) => <DifficultyChip key={rating} label={<StarIcons rating={rating} sizeClass="text-[11px]" />} active={Number(selectedRating) === rating} onClick={() => setSelectedRating(String(rating))} />)}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-dashed border-[#d7dce5] bg-[#fafbfd] px-4 py-3">
                <div className="text-[12px] text-[#5e6472]">
                  선택 {selectedSavedIds.length}개
                  {selectedGroupSummary ? ` · ${selectedGroupSummary}` : ""}
                </div>
                <button
                  type="button"
                  onClick={handleOpenCreateSetModal}
                  disabled={!selectedSavedIds.length}
                  className="rounded-[12px] border border-[#171b24] px-3 py-2 text-[12px] font-semibold text-[#171b24] disabled:opacity-50"
                >
                  선택한 질문으로 세트 만들기
                </button>
              </div>
            </section>

            <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {loading ? <p className="text-[13px] text-[#5e6472]">저장된 질문을 불러오는 중...</p> : null}
              {!loading && pagedItems.length === 0 ? <p className="text-[13px] text-[#5e6472]">조건에 맞는 저장 질문이 없습니다.</p> : null}
              {pagedItems.map((item) => {
                const sanitizedTags = (item.tags || []).map(sanitizeQuestionTag).filter(Boolean);
                const selected = selectedSavedIds.includes(item.savedQuestionId);
                const selectable = item.questionKind === "TECH";
                const branchLocked = selectedBranchNames.length > 0 && !selectedBranchNames.includes(String(item.branchName || "").trim());
                const disabledByBranch = selectable && !selected && branchLocked;
                return (
                  <article key={item.savedQuestionId} className={`rounded-[22px] border bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.04)] transition hover:border-[#cfd6e4] hover:shadow-[0_18px_36px_rgba(15,23,42,0.08)] ${selected ? "border-[#171b24]" : "border-[#e4e7ee]"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <label className={`mt-0.5 inline-flex shrink-0 items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${selectable && !disabledByBranch ? "cursor-pointer border-[#d8dde7] text-[#4f5664]" : "border-[#f0d4d4] bg-[#fff7f7] text-[#b54747]"}`}>
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => handleToggleSavedQuestion(item.savedQuestionId)}
                            disabled={!selectable || disabledByBranch}
                            className="sr-only"
                          />
                          <span className={`flex h-4 w-4 items-center justify-center rounded-[5px] border text-[10px] ${selected ? "border-[#171b24] bg-[#171b24] text-white" : "border-[#c7cfdd] bg-white text-transparent"} ${!selectable ? "opacity-50" : ""}`}>✓</span>
                          <span>{!selectable ? "세트화 불가" : disabledByBranch ? "다른 계열" : selected ? "선택됨" : "세트 선택"}</span>
                        </label>
                        <button type="button" onClick={() => setSelectedQuestion(item)} className="min-w-0 flex-1 text-left">
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full bg-[#eef6ec] px-3 py-1 text-[11px] text-[#496542]">{item.branchName}</span>
                          <span className={`rounded-full px-3 py-1 text-[11px] ${item.jobName === "공통" ? "bg-[#ebf8ff] text-[#2b6cb0]" : "bg-[#eef2f8] text-[#556070]"}`}>{item.jobName}</span>
                          <span className={`rounded-full px-3 py-1 text-[11px] ${item.jobName === "공통" ? "bg-[#ebf8ff] text-[#2b6cb0]" : "bg-[#f4f6fb] text-[#556070]"}`}>{item.skillName || item.categoryName}</span>
                          {item.difficulty ? <DifficultyStars difficulty={item.difficulty} compact /> : null}
                          {item.questionKind !== "TECH" ? <span className="rounded-full bg-[#fff1f1] px-3 py-1 text-[11px] text-[#b54747]">세트화 불가</span> : null}
                          {disabledByBranch ? <span className="rounded-full bg-[#fff1f1] px-3 py-1 text-[11px] text-[#b54747]">선택 계열과 다름</span> : null}
                        </div>
                        <p className="mt-4 line-clamp-5 whitespace-pre-wrap text-[17px] font-semibold leading-[1.7] text-[#171b24]">{item.questionText}</p>
                        {sanitizedTags.length > 0 ? <div className="mt-4 flex flex-wrap gap-2">{sanitizedTags.slice(0, 4).map((tag) => <span key={`${item.savedQuestionId}-${tag}`} className="rounded-full bg-[#fff7ed] px-3 py-1 text-[11px] text-[#9a5b11]">#{tag}</span>)}</div> : null}
                        <div className="mt-4 text-[11px] text-[#6b7280]">저장일 {formatDate(item.createdAt)}</div>
                        </button>
                      </div>
                      <button type="button" onClick={() => setDeleteTargetQuestion(item)} className="shrink-0 rounded-[12px] border border-[#d8dde7] px-3 py-2 text-[12px] text-[#4f5664]">삭제</button>
                    </div>
                  </article>
                );
              })}
            </section>

            <div className="mt-5 flex items-center justify-center gap-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))} className="rounded-[12px] border border-[#d8dde7] px-3 py-2 text-[12px] text-[#4f5664] disabled:opacity-50">이전</button>
              <span className="text-[12px] text-[#5e6472]">{currentPage} / {totalPages}</span>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} className="rounded-[12px] border border-[#d8dde7] px-3 py-2 text-[12px] text-[#4f5664] disabled:opacity-50">다음</button>
            </div>

            {pageErrorMessage ? <p className="mt-4 text-[12px] text-[#dc4b4b]">{pageErrorMessage}</p> : null}
          </div>
        </main>
      </div>
      {selectedQuestion ? <QuestionAnswerDetailModal item={selectedQuestion} onClose={() => setSelectedQuestion(null)} /> : null}
      {showCreateSetModal ? (
        <CreateSetFromSavedModal
          title="저장된 질문으로 새 문답 세트 만들기"
          setTitle={newSetTitle}
          onChangeTitle={setNewSetTitle}
          saving={creatingSet}
          selectedCount={selectedSavedIds.length}
          summaryLabel={selectedGroupSummary ? `기준: ${selectedGroupSummary}` : ""}
          errorMessage={createSetErrorMessage}
          onCancel={() => {
            if (creatingSet) return;
            setShowCreateSetModal(false);
            setCreateSetErrorMessage("");
          }}
          onConfirm={() => void handleCreateSetFromSaved()}
        />
      ) : null}
      {deleteTargetQuestion ? <DeleteConfirmModal targetQuestion={deleteTargetQuestion} deleting={deletingQuestion} onCancel={() => setDeleteTargetQuestion(null)} onConfirm={handleDelete} /> : null}
      {showLogoutModal ? <LogoutConfirmModal onCancel={() => setShowLogoutModal(false)} onConfirm={handleLogoutConfirm} /> : null}
      {showPointChargeModal ? <PointChargeModal onClose={() => setShowPointChargeModal(false)} onCharged={(result) => { setUserPoint(parsePoint(result?.currentPoint)); setShowPointChargeModal(false); setShowPointChargeSuccessModal(true); }} /> : null}
      {showPointChargeSuccessModal ? <PointChargeSuccessModal onClose={() => setShowPointChargeSuccessModal(false)} /> : null}
    </div>
  );
};
