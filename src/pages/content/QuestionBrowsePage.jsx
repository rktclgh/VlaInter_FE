import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ContentTopNav } from "../../components/ContentTopNav";
import { MobileSidebarDrawer } from "../../components/MobileSidebarDrawer";
import { GeminiOverloadModal } from "../../components/GeminiOverloadModal";
import { PointChargeModal } from "../../components/PointChargeModal";
import { PointChargeSuccessModal } from "../../components/PointChargeSuccessModal";
import { QuestionAnswerDetailModal } from "../../components/QuestionAnswerDetailModal";
import { Sidebar } from "../../components/Sidebar";
import tempProfileImage from "../../assets/icon/temp.png";
import { isAuthenticationError } from "../../lib/apiClient";
import { logout } from "../../lib/authApi";
import { consumePointChargeSuccessResult } from "../../lib/pointChargeFlow";
import { extractProfile, formatPoint, parsePoint } from "../../lib/profileUtils";
import { isAlreadySavedQuestionError } from "../../lib/savedQuestionUtils";
import { getGlobalInterviewSets, getInterviewSetQuestions, saveInterviewQuestion, startTechInterview } from "../../lib/interviewApi";
import { saveTechInterviewSession } from "../../lib/interviewSessionFlow";
import { isGeminiOverloadError } from "../../lib/geminiErrorUtils";
import { getMyProfile, getMyProfileImageUrl } from "../../lib/userApi";

const formatDate = (value) => {
  const date = new Date(value || "");
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
};

const getDistinctJobNames = (set) => {
  const branchName = String(set?.branchName || "").trim().toLowerCase();
  return (Array.isArray(set?.jobNames) ? set.jobNames : [set?.jobName])
    .filter(Boolean)
    .map((jobName) => String(jobName).trim())
    .filter((jobName, index, all) => {
      const normalized = jobName.toLowerCase();
      if (!normalized) return false;
      if (branchName && normalized === branchName) return false;
      return all.findIndex((candidate) => String(candidate).trim().toLowerCase() === normalized) === index;
    });
};

const InlineSpinner = ({ label }) => (
  <div className="inline-flex items-center gap-2 text-[12px] text-[#5e6472]">
    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#cbd5e1] border-t-[#171b24]" />
    {label}
  </div>
);

const LogoutConfirmModal = ({ onCancel, onConfirm }) => (
  <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/35 px-4">
    <div className="w-full max-w-[420px] rounded-[16px] border border-[#d9d9d9] bg-white p-5">
      <p className="text-[15px] font-medium text-[#252525]">
        정말 로그아웃 하시겠습니까?
        <br />
        저장되지 않은 작업은 유지되지 않습니다.
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-[10px] border border-[#d6d6d6] px-3 py-1.5 text-[12px] text-[#666]">취소</button>
        <button type="button" onClick={onConfirm} className="rounded-[10px] border border-[#1f1f1f] bg-[#1f1f1f] px-3 py-1.5 text-[12px] text-white">로그아웃</button>
      </div>
    </div>
  </div>
);

export const QuestionBrowsePage = () => {
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
  const [selectedSetId, setSelectedSetId] = useState(null);
  const [query, setQuery] = useState("");
  const [startingSetId, setStartingSetId] = useState(null);
  const [isStartingSetLaunch, setIsStartingSetLaunch] = useState(false);
  const [pageErrorMessage, setPageErrorMessage] = useState("");
  const [showGeminiOverloadModal, setShowGeminiOverloadModal] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [savingQuestionId, setSavingQuestionId] = useState(null);
  const [savedQuestionIds, setSavedQuestionIds] = useState([]);

  useEffect(() => {
    if (!isStartingSetLaunch) return undefined;
    const currentUrl = window.location.href;
    window.history.pushState(null, "", currentUrl);
    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const handlePopState = () => {
      window.history.pushState(null, "", currentUrl);
      setPageErrorMessage("세트 연습 시작이 끝날 때까지 이동할 수 없습니다.");
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isStartingSetLaunch]);

  const loadPage = useCallback(async () => {
    const setList = await getGlobalInterviewSets();
    const normalizedSets = Array.isArray(setList) ? setList : [];
    const details = await Promise.all(
      normalizedSets.map(async (set) => {
        try {
          return {
            ...set,
            questions: (await getInterviewSetQuestions(set.setId)) || [],
          };
        } catch (error) {
          console.error(`질문 세트 문항 로딩에 실패했습니다. setId=${set.setId}`, error);
          return {
            ...set,
            questions: [],
          };
        }
      })
    );
    setSets(details);
    setSelectedSetId((prev) => {
      if (prev && details.some((item) => item.setId === prev)) return prev;
      return details[0]?.setId ?? null;
    });
  }, []);

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
      } catch (error) {
        if (isAuthenticationError(error)) {
          navigate("/login", { replace: true });
          return;
        }
      }
      try {
        await loadPage();
      } catch (error) {
        setPageErrorMessage(error?.message || "공인 질문 세트를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [loadPage, navigate]);

  const filteredSets = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return sets.filter((set) => {
      if (!keyword) return true;
      return [
        set.title,
        set.description,
        set.branchName,
        ...getDistinctJobNames(set),
        ...(Array.isArray(set.skillNames) ? set.skillNames : [set.skillName]),
        set.ownerName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });
  }, [query, sets]);

  const selectedSet = useMemo(
    () => filteredSets.find((item) => item.setId === selectedSetId) || filteredSets[0] || null,
    [filteredSets, selectedSetId]
  );

  const handleSidebarNavigate = (item) => {
    if (isStartingSetLaunch) return;
    setIsMobileMenuOpen(false);
    if (item?.path) navigate(item.path);
  };

  const handleLogoutConfirm = async () => {
    if (isStartingSetLaunch) return;
    try {
      await logout();
    } catch {
      // ignore
    } finally {
      setShowLogoutModal(false);
      navigate("/login", { replace: true });
    }
  };

  const handleStartSetPractice = async (setItem) => {
    if (!setItem?.setId || isStartingSetLaunch) return;
    setIsStartingSetLaunch(true);
    setStartingSetId(setItem.setId);
    setPageErrorMessage("");
    try {
      const primaryJobName = getDistinctJobNames(setItem).find((name) => name && name !== "공통") || setItem.jobName || null;
      const response = await startTechInterview({
        setId: setItem.setId,
        jobName: primaryJobName,
        skillName: (Array.isArray(setItem.skillNames) ? setItem.skillNames[0] : setItem.skillName) || null,
        questionCount: 5,
        saveHistory: false,
      });
      if (!response?.sessionId || !response?.currentQuestion) {
        setPageErrorMessage("연습 세션을 시작했지만 첫 질문을 불러오지 못했습니다.");
        return;
      }
      saveTechInterviewSession({
        sessionId: response.sessionId,
        currentQuestion: response.currentQuestion,
        pendingResult: null,
        completed: false,
        metadata: {
          apiBasePath: "/api/interview/tech",
          fromQuestionSet: true,
          saveHistory: false,
          categoryName: (Array.isArray(setItem.skillNames) ? setItem.skillNames.join(", ") : setItem.skillName) || null,
          jobName: primaryJobName,
          questionCount: Math.max(Number(setItem.questionCount || 0), Array.isArray(setItem.questions) ? setItem.questions.length : 0, 5),
          providerUsed: response.providerUsed || null,
          fallbackDepth: Number(response.fallbackDepth || 0),
          paidFallbackPopupPending: String(response.providerUsed || "").toUpperCase() === "BEDROCK",
        },
      });
      navigate("/content/interview/session");
    } catch (error) {
      if (isGeminiOverloadError(error)) {
        setShowGeminiOverloadModal(true);
        setPageErrorMessage("");
        return;
      }
      setPageErrorMessage(error?.message || "공인 질문 세트 연습 시작에 실패했습니다.");
    } finally {
      setStartingSetId(null);
      setIsStartingSetLaunch(false);
    }
  };

  const handleSaveQuestion = async (questionId) => {
    if (!questionId) return;
    setSavingQuestionId(questionId);
    setPageErrorMessage("");
    try {
      await saveInterviewQuestion(questionId);
      setSavedQuestionIds((prev) => (prev.includes(questionId) ? prev : [...prev, questionId]));
    } catch (error) {
      if (isAlreadySavedQuestionError(error)) {
        setSavedQuestionIds((prev) => (prev.includes(questionId) ? prev : [...prev, questionId]));
        return;
      }
      setPageErrorMessage(error?.message || "질문 저장에 실패했습니다.");
    } finally {
      setSavingQuestionId(null);
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-white pt-[54px]">
      <ContentTopNav
        point={formatPoint(userPoint)}
        interactionDisabled={isStartingSetLaunch}
        onClickCharge={() => {
          if (isStartingSetLaunch) return;
          setShowPointChargeModal(true);
        }}
        onOpenMenu={() => {
          if (isStartingSetLaunch) return;
          setIsMobileMenuOpen(true);
        }}
      />
      <MobileSidebarDrawer
        open={isMobileMenuOpen}
        activeKey="question_browse"
        onClose={() => {
          if (isStartingSetLaunch) return;
          setIsMobileMenuOpen(false);
        }}
        onNavigate={handleSidebarNavigate}
        userName={userName}
        profileImageUrl={profileImageUrl}
        onLogout={() => {
          if (isStartingSetLaunch) return;
          setIsMobileMenuOpen(false);
          setShowLogoutModal(true);
        }}
      />
      <div className="flex min-h-[calc(100vh-54px)]">
        <div className="hidden w-[272px] shrink-0 md:block">
          <Sidebar
            activeKey="question_browse"
            onNavigate={handleSidebarNavigate}
            userName={userName}
            profileImageUrl={profileImageUrl}
            onLogout={() => {
              if (isStartingSetLaunch) return;
              setShowLogoutModal(true);
            }}
          />
        </div>
        <main className="flex min-w-0 flex-1 flex-col px-4 pb-8 pt-6 sm:px-5 md:px-8 md:pt-10">
          <div className="mx-auto w-full max-w-[1280px]">
            <section className="rounded-[24px] border border-[#e4e7ee] bg-[linear-gradient(180deg,#ffffff_0%,#f7f9fc_100%)] p-6">
              <p className="text-[12px] font-semibold tracking-[0.08em] text-[#7a8190]">CERTIFIED Q&A SETS</p>
              <h1 className="mt-2 text-[30px] font-semibold tracking-[-0.02em] text-[#161a22] sm:text-[40px]">공개 질문 찾아보기</h1>
              <p className="mt-3 text-[14px] leading-[1.7] text-[#5e6472]">
                운영자가 인증한 공인 세트와 사용자가 공유한 공개 세트를 함께 확인하실 수 있습니다.
              </p>
            </section>

            <section className="mt-5 rounded-[24px] border border-[#e4e7ee] bg-white p-5 sm:p-6">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="세트 제목, 계열, 직무, 기술 검색"
                className="w-full rounded-[14px] border border-[#dfe3eb] px-4 py-3 text-[13px] outline-none focus:border-[#8aa2e8]"
              />
            </section>

            <section className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
              <article className="rounded-[20px] border border-[#e4e7ee] bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
                <div className="flex items-center justify-between">
                  <h2 className="text-[16px] font-semibold text-[#1f2937]">공인 세트 목록</h2>
                  {loading ? <InlineSpinner label="불러오는 중" /> : <span className="text-[12px] text-[#6b7280]">{filteredSets.length}개</span>}
                </div>
                <div className="mt-3 space-y-2">
                  {!loading && filteredSets.length === 0 ? <p className="text-[12px] text-[#6b7280]">공인 세트가 없습니다.</p> : null}
                  {filteredSets.map((setItem) => {
                    const jobNames = getDistinctJobNames(setItem)
                      .sort((left, right) => {
                        const leftCommon = String(left).trim() === "공통" ? 0 : 1;
                        const rightCommon = String(right).trim() === "공통" ? 0 : 1;
                        if (leftCommon !== rightCommon) return leftCommon - rightCommon;
                        return String(left).localeCompare(String(right), "ko");
                      });
                    const skillSummaries = Array.from(
                      new Map(
                        (setItem.questions || []).map((question) => [
                          String(question.skillName || question.categoryName || "").trim().toLowerCase(),
                          {
                            label: String(question.skillName || question.categoryName || "").trim(),
                            isCommon: String(question.jobName || "").trim() === "공통",
                          },
                        ])
                      ).values()
                    )
                      .filter((item) => item.label)
                      .sort((left, right) => {
                        const leftCommon = left.isCommon ? 0 : 1;
                        const rightCommon = right.isCommon ? 0 : 1;
                        if (leftCommon !== rightCommon) return leftCommon - rightCommon;
                        return left.label.localeCompare(right.label, "ko");
                      });
                    return (
                      <button
                        key={setItem.setId}
                        type="button"
                        onClick={() => setSelectedSetId(setItem.setId)}
                        className={`w-full rounded-[14px] border p-3 text-left ${setItem.setId === selectedSet?.setId ? "border-[#9eb1dd] bg-[#f5f8ff]" : "border-[#edf1f6] hover:bg-[#fafbfd]"}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-[13px] font-semibold text-[#1f2937]">{setItem.title}</p>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${setItem.certified ? "bg-[#e7f4ff] text-[#0b69b7]" : "bg-[#eef2f8] text-[#556070]"}`}>
                                {setItem.certified ? "공인" : "공유"}
                              </span>
                              {setItem.aiGenerated ? (
                                <span className="rounded-full bg-[#f3ecff] px-2 py-0.5 text-[10px] font-semibold text-[#6d3bb6]">AI</span>
                              ) : null}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {setItem.branchName ? <span className="rounded-full bg-[#eef2f8] px-2 py-0.5 text-[10px] text-[#556070]">{setItem.branchName}</span> : null}
                              {jobNames.slice(0, 3).map((jobName) => (
                                <span key={`${setItem.setId}-job-${jobName}`} className={`rounded-full px-2 py-0.5 text-[10px] ${jobName === "공통" ? "bg-[#ebf8ff] text-[#2b6cb0]" : "bg-[#f4f6fb] text-[#556070]"}`}>
                                  {jobName}
                                </span>
                              ))}
                              {skillSummaries.slice(0, 4).map((skill) => (
                                <span key={`${setItem.setId}-${skill.label}`} className={`rounded-full px-2 py-0.5 text-[10px] ${skill.isCommon ? "bg-[#ebf8ff] text-[#2b6cb0]" : "bg-[#eef2f8] text-[#556070]"}`}>
                                  {skill.label}
                                </span>
                              ))}
                            </div>
                            <p className="mt-2 text-[11px] text-[#8b95a7]">제작자: {setItem.ownerName || "-"}</p>
                          </div>
                          <span className="rounded-full border border-[#d9dde5] px-2 py-0.5 text-[10px] font-semibold text-[#334155]">{(setItem.questions || []).length}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </article>

              <article className="rounded-[20px] border border-[#e4e7ee] bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
                {selectedSet ? (
                  <>
                    <h2 className="text-[16px] font-semibold text-[#1f2937]">{selectedSet.title}</h2>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {selectedSet.branchName ? <span className="rounded-full bg-[#eef2f8] px-2 py-0.5 text-[10px] text-[#556070]">{selectedSet.branchName}</span> : null}
                      {getDistinctJobNames(selectedSet)
                        .sort((left, right) => {
                          const leftCommon = String(left).trim() === "공통" ? 0 : 1;
                          const rightCommon = String(right).trim() === "공통" ? 0 : 1;
                          if (leftCommon !== rightCommon) return leftCommon - rightCommon;
                          return String(left).localeCompare(String(right), "ko");
                        })
                        .map((jobName) => (
                          <span key={`selected-job-${jobName}`} className={`rounded-full px-2 py-0.5 text-[10px] ${jobName === "공통" ? "bg-[#ebf8ff] text-[#2b6cb0]" : "bg-[#f4f6fb] text-[#556070]"}`}>
                            {jobName}
                          </span>
                        ))}
                    </div>
                    <p className="mt-2 text-[12px] text-[#6b7280]">{formatDate(selectedSet.createdAt)}</p>
                    <p className="mt-2 text-[12px] leading-[1.7] text-[#5e6472]">{selectedSet.description || "세트 설명이 없습니다."}</p>
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => void handleStartSetPractice(selectedSet)}
                        disabled={isStartingSetLaunch || startingSetId === selectedSet.setId}
                        className="rounded-[10px] border border-[#171b24] px-3 py-1.5 text-[11px] font-semibold text-[#171b24] disabled:opacity-60"
                      >
                        {startingSetId === selectedSet.setId ? "연습 준비 중..." : "이 세트로 연습"}
                      </button>
                    </div>
                    <div className="mt-4 space-y-2">
                      {(selectedSet.questions || []).map((question, index) => (
                        <article
                          key={question.questionId}
                          tabIndex={0}
                          role="button"
                          className="cursor-pointer rounded-[12px] border border-[#edf1f6] bg-[#fafcff] p-3"
                          onClick={() =>
                            setSelectedQuestion({
                              ...question,
                              setId: selectedSet.setId,
                              setTitle: selectedSet.title,
                              createdAt: selectedSet.createdAt,
                              categoryName: question.skillName || question.categoryName,
                            })
                          }
                          onKeyDown={(event) => {
                            if (event.currentTarget !== event.target) return;
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setSelectedQuestion({
                                ...question,
                                setId: selectedSet.setId,
                                setTitle: selectedSet.title,
                                createdAt: selectedSet.createdAt,
                                categoryName: question.skillName || question.categoryName,
                              });
                            }
                          }}
                        >
                          <p className="text-[11px] text-[#7a8190]">문답 {index + 1}</p>
                          <p className="mt-1 text-[13px] leading-[1.6] text-[#1f2937]">{question.questionText}</p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {question.jobName ? (
                              <span className={`rounded-full px-2 py-0.5 text-[10px] ${question.jobName === "공통" ? "bg-[#ebf8ff] text-[#2b6cb0]" : "bg-[#f4f6fb] text-[#556070]"}`}>
                                {question.jobName}
                              </span>
                            ) : null}
                            {question.skillName || question.categoryName ? (
                              <span className={`rounded-full px-2 py-0.5 text-[10px] ${question.jobName === "공통" ? "bg-[#ebf8ff] text-[#2b6cb0]" : "bg-[#eef2f8] text-[#556070]"}`}>
                                {question.skillName || question.categoryName}
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-2 flex justify-end">
                            <button
                              type="button"
                              disabled={savingQuestionId === question.questionId || savedQuestionIds.includes(question.questionId)}
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleSaveQuestion(question.questionId);
                              }}
                              className="rounded-[10px] border border-[#d9dde5] px-3 py-1 text-[11px] text-[#4f5664] disabled:opacity-60"
                            >
                              {savedQuestionIds.includes(question.questionId) ? "저장됨" : savingQuestionId === question.questionId ? "저장 중..." : "저장하기"}
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-[12px] text-[#6b7280]">세트를 선택해 주세요.</p>
                )}
              </article>
            </section>

            {pageErrorMessage ? <p className="mt-4 text-[12px] text-[#dc4b4b]">{pageErrorMessage}</p> : null}
          </div>
        </main>
      </div>
      {isStartingSetLaunch ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/35 px-4">
          <div className="rounded-[18px] border border-[#d9dde5] bg-white px-5 py-4 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
            <InlineSpinner label="연습 세션을 시작하고 있습니다. 잠시만 기다려 주세요." />
          </div>
        </div>
      ) : null}
      {showLogoutModal ? <LogoutConfirmModal onCancel={() => setShowLogoutModal(false)} onConfirm={handleLogoutConfirm} /> : null}
      {showPointChargeModal ? (
        <PointChargeModal
          onClose={() => {
            if (isStartingSetLaunch) return;
            setShowPointChargeModal(false);
          }}
          onCharged={(result) => {
            if (isStartingSetLaunch) return;
            setUserPoint(parsePoint(result?.currentPoint));
            setShowPointChargeModal(false);
            setShowPointChargeSuccessModal(true);
          }}
        />
      ) : null}
      {showPointChargeSuccessModal ? <PointChargeSuccessModal onClose={() => setShowPointChargeSuccessModal(false)} currentPoint={userPoint} /> : null}
      {showGeminiOverloadModal ? <GeminiOverloadModal onClose={() => setShowGeminiOverloadModal(false)} /> : null}
      {selectedQuestion ? <QuestionAnswerDetailModal item={selectedQuestion} onClose={() => setSelectedQuestion(null)} /> : null}
    </div>
  );
};
