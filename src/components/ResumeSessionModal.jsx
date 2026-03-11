export const ResumeSessionModal = ({
  open,
  title,
  description,
  continueLabel = "이어서 하기",
  dismissLabel = "아니요",
  onContinue,
  onDismiss,
  busy = false,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/45 px-4">
      <div className="absolute inset-0" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="resume-session-modal-title"
        aria-describedby="resume-session-modal-description"
        className="relative w-full max-w-[460px] rounded-[22px] border border-[#dfe3eb] bg-white p-5 shadow-[0_24px_80px_rgba(15,23,42,0.18)]"
      >
        <p id="resume-session-modal-title" className="text-[18px] font-semibold text-[#161a22]">
          {title}
        </p>
        <p id="resume-session-modal-description" className="mt-2 text-[14px] leading-[1.7] text-[#5e6472]">
          {description}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onDismiss}
            disabled={busy}
            className="rounded-[12px] border border-[#d9dde5] px-3 py-2 text-[12px] text-[#4f5664] disabled:opacity-50"
          >
            {dismissLabel}
          </button>
          <button
            type="button"
            onClick={onContinue}
            disabled={busy}
            className="rounded-[12px] bg-[#171b24] px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-60"
          >
            {busy ? "처리 중..." : continueLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
