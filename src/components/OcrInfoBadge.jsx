const OCR_TOOLTIP_TEXT =
  "OCR fallback으로 추출된 텍스트입니다. 일반 PDF 텍스트 추출보다 일부 오인식이 있을 수 있어 면접 질문 맥락을 한 번 더 확인하는 것이 좋습니다.";

export const OcrInfoBadge = ({ compact = false }) => {
  return (
    <span className="group relative inline-flex items-center">
      <span
        className={`inline-flex items-center rounded-full border border-[#f1b169] bg-[#fff4e6] font-semibold text-[#9b5a13] ${
          compact ? "px-1.5 py-[2px] text-[9px]" : "px-2 py-1 text-[10px]"
        }`}
      >
        OCR
      </span>
      <span className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-[40] hidden w-[240px] -translate-x-1/2 rounded-[12px] border border-[#e4c7a0] bg-[#fffaf2] px-3 py-2 text-[11px] font-normal leading-[1.5] text-[#6d4d25] shadow-[0_10px_24px_rgba(0,0,0,0.12)] group-hover:block">
        {OCR_TOOLTIP_TEXT}
      </span>
    </span>
  );
};

export const OCR_TOOLTIP_LABEL = OCR_TOOLTIP_TEXT;
