import { useState } from "react";
import { Link } from "react-router-dom";
import { usePublicLocale } from "../lib/publicLocale";

const COPY = {
  ko: {
    about: "서비스 소개",
    join: "회원가입",
    login: "로그인",
    languageLabel: "KOR",
  },
  en: {
    about: "About",
    join: "Join",
    login: "Log In",
    languageLabel: "ENG",
  },
};

export const TopNav = () => {
    const { locale, setLocale } = usePublicLocale();
    const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
    const copy = COPY[locale] || COPY.ko;

    return (
        <header className="fixed top-0 left-0 z-50 h-[54px] w-full bg-white shadow-[0_1px_3px_0_rgba(0,0,0,0.25)]">
            <nav className="mx-auto flex h-full w-full max-w-[1256px] items-center justify-between px-5 md:px-10">
                <Link
                    to="/"
                    className="bg-[linear-gradient(143deg,rgba(93,131,222,1)_0%,rgba(255,28,145,1)_100%)] bg-clip-text text-[24px] font-extrabold leading-none text-transparent"
                >
                    Vlainter
                </Link>

                <div className="flex items-center gap-6 text-[13px] leading-[17px] text-black md:gap-9">
                    <Link to="/about" className="hidden md:block">
                        {copy.about}
                    </Link>
                    <Link to="/join" className="hidden md:block">
                        {copy.join}
                    </Link>
                    <Link
                        to="/login"
                        className="bg-[linear-gradient(288deg,rgba(93,131,222,1)_0%,rgba(255,28,145,1)_100%)] bg-clip-text font-semibold text-transparent"
                    >
                        {copy.login}
                    </Link>
                    <div className="relative block">
                        <button
                            type="button"
                            className="inline-flex items-center gap-1 text-[12px] text-[#555] transition hover:text-black"
                            onClick={() => setIsLanguageMenuOpen((prev) => !prev)}
                        >
                            {copy.languageLabel} <span className="text-[10px]">▼</span>
                        </button>
                        {isLanguageMenuOpen ? (
                            <div className="absolute right-0 top-[calc(100%+0.55rem)] min-w-[5.25rem] rounded-[12px] border border-[#e4e7ee] bg-white p-1.5 shadow-[0_14px_36px_rgba(23,27,36,0.12)]">
                                <button
                                    type="button"
                                    className={`block w-full rounded-[8px] px-3 py-2 text-left text-[11px] transition ${locale === "ko" ? "bg-[#f3f5fa] text-[#171b24]" : "text-[#666] hover:bg-[#f7f8fb] hover:text-[#171b24]"}`}
                                    onClick={() => {
                                        setLocale("ko");
                                        setIsLanguageMenuOpen(false);
                                    }}
                                >
                                    KOR
                                </button>
                                <button
                                    type="button"
                                    className={`mt-1 block w-full rounded-[8px] px-3 py-2 text-left text-[11px] transition ${locale === "en" ? "bg-[#f3f5fa] text-[#171b24]" : "text-[#666] hover:bg-[#f7f8fb] hover:text-[#171b24]"}`}
                                    onClick={() => {
                                        setLocale("en");
                                        setIsLanguageMenuOpen(false);
                                    }}
                                >
                                    ENG
                                </button>
                            </div>
                        ) : null}
                    </div>
                </div>
            </nav>
        </header>
    );
};
