import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { kakaoLogin } from "../../lib/authApi";

export const KakaoCallback = () => {
  const navigate = useNavigate();
  const [asyncErrorMessage, setAsyncErrorMessage] = useState("");
  const requestedRef = useRef(false);
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

  const kakaoError = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("error");
  }, []);

  const initialMessage = useMemo(() => {
    if (kakaoError) {
      return "카카오 로그인에 실패했습니다. 다시 시도해 주세요.";
    }
    if (!code) {
      return "인가 코드가 없습니다. 다시 시도해 주세요.";
    }
    return "";
  }, [code, kakaoError]);

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
        await kakaoLogin({
          code,
          redirectUri: kakaoRedirectUri,
          clientId: kakaoClientId || null,
        });
        sessionStorage.removeItem("kakao_client_id");
        sessionStorage.removeItem("kakao_redirect_uri");
        navigate("/content/interview", { replace: true });
      } catch (error) {
        setAsyncErrorMessage(error.message || "카카오 로그인 처리에 실패했습니다.");
      }
    };

    run();
  }, [code, initialMessage, kakaoClientId, kakaoRedirectUri, navigate]);

  const message = initialMessage || asyncErrorMessage || "카카오 로그인 처리 중입니다...";

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6 text-center">
      <p className="text-[14px] text-[#555]">{message}</p>
    </div>
  );
};
