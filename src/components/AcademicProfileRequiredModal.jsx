export const AcademicProfileRequiredModal = ({ open, onMoveToMyPage }) => {
  if (!open) return null;

  const titleId = "academic-profile-required-title";
  const descriptionId = "academic-profile-required-description";

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="w-full max-w-[440px] rounded-[24px] border border-[#dfe3ee] bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.22)]"
      >
        <h2 id={titleId} className="text-[22px] font-semibold text-[#111827]">대학교 / 학과 설정이 필요합니다</h2>
        <p id={descriptionId} className="mt-3 text-[14px] leading-[1.8] text-[#5b6475]">
          대학생 모드의 과목, 강의자료, 모의고사, 오답노트 기능은 학교와 학과를 먼저 설정해야 사용할 수 있습니다.
          <br />
          마이페이지에서 대학교와 학과를 검색 결과로 선택한 뒤 다시 이용해 주세요.
        </p>
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onMoveToMyPage}
            className="rounded-[12px] bg-[#111827] px-4 py-2.5 text-[13px] font-semibold text-white"
          >
            마이페이지로 이동
          </button>
        </div>
      </div>
    </div>
  );
};
