import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { kakaoLogin, logout } from "../../lib/authApi";
import { clearAuthenticatedBrowserSession, consumeKakaoOAuthState } from "../../lib/authSessionMarker";
import { usePublicLocale } from "../../lib/publicLocale";

export const KakaoCallback = () => {
  const navigate = useNavigate();
  const { locale } = usePublicLocale();
  const [asyncErrorMessage, setAsyncErrorMessage] = useState("");
  const [expectedState] = useState(() => consumeKakaoOAuthState() || "");
  const requestedRef = useRef(false);
  const localeRef = useRef(locale);
  const kakaoClientIdFromEnv = import.meta.env.VITE_KAKAO_CLIENT_ID || "";
  const kakaoRedirectUriFromEnv = import.meta.env.VITE_KAKAO_REDIRECT_URI || "";
  const kakaoClientIdFromSession = sessionStorage.getItem("kakao_client_id") || "";
  const kakaoRedirectUriFromSession = sessionStorage.getItem("kakao_redirect_uri") || "";
  const kakaoClientId = kakaoClientIdFromSession || kakaoClientIdFromEnv;
  const kakaoRedirectUri =
    kakaoRedirectUriFromSession ||
    (import.meta.env.DEV
      ? `${window.location.origin}/auth/kakao/callback`
      : kakaoRedirectUriFromEnv || `${window.location.origin}/auth/kakao/callback`);

  const code = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("code");
  }, []);

  const returnedState = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("state") || "";
  }, []);

  const kakaoError = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("error");
  }, []);

  useEffect(() => {
    localeRef.current = locale;
  }, [locale]);

  const initialMessage = useMemo(() => {
    if (kakaoError) {
      return locale === "en"
        ? "Kakao sign-in failed. Please try again."
        : "카카오 로그인에 실패했습니다. 다시 시도해 주세요.";
    }
    if (expectedState && returnedState !== expectedState) {
      return locale === "en"
        ? "Kakao sign-in request validation failed. Please try again."
        : "카카오 로그인 요청 검증에 실패했습니다. 다시 시도해 주세요.";
    }
    if (!code) {
      return locale === "en"
        ? "Authorization code is missing. Please try again."
        : "인가 코드가 없습니다. 다시 시도해 주세요.";
    }
    return "";
  }, [code, expectedState, kakaoError, locale, returnedState]);

  useEffect(() => {
    if (initialMessage) {
      return;
    }
    if (requestedRef.current) {
      return;
    }
    requestedRef.current = true;

    const run = async () => {
      try {
        clearAuthenticatedBrowserSession();
        try {
          await logout();
        } catch {
          // ignore: stale sessions should not block Kakao callback processing
        }
        await kakaoLogin({
          code,
          redirectUri: kakaoRedirectUri,
          clientId: kakaoClientId || null,
        });
        sessionStorage.removeItem("kakao_client_id");
        sessionStorage.removeItem("kakao_redirect_uri");
        navigate("/content/interview", { replace: true });
      } catch (error) {
        setAsyncErrorMessage(
          error.message ||
            (localeRef.current === "en"
              ? "Failed to process Kakao sign-in."
              : "카카오 로그인 처리에 실패했습니다."),
        );
      }
    };

    run();
  }, [code, initialMessage, kakaoClientId, kakaoRedirectUri, navigate]);

  const message =
    initialMessage ||
    asyncErrorMessage ||
    (locale === "en" ? "Processing Kakao sign-in..." : "카카오 로그인 처리 중입니다...");

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6 text-center">
      <p className="text-[14px] text-[#555]">{message}</p>
    </div>
  );
};
