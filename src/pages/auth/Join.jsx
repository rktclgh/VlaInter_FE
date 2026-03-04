import { useState } from "react";
import { Link } from "react-router-dom";

export const Join = () => {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        verificationCode: "",
        password: "",
        passwordConfirm: "",
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

    const handleInputChange = (field, value) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleSendVerificationCode = () => {
        console.log("Sending verification code to:", formData.email);
    };

    const handleVerifyCode = () => {
        console.log("Verifying code:", formData.verificationCode);
    };

    const handleVlinterSignup = () => {
        console.log("Vlinter ID signup:", formData);
    };

    const handleKakaoSignup = () => {
        console.log("Kakao signup");
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

            <main className="w-full px-6 flex flex-col items-center justify-center flex-1 mt-[120px] md:mt-[220px] md:w-[411px] md:px-0">
                <h1 className="[font-family:'Pretendard-SemiBold',Helvetica] font-semibold text-[#2d3748] text-xl leading-[21px] whitespace-nowrap text-center tracking-[0] mb-[50px]">
                    회원가입
                </h1>

                <form onSubmit={(e) => e.preventDefault()} className="w-full">
                    <div className="mb-[45px]">
                        <label
                            htmlFor="name"
                            className="[font-family:'Pretendard-SemiBold',Helvetica] font-semibold text-black text-sm leading-[21px] whitespace-nowrap block mb-2"
                        >
                            <span className="text-pink-500 mr-1">*</span>이름
                        </label>
                        <input
                            type="text"
                            id="name"
                            value={formData.name}
                            onChange={(e) => handleInputChange("name", e.target.value)}
                            placeholder="ex) 홍길동"
                            className="w-full h-[35px] border-b [border-bottom-style:solid] border-gray-300 [font-family:'Pretendard-Regular',Helvetica] font-normal text-black text-[14px] tracking-[0] leading-[normal] px-2 focus:border-gray-500 transition-colors"
                            aria-required="true"
                        />
                    </div>

                    <div className="mb-[30px]">
                        <label
                            htmlFor="email"
                            className="[font-family:'Pretendard-SemiBold',Helvetica] font-semibold text-black text-sm leading-[21px] whitespace-nowrap block mb-2"
                        >
                            <span className="text-pink-500 mr-1">*</span>이메일
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="email"
                                id="email"
                                value={formData.email}
                                onChange={(e) => handleInputChange("email", e.target.value)}
                                placeholder="ex) example@gmail.com"
                                className="flex-1 h-[35px] border-b [border-bottom-style:solid] border-gray-300 [font-family:'Pretendard-Regular',Helvetica] font-normal text-black text-[14px] tracking-[0] leading-[normal] px-2 focus:border-gray-500 transition-colors"
                                aria-required="true"
                            />
                            <button
                                type="button"
                                onClick={handleSendVerificationCode}
                                className="w-[100px] md:w-[109px] h-[35px] bg-[#f3f3f3] hover:bg-gray-200 transition-colors rounded-md [font-family:'Pretendard-Medium',Helvetica] font-medium text-[#777] text-xs md:text-sm leading-[normal] tracking-[0]"
                                aria-label="인증코드 발송"
                            >
                                인증코드 발송
                            </button>
                        </div>
                    </div>

                    <div className="mb-[45px]">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                id="verificationCode"
                                value={formData.verificationCode}
                                onChange={(e) => handleInputChange("verificationCode", e.target.value)}
                                placeholder="인증코드 7자리"
                                maxLength={7}
                                className="flex-1 min-w-[109px] h-[35px] border-b [border-bottom-style:solid] border-gray-300 [font-family:'Pretendard-Regular',Helvetica] font-normal text-black text-[14px] leading-[normal] tracking-[0] px-2 focus:border-gray-500 transition-colors"
                                aria-required="true"
                            />
                            <button
                                type="button"
                                onClick={handleVerifyCode}
                                className="w-[80px] h-[35px] bg-[#f3f3f3] hover:bg-gray-200 transition-colors rounded-md [font-family:'Pretendard-Medium',Helvetica] font-medium text-[#777] text-xs md:text-sm leading-[normal] tracking-[0]"
                                aria-label="인증코드 확인"
                            >
                                확인
                            </button>
                        </div>
                    </div>

                    <div className="mb-[45px]">
                        <label
                            htmlFor="password"
                            className="[font-family:'Pretendard-SemiBold',Helvetica] font-semibold text-black text-sm leading-[21px] whitespace-nowrap block mb-2"
                        >
                            <span className="text-pink-500 mr-1">*</span>비밀번호
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                id="password"
                                value={formData.password}
                                onChange={(e) => handleInputChange("password", e.target.value)}
                                placeholder="비밀번호를 입력하세요"
                                className="w-full h-[35px] border-b [border-bottom-style:solid] border-gray-300 [font-family:'Pretendard-Regular',Helvetica] font-normal text-black text-[14px] leading-[normal] tracking-[0] px-2 focus:border-gray-500 transition-colors"
                                aria-required="true"
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
                    </div>

                    <div className="mb-[60px]">
                        <label
                            htmlFor="passwordConfirm"
                            className="[font-family:'Pretendard-SemiBold',Helvetica] font-semibold text-black text-sm leading-[21px] whitespace-nowrap block mb-2"
                        >
                            <span className="text-pink-500 mr-1">*</span>비밀번호 확인
                        </label>
                        <div className="relative">
                            <input
                                type={showPasswordConfirm ? "text" : "password"}
                                id="passwordConfirm"
                                value={formData.passwordConfirm}
                                onChange={(e) => handleInputChange("passwordConfirm", e.target.value)}
                                placeholder="비밀번호를 한번 더 입력하세요"
                                className="w-full h-[35px] border-b [border-bottom-style:solid] border-gray-300 [font-family:'Pretendard-Regular',Helvetica] font-normal text-black text-[14px] leading-[normal] tracking-[0] px-2 focus:border-gray-500 transition-colors"
                                aria-required="true"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-bold px-2 py-1 bg-gray-100 rounded"
                                aria-label={showPasswordConfirm ? "비밀번호 숨기기" : "비밀번호 보기"}
                            >
                                {showPasswordConfirm ? "숨기기" : "보기"}
                            </button>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleVlinterSignup}
                        className="w-full h-12 bg-[#f3f3f3] rounded-[10px] hover:bg-gray-200 transition-colors text-black [font-family:'Pretendard-SemiBold',Helvetica] font-semibold text-base text-center tracking-[0.48px] leading-6 whitespace-nowrap mb-4"
                    >
                        Vlinter ID로 가입하기
                    </button>

                    <button
                        type="button"
                        onClick={handleKakaoSignup}
                        className="w-full h-12 bg-[#fee500] hover:bg-[#ffeb3b] transition-colors rounded-lg flex items-center justify-center gap-2"
                    >
                        <span className="[font-family:'Pretendard-SemiBold',Helvetica] font-semibold text-[#3c1e1e] text-[15px] text-center leading-[21px] whitespace-nowrap tracking-[0]">
                            카카오로 가입하기
                        </span>
                    </button>
                </form>
            </main>

            <footer className="w-full border-t border-gray-200 mt-24 py-8 px-4 flex flex-col items-center md:h-[205px] md:relative md:mt-auto md:border-t-[1px]">
                <p className="[font-family:'Pretendard-Regular',Helvetica] font-normal text-[#666666] text-sm md:text-base text-center leading-6 whitespace-nowrap mb-6 md:absolute md:top-16 md:left-1/2 md:-translate-x-1/2">
                    간편하고 안전한 행사 관리 솔루션
                </p>

                <nav
                    className="flex flex-wrap justify-center gap-4 md:absolute md:top-[120px] md:left-1/2 md:-translate-x-1/2 md:gap-[14px]"
                    aria-label="푸터 네비게이션"
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
