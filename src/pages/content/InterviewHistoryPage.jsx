import { SessionHistoryTemplate } from "./SessionHistoryTemplate";

export const InterviewHistoryPage = () => (
  <SessionHistoryTemplate
    title="면접 이력 조회"
    description="각 세션의 선택 서류, 난이도, 기술질문 카테고리, 문항 수를 카드로 확인하고 질문-답변-평가 세트를 바로 펼쳐 보실 수 있습니다."
    apiBasePath="/api/interview/mock"
    activeKey="interview_history"
    emptyMessage="완료된 모의면접 이력이 없습니다."
  />
);
