import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { TopNav } from "../../components/TopNav";
import eyeOpenIcon from "../../assets/icon/eye-open.svg";
import eyeOffIcon from "../../assets/icon/eye-off.svg";
import kakaoLoginButtonImage from "../../assets/icon/kakao_login_medium_wide.png";
import { login } from "../../lib/authApi";

const footerLinks = [
  { text: "이용약관", href: "#" },
  { text: "개인정보처리방침", href: "#" },
  { text: "고객센터", href: "#" },
  { text: "회사소개", href: "#" },
];

const inputClass =
  "h-8 w-full border-b border-[#d9d9d9] text-[11px] text-[#2f2f2f] placeholder:text-[#c0c0c0]";

export const Login = () => {
  const navigate = useNavigate();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const kakaoClientId = import.meta.env.VITE_KAKAO_CLIENT_ID || "";
  const kakaoRedirectUriFromEnv = import.meta.env.VITE_KAKAO_REDIRECT_URI || "";
  const kakaoRedirectUri =
    import.meta.env.DEV
      ? `${window.location.origin}/auth/kakao/callback`
      : kakaoRedirectUriFromEnv || `${window.location.origin}/auth/kakao/callback`;
  const kakaoAuthUri = import.meta.env.VITE_KAKAO_AUTH_URI || "https://kauth.kakao.com/oauth/authorize";

  const handleLogin = async () => {
    if (!loginId.trim() || !password.trim()) {
      setErrorMessage("이메일과 비밀번호를 모두 입력해 주세요.");
      return;
    }

    setPending(true);
    setErrorMessage("");
    try {
      await login({
        email: loginId.trim(),
        password,
      });
      navigate("/");
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setPending(false);
    }
  };

  const handleKakaoLogin = () => {
    if (!kakaoClientId) {
      setErrorMessage("카카오 클라이언트 ID 설정이 필요합니다.");
      return;
    }
    const params = new URLSearchParams({
      response_type: "code",
      client_id: kakaoClientId,
      redirect_uri: kakaoRedirectUri,
    });
    const authorizeUrl = `${kakaoAuthUri}?${params.toString()}`;
    sessionStorage.setItem("kakao_redirect_uri", kakaoRedirectUri);
    sessionStorage.setItem("kakao_client_id", kakaoClientId);
    console.info("[KAKAO_AUTH_URL]", authorizeUrl);
    console.info("[KAKAO_AUTH_CONFIG]", {
      clientId: kakaoClientId,
      redirectUri: kakaoRedirectUri,
      origin: window.location.origin,
    });
    window.location.href = authorizeUrl;
  };

  return (
    <div className="min-h-screen w-full bg-white">
      <TopNav />

      <div className="flex min-h-[calc(100vh-54px)] flex-col pt-[54px]">
        <main className="flex flex-1 items-center justify-center px-6 py-14">
          <section className="w-full max-w-[410px]">
            <header className="text-center">
              <h1 className="bg-[linear-gradient(145deg,#5D83DE_0%,#FF1C91_100%)] bg-clip-text text-[54px] font-medium leading-none text-transparent">
                Vlainter
              </h1>
              <p className="mt-1 text-[12px] text-[#7e7e7e]">로그인</p>
            </header>

            <form className="mt-8" onSubmit={(e) => e.preventDefault()}>
              <div className="mb-3">
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="이메일"
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                  />
              </div>

              <div className="mb-4">
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    className={`${inputClass} pr-7`}
                    placeholder="비밀번호"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute right-0 top-1/2 -translate-y-1/2"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                  >
                    <img src={showPassword ? eyeOffIcon : eyeOpenIcon} alt="" className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end text-[11px] font-medium text-[#9d9d9d]">
                <div className="flex items-center gap-2.5">
                  <a href="#" className="hover:text-[#7f7f7f]">
                    비밀번호 찾기
                  </a>
                  <span>|</span>
                  <Link to="/join" className="hover:text-[#7f7f7f]">
                    회원가입
                  </Link>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogin}
                disabled={pending}
                className="mx-auto mt-4 block h-[45px] w-full max-w-[300px] rounded-[8px] bg-[linear-gradient(138deg,#5D83DE_0%,#FF1C91_100%)] text-[12px] font-semibold text-white"
              >
                {pending ? "로그인 중..." : "Vlainter ID 로그인"}
              </button>

              {errorMessage && <p className="mt-2 text-[11px] text-[#ff3a3a]">{errorMessage}</p>}

              <button
                type="button"
                onClick={handleKakaoLogin}
                className="mx-auto mt-3 block h-[45px] w-full max-w-[300px]"
              >
                <img src={kakaoLoginButtonImage} alt="카카오 로그인" className="h-full w-full" />
              </button>
            </form>
          </section>
        </main>

        <footer className="border-t border-[#ececec] py-9">
          <p className="text-center text-[12px] text-[#7a7a7a]">간편하고 안전한 행사 관리 솔루션</p>
          <nav className="mt-4 flex items-center justify-center gap-6">
            {footerLinks.map((item) => (
              <a key={item.text} href={item.href} className="text-[10px] text-[#7a7a7a]">
                {item.text}
              </a>
            ))}
          </nav>
        </footer>
      </div>
    </div>
  );
};
