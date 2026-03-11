import { Link } from "react-router-dom";

const footerLinks = [
  { text: "이용약관", href: "/terms" },
  { text: "개인정보처리방침", href: "/privacy" },
];

export const AuthFooter = () => {
  return (
    <footer className="border-t border-[#ececec] py-9">
      <p className="text-center text-[12px] text-[#7a7a7a]">합격의 페이스메이커 AI 면접 솔루션</p>
      <nav className="mt-4 flex items-center justify-center gap-6">
        {footerLinks.map((item) => (
          <Link key={item.text} to={item.href} className="text-[10px] text-[#7a7a7a] hover:text-[#4d4d4d]">
            {item.text}
          </Link>
        ))}
      </nav>
      <p className="mt-3 text-center text-[10px] text-[#7a7a7a]">문의: <a href="mailto:songchih@icloud.com" className="underline underline-offset-2">songchih@icloud.com</a></p>
    </footer>
  );
};
