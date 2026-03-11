import { LegalDocumentLayout } from "../components/LegalDocumentLayout";
import { LegalSection } from "../components/LegalSection";

const collectionRows = [
  {
    purpose: "회원가입 및 일반 로그인",
    items: "이름, 이메일 주소, 비밀번호(암호화 저장), 가입 일시, 계정 상태",
    retention: "회원 탈퇴 시까지. 단, 관련 법령에 따른 보관 의무가 있으면 해당 기간까지 보관",
  },
  {
    purpose: "카카오 소셜 로그인",
    items: "카카오 계정 이메일, 프로필 닉네임 등 회원 식별에 필요한 정보",
    retention: "회원 탈퇴 시까지 또는 연동 해제 시까지",
  },
  {
    purpose: "이메일 인증 및 비밀번호 재설정",
    items: "이메일, 이름, 인증코드 검증 정보, 인증 시도 기록",
    retention: "목적 달성 후 즉시 삭제 또는 단기 보관",
  },
  {
    purpose: "면접 서비스 제공",
    items: "업로드 문서(이력서, 자기소개서, 포트폴리오), 질문 세트, 저장 질문, 사용자 답변, 면접 세션 이력, 평가 결과",
    retention: "회원이 직접 삭제하거나 회원 탈퇴 시까지. 단, 법령상 보존이 필요한 정보는 별도 보관",
  },
  {
    purpose: "세션 관리 및 보안",
    items: "세션 식별자, 로그인 시각, 최근 활동 시각, 접속 IP, 브라우저/기기 정보, 로그인 제공자",
    retention: "세션 만료 또는 회원 탈퇴 시까지. 일부 접속 기록은 보안 및 운영 목적상 일정 기간 보관",
  },
  {
    purpose: "포인트 충전 및 환불 처리",
    items: "결제 내역, 결제수단, 거래번호, 결제/환불 금액, 포인트 변동 내역",
    retention: "전자상거래 등에서의 소비자보호에 관한 법률 등 관계 법령에 따른 보관기간",
  },
  {
    purpose: "문의 및 오류 제보 처리",
    items: "제목, 문의 내용, 첨부 이미지, 현재 경로, 브라우저 정보",
    retention: "문의 처리 완료 후 3년 또는 관련 법령이 정한 기간",
  },
  {
    purpose: "사용자 제공 AI API 키 관리",
    items: "사용자가 직접 등록한 Gemini API 키(암호화 저장), 등록 여부",
    retention: "회원이 삭제하거나 회원 탈퇴 시까지",
  },
];

const legalRetentionRows = [
  {
    basis: "전자상거래 등에서의 소비자보호에 관한 법률",
    items: "계약 또는 청약철회 등에 관한 기록, 대금결제 및 재화·서비스 공급 기록",
    retention: "5년",
  },
  {
    basis: "전자상거래 등에서의 소비자보호에 관한 법률",
    items: "소비자 불만 또는 분쟁처리에 관한 기록",
    retention: "3년",
  },
  {
    basis: "전자상거래 등에서의 소비자보호에 관한 법률",
    items: "표시·광고에 관한 기록",
    retention: "6개월",
  },
  {
    basis: "통신비밀보호법",
    items: "서비스 방문 및 접속에 관한 로그 등 대통령령이 정한 자료",
    retention: "3개월",
  },
];

const processorRows = [
  {
    name: "Amazon Web Services",
    work: "애플리케이션 호스팅, 데이터베이스 운영, 파일 저장",
  },
  {
    name: "Upstash",
    work: "세션 저장 및 인증 보조 처리",
  },
  {
    name: "PortOne",
    work: "포인트 결제 승인, 환불, 거래 검증",
  },
];

const Table = ({ headers, rows, renderRow }) => (
  <div className="overflow-hidden rounded-[16px] border border-[#e6ebf2]">
    <table className="w-full border-collapse text-left text-[13px]">
      <thead className="bg-[#f6f8fb] text-[#465065]">
        <tr>
          {headers.map((header) => (
            <th key={header} className="border-b border-[#e6ebf2] px-4 py-3 font-semibold">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={`${headers[0]}-${index}`} className="align-top">
            {renderRow(row).map((cell, cellIndex) => (
              <td key={`${index}-${cellIndex}`} className="border-b border-[#eef2f7] px-4 py-3 last:border-b-0">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const PrivacyPolicyPage = () => {
  return (
    <LegalDocumentLayout title="개인정보처리방침" updatedAt="2026-03-11">
      <LegalSection title="1. 총칙">
        <p>VlaInter는 개인정보 보호법 제30조에 따라 정보주체의 개인정보를 보호하고, 관련 고충을 신속하고 원활하게 처리하기 위하여 본 개인정보처리방침을 수립·공개합니다.</p>
        <p>본 방침은 VlaInter 서비스의 회원가입, 로그인, 문서 업로드, 면접 세션, 포인트 결제, 문의 접수 등 서비스 전반에 적용됩니다.</p>
      </LegalSection>

      <LegalSection title="2. 수집하는 개인정보 항목, 목적 및 보유기간">
        <Table
          headers={["수집 목적", "수집 항목", "보유기간"]}
          rows={collectionRows}
          renderRow={(row) => [row.purpose, row.items, row.retention]}
        />
      </LegalSection>

      <LegalSection title="3. 법령에 따른 보관">
        <p>서비스는 관계 법령이 개인정보 또는 거래기록의 보관을 요구하는 경우, 해당 법령이 정한 기간 동안 별도로 분리 보관할 수 있습니다.</p>
        <Table
          headers={["법적 근거", "보관 항목", "보관기간"]}
          rows={legalRetentionRows}
          renderRow={(row) => [row.basis, row.items, row.retention]}
        />
      </LegalSection>

      <LegalSection title="4. 개인정보의 파기">
        <p>개인정보의 보유기간이 경과하거나 처리 목적이 달성된 경우에는 지체 없이 해당 정보를 파기합니다.</p>
        <p>전자적 파일 형태의 정보는 복구가 불가능한 방법으로 삭제하며, 종이 문서는 분쇄 또는 소각 등의 방법으로 파기합니다.</p>
      </LegalSection>

      <LegalSection title="5. 개인정보의 제3자 제공">
        <p>서비스는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다.</p>
        <p>다만, 정보주체의 별도 동의가 있는 경우, 법령에 특별한 규정이 있는 경우, 수사기관 등 적법한 절차에 따른 요구가 있는 경우에는 예외로 합니다.</p>
      </LegalSection>

      <LegalSection title="6. 개인정보 처리업무의 위탁">
        <p>서비스는 원활한 운영을 위해 다음과 같이 개인정보 처리업무를 위탁할 수 있습니다.</p>
        <Table
          headers={["수탁자", "위탁 업무"]}
          rows={processorRows}
          renderRow={(row) => [row.name, row.work]}
        />
        <p>위탁계약 체결 시 개인정보 보호법에 따라 안전성 확보조치, 재위탁 제한, 관리·감독 등을 계약서 등에 반영합니다.</p>
      </LegalSection>

      <LegalSection title="7. 국외 이전 가능성">
        <p>서비스 운영 과정에서 국외 클라우드 또는 외부 API 사업자가 사용될 수 있습니다. 서비스는 개인정보의 국외 이전이 발생하는 경우 관련 법령에 따라 필요한 고지 또는 동의 절차를 이행합니다.</p>
      </LegalSection>

      <LegalSection title="8. 정보주체의 권리와 행사 방법">
        <p>이용자는 언제든지 본인의 개인정보에 대해 열람, 정정, 삭제, 처리정지, 회원탈퇴를 요청할 수 있습니다.</p>
        <p>권리 행사는 서비스 내 기능 또는 아래 문의 이메일을 통해 요청할 수 있으며, 서비스는 관계 법령에서 정한 예외 사유가 없는 한 지체 없이 조치합니다.</p>
      </LegalSection>

      <LegalSection title="9. 쿠키 및 세션 사용">
        <p>서비스는 로그인 상태 유지, 인증 검증, 보안 강화를 위해 쿠키 및 세션 식별자를 사용할 수 있습니다.</p>
        <p>브라우저 설정을 통해 쿠키 저장을 거부할 수 있으나, 이 경우 로그인 유지 등 일부 기능 이용이 제한될 수 있습니다.</p>
      </LegalSection>

      <LegalSection title="10. 안전성 확보 조치">
        <p>서비스는 개인정보의 안전한 처리를 위해 접근권한 관리, 비밀번호 암호화, 주요 민감정보 암호화 저장, 접속기록 관리, 보안 업데이트 및 접근 통제 등 합리적인 보호조치를 시행합니다.</p>
      </LegalSection>

      <LegalSection title="11. 개인정보 보호책임자 및 문의">
        <p>개인정보 보호 및 권리 행사 관련 문의는 아래 이메일로 접수할 수 있습니다.</p>
        <p>문의 이메일: songchih@icloud.com</p>
      </LegalSection>

      <LegalSection title="12. 방침의 변경">
        <p>본 개인정보처리방침은 법령, 서비스 내용, 처리 항목이 변경되는 경우 개정될 수 있으며, 중요한 변경이 있는 경우 서비스 내 공지사항 또는 연결 화면을 통해 안내합니다.</p>
      </LegalSection>
    </LegalDocumentLayout>
  );
};
