import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ContentTopNav } from "../../components/ContentTopNav";
import { MobileSidebarDrawer } from "../../components/MobileSidebarDrawer";
import { Sidebar } from "../../components/Sidebar";
import { PointChargeModal } from "../../components/PointChargeModal";
import { PointChargeSuccessModal } from "../../components/PointChargeSuccessModal";
import tempProfileImage from "../../assets/icon/temp.png";
import { logout } from "../../lib/authApi";
import { consumePointChargeSuccessResult } from "../../lib/pointChargeFlow";
import { getInterviewCategories, deleteSavedInterviewQuestion, getSavedInterviewQuestions } from "../../lib/interviewApi";
import { getMyProfile, getMyProfileImageUrl } from "../../lib/userApi";

const PAGE_SIZE = 5;

const formatPoint = (value) => {
  const safeNumber = Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
  return `${new Intl.NumberFormat("ko-KR").format(safeNumber)}P`;
};

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

const formatDate = (value) => {
  const date = new Date(value || "");
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

const normalizeDateInput = (value) => {
  const date = new Date(value || "");
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const LogoutConfirmModal = ({ onCancel, onConfirm }) => (
  <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/35 px-4">
    <div className="w-full max-w-[420px] rounded-[16px] border border-[#d9d9d9] bg-white p-5">
      <p className="text-[15px] font-medium text-[#252525]">
        정말 로그아웃 하시겠습니까?
        <br />
        저장되지 않은 작업은 유지되지 않습니다.
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-[10px] border border-[#d6d6d6] px-3 py-1.5 text-[12px] text-[#666]">
          취소
        </button>
        <button type="button" onClick={onConfirm} className="rounded-[10px] border border-[#1f1f1f] bg-[#1f1f1f] px-3 py-1.5 text-[12px] text-white">
          로그아웃
        </button>
      </div>
    </div>
  </div>
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
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageErrorMessage, setPageErrorMessage] = useState("");

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
        setCategories(Array.isArray(categoryList) ? categoryList.filter((item) => item?.isLeaf) : []);
      } catch (error) {
        setPageErrorMessage(error?.message || "저장된 질문을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [navigate]);

  const filteredItems = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return items.filter((item) => {
      if (selectedCategoryId && String(item.categoryId || "") !== selectedCategoryId) return false;
      if (dateFrom && normalizeDateInput(item.createdAt) < dateFrom) return false;
      if (dateTo && normalizeDateInput(item.createdAt) > dateTo) return false;
      if (!keyword) return true;
      return [item.questionText, item.category, item.difficulty, ...(item.tags || [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });
  }, [items, selectedCategoryId, dateFrom, dateTo, query]);

  useEffect(() => {
    setPage(1);
  }, [query, selectedCategoryId, dateFrom, dateTo]);

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

      <MobileSidebarDrawer
        open={isMobileMenuOpen}
        activeKey="saved_question"
        onClose={() => setIsMobileMenuOpen(false)}
        onNavigate={handleSidebarNavigate}
        userName={userName}
        profileImageUrl={profileImageUrl}
        fallbackProfileImageUrl={tempProfileImage}
        onLogout={() => {
          setIsMobileMenuOpen(false);
          setShowLogoutModal(true);
        }}
      />

      <div className="flex min-h-[calc(100vh-54px)]">
        <div className="hidden w-[272px] shrink-0 md:block">
          <Sidebar
            activeKey="saved_question"
            onNavigate={handleSidebarNavigate}
            userName={userName}
            profileImageUrl={profileImageUrl}
            fallbackProfileImageUrl={tempProfileImage}
            onLogout={() => setShowLogoutModal(true)}
          />
        </div>

        <main className="flex min-w-0 flex-1 flex-col px-4 pb-8 pt-6 sm:px-5 md:px-8 md:pt-10">
          <div className="mx-auto w-full max-w-[1040px]">
            <section className="rounded-[24px] border border-[#e4e7ee] bg-[linear-gradient(180deg,#ffffff_0%,#f7f9fc_100%)] p-6">
              <p className="text-[12px] font-semibold tracking-[0.08em] text-[#7a8190]">SAVED QUESTIONS</p>
              <h1 className="mt-2 text-[30px] font-semibold tracking-[-0.02em] text-[#161a22] sm:text-[40px]">저장한 질문을 카드로 관리한다</h1>
              <p className="mt-3 text-[14px] leading-[1.7] text-[#5e6472]">
                카테고리, 검색어, 날짜 범위로 빠르게 추려보고 필요한 질문만 다시 연습 흐름으로 가져갈 수 있다.
              </p>
            </section>

            <section className="mt-5 rounded-[24px] border border-[#e4e7ee] bg-white p-5 sm:p-6">
              <div className="grid gap-3 md:grid-cols-4">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="질문, 카테고리, 태그 검색"
                  className="rounded-[14px] border border-[#dfe3eb] px-4 py-3 text-[13px] outline-none focus:border-[#8aa2e8]"
                />
                <select
                  value={selectedCategoryId}
                  onChange={(event) => setSelectedCategoryId(event.target.value)}
                  className="rounded-[14px] border border-[#dfe3eb] px-4 py-3 text-[13px] outline-none focus:border-[#8aa2e8]"
                >
                  <option value="">전체 카테고리</option>
                  {categories.map((category) => (
                    <option key={category.categoryId} value={String(category.categoryId)}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="rounded-[14px] border border-[#dfe3eb] px-4 py-3 text-[13px] outline-none focus:border-[#8aa2e8]" />
                <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="rounded-[14px] border border-[#dfe3eb] px-4 py-3 text-[13px] outline-none focus:border-[#8aa2e8]" />
              </div>
            </section>

            <section className="mt-5 grid gap-4">
              {loading ? <p className="text-[13px] text-[#5e6472]">저장된 질문을 불러오는 중...</p> : null}
              {!loading && pagedItems.length === 0 ? (
                <div className="rounded-[20px] border border-dashed border-[#d7dbe4] bg-[#fafbfd] px-6 py-10 text-center text-[13px] text-[#6b7280]">
                  조건에 맞는 저장 질문이 없습니다.
                </div>
              ) : null}
              {pagedItems.map((item) => (
                <article key={item.savedQuestionId} className="rounded-[22px] border border-[#e4e7ee] bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.04)]">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        {item.category ? <span className="rounded-full bg-[#f4f6fb] px-3 py-1 text-[11px] text-[#556070]">{item.category}</span> : null}
                        {item.difficulty ? <span className="rounded-full bg-[#fff5ea] px-3 py-1 text-[11px] text-[#9d6320]">{item.difficulty}</span> : null}
                        {item.sourceTag ? <span className="rounded-full bg-[#eef7ff] px-3 py-1 text-[11px] text-[#2b6cb0]">{item.sourceTag}</span> : null}
                      </div>
                      <h2 className="mt-3 whitespace-pre-wrap text-[17px] font-semibold leading-[1.7] text-[#171b24]">{item.questionText}</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.savedQuestionId)}
                      className="rounded-[12px] border border-[#d8dde7] px-3 py-2 text-[12px] text-[#4f5664]"
                    >
                      삭제
                    </button>
                  </div>
                  {(item.tags || []).length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {item.tags.map((tag) => (
                        <span key={`${item.savedQuestionId}-${tag}`} className="rounded-full bg-[#f7f8fb] px-3 py-1 text-[11px] text-[#6b7280]">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[12px] text-[#6b7280]">
                    <span>저장일 {formatDate(item.createdAt)}</span>
                    {item.note ? <span className="max-w-[520px] truncate">메모: {item.note}</span> : null}
                  </div>
                </article>
              ))}
            </section>

            <div className="mt-5 flex items-center justify-center gap-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))} className="rounded-[12px] border border-[#d8dde7] px-3 py-2 text-[12px] text-[#4f5664] disabled:opacity-50">
                이전
              </button>
              <span className="text-[12px] text-[#5e6472]">
                {page} / {totalPages}
              </span>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} className="rounded-[12px] border border-[#d8dde7] px-3 py-2 text-[12px] text-[#4f5664] disabled:opacity-50">
                다음
              </button>
            </div>

            {pageErrorMessage ? <p className="mt-4 text-[12px] text-[#dc4b4b]">{pageErrorMessage}</p> : null}
          </div>
        </main>
      </div>

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
    </div>
  );
};
