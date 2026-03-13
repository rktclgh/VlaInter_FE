import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { getMyProfile } from "../lib/userApi";
import { hasAuthenticatedBrowserSession } from "../lib/authSessionMarker";
import { getLandingPatchNotes } from "../lib/landingApi";
import { WaveBackground } from "../components/WaveBackground";
import logoMark from "../assets/logo/favicon.png";
import icon11st from "../assets/icon/11st.png";
import iconDaum from "../assets/icon/Daum.png";
import iconHmail from "../assets/icon/Hmail.png";
import iconHyundaicard from "../assets/icon/Hyundaicard.png";
import iconSeason from "../assets/icon/Season.png";
import iconCgv from "../assets/icon/cgv.png";
import iconCj from "../assets/icon/cj.png";
import iconHana from "../assets/icon/hana.png";
import iconJtbc from "../assets/icon/jtbc.png";
import iconKasa from "../assets/icon/kasa.png";
import iconKb from "../assets/icon/kb.png";
import iconKbs from "../assets/icon/kbs.png";
import iconKt from "../assets/icon/kt.png";
import iconLguplus from "../assets/icon/lguplus.png";
import iconLotte from "../assets/icon/lotte.png";
import iconMbc from "../assets/icon/mbc.png";
import iconNaver from "../assets/icon/naver.png";
import iconSaramin from "../assets/icon/saramin.png";
import iconSbs from "../assets/icon/sbs.png";
import iconShinhancard from "../assets/icon/shinhancard.png";
import iconSktelecom from "../assets/icon/sktelecom.png";
import iconToss from "../assets/icon/toss.png";
import iconTvn from "../assets/icon/tvn.png";
import iconYogiyo from "../assets/icon/yogiyo.png";

const heroPills = [
  { label: "실전 모의 면접", to: "/content/interview" },
  { label: "기술질문 연습", to: "/content/tech-practice" },
  { label: "질문 공유하기", to: "/content/question-browse" },
];

const landingSections = [
  { id: "service-introduce", label: "SERVICE INTRODUCE" },
  { id: "credit", label: "CREDIT" },
  { id: "patch-note", label: "PATCH NOTE" },
];

const productCards = [
  {
    title: "실전 모의 면접",
    description: "이력서와 직무 기반으로 맞춤 문항을 생성하고 실제 면접 흐름처럼 연습합니다.",
    to: "/content/interview",
  },
  {
    title: "기술질문 연습",
    description: "기술 카테고리별 예상 질문을 빠르게 반복 연습하고 즉시 피드백을 받습니다.",
    to: "/content/tech-practice",
  },
  {
    title: "파일 관리",
    description: "이력서, 자기소개서, 포트폴리오를 업로드해 문서 기반 면접 준비 흐름으로 이어집니다.",
    to: "/content/files",
  },
];

const fallbackPatchNotes = [
  {
    title: "Landing Refresh",
    body: "웨이브 배경과 집중형 타이포 중심의 첫 화면으로 정리했습니다.",
  },
  {
    title: "Interview Flow",
    body: "실전 모의면접과 기술질문 연습으로 바로 진입할 수 있도록 CTA를 재배치했습니다.",
  },
  {
    title: "Security Hardening",
    body: "프록시 체인, rate limit, 재부팅 이후 blue/green 기동 정책을 다시 정리했습니다.",
  },
];

const footerLinks = [
  { label: "서비스 소개", to: "/about" },
  { label: "이용약관", to: "/terms" },
  { label: "개인정보처리방침", to: "/privacy" },
];

const logoColumns = [
  [
    { src: iconLotte, alt: "LOTTE" },
    { src: iconHyundaicard, alt: "Hyundaicard" },
    { src: iconKt, alt: "KT" },
    { src: icon11st, alt: "11st" },
    { src: iconDaum, alt: "Daum" },
    { src: iconHmail, alt: "Hmail" },
  ],
  [
    { src: iconNaver, alt: "Naver" },
    { src: iconKasa, alt: "Kasa" },
    { src: iconHana, alt: "Hana" },
    { src: iconJtbc, alt: "JTBC" },
    { src: iconKb, alt: "KB" },
    { src: iconKbs, alt: "KBS" },
  ],
  [
    { src: iconCgv, alt: "CGV" },
    { src: iconToss, alt: "Toss" },
    { src: iconCj, alt: "CJ" },
    { src: iconLguplus, alt: "LG U+" },
    { src: iconMbc, alt: "MBC" },
    { src: iconSaramin, alt: "Saramin" },
  ],
  [
    { src: iconSbs, alt: "SBS" },
    { src: iconSeason, alt: "Season" },
    { src: iconTvn, alt: "tvN" },
    { src: iconShinhancard, alt: "Shinhan Card" },
    { src: iconSktelecom, alt: "SK Telecom" },
    { src: iconYogiyo, alt: "Yogiyo" },
  ],
];

const sectionTitleClass =
  "text-[clamp(1.55rem,3.2vw,2.55rem)] font-medium tracking-[-0.04em] text-white";
const sectionBodyClass =
  "max-w-[42rem] text-[0.95rem] leading-7 text-white/62 md:text-[1rem]";
const MotionButton = motion.button;
const MotionAside = motion.aside;
const MotionDiv = motion.div;
const MotionH1 = motion.h1;
const MotionArticle = motion.article;

export const StartingPage = () => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [patchNotes, setPatchNotes] = useState(fallbackPatchNotes);

  useEffect(() => {
    let unmounted = false;

    const redirectIfAuthenticated = async () => {
      if (!hasAuthenticatedBrowserSession()) {
        return;
      }
      try {
        await getMyProfile();
        if (!unmounted) {
          navigate("/content/interview", { replace: true });
        }
      } catch {
        // ignore: unauthenticated users should stay on the starting page
      }
    };

    redirectIfAuthenticated();

    return () => {
      unmounted = true;
    };
  }, [navigate]);

  useEffect(() => {
    let cancelled = false;

    const loadPatchNotes = async () => {
      try {
        const payload = await getLandingPatchNotes();
        if (cancelled) return;
        const nextPatchNotes = Array.isArray(payload)
          ? payload
              .map((item) => ({
                patchNoteId: item?.patchNoteId ?? null,
                title: String(item?.title || "").trim(),
                body: String(item?.body || "").trim(),
              }))
              .filter((item) => item.title && item.body)
          : [];
        if (nextPatchNotes.length > 0) {
          setPatchNotes(nextPatchNotes);
        }
      } catch {
        // ignore and keep fallback notes for landing stability
      }
    };

    void loadPatchNotes();
    return () => {
      cancelled = true;
    };
  }, []);

  const scrollToSection = useCallback((sectionId) => {
    const element = document.getElementById(sectionId);
    if (!element) return;
    element.scrollIntoView({ behavior: "smooth", block: "start" });
    setIsSidebarOpen(false);
  }, []);

  const logoMarqueeColumns = useMemo(() => logoColumns, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#111111] text-white">
      <AnimatePresence>
        {isSidebarOpen ? (
          <>
            <MotionButton
              type="button"
              aria-label="사이드바 닫기"
              className="fixed inset-0 z-40 bg-black/54 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
            />
            <MotionAside
              className="fixed left-0 top-0 z-50 flex h-screen w-[min(11.25rem,88vw)] flex-col border-r border-white/10 bg-[#181818]/96 px-4 py-4 shadow-[1.5rem_0_3.5rem_rgba(0,0,0,0.35)] backdrop-blur-xl"
              initial={{ x: "-100%", opacity: 0.6 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "-100%", opacity: 0.6 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex items-center justify-end border-b border-white/8 pb-3">
                <button
                  type="button"
                  className="text-[0.76rem] tracking-[0.02em] text-white/72 transition hover:text-white"
                  onClick={() => setIsSidebarOpen(false)}
                >
                  Close <span className="ml-1 text-[0.95rem]">×</span>
                </button>
              </div>

              <nav className="mt-5 flex flex-col gap-2">
                {landingSections.map((section) => (
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

              <p className="mt-auto text-[0.7rem] tracking-[0.14em] text-white/28">v0.4</p>
            </MotionAside>
          </>
        ) : null}
      </AnimatePresence>

      <section className="relative isolate overflow-hidden bg-[#050816]">
        <WaveBackground />

        <div className="relative z-10 mx-auto flex min-h-[min(100vh,58rem)] w-full max-w-[112rem] flex-col px-4 pb-8 pt-4 sm:px-6 lg:px-8">
          <header className="mx-auto flex w-full max-w-[95rem] items-center justify-between gap-4 px-1 py-2 md:px-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 text-[0.68rem] tracking-[0.12em] text-white/78 transition hover:text-white"
              onClick={() => setIsSidebarOpen(true)}
            >
              <span className="text-[0.95rem]">☰</span>
              <span>SERVICE</span>
            </button>

            <Link to="/" className="absolute left-1/2 top-2 -translate-x-1/2">
              <img src={logoMark} alt="Vlainter" className="h-9 w-auto md:h-10" />
            </Link>

            <div className="ml-auto flex items-center gap-4 text-[0.68rem] tracking-[0.12em] text-white/82 md:gap-8">
              <Link to="/join" className="transition hover:text-white">
                JOIN
              </Link>
              <Link to="/login" className="transition hover:text-white">
                LOG IN
              </Link>
              <button type="button" className="hidden items-center gap-1 text-white/82 md:inline-flex">
                KOR <span className="text-[0.62rem]">▼</span>
              </button>
            </div>
          </header>

          <div className="mx-auto flex w-full max-w-[95rem] flex-1 flex-col justify-center">
            <div className="relative mt-10 flex min-h-[min(78vh,44rem)] items-center justify-center overflow-hidden border border-white/8 bg-[linear-gradient(180deg,rgba(0,0,0,0.1),rgba(0,0,0,0.2))] px-6 py-14 sm:px-8 md:px-12 lg:px-16 lg:py-16">
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(1,4,16,0.08),rgba(1,4,16,0.28)_50%,rgba(1,4,16,0.08))]" />
              <div className="relative mx-auto flex h-full max-w-[58rem] flex-col items-center justify-center text-center">
                <p className="text-[0.72rem] tracking-[0.03em] text-white/58 md:text-[0.82rem]">
                  사용자 맞춤 AI 면접 시뮬레이터
                </p>

                <MotionH1
                  className="mt-4 bg-[linear-gradient(90deg,#5d83de_1%,#8c63f3_45%,#ff1c91_92%)] bg-clip-text text-[clamp(4.2rem,12vw,8.6rem)] font-extralight leading-[0.94] tracking-[-0.08em] text-transparent"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                >
                  VLAINTER
                </MotionH1>

                <MotionDiv
                  className="mt-5 flex flex-wrap items-center justify-center gap-2"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.55 }}
                >
                  {heroPills.map((pill) => (
                    <Link
                      key={pill.label}
                      to={pill.to}
                      className="rounded-full border border-white/22 bg-black/18 px-3 py-1.5 text-[0.64rem] tracking-[0.02em] text-white/82 transition hover:border-white/44 hover:bg-white/8 hover:text-white"
                    >
                      {pill.label}
                    </Link>
                  ))}
                </MotionDiv>

                <MotionDiv
                  className="mt-16 max-w-[34rem] text-[clamp(0.98rem,1.35vw,1.08rem)] leading-8 text-white/66"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.55 }}
                >
                  이력서는 문을 열어주고, 이야기는 합격을 만들어냅니다.
                </MotionDiv>

                <MotionDiv
                  className="mt-5 h-px w-8 bg-white/34"
                  initial={{ opacity: 0, scaleX: 0.6 }}
                  animate={{ opacity: 1, scaleX: 1 }}
                  transition={{ delay: 0.26, duration: 0.4 }}
                />

                <MotionDiv
                  className="mt-7"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.28, duration: 0.55 }}
                >
                  <Link
                    to="/join"
                    className="inline-flex items-center justify-center rounded-full border border-white/16 bg-[linear-gradient(135deg,rgba(93,131,222,0.42),rgba(255,28,145,0.28))] px-7 py-3 text-[0.82rem] tracking-[0.1em] text-white shadow-[0_18px_48px_rgba(0,0,0,0.32)] transition hover:scale-[1.02] hover:border-white/28"
                  >
                      JOIN US
                  </Link>
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
          <p className="text-[0.75rem] tracking-[0.16em] text-white/36">SERVICE INTRODUCE</p>
          <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className={sectionTitleClass}>준비 단계부터 면접 직전까지 한 화면으로 연결합니다.</h2>
              <p className={`mt-4 ${sectionBodyClass}`}>
                업로드한 문서, 직무 선택, 기술 카테고리, 질문 세트까지 이어지는 준비 흐름을 끊기지 않게 정리했습니다.
              </p>
            </div>
            <Link
              to="/about"
              className="inline-flex h-11 items-center justify-center rounded-full border border-white/14 bg-white/4 px-5 text-[0.8rem] tracking-[0.08em] text-white/84 transition hover:border-white/28 hover:bg-white/8"
            >
              ABOUT SERVICE
            </Link>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {productCards.map((card, index) => (
              <MotionDiv
                key={card.title}
                className="rounded-[1.35rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-6 shadow-[0_24px_50px_rgba(0,0,0,0.22)]"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
              >
                <p className="text-[0.72rem] tracking-[0.16em] text-white/36">0{index + 1}</p>
                <h3 className="mt-4 text-[1.3rem] font-medium tracking-[-0.04em] text-white">{card.title}</h3>
                <p className="mt-3 min-h-[5.5rem] text-[0.93rem] leading-7 text-white/60">{card.description}</p>
                <Link
                  to={card.to}
                  className="mt-6 inline-flex items-center gap-2 text-[0.8rem] tracking-[0.08em] text-white/80 transition hover:text-white"
                >
                  바로 가기 <span aria-hidden="true">→</span>
                </Link>
              </MotionDiv>
            ))}
          </div>
        </section>

        <section
          id="credit"
          className="mx-auto w-full max-w-[95rem] px-4 py-20 sm:px-6 lg:px-8 lg:py-24"
        >
          <p className="text-[0.75rem] tracking-[0.16em] text-white/36">CREDIT</p>
          <h2 className={`mt-4 ${sectionTitleClass}`}>면접 준비에서 자주 마주치는 브랜드와 직무 맥락을 참고합니다.</h2>
          <p className={`mt-4 ${sectionBodyClass}`}>
            서비스 화면에서 사용되는 예시 브랜드 로고와 회사명은 면접 준비 문맥을 설명하기 위한 샘플입니다.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {logoMarqueeColumns.map((column, columnIndex) => (
              <div
                key={`landing-credit-${columnIndex}`}
                className="overflow-hidden rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.2)]"
              >
                <div className="flex flex-col gap-3">
                  {column.map((icon) => (
                    <MotionDiv
                      key={icon.alt}
                      className="flex h-[3.65rem] items-center justify-center rounded-[1rem] border border-white/8 bg-white/95 px-4"
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.2 }}
                      transition={{ duration: 0.45, delay: columnIndex * 0.05 }}
                    >
                      <img src={icon.src} alt={icon.alt} className="max-h-[1.55rem] w-auto object-contain" />
                    </MotionDiv>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section
          id="patch-note"
          className="mx-auto w-full max-w-[95rem] px-4 py-20 sm:px-6 lg:px-8 lg:py-24"
        >
          <p className="text-[0.75rem] tracking-[0.16em] text-white/36">PATCH NOTE</p>
          <h2 className={`mt-4 ${sectionTitleClass}`}>최근 반영된 흐름과 운영 개선 사항</h2>
          <p className={`mt-4 ${sectionBodyClass}`}>
            화면 구조와 배포 안정성, 보안 체계를 최근 기준으로 다시 정리했습니다.
          </p>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {patchNotes.map((note, index) => (
              <MotionArticle
                key={note.title}
                className="rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-6"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
              >
                <p className="text-[0.72rem] tracking-[0.16em] text-white/34">PATCH {index + 1}</p>
                <h3 className="mt-4 text-[1.2rem] font-medium tracking-[-0.04em] text-white">{note.title}</h3>
                <p className="mt-3 text-[0.93rem] leading-7 text-white/60">{note.body}</p>
              </MotionArticle>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-white/6 bg-[#0d0d0d]">
        <div className="mx-auto flex w-full max-w-[95rem] flex-col gap-5 px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="text-[0.78rem] tracking-[0.12em] text-white/38">AI INTERVIEW SOLUTION</p>
            <p className="mt-2 text-[0.86rem] text-white/52">문의: <a href="mailto:songchih@icloud.com" className="underline underline-offset-2">songchih@icloud.com</a></p>
          </div>
          <nav className="flex flex-wrap items-center gap-4 text-[0.82rem] text-white/64">
            {footerLinks.map((link) => (
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
