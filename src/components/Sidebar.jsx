import { useMemo } from "react";
import { useAdminStatus } from "../hooks/useAdminStatus";
import { getMainMenuSections, MY_MENU_ITEMS } from "./sidebarMenuItems";

export const Sidebar = ({
  activeKey = "interview_start",
  onNavigate,
  userName = "송치호",
  profileImageUrl = "",
  isAdmin = null,
  onLogout,
}) => {
  const resolvedIsAdmin = useAdminStatus(isAdmin);

  const mainMenuSections = useMemo(() => getMainMenuSections({ isAdmin: resolvedIsAdmin }), [resolvedIsAdmin]);

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
    <aside className="fixed left-0 top-[54px] z-20 flex h-[calc(100vh-54px)] w-[272px] flex-col border-r border-[#e8e8e8] bg-[#f8f8f8]">
      <div className="flex-1 overflow-y-auto px-4 pb-4 pt-6">
        {mainMenuSections.map((section) => (
          <div key={section.title} className="pt-0 first:pt-0">
            <p className="mb-2 text-[12px] font-medium text-[#b1b1b1]">{section.title}</p>
            <div className="space-y-1.5">{section.items.map(renderMenuButton)}</div>
            <div className="h-4" />
          </div>
        ))}

        <div className="pt-2">
          <p className="mb-2 text-[12px] font-medium text-[#b1b1b1]">My</p>
          <div className="space-y-1">{MY_MENU_ITEMS.map(renderMenuButton)}</div>
        </div>
      </div>

      <div className="border-t border-[#e8e8e8] bg-[#f8f8f8] px-4 py-4">
        <div className="flex items-center gap-2">
          <img
            key={profileImageUrl || "sidebar-profile-image"}
            src={profileImageUrl}
            alt="프로필"
            className="h-8 w-8 rounded-full border border-[#d7d7d7] object-cover"
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
