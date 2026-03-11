import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { TopNav } from "../../components/TopNav";
import eyeOpenIcon from "../../assets/icon/eye-open.svg";
import eyeOffIcon from "../../assets/icon/eye-off.svg";
import kakaoLoginButtonImage from "../../assets/icon/kakao_login_medium_wide.png";
import { logout, sendVerificationEmail, signup, verifyEmailCode } from "../../lib/authApi";
import { clearAuthenticatedBrowserSession, createKakaoOAuthState, storeKakaoOAuthState } from "../../lib/authSessionMarker";
import { AuthFooter } from "../../components/AuthFooter";

const labelClass = "mb-1 block text-[11px] font-semibold text-[#2f2f2f]";
const inputClass =
  "h-7 w-full border-b border-[#d9d9d9] text-[11px] text-[#2f2f2f] placeholder:text-[#c0c0c0]";
const EMAIL_REGEX = /^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$/;
const EMAIL_SEND_COOLDOWN_SECONDS = 60;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,100}$/;
const PASSWORD_GUIDE_TEXT = "8~100자, 영문 대/소문자, 숫자, 특수문자를 각각 1개 이상 포함해 주세요.";

export const Join = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    verificationCode: "",
    password: "",
    passwordConfirm: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [pendingSignup, setPendingSignup] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [agreedToPolicies, setAgreedToPolicies] = useState(false);
  const kakaoClientId = import.meta.env.VITE_KAKAO_CLIENT_ID || "";
  const kakaoRedirectUriFromEnv = import.meta.env.VITE_KAKAO_REDIRECT_URI || "";
  const kakaoRedirectUri =
    import.meta.env.DEV
      ? `${window.location.origin}/auth/kakao/callback`
      : kakaoRedirectUriFromEnv || `${window.location.origin}/auth/kakao/callback`;
  const kakaoAuthUri = import.meta.env.VITE_KAKAO_AUTH_URI || "https://kauth.kakao.com/oauth/authorize";

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  const isEmailFormatValid = useMemo(
    () => EMAIL_REGEX.test(formData.email.trim()),
    [formData.email]
  );
  const hasVerificationCodeInput = formData.verificationCode.trim().length > 0;
  const canSendVerificationCode = isEmailFormatValid && cooldownSeconds === 0 && !sendingCode;
  const canVerifyCode = isEmailFormatValid && hasVerificationCodeInput && !verifyingCode;
  const isPasswordFormatValid = PASSWORD_REGEX.test(formData.password);
  const isPasswordMatched =
    formData.password.length > 0 &&
    formData.passwordConfirm.length > 0 &&
    formData.password === formData.passwordConfirm;
  const canSubmitSignup = isPasswordMatched && isPasswordFormatValid && isEmailVerified && agreedToPolicies;

  const handleInputChange = (field, value) => {
    if (field === "email") {
      setIsEmailVerified(false);
    }
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSendVerificationCode = async () => {
    if (!isEmailFormatValid) {
      setErrorMessage("유효한 이메일 형식을 입력해 주세요.");
      return;
    }
    if (cooldownSeconds > 0) return;

    setSendingCode(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await sendVerificationEmail(formData.email.trim());
      setIsEmailVerified(false);
      setCooldownSeconds(EMAIL_SEND_COOLDOWN_SECONDS);
      setSuccessMessage("인증 코드를 발송했습니다.");
    } catch (error) {
      if (error.status === 429) {
        setCooldownSeconds((prev) => (prev > 0 ? prev : EMAIL_SEND_COOLDOWN_SECONDS));
      }
      setErrorMessage(error.message);
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!formData.email.trim() || !formData.verificationCode.trim()) {
      setErrorMessage("이메일과 인증 코드를 입력해 주세요.");
      return;
    }
    setVerifyingCode(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await verifyEmailCode(formData.email.trim(), formData.verificationCode.trim());
      setIsEmailVerified(true);
      setSuccessMessage("이메일 인증이 완료되었습니다.");
    } catch (error) {
      setIsEmailVerified(false);
      setErrorMessage(error.message);
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleJoin = async () => {
    if (!formData.name.trim() || !formData.email.trim() || !formData.password || !formData.passwordConfirm) {
      setErrorMessage("필수 항목을 모두 입력해 주세요.");
      return;
    }
    if (formData.password !== formData.passwordConfirm) {
      setErrorMessage("비밀번호와 비밀번호 확인이 일치하지 않습니다.");
      return;
    }
    if (!isPasswordFormatValid) {
      setErrorMessage(PASSWORD_GUIDE_TEXT);
      return;
    }
    if (!isEmailVerified) {
      setErrorMessage("이메일 인증을 먼저 완료해 주세요.");
      return;
    }
    if (!agreedToPolicies) {
      setErrorMessage("이용약관 및 개인정보처리방침에 동의해 주세요.");
      return;
    }

    setPendingSignup(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await signup({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
      });
      navigate("/login");
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setPendingSignup(false);
    }
  };

  const handleKakaoJoin = async () => {
    if (!kakaoClientId) {
      setErrorMessage("카카오 클라이언트 ID 설정이 필요합니다.");
      return;
    }
    clearAuthenticatedBrowserSession();
    try {
      await logout();
    } catch {
      // ignore: stale sessions should not block a fresh Kakao login attempt
    }
    const state = createKakaoOAuthState();
    storeKakaoOAuthState(state);
    const params = new URLSearchParams({
      response_type: "code",
      client_id: kakaoClientId,
      redirect_uri: kakaoRedirectUri,
      prompt: "login",
      state,
    });
    const authorizeUrl = `${kakaoAuthUri}?${params.toString()}`;
    sessionStorage.setItem("kakao_redirect_uri", kakaoRedirectUri);
    sessionStorage.setItem("kakao_client_id", kakaoClientId);
    window.location.href = authorizeUrl;
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-white">
      <TopNav />

      <div className="flex min-h-[calc(100vh-54px)] flex-col pt-[54px]">
        <main className="flex flex-1 items-center justify-center px-6 py-14">
          <section className="w-full max-w-[410px]">
            <header className="text-center">
              <h1 className="bg-[linear-gradient(145deg,#5D83DE_0%,#FF1C91_100%)] bg-clip-text text-[54px] font-medium leading-none text-transparent">
                Vlainter
              </h1>
              <p className="mt-1 text-[12px] text-[#7e7e7e]">회원가입</p>
            </header>

            <form className="mt-8" onSubmit={(e) => e.preventDefault()}>
              <div className="mb-3">
                <label className={labelClass} htmlFor="join-name">
                  <span className="text-[#ff3a3a]">*</span> 이름
                </label>
                <input
                  id="join-name"
                  type="text"
                  className={inputClass}
                  placeholder="이름 입력"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                />
              </div>

              <div className="mb-3">
                <label className={labelClass} htmlFor="join-email">
                  <span className="text-[#ff3a3a]">*</span> 이메일
                </label>
                <div className="flex items-end gap-2">
                  <input
                    id="join-email"
                    type="email"
                    className={`${inputClass} ${isEmailVerified ? "text-[#8a8a8a]" : ""}`}
                    placeholder="ex) example1234@gmail.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    disabled={isEmailVerified}
                  />
                  {!isEmailVerified && (
                    <button
                      type="button"
                      onClick={handleSendVerificationCode}
                      disabled={!canSendVerificationCode}
                      className={`h-6 shrink-0 rounded px-3 text-[10px] ${canSendVerificationCode ? "bg-black text-white" : "bg-[#f4f4f4] text-[#b1b1b1]"}`}
                    >
                      {sendingCode
                        ? "발송 중"
                        : cooldownSeconds > 0
                          ? `${cooldownSeconds}초`
                          : "인증코드 발송"}
                    </button>
                  )}
                </div>
                {isEmailVerified && (
                  <p className="mt-1 text-[11px] font-medium text-[#2f8f4e]">이메일 인증이 완료되었습니다.</p>
                )}
              </div>

              {!isEmailVerified && (
                <div className="mb-3">
                  <div className="flex items-end gap-2">
                    <input
                      type="text"
                      className={inputClass}
                      placeholder="인증코드 7자리"
                      value={formData.verificationCode}
                      onChange={(e) => handleInputChange("verificationCode", e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={handleVerifyCode}
                      disabled={!canVerifyCode}
                      className={`h-6 shrink-0 rounded px-4 text-[10px] ${canVerifyCode ? "bg-black text-white" : "bg-[#f4f4f4] text-[#b1b1b1]"}`}
                    >
                      {verifyingCode ? "확인 중" : "확인"}
                    </button>
                  </div>
                </div>
              )}

              <div className="mb-3">
                <label className={labelClass} htmlFor="join-password">
                  <span className="text-[#ff3a3a]">*</span> 비밀번호
                </label>
                <div className="relative">
                  <input
                    id="join-password"
                    type={showPassword ? "text" : "password"}
                    className={`${inputClass} pr-7`}
                    placeholder="비밀번호를 입력해주세요"
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
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
                <p className={`mt-1 text-[10px] ${formData.password && !isPasswordFormatValid ? "text-[#ff3a3a]" : "text-[#7e7e7e]"}`}>
                  {PASSWORD_GUIDE_TEXT}
                </p>
              </div>

              <div className="mb-6">
                <label className={labelClass} htmlFor="join-password-confirm">
                  <span className="text-[#ff3a3a]">*</span> 비밀번호 확인
                </label>
                <div className="relative">
                  <input
                    id="join-password-confirm"
                    type={showPasswordConfirm ? "text" : "password"}
                    className={`${inputClass} pr-7`}
                    placeholder="비밀번호를 한번 더 입력하세요"
                    value={formData.passwordConfirm}
                    onChange={(e) => handleInputChange("passwordConfirm", e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute right-0 top-1/2 -translate-y-1/2"
                    onClick={() => setShowPasswordConfirm((prev) => !prev)}
                    aria-label={showPasswordConfirm ? "비밀번호 숨기기" : "비밀번호 보기"}
                  >
                    <img src={showPasswordConfirm ? eyeOffIcon : eyeOpenIcon} alt="" className="h-4 w-4" />
                  </button>
                </div>
                {formData.passwordConfirm ? (
                  <p className={`mt-1 text-[10px] ${isPasswordMatched ? "text-[#2f8f4e]" : "text-[#ff3a3a]"}`}>
                    {isPasswordMatched ? "비밀번호가 일치합니다." : "비밀번호가 일치하지 않습니다."}
                  </p>
                ) : null}
              </div>

              <label className="mb-6 flex items-start gap-3 rounded-[10px] border border-[#e4e4e4] bg-[#fafafa] px-3 py-3">
                <input
                  type="checkbox"
                  checked={agreedToPolicies}
                  onChange={(event) => setAgreedToPolicies(event.target.checked)}
                  className="peer sr-only"
                />
                <span className="mt-[1px] inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border border-[#bfc4ce] bg-white text-[12px] font-bold text-white peer-checked:border-[#171b24] peer-checked:bg-[#171b24]">
                  {agreedToPolicies ? "✓" : ""}
                </span>
                <span className="text-[11px] leading-[1.7] text-[#4a4a4a]">
                  <span className="font-semibold text-[#222]">[필수]</span>{" "}
                  <Link to="/terms" target="_blank" rel="noreferrer" className="font-semibold text-[#171b24] underline underline-offset-2">
                    이용약관
                  </Link>
                  {" "}및{" "}
                  <Link to="/privacy" target="_blank" rel="noreferrer" className="font-semibold text-[#171b24] underline underline-offset-2">
                    개인정보처리방침
                  </Link>
                  에 동의합니다.
                </span>
              </label>

              <button
                type="button"
                onClick={handleJoin}
                disabled={pendingSignup || !canSubmitSignup}
                className={`h-11 w-full rounded-[8px] text-[12px] font-semibold ${
                  canSubmitSignup
                    ? "bg-black text-white"
                    : "bg-[#ececec] text-[#d1d1d1]"
                }`}
              >
                {pendingSignup ? "가입 중..." : "Vlainter ID로 가입하기"}
              </button>

              {errorMessage && <p className="mt-2 text-[11px] text-[#ff3a3a]">{errorMessage}</p>}
              {successMessage && <p className="mt-2 text-[11px] text-[#2f8f4e]">{successMessage}</p>}

              <button
                type="button"
                onClick={handleKakaoJoin}
                className="mx-auto mt-3 block h-[45px] w-full max-w-[300px]"
              >
                <img src={kakaoLoginButtonImage} alt="카카오 로그인" className="h-full w-full" />
              </button>
            </form>
          </section>
        </main>

        <AuthFooter />
      </div>
    </div>
  );
};
