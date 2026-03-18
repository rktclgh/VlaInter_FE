import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { updateMyServiceMode } from "../../lib/userApi";
import { SERVICE_MODE } from "../../lib/serviceMode";

const OPTIONS = [
  {
    key: SERVICE_MODE.JOB_SEEKER,
    title: "취준생 모드",
    description: "기술질문, 서류 기반 모의면접, 질문 세트 생성 중심으로 이용합니다.",
    cta: "취준생으로 시작하기",
  },
  {
    key: SERVICE_MODE.STUDENT,
    title: "대학생 모드",
    description: "과목별 자료 업로드, 시험문제 생성, 오답노트 중심으로 이용합니다.",
    cta: "대학생으로 시작하기",
  },
];

export const ServiceModePage = () => {
  const navigate = useNavigate();
  const [pendingMode, setPendingMode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSelectMode = async (serviceMode) => {
    if (pendingMode) return;
    setPendingMode(serviceMode);
    setErrorMessage("");
    try {
      await updateMyServiceMode(serviceMode);
      navigate(serviceMode === SERVICE_MODE.STUDENT ? "/content/student" : "/content/interview", {
        replace: true,
      });
    } catch (error) {
      setErrorMessage(error?.message || "서비스 모드 저장에 실패했습니다.");
      setPendingMode("");
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f7fb] px-6 py-10">
      <div className="mx-auto max-w-[1040px]">
        <div className="rounded-[28px] border border-[#e4e6ee] bg-white px-6 py-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:px-8">
          <p className="text-[12px] font-semibold tracking-[0.12em] text-[#7c8497]">SERVICE MODE</p>
          <h1 className="mt-3 text-[30px] font-semibold text-[#111827] sm:text-[36px]">어떤 모드로 시작할까요?</h1>
          <p className="mt-3 max-w-[720px] text-[14px] leading-[1.8] text-[#5b6475]">
            선택 결과는 저장되며 다음 접속에도 유지됩니다. 마이페이지에서 언제든 다시 바꿀 수 있습니다.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {OPTIONS.map((option) => {
              const isPending = pendingMode === option.key;
              return (
                <section
                  key={option.key}
                  className="rounded-[24px] border border-[#e6e9f2] bg-[linear-gradient(180deg,#ffffff_0%,#f8f9fe_100%)] p-6"
                >
                  <h2 className="text-[22px] font-semibold text-[#111827]">{option.title}</h2>
                  <p className="mt-3 min-h-[72px] text-[14px] leading-[1.8] text-[#5b6475]">{option.description}</p>
                  <button
                    type="button"
                    disabled={Boolean(pendingMode)}
                    onClick={() => handleSelectMode(option.key)}
                    className="mt-6 inline-flex items-center rounded-[14px] bg-[#111827] px-5 py-3 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {isPending ? "저장 중..." : option.cta}
                  </button>
                </section>
              );
            })}
          </div>

          {errorMessage ? <p className="mt-4 text-[13px] text-[#d84a4a]">{errorMessage}</p> : null}
        </div>
      </div>
    </div>
  );
};
