import { useEffect, useRef } from "react";

export const PointChargeSuccessModal = ({ onClose }) => {
  const confirmButtonRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    confirmButtonRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[82] flex items-center justify-center bg-black/45 px-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="point-charge-success-title"
        className="w-full max-w-[360px] rounded-[16px] border border-[#d9d9d9] bg-white p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="point-charge-success-title" className="text-[18px] font-semibold text-[#1f1f1f]">결제 완료</h3>
        <p className="mt-2 text-[13px] leading-[1.6] text-[#575757]">결제가 완료되었습니다. 포인트가 정상 반영되었습니다.</p>

        <div className="mt-5 flex justify-end">
          <button
            ref={confirmButtonRef}
            type="button"
            onClick={onClose}
            className="rounded-[10px] border border-[#1f1f1f] bg-[#1f1f1f] px-4 py-2 text-[12px] text-white"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
};
