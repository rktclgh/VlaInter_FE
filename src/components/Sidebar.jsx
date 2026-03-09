import { MAIN_MENU_ITEMS, MY_MENU_ITEMS } from "./sidebarMenuItems";

const FINAL_PROFILE_FALLBACK =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

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
    <aside className="sticky top-0 flex h-[calc(100vh-54px)] w-full flex-col border-r border-[#e8e8e8] bg-[#f8f8f8]">
      <div className="flex-1 overflow-y-auto px-4 pb-4 pt-6">
        <div>
          <p className="mb-2 text-[12px] font-medium text-[#b1b1b1]">Main</p>
          <div className="space-y-1.5">{MAIN_MENU_ITEMS.map(renderMenuButton)}</div>
        </div>

        <div className="pt-6">
          <p className="mb-2 text-[12px] font-medium text-[#b1b1b1]">My</p>
          <div className="space-y-1">{MY_MENU_ITEMS.map(renderMenuButton)}</div>
        </div>
      </div>

      <div className="border-t border-[#e8e8e8] bg-[#f8f8f8] px-4 py-4">
        <div className="flex items-center gap-2">
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
                return;
              }
              if (target.src !== FINAL_PROFILE_FALLBACK) {
                target.src = FINAL_PROFILE_FALLBACK;
                return;
              }
              target.style.display = "none";
            }}
          />
          <span className="min-w-0 flex-1 truncate text-[13px] text-[#1f1f1f]">{userName}</span>
          <button
            type="button"
            onClick={onLogout}
            className="shrink-0 rounded-[10px] border border-[#d7d7d7] px-2 py-0.5 text-[10px] text-[#6a6a6a] hover:bg-[#f5f5f5]"
          >
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
};
