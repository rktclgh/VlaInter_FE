import { SessionHistoryTemplate } from "./SessionHistoryTemplate";

export const PracticeHistoryPage = () => (
  <SessionHistoryTemplate
    title="기술질문 이력 조회"
    description="기술질문 연습 회차별 결과를 카드로 보고, 각 질문의 내 답변과 평가를 다시 확인하실 수 있습니다."
    apiBasePath="/api/interview/tech"
    activeKey="practice_history"
    emptyMessage="완료된 기술질문 연습 이력이 없습니다."
  />
);
