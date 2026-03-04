import { useState } from "react";
import { Link } from "react-router-dom";

export const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
    };

    const handleKakaoLogin = () => {
        console.log("Kakao login clicked");
    };

    const footerLinks = [
        { text: "이용약관", href: "#" },
        { text: "개인정보처리방침", href: "#" },
        { text: "고객센터", href: "#" },
        { text: "회사소개", href: "#" },
    ];

    return (
        <div className="bg-white w-full min-h-screen relative flex flex-col items-center justify-between pb-8 overflow-x-hidden md:min-w-[1256px]">
            <header className="absolute top-[37px] left-4 md:left-[41px] z-50">
                <Link to="/">
                    <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#5d83de] to-[#ff1c91] font-['Pretendard-Bold'] inline-block select-none cursor-pointer">
                        Vlinter
                    </span>
                </Link>
            </header>

            <main className="w-full px-6 flex flex-col items-center justify-center flex-1 mt-[120px] md:mt-[272px] md:w-[411px] md:px-0">
                <h1 className="[font-family:'Pretendard-SemiBold',Helvetica] font-semibold text-[#2d3748] text-xl leading-[21px] whitespace-nowrap text-center tracking-[0] mb-[50px]">
                    로그인
                </h1>

                <form onSubmit={handleSubmit} className="w-full space-y-[45px]">
                    <div className="relative">
                        <label htmlFor="email" className="sr-only">
                            이메일
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="이메일"
                            className="w-full h-[40px] border-b [border-bottom-style:solid] border-gray-300 [font-family:'Pretendard-Regular',Helvetica] font-normal text-black text-[15px] leading-[normal] tracking-[0] px-[7px] py-0 focus:border-gray-500 transition-colors"
                            required
                        />
                    </div>

                    <div className="relative">
                        <label htmlFor="password" className="sr-only">
                            비밀번호
                        </label>
                        <input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="비밀번호"
                            className="w-full h-[40px] border-b [border-bottom-style:solid] border-gray-300 [font-family:'Pretendard-Regular',Helvetica] font-normal text-black text-[15px] leading-[normal] tracking-[0] px-[7px] py-0 focus:border-gray-500 transition-colors"
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-bold px-2 py-1 bg-gray-100 rounded"
                            aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                        >
                            {showPassword ? "숨기기" : "보기"}
                        </button>
                    </div>

                    <div className="flex items-center">
                        <input
                            id="remember-me"
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                        />
                        <label
                            htmlFor="remember-me"
                            className="ml-2 flex items-center [font-family:'Pretendard-Regular',Helvetica] font-normal text-gray-600 text-[13px] leading-[normal] whitespace-nowrap tracking-[0] cursor-pointer"
                        >
                            로그인 상태 유지
                        </label>
                    </div>

                    <button
                        type="submit"
                        className="w-full h-12 rounded-[10px] bg-[linear-gradient(138deg,rgba(93,131,222,1)_0%,rgba(255,28,145,1)_100%)] [font-family:'Pretendard-SemiBold',Helvetica] font-semibold text-white text-base text-center tracking-[0.48px] leading-6 whitespace-nowrap transition-transform hover:scale-[1.02]"
                    >
                        Vlinter ID 로그인
                    </button>
                </form>

                <nav
                    className="flex w-full justify-between items-center mt-[20px]"
                    aria-label="계정 관리"
                >
                    <div className="flex gap-4">
                        <a
                            href="#"
                            className="[font-family:'Pretendard-Regular',Helvetica] font-normal text-[#999999] text-[12px] leading-[21px] whitespace-nowrap tracking-[0] hover:text-gray-700"
                        >
                            아이디 찾기
                        </a>
                        <a
                            href="#"
                            className="[font-family:'Pretendard-Regular',Helvetica] font-normal text-[#999999] text-[12px] leading-[21px] whitespace-nowrap tracking-[0] hover:text-gray-700"
                        >
                            비밀번호 찾기
                        </a>
                    </div>
                    <Link
                        to="/join"
                        className="[font-family:'Pretendard-Regular',Helvetica] font-normal text-[#5d83de] text-[12px] leading-[21px] underline whitespace-nowrap tracking-[0] hover:text-blue-700 font-bold"
                    >
                        계정이 없으신가요?
                    </Link>
                </nav>

                <button
                    type="button"
                    onClick={handleKakaoLogin}
                    className="w-full h-12 bg-[#fee500] rounded-[10px] mt-[32px] relative overflow-hidden flex items-center justify-center transition-transform hover:scale-[1.02]"
                    aria-label="카카오 로그인"
                >
                    <span className="[font-family:'Pretendard-SemiBold',Helvetica] font-semibold text-[#3c1e1e] text-[14px] text-center whitespace-nowrap tracking-[0]">
                        카카오 로그인
                    </span>
                </button>
            </main>

            <footer className="w-full border-t border-gray-200 mt-24 py-8 px-4 flex flex-col items-center md:h-[205px] md:relative md:mt-auto md:border-t-[1px]">
                <p className="[font-family:'Pretendard-Regular',Helvetica] font-normal text-[#666666] text-sm md:text-base text-center leading-6 whitespace-nowrap mb-6 md:absolute md:top-16 md:left-1/2 md:-translate-x-1/2">
                    간편하고 안전한 행사 관리 솔루션
                </p>

                <nav
                    className="flex flex-wrap justify-center gap-4 md:absolute md:top-[120px] md:left-1/2 md:-translate-x-1/2 md:gap-[14px]"
                    aria-label="푸터 링크"
                >
                    {footerLinks.map((link, index) => (
                        <a
                            key={index}
                            href={link.href}
                            className="[font-family:'Pretendard-Regular',Helvetica] font-normal text-[#666666] text-xs md:text-sm text-center leading-[21px] whitespace-nowrap tracking-[0] hover:text-gray-900"
                        >
                            {link.text}
                        </a>
                    ))}
                </nav>
            </footer>
        </div>
    );
};
