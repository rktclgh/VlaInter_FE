import { TopNav } from "../components/TopNav";
import { AuthFooter } from "../components/AuthFooter";
import { usePublicLocale } from "../lib/publicLocale";

const CONTENT = {
  ko: {
    heroEyebrow: "Service Intro",
    heroTitle: ["쉬었음 청년들...", "오늘도 잘 쉬었니?"],
    heroDescription:
      "취업 준비를 오래 쉬었든, 다시 시작했든, 면접은 결국 다시 입으로 설명해보는 과정에서 감이 돌아옵니다. VlaInter는 그 과정을 기술 질문과 문서 기반 질문으로 나눠서, 혼자서도 계속 연습할 수 있게 만든 AI 면접 도구입니다.",
    cards: [
      {
        label: "Tech",
        body: "직무·기술 카테고리 기반으로 기술 면접 질문을 연습합니다.",
      },
      {
        label: "Document",
        body: "이력서와 자기소개서를 바탕으로 실제 내 경험을 묻는 면접을 구성합니다.",
      },
      {
        label: "Feedback",
        body: "답변 이력, 저장 질문, 질문 세트를 쌓으면서 반복적으로 다듬을 수 있습니다.",
      },
    ],
    sections: [
      {
        title: "개발자의 말",
        body: [
          "안녕하세요 서비스 개발자 송치호 입니다.",
          "이 서비스는 원래 제가 직접 면접을 준비하면서 나만 쓰려고 개발하던 도구에서 시작했습니다. 그래서 지금도 UI나 일부 기능은 아직 완벽하게 다듬어지지 않은 부분이 있을 수 있습니다. 그 점을 감안하고 써주시면 감사하겠습니다.",
          "오류나 UI 개선 제보는 화면 상단의 REPORT 버튼을 통해 자유롭게 보내주시면 됩니다. 가능하면 캡쳐, 발생 시간, 어떤 상황에서 문제가 보였는지까지 같이 적어주시면 확인 속도가 훨씬 빨라집니다.",
          "빠르면 30분 안에, 늦어도 다음날에는 확인해서 반영해두겠습니다.",
        ],
      },
      {
        title: "VlaInter는 어떤 서비스인가",
        body: [
          "VlaInter는 AI 기반 사용자 맞춤형 면접 대비 플랫폼입니다. 단순히 정답을 외우는 방식이 아니라, 사용자의 직무, 기술 스택, 업로드한 문서, 저장한 질문 기록을 바탕으로 실제 면접처럼 질문하고 답변을 점검하는 데 초점을 맞추고 있습니다.",
          "핵심은 두 가지입니다. 첫째는 기술 질문 연습입니다. 직무와 기술 카테고리를 기준으로 질문을 생성하거나, 내가 저장한 질문 세트로 직접 연습할 수 있습니다. 둘째는 문서 기반 실전 면접입니다. 이력서와 자기소개서, 포트폴리오를 바탕으로 나만의 경험을 물어보는 형태의 질문을 만들어 실제 면접 감각을 훈련할 수 있습니다.",
        ],
      },
      {
        title: "어떤 방식으로 동작하나",
        body: [
          "기술 질문 연습은 사용자가 선택한 직무와 기술 카테고리를 기준으로 질문을 구성하고, 답변을 제출하면 AI가 모범답안과 피드백을 제공합니다. 필요하면 마음에 드는 질문을 저장하고, 여러 질문을 묶어서 나만의 질문 세트로 다시 연습할 수도 있습니다.",
          "문서 기반 면접은 업로드한 이력서 중심으로 시작합니다. 문서에서 사용자 경험과 프로젝트 맥락을 추출한 뒤, 그 내용을 기반으로 꼬리 질문이 가능한 면접형 질문을 생성합니다. 덕분에 흔한 공통 질문보다, 실제 내 경험을 설명하는 연습에 더 가깝게 사용할 수 있습니다.",
          "세션이 끝나면 이력에 남고, 저장한 질문이나 질문 세트, 업로드 문서를 기반으로 다음 연습 흐름을 이어갈 수 있습니다. 즉 한 번 쓰고 끝나는 서비스가 아니라, 준비 과정 전체를 쌓아가는 도구로 설계했습니다.",
        ],
      },
      {
        title: "이런 분들에게 맞습니다",
        body: [
          "오랜만에 다시 취업 준비를 시작한 쉬었음 청년, 신입 면접이 막막한 취준생, 이직을 준비하면서 내 경험을 다시 정리해야 하는 실무자, 그리고 기술 질문과 문서 질문을 동시에 훈련하고 싶은 사용자에게 특히 잘 맞습니다.",
          "완벽한 서비스보다는 빠르게 개선되는 실용적인 도구에 가깝습니다. 필요한 기능은 계속 다듬고 있으니, 사용하면서 불편한 점이 있으면 부담 없이 제보해 주세요.",
        ],
      },
    ],
  },
  en: {
    heroEyebrow: "Service Intro",
    heroTitle: ["Taking a break...", "Still deserve a strong comeback."],
    heroDescription:
      "Whether you paused your job search for a while or are just starting again, interview confidence usually comes back when you practice explaining your experience out loud. VlaInter is an AI interview tool built to help you keep training on your own through technical questions and document-based mock interviews.",
    cards: [
      {
        label: "Tech",
        body: "Practice technical interview questions based on your job track and skill categories.",
      },
      {
        label: "Document",
        body: "Build interview questions from your resume and self-introduction so you can explain your real experience.",
      },
      {
        label: "Feedback",
        body: "Refine your answers over time by saving question history, question sets, and interview records.",
      },
    ],
    sections: [
      {
        title: "A note from the developer",
        body: [
          "Hello, I’m Chiho Song, the developer behind VlaInter.",
          "This service started as a private tool I was building for myself while preparing for interviews. Because of that, some UI details or smaller features may still feel rough around the edges. Please keep that in mind while using it.",
          "If you run into bugs or have UI improvement ideas, feel free to send a report through the REPORT button at the top of the screen. If possible, include a screenshot, the time it happened, and what you were doing when the issue appeared. That makes it much faster to verify.",
          "If it is urgent, I usually check it within 30 minutes. At the latest, I try to review and reflect it by the next day.",
        ],
      },
      {
        title: "What VlaInter is",
        body: [
          "VlaInter is an AI-powered interview preparation platform tailored to each user. Instead of helping you memorize fixed answers, it focuses on asking realistic questions and reviewing your responses based on your target role, tech stack, uploaded documents, and saved question history.",
          "The core value has two parts. First, technical interview practice: you can generate questions from job and skill categories or practice with your own saved question sets. Second, document-based mock interviews: VlaInter creates questions around your resume, self-introduction, and portfolio so you can rehearse how to explain your real experiences in an interview.",
        ],
      },
      {
        title: "How it works",
        body: [
          "For technical practice, VlaInter builds questions from the job and skill categories you select. After you submit an answer, AI generates a model answer and feedback. You can also save questions you like and bundle them into your own reusable question sets.",
          "For document-based interviews, the flow starts from your uploaded resume. The system extracts your experience and project context from the document, then generates interview-style questions that naturally allow follow-up discussion. That makes the practice much closer to explaining your own background than answering generic questions.",
          "When a session ends, it remains in your history. You can continue your preparation flow with saved questions, question sets, and uploaded files. In other words, VlaInter is designed not as a one-time tool, but as something that helps you build a full preparation routine over time.",
        ],
      },
      {
        title: "Who this is for",
        body: [
          "It is especially useful for young job seekers returning after a long break, new graduates who feel lost in interviews, experienced professionals preparing for a career move, and anyone who wants to train on both technical and document-based questions at the same time.",
          "VlaInter is closer to a practical tool that improves quickly than to a perfectly polished product. I keep refining the features that matter, so if anything feels inconvenient while using it, feel free to report it.",
        ],
      },
    ],
  },
};

const Section = ({ title, body }) => (
  <section className="rounded-[28px] border border-[#edf1f5] bg-white px-6 py-7 shadow-[0_18px_60px_rgba(23,27,36,0.05)] md:px-9">
    <h2 className="text-[21px] font-semibold text-[#171b24]">{title}</h2>
    <div className="mt-4 space-y-4 text-[15px] leading-[1.9] text-[#313948]">
      {body.map((line, index) => (
        <p key={`${index}-${line.slice(0, 24)}`}>{line}</p>
      ))}
    </div>
  </section>
);

export const ServiceIntroPage = () => {
  const { locale } = usePublicLocale();
  const content = CONTENT[locale] || CONTENT.ko;

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[linear-gradient(180deg,#fbfcfe_0%,#f4f7fb_100%)]">
      <TopNav />
      <div className="flex min-h-[calc(100vh-54px)] flex-col pt-[54px]">
        <main className="flex-1 px-5 py-10 md:px-8 md:py-14">
          <section className="mx-auto w-full max-w-[980px]">
            <div className="rounded-[36px] border border-[#e6ebf2] bg-[linear-gradient(135deg,rgba(255,255,255,0.96)_0%,rgba(244,247,252,0.98)_100%)] px-7 py-8 shadow-[0_30px_100px_rgba(23,27,36,0.08)] md:px-12 md:py-12">
              <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#6b7ba1]">{content.heroEyebrow}</p>
              <h1 className="mt-4 text-[32px] font-black leading-[1.25] text-[#171b24] md:text-[42px]">
                {content.heroTitle[0]}
                <br />
                {content.heroTitle[1]}
              </h1>
              <p className="mt-5 max-w-[760px] text-[16px] leading-[1.9] text-[#445066]">
                {content.heroDescription}
              </p>
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                <div className="rounded-[24px] bg-[#171b24] px-5 py-5 text-white">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-white/65">{content.cards[0].label}</p>
                  <p className="mt-3 text-[15px] leading-[1.7]">{content.cards[0].body}</p>
                </div>
                <div className="rounded-[24px] bg-[#ffffff] px-5 py-5 text-[#171b24] shadow-[0_12px_36px_rgba(23,27,36,0.06)]">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#77829b]">{content.cards[1].label}</p>
                  <p className="mt-3 text-[15px] leading-[1.7]">{content.cards[1].body}</p>
                </div>
                <div className="rounded-[24px] bg-[#fff3b5] px-5 py-5 text-[#171b24]">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#7e6700]">{content.cards[2].label}</p>
                  <p className="mt-3 text-[15px] leading-[1.7]">{content.cards[2].body}</p>
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-6">
              {content.sections.map((section) => (
                <Section key={section.title} {...section} />
              ))}
            </div>
          </section>
        </main>
        <AuthFooter />
      </div>
    </div>
  );
};
