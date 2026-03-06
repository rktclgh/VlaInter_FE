import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ContentTopNav } from "../../components/ContentTopNav";
import { MobileSidebarDrawer } from "../../components/MobileSidebarDrawer";
import { Sidebar } from "../../components/Sidebar";
import { PointChargeModal } from "../../components/PointChargeModal";
import { PointChargeSuccessModal } from "../../components/PointChargeSuccessModal";
import dropDownIcon from "../../assets/icon/drop_down.png";
import tempProfileImage from "../../assets/icon/temp.png";
import { logout } from "../../lib/authApi";
import { getInterviewCategories, getReadyMockDocuments, startMockInterview } from "../../lib/interviewApi";
import { saveTechInterviewSession } from "../../lib/interviewSessionFlow";
import { consumePointChargeSuccessResult } from "../../lib/pointChargeFlow";
import { getMyProfile, getMyProfileImageUrl } from "../../lib/userApi";

const DIFFICULTY_OPTIONS = [
  { value: "EASY", label: "하" },
  { value: "MEDIUM", label: "중" },
  { value: "HARD", label: "상" },
];

const QUESTION_COUNT_OPTIONS = [3, 5, 7, 10];
const DOCUMENT_TYPES = [
  { key: "RESUME", label: "이력서" },
  { key: "INTRODUCE", label: "자소서" },
  { key: "PORTFOLIO", label: "포트폴리오" },
];

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

const extractFileList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.files)) return payload.files;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

const resolveDisplayFileName = (file) => {
  return (
    file?.originalFileName ||
    file?.original_filename ||
    file?.fileName ||
    file?.file_name ||
    file?.name ||
    "미선택"
  );
};

const toTimestamp = (rawDateTime) => {
  const time = new Date(rawDateTime || "").getTime();
  return Number.isNaN(time) ? 0 : time;
};

const formatCategoryLabel = (category) => {
  const depth = Number(category?.depth || 0);
  const prefix = depth > 0 ? `${"  ".repeat(depth)}- ` : "";
  return `${prefix}${category?.name || "-"}`;
};

const DropdownField = ({ label, valueNode, open, onToggle, children }) => {
  return (
    <div className="w-full min-w-0">
      <p className="mb-1.5 text-[10px] font-normal text-[#b5b5b5]">{label}</p>

      <button
        type="button"
        onClick={onToggle}
        className={`relative z-[2] flex h-[40px] w-full items-center justify-between border border-[#dddddd] bg-[#f7f7f7] px-3 text-left text-[12px] text-[#242424] ${
          open ? "rounded-t-[10px] rounded-b-[4px]" : "rounded-[10px]"
        }`}
      >
        <span className="truncate">{valueNode}</span>
        <img src={dropDownIcon} alt="" className="h-[6px] w-[8px] shrink-0" />
      </button>

      <div
        className={`overflow-hidden transition-[max-height,opacity] duration-180 ease-out ${
          open ? "max-h-[240px] opacity-100" : "pointer-events-none max-h-0 opacity-0"
        }`}
      >
        <div className="relative z-[1] -mt-px max-h-[200px] overflow-y-auto rounded-b-[10px] border border-[#dddddd] bg-[#fbfbfb] p-1.5">
          {children}
        </div>
      </div>
    </div>
  );
};

const LogoutConfirmModal = ({ onCancel, onConfirm }) => {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/35 px-4">
      <div className="w-full max-w-[420px] rounded-[16px] border border-[#d9d9d9] bg-white p-5">
        <p className="text-[15px] font-medium text-[#252525]">
          정말 로그아웃 하시겠습니까?
          <br />
          종료하지 않은 면접 내용은 저장되지 않습니다
        </p>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-[10px] border border-[#d6d6d6] px-3 py-1.5 text-[12px] text-[#666]"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-[10px] border border-[#1f1f1f] bg-[#1f1f1f] px-3 py-1.5 text-[12px] text-white"
          >
            로그아웃
          </button>
        </div>
      </div>
    </div>
  );
};

export const InterviewStartPage = () => {
  const navigate = useNavigate();
  const dropdownAreaRef = useRef(null);

  const [userName, setUserName] = useState("사용자");
  const [userPoint, setUserPoint] = useState(0);
  const [profileImageUrl, setProfileImageUrl] = useState(tempProfileImage);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showPointChargeModal, setShowPointChargeModal] = useState(false);
  const [showPointChargeSuccessModal, setShowPointChargeSuccessModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const [categories, setCategories] = useState([]);
  const [filesByType, setFilesByType] = useState({ RESUME: [], INTRODUCE: [], PORTFOLIO: [] });
  const [selectedFiles, setSelectedFiles] = useState({ RESUME: "", INTRODUCE: "", PORTFOLIO: "" });
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState("MEDIUM");
  const [selectedQuestionCount, setSelectedQuestionCount] = useState(5);
  const [loadingPage, setLoadingPage] = useState(true);
  const [startingInterview, setStartingInterview] = useState(false);
  const [pageErrorMessage, setPageErrorMessage] = useState("");
  const [openDropdown, setOpenDropdown] = useState("");

  useEffect(() => {
    const charged = consumePointChargeSuccessResult();
    if (!charged) return;
    const nextPoint = parsePoint(charged?.currentPoint);
    setUserPoint(nextPoint);
    setShowPointChargeSuccessModal(true);
  }, []);

  useEffect(() => {
    const loadPageData = async () => {
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
        const [categoriesPayload, filesPayload] = await Promise.all([getInterviewCategories(), getReadyMockDocuments()]);
        const nextCategories = categoriesPayload || [];
        const rawFiles = extractFileList(filesPayload);
        const nextFilesByType = { RESUME: [], INTRODUCE: [], PORTFOLIO: [] };

        rawFiles.forEach((file) => {
          const type = file?.fileType || file?.file_type;
          if (!nextFilesByType[type]) return;
          nextFilesByType[type].push(file);
        });

        Object.keys(nextFilesByType).forEach((type) => {
          nextFilesByType[type].sort(
            (a, b) => toTimestamp(b?.createdAt || b?.created_at) - toTimestamp(a?.createdAt || a?.created_at)
          );
        });

        setCategories(nextCategories);
        setFilesByType(nextFilesByType);
        setSelectedFiles({
          RESUME: String(nextFilesByType.RESUME[0]?.fileId || nextFilesByType.RESUME[0]?.file_id || ""),
          INTRODUCE: String(nextFilesByType.INTRODUCE[0]?.fileId || nextFilesByType.INTRODUCE[0]?.file_id || ""),
          PORTFOLIO: String(nextFilesByType.PORTFOLIO[0]?.fileId || nextFilesByType.PORTFOLIO[0]?.file_id || ""),
        });

        const firstLeafCategory = nextCategories.find((category) => category?.isLeaf);
        if (firstLeafCategory?.categoryId) {
          setSelectedCategoryId(String(firstLeafCategory.categoryId));
        }
      } catch (error) {
        setPageErrorMessage(error?.message || "면접 설정 데이터를 불러오지 못했습니다.");
      } finally {
        setLoadingPage(false);
      }
    };

    loadPageData();
  }, [navigate]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!dropdownAreaRef.current) return;
      if (!dropdownAreaRef.current.contains(event.target)) {
        setOpenDropdown("");
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, []);

  const selectedCategory = useMemo(
    () => categories.find((item) => String(item?.categoryId) === String(selectedCategoryId)) || null,
    [categories, selectedCategoryId]
  );
  const selectedDifficultyOption = useMemo(
    () => DIFFICULTY_OPTIONS.find((item) => item.value === selectedDifficulty) || DIFFICULTY_OPTIONS[1],
    [selectedDifficulty]
  );

  const selectedFileObjects = useMemo(() => {
    return DOCUMENT_TYPES.reduce((acc, item) => {
      acc[item.key] =
        filesByType[item.key].find(
          (file) => String(file?.fileId || file?.file_id || "") === String(selectedFiles[item.key] || "")
        ) || null;
      return acc;
    }, {});
  }, [filesByType, selectedFiles]);

  const handleSidebarNavigate = (item) => {
    setIsMobileMenuOpen(false);
    if (item?.path) {
      navigate(item.path);
    }
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

  const handleStartInterview = async () => {
    const selectedDocumentIds = DOCUMENT_TYPES
      .map((item) => selectedFiles[item.key])
      .filter((value, index, array) => value && array.indexOf(value) === index)
      .map((value) => Number(value));

    if (selectedDocumentIds.length === 0) {
      setPageErrorMessage("AI 분석이 완료된 문서를 1개 이상 선택해 주세요.");
      return;
    }

    setStartingInterview(true);
    setPageErrorMessage("");
    try {
      const response = await startMockInterview({
        documentFileIds: selectedDocumentIds,
        categoryId: selectedCategoryId ? Number(selectedCategoryId) : null,
        difficulty: selectedDifficulty,
        questionCount: selectedQuestionCount,
      });

      saveTechInterviewSession({
        sessionId: response?.sessionId,
        currentQuestion: response?.currentQuestion || null,
        pendingNextQuestion: null,
        completed: false,
        conversation: response?.currentQuestion
          ? [
              {
                id: `question-${response.currentQuestion.turnId}`,
                role: "assistant",
                kind: "question",
                turnId: response.currentQuestion.turnId,
                turnNo: response.currentQuestion.turnNo,
                questionText: response.currentQuestion.questionText,
              },
            ]
          : [],
        metadata: {
          apiBasePath: "/api/interview/mock",
          selectedDocuments: {
            resume: selectedFileObjects.RESUME
              ? resolveDisplayFileName(selectedFileObjects.RESUME)
              : null,
            introduce: selectedFileObjects.INTRODUCE
              ? resolveDisplayFileName(selectedFileObjects.INTRODUCE)
              : null,
            portfolio: selectedFileObjects.PORTFOLIO
              ? resolveDisplayFileName(selectedFileObjects.PORTFOLIO)
              : null,
          },
          difficulty: selectedDifficulty,
          difficultyLabel: selectedDifficultyOption.label,
          categoryId: selectedCategoryId ? Number(selectedCategoryId) : null,
          categoryName: selectedCategory?.name || null,
        },
      });

      navigate("/content/interview/session");
    } catch (error) {
      setPageErrorMessage(error?.message || "면접 시작에 실패했습니다.");
    } finally {
      setStartingInterview(false);
    }
  };

  return (
    <div className="min-h-screen bg-white pt-[54px]">
      <ContentTopNav
        point={formatPoint(userPoint)}
        onClickCharge={() => setShowPointChargeModal(true)}
        onOpenMenu={() => setIsMobileMenuOpen(true)}
      />

      <MobileSidebarDrawer
        open={isMobileMenuOpen}
        activeKey="interview_start"
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
            activeKey="interview_start"
            onNavigate={handleSidebarNavigate}
            userName={userName}
            profileImageUrl={profileImageUrl}
            fallbackProfileImageUrl={tempProfileImage}
            onLogout={() => setShowLogoutModal(true)}
          />
        </div>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-4 pb-6 pt-6 sm:px-5 md:px-8 md:pt-10">
            <div className="mx-auto w-full max-w-[980px]" ref={dropdownAreaRef}>
              <section className="rounded-[24px] border border-[#e4e7ee] bg-[linear-gradient(180deg,#ffffff_0%,#f7f9fc_100%)] p-5 sm:p-6">
                <p className="text-[12px] font-semibold tracking-[0.08em] text-[#7a8190]">INTERVIEW SETUP</p>
                <h1 className="mt-2 text-[30px] font-semibold tracking-[-0.02em] text-[#161a22] sm:text-[42px]">
                  서류와 카테고리를 고르고
                  <br />
                  바로 면접을 시작한다
                </h1>
                <p className="mt-3 max-w-[680px] text-[14px] leading-[1.7] text-[#5e6472] sm:text-[15px]">
                  AI 분석이 끝난 문서만 선택할 수 있으며, 선택한 문서와 기술 카테고리를 조합해 모의면접 세션을 생성한다.
                </p>
              </section>

              <section className="mt-5 rounded-[24px] border border-[#e4e7ee] bg-white p-5 sm:p-6">
                <h2 className="text-[22px] font-semibold text-[#171b24]">사전 설정</h2>
                <p className="mt-1 text-[13px] text-[#6b7280]">
                  선택한 서류와 난이도, 기술질문 카테고리가 인터뷰 화면 상단에 그대로 표시된다.
                </p>

                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {DOCUMENT_TYPES.map((documentType) => {
                    const files = filesByType[documentType.key] || [];
                    const selectedFile = selectedFileObjects[documentType.key];
                    return (
                      <DropdownField
                        key={documentType.key}
                        label={documentType.label}
                        valueNode={selectedFile ? resolveDisplayFileName(selectedFile) : `${documentType.label} 미선택`}
                        open={openDropdown === documentType.key}
                        onToggle={() =>
                          setOpenDropdown((prev) => (prev === documentType.key ? "" : documentType.key))
                        }
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFiles((prev) => ({ ...prev, [documentType.key]: "" }));
                            setOpenDropdown("");
                          }}
                          className="mb-1 block w-full rounded-[9px] bg-[#f4f4f4] px-2 py-1.5 text-left text-[11px] text-[#343434] hover:bg-[#ededed]"
                        >
                          미선택
                        </button>
                        {files.map((file) => {
                          const fileId = String(file?.fileId || file?.file_id || "");
                          return (
                            <button
                              key={`${documentType.key}-${fileId}`}
                              type="button"
                              onClick={() => {
                                setSelectedFiles((prev) => ({ ...prev, [documentType.key]: fileId }));
                                setOpenDropdown("");
                              }}
                              className="mb-1 block w-full rounded-[9px] bg-[#f4f4f4] px-2 py-1.5 text-left text-[11px] text-[#343434] hover:bg-[#ededed]"
                            >
                              {resolveDisplayFileName(file)}
                            </button>
                          );
                        })}
                        {!loadingPage && files.length === 0 ? (
                          <p className="px-2 py-1.5 text-[11px] text-[#8a8a8a]">AI 분석 완료된 파일이 없습니다.</p>
                        ) : null}
                      </DropdownField>
                    );
                  })}

                  <DropdownField
                    label="난이도"
                    valueNode={selectedDifficultyOption.label}
                    open={openDropdown === "difficulty"}
                    onToggle={() => setOpenDropdown((prev) => (prev === "difficulty" ? "" : "difficulty"))}
                  >
                    {DIFFICULTY_OPTIONS.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => {
                          setSelectedDifficulty(item.value);
                          setOpenDropdown("");
                        }}
                        className="mb-1 block w-full rounded-[9px] bg-[#f4f4f4] px-2 py-1.5 text-left text-[11px] text-[#343434] hover:bg-[#ededed]"
                      >
                        {item.label}
                      </button>
                    ))}
                  </DropdownField>

                  <DropdownField
                    label="기술질문 카테고리"
                    valueNode={selectedCategory?.name || "기술질문 생략"}
                    open={openDropdown === "category"}
                    onToggle={() => setOpenDropdown((prev) => (prev === "category" ? "" : "category"))}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategoryId("");
                        setOpenDropdown("");
                      }}
                      className="mb-1 block w-full rounded-[9px] bg-[#f4f4f4] px-2 py-1.5 text-left text-[11px] text-[#343434] hover:bg-[#ededed]"
                    >
                      기술질문 생략
                    </button>
                    {categories.map((item) => (
                      <button
                        key={item?.categoryId}
                        type="button"
                        onClick={() => {
                          setSelectedCategoryId(String(item?.categoryId || ""));
                          setOpenDropdown("");
                        }}
                        className="mb-1 block w-full rounded-[9px] bg-[#f4f4f4] px-2 py-1.5 text-left text-[11px] text-[#343434] hover:bg-[#ededed]"
                      >
                        {formatCategoryLabel(item)}
                      </button>
                    ))}
                  </DropdownField>

                  <DropdownField
                    label="문항 수"
                    valueNode={`${selectedQuestionCount}문항`}
                    open={openDropdown === "count"}
                    onToggle={() => setOpenDropdown((prev) => (prev === "count" ? "" : "count"))}
                  >
                    {QUESTION_COUNT_OPTIONS.map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => {
                          setSelectedQuestionCount(count);
                          setOpenDropdown("");
                        }}
                        className="mb-1 block w-full rounded-[9px] bg-[#f4f4f4] px-2 py-1.5 text-left text-[11px] text-[#343434] hover:bg-[#ededed]"
                      >
                        {count}문항
                      </button>
                    ))}
                  </DropdownField>
                </div>

                <div className="mt-6 rounded-[18px] border border-[#e1e5ed] bg-[#f7f9fc] p-4">
                  <p className="text-[12px] font-semibold text-[#7a8190]">선택 요약</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full border border-[#d8dde7] bg-white px-3 py-1 text-[12px] text-[#4f5664]">
                      {selectedFileObjects.RESUME ? resolveDisplayFileName(selectedFileObjects.RESUME) : "이력서 미선택"}
                    </span>
                    <span className="rounded-full border border-[#d8dde7] bg-white px-3 py-1 text-[12px] text-[#4f5664]">
                      {selectedFileObjects.INTRODUCE ? resolveDisplayFileName(selectedFileObjects.INTRODUCE) : "자소서 미선택"}
                    </span>
                    <span className="rounded-full border border-[#d8dde7] bg-white px-3 py-1 text-[12px] text-[#4f5664]">
                      {selectedDifficultyOption.label}
                    </span>
                    <span className="rounded-full border border-[#d8dde7] bg-white px-3 py-1 text-[12px] text-[#4f5664]">
                      {selectedCategory?.name || "기술질문 생략"}
                    </span>
                  </div>
                </div>

                {pageErrorMessage ? <p className="mt-4 text-[12px] text-[#dc4b4b]">{pageErrorMessage}</p> : null}

                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={handleStartInterview}
                    disabled={loadingPage || startingInterview}
                    className="rounded-[14px] bg-[#171b24] px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
                  >
                    {startingInterview ? "면접 생성 중..." : "면접 시작"}
                  </button>
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>

      {showLogoutModal ? (
        <LogoutConfirmModal onCancel={() => setShowLogoutModal(false)} onConfirm={handleLogoutConfirm} />
      ) : null}
      {showPointChargeModal ? (
        <PointChargeModal
          onClose={() => setShowPointChargeModal(false)}
          onCharged={(result) => {
            const nextPoint = parsePoint(result?.currentPoint);
            setUserPoint(nextPoint);
            setShowPointChargeSuccessModal(true);
          }}
        />
      ) : null}
      {showPointChargeSuccessModal ? (
        <PointChargeSuccessModal onClose={() => setShowPointChargeSuccessModal(false)} />
      ) : null}
    </div>
  );
};
