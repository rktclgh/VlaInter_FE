import { Link } from "react-router-dom";

export const TopNav = () => {
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
                    <a href="#" className="hidden md:block">
                        서비스 소개
                    </a>
                    <a href="#" className="hidden md:block">
                        커뮤니티
                    </a>
                    <Link
                        to="/login"
                        className="bg-[linear-gradient(288deg,rgba(93,131,222,1)_0%,rgba(255,28,145,1)_100%)] bg-clip-text font-semibold text-transparent"
                    >
                        Login
                    </Link>
                </div>
            </nav>
        </header>
    );
};
