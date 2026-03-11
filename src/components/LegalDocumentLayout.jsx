import { TopNav } from "./TopNav";
import { AuthFooter } from "./AuthFooter";

export const LegalDocumentLayout = ({ title, updatedAt, children }) => {
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-white">
      <TopNav />
      <div className="flex min-h-[calc(100vh-54px)] flex-col pt-[54px]">
        <main className="flex-1 px-6 py-10">
          <section className="mx-auto w-full max-w-[900px] rounded-[24px] border border-[#eceff5] bg-white px-6 py-8 shadow-[0_18px_60px_rgba(23,27,36,0.06)] md:px-10">
            <header className="border-b border-[#edf1f5] pb-5">
              <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#6a7aa1]">Legal</p>
              <h1 className="mt-3 text-[28px] font-semibold text-[#171b24]">{title}</h1>
              <p className="mt-2 text-[13px] text-[#6a7282]">최종 개정일: {updatedAt}</p>
            </header>
            <div className="mt-8 space-y-8 text-[14px] leading-[1.8] text-[#2b3240]">{children}</div>
          </section>
        </main>
        <AuthFooter />
      </div>
    </div>
  );
};
