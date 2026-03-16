export const MAIN_MENU_SECTIONS = [
  {
    title: "모의 면접",
    items: [
      { key: "interview_start", label: "실전 모의 면접", path: "/content/interview" },
      { key: "interview_history", label: "모의 면접 이력", path: "/content/interview-history" },
    ],
  },
  {
    title: "질문 연습",
    items: [
      { key: "tech_practice", label: "기술질문 연습", path: "/content/tech-practice" },
      { key: "practice_history", label: "연습 이력", path: "/content/practice-history" },
    ],
  },
  {
    title: "질문 관리",
    items: [
      { key: "question_set", label: "내 질문 세트", path: "/content/question-sets" },
      { key: "question_browse", label: "질문 찾아보기", path: "/content/question-browse" },
      { key: "saved_question", label: "저장된 질문", path: "/content/saved-questions" },
    ],
  },
];

export const STUDENT_MENU_SECTIONS = [
  {
    title: "대학생 모드",
    items: [
      { key: "student_home", label: "과목 홈", path: "/content/student" },
    ],
  },
];

export const ADMIN_MENU_ITEMS = [
  { key: "admin_console", label: "관리자 콘솔", path: "/content/admin" },
];

export const MY_MENU_ITEMS = [
  { key: "file_upload", label: "이력서 및 자기소개서 업로드", path: "/content/files" },
  { key: "mypage", label: "마이페이지", path: "/content/mypage" },
];

export const getMainMenuItems = ({ isAdmin = false } = {}) => {
  const mainItems = MAIN_MENU_SECTIONS.flatMap((section) => section.items);
  if (!isAdmin) return mainItems;
  return [...mainItems, ...ADMIN_MENU_ITEMS];
};

export const getMainMenuSections = ({ isAdmin = false } = {}) => {
  if (!isAdmin) return MAIN_MENU_SECTIONS;
  return [...MAIN_MENU_SECTIONS, { title: "운영", items: ADMIN_MENU_ITEMS }];
};

export const MAIN_MENU_ITEMS = MAIN_MENU_SECTIONS.flatMap((section) => section.items);

export const LEGACY_getMainMenuItems = ({ isAdmin = false } = {}) => {
  if (!isAdmin) return MAIN_MENU_ITEMS;
  return [...MAIN_MENU_ITEMS, ...ADMIN_MENU_ITEMS];
};
