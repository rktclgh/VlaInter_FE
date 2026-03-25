import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { getMyProfile } from "../lib/userApi";
import { hasAuthenticatedBrowserSession } from "../lib/authSessionMarker";
import { getLandingPatchNotes, getLandingSiteSettings } from "../lib/landingApi";
import { ParticleWaveBackground } from "../components/ParticleWaveBackground";
import campusLogo from "../assets/logo/logo_campus.png";
import campusWordmark from "../assets/logo/vlainter_campus.png";
import { usePublicLocale } from "../lib/publicLocale";

const CONTENT_BY_LANGUAGE = {
  ko: {
    serviceButton: "SERVICE",
    brandLink: "VLAINTER",
    join: "JOIN",
    login: "LOG IN",
    languageLabel: "KOR",
    close: "닫기",
    sections: [
      { id: "service-introduce", label: "SERVICE INTRODUCE" },
      { id: "patch-note", label: "PATCH NOTE" },
    ],
    heroSubtitle: "대학생을 위한 강의자료 기반 AI 멘토 서비스",
    heroPills: [
      { label: "강의자료 AI 요약", to: "/content/student" },
      { label: "실전 모의고사", to: "/content/student" },
      { label: "오답노트", to: "/content/student" },
    ],
    heroDescription: "언제나 당신과 함께할 수 있는, 따듯한 멘토가 되어드립니다.",
    joinUs: "JOIN US",
    serviceEyebrow: "SERVICE INTRODUCE",
    serviceTitle: "강의자료, 오답, 복습 흐름을 AI 멘토 경험으로 연결합니다.",
    serviceBody: "학습 기록과 질문 연습, 자료 기반 피드백을 한 흐름으로 연결해 캠퍼스 학습 루틴을 더 자연스럽게 만듭니다.",
    aboutService: "ABOUT SERVICE",
    productCards: [
      {
        title: "강의자료 AI 분석요약",
        description: "업로드한 강의자료를 빠르게 구조화하고 핵심 개념과 시험 포인트를 AI가 요약합니다.",
        to: "/content/student",
      },
      {
        title: "강의자료 기반 모의고사",
        description: "강의자료 기반 문제를 자동으로 구성해 실전처럼 풀고 이해도를 바로 점검할 수 있습니다.",
        to: "/content/student",
      },
      {
        title: "오답노트",
        description: "틀린 문제와 취약 개념을 다시 묶어 복습 루틴으로 이어지는 오답노트를 제공합니다.",
        to: "/content/student",
      },
    ],
    moveNow: "바로 가기",
    patchEyebrow: "PATCH NOTE",
    patchTitle: "캠퍼스 경험에 맞춘 최근 개선 사항",
    patchBody: "학습 흐름과 보안 체계, 랜딩 접근성을 캠퍼스 테마에 맞게 다시 다듬고 있습니다.",
    patchHelp: "스크롤 또는 화살표 이동",
    footerLinks: [
      { label: "서비스 소개", to: "/about" },
      { label: "이용약관", to: "/terms" },
      { label: "개인정보처리방침", to: "/privacy" },
    ],
  },
  en: {
    serviceButton: "SERVICE",
    brandLink: "VLAINTER",
    join: "JOIN",
    login: "LOG IN",
    languageLabel: "ENG",
    close: "Close",
    sections: [
      { id: "service-introduce", label: "SERVICE INTRODUCE" },
      { id: "patch-note", label: "PATCH NOTE" },
    ],
    heroSubtitle: "An AI mentor built on course materials for students",
    heroPills: [
      { label: "AI Material Summary", to: "/content/student" },
      { label: "Mock Exam", to: "/content/student" },
      { label: "Wrong Answer Notes", to: "/content/student" },
    ],
    heroDescription: "A warm mentor that can stay with you throughout the journey.",
    joinUs: "JOIN US",
    serviceEyebrow: "SERVICE INTRODUCE",
    serviceTitle: "Connect lecture material, review, and AI mentoring in one study flow.",
    serviceBody: "Course content, practice questions, and feedback are organized into a single campus-focused study routine.",
    aboutService: "ABOUT SERVICE",
    productCards: [
      {
        title: "AI Material Summary",
        description: "Uploaded lecture material is distilled into core concepts and likely exam points for faster review.",
        to: "/content/student",
      },
      {
        title: "Material-Based Mock Exam",
        description: "Generate practice exams from your course material and check understanding in a realistic flow.",
        to: "/content/student",
      },
      {
        title: "Wrong Answer Notes",
        description: "Collect missed questions and weak concepts into a review loop designed for repetition.",
        to: "/content/student",
      },
    ],
    moveNow: "OPEN",
    patchEyebrow: "PATCH NOTE",
    patchTitle: "Recent campus-focused improvements",
    patchBody: "Study flow, security handling, and landing accessibility are being refined for the campus theme.",
    patchHelp: "SCROLL OR USE ARROWS",
    footerLinks: [
      { label: "About Service", to: "/about" },
      { label: "Terms of Service", to: "/terms" },
      { label: "Privacy Policy", to: "/privacy" },
    ],
  },
};

const fallbackPatchNotesByLocale = {
  ko: [
    { title: "Campus Theme", body: "캠퍼스 전용 랜딩을 초록-옐로우 테마로 분리해 서비스 진입 동선을 명확히 했습니다." },
    { title: "Study Flow", body: "강의자료 기반 학습, 질문 연습, 면접 시뮬레이션을 같은 흐름 안에서 탐색할 수 있게 정리했습니다." },
    { title: "Access Update", body: "공개 랜딩에서 바로 회원가입과 서비스 소개 섹션으로 이동하는 구조를 유지했습니다." },
  ],
  en: [
    { title: "Campus Theme", body: "A campus-specific landing flow now uses the green-yellow theme for clearer entry." },
    { title: "Study Flow", body: "Course-based study, question practice, and interview simulation are shown as one connected path." },
    { title: "Access Update", body: "The public landing keeps direct access to join and the main service sections." },
  ],
};

const sectionTitleClass =
  "text-[clamp(1.55rem,3.2vw,2.55rem)] font-medium tracking-[-0.04em] text-white";
const sectionBodyClass =
  "max-w-[42rem] text-[0.95rem] leading-7 text-white/62 md:text-[1rem]";
const MotionButton = motion.button;
const MotionAside = motion.aside;
const MotionDiv = motion.div;
const MotionArticle = motion.article;
const campusGradient = "linear-gradient(90deg, #7ED957 0%, #FFD95A 100%)";

const CampusOutlineLink = ({
  to,
  children,
  className = "",
  textClassName = "",
  viewBox = "0 0 140 36",
  points = "14,1 139,1 126,35 1,35",
}) => {
  const gradientId = useId().replace(/:/g, "-");

  return (
    <Link
      to={to}
      className={`group relative inline-flex items-center justify-center overflow-hidden ${className}`}
    >
      <svg
        aria-hidden="true"
        viewBox={viewBox}
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#7ED957" />
            <stop offset="100%" stopColor="#FFD95A" />
          </linearGradient>
        </defs>
        <polygon
          points={points}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span className={`relative z-[1] ${textClassName}`}>{children}</span>
    </Link>
  );
};

export const StudentLandingPage = () => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const { locale: language, setLocale: setLanguage } = usePublicLocale();
  const fallbackPatchNotes = fallbackPatchNotesByLocale[language] || fallbackPatchNotesByLocale.ko;
  const [patchNotes, setPatchNotes] = useState([]);
  const [landingVersionLabel, setLandingVersionLabel] = useState("v0.5");
  const [activePatchNoteIndex, setActivePatchNoteIndex] = useState(0);
  const patchNoteWheelThrottleRef = useRef(0);
  const copy = CONTENT_BY_LANGUAGE[language] || CONTENT_BY_LANGUAGE.ko;
  const prefersReducedMotion = useReducedMotion();

  const resolveMotionProps = useCallback((animated, reduced) => (
    prefersReducedMotion ? reduced : animated
  ), [prefersReducedMotion]);

  useEffect(() => {
    let unmounted = false;

    const redirectIfAuthenticated = async () => {
      if (!hasAuthenticatedBrowserSession()) return;
      try {
        await getMyProfile();
        if (!unmounted) {
          navigate("/content", { replace: true });
        }
      } catch {
        // keep public landing visible
      }
    };

    redirectIfAuthenticated();
    return () => {
      unmounted = true;
    };
  }, [navigate]);

  useEffect(() => {
    let cancelled = false;

    const loadLandingData = async () => {
      try {
        const [patchNoteResult, settingsResult] = await Promise.allSettled([
          getLandingPatchNotes(),
          getLandingSiteSettings(),
        ]);
        if (cancelled) return;
        const patchNotePayload = patchNoteResult.status === "fulfilled" ? patchNoteResult.value : null;
        const settingsPayload = settingsResult.status === "fulfilled" ? settingsResult.value : null;
        const nextPatchNotes = Array.isArray(patchNotePayload)
          ? patchNotePayload
              .map((item) => ({
                patchNoteId: item?.patchNoteId ?? null,
                title: String(item?.title || "").trim(),
                body: String(item?.body || "").trim(),
              }))
              .filter((item) => item.title && item.body)
          : [];
        if (nextPatchNotes.length > 0) {
          setPatchNotes(nextPatchNotes);
          setActivePatchNoteIndex(0);
        }
        const nextVersionLabel = String(settingsPayload?.landingVersionLabel || "").trim();
        if (nextVersionLabel) setLandingVersionLabel(nextVersionLabel);
      } catch {
        // fallback copy is enough for public landing
      }
    };

    void loadLandingData();
    return () => {
      cancelled = true;
    };
  }, []);

  const scrollToSection = useCallback((sectionId) => {
    const element = document.getElementById(sectionId);
    if (!element) return;
    element.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
    setIsSidebarOpen(false);
  }, [prefersReducedMotion]);

  const displayedPatchNotes = useMemo(
    () => (patchNotes.some((item) => item?.patchNoteId != null) ? patchNotes : fallbackPatchNotes),
    [fallbackPatchNotes, patchNotes]
  );
  const currentPatchNoteIndex = Math.min(activePatchNoteIndex, Math.max(displayedPatchNotes.length - 1, 0));
  const visiblePatchNotes = useMemo(
    () => displayedPatchNotes.slice(currentPatchNoteIndex, currentPatchNoteIndex + 3),
    [currentPatchNoteIndex, displayedPatchNotes]
  );

  const showPreviousPatchNote = useCallback(() => {
    setActivePatchNoteIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const showNextPatchNote = useCallback(() => {
    setActivePatchNoteIndex((prev) => Math.min(prev + 1, Math.max(displayedPatchNotes.length - 1, 0)));
  }, [displayedPatchNotes.length]);

  const handlePatchNotesWheel = useCallback((event) => {
    if (Math.abs(event.deltaY) < 18) return;
    const now = Date.now();
    if (now - patchNoteWheelThrottleRef.current < 280) return;
    patchNoteWheelThrottleRef.current = now;
    if (event.deltaY > 0) {
      showNextPatchNote();
    } else {
      showPreviousPatchNote();
    }
  }, [showNextPatchNote, showPreviousPatchNote]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#111111] text-white">
      <AnimatePresence>
        {isSidebarOpen ? (
          <>
            <MotionButton
              type="button"
              aria-label="사이드바 닫기"
              className="fixed inset-0 z-40 bg-black/54 backdrop-blur-[2px]"
              initial={resolveMotionProps({ opacity: 0 }, { opacity: 1 })}
              animate={{ opacity: 1 }}
              exit={resolveMotionProps({ opacity: 0 }, { opacity: 1 })}
              onClick={() => setIsSidebarOpen(false)}
            />
            <MotionAside
              className="fixed left-0 top-0 z-50 flex h-screen w-[min(11.25rem,88vw)] flex-col border-r border-white/10 bg-[#181818]/96 px-4 py-4 shadow-[1.5rem_0_3.5rem_rgba(0,0,0,0.35)] backdrop-blur-xl"
              initial={resolveMotionProps({ x: "-100%", opacity: 0.6 }, { opacity: 1 })}
              animate={resolveMotionProps({ x: 0, opacity: 1 }, { opacity: 1 })}
              exit={resolveMotionProps({ x: "-100%", opacity: 0.6 }, { opacity: 1 })}
              transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex items-center justify-end border-b border-white/8 pb-3">
                <button
                  type="button"
                  className="text-[0.76rem] tracking-[0.02em] text-white/72 transition hover:text-white"
                  onClick={() => setIsSidebarOpen(false)}
                >
                  {copy.close} <span className="ml-1 text-[0.95rem]">×</span>
                </button>
              </div>

              <div className="mt-5">
                <p className="px-1 text-[0.72rem] tracking-[0.12em] text-white/42">SERVICE INTRO</p>
                <div className="mt-3 flex flex-col gap-1">
                  <Link
                    to="/"
                    className="rounded-[0.8rem] px-3 py-2.5 text-left text-[0.9rem] text-white/78 transition hover:bg-white/8 hover:text-white"
                    onClick={() => setIsSidebarOpen(false)}
                  >
                    Vlainter
                  </Link>
                  <Link
                    to="/campus"
                    className="rounded-[0.8rem] bg-white/10 px-3 py-2.5 text-left text-[0.9rem] text-white transition"
                    onClick={() => setIsSidebarOpen(false)}
                  >
                    Vlainter Campus
                  </Link>
                </div>
              </div>

              <nav className="mt-6 flex flex-col gap-2 border-t border-white/8 pt-5">
                {copy.sections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    className="rounded-[0.7rem] px-3 py-3 text-left text-[0.83rem] tracking-[0.01em] text-white/82 transition hover:bg-white/8 hover:text-white"
                    onClick={() => scrollToSection(section.id)}
                  >
                    {section.label}
                  </button>
                ))}
              </nav>

              <div className="mt-6 rounded-[0.9rem] border border-white/8 bg-white/[0.03] p-2">
                <p className="px-2 text-[0.68rem] tracking-[0.12em] text-white/36">{copy.languageLabel}</p>
                <div className="mt-2 flex flex-col gap-1">
                  <button
                    type="button"
                    className={`rounded-[0.75rem] px-3 py-2 text-left text-[0.72rem] tracking-[0.08em] transition ${language === "ko" ? "bg-white/10 text-white" : "text-white/72 hover:bg-white/6 hover:text-white"}`}
                    onClick={() => setLanguage("ko")}
                  >
                    KOR
                  </button>
                  <button
                    type="button"
                    className={`rounded-[0.75rem] px-3 py-2 text-left text-[0.72rem] tracking-[0.08em] transition ${language === "en" ? "bg-white/10 text-white" : "text-white/72 hover:bg-white/6 hover:text-white"}`}
                    onClick={() => setLanguage("en")}
                  >
                    ENG
                  </button>
                </div>
              </div>

              <p className="mt-auto text-[0.7rem] tracking-[0.14em] text-white/28">{landingVersionLabel}</p>
            </MotionAside>
          </>
        ) : null}
      </AnimatePresence>

      <section className="relative isolate overflow-hidden bg-[#050816]">
        <ParticleWaveBackground
          reducedMotion={Boolean(prefersReducedMotion)}
          primaryColor="#7ED957"
          secondaryColor="#FFD95A"
        />

        <div className="relative z-10 mx-auto flex min-h-[min(100vh,58rem)] w-full max-w-[112rem] flex-col px-4 pb-8 pt-4 sm:px-6 lg:px-8">
          <header className="mx-auto flex w-full max-w-[95rem] items-center justify-between gap-4 px-1 py-2 md:px-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 text-[0.68rem] tracking-[0.12em] text-white/78 transition hover:text-white"
              onClick={() => setIsSidebarOpen(true)}
            >
              <span className="text-[0.95rem]">☰</span>
              <span>{copy.serviceButton}</span>
            </button>

            <Link to="/campus" className="absolute left-1/2 top-2 -translate-x-1/2">
              <img src={campusLogo} alt="Vlainter Campus" className="h-9 w-auto md:h-10" />
            </Link>

            <div className="ml-auto flex items-center gap-4 text-[0.68rem] tracking-[0.12em] text-white/82 md:gap-8">
              <Link
                to="/"
                className="hidden bg-[linear-gradient(90deg,#5D83DE_0%,#8C63F3_46%,#FF1C91_100%)] bg-clip-text text-transparent transition hover:brightness-110 md:inline-block"
              >
                {copy.brandLink}
              </Link>
              <Link to="/join" className="transition hover:text-white">
                {copy.join}
              </Link>
              <Link to="/login" className="transition hover:text-white">
                {copy.login}
              </Link>
              <div className="relative hidden md:block">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-white/82 transition hover:text-white"
                  onClick={() => setIsLanguageMenuOpen((prev) => !prev)}
                >
                  {copy.languageLabel} <span className="text-[0.62rem]">▼</span>
                </button>
                {isLanguageMenuOpen ? (
                  <div className="absolute right-0 top-[calc(100%+0.6rem)] min-w-[5.25rem] rounded-[0.9rem] border border-white/10 bg-[#13131a]/96 p-1.5 shadow-[0_18px_40px_rgba(0,0,0,0.32)] backdrop-blur-xl">
                    <button
                      type="button"
                      className={`block w-full rounded-[0.75rem] px-3 py-2 text-left text-[0.72rem] tracking-[0.08em] transition ${language === "ko" ? "bg-white/10 text-white" : "text-white/72 hover:bg-white/6 hover:text-white"}`}
                      onClick={() => {
                        setLanguage("ko");
                        setIsLanguageMenuOpen(false);
                      }}
                    >
                      KOR
                    </button>
                    <button
                      type="button"
                      className={`mt-1 block w-full rounded-[0.75rem] px-3 py-2 text-left text-[0.72rem] tracking-[0.08em] transition ${language === "en" ? "bg-white/10 text-white" : "text-white/72 hover:bg-white/6 hover:text-white"}`}
                      onClick={() => {
                        setLanguage("en");
                        setIsLanguageMenuOpen(false);
                      }}
                    >
                      ENG
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </header>

          <div className="mx-auto flex w-full max-w-[95rem] flex-1 flex-col justify-center">
            <div className="relative mt-10 flex min-h-[min(78vh,44rem)] items-center justify-center overflow-hidden border border-white/8 bg-[linear-gradient(180deg,rgba(0,0,0,0.1),rgba(0,0,0,0.2))] px-6 py-14 sm:px-8 md:px-12 lg:px-16 lg:py-16">
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(1,4,16,0.08),rgba(1,4,16,0.28)_50%,rgba(1,4,16,0.08))]" />
              <div className="relative mx-auto flex h-full max-w-[58rem] flex-col items-center justify-center text-center">
                <p className="text-[0.72rem] tracking-[0.03em] text-white/58 md:text-[0.82rem]">
                  {copy.heroSubtitle}
                </p>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                  <MotionDiv
                    className="w-[min(78vw,39rem)]"
                    initial={resolveMotionProps({ opacity: 0, y: 18 }, { opacity: 1 })}
                    animate={resolveMotionProps({ opacity: 1, y: 0 }, { opacity: 1 })}
                    transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <img
                      src={campusWordmark}
                      alt="VLAINTER CAMPUS"
                      className="h-auto w-full"
                    />
                  </MotionDiv>
                  <span className="mt-2 sm:mt-3">
                    <span className="inline-flex h-[1.5rem] min-w-[5.9rem] items-center justify-center px-3 text-[0.82rem] tracking-[0.02em] text-white" style={{ background: campusGradient, clipPath: "polygon(10% 0, 100% 0, 90% 100%, 0 100%)" }}>
                      CAMPUS
                    </span>
                  </span>
                </div>

                <MotionDiv
                  className="mt-5 flex flex-wrap items-center justify-center gap-2"
                  initial={resolveMotionProps({ opacity: 0, y: 12 }, { opacity: 1 })}
                  animate={resolveMotionProps({ opacity: 1, y: 0 }, { opacity: 1 })}
                  transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.1, duration: 0.55 }}
                >
                  {copy.heroPills.map((pill) => (
                    <CampusOutlineLink
                      key={pill.label}
                      to={pill.to}
                      className="h-[1.7rem] min-w-[6.8rem] px-3"
                      textClassName="text-[0.64rem] tracking-[0.02em] text-white/86 transition group-hover:text-white"
                    >
                      {pill.label}
                    </CampusOutlineLink>
                  ))}
                </MotionDiv>

                <MotionDiv
                  className="mt-16 max-w-[34rem] text-[clamp(0.98rem,1.35vw,1.08rem)] leading-8 text-white/66"
                  initial={resolveMotionProps({ opacity: 0, y: 18 }, { opacity: 1 })}
                  animate={resolveMotionProps({ opacity: 1, y: 0 }, { opacity: 1 })}
                  transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.2, duration: 0.55 }}
                >
                  {copy.heroDescription}
                </MotionDiv>

                <MotionDiv
                  className="mt-5 h-px w-8 bg-white/34"
                  initial={resolveMotionProps({ opacity: 0, scaleX: 0.6 }, { opacity: 1 })}
                  animate={resolveMotionProps({ opacity: 1, scaleX: 1 }, { opacity: 1 })}
                  transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.26, duration: 0.4 }}
                />

                <MotionDiv
                  className="mt-7"
                  initial={resolveMotionProps({ opacity: 0, y: 18 }, { opacity: 1 })}
                  animate={resolveMotionProps({ opacity: 1, y: 0 }, { opacity: 1 })}
                  transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.28, duration: 0.55 }}
                >
                  <CampusOutlineLink
                    to="/join"
                    className="h-[2.45rem] min-w-[7.3rem] px-4 shadow-[0_18px_48px_rgba(0,0,0,0.32)] transition hover:scale-[1.02]"
                    textClassName="text-[0.82rem] tracking-[0.08em] text-white"
                    viewBox="0 0 168 48"
                    points="17,1 167,1 151,47 1,47"
                  >
                    {copy.joinUs}
                  </CampusOutlineLink>
                </MotionDiv>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="bg-[#101010]">
        <section
          id="service-introduce"
          className="mx-auto w-full max-w-[95rem] px-4 py-20 sm:px-6 lg:px-8 lg:py-24"
        >
          <p className="text-[0.75rem] tracking-[0.16em] text-white/36">{copy.serviceEyebrow}</p>
          <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className={sectionTitleClass}>{copy.serviceTitle}</h2>
              <p className={`mt-4 ${sectionBodyClass}`}>{copy.serviceBody}</p>
            </div>
            <Link
              to="/about"
              className="inline-flex h-11 items-center justify-center rounded-full border border-[#7ED957]/24 bg-white/4 px-5 text-[0.8rem] tracking-[0.08em] text-white/84 transition hover:border-[#FFD95A]/45 hover:bg-white/8"
            >
              {copy.aboutService}
            </Link>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {copy.productCards.map((card, index) => (
              <MotionDiv
                key={card.title}
                className="rounded-[1.35rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-6 shadow-[0_24px_50px_rgba(0,0,0,0.22)]"
                initial={resolveMotionProps({ opacity: 0, y: 20 }, { opacity: 1 })}
                whileInView={resolveMotionProps({ opacity: 1, y: 0 }, { opacity: 1 })}
                viewport={{ once: true, amount: 0.2 }}
                transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.5, delay: index * 0.08 }}
              >
                <p className="text-[0.72rem] tracking-[0.16em] text-white/36">0{index + 1}</p>
                <h3 className="mt-4 text-[1.3rem] font-medium tracking-[-0.04em] text-white">{card.title}</h3>
                <p className="mt-3 min-h-[5.5rem] text-[0.93rem] leading-7 text-white/60">{card.description}</p>
                <Link
                  to={card.to}
                  className="mt-6 inline-flex items-center gap-2 text-[0.8rem] tracking-[0.08em] text-white/80 transition hover:text-white"
                >
                  {copy.moveNow} <span aria-hidden="true">→</span>
                </Link>
              </MotionDiv>
            ))}
          </div>
        </section>

        <section
          id="patch-note"
          className="mx-auto w-full max-w-[95rem] px-4 py-20 sm:px-6 lg:px-8 lg:py-24"
        >
          <p className="text-[0.75rem] tracking-[0.16em] text-white/36">{copy.patchEyebrow}</p>
          <h2 className={`mt-4 ${sectionTitleClass}`}>{copy.patchTitle}</h2>
          <p className={`mt-4 ${sectionBodyClass}`}>{copy.patchBody}</p>

          <div
            className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(320px,0.78fr)] lg:items-center"
            onWheel={handlePatchNotesWheel}
          >
            <div>
              <p className="text-[0.74rem] tracking-[0.16em] text-white/34">
                {String(currentPatchNoteIndex + 1).padStart(2, "0")} / {String(displayedPatchNotes.length).padStart(2, "0")}
              </p>
              <h3 className="mt-4 text-[clamp(1.6rem,3vw,2.4rem)] font-medium tracking-[-0.05em] text-white">
                {displayedPatchNotes[currentPatchNoteIndex]?.title || fallbackPatchNotes[0].title}
              </h3>
              <p className="mt-4 max-w-[34rem] text-[0.98rem] leading-8 text-white/62">
                {displayedPatchNotes[currentPatchNoteIndex]?.body || fallbackPatchNotes[0].body}
              </p>
              <div className="mt-7 flex items-center gap-3">
                <button
                  type="button"
                  onClick={showPreviousPatchNote}
                  disabled={currentPatchNoteIndex === 0}
                  aria-label={language === "en" ? "Previous patch note" : "이전 패치노트"}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/14 bg-white/[0.03] text-white/82 disabled:opacity-35"
                >
                  <span aria-hidden="true" className="text-[1rem]">‹</span>
                </button>
                <button
                  type="button"
                  onClick={showNextPatchNote}
                  disabled={currentPatchNoteIndex >= displayedPatchNotes.length - 1}
                  aria-label={language === "en" ? "Next patch note" : "다음 패치노트"}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/14 bg-white/[0.03] text-white/82 disabled:opacity-35"
                >
                  <span aria-hidden="true" className="text-[1rem]">›</span>
                </button>
                <p className="text-[0.78rem] tracking-[0.08em] text-white/40">{copy.patchHelp}</p>
              </div>
            </div>

            <div className="relative mx-auto h-[22rem] w-full max-w-[28rem]">
              {visiblePatchNotes.map((note, index) => {
                const isFront = index === 0;
                return (
                  <MotionArticle
                    key={`${note.patchNoteId || note.title}-${currentPatchNoteIndex}-${index}`}
                    className="absolute inset-x-0 top-0 rounded-[1.45rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.28)] backdrop-blur-md"
                    initial={false}
                    animate={prefersReducedMotion ? {
                      y: 0,
                      scale: 1,
                      opacity: isFront ? 1 : 0.72,
                    } : {
                      y: index * 18,
                      scale: 1 - index * 0.04,
                      opacity: isFront ? 1 : 0.5 - index * 0.06,
                    }}
                    transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    style={{ zIndex: 30 - index }}
                  >
                    <p className="text-[0.72rem] tracking-[0.16em] text-white/34">
                      PATCH {String(currentPatchNoteIndex + index + 1).padStart(2, "0")}
                    </p>
                    <h3 className="mt-4 text-[1.2rem] font-medium tracking-[-0.04em] text-white">{note.title}</h3>
                    <p className="mt-3 text-[0.93rem] leading-7 text-white/60">{note.body}</p>
                  </MotionArticle>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/6 bg-[#0d0d0d]">
        <div className="mx-auto flex w-full max-w-[95rem] flex-col gap-5 px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="text-[0.78rem] tracking-[0.12em] text-white/38">AI INTERVIEW SOLUTION</p>
            <p className="mt-2 text-[0.86rem] text-white/52">
              Contact: <a href="mailto:songchih@icloud.com" className="underline underline-offset-2">songchih@icloud.com</a>
            </p>
          </div>
          <nav className="flex flex-wrap items-center gap-4 text-[0.82rem] text-white/64">
            {copy.footerLinks.map((link) => (
              <Link key={link.label} to={link.to} className="transition hover:text-white">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
};
