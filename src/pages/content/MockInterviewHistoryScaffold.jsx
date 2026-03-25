import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ContentTopNav } from "../../components/ContentTopNav";
import { MobileSidebarDrawer } from "../../components/MobileSidebarDrawer";
import { PointChargeModal } from "../../components/PointChargeModal";
import { PointChargeSuccessModal } from "../../components/PointChargeSuccessModal";
import { Sidebar } from "../../components/Sidebar";
import tempProfileImage from "../../assets/icon/temp.png";
import { isAuthenticationError } from "../../lib/apiClient";
import { logout } from "../../lib/authApi";
import { consumePointChargeSuccessResult } from "../../lib/pointChargeFlow";
import { getMyProfile, getMyProfileImageUrl } from "../../lib/userApi";
import { extractProfile, formatPoint, parsePoint } from "./mockInterviewHistoryUtils";

export const HistoryChip = ({ children, accent = false, muted = false }) => (
  <span
    className={`inline-flex min-h-7 items-center rounded-full border px-3 text-[11px] tracking-[0.01em] ${
      accent
        ? "border-[#d7c0ff] bg-[#fbf7ff] text-[#6e3ed8]"
        : muted
          ? "border-[#ececec] bg-[#fafafa] text-[#6d6d6d]"
          : "border-[#e5e5e5] bg-white text-[#3a3a3a]"
    }`}
  >
    {children}
  </span>
);

const FocusTrapModal = ({ title, description, confirmLabel, confirmTone = "default", onCancel, onConfirm }) => {
  const dialogRef = useRef(null);
  const cancelButtonRef = useRef(null);

  useEffect(() => {
    const previousFocusedElement = document.activeElement;
    cancelButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel?.();
        return;
      }
      if (event.key !== "Tab") return;

      const dialogElement = dialogRef.current;
      if (!dialogElement) return;
      const focusableElements = dialogElement.querySelectorAll(
        'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
      );
      if (!focusableElements.length) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
        return;
      }
      if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (previousFocusedElement && typeof previousFocusedElement.focus === "function") {
        previousFocusedElement.focus();
      }
    };
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/35 px-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mock-history-modal-title"
        tabIndex={-1}
        className="w-full max-w-[420px] rounded-[20px] border border-[#dddddd] bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.14)]"
      >
        <p id="mock-history-modal-title" className="text-[16px] font-semibold text-[#202020]">
          {title}
        </p>
        <p className="mt-2 text-[13px] leading-[1.65] text-[#6a6a6a]">{description}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            className="rounded-full border border-[#dddddd] bg-white px-4 py-2 text-[12px] text-[#5b5b5b]"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-full px-4 py-2 text-[12px] font-medium ${
              confirmTone === "danger"
                ? "bg-[#ff4d4f] text-white"
                : "bg-[#1f1f1f] text-white"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export const LogoutConfirmModal = ({ onCancel, onConfirm }) => (
  <FocusTrapModal
    title="정말 로그아웃 하시겠습니까?"
    description="현재 페이지의 진행 중 작업은 유지되지 않습니다."
    confirmLabel="로그아웃"
    onCancel={onCancel}
    onConfirm={onConfirm}
  />
);

export const DeleteConfirmModal = ({ title, description, onCancel, onConfirm }) => (
  <FocusTrapModal
    title={title}
    description={description}
    confirmLabel="삭제"
    confirmTone="danger"
    onCancel={onCancel}
    onConfirm={onConfirm}
  />
);

export const InlineSpinner = ({ label }) => (
  <div className="inline-flex items-center gap-2 text-[12px] text-[#6a6a6a]">
    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#d5d5d5] border-t-[#171b24]" />
    <span>{label}</span>
  </div>
);

export const HistoryShell = ({ activeKey, children }) => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("사용자");
  const [userPoint, setUserPoint] = useState(0);
  const [profileImageUrl, setProfileImageUrl] = useState(tempProfileImage);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showPointChargeModal, setShowPointChargeModal] = useState(false);
  const [showPointChargeSuccessModal, setShowPointChargeSuccessModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    const charged = consumePointChargeSuccessResult();
    if (!charged) return;
    setUserPoint(parsePoint(charged?.currentPoint));
    setShowPointChargeSuccessModal(true);
  }, []);

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      try {
        const profilePayload = await getMyProfile();
        if (!active) return;
        const profile = extractProfile(profilePayload);
        setUserName(profile?.name || "사용자");
        setUserPoint(parsePoint(profile?.point));
        setProfileImageUrl(getMyProfileImageUrl());
      } catch (error) {
        if (!active) return;
        if (isAuthenticationError(error)) {
          navigate("/login", { replace: true });
        }
      }
    };

    void loadProfile();

    return () => {
      active = false;
    };
  }, [navigate]);

  const handleSidebarNavigate = (item) => {
    setIsMobileMenuOpen(false);
    if (item?.path) navigate(item.path);
  };

  const handleLogoutConfirm = async () => {
    try {
      await logout();
    } catch {
      // ignore
    } finally {
      setShowLogoutModal(false);
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-white pt-[3.75rem]">
      <ContentTopNav point={formatPoint(userPoint)} onClickCharge={() => setShowPointChargeModal(true)} onOpenMenu={() => setIsMobileMenuOpen(true)} />

      <MobileSidebarDrawer
        open={isMobileMenuOpen}
        activeKey={activeKey}
        onClose={() => setIsMobileMenuOpen(false)}
        onNavigate={handleSidebarNavigate}
        userName={userName}
        profileImageUrl={profileImageUrl}
        point={formatPoint(userPoint)}
        onClickCharge={() => setShowPointChargeModal(true)}
        onLogout={() => {
          setIsMobileMenuOpen(false);
          setShowLogoutModal(true);
        }}
      />

      <div className="flex min-h-[calc(100vh-3.75rem)]">
        <div className="hidden w-[17rem] shrink-0 md:block">
          <Sidebar
            activeKey={activeKey}
            onNavigate={handleSidebarNavigate}
            userName={userName}
            profileImageUrl={profileImageUrl}
            onLogout={() => setShowLogoutModal(true)}
          />
        </div>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-4 pb-10 pt-6 sm:px-5 md:px-8 md:pt-10">
            <div className="mx-auto w-full max-w-[1280px]">{children}</div>
          </div>
        </main>
      </div>

      {showLogoutModal ? <LogoutConfirmModal onCancel={() => setShowLogoutModal(false)} onConfirm={handleLogoutConfirm} /> : null}
      {showPointChargeModal ? (
        <PointChargeModal
          onClose={() => setShowPointChargeModal(false)}
          onCharged={(result) => {
            setUserPoint(parsePoint(result?.currentPoint));
            setShowPointChargeSuccessModal(true);
          }}
        />
      ) : null}
      {showPointChargeSuccessModal ? <PointChargeSuccessModal onClose={() => setShowPointChargeSuccessModal(false)} /> : null}
    </div>
  );
};
