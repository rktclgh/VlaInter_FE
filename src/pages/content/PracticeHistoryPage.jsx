import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { StarIcons } from "../../components/DifficultyStars";
import { getInterviewLanguageLabel } from "../../lib/interviewLanguage";
import { getTechInterviewHistoryPage } from "../../lib/interviewApi";
import { HistoryShell, InlineSpinner } from "./MockInterviewHistoryScaffold";
import { formatDateTime, formatDurationText } from "./mockInterviewHistoryUtils";

const PAGE_SIZE = 6;
const PRACTICE_CARD_GRID_STYLE = {
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, clamp(18rem, 22.396vw, 26.875rem)), 1fr))",
};

const PRACTICE_PAGE_COPY = {
  title: "기술질문 연습",
  description: "직무 및 기술 카테고리로 진행했던 연습 기록을 다시 열어 보고, 질문 수와 평가 흐름을 빠르게 확인할 수 있습니다.",
};

const CARD_BASE_CLASS_NAME =
  "history-fade-up min-h-[clamp(8.25rem,7.135vw,8.5625rem)] rounded-[clamp(0.75rem,0.781vw,0.9375rem)] bg-[#FDFDFD] px-[clamp(1rem,1.146vw,1.375rem)] py-[clamp(1rem,0.833vw,1rem)] shadow-[0_0_2px_rgba(0,0,0,0.25)]";
const CARD_TITLE_CLASS_NAME =
  "truncate text-[clamp(1rem,0.938vw,1.125rem)] font-medium tracking-[0.02em] text-[#000000]";
const CARD_BODY_CLASS_NAME =
  "text-[clamp(0.75rem,0.677vw,0.8125rem)] tracking-[0.02em] text-[#767676]";
const CARD_PILL_CLASS_NAME =
  "inline-flex min-h-[clamp(1.375rem,1.25vw,1.5rem)] items-center rounded-full bg-[#FFFFFF] px-[clamp(0.625rem,0.729vw,0.875rem)] text-[clamp(0.625rem,0.573vw,0.6875rem)] tracking-[0.02em] text-[#000000] shadow-[0_0_2px_rgba(0,0,0,0.25)]";

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
      className={`${CARD_BASE_CLASS_NAME} transition-transform duration-200 hover:-translate-y-0.5`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <button type="button" onClick={onOpen} className="block w-full text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={CARD_TITLE_CLASS_NAME}>{getPracticeHistoryTitle(item)}</p>
            <p className={`mt-[clamp(0.375rem,0.417vw,0.5rem)] ${CARD_BODY_CLASS_NAME}`}>총 {item.questionCount}개의 문항</p>
          </div>

          <div className="shrink-0 pt-px text-right">
            <p className="text-[clamp(0.625rem,0.573vw,0.6875rem)] tracking-[0.02em] text-[#767676]">
              {formatDateTime(item.finishedAt || item.startedAt)}
            </p>
          </div>
        </div>

        <div className="mt-[clamp(0.875rem,0.885vw,1.0625rem)] flex flex-wrap items-center gap-[clamp(0.5rem,0.625vw,0.75rem)]">
          {item?.jobName ? <span className={CARD_PILL_CLASS_NAME}>{item.jobName}</span> : null}
          {languageLabel ? <span className={CARD_PILL_CLASS_NAME}>{languageLabel}</span> : null}
          {item?.difficultyRating ? (
            <span className={CARD_PILL_CLASS_NAME}>
              <span className="inline-flex items-center gap-1.5">
                <StarIcons rating={item.difficultyRating} sizeClass="text-[10px]" />
                <span>{item.difficultyRating} / 5</span>
              </span>
            </span>
          ) : null}
          <span className={CARD_PILL_CLASS_NAME}>{formatDurationText(item.startedAt, item.finishedAt)}</span>
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
      <div className="space-y-[clamp(1rem,1.354vw,1.625rem)]">
        <header className="history-fade-up">
          <h1 className="text-[clamp(1.875rem,1.875vw,2.25rem)] font-medium text-[#000000]">{PRACTICE_PAGE_COPY.title}</h1>
          <p className="mt-[clamp(0.875rem,0.99vw,1.1875rem)] max-w-[clamp(20rem,36vw,43.75rem)] text-[clamp(0.875rem,0.781vw,0.9375rem)] leading-[1.7] text-[#5C5C5C]">
            {PRACTICE_PAGE_COPY.description}
          </p>
        </header>

        {pageErrorMessage ? <p className="text-[12px] text-[#dc4b4b]">{pageErrorMessage}</p> : null}

        <section className="space-y-[clamp(0.875rem,0.938vw,1.125rem)]">
          {loadingList ? (
            <div className="rounded-[clamp(0.75rem,0.781vw,0.9375rem)] bg-[#FDFDFD] px-5 py-10 text-center shadow-[0_0_2px_rgba(0,0,0,0.25)]">
              <InlineSpinner label="기술질문 연습 이력 불러오는 중..." />
            </div>
          ) : !items.length ? (
            <div className="rounded-[clamp(0.75rem,0.781vw,0.9375rem)] bg-[#FDFDFD] px-5 py-10 text-center text-[13px] text-[#6d6d6d] shadow-[0_0_2px_rgba(0,0,0,0.18)]">
              완료된 기술질문 연습 이력이 없습니다.
            </div>
          ) : (
            <div className="grid gap-[clamp(0.875rem,1.042vw,1.25rem)]" style={PRACTICE_CARD_GRID_STYLE}>
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
