import { useState } from "react";
import { SupportReportModal } from "./SupportReportModal";
import brandFavicon from "../assets/logo/logo.png";

export const ContentTopNav = ({
  point = "0P",
  onClickCharge,
  onOpenMenu,
  interactionDisabled = false,
  variant = "default",
}) => {
  const [showReportModal, setShowReportModal] = useState(false);
  const isMockStart = variant !== "legacy";

  return (
    <>
      <header
        className={`fixed top-0 left-0 z-40 w-full border-b bg-white/95 backdrop-blur-sm ${
          isMockStart ? "h-[3.75rem] border-[#dddddd] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)] backdrop-blur-none" : "h-14 border-[#ececec]"
        }`}
      >
        <div className={`relative flex h-full items-center justify-between ${isMockStart ? "px-3.5 sm:px-4 md:px-5" : "px-3 md:px-4"}`}>
          <button
            type="button"
            onClick={onOpenMenu}
            disabled={interactionDisabled}
            className={`inline-flex items-center justify-center rounded-full border text-[16px] md:hidden ${
              isMockStart
                ? "h-8 w-8 border-[#d8d8d8] text-[#2b2b2b]"
                : "h-8 w-8 border-[#dddddd] text-[#4b4b4b]"
            }`}
            aria-label="메뉴 열기"
          >
            ☰
          </button>

          <div
            className={`flex items-center gap-2.5 ${
              isMockStart
                ? "pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 md:pointer-events-auto md:static md:translate-x-0 md:translate-y-0"
                : "pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 md:pointer-events-auto md:static md:translate-x-0 md:translate-y-0"
            }`}
          >
            <img
              src={brandFavicon}
              alt="Vlainter"
              className={isMockStart ? "h-9 w-9 shrink-0" : "hidden"}
            />
            <div
              className={`leading-none ${
                isMockStart
                  ? "text-[18px] font-medium tracking-[0.02em] text-[#111111]"
                  : "bg-[linear-gradient(45deg,#5D83DE_0%,#FF1C91_100%)] bg-clip-text text-[22px] font-extrabold text-transparent md:text-[24px]"
              }`}
            >
              VLAINTER
            </div>
          </div>

          <div className={`ml-auto items-center gap-1.5 sm:gap-2 ${isMockStart ? "hidden md:inline-flex" : "inline-flex"}`}>
            <button
              type="button"
              onClick={() => {
                if (interactionDisabled) return;
                setShowReportModal(true);
              }}
              disabled={interactionDisabled}
              className={`inline-flex items-center justify-center border font-semibold leading-none text-black ${
                isMockStart
                  ? "h-8 rounded-[12px] border-[#d4d4d4] bg-white px-2.5 text-[10px] font-medium tracking-[0.02em]"
                  : "h-7 rounded-[10px] border-[#cfcfcf] px-2 text-[10px] sm:text-[11px]"
              }`}
              aria-label="버그 리포트 및 운영자 문의"
            >
              REPORT
            </button>
            <button
              type="button"
              onClick={onClickCharge}
              disabled={interactionDisabled}
              className={`inline-flex shrink-0 items-center justify-center border text-sm font-medium leading-none text-black ${
                isMockStart
                  ? "h-8 w-8 rounded-[12px] border-[#d4d4d4] bg-white"
                  : "h-7 w-7 rounded-[10px] border-[#cfcfcf]"
              }`}
              aria-label="포인트 충전 페이지 이동"
            >
              +
            </button>
            <div
              className={`inline-flex min-w-0 items-center whitespace-nowrap border font-semibold tracking-[0.02em] text-black ${
                isMockStart
                  ? "rounded-[12px] border-[#d4d4d4] bg-white px-2.5 py-1.5 text-[10px] font-medium tracking-[0.02em]"
                  : "rounded-[12px] border-[#cfcfcf] px-2.5 py-1 text-[11px] sm:px-3 sm:text-[12px]"
              }`}
            >
              {point}
            </div>
          </div>
        </div>
      </header>
      <SupportReportModal
        open={showReportModal}
        onClose={() => {
          if (interactionDisabled) return;
          setShowReportModal(false);
        }}
      />
    </>
  );
};
