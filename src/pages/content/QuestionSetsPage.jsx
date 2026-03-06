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
import { createInterviewSet, getInterviewCategories, getInterviewSetQuestions, getInterviewSets } from "../../lib/interviewApi";
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

export const QuestionSetsPage = () => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("사용자");
  const [userPoint, setUserPoint] = useState(0);
  const [profileImageUrl, setProfileImageUrl] = useState(tempProfileImage);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showPointChargeModal, setShowPointChargeModal] = useState(false);
  const [showPointChargeSuccessModal, setShowPointChargeSuccessModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sets, setSets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedSetId, setSelectedSetId] = useState(null);
  const [selectedSetQuestions, setSelectedSetQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [query, setQuery] = useState("");
  const [questionQuery, setQuestionQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [page, setPage] = useState(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
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
        const [setList, categoryList] = await Promise.all([getInterviewSets(), getInterviewCategories()]);
        const normalizedSets = Array.isArray(setList) ? setList : [];
        setSets(normalizedSets);
        setCategories(Array.isArray(categoryList) ? categoryList.filter((item) => item?.isLeaf) : []);
        if (normalizedSets[0]?.setId) {
          setSelectedSetId(normalizedSets[0].setId);
        }
      } catch (error) {
        setPageErrorMessage(error?.message || "질문 세트를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [navigate]);

  useEffect(() => {
    const loadQuestions = async () => {
      if (!selectedSetId) {
        setSelectedSetQuestions([]);
        return;
      }
      setLoadingQuestions(true);
      try {
        const payload = await getInterviewSetQuestions(selectedSetId);
        setSelectedSetQuestions(Array.isArray(payload) ? payload : []);
      } catch (error) {
        setPageErrorMessage(error?.message || "질문 세트 상세를 불러오지 못했습니다.");
      } finally {
        setLoadingQuestions(false);
      }
    };

    void loadQuestions();
  }, [selectedSetId]);

  const filteredSets = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return sets;
    return sets.filter((item) => [item.title, item.description, item.ownerType, item.visibility].filter(Boolean).join(" ").toLowerCase().includes(keyword));
  }, [sets, query]);

  useEffect(() => {
    setPage(1);
  }, [query]);

  const pagedSets = filteredSets.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(filteredSets.length / PAGE_SIZE));

  const filteredQuestions = useMemo(() => {
    const keyword = questionQuery.trim().toLowerCase();
    return selectedSetQuestions.filter((item) => {
      if (selectedCategoryId && String(item.categoryId || "") !== selectedCategoryId) return false;
      if (!keyword) return true;
      return [item.questionText, item.canonicalAnswer, item.categoryName, ...(item.tags || [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });
  }, [selectedSetQuestions, selectedCategoryId, questionQuery]);

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

  const handleCreateSet = async () => {
    if (!title.trim()) {
      setPageErrorMessage("질문 세트 제목을 입력해 주세요.");
      return;
    }

    try {
      const created = await createInterviewSet({
        title: title.trim(),
        description: description.trim() || null,
        visibility: "PRIVATE",
      });
      setSets((prev) => [created, ...prev]);
      setSelectedSetId(created.setId);
      setTitle("");
      setDescription("");
    } catch (error) {
      setPageErrorMessage(error?.message || "질문 세트 생성에 실패했습니다.");
    }
  };

  return (
    <div className="min-h-screen bg-white pt-[54px]">
      <ContentTopNav point={formatPoint(userPoint)} onClickCharge={() => setShowPointChargeModal(true)} onOpenMenu={() => setIsMobileMenuOpen(true)} />

      <MobileSidebarDrawer
        open={isMobileMenuOpen}
        activeKey="question_set"
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
            activeKey="question_set"
            onNavigate={handleSidebarNavigate}
            userName={userName}
            profileImageUrl={profileImageUrl}
            fallbackProfileImageUrl={tempProfileImage}
            onLogout={() => setShowLogoutModal(true)}
          />
        </div>

        <main className="flex min-w-0 flex-1 flex-col px-4 pb-8 pt-6 sm:px-5 md:px-8 md:pt-10">
          <div className="mx-auto w-full max-w-[1100px]">
            <section className="rounded-[24px] border border-[#e4e7ee] bg-[linear-gradient(180deg,#ffffff_0%,#f7f9fc_100%)] p-6">
              <p className="text-[12px] font-semibold tracking-[0.08em] text-[#7a8190]">QUESTION SETS</p>
              <h1 className="mt-2 text-[30px] font-semibold tracking-[-0.02em] text-[#161a22] sm:text-[40px]">내 질문 세트를 만든다</h1>
              <p className="mt-3 text-[14px] leading-[1.7] text-[#5e6472]">
                직접 만든 질문 자산과 공용 세트를 함께 보고, 세트별 질문을 카드형으로 관리할 수 있다.
              </p>
            </section>

            <section className="mt-5 rounded-[24px] border border-[#e4e7ee] bg-white p-5 sm:p-6">
              <div className="grid gap-3 md:grid-cols-[1.1fr_1.4fr_auto]">
                <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="새 질문 세트 제목" className="rounded-[14px] border border-[#dfe3eb] px-4 py-3 text-[13px] outline-none focus:border-[#8aa2e8]" />
                <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="세트 설명" className="rounded-[14px] border border-[#dfe3eb] px-4 py-3 text-[13px] outline-none focus:border-[#8aa2e8]" />
                <button type="button" onClick={handleCreateSet} className="rounded-[14px] bg-[#171b24] px-4 py-3 text-[13px] font-semibold text-white">
                  세트 생성
                </button>
              </div>
            </section>

            <div className="mt-5 grid gap-5 xl:grid-cols-[0.95fr_1.25fr]">
              <section className="rounded-[24px] border border-[#e4e7ee] bg-white p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-[20px] font-semibold text-[#171b24]">세트 목록</h2>
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="세트 검색" className="w-[180px] rounded-[12px] border border-[#dfe3eb] px-3 py-2 text-[12px] outline-none focus:border-[#8aa2e8]" />
                </div>

                <div className="mt-4 grid gap-3">
                  {loading ? <p className="text-[13px] text-[#5e6472]">질문 세트를 불러오는 중...</p> : null}
                  {!loading && pagedSets.length === 0 ? <p className="text-[13px] text-[#5e6472]">표시할 질문 세트가 없습니다.</p> : null}
                  {pagedSets.map((item) => (
                    <button
                      type="button"
                      key={item.setId}
                      onClick={() => setSelectedSetId(item.setId)}
                      className={`rounded-[18px] border px-4 py-4 text-left transition ${
                        selectedSetId === item.setId ? "border-[#8aa2e8] bg-[#f5f8ff]" : "border-[#e4e7ee] bg-[#fbfcfe]"
                      }`}
                    >
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-white px-3 py-1 text-[11px] text-[#556070]">{item.ownerType}</span>
                        <span className="rounded-full bg-white px-3 py-1 text-[11px] text-[#556070]">{item.visibility}</span>
                        <span className="rounded-full bg-white px-3 py-1 text-[11px] text-[#556070]">{item.embeddingStatus}</span>
                      </div>
                      <h3 className="mt-3 text-[16px] font-semibold text-[#171b24]">{item.title}</h3>
                      <p className="mt-2 text-[12px] leading-[1.6] text-[#5e6472]">{item.description || "설명 없음"}</p>
                      <div className="mt-3 flex items-center justify-between text-[11px] text-[#6b7280]">
                        <span>문항 {item.questionCount}개</span>
                        <span>{formatDate(item.createdAt)}</span>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-center gap-2">
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
              </section>

              <section className="rounded-[24px] border border-[#e4e7ee] bg-white p-5 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-[20px] font-semibold text-[#171b24]">세트 질문</h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input value={questionQuery} onChange={(event) => setQuestionQuery(event.target.value)} placeholder="질문 검색" className="rounded-[12px] border border-[#dfe3eb] px-3 py-2 text-[12px] outline-none focus:border-[#8aa2e8]" />
                    <select value={selectedCategoryId} onChange={(event) => setSelectedCategoryId(event.target.value)} className="rounded-[12px] border border-[#dfe3eb] px-3 py-2 text-[12px] outline-none focus:border-[#8aa2e8]">
                      <option value="">전체 카테고리</option>
                      {categories.map((category) => (
                        <option key={category.categoryId} value={String(category.categoryId)}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-4 grid gap-3">
                  {loadingQuestions ? <p className="text-[13px] text-[#5e6472]">질문 목록을 불러오는 중...</p> : null}
                  {!loadingQuestions && filteredQuestions.length === 0 ? <p className="text-[13px] text-[#5e6472]">표시할 질문이 없습니다.</p> : null}
                  {filteredQuestions.slice(0, PAGE_SIZE).map((item) => (
                    <article key={item.questionId} className="rounded-[18px] border border-[#e4e7ee] bg-[#fbfcfe] p-4">
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-white px-3 py-1 text-[11px] text-[#556070]">{item.categoryName}</span>
                        <span className="rounded-full bg-white px-3 py-1 text-[11px] text-[#556070]">{item.difficulty}</span>
                        <span className="rounded-full bg-white px-3 py-1 text-[11px] text-[#556070]">{item.sourceTag}</span>
                      </div>
                      <h3 className="mt-3 whitespace-pre-wrap text-[15px] font-semibold leading-[1.7] text-[#171b24]">{item.questionText}</h3>
                      {item.canonicalAnswer ? <p className="mt-3 whitespace-pre-wrap text-[13px] leading-[1.7] text-[#5e6472]">{item.canonicalAnswer}</p> : null}
                      {(item.tags || []).length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {item.tags.map((tag) => (
                            <span key={`${item.questionId}-${tag}`} className="rounded-full bg-white px-3 py-1 text-[11px] text-[#6b7280]">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              </section>
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
