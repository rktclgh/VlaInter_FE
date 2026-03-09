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
import { logout } from "../../lib/authApi";
import { buildVisibleCategories, getCategoryDisplayName, sanitizeQuestionTag, searchCategoryByText } from "../../lib/categoryPresentation";
import { ratingToDifficulty } from "../../lib/difficultyRating";
import { consumePointChargeSuccessResult } from "../../lib/pointChargeFlow";
import { deleteSavedInterviewQuestion, getInterviewCategories, getSavedInterviewQuestions } from "../../lib/interviewApi";
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
  const [pageErrorMessage, setPageErrorMessage] = useState("");
  const [showAllCategories, setShowAllCategories] = useState(false);

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
  const categoryMap = useMemo(() => new Map(categories.map((item) => [item.categoryId, item])), [categories]);

  const visibleCategories = useMemo(() => {
    const keyword = categoryQuery.trim().toLowerCase();
    const matched = leafCategories.filter((category) => {
      if (jobFilter && String(category.parentId) !== jobFilter) return false;
      return searchCategoryByText(category, keyword);
    });
    return showAllCategories ? matched : matched.slice(0, 8);
  }, [leafCategories, categoryQuery, jobFilter, showAllCategories]);

  const enrichedItems = useMemo(() => items.map((item) => {
    const category = categoryMap.get(item.categoryId);
    const job = categoryMap.get(category?.parentId);
    return {
      ...item,
      categoryName: item.category || getCategoryDisplayName(category) || "미분류",
      jobName: getCategoryDisplayName(job) || "기타",
    };
  }), [items, categoryMap]);

  const filteredItems = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return enrichedItems.filter((item) => {
      if (jobFilter && String(categoryMap.get(item.categoryId)?.parentId || "") !== jobFilter) return false;
      if (selectedCategoryId && String(item.categoryId || "") !== selectedCategoryId) return false;
      if (selectedRating && item.difficulty !== ratingToDifficulty(selectedRating)) return false;
      if (dateFrom && normalizeDateInput(item.createdAt) < dateFrom) return false;
      if (dateTo && normalizeDateInput(item.createdAt) > dateTo) return false;
      if (!keyword) return true;
      return [item.questionText, item.categoryName, item.modelAnswer, item.canonicalAnswer, item.bestPractice, item.feedback, item.answerText, ...(item.tags || [])].filter(Boolean).join(" ").toLowerCase().includes(keyword);
    });
  }, [categoryMap, dateFrom, dateTo, enrichedItems, jobFilter, query, selectedCategoryId, selectedRating]);

  useEffect(() => {
    setPage(1);
  }, [query, jobFilter, categoryQuery, selectedCategoryId, selectedRating, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const pagedItems = filteredItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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

  const handleDelete = async (savedQuestionId) => {
    try {
      await deleteSavedInterviewQuestion(savedQuestionId);
      setItems((prev) => prev.filter((item) => item.savedQuestionId !== savedQuestionId));
    } catch (error) {
      setPageErrorMessage(error?.message || "저장된 질문 삭제에 실패했습니다.");
    }
  };

  return (
    <div className="min-h-screen bg-white pt-[54px]">
      <ContentTopNav point={formatPoint(userPoint)} onClickCharge={() => setShowPointChargeModal(true)} onOpenMenu={() => setIsMobileMenuOpen(true)} />
      <MobileSidebarDrawer open={isMobileMenuOpen} activeKey="saved_question" onClose={() => setIsMobileMenuOpen(false)} onNavigate={handleSidebarNavigate} userName={userName} profileImageUrl={profileImageUrl} fallbackProfileImageUrl={tempProfileImage} onLogout={() => { setIsMobileMenuOpen(false); setShowLogoutModal(true); }} />
      <div className="flex min-h-[calc(100vh-54px)]">
        <div className="hidden w-[272px] shrink-0 md:block"><Sidebar activeKey="saved_question" onNavigate={handleSidebarNavigate} userName={userName} profileImageUrl={profileImageUrl} fallbackProfileImageUrl={tempProfileImage} onLogout={() => setShowLogoutModal(true)} /></div>
        <main className="flex min-w-0 flex-1 flex-col px-4 pb-8 pt-6 sm:px-5 md:px-8 md:pt-10">
          <div className="mx-auto w-full max-w-[1280px]">
            <section className="rounded-[24px] border border-[#e4e7ee] bg-[linear-gradient(180deg,#ffffff_0%,#f7f9fc_100%)] p-6">
              <p className="text-[12px] font-semibold tracking-[0.08em] text-[#7a8190]">SAVED QUESTIONS</p>
              <h1 className="mt-2 text-[30px] font-semibold tracking-[-0.02em] text-[#161a22] sm:text-[40px]">질문 카드로 빠르게 다시 찾는다</h1>
              <p className="mt-3 text-[14px] leading-[1.7] text-[#5e6472]">직무, 카테고리, 난이도, 날짜 기준으로 추려서 필요한 질문만 바로 다시 본다.</p>
            </section>

            <section className="mt-5 rounded-[24px] border border-[#e4e7ee] bg-white p-5 sm:p-6">
              <div className="grid gap-3 xl:grid-cols-[1.2fr_180px_1fr_auto_auto]">
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="질문, 답변, 태그 검색" className="rounded-[14px] border border-[#dfe3eb] px-4 py-3 text-[13px] outline-none focus:border-[#8aa2e8]" />
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
                {visibleCategories.map((category) => <CategoryChip key={category.categoryId} label={category.displayName || getCategoryDisplayName(category)} active={selectedCategoryId === String(category.categoryId)} onClick={() => setSelectedCategoryId(String(category.categoryId))} />)}
                {leafCategories.filter((category) => !jobFilter || String(category.parentId) === jobFilter).length > 8 ? <CategoryChip label={showAllCategories ? "접기" : `+${leafCategories.filter((category) => !jobFilter || String(category.parentId) === jobFilter).length - 8}`} onClick={() => setShowAllCategories((prev) => !prev)} /> : null}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <DifficultyChip label="전체 난이도" active={!selectedRating} onClick={() => setSelectedRating("")} />
                {[1, 2, 3, 4, 5].map((rating) => <DifficultyChip key={rating} label={<StarIcons rating={rating} sizeClass="text-[11px]" />} active={Number(selectedRating) === rating} onClick={() => setSelectedRating(String(rating))} />)}
              </div>
            </section>

            <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {loading ? <p className="text-[13px] text-[#5e6472]">저장된 질문을 불러오는 중...</p> : null}
              {!loading && pagedItems.length === 0 ? <p className="text-[13px] text-[#5e6472]">조건에 맞는 저장 질문이 없습니다.</p> : null}
              {pagedItems.map((item) => (
                <article key={item.savedQuestionId} className="rounded-[22px] border border-[#e4e7ee] bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.04)] transition hover:border-[#cfd6e4] hover:shadow-[0_18px_36px_rgba(15,23,42,0.08)]">
                  <div className="flex items-start justify-between gap-3">
                    <button type="button" onClick={() => setSelectedQuestion(item)} className="min-w-0 flex-1 text-left">
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-[#eef2f8] px-3 py-1 text-[11px] text-[#556070]">{item.jobName}</span>
                        <span className="rounded-full bg-[#f4f6fb] px-3 py-1 text-[11px] text-[#556070]">{item.categoryName}</span>
                        {item.difficulty ? <DifficultyStars difficulty={item.difficulty} compact /> : null}
                      </div>
                      <p className="mt-4 line-clamp-5 whitespace-pre-wrap text-[17px] font-semibold leading-[1.7] text-[#171b24]">{item.questionText}</p>
                      {(item.tags || []).map(sanitizeQuestionTag).filter(Boolean).length > 0 ? <div className="mt-4 flex flex-wrap gap-2">{item.tags.map(sanitizeQuestionTag).filter(Boolean).slice(0, 4).map((tag) => <span key={`${item.savedQuestionId}-${tag}`} className="rounded-full bg-[#fff7ed] px-3 py-1 text-[11px] text-[#9a5b11]">#{tag}</span>)}</div> : null}
                      <div className="mt-4 text-[11px] text-[#6b7280]">저장일 {formatDate(item.createdAt)}</div>
                    </button>
                    <button type="button" onClick={() => handleDelete(item.savedQuestionId)} className="shrink-0 rounded-[12px] border border-[#d8dde7] px-3 py-2 text-[12px] text-[#4f5664]">삭제</button>
                  </div>
                </article>
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
      {showLogoutModal ? <LogoutConfirmModal onCancel={() => setShowLogoutModal(false)} onConfirm={handleLogoutConfirm} /> : null}
      {showPointChargeModal ? <PointChargeModal onClose={() => setShowPointChargeModal(false)} onCharged={(result) => { setUserPoint(parsePoint(result?.currentPoint)); setShowPointChargeModal(false); setShowPointChargeSuccessModal(true); }} /> : null}
      {showPointChargeSuccessModal ? <PointChargeSuccessModal onClose={() => setShowPointChargeSuccessModal(false)} /> : null}
    </div>
  );
};
