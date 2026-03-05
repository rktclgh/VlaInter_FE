import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TopNav } from "../../components/TopNav";
import { sendTemporaryPassword } from "../../lib/authApi";

const footerLinks = [
  { text: "이용약관", href: "#" },
  { text: "개인정보처리방침", href: "#" },
  { text: "고객센터", href: "#" },
  { text: "회사소개", href: "#" },
];

const inputClass =
  "h-8 w-full border-b border-[#d9d9d9] text-[11px] text-[#2f2f2f] placeholder:text-[#c0c0c0]";

export const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSendTemporaryPassword = async () => {
    if (!email.trim() || !name.trim()) {
      setSuccessMessage("");
      setErrorMessage("이메일과 이름을 모두 입력해 주세요.");
      return;
    }

    setPending(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const response = await sendTemporaryPassword(email.trim(), name.trim());
      setSuccessMessage(response?.message || "임시 비밀번호를 이메일로 발송했습니다.");
      setCooldownSeconds(60);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setPending(false);
    }
  };

  useEffect(() => {
    if (cooldownSeconds <= 0) return undefined;
    const timerId = window.setTimeout(() => {
      setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearTimeout(timerId);
  }, [cooldownSeconds]);

  const isSendDisabled = pending || cooldownSeconds > 0;

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
              <p className="mt-1 text-[12px] text-[#7e7e7e]">비밀번호 찾기</p>
            </header>

            <form className="mt-8" onSubmit={(e) => e.preventDefault()}>
              <div className="mb-3">
                <input
                  type="text"
                  className={inputClass}
                  placeholder="이메일"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="mb-4">
                <input
                  type="text"
                  className={inputClass}
                  placeholder="이름"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="mt-4 flex items-center justify-end text-[11px] font-medium text-[#9d9d9d]">
                <Link to="/login" className="hover:text-[#7f7f7f]">
                  로그인으로 돌아가기
                </Link>
              </div>

              <button
                type="button"
                onClick={handleSendTemporaryPassword}
                disabled={isSendDisabled}
                className="mx-auto mt-4 block h-[45px] w-full max-w-[300px] rounded-[8px] bg-[linear-gradient(138deg,#5D83DE_0%,#FF1C91_100%)] text-[12px] font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#c8c8c8] disabled:bg-none disabled:text-[#6f6f6f]"
              >
                {pending ? "발송 중..." : cooldownSeconds > 0 ? `${cooldownSeconds}초 후 재시도` : "임시 비밀번호 발송"}
              </button>

              {errorMessage ? <p className="mt-2 text-[11px] text-[#ff3a3a]">{errorMessage}</p> : null}
              {successMessage ? <p className="mt-2 text-[11px] text-[#1f8b4c]">{successMessage}</p> : null}
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
