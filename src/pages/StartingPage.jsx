import { TopNav } from "../components/TopNav";
import { Link } from "react-router-dom";
import icon11st from "../assets/icon/11st.png";
import iconDaum from "../assets/icon/Daum.png";
import iconHmail from "../assets/icon/Hmail.png";
import iconHyundaicard from "../assets/icon/Hyundaicard.png";
import iconSeason from "../assets/icon/Season.png";
import iconCgv from "../assets/icon/cgv.png";
import iconCj from "../assets/icon/cj.png";
import iconHana from "../assets/icon/hana.png";
import iconJtbc from "../assets/icon/jtbc.png";
import iconKasa from "../assets/icon/kasa.png";
import iconKb from "../assets/icon/kb.png";
import iconKbs from "../assets/icon/kbs.png";
import iconKt from "../assets/icon/kt.png";
import iconLguplus from "../assets/icon/lguplus.png";
import iconLotte from "../assets/icon/lotte.png";
import iconMbc from "../assets/icon/mbc.png";
import iconNaver from "../assets/icon/naver.png";
import iconSaramin from "../assets/icon/saramin.png";
import iconSbs from "../assets/icon/sbs.png";
import iconShinhancard from "../assets/icon/shinhancard.png";
import iconSktelecom from "../assets/icon/sktelecom.png";
import iconToss from "../assets/icon/toss.png";
import iconTvn from "../assets/icon/tvn.png";
import iconYogiyo from "../assets/icon/yogiyo.png";

export const StartingPage = () => {
  const heroTags = ["이력서 분석하기", "예상질문 50개", "대기업 인재상 Top5", "···"];

  const statTagsOne = [
    "Vlainter의 역대 입사면접 합격자가 몇명이야?",
    "네이버 면접 사례 좀 알려줘",
  ];

  const statTagsTwo = [
    "지금 내가 지원하는 회사의 면접질문 적중률은?",
    "예상 면접질문 20개 뽑아줘",
  ];

  const logoColumnsDesktop = [
    [
      { src: iconLotte, alt: "LOTTE" },
      { src: iconHyundaicard, alt: "Hyundaicard" },
      { src: iconKt, alt: "kt" },
      { src: icon11st, alt: "11st" },
      { src: iconDaum, alt: "Daum" },
      { src: iconHmail, alt: "Hmail" },
    ],
    [
      { src: iconNaver, alt: "Naver" },
      { src: iconKasa, alt: "kasa" },
      { src: iconHana, alt: "Hana" },
      { src: iconJtbc, alt: "JTBC" },
      { src: iconKb, alt: "KB" },
      { src: iconKbs, alt: "KBS" },
    ],
    [
      { src: iconCgv, alt: "CGV" },
      { src: iconToss, alt: "toss" },
      { src: iconCj, alt: "CJ" },
      { src: iconLguplus, alt: "LG U+" },
      { src: iconMbc, alt: "MBC" },
      { src: iconSaramin, alt: "Saramin" },
    ],
    [
      { src: iconSbs, alt: "SBS" },
      { src: iconSeason, alt: "Season" },
      { src: iconTvn, alt: "tvN" },
      { src: iconShinhancard, alt: "Shinhan Card" },
      { src: iconSktelecom, alt: "SK Telecom" },
      { src: iconYogiyo, alt: "Yogiyo" },
    ],
  ];

  const logoColumnsTablet = logoColumnsDesktop.slice(0, 3);
  const logoColumnsMobile = logoColumnsDesktop.slice(0, 2);

  const chipClass =
    "relative inline-flex h-[20px] items-center justify-center rounded-full bg-white px-3 text-[12px] text-[#636363] shadow-[inset_0_0_0_1px_rgba(93,131,222,0.45)]";

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-white text-black">
      <TopNav />

      <section className="mt-[54px] h-auto min-h-[365px] w-full bg-[#f2f2f2] lg:h-[365px]">
        <div className="relative mx-auto h-full w-full max-w-[1256px] overflow-hidden px-6 pb-10 pt-8 md:px-10 md:pt-12 lg:pb-0 lg:pt-0">
          <div className="flex h-full flex-col lg:grid lg:grid-cols-[420px_minmax(0,1fr)] lg:gap-8">
            <div className="w-full lg:pt-[94px]">
            <p className="text-[13px] font-light text-[#767676]">
              사용자 맞춤 AI 가상면접도우미
            </p>

            <h1 className="mt-2 text-[30px] leading-[1.2] tracking-[0.3px] md:text-[40px]">
              <span className="font-light text-[#767676]">
                이력서는 문을 열어주고
              </span>
              <br />
              <span className="font-bold text-black">이야기는 합격을 만들어줍니다.</span>
            </h1>

            <div className="mt-4 flex flex-wrap gap-2">
              {heroTags.map((tag) => (
                <span key={tag} className={chipClass}>
                  {tag}
                </span>
              ))}
            </div>

            <Link
              to="/login"
              className="mt-5 mb-10 inline-flex h-10 w-[189px] items-center justify-center rounded-[20px] bg-[linear-gradient(324deg,rgba(93,131,222,1)_0%,rgba(255,28,145,1)_100%)] text-[20px] font-semibold text-white md:mb-12 lg:mb-0"
            >
              로그인 후 이용하기
            </Link>
            </div>

            <div className="mt-2 w-full overflow-hidden lg:mt-0 lg:h-full">
              <div className="grid grid-cols-2 gap-2.5 md:hidden">
              {logoColumnsMobile.map((column, index) => (
                  <div key={`mobile-logo-col-${index}`} className="h-[158px] overflow-hidden rounded-[12px]">
                  <div
                    className={`logo-marquee-track flex flex-col gap-2.5 ${index % 2 === 1 ? "logo-marquee-track-down" : ""}`}
                    style={{
                      "--marquee-distance": "336px",
                      "--marquee-start": index % 2 === 1 ? "-28px" : "0px",
                      "--marquee-duration": "26s",
                      "--marquee-delay": "0s",
                    }}
                  >
                      <div className="flex flex-col gap-2.5">
                        {column.map((icon) => (
                          <div
                            key={`mobile-${icon.alt}`}
                            className="flex h-[46px] shrink-0 items-center justify-center rounded-[14px] bg-white text-[15px] font-semibold text-[#404040] shadow-[0_1px_4px_rgba(0,0,0,0.12)]"
                          >
                            <img src={icon.src} alt={icon.alt} className="max-h-[20px] w-auto object-contain px-4" />
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-col gap-2.5" aria-hidden="true">
                        {column.map((icon) => (
                          <div
                            key={`mobile-copy-${icon.alt}`}
                            className="flex h-[46px] shrink-0 items-center justify-center rounded-[14px] bg-white text-[15px] font-semibold text-[#404040] shadow-[0_1px_4px_rgba(0,0,0,0.12)]"
                          >
                            <img src={icon.src} alt={icon.alt} className="max-h-[20px] w-auto object-contain px-4" />
                          </div>
                        ))}
                      </div>
                  </div>
                </div>
              ))}
            </div>

              <div className="hidden grid-cols-3 gap-3 md:grid lg:hidden">
              {logoColumnsTablet.map((column, index) => (
                  <div key={`tablet-logo-col-${index}`} className="h-[186px] overflow-hidden rounded-[12px]">
                  <div
                    className={`logo-marquee-track flex flex-col gap-3 ${index % 2 === 1 ? "logo-marquee-track-down" : ""}`}
                    style={{
                      "--marquee-distance": "396px",
                      "--marquee-start": index % 2 === 1 ? "-33px" : "0px",
                      "--marquee-duration": "30s",
                      "--marquee-delay": "0s",
                    }}
                  >
                      <div className="flex flex-col gap-3">
                        {column.map((icon) => (
                          <div
                            key={`tablet-${icon.alt}`}
                            className="flex h-[54px] shrink-0 items-center justify-center rounded-[15px] bg-white text-[19px] font-semibold text-[#404040] shadow-[0_1px_4px_rgba(0,0,0,0.12)]"
                          >
                            <img src={icon.src} alt={icon.alt} className="max-h-[24px] w-auto object-contain px-4" />
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-col gap-3" aria-hidden="true">
                        {column.map((icon) => (
                          <div
                            key={`tablet-copy-${icon.alt}`}
                            className="flex h-[54px] shrink-0 items-center justify-center rounded-[15px] bg-white text-[19px] font-semibold text-[#404040] shadow-[0_1px_4px_rgba(0,0,0,0.12)]"
                          >
                            <img src={icon.src} alt={icon.alt} className="max-h-[24px] w-auto object-contain px-4" />
                          </div>
                        ))}
                      </div>
                  </div>
                </div>
              ))}
            </div>

              <div className="hidden h-full grid-cols-4 gap-3 lg:grid">
              {logoColumnsDesktop.map((column, index) => (
                  <div key={`desktop-logo-col-${index}`} className="h-full overflow-hidden rounded-[12px]">
                  <div
                    className={`logo-marquee-track flex flex-col gap-12 ${index % 2 === 1 ? "logo-marquee-track-down" : ""}`}
                    style={{
                      "--marquee-distance": "690px",
                      "--marquee-start": index % 2 === 1 ? "-57.5px" : "0px",
                      "--marquee-duration": "42s",
                      "--marquee-delay": "0s",
                    }}
                  >
                      <div className="flex flex-col gap-12">
                        {column.map((icon) => (
                          <div
                            key={`desktop-${icon.alt}`}
                            className="flex h-[67px] shrink-0 items-center justify-center rounded-[15px] bg-white text-[22px] font-semibold text-[#404040] shadow-[0_1px_4px_rgba(0,0,0,0.12)]"
                          >
                            <img src={icon.src} alt={icon.alt} className="max-h-[28px] w-auto object-contain px-4" />
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-col gap-12" aria-hidden="true">
                        {column.map((icon) => (
                          <div
                            key={`desktop-copy-${icon.alt}`}
                            className="flex h-[67px] shrink-0 items-center justify-center rounded-[15px] bg-white text-[22px] font-semibold text-[#404040] shadow-[0_1px_4px_rgba(0,0,0,0.12)]"
                          >
                            <img src={icon.src} alt={icon.alt} className="max-h-[28px] w-auto object-contain px-4" />
                          </div>
                        ))}
                      </div>
                  </div>
                </div>
              ))}
            </div>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-[1256px] px-6 pb-24 pt-8 text-center md:px-10 md:pt-12">
        <section className="mt-2">
          <h2 className="text-[40px] font-semibold leading-[1.2] text-[#6e6e6e]">
            역대 입사면접 합격자
          </h2>
          <p className="mt-2 bg-[linear-gradient(143deg,rgba(93,131,222,1)_0%,rgba(255,28,145,1)_100%)] bg-clip-text text-[64px] font-bold leading-none text-transparent md:text-[96px]">
            1,684,535명
          </p>
          <p className="mx-auto mt-4 max-w-[760px] text-[24px] font-normal leading-[1.5] text-[#6e6e6e]">
            Vlainter AI의 면접 도움으로 지금까지 1,684,535명이 면접에 성공했어요
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {statTagsOne.map((tag) => (
              <span key={tag} className={chipClass}>
                {tag}
              </span>
            ))}
          </div>
        </section>

        <section className="mt-24">
          <h2 className="text-[40px] font-semibold leading-[1.2] text-[#6e6e6e]">
            예상질문 적중률
          </h2>
          <p className="mt-2 bg-[linear-gradient(143deg,rgba(93,131,222,1)_0%,rgba(255,28,145,1)_100%)] bg-clip-text text-[64px] font-bold leading-none text-transparent md:text-[96px]">
            75%
          </p>
          <p className="mx-auto mt-4 max-w-[860px] text-[24px] font-normal leading-[1.5] text-[#6e6e6e]">
            면접 경험자의 데이터에 따르면 Vlainter AI가 예상한 면접질문이 75%의
            확률로 적중했어요
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {statTagsTwo.map((tag) => (
              <span key={tag} className={chipClass}>
                {tag}
              </span>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
};
