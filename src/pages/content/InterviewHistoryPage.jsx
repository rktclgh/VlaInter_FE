import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { StarIcons } from "../../components/DifficultyStars";
import { deleteInterviewSession, getMockInterviewHistoryPage } from "../../lib/interviewApi";
import {
  DeleteConfirmModal,
  HistoryChip,
  HistoryShell,
  InlineSpinner,
} from "./MockInterviewHistoryScaffold";
import { formatDurationText, formatHistoryTitle } from "./mockInterviewHistoryUtils";

const LIST_API_BASE_PATH = "/api/interview/mock";
const PAGE_SIZE = 12;

const HistorySessionCard = ({ item, index, deleting, onOpen, onDelete }) => {
  const labels = useMemo(() => {
    const next = [];
    if (item?.jobName) next.push(item.jobName);
    (item?.selectedDocuments || []).forEach((document) => {
      if (document?.label) next.push(document.label);
    });
    return next.slice(0, 2);
  }, [item]);

  return (
    <article
      className="history-fade-up rounded-[18px] border border-[#ebebeb] bg-white px-4 py-4 shadow-[0_18px_44px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-[#dfdfdf] hover:shadow-[0_22px_54px_rgba(15,23,42,0.08)]"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <p className="truncate text-[20px] font-semibold tracking-[-0.03em] text-[#1c1c1c]">
            {formatHistoryTitle(item)}
          </p>
          <p className="mt-2 text-[13px] text-[#737373]">총 {item.questionCount}개의 문항</p>
          <p className="mt-1 text-[13px] text-[#737373]">{formatDurationText(item.startedAt, item.finishedAt)}</p>
        </button>

        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className={`shrink-0 text-[12px] ${
            deleting ? "cursor-not-allowed text-[#d0a4a4]" : "text-[#ff4d4f] transition hover:text-[#e23b3d]"
          }`}
        >
          {deleting ? "삭제 중" : "삭제"}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {labels.map((label) => (
          <HistoryChip key={`${item.sessionId}-${label}`}>{label}</HistoryChip>
        ))}
        {item.difficultyRating ? (
          <HistoryChip muted>
            <span className="inline-flex items-center gap-1.5">
              <StarIcons rating={item.difficultyRating} sizeClass="text-[10px]" />
              <span>{item.difficultyRating} / 5</span>
            </span>
          </HistoryChip>
        ) : null}
        <button
          type="button"
          onClick={onOpen}
          className="ml-auto inline-flex h-7 w-8 items-center justify-center rounded-full border border-[#e6e6e6] bg-[#fbfbfb] text-[14px] text-[#6b6b6b] transition hover:bg-white"
          aria-label="면접 상세 보기"
        >
          …
        </button>
      </div>
    </article>
  );
};

export const InterviewHistoryPage = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [pageErrorMessage, setPageErrorMessage] = useState("");
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [deletingSessionId, setDeletingSessionId] = useState(null);
  const [pendingDeleteItem, setPendingDeleteItem] = useState(null);

  useEffect(() => {
    let active = true;

    const loadHistory = async () => {
      setLoadingList(true);
      setPageErrorMessage("");
      try {
        const history = await getMockInterviewHistoryPage({ page, size: PAGE_SIZE });
        if (!active) return;
        setItems(Array.isArray(history?.items) ? history.items : []);
        setHasNext(Boolean(history?.hasNext));
      } catch (error) {
        if (!active) return;
        setPageErrorMessage(error?.message || "완료된 모의면접 이력을 불러오지 못했습니다.");
      } finally {
        if (active) setLoadingList(false);
      }
    };

    void loadHistory();
    return () => {
      active = false;
    };
  }, [page, refreshKey]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!pendingDeleteItem?.sessionId) return;

    setDeletingSessionId(pendingDeleteItem.sessionId);
    setPageErrorMessage("");
    try {
      await deleteInterviewSession(LIST_API_BASE_PATH, pendingDeleteItem.sessionId);
      setPendingDeleteItem(null);
      if (items.length === 1 && page > 0) {
        setPage((prev) => prev - 1);
      } else {
        setRefreshKey((prev) => prev + 1);
      }
    } catch (error) {
      setPageErrorMessage(error?.message || "면접 이력을 삭제하지 못했습니다.");
    } finally {
      setDeletingSessionId(null);
    }
  }, [items.length, page, pendingDeleteItem]);

  return (
    <HistoryShell activeKey="interview_history">
      <div className="space-y-6">
        <header className="history-fade-up rounded-[24px] border border-[#ececec] bg-white px-5 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.04)] sm:px-7">
          <h1 className="text-[30px] font-semibold tracking-[-0.04em] text-[#151515] sm:text-[48px]">모의 면접 이력</h1>
          <p className="mt-3 max-w-[760px] text-[14px] leading-[1.7] text-[#6a6a6a]">
            진행했던 모의면접의 질문 카테고리 및 문항 수를 확인하고, 면접 내용과 피드백을 빠르게 다시 확인할 수 있습니다.
          </p>
        </header>

        {pageErrorMessage ? <p className="text-[12px] text-[#dc4b4b]">{pageErrorMessage}</p> : null}

        <section className="space-y-4">
          {loadingList ? (
            <div className="rounded-[22px] border border-[#ececec] bg-white px-5 py-10 text-center">
              <InlineSpinner label="모의면접 이력 불러오는 중..." />
            </div>
          ) : !items.length ? (
            <div className="rounded-[22px] border border-dashed border-[#dfdfdf] bg-[#fafafa] px-5 py-10 text-center text-[13px] text-[#6d6d6d]">
              완료된 모의면접 이력이 없습니다.
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-3 lg:grid-cols-2">
              {items.map((item, index) => (
                <HistorySessionCard
                  key={item.sessionId}
                  item={item}
                  index={index}
                  deleting={deletingSessionId === item.sessionId}
                  onOpen={() => navigate(`/content/interview-history/${item.sessionId}`, { state: { summary: item } })}
                  onDelete={() => setPendingDeleteItem(item)}
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

      {pendingDeleteItem ? (
        <DeleteConfirmModal
          title={`${formatHistoryTitle(pendingDeleteItem)}을 삭제할까요?`}
          description="삭제한 이력은 다시 복구할 수 없습니다. 저장된 결과와 질문 평가 정보도 함께 제거됩니다."
          onCancel={() => setPendingDeleteItem(null)}
          onConfirm={handleDeleteConfirm}
        />
      ) : null}
    </HistoryShell>
  );
};
