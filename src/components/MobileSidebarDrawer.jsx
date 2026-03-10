import { useMemo } from "react";
import { useAdminStatus } from "../hooks/useAdminStatus";
import { getMainMenuSections, MY_MENU_ITEMS } from "./sidebarMenuItems";

export const MobileSidebarDrawer = ({
  open,
  activeKey,
  onClose,
  onNavigate,
  userName = "사용자",
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
    <div
      className={`fixed inset-0 z-[65] md:hidden ${open ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <div
        className={`absolute inset-0 bg-black/35 transition-opacity duration-220 ease-out ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      <aside
        className={`absolute left-0 top-0 flex h-full w-[82vw] max-w-[320px] flex-col border-r border-[#e8e8e8] bg-[#f8f8f8]/95 shadow-[0_16px_40px_rgba(0,0,0,0.16)] backdrop-blur-md transition-transform duration-260 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 pt-4">
          <p className="bg-[linear-gradient(143deg,#5d83de_0%,#ff1c91_100%)] bg-clip-text text-[22px] font-extrabold text-transparent">
            Vlainter
          </p>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full border border-[#dddddd] text-[16px] text-[#666]"
            aria-label="메뉴 닫기"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pt-5">
          {mainMenuSections.map((section) => (
            <div key={section.title} className="pb-4">
              <p className="mb-2 text-[12px] font-medium text-[#b1b1b1]">{section.title}</p>
              <div className="space-y-1.5">{section.items.map(renderMenuButton)}</div>
            </div>
          ))}

          <div className="pt-2">
            <p className="mb-2 text-[12px] font-medium text-[#b1b1b1]">My</p>
            <div className="space-y-1">{MY_MENU_ITEMS.map(renderMenuButton)}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-[#e8e8e8] px-4 py-4">
          <img
            key={profileImageUrl || "mobile-profile-image"}
            src={profileImageUrl}
            alt="프로필"
            className="h-8 w-8 rounded-full border border-[#d7d7d7] object-cover"
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
    </div>
  );
};
