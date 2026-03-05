export const ContentTopNav = ({ point = "0P", onClickCharge }) => {
  return (
    <header className="fixed top-0 left-0 z-40 h-[54px] w-full border-b border-[#ececec] bg-white">
      <div className="relative h-full w-full">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 bg-[linear-gradient(143deg,#5d83de_0%,#ff1c91_100%)] bg-clip-text text-[24px] font-extrabold leading-none text-transparent">
          Vlainter
        </div>
        <div className="absolute right-4 top-1/2 inline-flex max-w-[calc(100vw-140px)] -translate-y-1/2 items-center gap-2">
          <button
            type="button"
            onClick={onClickCharge}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] border border-[#cfcfcf] text-[16px] font-semibold leading-none text-black"
            aria-label="포인트 충전 페이지 이동"
          >
            +
          </button>
          <div className="inline-flex min-w-0 items-center whitespace-nowrap rounded-[12px] border border-[#cfcfcf] px-3 py-1 text-[12px] font-semibold tracking-[0.02em] text-black">
            {point}
          </div>
        </div>
      </div>
    </header>
  );
};
