import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { confirmPointCharge } from "../../lib/paymentApi";
import {
  consumePointChargeReturnPath,
  savePointChargeSuccessResult,
  sanitizeReturnPath,
} from "../../lib/pointChargeFlow";

const parseResultParams = (search) => {
  const params = new URLSearchParams(search);
  return {
    impUid: params.get("imp_uid") || params.get("impUid") || "",
    merchantUid: params.get("merchant_uid") || params.get("merchantUid") || "",
    impSuccess: params.get("imp_success") || "",
    errorMsg: params.get("error_msg") || "",
  };
};

const isExplicitFail = (impSuccess) => {
  const normalized = String(impSuccess || "").toLowerCase();
  return normalized === "false" || normalized === "n" || normalized === "0";
};

export const PointChargeCallbackPage = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState("processing");
  const [message, setMessage] = useState("결제 결과를 확인하고 있습니다.");

  const returnPath = useMemo(() => {
    const consumed = consumePointChargeReturnPath();
    return sanitizeReturnPath(consumed);
  }, []);

  useEffect(() => {
    const run = async () => {
      const { impUid, merchantUid, impSuccess, errorMsg } = parseResultParams(window.location.search);

      if (!impUid || !merchantUid) {
        setStatus("failed");
        setMessage("결제 결과 파라미터가 누락되었습니다. 다시 시도해 주세요.");
        return;
      }

      if (isExplicitFail(impSuccess)) {
        setStatus("failed");
        setMessage(errorMsg || "결제가 취소되었거나 실패했습니다.");
        return;
      }

      try {
        const confirmResult = await confirmPointCharge({ impUid, merchantUid });
        savePointChargeSuccessResult(confirmResult);
        setStatus("success");
        setMessage("결제가 완료되었습니다. 잠시 후 이전 화면으로 이동합니다.");
        window.setTimeout(() => {
          navigate(returnPath, { replace: true });
        }, 900);
      } catch (error) {
        setStatus("failed");
        setMessage(error?.message || "결제 확인에 실패했습니다. 다시 시도해 주세요.");
      }
    };

    run();
  }, [navigate, returnPath]);

  return (
    <div className="min-h-screen bg-[#f7f7f7] px-4 py-12">
      <div className="mx-auto w-full max-w-[420px] rounded-[16px] border border-[#dedede] bg-white p-6">
        <h1 className="text-[20px] font-semibold text-[#1f1f1f]">포인트 결제</h1>
        <p className="mt-3 text-[13px] leading-[1.6] text-[#555]">{message}</p>

        {status === "processing" ? (
          <div className="mt-5 h-[6px] overflow-hidden rounded-full bg-[#efefef]">
            <div className="h-full w-[40%] animate-pulse rounded-full bg-[#1f1f1f]" />
          </div>
        ) : null}

        {status === "failed" ? (
          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={() => navigate(returnPath, { replace: true })}
              className="rounded-[10px] border border-[#1f1f1f] bg-[#1f1f1f] px-4 py-2 text-[12px] text-white"
            >
              돌아가기
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};
