import { useEffect, useMemo, useRef, useState } from "react";
import { FaStar } from "react-icons/fa6";
import { useNavigate } from "react-router-dom";
import { ContentTopNav } from "../../components/ContentTopNav";
import { Sidebar } from "../../components/Sidebar";
import { MobileSidebarDrawer } from "../../components/MobileSidebarDrawer";
import { PointChargeModal } from "../../components/PointChargeModal";
import { PointChargeSuccessModal } from "../../components/PointChargeSuccessModal";
import dropDownIcon from "../../assets/icon/drop_down.png";
import sendIcon from "../../assets/icon/send.png";
import tempProfileImage from "../../assets/icon/temp.png";
import { logout } from "../../lib/authApi";
import { consumePointChargeSuccessResult } from "../../lib/pointChargeFlow";
import { getMyProfile, getMyProfileImageUrl } from "../../lib/userApi";

const resumeOptions = ["백엔드_신입_2026.pdf", "백엔드_3년차_2025.pdf"];
const coverLetterOptions = ["네이버_자소서_v2.pdf", "카카오_자소서_v1.pdf"];
const portfolioOptions = ["포트폴리오_웹개발.pdf", "포트폴리오_프로젝트정리.pdf"];
const difficultyOptions = [1, 2, 3, 4, 5];
const techOptions = ["Java", "Kotlin", "Spring", "JPA", "Redis", "Security", "AWS"];

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

const DropdownField = ({ label, valueNode, open, onToggle, children }) => {
  return (
    <div className="w-full min-w-0">
      <p className="mb-1.5 text-[10px] font-normal text-[#b5b5b5]">{label}</p>

      <button
        type="button"
        onClick={onToggle}
        className={`relative z-[2] flex h-[34px] w-full items-center justify-center border border-[#dddddd] bg-[#f7f7f7] px-3 text-[12px] text-[#242424] ${
          open ? "rounded-t-[10px] rounded-b-[4px]" : "rounded-[10px]"
        }`}
      >
        {valueNode}
      </button>

      <div
        className={`overflow-hidden transition-[max-height,opacity] duration-180 ease-out ${
          open ? "max-h-[220px] opacity-100" : "max-h-0 opacity-0 pointer-events-none"
        }`}
      >
        <div className="relative z-[1] -mt-px max-h-[180px] overflow-y-auto rounded-b-[10px] border border-[#dddddd] bg-[#fbfbfb] p-1.5">
          {children}
        </div>
      </div>

      <button
        type="button"
        onClick={onToggle}
        className="mx-auto mt-1 flex h-[28px] w-[28px] items-center justify-center rounded-[9px] border border-[#dddddd] bg-[#fdfdfd]"
        aria-label={`${label} 드롭다운 열기`}
      >
        <img src={dropDownIcon} alt="" className="h-[6px] w-[8px]" />
      </button>
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
  const [selectedResume, setSelectedResume] = useState("");
  const [selectedCoverLetter, setSelectedCoverLetter] = useState("");
  const [selectedPortfolio, setSelectedPortfolio] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState(0);
  const [selectedTechRange, setSelectedTechRange] = useState([]);
  const [openDropdown, setOpenDropdown] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [userName, setUserName] = useState("사용자");
  const [userPoint, setUserPoint] = useState(0);
  const [profileImageUrl, setProfileImageUrl] = useState(tempProfileImage);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showPointChargeModal, setShowPointChargeModal] = useState(false);
  const [showPointChargeSuccessModal, setShowPointChargeSuccessModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const dropdownAreaRef = useRef(null);

  useEffect(() => {
    const charged = consumePointChargeSuccessResult();
    if (!charged) return;
    const nextPoint = parsePoint(charged?.currentPoint);
    setUserPoint(nextPoint);
    setShowPointChargeSuccessModal(true);
  }, []);

  useEffect(() => {
    const loadProfileData = async () => {
      try {
        const profilePayload = await getMyProfile();
        const profile = extractProfile(profilePayload);
        setUserName(profile?.name || "사용자");
        setUserPoint(parsePoint(profile?.point));
        setProfileImageUrl(getMyProfileImageUrl());
      } catch {
        navigate("/login", { replace: true });
      }
    };

    loadProfileData();
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

  useEffect(() => {
    const lockBackNavigation = () => {
      window.history.pushState(null, "", window.location.href);
    };

    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", lockBackNavigation);
    return () => window.removeEventListener("popstate", lockBackNavigation);
  }, []);

  const selectedTechLabel = useMemo(() => {
    if (selectedTechRange.length === 0) return "-";
    return `${selectedTechRange.length}개 선택`;
  }, [selectedTechRange]);

  const isSettingReady = useMemo(() => {
    return (
      Boolean(selectedResume) &&
      Boolean(selectedCoverLetter) &&
      Boolean(selectedPortfolio) &&
      selectedDifficulty > 0 &&
      selectedTechRange.length > 0
    );
  }, [selectedResume, selectedCoverLetter, selectedPortfolio, selectedDifficulty, selectedTechRange]);

  const toggleTech = (tech) => {
    setSelectedTechRange((prev) => {
      if (prev.includes(tech)) return prev.filter((item) => item !== tech);
      return [...prev, tech];
    });
  };

  const renderDifficultyStars = (level) => {
    return (
      <span className="inline-flex items-center gap-0.5 text-[#8a8a8a]">
        {difficultyOptions.map((star) => (
          <FaStar key={star} className={star <= level ? "text-[#ffb92e]" : "text-[#d7d7d7]"} size={12} />
        ))}
      </span>
    );
  };

  const requestLogout = () => {
    setShowLogoutModal(true);
  };

  const handleLogoutConfirm = async () => {
    try {
      await logout();
    } catch {
      // 로그아웃 API 실패 시에도 화면 이동
    } finally {
      setShowLogoutModal(false);
      navigate("/login", { replace: true });
    }
  };

  const handleSidebarNavigate = (item) => {
    setIsMobileMenuOpen(false);
    if (item?.path) {
      navigate(item.path);
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
          requestLogout();
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
            onLogout={requestLogout}
          />
        </div>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-4 pb-6 pt-6 sm:px-5 md:px-8 md:pt-10">
            <div className="mx-auto max-w-[980px]" ref={dropdownAreaRef}>
              <h1 className="text-center text-[32px] font-medium tracking-[0.01em] text-[#1f1f1f] sm:text-[40px] md:text-[52px]">
                모의면접 시작하기
              </h1>
              <p className="mt-2 text-center text-[18px] text-[#8a8a8a] sm:text-[20px] md:text-[24px]">사전설정</p>

              <section className="mt-8 grid grid-cols-6 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="col-span-2 sm:col-span-1">
                  <DropdownField
                    label="이력서"
                    valueNode={<span>{selectedResume || "-"}</span>}
                    open={openDropdown === "resume"}
                    onToggle={() => setOpenDropdown((prev) => (prev === "resume" ? "" : "resume"))}
                  >
                    {resumeOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          setSelectedResume(option);
                          setOpenDropdown("");
                        }}
                        className="mb-1 block w-full rounded-[9px] bg-[#f4f4f4] px-2 py-1.5 text-left text-[11px] text-[#343434] hover:bg-[#ededed]"
                      >
                        {option}
                      </button>
                    ))}
                  </DropdownField>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <DropdownField
                    label="자기소개서"
                    valueNode={<span>{selectedCoverLetter || "-"}</span>}
                    open={openDropdown === "cover-letter"}
                    onToggle={() => setOpenDropdown((prev) => (prev === "cover-letter" ? "" : "cover-letter"))}
                  >
                    {coverLetterOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          setSelectedCoverLetter(option);
                          setOpenDropdown("");
                        }}
                        className="mb-1 block w-full rounded-[9px] bg-[#f4f4f4] px-2 py-1.5 text-left text-[11px] text-[#343434] hover:bg-[#ededed]"
                      >
                        {option}
                      </button>
                    ))}
                  </DropdownField>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <DropdownField
                    label="포트폴리오"
                    valueNode={<span>{selectedPortfolio || "-"}</span>}
                    open={openDropdown === "portfolio"}
                    onToggle={() => setOpenDropdown((prev) => (prev === "portfolio" ? "" : "portfolio"))}
                  >
                    {portfolioOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          setSelectedPortfolio(option);
                          setOpenDropdown("");
                        }}
                        className="mb-1 block w-full rounded-[9px] bg-[#f4f4f4] px-2 py-1.5 text-left text-[11px] text-[#343434] hover:bg-[#ededed]"
                      >
                        {option}
                      </button>
                    ))}
                  </DropdownField>
                </div>

                <div className="col-span-3 sm:col-span-1">
                  <DropdownField
                    label="난이도"
                    valueNode={selectedDifficulty ? renderDifficultyStars(selectedDifficulty) : <span>-</span>}
                    open={openDropdown === "difficulty"}
                    onToggle={() => setOpenDropdown((prev) => (prev === "difficulty" ? "" : "difficulty"))}
                  >
                    {difficultyOptions.map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => {
                          setSelectedDifficulty(level);
                          setOpenDropdown("");
                        }}
                        className="mb-1 flex w-full items-center rounded-[9px] bg-[#f4f4f4] px-2 py-1.5 hover:bg-[#ededed]"
                      >
                        {renderDifficultyStars(level)}
                      </button>
                    ))}
                  </DropdownField>
                </div>

                <div className="col-span-3 sm:col-span-1">
                  <DropdownField
                    label="기술질문 범위"
                    valueNode={<span>{selectedTechLabel}</span>}
                    open={openDropdown === "tech"}
                    onToggle={() => setOpenDropdown((prev) => (prev === "tech" ? "" : "tech"))}
                  >
                    {techOptions.map((tech) => {
                      const selected = selectedTechRange.includes(tech);
                      return (
                        <button
                          key={tech}
                          type="button"
                          onClick={() => toggleTech(tech)}
                          className={`mb-1 flex w-full items-center justify-between rounded-[9px] px-2 py-1.5 text-left text-[11px] ${
                            selected ? "bg-[#eeeeee] text-black" : "bg-[#f4f4f4] text-[#343434] hover:bg-[#ededed]"
                          }`}
                        >
                          <span>{tech}</span>
                          <span className="text-[10px]">{selected ? "선택" : ""}</span>
                        </button>
                      );
                    })}
                  </DropdownField>
                </div>
              </section>

              <div className="mt-8 text-center">
                {isSettingReady ? (
                  <div className="mx-auto inline-block rounded-[24px] bg-[linear-gradient(136deg,#6a84ff_0%,#ff53b3_100%)] p-[1px]">
                    <button
                      type="button"
                      className="h-[42px] w-[124px] rounded-[21px] bg-white text-[18px] text-[#2f2f2f] sm:h-[46px] sm:w-[138px] sm:text-[22px]"
                    >
                      시작
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="h-[42px] w-[124px] rounded-[21px] border border-[#d6d6d6] text-[18px] text-[#a0a0a0] sm:h-[48px] sm:w-[140px] sm:text-[22px]"
                  >
                    시작
                  </button>
                )}
              </div>
            </div>
          </div>

          <footer className="border-t border-[#efefef] bg-white px-4 py-3 md:px-8">
            <div className="relative mx-auto max-w-[980px]">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="무엇을 도와드릴까요?"
                className="h-[38px] w-full rounded-[20px] bg-[#f8f8f8] px-4 text-[11px] text-[#444] placeholder:text-[#aeaeae] sm:h-[40px] sm:text-[12px]"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full"
                aria-label="전송"
              >
                <img src={sendIcon} alt="" className="h-[14px] w-[14px]" />
              </button>
            </div>
          </footer>
        </main>
      </div>

      {showLogoutModal && (
        <LogoutConfirmModal onCancel={() => setShowLogoutModal(false)} onConfirm={handleLogoutConfirm} />
      )}
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
