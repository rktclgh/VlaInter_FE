import { Link } from "react-router-dom";
import { usePublicLocale } from "../lib/publicLocale";

const COPY = {
  ko: {
    title: "합격의 페이스메이커 AI 면접 솔루션",
    contact: "문의",
    footerLinks: [
      { text: "서비스 소개", href: "/about" },
      { text: "이용약관", href: "/terms" },
      { text: "개인정보처리방침", href: "/privacy" },
    ],
  },
  en: {
    title: "AI interview solution built to keep your pace toward the offer",
    contact: "Contact",
    footerLinks: [
      { text: "About Service", href: "/about" },
      { text: "Terms of Service", href: "/terms" },
      { text: "Privacy Policy", href: "/privacy" },
    ],
  },
};

export const AuthFooter = () => {
  const { locale } = usePublicLocale();
  const copy = COPY[locale] || COPY.ko;

  return (
    <footer className="border-t border-[#ececec] py-9">
      <p className="text-center text-[12px] text-[#7a7a7a]">{copy.title}</p>
      <nav className="mt-4 flex items-center justify-center gap-6">
        {copy.footerLinks.map((item) => (
          <Link key={item.text} to={item.href} className="text-[10px] text-[#7a7a7a] hover:text-[#4d4d4d]">
            {item.text}
          </Link>
        ))}
      </nav>
      <p className="mt-3 text-center text-[10px] text-[#7a7a7a]">{copy.contact}: <a href="mailto:songchih@icloud.com" className="underline underline-offset-2">songchih@icloud.com</a></p>
    </footer>
  );
};
