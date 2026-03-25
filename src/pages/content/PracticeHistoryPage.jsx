import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { StarIcons } from "../../components/DifficultyStars";
import { getInterviewLanguageLabel } from "../../lib/interviewLanguage";
import { getTechInterviewHistoryPage } from "../../lib/interviewApi";
import {
  HistoryChip,
  HistoryShell,
  InlineSpinner,
} from "./MockInterviewHistoryScaffold";
import { formatDateTime, formatDurationText } from "./mockInterviewHistoryUtils";

const PAGE_SIZE = 6;

const getPracticeHistoryTitle = (session) => {
  const categoryName = String(session?.categoryName || "").trim();
  if (categoryName) return categoryName;

  const jobName = String(session?.jobName || "").trim();
  if (jobName) return jobName;

  return "기술 질문";
};

const PracticeHistoryCard = ({ item, index, onOpen }) => {
  const languageLabel = item?.language ? getInterviewLanguageLabel(item.language) : "";

  return (
    <article
      className="history-fade-up rounded-[18px] border border-[#ebebeb] bg-white px-4 py-4 shadow-[0_18px_44px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-[#dfdfdf] hover:shadow-[0_22px_54px_rgba(15,23,42,0.08)]"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <button type="button" onClick={onOpen} className="block w-full text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {item?.jobName ? <HistoryChip muted>{item.jobName}</HistoryChip> : null}
              {languageLabel ? <HistoryChip muted>{languageLabel}</HistoryChip> : null}
            </div>
            <p className="mt-3 truncate text-[24px] font-semibold tracking-[-0.03em] text-[#1c1c1c]">
              {getPracticeHistoryTitle(item)}
            </p>
            <p className="mt-2 text-[13px] text-[#737373]">총 {item.questionCount}개의 문항</p>
            <p className="mt-1 text-[13px] text-[#737373]">{formatDurationText(item.startedAt, item.finishedAt)}</p>
          </div>

          <div className="shrink-0 pt-1 text-right">
            <p className="text-[11px] text-[#a3a3a3]">{formatDateTime(item.finishedAt || item.startedAt)}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {item?.difficultyRating ? (
            <HistoryChip muted>
              <span className="inline-flex items-center gap-1.5">
                <StarIcons rating={item.difficultyRating} sizeClass="text-[10px]" />
                <span>{item.difficultyRating} / 5</span>
              </span>
            </HistoryChip>
          ) : null}
          <span className="ml-auto inline-flex h-7 w-8 items-center justify-center rounded-full border border-[#e6e6e6] bg-[#fbfbfb] text-[14px] text-[#6b6b6b] transition hover:bg-white">
            …
          </span>
        </div>
      </button>
    </article>
  );
};

export const PracticeHistoryPage = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [pageErrorMessage, setPageErrorMessage] = useState("");
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);

  useEffect(() => {
    let active = true;

    const loadHistory = async () => {
      setLoadingList(true);
      setPageErrorMessage("");
      try {
        const history = await getTechInterviewHistoryPage({ page, size: PAGE_SIZE });
        if (!active) return;
        setItems(Array.isArray(history?.items) ? history.items : []);
        setHasNext(Boolean(history?.hasNext));
      } catch (error) {
        if (!active) return;
        setPageErrorMessage(error?.message || "기술질문 연습 이력을 불러오지 못했습니다.");
      } finally {
        if (active) setLoadingList(false);
      }
    };

    void loadHistory();
    return () => {
      active = false;
    };
  }, [page]);

  return (
    <HistoryShell activeKey="practice_history">
      <div className="space-y-6">
        <header className="history-fade-up rounded-[24px] border border-[#ececec] bg-white px-5 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.04)] sm:px-7">
          <h1 className="text-[30px] font-semibold tracking-[-0.04em] text-[#151515] sm:text-[48px]">기술질문 연습이력 조회</h1>
          <p className="mt-3 max-w-[760px] text-[14px] leading-[1.7] text-[#6a6a6a]">
            진행했던 기술질문 연습의 결과를 보고, 각 질문에 대한 내 답변과 단답 평가를 빠르게 다시 확인할 수 있습니다.
          </p>
        </header>

        {pageErrorMessage ? <p className="text-[12px] text-[#dc4b4b]">{pageErrorMessage}</p> : null}

        <section className="space-y-4">
          {loadingList ? (
            <div className="rounded-[22px] border border-[#ececec] bg-white px-5 py-10 text-center">
              <InlineSpinner label="기술질문 연습 이력 불러오는 중..." />
            </div>
          ) : !items.length ? (
            <div className="rounded-[22px] border border-dashed border-[#dfdfdf] bg-[#fafafa] px-5 py-10 text-center text-[13px] text-[#6d6d6d]">
              완료된 기술질문 연습 이력이 없습니다.
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {items.map((item, index) => (
                <PracticeHistoryCard
                  key={item.sessionId}
                  item={item}
                  index={index}
                  onOpen={() => navigate(`/content/practice-history/${item.sessionId}`, { state: { summary: item } })}
                />
              ))}
            </div>
          )}

          {!loadingList && items.length ? (
            <div className="history-fade-up flex justify-center pt-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#ececec] bg-white px-3 py-2 text-[12px] text-[#666666] shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                  disabled={page === 0}
                  className={`rounded-full border px-3 py-1.5 transition ${
                    page === 0
                      ? "cursor-not-allowed border-[#ececec] bg-[#f6f6f6] text-[#b7b7b7]"
                      : "border-[#dddddd] bg-white text-[#4f4f4f] hover:border-[#cfcfcf]"
                  }`}
                >
                  이전
                </button>
                <span className="min-w-12 text-center text-[#8a8a8a]">페이지 {page + 1}</span>
                <button
                  type="button"
                  onClick={() => setPage((prev) => prev + 1)}
                  disabled={!hasNext}
                  className={`rounded-full border px-3 py-1.5 transition ${
                    !hasNext
                      ? "cursor-not-allowed border-[#ececec] bg-[#f6f6f6] text-[#b7b7b7]"
                      : "border-[#dddddd] bg-white text-[#4f4f4f] hover:border-[#cfcfcf]"
                  }`}
                >
                  다음
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </HistoryShell>
  );
};
