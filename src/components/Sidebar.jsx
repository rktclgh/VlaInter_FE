import { MAIN_MENU_ITEMS, MY_MENU_ITEMS } from "./sidebarMenuItems";

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
        <div className="space-y-1.5">{MAIN_MENU_ITEMS.map(renderMenuButton)}</div>
      </div>

      <div className="px-4 pt-6">
        <p className="mb-2 text-[12px] font-medium text-[#b1b1b1]">My</p>
        <div className="space-y-1">{MY_MENU_ITEMS.map(renderMenuButton)}</div>
      </div>

      <div className="mt-auto flex items-center gap-2 px-4 py-4">
        <img
          key={profileImageUrl || fallbackProfileImageUrl || "sidebar-profile-image"}
          src={profileImageUrl}
          alt="프로필"
          className="h-8 w-8 rounded-full border border-[#d7d7d7] object-cover"
          onLoad={(event) => {
            event.currentTarget.dataset.fallbackTried = "false";
          }}
          onError={(event) => {
            const target = event.currentTarget;
            const alreadyTriedFallback = target.dataset.fallbackTried === "true";
            if (!alreadyTriedFallback && fallbackProfileImageUrl && target.src !== fallbackProfileImageUrl) {
              target.dataset.fallbackTried = "true";
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
