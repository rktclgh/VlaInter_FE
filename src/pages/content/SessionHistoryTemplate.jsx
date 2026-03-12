import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ContentTopNav } from "../../components/ContentTopNav";
import { DifficultyStars, StarIcons } from "../../components/DifficultyStars";
import { MobileSidebarDrawer } from "../../components/MobileSidebarDrawer";
import { OcrInfoBadge } from "../../components/OcrInfoBadge";
import { PointChargeModal } from "../../components/PointChargeModal";
import { PointChargeSuccessModal } from "../../components/PointChargeSuccessModal";
import { Sidebar } from "../../components/Sidebar";
import tempProfileImage from "../../assets/icon/temp.png";
import { isAuthenticationError } from "../../lib/apiClient";
import { logout } from "../../lib/authApi";
import { bookmarkInterviewTurn, getInterviewSessionHistory, getInterviewSessionResults } from "../../lib/interviewApi";
import { getQuestionCategoryDisplayName } from "../../lib/categoryPresentation";
import { consumePointChargeSuccessResult } from "../../lib/pointChargeFlow";
import { isAlreadySavedQuestionError } from "../../lib/savedQuestionUtils";
import { getMyProfile, getMyProfileImageUrl } from "../../lib/userApi";

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
const formatDateTime = (raw) => {
  if (!raw) return "-";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
};
const scoreToStars = (score) => {
  const numeric = Number(score);
  if (!Number.isFinite(numeric) || numeric <= 0) return 1;
  return Math.max(1, Math.min(5, Math.round(numeric / 20)));
};

const LogoutConfirmModal = ({ onCancel, onConfirm }) => {
  const dialogRef = useRef(null);
  const cancelButtonRef = useRef(null);

  useEffect(() => {
    const previousFocusedElement = document.activeElement;
    cancelButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel?.();
        return;
      }
      if (event.key !== "Tab") return;

      const dialogElement = dialogRef.current;
      if (!dialogElement) return;
      const focusableElements = dialogElement.querySelectorAll(
        'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
      );
      if (!focusableElements.length) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
        return;
      }
      if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (previousFocusedElement && typeof previousFocusedElement.focus === "function") {
        previousFocusedElement.focus();
      }
    };
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/35 px-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-history-logout-title"
        tabIndex={-1}
        className="w-full max-w-[420px] rounded-[16px] border border-[#d9d9d9] bg-white p-5"
      >
        <p id="session-history-logout-title" className="text-[15px] font-medium text-[#252525]">
          정말 로그아웃 하시겠습니까?<br />현재 페이지의 진행 중 작업은 유지되지 않습니다.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button ref={cancelButtonRef} type="button" onClick={onCancel} className="rounded-[10px] border border-[#d6d6d6] px-3 py-1.5 text-[12px] text-[#666]">취소</button>
          <button type="button" onClick={onConfirm} className="rounded-[10px] border border-[#1f1f1f] bg-[#1f1f1f] px-3 py-1.5 text-[12px] text-white">로그아웃</button>
        </div>
      </div>
    </div>
  );
};

const InlineSpinner = ({ label }) => (
  <div className="inline-flex items-center gap-2 text-[12px] text-[#5e6472]">
    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#cbd5e1] border-t-[#171b24]" />
    <span>{label}</span>
  </div>
);

const ResultCard = ({ turn, onBookmark, bookmarking }) => {
  const stars = scoreToStars(turn?.evaluation?.score);
  const bookmarked = Boolean(turn?.bookmarked);
  const bookmarkDisabled = bookmarked || bookmarking || !turn?.turnId;
  const bookmarkLabel = bookmarking ? "저장 중..." : (bookmarked ? "저장됨" : "저장하기");
  return (
    <article className="rounded-[22px] border border-[#e4e7ee] bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-[#eef2f8] px-3 py-1 text-[11px] text-[#556070]">질문 {turn.turnNo}</span>
        {turn.category ? <span className="rounded-full bg-[#f7f8fb] px-3 py-1 text-[11px] text-[#556070]">{getQuestionCategoryDisplayName(turn.category)}</span> : null}
        {turn.sourceTag === "USER" ? <span className="rounded-full bg-[#e8f7ef] px-3 py-1 text-[11px] text-[#18784a]">사용자 생성</span> : null}
        {turn.difficulty ? <DifficultyStars difficulty={turn.difficulty} compact /> : null}
        </div>
        <button
          type="button"
          onClick={() => onBookmark?.(turn.turnId)}
          disabled={bookmarkDisabled}
          className={`rounded-[10px] border px-3 py-1.5 text-[12px] font-semibold transition ${
            bookmarkDisabled ? "cursor-not-allowed border-[#d8dce5] bg-[#f4f6fa] text-[#9aa3b2]" : "border-[#171b24] bg-[#171b24] text-white hover:opacity-90"
          }`}
        >
          {bookmarkLabel}
        </button>
      </div>
      <p className="mt-4 text-[16px] font-semibold leading-[1.7] text-[#1d2430]">{turn.questionText}</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-[16px] bg-[#f7f9fc] p-4">
          <p className="text-[11px] font-semibold text-[#7a8190]">내 답변</p>
          <p className="mt-2 whitespace-pre-wrap text-[13px] leading-[1.7] text-[#2d3645]">{turn.answerText || "답변 정보가 없습니다."}</p>
        </div>
        <div className="rounded-[16px] bg-[#f7f9fc] p-4">
          <p className="text-[11px] font-semibold text-[#7a8190]">평가</p>
          {turn.evaluation ? (
            <>
              <div className="mt-2 flex items-center gap-2">
                <StarIcons rating={stars} sizeClass="text-[15px]" />
                <span className="text-[12px] font-semibold text-[#99631e]">{stars} / 5</span>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-[13px] leading-[1.7] text-[#2d3645]">{turn.evaluation.feedback || "-"}</p>
              {turn.evaluation.bestPractice?.trim() ? (
                <div className="mt-3 rounded-[12px] border border-[#eceff4] bg-white p-3">
                  <p className="text-[11px] font-semibold text-[#7a8190]">보완 포인트</p>
                  <p className="mt-2 whitespace-pre-wrap text-[13px] leading-[1.7] text-[#2d3645]">{turn.evaluation.bestPractice}</p>
                </div>
              ) : null}
              <div className="mt-3 rounded-[12px] border border-[#eceff4] bg-white p-3">
                <p className="text-[11px] font-semibold text-[#7a8190]">모범답안</p>
                <p className="mt-2 whitespace-pre-wrap text-[13px] leading-[1.7] text-[#2d3645]">{turn.evaluation.modelAnswer || "-"}</p>
              </div>
            </>
          ) : <p className="mt-2 text-[13px] text-[#6b7280]">아직 평가 정보가 없습니다.</p>}
        </div>
      </div>
    </article>
  );
};

export const SessionHistoryTemplate = ({ title, description, apiBasePath, activeKey, emptyMessage }) => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("사용자");
  const [userPoint, setUserPoint] = useState(0);
  const [profileImageUrl, setProfileImageUrl] = useState(tempProfileImage);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showPointChargeModal, setShowPointChargeModal] = useState(false);
  const [showPointChargeSuccessModal, setShowPointChargeSuccessModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingResult, setLoadingResult] = useState(false);
  const [pageErrorMessage, setPageErrorMessage] = useState("");
  const [items, setItems] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [selectedResults, setSelectedResults] = useState(null);
  const [bookmarkingTurnIds, setBookmarkingTurnIds] = useState([]);
  const bookmarkingTurnIdsRef = useRef([]);
  const resultRequestTokenRef = useRef(0);

  useEffect(() => {
    const charged = consumePointChargeSuccessResult();
    if (!charged) return;
    setUserPoint(parsePoint(charged?.currentPoint));
    setShowPointChargeSuccessModal(true);
  }, []);

  const loadPage = useCallback(async () => {
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
      const history = await getInterviewSessionHistory(apiBasePath);
      const normalized = Array.isArray(history) ? history : [];
      setItems(normalized);
      if (normalized[0]?.sessionId) {
        setSelectedSessionId(normalized[0].sessionId);
      }
    } catch (error) {
      setPageErrorMessage(error?.message || "이력 목록을 불러오지 못했습니다.");
    } finally {
      setLoadingList(false);
    }
  }, [apiBasePath, navigate]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  useEffect(() => {
    setSelectedResults(null);
    bookmarkingTurnIdsRef.current = [];
    setBookmarkingTurnIds([]);
    if (!selectedSessionId) {
      setLoadingResult(false);
      return;
    }

    let active = true;
    const requestToken = resultRequestTokenRef.current + 1;
    resultRequestTokenRef.current = requestToken;

    const loadResults = async () => {
      setLoadingResult(true);
      setPageErrorMessage("");
      try {
        const result = await getInterviewSessionResults(apiBasePath, selectedSessionId);
        if (!active || resultRequestTokenRef.current !== requestToken) return;
        setSelectedResults(result);
      } catch (error) {
        if (!active || resultRequestTokenRef.current !== requestToken) return;
        setPageErrorMessage(error?.message || "상세 결과를 불러오지 못했습니다.");
      } finally {
        if (active && resultRequestTokenRef.current === requestToken) {
          setLoadingResult(false);
        }
      }
    };
    void loadResults();
    return () => {
      active = false;
    };
  }, [apiBasePath, selectedSessionId]);

  const selectedSummary = useMemo(() => items.find((item) => item.sessionId === selectedSessionId) || null, [items, selectedSessionId]);

  const handleBookmarkTurn = useCallback(async (turnId) => {
    if (!turnId) return;
    if (bookmarkingTurnIdsRef.current.includes(turnId)) return;
    const target = selectedResults?.turns?.find((item) => item.turnId === turnId);
    if (target?.bookmarked) return;

    const nextBookmarkingTurnIds = [...bookmarkingTurnIdsRef.current, turnId];
    bookmarkingTurnIdsRef.current = nextBookmarkingTurnIds;
    setBookmarkingTurnIds(nextBookmarkingTurnIds);

    setPageErrorMessage("");
    try {
      await bookmarkInterviewTurn(apiBasePath, turnId);
      setSelectedResults((prev) =>
        prev
          ? {
              ...prev,
              turns: prev.turns.map((item) => (item.turnId === turnId ? { ...item, bookmarked: true } : item)),
            }
          : prev
      );
    } catch (error) {
      if (isAlreadySavedQuestionError(error)) {
        setSelectedResults((prev) =>
          prev
            ? {
                ...prev,
                turns: prev.turns.map((item) => (item.turnId === turnId ? { ...item, bookmarked: true } : item)),
              }
            : prev
        );
        return;
      }
      setPageErrorMessage(error?.message || "질문 저장에 실패했습니다.");
    } finally {
      setBookmarkingTurnIds((prev) => {
        const next = prev.filter((id) => id !== turnId);
        bookmarkingTurnIdsRef.current = next;
        return next;
      });
    }
  }, [apiBasePath, selectedResults]);

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

  return (
    <div className="min-h-screen overflow-x-hidden bg-white pt-[54px]">
      <ContentTopNav point={formatPoint(userPoint)} onClickCharge={() => setShowPointChargeModal(true)} onOpenMenu={() => setIsMobileMenuOpen(true)} />

      <MobileSidebarDrawer
        open={isMobileMenuOpen}
        activeKey={activeKey}
        onClose={() => setIsMobileMenuOpen(false)}
        onNavigate={handleSidebarNavigate}
        userName={userName}
        profileImageUrl={profileImageUrl}
        onLogout={() => {
          setIsMobileMenuOpen(false);
          setShowLogoutModal(true);
        }}
      />

      <div className="flex min-h-[calc(100vh-54px)]">
        <div className="hidden w-[272px] shrink-0 md:block">
          <Sidebar activeKey={activeKey} onNavigate={handleSidebarNavigate} userName={userName} profileImageUrl={profileImageUrl} onLogout={() => setShowLogoutModal(true)} />
        </div>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-4 pb-6 pt-6 sm:px-5 md:px-8 md:pt-10">
            <div className="mx-auto w-full max-w-[1180px] space-y-5">
              <section className="rounded-[24px] border border-[#e4e7ee] bg-[linear-gradient(180deg,#ffffff_0%,#f7f9fc_100%)] p-5 sm:p-6">
                <p className="text-[12px] font-semibold tracking-[0.08em] text-[#7a8190]">HISTORY</p>
                <h1 className="mt-2 text-[30px] font-semibold tracking-[-0.02em] text-[#161a22] sm:text-[42px]">{title}</h1>
                <p className="mt-3 max-w-[740px] text-[14px] leading-[1.7] text-[#5e6472] sm:text-[15px]">{description}</p>
              </section>

              {pageErrorMessage ? <p className="text-[12px] text-[#dc4b4b]">{pageErrorMessage}</p> : null}

              <section className="rounded-[24px] border border-[#e4e7ee] bg-white p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[12px] font-semibold tracking-[0.08em] text-[#7a8190]">SESSION LIST</p>
                    <p className="mt-1 text-[13px] text-[#5e6472]">카드를 클릭하시면 질문-답변-평가 세트를 아래에서 바로 확인하실 수 있습니다.</p>
                  </div>
                  {loadingList ? <InlineSpinner label="이력 불러오는 중..." /> : null}
                </div>

                {!loadingList && !items.length ? (
                  <div className="mt-5 rounded-[18px] border border-dashed border-[#d7dce5] bg-[#fafbfd] px-5 py-10 text-center text-[13px] text-[#6b7280]">{emptyMessage}</div>
                ) : (
                  <div className="mt-5 grid gap-4 xl:grid-cols-3">
                    {items.map((item) => {
                      const active = item.sessionId === selectedSessionId;
                      return (
                        <button
                          key={item.sessionId}
                          type="button"
                          onClick={() => setSelectedSessionId(item.sessionId)}
                          className={`rounded-[22px] border p-5 text-left shadow-[0_12px_28px_rgba(15,23,42,0.04)] transition ${active ? "border-[#171b24] bg-[#171b24] text-white" : "border-[#e4e7ee] bg-white text-[#1d2430]"}`}
                        >
                          <div className="flex flex-wrap gap-2">
                            {item.jobName ? <span className={`rounded-full px-3 py-1 text-[11px] ${active ? "bg-white/12 text-white" : "bg-[#eef2f8] text-[#556070]"}`}>{item.jobName}</span> : null}
                            {item.categoryName ? <span className={`rounded-full px-3 py-1 text-[11px] ${active ? "bg-white/12 text-white" : "bg-[#f7f8fb] text-[#556070]"}`}>{item.categoryName}</span> : null}
                            {item.difficultyRating ? <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] ${active ? "bg-white/12 text-white" : "bg-[#fff8e8] text-[#8a5a00]"}`}><StarIcons rating={item.difficultyRating} sizeClass="text-[11px]" /></span> : null}
                          </div>
                          <p className="mt-4 text-[14px] font-semibold">문항 {item.questionCount}개</p>
                          <p className={`mt-1 text-[12px] ${active ? "text-white/70" : "text-[#6b7280]"}`}>시작 {formatDateTime(item.startedAt)}</p>
                          <p className={`mt-1 text-[12px] ${active ? "text-white/70" : "text-[#6b7280]"}`}>종료 {formatDateTime(item.finishedAt)}</p>
                          {item.selectedDocuments?.length ? (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {item.selectedDocuments.map((document) => (
                                <span key={`${item.sessionId}-${document.fileType}-${document.fileId || document.label}`} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] ${active ? "bg-white/12 text-white" : "bg-[#f7f8fb] text-[#556070]"}`}>
                                  <span>{document.label}</span>
                                  {document.ocrUsed ? <OcrInfoBadge compact /> : null}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>

              {selectedSummary ? (
                <section className="rounded-[24px] border border-[#e4e7ee] bg-white p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[12px] font-semibold tracking-[0.08em] text-[#7a8190]">SESSION DETAIL</p>
                      <h2 className="mt-2 text-[24px] font-semibold text-[#171b24]">선택한 면접 결과</h2>
                    </div>
                    {loadingResult ? <InlineSpinner label="결과 불러오는 중..." /> : null}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedSummary.jobName ? <span className="rounded-full bg-[#eef2f8] px-3 py-1 text-[11px] text-[#556070]">{selectedSummary.jobName}</span> : null}
                    {selectedSummary.categoryName ? <span className="rounded-full bg-[#f7f8fb] px-3 py-1 text-[11px] text-[#556070]">{selectedSummary.categoryName}</span> : null}
                    {selectedSummary.difficulty ? <DifficultyStars difficulty={selectedSummary.difficulty} compact showLabel /> : null}
                    <span className="rounded-full bg-[#f7f8fb] px-3 py-1 text-[11px] text-[#556070]">문항 {selectedSummary.questionCount}개</span>
                  </div>
                  {selectedSummary.selectedDocuments?.length ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {selectedSummary.selectedDocuments.map((document) => (
                        <span key={`${selectedSummary.sessionId}-detail-${document.fileType}-${document.fileId || document.label}`} className="inline-flex items-center gap-1.5 rounded-full bg-[#f7f8fb] px-3 py-1 text-[11px] text-[#556070]">
                          <span>{document.label}</span>
                          {document.ocrUsed ? <OcrInfoBadge compact /> : null}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    {(selectedResults?.turns || []).map((turn) => (
                      <ResultCard
                        key={turn.turnId}
                        turn={turn}
                        onBookmark={handleBookmarkTurn}
                        bookmarking={bookmarkingTurnIds.includes(turn.turnId)}
                      />
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
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
