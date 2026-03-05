const mainItems = [
  { key: "interview_start", label: "모의면접 시작하기", path: "/content/interview" },
  { key: "tech_practice", label: "기술면접 연습", path: null },
  { key: "interview_history", label: "면접 이력 조회", path: null },
  { key: "practice_history", label: "연습 이력 조회", path: null },
  { key: "question_set", label: "내 질문 세트", path: null },
  { key: "saved_question", label: "저장된 질문", path: null },
];

const myItems = [
  { key: "file_upload", label: "이력서 및 자기소개서 업로드", path: "/content/files" },
  { key: "mypage", label: "마이페이지", path: "/content/mypage" },
];

export const Sidebar = ({
  activeKey = "interview_start",
  onNavigate,
  userName = "송치호",
  profileImageUrl = "",
  fallbackProfileImageUrl = "",
  onLogout,
}) => {
  const renderMenuButton = (item) => {
    const active = item.key === activeKey;
    return (
      <button
        key={item.key}
        type="button"
        onClick={() => onNavigate?.(item)}
        className={`flex w-full items-center rounded-[10px] px-3 py-2 text-left text-[13px] ${
          active ? "bg-[#ededed] text-black" : "text-[#2a2a2a] hover:bg-[#efefef]"
        }`}
      >
        {item.label}
      </button>
    );
  };

  return (
    <aside className="flex h-full w-full flex-col border-r border-[#e8e8e8] bg-[#f8f8f8]">
      <div className="px-4 pt-6">
        <p className="mb-2 text-[12px] font-medium text-[#b1b1b1]">Main</p>
        <div className="space-y-1.5">{mainItems.map(renderMenuButton)}</div>
      </div>

      <div className="px-4 pt-6">
        <p className="mb-2 text-[12px] font-medium text-[#b1b1b1]">My</p>
        <div className="space-y-1">{myItems.map(renderMenuButton)}</div>
      </div>

      <div className="mt-auto flex items-center gap-2 px-4 py-4">
        <img
          src={profileImageUrl}
          alt="프로필"
          className="h-8 w-8 rounded-full border border-[#d7d7d7] object-cover"
          onError={(event) => {
            if (fallbackProfileImageUrl) {
              event.currentTarget.src = fallbackProfileImageUrl;
            }
          }}
        />
        <span className="text-[13px] text-[#1f1f1f]">{userName}</span>
        <button
          type="button"
          onClick={onLogout}
          className="ml-auto rounded-[10px] border border-[#d7d7d7] px-2 py-0.5 text-[10px] text-[#6a6a6a] hover:bg-[#f5f5f5]"
        >
          Logout
        </button>
      </div>
    </aside>
  );
};
