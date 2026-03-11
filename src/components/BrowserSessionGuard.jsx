import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  clearAuthenticatedBrowserSession,
  hasAuthenticatedBrowserSession,
  markAuthenticatedBrowserSession,
} from "../lib/authSessionMarker";
import { getMyProfile } from "../lib/userApi";
import { extractProfile } from "../lib/profileUtils";

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
        const payload = await getMyProfile();
        const profile = extractProfile(payload);
        if (profile?.userId != null) {
          markAuthenticatedBrowserSession(profile.userId);
        }
        if (!cancelled) {
          setReady(true);
        }
        return;
      } catch {
        clearAuthenticatedBrowserSession();
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
