import { LegalDocumentLayout } from "../components/LegalDocumentLayout";
import { LegalSection } from "../components/LegalSection";
import { usePublicLocale } from "../lib/publicLocale";

const SECTION_BY_LOCALE = {
  ko: [
    {
      title: "제1조 목적",
      body: [
        "이 약관은 VlaInter(이하 \"서비스\")가 제공하는 AI 기반 면접 연습, 문서 업로드, 질문 저장, 질문 세트 관리, 포인트 결제 및 이에 부수하는 모든 기능의 이용과 관련하여 서비스와 회원 간의 권리, 의무 및 책임사항을 규정하는 것을 목적으로 합니다.",
        "서비스는 약관의 규제에 관한 법률, 전자상거래 등에서의 소비자보호에 관한 법률, 개인정보 보호법 등 관계 법령을 준수합니다.",
      ],
    },
    {
      title: "제2조 정의",
      body: [
        "\"회원\"은 본 약관에 동의하고 서비스에 가입하여 계정을 생성한 사람을 말합니다.",
        "\"콘텐츠\"는 회원이 업로드하는 이력서, 자기소개서, 포트폴리오, 답변, 질문 세트, 저장 질문, 문의 내용 및 이에 준하는 데이터를 의미합니다.",
        "\"포인트\"는 서비스 내 유료 기능 또는 정책상 정한 기능 이용에 사용할 수 있는 충전형 이용 단위를 의미합니다.",
      ],
    },
    {
      title: "제3조 약관의 게시와 변경",
      body: [
        "서비스는 본 약관의 내용을 회원이 쉽게 확인할 수 있도록 초기 화면 또는 연결 화면에 게시합니다.",
        "서비스는 관계 법령을 위반하지 않는 범위에서 약관을 개정할 수 있으며, 중요한 변경이 있는 경우 적용일 7일 전부터 공지합니다. 회원에게 불리한 변경은 최소 30일 전에 공지합니다.",
        "개정 약관 시행 후에도 회원이 서비스를 계속 이용하는 경우, 회원은 변경된 약관에 동의한 것으로 봅니다.",
      ],
    },
    {
      title: "제4조 회원가입과 계정 관리",
      body: [
        "회원가입은 이메일 또는 소셜 로그인(카카오)을 통해 진행되며, 서비스가 정한 절차에 따라 가입 신청이 완료되면 계정이 생성됩니다.",
        "회원은 본인의 계정 정보를 정확하게 입력하고 최신 상태로 유지해야 하며, 타인의 정보를 도용하거나 허위 정보를 입력해서는 안 됩니다.",
        "회원은 자신의 계정 및 인증수단을 스스로 관리해야 하며, 이를 제3자에게 양도, 대여, 공유하거나 담보로 제공할 수 없습니다.",
      ],
    },
    {
      title: "제5조 서비스의 제공",
      body: [
        "서비스는 다음 기능을 제공합니다: 기술 질문 연습, 문서 기반 맞춤형 면접, 질문 저장 및 세트 관리, 면접 이력 조회, 포인트 충전 및 사용, 운영자 문의 기능.",
        "서비스는 기술적 필요, 정책 변경, 법령 준수 또는 운영상 필요에 따라 서비스의 전부 또는 일부를 변경, 중단하거나 종료할 수 있습니다.",
        "서비스는 점검, 장애 대응, 외부 서비스 장애, 보안상 필요 등 부득이한 사유가 있는 경우 제공을 일시적으로 제한할 수 있습니다.",
      ],
    },
    {
      title: "제6조 유료 서비스와 포인트",
      body: [
        "회원은 서비스 내 결제 화면에서 안내되는 조건에 따라 포인트를 충전할 수 있습니다.",
        "유료 서비스의 구체적인 가격, 사용 범위, 환불 가능 여부 및 제한사항은 결제 또는 충전 화면, 별도 정책, 관련 법령에 따릅니다.",
        "법령상 철회 또는 환불이 허용되는 경우를 제외하고, 이미 사용된 포인트 또는 이미 제공이 완료된 디지털 서비스에 대해서는 환불이 제한될 수 있습니다.",
      ],
    },
    {
      title: "제7조 회원의 의무와 금지행위",
      body: [
        "회원은 관계 법령, 본 약관, 서비스 정책 및 운영자가 안내하는 사항을 준수해야 합니다.",
        "회원은 다음 행위를 해서는 안 됩니다: 타인 명의 사용, 계정 무단 공유, 서비스의 정상 동작을 방해하는 행위, 자동화 도구를 통한 비정상 대량 호출, 악성 문서·스크립트 업로드, 타인의 개인정보 또는 저작권 침해, 불법·유해 정보 게시, 운영자 사칭.",
        "서비스는 위반 행위가 확인되는 경우 게시물 삭제, 기능 제한, 계정 차단 또는 삭제 등 필요한 조치를 취할 수 있습니다.",
      ],
    },
    {
      title: "제8조 콘텐츠와 지식재산권",
      body: [
        "회원이 업로드한 콘텐츠의 권리와 책임은 해당 회원에게 있습니다. 회원은 업로드 콘텐츠가 법령 또는 제3자의 권리를 침해하지 않도록 해야 합니다.",
        "회원이 생성하거나 저장한 질문, 질문 세트, 답변 및 이에 준하는 콘텐츠는 서비스 품질 개선, 표준 질문 세트 구성, 운영 정책 반영을 위해 운영자 검토 대상이 될 수 있습니다.",
        "운영자는 회원이 생성한 질문 세트 또는 개별 질문이 서비스 운영 기준에 부합한다고 판단하는 경우, 필요한 범위에서 이를 표준 세트, 공인 세트 또는 공개 제공용 콘텐츠로 편집·승격·분류할 수 있습니다.",
        "서비스와 관련한 상표, UI, 소프트웨어, 데이터 구조, 운영 정책 등 서비스가 작성한 저작물의 권리는 서비스 또는 정당한 권리자에게 귀속합니다.",
        "회원은 서비스를 이용하여 얻은 정보를 서비스의 사전 동의 없이 복제, 배포, 상업적으로 이용하거나 제3자에게 제공할 수 없습니다.",
      ],
    },
    {
      title: "제9조 AI 결과물에 대한 고지",
      body: [
        "서비스는 AI 모델을 활용하여 질문, 모범답안, 평가, 분석 결과 등을 생성할 수 있습니다.",
        "AI 결과물은 면접 대비를 위한 참고 자료이며, 사실상·법률상·전문직 자문을 대체하지 않습니다.",
        "서비스는 AI 결과물의 완전성, 정확성, 최신성, 특정 목적 적합성을 보증하지 않으며, 회원은 중요한 의사결정에 앞서 스스로 내용을 검토해야 합니다.",
      ],
    },
    {
      title: "제10조 서비스 책임의 제한",
      body: [
        "서비스는 천재지변, 기간통신사업자 장애, 외부 API 제공자 장애, 회원 귀책사유 등 불가항력적 사유로 인한 손해에 대하여 책임을 지지 않습니다.",
        "서비스는 회원이 게시 또는 업로드한 정보의 정확성, 적법성, 완전성에 대해 보증하지 않습니다.",
        "서비스의 귀책사유가 인정되는 경우에도, 관련 법령상 허용되는 범위 내에서 책임은 통상 손해에 한정됩니다.",
      ],
    },
    {
      title: "제11조 계약 해지 및 이용 제한",
      body: [
        "회원은 언제든지 서비스 탈퇴 또는 로그아웃을 요청할 수 있습니다.",
        "서비스는 법령 위반, 본 약관 위반, 비정상적 서비스 이용, 보안 위협, 결제 부정 사용 등 합리적 사유가 있는 경우 사전 통지 후 또는 긴급 시 사후 통지로 계정 이용을 제한할 수 있습니다.",
        "회원 탈퇴 또는 계정 삭제 시 개인정보는 관련 법령에 따른 보관 의무가 없는 한 지체 없이 파기됩니다.",
      ],
    },
    {
      title: "제12조 준거법 및 분쟁 해결",
      body: [
        "본 약관은 대한민국 법률을 준거법으로 합니다.",
        "서비스 이용과 관련하여 분쟁이 발생하는 경우, 회원과 서비스는 우선 성실하게 협의하여 해결합니다.",
        "협의가 이루어지지 않는 경우 민사소송법상 관할 법원에 소를 제기할 수 있습니다.",
      ],
    },
    {
      title: "제13조 문의처",
      body: [
        "서비스 이용, 권리 행사, 약관 관련 문의는 아래 이메일로 접수할 수 있습니다.",
        "문의 이메일: songchih@icloud.com",
      ],
    },
  ],
  en: [
    {
      title: "Article 1 Purpose",
      body: [
        "These Terms govern the rights, obligations, and responsibilities between VlaInter (the \"Service\") and its members in connection with AI-based interview practice, document uploads, saved questions, question set management, point purchases, and all related features provided by the Service.",
        "The Service complies with applicable laws and regulations, including the Act on the Regulation of Terms and Conditions, the Act on Consumer Protection in Electronic Commerce, and the Personal Information Protection Act.",
      ],
    },
    {
      title: "Article 2 Definitions",
      body: [
        "\"Member\" means a person who agrees to these Terms, signs up for the Service, and creates an account.",
        "\"Content\" means resumes, self-introductions, portfolios, answers, question sets, saved questions, support inquiries, and similar data uploaded or created by a member.",
        "\"Points\" means prepaid usage units that may be used for paid features or other functions designated by the Service.",
      ],
    },
    {
      title: "Article 3 Posting and Amendment of Terms",
      body: [
        "The Service posts these Terms on the initial screen or a linked page so that members can easily review them.",
        "The Service may amend these Terms to the extent permitted by applicable law. Material changes will be announced at least 7 days before taking effect, and changes unfavorable to members will be announced at least 30 days in advance.",
        "If a member continues to use the Service after the revised Terms take effect, the member is deemed to have agreed to the amended Terms.",
      ],
    },
    {
      title: "Article 4 Membership Registration and Account Management",
      body: [
        "Registration is completed through email signup or social login (Kakao), and an account is created once the Service completes the required registration procedure.",
        "Members must provide accurate account information and keep it up to date. They must not use another person's information or submit false information.",
        "Members are responsible for managing their own accounts and authentication methods, and may not assign, lend, share, or pledge them to third parties.",
      ],
    },
    {
      title: "Article 5 Provision of the Service",
      body: [
        "The Service provides technical interview practice, document-based customized interviews, question saving and set management, interview history viewing, point charging and use, and contact/report features.",
        "The Service may change, suspend, or terminate all or part of the Service due to technical needs, policy changes, legal compliance, or operational reasons.",
        "The Service may temporarily restrict provision in unavoidable cases such as maintenance, incident response, external service outages, or security needs.",
      ],
    },
    {
      title: "Article 6 Paid Services and Points",
      body: [
        "Members may charge points according to the conditions shown on the payment screen within the Service.",
        "Specific prices, scope of use, refund eligibility, and limitations of paid services are governed by the payment screen, separate policies, and applicable law.",
        "Except where withdrawal or refund is required by law, refunds may be limited for points already used or digital services already provided.",
      ],
    },
    {
      title: "Article 7 Member Obligations and Prohibited Conduct",
      body: [
        "Members must comply with applicable laws, these Terms, Service policies, and instructions provided by operators.",
        "Members must not engage in conduct such as using another person's identity, unauthorized account sharing, interfering with normal service operation, abnormal bulk requests through automation tools, uploading malicious documents or scripts, infringing others' personal data or copyrights, posting illegal or harmful information, or impersonating operators.",
        "If a violation is confirmed, the Service may take necessary measures such as deleting content, restricting features, suspending an account, or deleting an account.",
      ],
    },
    {
      title: "Article 8 Content and Intellectual Property",
      body: [
        "Rights and responsibilities for content uploaded by a member remain with that member. Members must ensure that uploaded content does not violate laws or infringe the rights of third parties.",
        "Questions, question sets, answers, and similar content created or saved by members may be reviewed by operators for service quality improvement, standard question set curation, and policy reflection.",
        "If the Service determines that a user-created question set or individual question meets operational standards, it may edit, promote, classify, or reuse that content within a necessary scope as standard, certified, or publicly available content.",
        "All rights in trademarks, UI, software, data structures, and operational policies created by the Service belong to the Service or the rightful owner.",
        "Members may not reproduce, distribute, commercially use, or provide to third parties any information obtained through the Service without prior consent from the Service.",
      ],
    },
    {
      title: "Article 9 Notice Regarding AI Output",
      body: [
        "The Service may use AI models to generate questions, model answers, evaluations, and analysis results.",
        "AI output is reference material for interview preparation and does not replace factual, legal, or professional advice.",
        "The Service does not guarantee the completeness, accuracy, timeliness, or fitness for a particular purpose of AI output, and members must independently review important decisions.",
      ],
    },
    {
      title: "Article 10 Limitation of Liability",
      body: [
        "The Service shall not be liable for damages caused by force majeure such as natural disasters, telecommunications failures, external API outages, or causes attributable to members.",
        "The Service does not guarantee the accuracy, legality, or completeness of information posted or uploaded by members.",
        "Even when the Service is found liable, liability is limited to ordinary damages to the extent permitted by applicable law.",
      ],
    },
    {
      title: "Article 11 Termination and Restriction of Use",
      body: [
        "Members may request account withdrawal or logout at any time.",
        "The Service may restrict account use, with prior notice or post notice in urgent cases, when there are reasonable grounds such as legal violations, violations of these Terms, abnormal service use, security threats, or payment abuse.",
        "When a member withdraws or an account is deleted, personal information is destroyed without delay unless retention is required by law.",
      ],
    },
    {
      title: "Article 12 Governing Law and Dispute Resolution",
      body: [
        "These Terms are governed by the laws of the Republic of Korea.",
        "If a dispute arises in relation to the use of the Service, the member and the Service will first attempt to resolve it in good faith through consultation.",
        "If consultation fails, a lawsuit may be brought in a court having jurisdiction under the Civil Procedure Act.",
      ],
    },
    {
      title: "Article 13 Contact",
      body: [
        "Questions regarding use of the Service, exercise of rights, or these Terms may be sent to the email address below.",
        "Contact email: songchih@icloud.com",
      ],
    },
  ],
};

export const TermsPage = () => {
  const { locale } = usePublicLocale();
  const sections = SECTION_BY_LOCALE[locale] || SECTION_BY_LOCALE.ko;

  return (
    <LegalDocumentLayout title={locale === "en" ? "Terms of Service" : "이용약관"} updatedAt="2026-03-11">
      {sections.map((section) => (
        <LegalSection key={section.title} {...section} />
      ))}
    </LegalDocumentLayout>
  );
};
