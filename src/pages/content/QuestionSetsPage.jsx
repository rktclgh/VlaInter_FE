import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ContentTopNav } from "../../components/ContentTopNav";
import { DifficultyStars, StarIcons, StarRatingInput } from "../../components/DifficultyStars";
import { GeminiOverloadModal } from "../../components/GeminiOverloadModal";
import { MobileSidebarDrawer } from "../../components/MobileSidebarDrawer";
import { PointChargeModal } from "../../components/PointChargeModal";
import { PointChargeSuccessModal } from "../../components/PointChargeSuccessModal";
import { QuestionAnswerDetailModal } from "../../components/QuestionAnswerDetailModal";
import { Sidebar } from "../../components/Sidebar";
import tempProfileImage from "../../assets/icon/temp.png";
import { logout } from "../../lib/authApi";
import { getCategoryDisplayName, sanitizeQuestionTag } from "../../lib/categoryPresentation";
import { ratingToDifficulty } from "../../lib/difficultyRating";
import {
  addQuestionToInterviewSet,
  createInterviewCategory,
  createInterviewSet,
  deleteInterviewSet,
  getInterviewCategories,
  getInterviewSetQuestions,
  getMyInterviewSets,
  startTechInterview,
  updateInterviewSet,
} from "../../lib/interviewApi";
import { saveTechInterviewSession } from "../../lib/interviewSessionFlow";
import { isGeminiOverloadError } from "../../lib/geminiErrorUtils";
import { consumePointChargeSuccessResult } from "../../lib/pointChargeFlow";
import { extractProfile, formatPoint, parsePoint } from "../../lib/profileUtils";
import { getMyProfile, getMyProfileImageUrl } from "../../lib/userApi";

const DEFAULT_ROW = { questionText: "", canonicalAnswer: "", tags: "", rating: 3 };

const formatDate = (value) => {
  const date = new Date(value || "");
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
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
        <button type="button" onClick={onCancel} className="rounded-[10px] border border-[#d6d6d6] px-3 py-1.5 text-[12px] text-[#666]">취소</button>
        <button type="button" onClick={onConfirm} className="rounded-[10px] border border-[#1f1f1f] bg-[#1f1f1f] px-3 py-1.5 text-[12px] text-white">로그아웃</button>
      </div>
    </div>
  </div>
);

const InlineSpinner = ({ label }) => (
  <div className="inline-flex items-center gap-2 text-[12px] text-[#5e6472]">
    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#cbd5e1] border-t-[#171b24]" />
    {label}
  </div>
);

const ConfirmDiscardModal = ({ onCancel, onConfirm }) => (
  <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/45 px-4" role="dialog" aria-modal="true">
    <div className="w-full max-w-[420px] rounded-[18px] border border-[#d9d9d9] bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.18)]">
      <p className="text-[15px] font-medium text-[#252525]">
        정말 종료하시겠습니까?
        <br />
        작성 중인 문답은 저장되지 않습니다.
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-[10px] border border-[#d6d6d6] px-3 py-1.5 text-[12px] text-[#666]">계속 작성</button>
        <button type="button" onClick={onConfirm} className="rounded-[10px] border border-[#1f1f1f] bg-[#1f1f1f] px-3 py-1.5 text-[12px] text-white">종료</button>
      </div>
    </div>
  </div>
);

const CategoryChip = ({ label, active = false, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-full border px-3 py-1 text-[11px] transition ${active ? "border-[#171b24] bg-[#171b24] text-white" : "border-[#d9dde5] bg-white text-[#556070]"}`}
  >
    {label}
  </button>
);

const DifficultyChip = ({ label, active = false, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-full border px-3 py-1 text-[11px] transition ${active ? "border-[#9d6320] bg-[#fff5ea] text-[#9d6320]" : "border-[#eceff4] bg-white text-[#6b7280]"}`}
  >
    {label}
  </button>
);

const handleCardKeyDown = (event, action) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    action();
  }
};

const CreateQuestionSetModal = ({
  categories,
  onClose,
  onSubmit,
  submitting,
  errorMessage,
  onCreateCategory,
  creatingCategory,
}) => {
  const branchItems = useMemo(() => categories.filter((item) => Number(item.depth) === 0), [categories]);
  const jobs = useMemo(() => categories.filter((item) => Number(item.depth) === 1), [categories]);
  const skillItems = useMemo(() => categories.filter((item) => Number(item.depth) === 2), [categories]);

  const [setTitle, setSetTitle] = useState("");
  const [branchQuery, setBranchQuery] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [jobQuery, setJobQuery] = useState("");
  const [selectedJobId, setSelectedJobId] = useState("");
  const [skillQuery, setSkillQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [rows, setRows] = useState([{ ...DEFAULT_ROW }]);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [localMessage, setLocalMessage] = useState("");

  const visibleBranches = useMemo(() => {
    const keyword = branchQuery.trim().toLowerCase();
    return branchItems.filter((item) => {
      if (!keyword) return true;
      return [item.name, item.code, item.path].filter(Boolean).join(" ").toLowerCase().includes(keyword);
    });
  }, [branchItems, branchQuery]);

  const visibleJobs = useMemo(() => {
    const keyword = jobQuery.trim().toLowerCase();
    return jobs.filter((item) => {
      if (selectedBranchId && String(item.parentId) !== selectedBranchId) return false;
      if (!keyword) return true;
      return [item.name, item.code, item.path].filter(Boolean).join(" ").toLowerCase().includes(keyword);
    });
  }, [jobQuery, jobs, selectedBranchId]);

  const filteredCategories = useMemo(() => {
    const keyword = skillQuery.trim().toLowerCase();
    return skillItems.filter((item) => {
      if (selectedJobId && String(item.parentId) !== selectedJobId) return false;
      if (!keyword) return true;
      return [item.name, item.code, item.path].filter(Boolean).join(" ").toLowerCase().includes(keyword);
    });
  }, [selectedJobId, skillItems, skillQuery]);

  const canCreateBranch = Boolean(
    branchQuery.trim() &&
    !branchItems.some((item) => String(item.name || "").trim().toLowerCase() === branchQuery.trim().toLowerCase())
  );
  const canCreateJob = Boolean(
    selectedBranchId &&
    jobQuery.trim() &&
    !jobs.some(
      (item) =>
        String(item.parentId) === selectedBranchId &&
        String(item.name || "").trim().toLowerCase() === jobQuery.trim().toLowerCase()
    )
  );
  const canCreateSkill = Boolean(
    selectedJobId &&
    skillQuery.trim() &&
    !skillItems.some(
      (item) =>
        String(item.parentId) === selectedJobId &&
        String(item.name || "").trim().toLowerCase() === skillQuery.trim().toLowerCase()
    )
  );

  const dirty =
    setTitle.trim() ||
    branchQuery.trim() ||
    jobQuery.trim() ||
    skillQuery.trim() ||
    selectedCategoryId ||
    rows.some((row) => row.questionText.trim() || row.canonicalAnswer.trim() || row.tags.trim());

  const requestClose = () => {
    if (submitting || creatingCategory) return;
    if (dirty) {
      setShowDiscardConfirm(true);
      return;
    }
    onClose();
  };

  const handleCreateBranch = async () => {
    if (!canCreateBranch) return;
    try {
      setLocalMessage("");
      const created = await onCreateCategory({ parentId: null, name: branchQuery.trim() });
      setSelectedBranchId(String(created?.categoryId || ""));
      setSelectedJobId("");
      setSelectedCategoryId("");
    } catch (error) {
      setLocalMessage(error?.message || "계열 생성에 실패했습니다.");
    }
  };

  const handleCreateJob = async () => {
    if (!canCreateJob) return;
    try {
      setLocalMessage("");
      const created = await onCreateCategory({ parentId: Number(selectedBranchId), name: jobQuery.trim() });
      const nextJobId = String(created?.categoryId || "");
      setSelectedJobId(nextJobId);
      setSelectedCategoryId("");
    } catch (error) {
      setLocalMessage(error?.message || "직무 생성에 실패했습니다.");
    }
  };

  const handleCreateSkill = async () => {
    if (!canCreateSkill) return;
    try {
      setLocalMessage("");
      const created = await onCreateCategory({ parentId: Number(selectedJobId), name: skillQuery.trim() });
      setSelectedCategoryId(String(created?.categoryId || ""));
    } catch (error) {
      setLocalMessage(error?.message || "기술 생성에 실패했습니다.");
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 px-4">
        <div className="absolute inset-0" onClick={requestClose} />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-set-title"
          className="relative flex max-h-[90vh] w-full max-w-[1120px] flex-col overflow-hidden rounded-[28px] border border-[#dfe3eb] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]"
        >
          <div className="border-b border-[#edf1f6] px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[12px] font-semibold tracking-[0.08em] text-[#7a8190]">CREATE Q&A SET</p>
                <h2 id="create-set-title" className="mt-2 text-[28px] font-semibold tracking-[-0.02em] text-[#161a22]">문답 세트 만들기</h2>
              </div>
              <button type="button" onClick={requestClose} className="rounded-full border border-[#d9dde5] px-3 py-1 text-[12px] text-[#4f5664]">닫기</button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
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
                  <p className="text-[12px] font-semibold text-[#738094]">계열 검색/생성</p>
                  <div className="mt-2 grid gap-2 grid-cols-[1fr_auto]">
                    <input
                      value={branchQuery}
                      onChange={(event) => setBranchQuery(event.target.value)}
                      placeholder="계열 검색 또는 새 계열 입력"
                      className="rounded-[14px] border border-[#dfe3eb] px-4 py-3 text-[13px] outline-none focus:border-[#8aa2e8]"
                    />
                    <button
                      type="button"
                      disabled={!canCreateBranch || creatingCategory}
                      onClick={() => void handleCreateBranch()}
                      className="rounded-[12px] border border-[#171b24] px-3 py-2 text-[12px] font-semibold text-[#171b24] disabled:opacity-50"
                    >
                      {creatingCategory ? "생성 중..." : "추가"}
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {visibleBranches.slice(0, 8).map((item) => (
                      <CategoryChip
                        key={item.categoryId}
                        label={item.displayName || item.name}
                        active={selectedBranchId === String(item.categoryId)}
                        onClick={() => {
                          setSelectedBranchId(String(item.categoryId));
                          setSelectedJobId("");
                          setSelectedCategoryId("");
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[12px] font-semibold text-[#738094]">직무 검색/생성</p>
                  <div className="mt-2 grid gap-2 grid-cols-[1fr_auto]">
                    <input
                      value={jobQuery}
                      onChange={(event) => setJobQuery(event.target.value)}
                      placeholder={selectedBranchId ? "직무 검색 또는 새 직무 입력" : "계열을 먼저 선택해 주세요"}
                      disabled={!selectedBranchId}
                      className="rounded-[14px] border border-[#dfe3eb] px-4 py-3 text-[13px] outline-none focus:border-[#8aa2e8] disabled:bg-[#f3f5f8]"
                    />
                    <button
                      type="button"
                      disabled={!canCreateJob || creatingCategory}
                      onClick={() => void handleCreateJob()}
                      className="rounded-[12px] border border-[#171b24] px-3 py-2 text-[12px] font-semibold text-[#171b24] disabled:opacity-50"
                    >
                      {creatingCategory ? "생성 중..." : "추가"}
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {visibleJobs.slice(0, 8).map((item) => (
                      <CategoryChip
                        key={item.categoryId}
                        label={item.displayName || item.name}
                        active={selectedJobId === String(item.categoryId)}
                        onClick={() => {
                          setSelectedJobId(String(item.categoryId));
                          setSelectedCategoryId("");
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[12px] font-semibold text-[#738094]">기술 검색/생성</p>
                  <div className="mt-2 grid gap-2 grid-cols-[1fr_auto]">
                    <input
                      value={skillQuery}
                      onChange={(event) => setSkillQuery(event.target.value)}
                      placeholder={selectedJobId ? "기술 검색 또는 새 기술 입력" : "직무를 먼저 선택해 주세요"}
                      disabled={!selectedJobId}
                      className="rounded-[14px] border border-[#dfe3eb] px-4 py-3 text-[13px] outline-none focus:border-[#8aa2e8] disabled:bg-[#f3f5f8]"
                    />
                    <button
                      type="button"
                      disabled={!canCreateSkill || creatingCategory}
                      onClick={() => void handleCreateSkill()}
                      className="rounded-[12px] border border-[#171b24] px-3 py-2 text-[12px] font-semibold text-[#171b24] disabled:opacity-50"
                    >
                      {creatingCategory ? "생성 중..." : "추가"}
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {filteredCategories.slice(0, 8).map((item) => (
                      <CategoryChip
                        key={item.categoryId}
                        label={item.displayName || item.name}
                        active={selectedCategoryId === String(item.categoryId)}
                        onClick={() => {
                          setSelectedCategoryId(String(item.categoryId));
                          setSkillQuery(item.displayName || item.name);
                        }}
                      />
                    ))}
                    {filteredCategories.length === 0 && skillQuery.trim() ? (
                      <span className="rounded-full bg-[#fff7ed] px-3 py-1 text-[11px] text-[#9a5b11]">
                        결과가 없으므로 세트를 저장하면 새 기술 카테고리가 생성됩니다.
                      </span>
                    ) : null}
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                {rows.map((row, index) => (
                  <article key={`row-${index}`} className="rounded-[20px] border border-[#eef1f5] bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[13px] font-semibold text-[#171b24]">문답 {index + 1}</p>
                      <button
                        type="button"
                        disabled={rows.length === 1}
                        onClick={() => setRows((prev) => (prev.length === 1 ? prev : prev.filter((_, rowIndex) => rowIndex !== index)))}
                        className="rounded-[10px] border border-[#d9dde5] px-3 py-1.5 text-[11px] text-[#4f5664] disabled:opacity-50"
                      >
                        삭제
                      </button>
                    </div>
                    <div className="mt-3 grid gap-3">
                      <textarea
                        value={row.questionText}
                        onChange={(event) => setRows((prev) => prev.map((item, rowIndex) => (rowIndex === index ? { ...item, questionText: event.target.value } : item)))}
                        placeholder="질문"
                        className="min-h-[110px] rounded-[16px] border border-[#dfe3eb] px-4 py-3 text-[13px] leading-[1.7] outline-none focus:border-[#8aa2e8]"
                      />
                      <textarea
                        value={row.canonicalAnswer}
                        onChange={(event) => setRows((prev) => prev.map((item, rowIndex) => (rowIndex === index ? { ...item, canonicalAnswer: event.target.value } : item)))}
                        placeholder="내가 생각하는 모범답안"
                        className="min-h-[150px] rounded-[16px] border border-[#dfe3eb] px-4 py-3 text-[13px] leading-[1.7] outline-none focus:border-[#8aa2e8]"
                      />
                      <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
                        <div className="flex items-center rounded-[14px] border border-[#dfe3eb] px-4 py-3">
                          <StarRatingInput value={row.rating} onChange={(rating) => setRows((prev) => prev.map((item, rowIndex) => (rowIndex === index ? { ...item, rating } : item)))} />
                        </div>
                        <input
                          value={row.tags}
                          onChange={(event) => setRows((prev) => prev.map((item, rowIndex) => (rowIndex === index ? { ...item, tags: event.target.value } : item)))}
                          placeholder="태그 (쉼표 구분, 없어도 됨)"
                          className="rounded-[14px] border border-[#dfe3eb] px-4 py-3 text-[13px] outline-none focus:border-[#8aa2e8]"
                        />
                      </div>
                    </div>
                  </article>
                ))}
                <button type="button" onClick={() => setRows((prev) => [...prev, { ...DEFAULT_ROW }])} className="rounded-[14px] border border-[#d9dde5] px-4 py-2.5 text-[13px] font-medium text-[#4f5664]">
                  문답 추가
                </button>
              </section>
            </div>
          </div>

          <div className="border-t border-[#edf1f6] px-6 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {submitting ? <InlineSpinner label="문답 세트를 저장하는 중입니다." /> : <span className="text-[12px] text-[#6b7280]">저장 중에는 모달을 닫지 말아 주세요.</span>}
              <div className="flex items-center justify-end gap-2">
                <button type="button" disabled={submitting} onClick={requestClose} className="rounded-[14px] border border-[#d9dde5] px-4 py-2.5 text-[13px] text-[#4f5664] disabled:opacity-50">취소</button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() =>
                    onSubmit({
                      setTitle: setTitle.trim(),
                      selectedBranchId,
                      selectedJobId,
                      selectedCategoryId,
                      skillQuery: skillQuery.trim(),
                      rows,
                    })
                  }
                  className="rounded-[14px] bg-[#171b24] px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
                >
                  {submitting ? "저장 중..." : "문답 세트 저장"}
                </button>
              </div>
            </div>
            {errorMessage ? <p className="mt-3 text-[12px] text-[#dc4b4b]">{errorMessage}</p> : null}
            {localMessage ? <p className="mt-2 text-[12px] text-[#dc4b4b]">{localMessage}</p> : null}
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
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [savingSet, setSavingSet] = useState(false);
  const [togglingVisibility, setTogglingVisibility] = useState(false);
  const [deletingSet, setDeletingSet] = useState(false);
  const [sets, setSets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedSetId, setSelectedSetId] = useState(null);
  const [setTitle, setSetTitle] = useState("");
  const [setDescription, setSetDescription] = useState("");
  const [query, setQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("latest");
  const [filterBranchId, setFilterBranchId] = useState("");
  const [filterJobId, setFilterJobId] = useState("");
  const [filterSkillId, setFilterSkillId] = useState("");
  const [selectedRating, setSelectedRating] = useState("");
  const [startingSetId, setStartingSetId] = useState(null);
  const [isStartingSetLaunch, setIsStartingSetLaunch] = useState(false);
  const [pageErrorMessage, setPageErrorMessage] = useState("");
  const [modalErrorMessage, setModalErrorMessage] = useState("");
  const [showGeminiOverloadModal, setShowGeminiOverloadModal] = useState(false);

  const loadPage = useCallback(async () => {
    const [setList, categoryList] = await Promise.all([getMyInterviewSets(), getInterviewCategories()]);
    const normalizedSets = Array.isArray(setList) ? setList : [];
    const normalizedCategories = Array.isArray(categoryList) ? categoryList : [];

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

    setCategories(normalizedCategories);
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
  }, [loadPage, navigate]);

  const branchItems = useMemo(() => categories.filter((item) => Number(item.depth) === 0), [categories]);
  const jobItems = useMemo(() => categories.filter((item) => Number(item.depth) === 1), [categories]);
  const skillItems = useMemo(() => categories.filter((item) => Number(item.depth) === 2), [categories]);
  const selectedFilterJob = useMemo(() => jobItems.find((item) => String(item.categoryId) === String(filterJobId)) || null, [filterJobId, jobItems]);
  const selectedFilterSkill = useMemo(() => skillItems.find((item) => String(item.categoryId) === String(filterSkillId)) || null, [filterSkillId, skillItems]);
  const visibleJobItems = useMemo(
    () => (filterBranchId ? jobItems.filter((item) => String(item.parentId) === String(filterBranchId)) : jobItems),
    [filterBranchId, jobItems]
  );
  const visibleSkillItems = useMemo(
    () => (filterJobId ? skillItems.filter((item) => String(item.parentId) === String(filterJobId)) : skillItems),
    [filterJobId, skillItems]
  );

  const filteredSets = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const next = sets.filter((set) => {
      const normalizedJobName = String(set.jobName || "").trim().toLowerCase();
      const normalizedSkillName = String(set.skillName || "").trim().toLowerCase();
      if (filterBranchId) {
        const matchedJob = jobItems.find((item) => String(item.name || "").trim().toLowerCase() === normalizedJobName);
        if (!matchedJob || String(matchedJob.parentId) !== String(filterBranchId)) return false;
      }
      if (selectedFilterJob) {
        const selectedJobName = String(selectedFilterJob.name || "").trim().toLowerCase();
        if (normalizedJobName !== selectedJobName) return false;
      }
      if (selectedFilterSkill) {
        const selectedSkillName = String(selectedFilterSkill.name || "").trim().toLowerCase();
        if (normalizedSkillName !== selectedSkillName) return false;
      }
      if (!keyword) return true;
      return [set.title, set.description, set.jobName, set.skillName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });
    next.sort((left, right) => {
      const leftTime = new Date(left.createdAt || "").getTime() || 0;
      const rightTime = new Date(right.createdAt || "").getTime() || 0;
      return sortOrder === "latest" ? rightTime - leftTime : leftTime - rightTime;
    });
    return next;
  }, [filterBranchId, jobItems, query, selectedFilterJob, selectedFilterSkill, sets, sortOrder]);

  const selectedSet = useMemo(
    () => filteredSets.find((item) => item.setId === selectedSetId) || filteredSets[0] || null,
    [filteredSets, selectedSetId]
  );

  useEffect(() => {
    if (!filterBranchId) return;
    if (visibleJobItems.some((item) => String(item.categoryId) === String(filterJobId))) return;
    setFilterJobId("");
    setFilterSkillId("");
  }, [filterBranchId, filterJobId, visibleJobItems]);

  useEffect(() => {
    if (!filterJobId) return;
    if (visibleSkillItems.some((item) => String(item.categoryId) === String(filterSkillId))) return;
    setFilterSkillId("");
  }, [filterJobId, filterSkillId, visibleSkillItems]);

  useEffect(() => {
    if (!selectedSet) {
      setSetTitle("");
      setSetDescription("");
      return;
    }
    setSelectedSetId(selectedSet.setId);
    setSetTitle(selectedSet.title || "");
    setSetDescription(selectedSet.description || "");
  }, [selectedSet]);

  const visibleQuestions = useMemo(() => {
    const questions = Array.isArray(selectedSet?.questions) ? selectedSet.questions : [];
    if (!selectedRating) return questions;
    const targetDifficulty = ratingToDifficulty(Number(selectedRating));
    return questions.filter((item) => item.difficulty === targetDifficulty);
  }, [selectedRating, selectedSet]);

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

  const handleCreateSet = async ({
    setTitle: newSetTitle,
    selectedBranchId,
    selectedJobId,
    selectedCategoryId: categoryIdRaw,
    skillQuery: rawSkillName,
    rows,
  }) => {
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
    if (!newSetTitle?.trim()) return setModalErrorMessage("세트 제목을 입력해 주세요.");
    if (!selectedBranchId) return setModalErrorMessage("계열을 선택해 주세요.");
    if (!selectedJobId) return setModalErrorMessage("직무를 선택해 주세요.");

    setSubmitting(true);
    setModalErrorMessage("");
    try {
      const selectedJob = categories.find((item) => String(item.categoryId) === String(selectedJobId)) || null;
      const jobName = (selectedJob?.displayName || selectedJob?.name || "").trim();
      if (!jobName) {
        setModalErrorMessage("직무를 선택해 주세요.");
        return;
      }

      let categoryId = categoryIdRaw ? Number(categoryIdRaw) : null;
      let category = categories.find((item) => item.categoryId === categoryId) || null;
      const rawName = rawSkillName.trim();
      if (!category && !rawName) {
        setModalErrorMessage("기술을 선택하거나 입력해 주세요.");
        return;
      }
      if (!category && rawName) {
        const createdCategory = await createInterviewCategory({
          parentId: Number(selectedJobId),
          name: rawName,
        });
        categoryId = Number(createdCategory?.categoryId || 0) || null;
        category = categoryId
          ? {
              ...createdCategory,
              categoryId,
              name: String(createdCategory?.name || rawName).trim(),
              displayName: String(createdCategory?.name || rawName).trim(),
            }
          : null;
      }

      const skillName = (category?.displayName || category?.name || rawName).trim();
      if (!skillName) {
        setModalErrorMessage("기술을 선택하거나 입력해 주세요.");
        return;
      }
      if (category?.isVirtual) {
        categoryId = null;
      }

      const createdSet = await createInterviewSet({
        title: newSetTitle.trim(),
        jobName,
        skillName,
        description: null,
        visibility: "PRIVATE",
      });

      const failedRows = [];
      for (const [rowIndex, row] of normalizedRows.entries()) {
        try {
          await addQuestionToInterviewSet(createdSet.setId, {
            questionText: row.questionText,
            canonicalAnswer: row.canonicalAnswer,
            categoryId,
            jobName,
            skillName,
            difficulty: row.difficulty,
            tags: row.tags,
          });
        } catch (error) {
          failedRows.push({
            rowNo: rowIndex + 1,
            questionText: row.questionText,
            reason: error?.message || "질문 추가 실패",
          });
        }
      }

      if (failedRows.length > 0) {
        try {
          await deleteInterviewSet(createdSet.setId);
        } catch (rollbackError) {
          console.error(`부분 생성된 질문 세트 롤백에 실패했습니다. setId=${createdSet.setId}`, rollbackError);
        }
        const failedSummary = failedRows
          .map((failed) => `문답 ${failed.rowNo}: ${failed.questionText.slice(0, 24)}... (${failed.reason})`)
          .join(" / ");
        setModalErrorMessage(`일부 문답 저장에 실패했습니다. ${failedSummary}`);
        await loadPage();
        return;
      }

      await loadPage();
      setShowCreateModal(false);
    } catch (error) {
      setModalErrorMessage(error?.message || "질문 세트 생성에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateCategoryForSet = async ({ parentId, name }) => {
    setCreatingCategory(true);
    try {
      const created = await createInterviewCategory({
        parentId,
        name,
      });
      const refreshed = await getInterviewCategories();
      setCategories(Array.isArray(refreshed) ? refreshed : []);
      return created;
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleSaveSet = async () => {
    if (!selectedSet) return;
    const normalizedTitle = setTitle.trim();
    if (!normalizedTitle) {
      setPageErrorMessage("세트 제목은 비어 있을 수 없습니다.");
      return;
    }
    setSavingSet(true);
    setPageErrorMessage("");
    try {
      await updateInterviewSet(selectedSet.setId, {
        title: normalizedTitle,
        description: setDescription.trim() || null,
        visibility: selectedSet.visibility || "PRIVATE",
      });
      await loadPage();
    } catch (error) {
      setPageErrorMessage(error?.message || "세트 저장에 실패했습니다.");
    } finally {
      setSavingSet(false);
    }
  };

  const handleToggleSetVisibility = async () => {
    if (!selectedSet) return;
    const nextVisibility = selectedSet.visibility === "GLOBAL" ? "PRIVATE" : "GLOBAL";
    setTogglingVisibility(true);
    setPageErrorMessage("");
    try {
      await updateInterviewSet(selectedSet.setId, {
        title: setTitle.trim() || selectedSet.title,
        description: setDescription.trim() || null,
        visibility: nextVisibility,
      });
      await loadPage();
    } catch (error) {
      setPageErrorMessage(error?.message || "공유 상태 변경에 실패했습니다.");
    } finally {
      setTogglingVisibility(false);
    }
  };

  const handleDeleteSet = async () => {
    if (!selectedSet) return;
    const confirmed = window.confirm("선택한 세트를 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.");
    if (!confirmed) return;
    setDeletingSet(true);
    setPageErrorMessage("");
    try {
      await deleteInterviewSet(selectedSet.setId);
      await loadPage();
    } catch (error) {
      setPageErrorMessage(error?.message || "세트 삭제에 실패했습니다.");
    } finally {
      setDeletingSet(false);
    }
  };

  const handleStartSetPractice = async (setItem) => {
    if (!setItem?.setId || isStartingSetLaunch) return;
    setIsStartingSetLaunch(true);
    setStartingSetId(setItem.setId);
    setPageErrorMessage("");
    try {
      const response = await startTechInterview({
        setId: setItem.setId,
        jobName: setItem.jobName || null,
        skillName: setItem.skillName || null,
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
          categoryName: setItem.skillName || null,
          jobName: setItem.jobName || null,
        },
      });
      navigate("/content/interview/session");
    } catch (error) {
      if (isGeminiOverloadError(error)) {
        setShowGeminiOverloadModal(true);
        setPageErrorMessage("");
        return;
      }
      setPageErrorMessage(error?.message || "질문 세트 연습 시작에 실패했습니다.");
    } finally {
      setStartingSetId(null);
      setIsStartingSetLaunch(false);
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-white pt-[54px]">
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
          <div className="mx-auto w-full max-w-[1280px]">
            <section className="rounded-[24px] border border-[#e4e7ee] bg-[linear-gradient(180deg,#ffffff_0%,#f7f9fc_100%)] p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[12px] font-semibold tracking-[0.08em] text-[#7a8190]">MY Q&A SETS</p>
                  <h1 className="mt-2 text-[30px] font-semibold tracking-[-0.02em] text-[#161a22] sm:text-[40px]">내 질문 세트를 파일철처럼 관리합니다</h1>
                  <p className="mt-3 text-[14px] leading-[1.7] text-[#5e6472]">
                    세트 단위로 확인하고, 세트를 눌러 해당 문답을 펼쳐보실 수 있습니다. 공인 질문은 별도 페이지인 질문 찾아보기에서 확인하실 수 있습니다.
                  </p>
                </div>
                <button type="button" onClick={() => setShowCreateModal(true)} className="rounded-[16px] bg-[#171b24] px-5 py-3 text-[13px] font-semibold text-white">
                  문답 세트 만들기
                </button>
              </div>
            </section>

            <section className="mt-5 rounded-[24px] border border-[#e4e7ee] bg-white p-5 sm:p-6">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="세트 제목, 직무, 기술 검색"
                  className="rounded-[14px] border border-[#dfe3eb] px-4 py-3 text-[13px] outline-none focus:border-[#8aa2e8]"
                />
                <select
                  value={filterBranchId}
                  onChange={(event) => {
                    setFilterBranchId(event.target.value);
                    setFilterJobId("");
                    setFilterSkillId("");
                  }}
                  className="rounded-[14px] border border-[#dfe3eb] px-4 py-3 text-[13px] outline-none focus:border-[#8aa2e8]"
                >
                  <option value="">계열(전체)</option>
                  {branchItems.map((item) => (
                    <option key={item.categoryId} value={String(item.categoryId)}>{getCategoryDisplayName(item)}</option>
                  ))}
                </select>
                <select
                  value={filterJobId}
                  onChange={(event) => {
                    setFilterJobId(event.target.value);
                    setFilterSkillId("");
                  }}
                  className="rounded-[14px] border border-[#dfe3eb] px-4 py-3 text-[13px] outline-none focus:border-[#8aa2e8]"
                >
                  <option value="">직무(전체)</option>
                  {visibleJobItems.map((item) => (
                    <option key={item.categoryId} value={String(item.categoryId)}>{getCategoryDisplayName(item)}</option>
                  ))}
                </select>
                <select
                  value={filterSkillId}
                  onChange={(event) => setFilterSkillId(event.target.value)}
                  className="rounded-[14px] border border-[#dfe3eb] px-4 py-3 text-[13px] outline-none focus:border-[#8aa2e8]"
                >
                  <option value="">기술(전체)</option>
                  {visibleSkillItems.map((item) => (
                    <option key={item.categoryId} value={String(item.categoryId)}>{getCategoryDisplayName(item)}</option>
                  ))}
                </select>
                <select
                  value={sortOrder}
                  onChange={(event) => setSortOrder(event.target.value)}
                  className="rounded-[14px] border border-[#dfe3eb] px-4 py-3 text-[13px] outline-none focus:border-[#8aa2e8]"
                >
                  <option value="latest">생성일 최신순</option>
                  <option value="oldest">생성일 오래된순</option>
                </select>
              </div>
            </section>

            <section className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
              <article className="rounded-[20px] border border-[#e4e7ee] bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
                <div className="flex items-center justify-between">
                  <h2 className="text-[16px] font-semibold text-[#1f2937]">내 세트 목록</h2>
                  {loading ? <InlineSpinner label="불러오는 중" /> : <span className="text-[12px] text-[#6b7280]">{filteredSets.length}개</span>}
                </div>
                <div className="mt-3 space-y-2">
                  {!loading && filteredSets.length === 0 ? <p className="text-[12px] text-[#6b7280]">조회된 질문 세트가 없습니다.</p> : null}
                  {filteredSets.map((setItem) => {
                    const selected = setItem.setId === selectedSet?.setId;
                    return (
                      <button
                        key={setItem.setId}
                        type="button"
                        onClick={() => setSelectedSetId(setItem.setId)}
                        className={`w-full rounded-[14px] border p-3 text-left ${selected ? "border-[#9eb1dd] bg-[#f5f8ff]" : "border-[#edf1f6] hover:bg-[#fafbfd]"}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-[13px] font-semibold text-[#1f2937]">{setItem.title}</p>
                              {setItem.aiGenerated ? (
                                <span className="rounded-full bg-[#f3ecff] px-2 py-0.5 text-[10px] font-semibold text-[#6d3bb6]">AI</span>
                              ) : null}
                              {setItem.visibility === "GLOBAL" ? (
                                <span className="rounded-full bg-[#e7f4ff] px-2 py-0.5 text-[10px] font-semibold text-[#0b69b7]">공유중</span>
                              ) : null}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {setItem.jobName ? <span className="rounded-full bg-[#eef2f8] px-2 py-0.5 text-[10px] text-[#556070]">{setItem.jobName}</span> : null}
                              {setItem.skillName ? <span className="rounded-full bg-[#f4f6fb] px-2 py-0.5 text-[10px] text-[#556070]">{setItem.skillName}</span> : null}
                            </div>
                            <p className="mt-2 text-[11px] text-[#8b95a7]">{formatDate(setItem.createdAt)}</p>
                          </div>
                          <span className="rounded-full border border-[#d9dde5] px-2 py-0.5 text-[10px] font-semibold text-[#334155]">
                            {(setItem.questions || []).length}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </article>

              <article className="rounded-[20px] border border-[#e4e7ee] bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
                {selectedSet ? (
                  <>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[16px] font-semibold text-[#1f2937]">세트 상세</p>
                        <p className="mt-1 text-[12px] text-[#6b7280]">세트 제목/설명을 수정하고 문답을 확인하실 수 있습니다.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleStartSetPractice(selectedSet)}
                        disabled={isStartingSetLaunch || startingSetId === selectedSet.setId}
                        className="rounded-[10px] border border-[#171b24] px-3 py-1.5 text-[11px] font-semibold text-[#171b24] disabled:opacity-60"
                      >
                        {startingSetId === selectedSet.setId ? "연습 준비 중..." : "이 세트로 연습"}
                      </button>
                    </div>

                    <div className="mt-3 grid gap-2">
                      <input
                        value={setTitle}
                        onChange={(event) => setSetTitle(event.target.value)}
                        className="w-full rounded-[12px] border border-[#d9dde5] px-3 py-2 text-[13px] outline-none focus:border-[#9aa9cd]"
                        placeholder="세트 제목"
                      />
                      <textarea
                        value={setDescription}
                        onChange={(event) => setSetDescription(event.target.value)}
                        className="min-h-[72px] w-full rounded-[12px] border border-[#d9dde5] px-3 py-2 text-[13px] outline-none focus:border-[#9aa9cd]"
                        placeholder="세트 설명"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          disabled={togglingVisibility}
                          onClick={() => void handleToggleSetVisibility()}
                          className="rounded-[10px] border border-[#7aa7e8] px-3 py-1.5 text-[11px] text-[#1d4f91] disabled:opacity-50"
                        >
                          {togglingVisibility ? "처리 중..." : selectedSet.visibility === "GLOBAL" ? "공유 해제" : "공유하기"}
                        </button>
                        <button
                          type="button"
                          disabled={deletingSet}
                          onClick={() => void handleDeleteSet()}
                          className="rounded-[10px] border border-[#ef9a9a] px-3 py-1.5 text-[11px] text-[#c62828] disabled:opacity-50"
                        >
                          {deletingSet ? "삭제 중..." : "세트 삭제"}
                        </button>
                        <button
                          type="button"
                          disabled={savingSet}
                          onClick={() => void handleSaveSet()}
                          className="rounded-[10px] border border-[#171b24] bg-[#171b24] px-3 py-1.5 text-[11px] text-white disabled:opacity-60"
                        >
                          {savingSet ? "저장 중..." : "세트 저장"}
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <DifficultyChip label="전체 난이도" active={!selectedRating} onClick={() => setSelectedRating("")} />
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <DifficultyChip
                          key={rating}
                          label={<StarIcons rating={rating} sizeClass="text-[11px]" />}
                          active={Number(selectedRating) === rating}
                          onClick={() => setSelectedRating(String(rating))}
                        />
                      ))}
                    </div>

                    <div className="mt-4 space-y-2">
                      {visibleQuestions.map((question, index) => {
                        const sanitizedTags = (question.tags || []).map(sanitizeQuestionTag).filter(Boolean);
                        return (
                          <article
                            key={question.questionId}
                            className="cursor-pointer rounded-[12px] border border-[#edf1f6] bg-[#fafcff] p-3"
                            tabIndex={0}
                            role="button"
                            aria-label={`문답 ${index + 1} 상세 보기`}
                            onClick={() =>
                              setSelectedQuestion({
                                ...question,
                                setId: selectedSet.setId,
                                setTitle: selectedSet.title,
                                createdAt: selectedSet.createdAt,
                                categoryName: question.skillName || question.categoryName,
                              })
                            }
                            onKeyDown={(event) =>
                              handleCardKeyDown(event, () =>
                                setSelectedQuestion({
                                  ...question,
                                  setId: selectedSet.setId,
                                  setTitle: selectedSet.title,
                                  createdAt: selectedSet.createdAt,
                                  categoryName: question.skillName || question.categoryName,
                                })
                              )
                            }
                          >
                            <p className="text-[11px] text-[#7a8190]">문답 {index + 1}</p>
                            <p className="mt-1 line-clamp-3 text-[13px] leading-[1.6] text-[#1f2937]">{question.questionText}</p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              {question.difficulty ? <DifficultyStars difficulty={question.difficulty} compact /> : null}
                              {sanitizedTags.slice(0, 4).map((tag) => (
                                <span key={`${question.questionId}-${tag}`} className="rounded-full bg-[#fff7ed] px-2 py-0.5 text-[10px] text-[#9a5b11]">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          </article>
                        );
                      })}
                      {visibleQuestions.length === 0 ? <p className="text-[12px] text-[#6b7280]">선택한 조건에 맞는 문답이 없습니다.</p> : null}
                    </div>
                  </>
                ) : (
                  <p className="text-[13px] text-[#5e6472]">표시할 세트가 없습니다. 새 세트를 생성해 주세요.</p>
                )}
              </article>
            </section>

            {pageErrorMessage ? <p className="mt-4 text-[12px] text-[#dc4b4b]">{pageErrorMessage}</p> : null}
          </div>
        </main>
      </div>

      {selectedQuestion ? <QuestionAnswerDetailModal item={selectedQuestion} onClose={() => setSelectedQuestion(null)} /> : null}
      {showCreateModal ? (
        <CreateQuestionSetModal
          categories={categories}
          submitting={submitting}
          creatingCategory={creatingCategory}
          errorMessage={modalErrorMessage}
          onClose={() => {
            setShowCreateModal(false);
            setModalErrorMessage("");
          }}
          onCreateCategory={handleCreateCategoryForSet}
          onSubmit={handleCreateSet}
        />
      ) : null}
      {showLogoutModal ? <LogoutConfirmModal onCancel={() => setShowLogoutModal(false)} onConfirm={handleLogoutConfirm} /> : null}
      {showPointChargeModal ? (
        <PointChargeModal
          onClose={() => setShowPointChargeModal(false)}
          onCharged={(result) => {
            setUserPoint(parsePoint(result?.currentPoint));
            setShowPointChargeModal(false);
            setShowPointChargeSuccessModal(true);
          }}
        />
      ) : null}
      {showPointChargeSuccessModal ? <PointChargeSuccessModal onClose={() => setShowPointChargeSuccessModal(false)} currentPoint={userPoint} /> : null}
      {showGeminiOverloadModal ? <GeminiOverloadModal onClose={() => setShowGeminiOverloadModal(false)} /> : null}
    </div>
  );
};
