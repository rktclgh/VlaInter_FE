export const GeminiOverloadModal = ({ onClose }) => (
  <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/45 px-4">
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="gemini-overload-title"
      aria-describedby="gemini-overload-description"
      className="w-full max-w-[440px] rounded-2xl border border-[#d9d9d9] bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.22)]"
    >
      <p id="gemini-overload-title" className="text-[16px] font-semibold text-[#1f2937]">
        Gemini 과부하로 API 요청 실패했습니다.
      </p>
      <p id="gemini-overload-description" className="mt-2 text-[13px] leading-[1.7] text-[#4b5563]">
        죄송합니다, 1분 후 재시도 부탁드리겠습니다.
      </p>
      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-[10px] border border-[#1f1f1f] bg-[#1f1f1f] px-3 py-1.5 text-[12px] text-white"
        >
          확인
        </button>
      </div>
    </div>
  </div>
);
