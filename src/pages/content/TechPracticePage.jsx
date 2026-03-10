import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ContentTopNav } from "../../components/ContentTopNav";
import { MobileSidebarDrawer } from "../../components/MobileSidebarDrawer";
import { GeminiOverloadModal } from "../../components/GeminiOverloadModal";
import { PointChargeModal } from "../../components/PointChargeModal";
import { PointChargeSuccessModal } from "../../components/PointChargeSuccessModal";
import { Sidebar } from "../../components/Sidebar";
import { StarIcons } from "../../components/DifficultyStars";
import tempProfileImage from "../../assets/icon/temp.png";
import { logout } from "../../lib/authApi";
import { filterSkillCategoriesByBranchAndJob, getCategoryDisplayName, searchCategoryByText } from "../../lib/categoryPresentation";
import { ratingToDifficulty } from "../../lib/difficultyRating";
import { saveTechInterviewSession } from "../../lib/interviewSessionFlow";
import { consumePointChargeSuccessResult } from "../../lib/pointChargeFlow";
import { createInterviewCategory, getInterviewCategories, startTechInterview } from "../../lib/interviewApi";
import { isGeminiOverloadError } from "../../lib/geminiErrorUtils";
import { getMyProfile, getMyProfileImageUrl } from "../../lib/userApi";

const QUESTION_COUNT = 5;
const DEFAULT_RATING = 3;

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
const extractProfile = (payload) => {
  if (!payload || typeof payload !== "object") return {};
  if (payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)) return payload.data;
  if (payload.result && typeof payload.result === "object" && !Array.isArray(payload.result)) return payload.result;
  if (payload.user && typeof payload.user === "object" && !Array.isArray(payload.user)) return payload.user;
  return payload;
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

const InlineSpinner = ({ label }) => (
  <div className="inline-flex items-center gap-2 text-[12px] text-[#5e6472]">
    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#cbd5e1] border-t-[#171b24]" />
    <span>{label}</span>
  </div>
);

const DifficultyChip = ({ label, active = false, onClick }) => (
  <button type="button" onClick={onClick} className={`rounded-full border px-3 py-1 text-[11px] transition ${active ? "border-[#9d6320] bg-[#fff5ea] text-[#9d6320]" : "border-[#eceff4] bg-white text-[#6b7280]"}`}>
    {label}
  </button>
);

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
  const [pageErrorMessage, setPageErrorMessage] = useState("");
  const [showGeminiOverloadModal, setShowGeminiOverloadModal] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState(false);
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
    const matchedJob = normalizedPreferredJobName
      ? jobs.find((job) => String(job?.name || "").trim().toLowerCase() === normalizedPreferredJobName)
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
      const preferredSkill = skills.find((skill) => String(skill?.name || "").trim().toLowerCase() === normalizedPreferredSkillName);
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
      } catch {
        navigate("/login", { replace: true });
        return;
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
  const categoryCards = useMemo(() => {
    if (!selectedSkillId) return visibleSkills;
    return visibleSkills.filter((category) => String(category.categoryId) === String(selectedSkillId));
  }, [selectedSkillId, visibleSkills]);

  const canCreateBranch = Boolean(branchQuery.trim() && !branchItems.some((branch) => (branch.name || "").trim().toLowerCase() === branchQuery.trim().toLowerCase()));
  const canCreateJob = Boolean(branchFilter && jobQuery.trim() && !visibleJobs.some((job) => (job.displayName || job.name).toLowerCase() === jobQuery.trim().toLowerCase()));
  const canCreateCategory = Boolean(
    categoryQuery.trim() &&
      jobFilter &&
      !skillCategories.some((item) => (item.displayName || item.name || "").trim().toLowerCase() === categoryQuery.trim().toLowerCase()),
  );
  const branchAlreadyExists = Boolean(branchQuery.trim() && !canCreateBranch);
  const jobAlreadyExists = Boolean(jobQuery.trim() && !canCreateJob);
  const categoryAlreadyExists = Boolean(categoryQuery.trim() && !canCreateCategory);
  const selectedBranch = useMemo(() => branchItems.find((item) => String(item.categoryId) === String(branchFilter)) || null, [branchFilter, branchItems]);
  const selectedJob = useMemo(() => jobs.find((item) => String(item.categoryId) === String(jobFilter)) || null, [jobFilter, jobs]);
  useEffect(() => {
    if (!branchFilter) return;
    if (visibleJobs.some((job) => String(job.categoryId) === String(jobFilter))) return;
    setJobFilter("");
    setSelectedSkillId("");
  }, [branchFilter, jobFilter, visibleJobs]);

  useEffect(() => {
    if (!selectedSkillId) return;
    if (visibleSkills.some((skill) => String(skill.categoryId) === String(selectedSkillId))) return;
    setSelectedSkillId("");
  }, [selectedSkillId, visibleSkills]);

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
          categoryName: category.name,
          difficultyLabel: ratingToDifficulty(selectedRating),
          questionCount: QUESTION_COUNT,
          selectedDocuments: {},
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
      setJobQuery(displayName);
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
      setBranchQuery(displayName);
      setJobQuery("");
      setCategoryQuery("");
      setSelectedSkillId("");
    } catch (error) {
      setPageErrorMessage(error?.message || "계열 생성에 실패했습니다.");
    } finally {
      setCreatingCategory(false);
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-white pt-[54px]">
      <ContentTopNav point={formatPoint(userPoint)} onClickCharge={() => { if (!isStartingPractice) setShowPointChargeModal(true); }} onOpenMenu={() => { if (!isStartingPractice) setIsMobileMenuOpen(true); }} />

      <MobileSidebarDrawer open={isMobileMenuOpen} activeKey="tech_practice" onClose={() => setIsMobileMenuOpen(false)} onNavigate={handleSidebarNavigate} userName={userName} profileImageUrl={profileImageUrl} onLogout={() => { setIsMobileMenuOpen(false); setShowLogoutModal(true); }} />

      <div className="flex min-h-[calc(100vh-54px)]">
        <div className="hidden w-[272px] shrink-0 md:block">
          <Sidebar activeKey="tech_practice" onNavigate={handleSidebarNavigate} userName={userName} profileImageUrl={profileImageUrl} onLogout={() => setShowLogoutModal(true)} />
        </div>

        <main className="flex min-w-0 flex-1 flex-col px-4 pb-8 pt-6 sm:px-5 md:px-8 md:pt-10">
          <div className="mx-auto w-full max-w-[1280px]">
            <section className="rounded-[24px] border border-[#e4e7ee] bg-[linear-gradient(180deg,#ffffff_0%,#f7f9fc_100%)] p-6">
              <p className="text-[12px] font-semibold tracking-[0.08em] text-[#7a8190]">TECH PRACTICE</p>
              <h1 className="mt-2 text-[30px] font-semibold tracking-[-0.02em] text-[#161a22] sm:text-[40px]">카테고리 기준으로 실전 연습을 시작합니다</h1>
              <p className="mt-3 text-[14px] leading-[1.7] text-[#5e6472]">직무와 기술 카테고리, 난이도를 고르면 해당 기준에 맞는 기술질문 연습을 바로 시작하실 수 있습니다.</p>
            </section>

            <section className="mt-5 rounded-[24px] border border-[#e4e7ee] bg-white p-5 sm:p-6">
              <div className="space-y-5">
                <div className="rounded-[20px] border border-[#edf1f7] bg-[#fafbfd] p-4">
                  <p className="text-[12px] font-semibold tracking-[0.08em] text-[#7a8190]">1. 계열 선택</p>
                  <div className="mt-3 grid gap-3 xl:grid-cols-[1fr_auto]">
                    <input value={branchQuery} onChange={(event) => setBranchQuery(event.target.value)} placeholder="계열 검색 또는 새 계열 입력" className="rounded-[14px] border border-[#dfe3eb] bg-white px-4 py-3 text-[13px] outline-none focus:border-[#8aa2e8]" />
                    {canCreateBranch ? <button type="button" disabled={creatingCategory} onClick={handleCreateBranch} className="rounded-[14px] border border-[#171b24] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#171b24] disabled:opacity-60">{creatingCategory ? "생성 중..." : "계열 추가"}</button> : <div />}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <DifficultyChip label="전체 계열" active={!branchFilter} onClick={() => setBranchFilter("")} />
                    {visibleBranches.map((branch) => (
                      <DifficultyChip
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
                  <p className={`mt-3 text-[12px] ${branchAlreadyExists ? "text-[#d14343]" : "text-[#7a8190]"}`}>
                    {branchAlreadyExists
                      ? "같은 이름의 계열이 이미 있습니다. 중복/장난 입력은 관리자 확인 후 즉시 로그인 차단될 수 있습니다."
                      : "새로 만든 계열은 바로 선택됩니다. 장난성 입력은 관리자 확인 후 즉시 로그인 차단될 수 있습니다."}
                  </p>
                </div>

                <div className="rounded-[20px] border border-[#edf1f7] bg-[#fafbfd] p-4">
                  <p className="text-[12px] font-semibold tracking-[0.08em] text-[#7a8190]">2. 직무 선택</p>
                  <div className="mt-3 grid gap-3 xl:grid-cols-[1fr_auto]">
                    <input value={jobQuery} onChange={(event) => setJobQuery(event.target.value)} placeholder={branchFilter ? "직무 검색 또는 새 직무 입력" : "계열을 먼저 선택해 주세요"} disabled={!branchFilter} className="rounded-[14px] border border-[#dfe3eb] bg-white px-4 py-3 text-[13px] outline-none focus:border-[#8aa2e8] disabled:bg-[#f3f5f8]" />
                    {canCreateJob ? <button type="button" disabled={creatingCategory} onClick={handleCreateJob} className="rounded-[14px] border border-[#171b24] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#171b24] disabled:opacity-60">{creatingCategory ? "생성 중..." : "직무 추가"}</button> : <div />}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <DifficultyChip label="전체 직무" active={!jobFilter} onClick={() => setJobFilter("")} />
                    {visibleJobs.map((job) => (
                      <DifficultyChip
                        key={job.categoryId}
                        label={job.displayName || getCategoryDisplayName(job)}
                        active={jobFilter === String(job.categoryId)}
                        onClick={() => {
                          setJobFilter(String(job.categoryId));
                          setSelectedSkillId("");
                        }}
                      />
                    ))}
                  </div>
                  <p className={`mt-3 text-[12px] ${jobAlreadyExists ? "text-[#d14343]" : "text-[#7a8190]"}`}>
                    {jobAlreadyExists
                      ? "같은 이름의 직무가 이미 있습니다. 중복/장난 입력은 관리자 확인 후 즉시 로그인 차단될 수 있습니다."
                      : "새로 만든 직무는 바로 선택됩니다. 장난성 입력은 관리자 확인 후 즉시 로그인 차단될 수 있습니다."}
                  </p>
                </div>

                <div className="rounded-[20px] border border-[#edf1f7] bg-[#fafbfd] p-4">
                  <p className="text-[12px] font-semibold tracking-[0.08em] text-[#7a8190]">3. 기술 선택</p>
                  <div className="mt-3 grid gap-3 xl:grid-cols-[1fr_auto]">
                    <input value={categoryQuery} onChange={(event) => setCategoryQuery(event.target.value)} placeholder={jobFilter ? "기술 검색 또는 새 기술 입력" : "직무를 먼저 선택해 주세요"} disabled={!jobFilter} className="rounded-[14px] border border-[#dfe3eb] bg-white px-4 py-3 text-[13px] outline-none focus:border-[#8aa2e8] disabled:bg-[#f3f5f8]" />
                    {canCreateCategory ? <button type="button" disabled={creatingCategory} onClick={handleCreateCategory} className="rounded-[14px] border border-[#171b24] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#171b24] disabled:opacity-60">{creatingCategory ? "생성 중..." : "기술 추가"}</button> : <div />}
                  </div>
                  {canCreateCategory ? (
                    <div className="mt-4 flex items-center justify-between gap-3 rounded-[18px] border border-dashed border-[#d7dce5] bg-white p-4">
                      <div>
                        <p className="text-[13px] font-semibold text-[#171b24]">`{categoryQuery.trim()}` 기술이 아직 없습니다.</p>
                        <p className="mt-1 text-[12px] text-[#5e6472]">선택한 직무 아래에 새 기술을 만들고 바로 연습 대상으로 사용할 수 있습니다.</p>
                      </div>
                      <button type="button" disabled={creatingCategory} onClick={handleCreateCategory} className="rounded-[14px] border border-[#171b24] px-4 py-2.5 text-[13px] font-semibold text-[#171b24] disabled:opacity-60">{creatingCategory ? "생성 중..." : "기술 추가"}</button>
                    </div>
                  ) : null}
                  <p className={`mt-3 text-[12px] ${categoryAlreadyExists ? "text-[#d14343]" : "text-[#7a8190]"}`}>
                    {categoryAlreadyExists
                      ? "같은 이름의 기술이 이미 있습니다. 직무가 달라도 중복 생성은 막힙니다. 장난성 입력은 관리자 확인 후 즉시 로그인 차단될 수 있습니다."
                      : "새로 만든 기술은 목록에 바로 반영됩니다. 장난성 입력은 관리자 확인 후 즉시 로그인 차단될 수 있습니다."}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <DifficultyChip label="전체 기술" active={!selectedSkillId} onClick={() => setSelectedSkillId("")} />
                    {visibleSkills.map((skill) => (
                      <DifficultyChip
                        key={skill.categoryId}
                        label={skill.isCommon ? `${skill.name} · 공통` : skill.name}
                        active={selectedSkillId === String(skill.categoryId)}
                        onClick={() => setSelectedSkillId(String(skill.categoryId))}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((rating) => <DifficultyChip key={rating} label={<StarIcons rating={rating} sizeClass="text-[11px]" />} active={Number(selectedRating) === rating} onClick={() => setSelectedRating(rating)} />)}
              </div>
            </section>

            <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {loading ? <p className="text-[13px] text-[#5e6472]">기술질문 연습 카테고리를 불러오는 중...</p> : null}
              {!loading && categoryCards.length === 0 ? <p className="text-[13px] text-[#5e6472]">조건에 맞는 카테고리가 없습니다.</p> : null}
              {categoryCards.map((category) => (
                <article key={category.categoryId} className="rounded-[22px] border border-[#e4e7ee] bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.04)]">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-[#eef6ec] px-3 py-1 text-[11px] text-[#496542]">{category.branchName}</span>
                    <span className={`px-3 py-1 text-[11px] ${category.isCommon ? "rounded-full bg-[#e8f4ff] text-[#2563a6]" : "rounded-full bg-[#eef2f8] text-[#556070]"}`}>{category.jobName}</span>
                    <span className="rounded-full bg-[#f4f6fb] px-3 py-1 text-[11px] text-[#556070]">{category.name}</span>
                    <span className="rounded-full bg-[#fff7ed] px-3 py-1 text-[11px] text-[#9a5b11]">선택 난이도 {selectedRating}점</span>
                  </div>
                  <p className="mt-4 text-[18px] font-semibold text-[#171b24]">{category.name}</p>
                  <p className="mt-2 text-[13px] leading-[1.7] text-[#5e6472]">선택한 난이도 기준으로 {QUESTION_COUNT}문항 연습을 시작합니다.</p>
                  <div className="mt-5 flex items-center justify-between gap-3">
                    {startingCategoryId === category.categoryId ? <InlineSpinner label="면접 시작 중..." /> : <span className="text-[12px] text-[#6b7280]">문항 {QUESTION_COUNT}개</span>}
                    <button type="button" disabled={isStartingPractice} onClick={() => handleStartPractice(category)} className="rounded-[14px] bg-[#171b24] px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60">{startingCategoryId === category.categoryId ? "시작 중..." : "연습 시작"}</button>
                  </div>
                </article>
              ))}
            </section>

            {pageErrorMessage ? <p className="mt-4 text-[12px] text-[#dc4b4b]">{pageErrorMessage}</p> : null}
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
      {isStartingPractice ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#0f172acc]">
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
