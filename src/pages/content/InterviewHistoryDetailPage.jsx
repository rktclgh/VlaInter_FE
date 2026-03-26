import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { StarIcons } from "../../components/DifficultyStars";
import { bookmarkInterviewTurn, getInterviewSessionResults, getMockInterviewHistorySummary } from "../../lib/interviewApi";
import { getQuestionCategoryDisplayName } from "../../lib/categoryPresentation";
import { isAlreadySavedQuestionError } from "../../lib/savedQuestionUtils";
import {
  HistoryChip,
  HistoryShell,
  InlineSpinner,
} from "./MockInterviewHistoryScaffold";
import { formatDateTime, formatHistoryTitle, scoreToStars } from "./mockInterviewHistoryUtils";

const SUMMARY_PILL_LIMIT = 6;

const buildSummaryPills = (summary) => {
  if (!summary) return [];
  const baseItems = [];
  if (summary.categoryName) baseItems.push(summary.categoryName);
  if (summary.jobName) baseItems.push(summary.jobName);
  (summary.selectedDocuments || []).forEach((document) => {
    if (document?.label) baseItems.push(document.label);
  });
  return baseItems.slice(0, SUMMARY_PILL_LIMIT);
};

const buildTurnTags = (turn) => {
  const normalizedTags = (turn?.tags || [])
    .map((tag) => String(tag || "").trim())
    .filter(Boolean);
  if (normalizedTags.length) return normalizedTags.slice(0, 4);

  const fallback = [];
  if (turn?.category) fallback.push(getQuestionCategoryDisplayName(turn.category));
  if (turn?.difficulty) fallback.push(turn.difficulty);
  return fallback.slice(0, 4);
};

const QuestionReviewBlock = ({ turn, bookmarking, onBookmark }) => {
  const stars = scoreToStars(turn?.evaluation?.score);
  const bookmarkDisabled = bookmarking || turn?.bookmarked || !turn?.turnId;
  const bookmarkLabel = bookmarking ? "저장 중" : turn?.bookmarked ? "저장됨" : "저장하기";
  const tags = buildTurnTags(turn);

  return (
    <article className="history-fade-up rounded-[22px] border border-[#e9e9e9] bg-white p-4 shadow-[0_18px_44px_rgba(15,23,42,0.04)] sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <HistoryChip key={`${turn.turnId}-${tag}`} muted>
              {tag}
            </HistoryChip>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onBookmark?.(turn.turnId)}
          disabled={bookmarkDisabled}
          className={`rounded-full border px-3 py-1.5 text-[11px] transition ${
            bookmarkDisabled
              ? "cursor-not-allowed border-[#e6e6e6] bg-[#f3f3f3] text-[#b1b1b1]"
              : "border-[#d9c8ff] bg-white text-[#6e3ed8] hover:bg-[#fbf7ff]"
          }`}
        >
          {bookmarkLabel}
        </button>
      </div>

      <h2 className="mt-4 text-[18px] font-semibold leading-[1.6] tracking-[-0.02em] text-[#1b1b1b]">
        {turn.turnNo}. {turn.questionText}
      </h2>

      <div className="mt-4 rounded-[14px] border border-[#efefef] bg-[#fafafa] px-4 py-3 text-[13px] leading-[1.7] text-[#4d4d4d]">
        {turn.answerText?.trim() || "답변 내용이 없습니다."}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3 md:gap-0">
        <section className="border-[#ececec] pr-0 md:border-r md:pr-4">
          <p className="text-[12px] font-medium text-[#666666]">답변평가</p>
          <p className="mt-2 whitespace-pre-wrap text-[12px] leading-[1.7] text-[#5a5a5a]">
            {turn.evaluation?.feedback?.trim() || "평가 내용이 없습니다."}
          </p>
          <div className="mt-5 inline-flex items-center gap-2 text-[12px] font-medium text-[#c49000]">
            <StarIcons rating={stars} sizeClass="text-[12px]" />
            <span>{stars} / 5</span>
          </div>
        </section>

        <section className="border-[#ececec] md:border-r md:px-4">
          <p className="text-[12px] font-medium text-[#666666]">보완포인트</p>
          <p className="mt-2 whitespace-pre-wrap text-[12px] leading-[1.7] text-[#5a5a5a]">
            {turn.evaluation?.bestPractice?.trim() || "보완 포인트가 없습니다."}
          </p>
        </section>

        <section className="pl-0 md:pl-4">
          <p className="text-[12px] font-medium text-[#666666]">모범답안</p>
          <p className="mt-2 whitespace-pre-wrap text-[12px] leading-[1.7] text-[#5a5a5a]">
            {turn.evaluation?.modelAnswer?.trim() || "모범답안이 없습니다."}
          </p>
        </section>
      </div>
    </article>
  );
};

export const InterviewHistoryDetailPage = () => {
  const { sessionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const resolvedSessionId = typeof sessionId === "string" ? sessionId.trim() : "";
  const [pageErrorMessage, setPageErrorMessage] = useState("");
  const [loadingPage, setLoadingPage] = useState(true);
  const [summary, setSummary] = useState(location.state?.summary ?? null);
  const [results, setResults] = useState(null);
  const [bookmarkingTurnIds, setBookmarkingTurnIds] = useState([]);
  const bookmarkingTurnIdsRef = useRef([]);

  useEffect(() => {
    if (!resolvedSessionId) {
      setLoadingPage(false);
      setPageErrorMessage("유효하지 않은 면접 이력입니다.");
      return;
    }

    let active = true;

    const loadPage = async () => {
      setLoadingPage(true);
      setPageErrorMessage("");

      try {
        const [sessionSummary, sessionResults] = await Promise.all([
          location.state?.summary ? Promise.resolve(location.state.summary) : getMockInterviewHistorySummary(resolvedSessionId),
          getInterviewSessionResults("/api/interview/mock", resolvedSessionId),
        ]);
        if (!active) return;

        setSummary(sessionSummary || null);
        setResults(sessionResults);
      } catch (error) {
        if (!active) return;
        setPageErrorMessage(error?.message || "면접 결과를 불러오지 못했습니다.");
      } finally {
        if (active) setLoadingPage(false);
      }
    };

    void loadPage();
    return () => {
      active = false;
    };
  }, [location.state?.summary, resolvedSessionId]);

  const markTurnAsBookmarked = useCallback((turnId) => {
    setResults((prev) =>
      prev
        ? {
            ...prev,
            turns: prev.turns.map((item) => (item.turnId === turnId ? { ...item, bookmarked: true } : item)),
          }
        : prev
    );
  }, []);

  const handleBookmarkTurn = useCallback(async (turnId) => {
    if (!turnId) return;
    if (bookmarkingTurnIdsRef.current.includes(turnId)) return;

    const target = results?.turns?.find((item) => item.turnId === turnId);
    if (target?.bookmarked) return;

    const nextBookmarkingTurnIds = [...bookmarkingTurnIdsRef.current, turnId];
    bookmarkingTurnIdsRef.current = nextBookmarkingTurnIds;
    setBookmarkingTurnIds(nextBookmarkingTurnIds);

    try {
      await bookmarkInterviewTurn("/api/interview/mock", turnId);
      markTurnAsBookmarked(turnId);
    } catch (error) {
      if (isAlreadySavedQuestionError(error)) {
        markTurnAsBookmarked(turnId);
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
  }, [markTurnAsBookmarked, results]);

  const summaryPills = useMemo(() => buildSummaryPills(summary), [summary]);
  const pageTitle = summary ? formatHistoryTitle(summary) : "모의 면접 결과";

  return (
    <HistoryShell activeKey="interview_history">
      <div className="space-y-6">
        <header className="history-fade-up pt-2">
          <button
            type="button"
            onClick={() => navigate("/content/interview-history")}
            className="inline-flex items-center gap-2 text-[14px] text-[#5f5f5f] transition hover:text-black"
          >
            <span className="text-[18px] leading-none">‹</span>
            <span>목록으로</span>
          </button>

          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-[#151515] sm:text-[42px]">
                {pageTitle}
              </h1>
              {summary ? (
                <p className="mt-2 text-[13px] text-[#6a6a6a]">
                  시작 {formatDateTime(summary.startedAt)} · 종료 {formatDateTime(summary.finishedAt)}
                </p>
              ) : null}
            </div>
          </div>

          {summaryPills.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {summaryPills.map((pill) => (
                <HistoryChip key={pill} accent>
                  {pill}
                </HistoryChip>
              ))}
              {summary?.difficultyRating ? (
                <HistoryChip muted>
                  <span className="inline-flex items-center gap-1.5">
                    <StarIcons rating={summary.difficultyRating} sizeClass="text-[10px]" />
                    <span>{summary.difficultyRating} / 5</span>
                  </span>
                </HistoryChip>
              ) : null}
            </div>
          ) : null}
        </header>

        {pageErrorMessage ? <p className="text-[12px] text-[#dc4b4b]">{pageErrorMessage}</p> : null}

        {loadingPage ? (
          <div className="rounded-[22px] border border-[#ececec] bg-white px-5 py-10 text-center">
            <InlineSpinner label="면접 결과 불러오는 중..." />
          </div>
        ) : (
          <>
            {(results?.turns || []).length ? (
              <div className="space-y-4">
                {results.turns.map((turn, index) => (
                  <div key={turn.turnId} style={{ animationDelay: `${index * 70}ms` }}>
                    <QuestionReviewBlock
                      turn={turn}
                      bookmarking={bookmarkingTurnIds.includes(turn.turnId)}
                      onBookmark={handleBookmarkTurn}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[22px] border border-dashed border-[#dfdfdf] bg-[#fafafa] px-5 py-10 text-center text-[13px] text-[#6d6d6d]">
                저장된 질문-답변 결과가 없습니다.
              </div>
            )}

            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => navigate("/content/interview-history")}
                className="rounded-full border border-[#e2e2e2] bg-[#fafafa] px-6 py-3 text-[13px] text-[#5f5f5f] transition hover:border-[#d1d1d1] hover:bg-white"
              >
                ← 모의 면접 이력으로 나가기
              </button>
            </div>
          </>
        )}
      </div>
    </HistoryShell>
  );
};
