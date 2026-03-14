import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePublicLocale } from "../lib/publicLocale";

export const ErrorPage = ({ code = 404 }) => {
  const navigate = useNavigate();
  const { locale } = usePublicLocale();
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  const content = useMemo(() => {
    if (code === 403) {
      return {
        title: locale === "en" ? "You do not have access" : "접근 권한이 없어요",
        description:
          locale === "en"
            ? "This page is not available for your current account."
            : "현재 계정으로는 이 페이지를 볼 수 없습니다.",
        eyeColor: "#ff1c91",
      };
    }
    return {
      title: locale === "en" ? "Page not found" : "페이지를 찾을 수 없어요",
      description:
        locale === "en"
          ? "The requested path does not exist or is not accessible."
          : "요청하신 경로가 존재하지 않거나, 접근할 수 없는 화면입니다.",
      eyeColor: "#5d83de",
    };
  }, [code, locale]);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/", { replace: true });
  };

  useEffect(() => {
    if (!isVideoOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsVideoOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isVideoOpen]);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f6f7fb] px-4 pt-[18vh] sm:px-5 sm:pt-[28vh]">
      <section className="relative mx-auto w-full max-w-[560px] overflow-hidden rounded-[28px] border border-[#e6e9f2] bg-white px-7 pb-[30px] pt-[34px] text-center shadow-[0_18px_40px_rgba(93,131,222,0.12)]">
        <div className="pointer-events-none absolute left-[-70px] top-[-80px] h-[180px] w-[180px] rounded-full bg-[#b8c8f7] opacity-20" />
        <div className="pointer-events-none absolute bottom-[-100px] right-[-90px] h-[200px] w-[200px] rounded-full bg-[#ffd1ea] opacity-20" />

        <div className="relative z-10">
          <h1 className="bg-[linear-gradient(135deg,#5d83de_0%,#ff1c91_100%)] bg-clip-text text-4xl font-extrabold tracking-[0.2px] text-transparent">
            Vlainter
          </h1>

          {code === 404 ? (
            <button
              type="button"
              onClick={() => setIsVideoOpen(true)}
              className="relative mx-auto my-[14px] block h-16 w-16 rounded-[26px_26px_18px_18px] border-2 border-[#d8deed] bg-white transition hover:-translate-y-[1px] hover:shadow-[0_8px_18px_rgba(93,131,222,0.18)]"
              aria-label={locale === "en" ? "Open 404 video" : "404 비디오 열기"}
            >
              <span
                className="absolute left-5 top-6 h-2 w-2 rounded-full"
                style={{ backgroundColor: content.eyeColor }}
              />
              <span
                className="absolute right-5 top-6 h-2 w-2 rounded-full"
                style={{ backgroundColor: content.eyeColor }}
              />
            </button>
          ) : (
            <div className="relative mx-auto my-[14px] h-16 w-16 rounded-[26px_26px_18px_18px] border-2 border-[#d8deed] bg-white">
              <span
                className="absolute left-5 top-6 h-2 w-2 rounded-full"
                style={{ backgroundColor: content.eyeColor }}
              />
              <span
                className="absolute right-5 top-6 h-2 w-2 rounded-full"
                style={{ backgroundColor: content.eyeColor }}
              />
            </div>
          )}

          <p className="mb-2 text-[44px] font-extrabold leading-none">{code}</p>
          <h2 className="text-[22px] font-bold">{content.title}</h2>
          <p className="mx-auto mb-[22px] mt-[10px] max-w-[420px] text-[15px] leading-[1.6] text-[#8c93a7]">
            {content.description}
          </p>

          <button
            type="button"
            onClick={handleBack}
            className="inline-flex h-11 items-center justify-center rounded-full border border-[#c8d2f2] bg-white px-6 text-[15px] font-semibold text-[#334155] transition hover:-translate-y-[1px] hover:shadow-[0_8px_18px_rgba(93,131,222,0.18)]"
          >
            {locale === "en" ? "Go back" : "이전 페이지로 돌아가기"}
          </button>
        </div>
      </section>

      {isVideoOpen && code === 404 ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          role="dialog"
          aria-modal="true"
          aria-label={locale === "en" ? "404 video modal" : "404 비디오 모달"}
          onClick={() => setIsVideoOpen(false)}
        >
          <div
            className="relative w-full max-w-3xl overflow-hidden rounded-2xl bg-black"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsVideoOpen(false)}
              className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-lg font-semibold text-black"
              aria-label={locale === "en" ? "Close modal" : "모달 닫기"}
            >
              ×
            </button>
            <div className="aspect-video w-full">
              <iframe
                title="404-video"
                src="https://www.youtube.com/embed/QgiRK3_qPWk?autoplay=1&rel=0"
                className="h-full w-full"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
};
