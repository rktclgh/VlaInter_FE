import { useState } from "react";
import { SupportReportModal } from "./SupportReportModal";

export const ContentTopNav = ({ point = "0P", onClickCharge, onOpenMenu }) => {
  const [showReportModal, setShowReportModal] = useState(false);

  return (
    <>
      <header className="fixed top-0 left-0 z-40 h-[54px] w-full border-b border-[#ececec] bg-white/95 backdrop-blur-sm">
        <div className="relative flex h-full items-center justify-between px-3 md:px-4">
          <button
            type="button"
            onClick={onOpenMenu}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#dddddd] text-[16px] text-[#4b4b4b] md:hidden"
            aria-label="메뉴 열기"
          >
            ☰
          </button>

          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[linear-gradient(143deg,#5d83de_0%,#ff1c91_100%)] bg-clip-text text-[22px] font-extrabold leading-none text-transparent md:pointer-events-auto md:static md:translate-x-0 md:translate-y-0 md:text-[24px]">
            Vlainter
          </div>

          <div className="ml-auto inline-flex max-w-[calc(100vw-152px)] items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setShowReportModal(true)}
              className="inline-flex h-7 items-center justify-center rounded-[10px] border border-[#cfcfcf] px-2 text-[10px] font-semibold leading-none text-black sm:text-[11px]"
              aria-label="버그 리포트 및 운영자 문의"
            >
              REPORT
            </button>
            <button
              type="button"
              onClick={onClickCharge}
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] border border-[#cfcfcf] text-[15px] font-semibold leading-none text-black"
              aria-label="포인트 충전 페이지 이동"
            >
              +
            </button>
            <div className="inline-flex min-w-0 items-center whitespace-nowrap rounded-[12px] border border-[#cfcfcf] px-2.5 py-1 text-[11px] font-semibold tracking-[0.02em] text-black sm:px-3 sm:text-[12px]">
              {point}
            </div>
          </div>
        </div>
      </header>
      <SupportReportModal open={showReportModal} onClose={() => setShowReportModal(false)} />
    </>
  );
};
