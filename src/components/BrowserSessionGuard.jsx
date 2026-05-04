import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  clearAuthenticatedBrowserSession,
  hasAuthenticatedBrowserSession,
  markAuthenticatedBrowserSession,
} from "../lib/authSessionMarker";
import { isAuthenticationError } from "../lib/apiClient";
import { requestServerLogout } from "../lib/authApi";
import { resetAdminStatusCache } from "../hooks/useAdminStatus";
import { getMyProfile, resetMyProfileCache } from "../lib/userApi";

export const BrowserSessionGuard = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [reloadSeed, setReloadSeed] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const guard = async () => {
      setLoadError("");
      setReady(false);

      try {
        await getMyProfile();
        if (cancelled) {
          return;
        }
        markAuthenticatedBrowserSession();
        setReady(true);
        return;
      } catch (error) {
        if (!isAuthenticationError(error)) {
          if (!cancelled) {
            setLoadError("서버 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.");
          }
          return;
        }
        if (cancelled) {
          return;
        }
        if (hasAuthenticatedBrowserSession()) {
          if (cancelled) {
            return;
          }
          try {
            await requestServerLogout();
          } catch {
            // ignore logout failure and continue clearing client marker
          }
          if (cancelled) {
            return;
          }
        }
        clearAuthenticatedBrowserSession();
        resetMyProfileCache();
        resetAdminStatusCache();
      }

      if (!cancelled) {
        setReady(false);
        navigate("/login", {
          replace: true,
          state: { redirectedFrom: location.pathname },
        });
      }
    };

    guard();

    return () => {
      cancelled = true;
    };
  }, [location.pathname, navigate, reloadSeed]);

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-6 text-center">
        <div className="w-full max-w-[440px] rounded-[20px] border border-[#e5e7eb] bg-white px-6 py-7 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
          <p className="text-[12px] font-semibold tracking-[0.08em] text-[#6b7280]">ACCESS CHECK FAILED</p>
          <h2 className="mt-2 text-[22px] font-semibold text-[#111827]">보호된 화면을 열 수 없습니다</h2>
          <p className="mt-3 whitespace-pre-line text-[14px] leading-[1.7] text-[#4b5563]">{loadError}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => setReloadSeed((prev) => prev + 1)}
              className="rounded-[12px] border border-[#d1d5db] px-4 py-2.5 text-[13px] font-semibold text-[#374151]"
            >
              다시 시도
            </button>
            <button
              type="button"
              onClick={() => navigate("/", { replace: true })}
              className="rounded-[12px] bg-[#111827] px-4 py-2.5 text-[13px] font-semibold text-white"
            >
              홈으로 이동
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-6 text-center">
        <p className="text-[14px] text-[#555]">브라우저 세션을 확인하는 중입니다...</p>
      </div>
    );
  }

  return children;
};
