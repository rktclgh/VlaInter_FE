import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { hasAuthenticatedBrowserSession } from "../lib/authSessionMarker";
import { logout } from "../lib/authApi";

export const BrowserSessionGuard = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const guard = async () => {
      if (hasAuthenticatedBrowserSession()) {
        if (!cancelled) {
          setReady(true);
        }
        return;
      }

      try {
        await logout();
      } catch {
        // ignore logout failure and force fresh login flow
      }

      if (!cancelled) {
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
  }, [location.pathname, navigate]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-6 text-center">
        <p className="text-[14px] text-[#555]">브라우저 세션을 확인하는 중입니다...</p>
      </div>
    );
  }

  return children;
};
