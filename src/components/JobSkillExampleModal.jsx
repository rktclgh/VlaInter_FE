import { JOB_SKILL_INPUT_EXAMPLES, JOB_SKILL_INPUT_GUIDE } from "../lib/jobSkillInputExamples";

const ExampleValueCard = ({ label, value, emphasized = false }) => (
  <div
    className={`min-w-0 flex-1 rounded-[14px] border px-3 py-2.5 sm:min-w-[110px] ${
      emphasized ? "border-[#171b24] bg-[#171b24] text-white" : "border-[#e2e8f0] bg-white text-[#171b24]"
    }`}
  >
    <p className={`text-[10px] font-semibold tracking-[0.08em] ${emphasized ? "text-white/72" : "text-[#7a8190]"}`}>{label}</p>
    <p className="mt-1 text-[13px] font-semibold leading-[1.4]">{value}</p>
  </div>
);

export const JobSkillExampleModal = ({ open, onClose }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/45 p-3 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="job-skill-example-title"
        className="flex max-h-[calc(100vh-24px)] w-full max-w-[760px] flex-col overflow-hidden rounded-[20px] border border-[#d9dde5] bg-white p-4 shadow-[0_20px_56px_rgba(15,23,42,0.2)] sm:max-h-[calc(100vh-32px)] sm:rounded-[24px] sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[12px] font-semibold tracking-[0.08em] text-[#7a8190]">입력 예시</p>
            <h2 id="job-skill-example-title" className="mt-2 text-[20px] font-semibold tracking-[-0.02em] text-[#171b24] sm:text-[22px]">
              계열 · 직무 · 기술은 이렇게 고르시면 됩니다
            </h2>
            <p className="mt-2 text-[13px] leading-[1.7] text-[#5e6472]">
              계열은 큰 분야, 직무는 실제 지원 포지션, 기술은 면접에서 묻고 싶은 세부 역량입니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#d9dde5] text-[16px] text-[#5e6472] transition hover:bg-[#f8fafc]"
            aria-label="예시 모달 닫기"
          >
            ×
          </button>
        </div>

        <div className="mt-5 overflow-y-auto pr-1">
          <div className="rounded-[18px] border border-[#e7ebf2] bg-[#fafbfd] p-4">
          <ul className="space-y-2 text-[13px] leading-[1.7] text-[#4f5664]">
            {JOB_SKILL_INPUT_GUIDE.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          </div>

          <div className="mt-5 grid gap-4">
            {JOB_SKILL_INPUT_EXAMPLES.map((section) => (
              <section key={section.branch} className="rounded-[20px] border border-[#e7ebf2] bg-white p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                  <span className="w-fit rounded-full bg-[#eef2f8] px-3 py-1 text-[11px] font-semibold text-[#556070]">{section.branch}</span>
                  <p className="text-[13px] text-[#5e6472]">{section.description}</p>
                </div>
                <div className="mt-4 space-y-3">
                  {section.rows.map((row) => (
                    <div key={`${section.branch}-${row.job}-${row.skill}`} className="rounded-[16px] border border-[#edf1f7] bg-[#fafbfd] p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                        <ExampleValueCard label="계열" value={section.branch} />
                        <span className="hidden text-[#c0c7d2] sm:inline">→</span>
                        <ExampleValueCard label="직무" value={row.job} />
                        <span className="hidden text-[#c0c7d2] sm:inline">→</span>
                        <ExampleValueCard label="기술" value={row.skill} emphasized />
                      </div>
                      <p className="mt-3 text-[12px] leading-[1.7] text-[#5e6472]">{row.note}</p>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>

        <div className="mt-5 flex justify-end border-t border-[#eef2f6] pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[14px] border border-[#171b24] bg-[#171b24] px-4 py-2.5 text-[13px] font-semibold text-white"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
};
