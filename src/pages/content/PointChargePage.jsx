import { useNavigate } from "react-router-dom";

export const PointChargePage = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-[520px] rounded-[16px] border border-[#e1e1e1] bg-white p-6 text-center">
        <h1 className="text-[28px] font-semibold text-[#1f1f1f]">포인트 충전</h1>
        <p className="mt-3 text-[14px] text-[#666]">포인트 충전 페이지는 곧 연결될 예정입니다.</p>
        <button
          type="button"
          onClick={() => navigate("/content/interview")}
          className="mt-6 rounded-[10px] border border-[#cfcfcf] px-4 py-2 text-[13px] text-[#2a2a2a]"
        >
          면접 시작 페이지로 돌아가기
        </button>
      </div>
    </div>
  );
};
