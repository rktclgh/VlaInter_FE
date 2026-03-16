import { useMemo, useState } from "react";
import { useAdminStatus } from "../hooks/useAdminStatus";
import { getMainMenuSections, MY_MENU_ITEMS } from "./sidebarMenuItems";
import { SupportReportModal } from "./SupportReportModal";

export const MobileSidebarDrawer = ({
  open,
  activeKey,
  onClose,
  onNavigate,
  userName = "사용자",
  userRole = "",
  profileImageUrl = "",
  isAdmin = null,
  onLogout,
  point = "0P",
  onClickCharge,
  interactionDisabled = false,
  variant = "default",
  menuSectionsOverride = null,
}) => {
  const resolvedIsAdmin = useAdminStatus(isAdmin);
  const hasProfileImage = typeof profileImageUrl === "string" && profileImageUrl.trim().length > 0;
  const isMockStart = variant !== "legacy";
  const [showReportModal, setShowReportModal] = useState(false);

  const mainMenuSections = useMemo(
    () => menuSectionsOverride || getMainMenuSections({ isAdmin: resolvedIsAdmin }),
    [menuSectionsOverride, resolvedIsAdmin]
  );

  const renderMenuButton = (item) => {
    const active = item.key === activeKey;
    return (
      <button
        key={item.key}
        type="button"
        onClick={() => onNavigate?.(item)}
        className={`flex w-full items-center text-left ${
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
        className={`absolute left-0 top-0 flex h-full w-[82vw] max-w-[17rem] flex-col border-r shadow-[0_1rem_2.5rem_rgba(0,0,0,0.16)] backdrop-blur-md transition-transform duration-260 ease-out ${
          isMockStart ? "border-transparent bg-[#F8F8F8]" : "border-[#e8e8e8] bg-[#f8f8f8]/95"
        } ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className={`flex items-center justify-end ${isMockStart ? "px-4 pt-4" : "px-4 pt-4"}`}>
          <button
            type="button"
            onClick={onClose}
            className={`rounded-full border text-base text-[#666] ${isMockStart ? "h-8 w-8 border-[#d8d8d8]" : "h-8 w-8 border-[#dddddd]"}`}
            aria-label="메뉴 닫기"
          >
            ×
          </button>
        </div>

        {isMockStart ? (
          <div className="border-b border-[#E6E6E6] px-4 py-3">
            <div className="grid grid-cols-[1fr_auto_auto] gap-2">
              <div className="inline-flex items-center justify-center rounded-xl border border-[#D4D4D4] bg-white px-2.5 py-1.5 text-[11px] font-medium text-black">
                {point}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (interactionDisabled) return;
                  setShowReportModal(true);
                }}
                disabled={interactionDisabled}
                aria-disabled={interactionDisabled}
                className={`inline-flex h-8 items-center justify-center rounded-xl border px-2.5 text-[10px] font-medium ${
                  interactionDisabled
                    ? "cursor-not-allowed border-[#E5E7EB] bg-[#F3F4F6] text-[#A3A3A3]"
                    : "border-[#D4D4D4] bg-white text-black"
                }`}
              >
                REPORT
              </button>
              <button
                type="button"
                onClick={onClickCharge}
                disabled={interactionDisabled}
                className={`inline-flex h-8 w-8 items-center justify-center rounded-xl border text-sm font-medium ${
                  interactionDisabled
                    ? "border-[#E5E7EB] bg-[#F3F4F6] text-[#A3A3A3]"
                    : "border-[#D4D4D4] bg-white text-black"
                }`}
              >
                +
              </button>
            </div>
          </div>
        ) : null}

        <div className={`flex-1 overflow-y-auto ${isMockStart ? "px-4 pt-5" : "px-4 pt-5"}`}>
          {mainMenuSections.map((section) => (
            <div key={section.title} className={isMockStart ? "pb-5" : "pb-4"}>
              <p className={`font-medium ${isMockStart ? "mb-2 px-2 text-[13px] tracking-[0.02em] text-[#B2B2B2]" : "mb-2 text-[12px] text-[#b1b1b1]"}`}>{section.title}</p>
              <div className={isMockStart ? "space-y-1.5" : "space-y-1.5"}>{section.items.map(renderMenuButton)}</div>
            </div>
          ))}

          <div className={isMockStart ? "pt-0" : "pt-2"}>
            <p className={`font-medium ${isMockStart ? "mb-2 px-2 text-[13px] tracking-[0.02em] text-[#B2B2B2]" : "mb-2 text-[12px] text-[#b1b1b1]"}`}>마이페이지</p>
            <div className="space-y-1">{MY_MENU_ITEMS.map(renderMenuButton)}</div>
          </div>
        </div>

        <div className={`flex items-center border-t ${isMockStart ? "gap-3 border-[#E6E6E6] px-4 py-4" : "gap-2 border-[#e8e8e8] px-4 py-4"}`}>
          {hasProfileImage ? (
            <img
              key={profileImageUrl || "mobile-profile-image"}
              src={profileImageUrl}
              alt="프로필"
              className={isMockStart ? "h-10 w-10 rounded-full border border-[#d7d7d7] object-cover" : "h-8 w-8 rounded-full border border-[#d7d7d7] object-cover"}
            />
          ) : (
            <div
              key="mobile-profile-image"
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
            className={`ml-auto border text-[#6a6a6a] hover:bg-[#f5f5f5] ${
              isMockStart
                ? "rounded-full border-[#D9D9D9] bg-white px-3 py-1.5 text-[11px]"
                : "rounded-[10px] border-[#d7d7d7] px-2 py-0.5 text-[10px]"
            }`}
          >
            Logout
          </button>
        </div>
      </aside>
      <SupportReportModal
        open={showReportModal}
        onClose={() => {
          setShowReportModal(false);
        }}
      />
    </div>
  );
};
