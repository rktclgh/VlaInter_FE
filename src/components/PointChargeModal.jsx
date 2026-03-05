export const PointChargeModal = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        className="w-full max-w-[420px] rounded-[16px] border border-[#d9d9d9] bg-white p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-[18px] font-semibold text-[#1f1f1f]">포인트 충전</h2>
        <p className="mt-2 text-[13px] leading-[1.6] text-[#666]">
          포인트 충전 기능은 곧 추가될 예정입니다.
          <br />
          현재는 인터뷰/파일 관리 기능을 우선 제공합니다.
        </p>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[10px] border border-[#d6d6d6] px-3 py-1.5 text-[12px] text-[#555]"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

