import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ContentTopNav } from "../../components/ContentTopNav";
import { MobileSidebarDrawer } from "../../components/MobileSidebarDrawer";
import { PointChargeModal } from "../../components/PointChargeModal";
import { PointChargeSuccessModal } from "../../components/PointChargeSuccessModal";
import { QuestionAnswerDetailModal } from "../../components/QuestionAnswerDetailModal";
import { Sidebar } from "../../components/Sidebar";
import { DifficultyStars, StarIcons, StarRatingInput } from "../../components/DifficultyStars";
import tempProfileImage from "../../assets/icon/temp.png";
import { logout } from "../../lib/authApi";
import { buildVisibleCategories, getCategoryDisplayName, sanitizeQuestionTag, searchCategoryByText } from "../../lib/categoryPresentation";
import { ratingToDifficulty } from "../../lib/difficultyRating";
import { consumePointChargeSuccessResult } from "../../lib/pointChargeFlow";
import { addQuestionToInterviewSet, createInterviewSet, getInterviewCategories, getInterviewSetQuestions, getInterviewSets, startTechInterview } from "../../lib/interviewApi";
import { saveTechInterviewSession } from "../../lib/interviewSessionFlow";
import { getMyProfile, getMyProfileImageUrl } from "../../lib/userApi";

const PAGE_SIZE = 12;
const DEFAULT_ROW = { questionText: "", canonicalAnswer: "", tags: "", rating: 3 };

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
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
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

const ConfirmDiscardModal = ({ onCancel, onConfirm }) => (
  <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/45 px-4" role="dialog" aria-modal="true">
    <div className="w-full max-w-[420px] rounded-[18px] border border-[#d9d9d9] bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.18)]">
      <p className="text-[15px] font-medium text-[#252525]">정말 종료하시겠습니까?<br />작성 중인 문답은 저장되지 않습니다.</p>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-[10px] border border-[#d6d6d6] px-3 py-1.5 text-[12px] text-[#666]">계속 작성</button>
        <button type="button" onClick={onConfirm} className="rounded-[10px] border border-[#1f1f1f] bg-[#1f1f1f] px-3 py-1.5 text-[12px] text-white">종료</button>
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

const InlineSpinner = ({ label }) => (
  <div className="inline-flex items-center gap-2 text-[12px] text-[#5e6472]"><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#cbd5e1] border-t-[#171b24]" />{label}</div>
);

const CreateQuestionSetModal = ({ categories, onClose, onSubmit, submitting, errorMessage }) => {
  const jobs = useMemo(() => categories.filter((item) => Number(item.depth) === 1), [categories]);
  const leafCategories = useMemo(() => categories.filter((item) => item.isLeaf), [categories]);
  const [setTitle, setSetTitle] = useState("");
  const [selectedJobId, setSelectedJobId] = useState(() => String(categories.find((item) => Number(item.depth) === 1)?.categoryId || ""));
  const [categoryQuery, setCategoryQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [rows, setRows] = useState([{ ...DEFAULT_ROW }]);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const filteredCategories = useMemo(() => {
    const keyword = categoryQuery.trim().toLowerCase();
    return leafCategories.filter((item) => {
      if (selectedJobId && String(item.parentId) !== selectedJobId) return false;
      if (!keyword) return true;
      return [item.name, item.code, item.path].filter(Boolean).join(" ").toLowerCase().includes(keyword);
    });
  }, [categoryQuery, leafCategories, selectedJobId]);

  const dirty = setTitle.trim() || categoryQuery.trim() || selectedCategoryId || rows.some((row) => row.questionText.trim() || row.canonicalAnswer.trim() || row.tags.trim());
  const requestClose = () => {
    if (submitting) return;
    if (dirty) return setShowDiscardConfirm(true);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 px-4" role="dialog" aria-modal="true">
        <div className="absolute inset-0" onClick={requestClose} />
        <div className="relative flex max-h-[90vh] w-full max-w-[1120px] flex-col overflow-hidden rounded-[28px] border border-[#dfe3eb] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
          <div className="border-b border-[#edf1f6] px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[12px] font-semibold tracking-[0.08em] text-[#7a8190]">CREATE Q&A SET</p>
                <h2 className="mt-2 text-[28px] font-semibold tracking-[-0.02em] text-[#161a22]">문답 세트 만들기</h2>
              </div>
              <button type="button" onClick={requestClose} className="rounded-full border border-[#d9dde5] px-3 py-1 text-[12px] text-[#4f5664]">닫기</button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
              <section className="space-y-4 rounded-[20px] border border-[#eef1f5] bg-[#fbfcfe] p-4">
                <div>
                  <p className="text-[12px] font-semibold text-[#738094]">세트 제목</p>
                  <input
                    value={setTitle}
                    onChange={(event) => setSetTitle(event.target.value)}
                    placeholder="예: 재무회계 핵심 문답 세트"
                    className="mt-2 w-full rounded-[14px] border border-[#dfe3eb] px-4 py-3 text-[13px] outline-none focus:border-[#8aa2e8]"
                  />
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-[#738094]">직무</p>
                  <select value={selectedJobId} onChange={(event) => { setSelectedJobId(event.target.value); setSelectedCategoryId(""); }} className="mt-2 w-full rounded-[14px] border border-[#dfe3eb] px-4 py-3 text-[13px] outline-none focus:border-[#8aa2e8]">
                    {jobs.map((job) => <option key={job.categoryId} value={String(job.categoryId)}>{getCategoryDisplayName(job)}</option>)}
                  </select>
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-[#738094]">기술 카테고리 검색</p>
                  <input value={categoryQuery} onChange={(event) => setCategoryQuery(event.target.value)} placeholder="예: Spring, Cloud, React" className="mt-2 w-full rounded-[14px] border border-[#dfe3eb] px-4 py-3 text-[13px] outline-none focus:border-[#8aa2e8]" />
                  <div className="mt-3 flex flex-wrap gap-2">
                    {filteredCategories.slice(0, 8).map((item) => <CategoryChip key={item.categoryId} label={item.displayName || item.name} active={selectedCategoryId === String(item.categoryId)} onClick={() => { setSelectedCategoryId(String(item.categoryId)); setCategoryQuery(item.displayName || item.name); }} />)}
                    {filteredCategories.length === 0 && categoryQuery.trim() ? <span className="rounded-full bg-[#fff7ed] px-3 py-1 text-[11px] text-[#9a5b11]">검색 결과가 없으므로 새 카테고리 생성 가능</span> : null}
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                {rows.map((row, index) => (
                  <article key={`row-${index}`} className="rounded-[20px] border border-[#eef1f5] bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[13px] font-semibold text-[#171b24]">문답 {index + 1}</p>
                      <button type="button" disabled={rows.length === 1} onClick={() => setRows((prev) => prev.length === 1 ? prev : prev.filter((_, rowIndex) => rowIndex !== index))} className="rounded-[10px] border border-[#d9dde5] px-3 py-1.5 text-[11px] text-[#4f5664] disabled:opacity-50">삭제</button>
                    </div>
                    <div className="mt-3 grid gap-3">
                      <textarea value={row.questionText} onChange={(event) => setRows((prev) => prev.map((item, rowIndex) => rowIndex === index ? { ...item, questionText: event.target.value } : item))} placeholder="질문" className="min-h-[110px] rounded-[16px] border border-[#dfe3eb] px-4 py-3 text-[13px] leading-[1.7] outline-none focus:border-[#8aa2e8]" />
                      <textarea value={row.canonicalAnswer} onChange={(event) => setRows((prev) => prev.map((item, rowIndex) => rowIndex === index ? { ...item, canonicalAnswer: event.target.value } : item))} placeholder="내가 생각하는 모범답안" className="min-h-[150px] rounded-[16px] border border-[#dfe3eb] px-4 py-3 text-[13px] leading-[1.7] outline-none focus:border-[#8aa2e8]" />
                      <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
                        <div className="flex items-center rounded-[14px] border border-[#dfe3eb] px-4 py-3">
                          <StarRatingInput value={row.rating} onChange={(rating) => setRows((prev) => prev.map((item, rowIndex) => rowIndex === index ? { ...item, rating } : item))} />
                        </div>
                        <input value={row.tags} onChange={(event) => setRows((prev) => prev.map((item, rowIndex) => rowIndex === index ? { ...item, tags: event.target.value } : item))} placeholder="태그 (쉼표 구분, 없어도 됨)" className="rounded-[14px] border border-[#dfe3eb] px-4 py-3 text-[13px] outline-none focus:border-[#8aa2e8]" />
                      </div>
                    </div>
                  </article>
                ))}
                <button type="button" onClick={() => setRows((prev) => [...prev, { ...DEFAULT_ROW }])} className="rounded-[14px] border border-[#d9dde5] px-4 py-2.5 text-[13px] font-medium text-[#4f5664]">문답 추가</button>
              </section>
            </div>
          </div>

          <div className="border-t border-[#edf1f6] px-6 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {submitting ? <InlineSpinner label="문답 세트를 저장하는 중입니다." /> : <span className="text-[12px] text-[#6b7280]">저장 중에는 모달을 닫지 말아 주세요.</span>}
              <div className="flex items-center justify-end gap-2">
                <button type="button" disabled={submitting} onClick={requestClose} className="rounded-[14px] border border-[#d9dde5] px-4 py-2.5 text-[13px] text-[#4f5664] disabled:opacity-50">취소</button>
                <button type="button" disabled={submitting} onClick={() => onSubmit({ setTitle: setTitle.trim(), selectedJobId, selectedCategoryId, categoryQuery: categoryQuery.trim(), rows })} className="rounded-[14px] bg-[#171b24] px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60">{submitting ? "저장 중..." : "문답 세트 저장"}</button>
              </div>
            </div>
            {errorMessage ? <p className="mt-3 text-[12px] text-[#dc4b4b]">{errorMessage}</p> : null}
          </div>
        </div>
      </div>
      {showDiscardConfirm ? <ConfirmDiscardModal onCancel={() => setShowDiscardConfirm(false)} onConfirm={onClose} /> : null}
    </>
  );
};

export const QuestionSetsPage = () => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("사용자");
  const [userPoint, setUserPoint] = useState(0);
  const [profileImageUrl, setProfileImageUrl] = useState(tempProfileImage);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showPointChargeModal, setShowPointChargeModal] = useState(false);
  const [showPointChargeSuccessModal, setShowPointChargeSuccessModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cards, setCards] = useState([]);
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState("");
  const [jobFilter, setJobFilter] = useState("");
  const [categoryQuery, setCategoryQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedRating, setSelectedRating] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageErrorMessage, setPageErrorMessage] = useState("");
  const [modalErrorMessage, setModalErrorMessage] = useState("");
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [startingSetId, setStartingSetId] = useState(null);
  const [isStartingSetLaunch, setIsStartingSetLaunch] = useState(false);

  const loadPage = async () => {
    const [setList, categoryList] = await Promise.all([getInterviewSets(), getInterviewCategories()]);
    const normalizedSets = Array.isArray(setList) ? setList : [];
    const normalizedCategories = buildVisibleCategories(Array.isArray(categoryList) ? categoryList : []);
    const details = await Promise.all(normalizedSets.map(async (set) => ({ ...set, questions: (await getInterviewSetQuestions(set.setId)) || [] })));
    setCategories(normalizedCategories);
    setCards(
      details.flatMap((set) =>
        (set.questions || []).map((question) => ({
          ...question,
          setId: set.setId,
          setTitle: set.title,
          setJobName: set.jobName || null,
          setSkillName: set.skillName || null,
          createdAt: set.createdAt,
        }))
      )
    );
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
        await loadPage();
      } catch (error) {
        setPageErrorMessage(error?.message || "질문 세트를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [navigate]);

  const jobs = useMemo(() => categories.filter((item) => Number(item.depth) === 1), [categories]);
  const leafCategories = useMemo(() => categories.filter((item) => item.isLeaf), [categories]);
  const categoryMap = useMemo(() => new Map(categories.map((item) => [item.categoryId, item])), [categories]);

  const categoryOptions = useMemo(() => {
    const keyword = categoryQuery.trim().toLowerCase();
    const matched = leafCategories.filter((category) => {
      if (jobFilter && String(category.parentId) !== jobFilter) return false;
      return searchCategoryByText(category, keyword);
    });
    return showAllCategories ? matched : matched.slice(0, 8);
  }, [categoryQuery, jobFilter, leafCategories, showAllCategories]);

  const filteredCards = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return cards.filter((item) => {
      const category = categoryMap.get(item.categoryId);
      if (jobFilter && String(category?.parentId || "") !== jobFilter) return false;
      if (selectedCategoryId && String(item.categoryId) !== selectedCategoryId) return false;
      if (selectedRating && item.difficulty !== ratingToDifficulty(selectedRating)) return false;
      if (dateFrom && normalizeDateInput(item.createdAt) < dateFrom) return false;
      if (dateTo && normalizeDateInput(item.createdAt) > dateTo) return false;
      if (!keyword) return true;
      return [item.questionText, item.modelAnswer, item.canonicalAnswer, item.categoryName, item.skillName, item.jobName, item.setTitle, ...(item.tags || [])].filter(Boolean).join(" ").toLowerCase().includes(keyword);
    }).map((item) => ({
      ...item,
      categoryName: item.skillName || item.setSkillName || getCategoryDisplayName(categoryMap.get(item.categoryId)) || item.categoryName,
      jobName: item.jobName || item.setJobName || getCategoryDisplayName(categoryMap.get(categoryMap.get(item.categoryId)?.parentId)) || "기타",
    }));
  }, [cards, categoryMap, dateFrom, dateTo, jobFilter, query, selectedCategoryId, selectedRating]);

  useEffect(() => {
    setPage(1);
  }, [query, jobFilter, categoryQuery, selectedCategoryId, selectedRating, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filteredCards.length / PAGE_SIZE));
  const pagedCards = filteredCards.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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

  const handleCreateSet = async ({ setTitle, selectedJobId, selectedCategoryId: categoryIdRaw, categoryQuery: rawCategoryName, rows }) => {
    const normalizedRows = rows
      .map((row) => ({
        questionText: row.questionText.trim(),
        canonicalAnswer: row.canonicalAnswer.trim(),
        difficulty: ratingToDifficulty(row.rating || 3),
        tags: row.tags.split(",").map((item) => item.trim()).filter(Boolean),
      }))
      .filter((row) => row.questionText || row.canonicalAnswer || row.tags.length > 0);

    if (!normalizedRows.length) return setModalErrorMessage("질문과 모범답안을 하나 이상 입력해 주세요.");
    if (normalizedRows.some((row) => !row.questionText || !row.canonicalAnswer)) return setModalErrorMessage("모든 문답에는 질문과 모범답안이 모두 필요합니다.");
    if (!setTitle?.trim()) return setModalErrorMessage("세트 제목을 입력해 주세요.");

    setSubmitting(true);
    setModalErrorMessage("");
    try {
      const selectedJob = categories.find((item) => String(item.categoryId) === String(selectedJobId)) || null;
      const jobName = (selectedJob?.displayName || selectedJob?.name || "").trim();
      if (!jobName) {
        setModalErrorMessage("직무를 선택해 주세요.");
        setSubmitting(false);
        return;
      }

      let categoryId = categoryIdRaw ? Number(categoryIdRaw) : null;
      let category = categories.find((item) => item.categoryId === categoryId) || null;
      const rawName = rawCategoryName.trim();
      if (!category && !rawName) {
        setModalErrorMessage("기술을 선택하거나 입력해 주세요.");
        setSubmitting(false);
        return;
      }
      const skillName = (category?.displayName || category?.name || rawName).trim();
      if (!skillName) {
        setModalErrorMessage("기술을 선택하거나 입력해 주세요.");
        setSubmitting(false);
        return;
      }
      if (category?.isVirtual) {
        categoryId = null;
      }

      const createdSet = await createInterviewSet({
        title: setTitle.trim(),
        jobName,
        skillName,
        description: null,
        visibility: "PRIVATE",
      });
      for (const row of normalizedRows) {
        await addQuestionToInterviewSet(createdSet.setId, {
          questionText: row.questionText,
          canonicalAnswer: row.canonicalAnswer,
          categoryId,
          jobName,
          skillName,
          difficulty: row.difficulty,
          tags: row.tags,
        });
      }
      await loadPage();
      setShowCreateModal(false);
    } catch (error) {
      setModalErrorMessage(error?.message || "질문 세트 생성에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartSetPractice = async (item) => {
    if (!item?.setId || isStartingSetLaunch) return;
    setIsStartingSetLaunch(true);
    setStartingSetId(item.setId);
    setPageErrorMessage("");
    try {
      const response = await startTechInterview({
        setId: item.setId,
        jobName: item.jobName || null,
        skillName: item.categoryName || null,
        questionCount: 5,
        saveHistory: false,
      });
      saveTechInterviewSession({
        sessionId: response.sessionId,
        currentQuestion: response.currentQuestion,
        pendingResult: null,
        completed: false,
        metadata: {
          apiBasePath: "/api/interview/tech",
          fromQuestionSet: true,
          saveHistory: false,
          categoryName: item.categoryName,
        },
      });
      navigate("/content/interview/session");
    } catch (error) {
      setPageErrorMessage(error?.message || "질문 세트 연습 시작에 실패했습니다.");
    } finally {
      setStartingSetId(null);
      setIsStartingSetLaunch(false);
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-white pt-[54px]">
      <ContentTopNav point={formatPoint(userPoint)} onClickCharge={() => setShowPointChargeModal(true)} onOpenMenu={() => setIsMobileMenuOpen(true)} />
      <MobileSidebarDrawer open={isMobileMenuOpen} activeKey="question_set" onClose={() => setIsMobileMenuOpen(false)} onNavigate={handleSidebarNavigate} userName={userName} profileImageUrl={profileImageUrl} fallbackProfileImageUrl={tempProfileImage} onLogout={() => { setIsMobileMenuOpen(false); setShowLogoutModal(true); }} />
      <div className="flex min-h-[calc(100vh-54px)]">
        <div className="hidden w-[272px] shrink-0 md:block"><Sidebar activeKey="question_set" onNavigate={handleSidebarNavigate} userName={userName} profileImageUrl={profileImageUrl} fallbackProfileImageUrl={tempProfileImage} onLogout={() => setShowLogoutModal(true)} /></div>
        <main className="flex min-w-0 flex-1 flex-col px-4 pb-8 pt-6 sm:px-5 md:px-8 md:pt-10">
          <div className="mx-auto w-full max-w-[1280px]">
            <section className="rounded-[24px] border border-[#e4e7ee] bg-[linear-gradient(180deg,#ffffff_0%,#f7f9fc_100%)] p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[12px] font-semibold tracking-[0.08em] text-[#7a8190]">MY Q&A SETS</p>
                  <h1 className="mt-2 text-[30px] font-semibold tracking-[-0.02em] text-[#161a22] sm:text-[40px]">질문 카드 중심으로 관리합니다</h1>
                  <p className="mt-3 text-[14px] leading-[1.7] text-[#5e6472]">질문을 빠르게 훑고, 클릭했을 때 모달에서 질문과 답변을 확인하실 수 있습니다.</p>
                </div>
                <button type="button" onClick={() => setShowCreateModal(true)} className="rounded-[16px] bg-[#171b24] px-5 py-3 text-[13px] font-semibold text-white">문답 세트 만들기</button>
              </div>
            </section>

            <section className="mt-5 rounded-[24px] border border-[#e4e7ee] bg-white p-5 sm:p-6">
              <div className="grid gap-3 xl:grid-cols-[1.2fr_180px_1fr_auto_auto]">
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="질문, 모범답안, 태그 검색" className="rounded-[14px] border border-[#dfe3eb] px-4 py-3 text-[13px] outline-none focus:border-[#8aa2e8]" />
                <select value={jobFilter} onChange={(event) => { setJobFilter(event.target.value); setSelectedCategoryId(""); }} className="rounded-[14px] border border-[#dfe3eb] px-4 py-3 text-[13px] outline-none focus:border-[#8aa2e8]">
                  <option value="">전체 직무</option>
                  {jobs.map((job) => <option key={job.categoryId} value={String(job.categoryId)}>{getCategoryDisplayName(job)}</option>)}
                </select>
                <input value={categoryQuery} onChange={(event) => setCategoryQuery(event.target.value)} placeholder="카테고리 검색" className="rounded-[14px] border border-[#dfe3eb] px-4 py-3 text-[13px] outline-none focus:border-[#8aa2e8]" />
                <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="rounded-[14px] border border-[#dfe3eb] px-4 py-3 text-[13px] outline-none focus:border-[#8aa2e8]" />
                <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="rounded-[14px] border border-[#dfe3eb] px-4 py-3 text-[13px] outline-none focus:border-[#8aa2e8]" />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <CategoryChip label="전체 카테고리" active={!selectedCategoryId} onClick={() => setSelectedCategoryId("")} />
                {categoryOptions.map((category) => <CategoryChip key={category.categoryId} label={category.displayName || category.name} active={selectedCategoryId === String(category.categoryId)} onClick={() => setSelectedCategoryId(String(category.categoryId))} />)}
                {leafCategories.filter((category) => !jobFilter || String(category.parentId) === jobFilter).length > 8 ? <CategoryChip label={showAllCategories ? "접기" : `+${leafCategories.filter((category) => !jobFilter || String(category.parentId) === jobFilter).length - 8}`} onClick={() => setShowAllCategories((prev) => !prev)} /> : null}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <DifficultyChip label="전체 난이도" active={!selectedRating} onClick={() => setSelectedRating("")} />
                {[1, 2, 3, 4, 5].map((rating) => <DifficultyChip key={rating} label={<StarIcons rating={rating} sizeClass="text-[11px]" />} active={Number(selectedRating) === rating} onClick={() => setSelectedRating(String(rating))} />)}
              </div>
            </section>

            <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {loading ? <p className="text-[13px] text-[#5e6472]">질문 카드를 불러오는 중...</p> : null}
              {!loading && pagedCards.length === 0 ? <p className="text-[13px] text-[#5e6472]">조건에 맞는 질문 카드가 없습니다.</p> : null}
              {pagedCards.map((item) => (
                <div
                  key={`${item.setId}-${item.questionId}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedQuestion(item)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedQuestion(item);
                    }
                  }}
                  className="rounded-[22px] border border-[#e4e7ee] bg-white p-5 text-left shadow-[0_12px_32px_rgba(15,23,42,0.04)] transition hover:border-[#cfd6e4] hover:shadow-[0_18px_36px_rgba(15,23,42,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#171b24]/35"
                >
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-[#eef2f8] px-3 py-1 text-[11px] text-[#556070]">{item.jobName}</span>
                    <span className="rounded-full bg-[#f4f6fb] px-3 py-1 text-[11px] text-[#556070]">{item.categoryName}</span>
                    {item.sourceTag === "USER" ? <span className="rounded-full bg-[#e8f7ef] px-3 py-1 text-[11px] text-[#18784a]">사용자 생성</span> : null}
                    {item.difficulty ? <DifficultyStars difficulty={item.difficulty} compact /> : null}
                  </div>
                  <p className="mt-4 line-clamp-5 whitespace-pre-wrap text-[17px] font-semibold leading-[1.7] text-[#171b24]">{item.questionText}</p>
                  {(item.tags || []).map(sanitizeQuestionTag).filter(Boolean).length > 0 ? <div className="mt-4 flex flex-wrap gap-2">{item.tags.map(sanitizeQuestionTag).filter(Boolean).slice(0, 4).map((tag) => <span key={`${item.questionId}-${tag}`} className="rounded-full bg-[#fff7ed] px-3 py-1 text-[11px] text-[#9a5b11]">#{tag}</span>)}</div> : null}
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <p className="text-[11px] text-[#6b7280]">{formatDate(item.createdAt)}</p>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleStartSetPractice(item);
                      }}
                      disabled={isStartingSetLaunch || startingSetId === item.setId}
                      className="rounded-[10px] border border-[#171b24] px-3 py-1.5 text-[11px] font-semibold text-[#171b24] disabled:opacity-60"
                    >
                      {startingSetId === item.setId ? "연습 준비 중..." : "이 세트로 연습"}
                    </button>
                  </div>
                </div>
              ))}
            </section>

            <div className="mt-5 flex items-center justify-center gap-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))} className="rounded-[12px] border border-[#d8dde7] px-3 py-2 text-[12px] text-[#4f5664] disabled:opacity-50">이전</button>
              <span className="text-[12px] text-[#5e6472]">{page} / {totalPages}</span>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} className="rounded-[12px] border border-[#d8dde7] px-3 py-2 text-[12px] text-[#4f5664] disabled:opacity-50">다음</button>
            </div>

            {pageErrorMessage ? <p className="mt-4 text-[12px] text-[#dc4b4b]">{pageErrorMessage}</p> : null}
          </div>
        </main>
      </div>
      {selectedQuestion ? <QuestionAnswerDetailModal item={selectedQuestion} onClose={() => setSelectedQuestion(null)} /> : null}
      {showCreateModal ? <CreateQuestionSetModal categories={categories} submitting={submitting} errorMessage={modalErrorMessage} onClose={() => { setShowCreateModal(false); setModalErrorMessage(""); }} onSubmit={handleCreateSet} /> : null}
      {showLogoutModal ? <LogoutConfirmModal onCancel={() => setShowLogoutModal(false)} onConfirm={handleLogoutConfirm} /> : null}
      {showPointChargeModal ? <PointChargeModal onClose={() => setShowPointChargeModal(false)} onCharged={(result) => { setUserPoint(parsePoint(result?.currentPoint)); setShowPointChargeModal(false); setShowPointChargeSuccessModal(true); }} /> : null}
      {showPointChargeSuccessModal ? <PointChargeSuccessModal onClose={() => setShowPointChargeSuccessModal(false)} currentPoint={userPoint} /> : null}
    </div>
  );
};
