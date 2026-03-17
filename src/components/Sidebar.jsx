import { useMemo } from "react";
import { useAdminStatus } from "../hooks/useAdminStatus";
import { getMainMenuSections, MY_MENU_ITEMS } from "./sidebarMenuItems";

export const Sidebar = ({
  activeKey = "interview_start",
  onNavigate,
  userName = "송치호",
  userRole = "",
  profileImageUrl = "",
  isAdmin = null,
  onLogout,
  variant = "default",
  menuSectionsOverride = null,
  myMenuItemsOverride = null,
}) => {
  const resolvedIsAdmin = useAdminStatus(isAdmin);
  const hasProfileImage = typeof profileImageUrl === "string" && profileImageUrl.trim().length > 0;
  const isMockStart = variant !== "legacy";

  const mainMenuSections = useMemo(
    () => menuSectionsOverride || getMainMenuSections({ isAdmin: resolvedIsAdmin }),
    [menuSectionsOverride, resolvedIsAdmin]
  );
  const myMenuItems = useMemo(
    () => myMenuItemsOverride || MY_MENU_ITEMS,
    [myMenuItemsOverride]
  );

  const renderMenuButton = (item) => {
    const active = item.key === activeKey;
    return (
      <button
        key={item.key}
        type="button"
        onClick={() => onNavigate?.(item)}
        className={`flex w-full items-center text-left transition ${
          isMockStart
            ? `rounded-[12px] px-4 py-2.5 text-[15px] font-normal tracking-[0.01em] ${active ? "bg-[#EEEEEE] text-[#000000]" : "text-[#000000] hover:bg-[#f1f1f1]"}`
            : `rounded-[10px] px-3 py-2 text-[13px] ${active ? "bg-[#ededed] text-black" : "text-[#2a2a2a] hover:bg-[#efefef]"}`
        }`}
      >
        {item.label}
      </button>
    );
  };

  return (
    <aside
      className={`fixed left-0 z-20 flex flex-col border-r ${
        isMockStart
          ? "top-[3.75rem] h-[calc(100vh-3.75rem)] w-[17rem] border-transparent bg-[#F8F8F8] shadow-[1px_0_4px_rgba(0,0,0,0.25)]"
          : "top-[54px] h-[calc(100vh-54px)] w-[272px] border-[#e8e8e8] bg-[#f8f8f8]"
      }`}
    >
      <div className={`flex-1 overflow-y-auto ${isMockStart ? "px-4 pb-4 pt-6" : "px-4 pb-4 pt-6"}`}>
        {mainMenuSections.map((section) => (
          <div key={section.title} className="pt-0 first:pt-0">
            <p className={`font-medium ${isMockStart ? "mb-2 px-2 text-[13px] tracking-[0.02em] text-[#B2B2B2]" : "mb-2 text-[12px] text-[#b1b1b1]"}`}>{section.title}</p>
            <div className={isMockStart ? "space-y-1.5" : "space-y-1.5"}>{section.items.map(renderMenuButton)}</div>
            <div className={isMockStart ? "h-5" : "h-4"} />
          </div>
        ))}

        <div className={isMockStart ? "pt-0" : "pt-2"}>
          <p className={`font-medium ${isMockStart ? "mb-2 px-2 text-[13px] tracking-[0.02em] text-[#B2B2B2]" : "mb-2 text-[12px] text-[#b1b1b1]"}`}>마이페이지</p>
          <div className="space-y-1">{myMenuItems.map(renderMenuButton)}</div>
        </div>
      </div>

      <div className={`border-t ${isMockStart ? "border-[#E6E6E6] bg-[#F8F8F8] px-4 py-4" : "border-[#e8e8e8] bg-[#f8f8f8] px-4 py-4"}`}>
        <div className={`flex items-center ${isMockStart ? "gap-3" : "gap-2"}`}>
          {hasProfileImage ? (
            <img
              key={profileImageUrl || "sidebar-profile-image"}
              src={profileImageUrl}
              alt="프로필"
              className={isMockStart ? "h-10 w-10 rounded-full border border-[#d7d7d7] object-cover" : "h-8 w-8 rounded-full border border-[#d7d7d7] object-cover"}
            />
          ) : (
            <div
              key="sidebar-profile-image"
              aria-hidden="true"
              className={isMockStart ? "h-10 w-10 rounded-full border border-[#d7d7d7] bg-[#eceff4]" : "h-8 w-8 rounded-full border border-[#d7d7d7] bg-[#eceff4]"}
            />
          )}
          <div className="min-w-0 flex-1">
            <p className={`truncate text-[#1f1f1f] ${isMockStart ? "text-[15px] font-medium" : "text-[13px]"}`}>{userName}</p>
            {userRole ? <p className="mt-0.5 truncate text-[11px] tracking-[0.02em] text-[#A1A1A1]">{userRole}</p> : null}
          </div>
          <button
            type="button"
            onClick={onLogout}
            className={`shrink-0 border text-[#6a6a6a] hover:bg-[#f5f5f5] ${
              isMockStart
                ? "rounded-full border-[#D9D9D9] bg-white px-3 py-1.5 text-[11px]"
                : "rounded-[10px] border-[#d7d7d7] px-2 py-0.5 text-[10px]"
            }`}
          >
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
};
