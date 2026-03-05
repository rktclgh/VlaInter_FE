import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ContentTopNav } from "../../components/ContentTopNav";
import { Sidebar } from "../../components/Sidebar";
import { MobileSidebarDrawer } from "../../components/MobileSidebarDrawer";
import { PointChargeModal } from "../../components/PointChargeModal";
import tempProfileImage from "../../assets/icon/temp.png";
import { logout } from "../../lib/authApi";
import { getMyFiles, getMyProfile } from "../../lib/userApi";

const formatPoint = (value) => {
  const safeNumber = Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
  return `${new Intl.NumberFormat("ko-KR").format(safeNumber)}P`;
};

const parsePoint = (rawValue) => {
  if (typeof rawValue === "number") return rawValue;
  if (typeof rawValue === "string") {
    const normalized = rawValue.replace(/,/g, "").trim();
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const normalizeProfileImageUrl = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  const trimmed = rawUrl.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return "";
};

const extractProfile = (payload) => {
  if (!payload || typeof payload !== "object") return {};
  if (payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)) return payload.data;
  if (payload.result && typeof payload.result === "object" && !Array.isArray(payload.result)) return payload.result;
  if (payload.user && typeof payload.user === "object" && !Array.isArray(payload.user)) return payload.user;
  return payload;
};

const extractFileList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.files)) return payload.files;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

const LogoutConfirmModal = ({ onCancel, onConfirm }) => {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/35 px-4">
      <div className="w-full max-w-[420px] rounded-[16px] border border-[#d9d9d9] bg-white p-5">
        <p className="text-[15px] font-medium text-[#252525]">
          정말 로그아웃 하시겠습니까?
          <br />
          종료하지 않은 면접 내용은 저장되지 않습니다
        </p>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-[10px] border border-[#d6d6d6] px-3 py-1.5 text-[12px] text-[#666]"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-[10px] border border-[#1f1f1f] bg-[#1f1f1f] px-3 py-1.5 text-[12px] text-white"
          >
            로그아웃
          </button>
        </div>
      </div>
    </div>
  );
};

export const MyPage = () => {
  const navigate = useNavigate();

  const [userName, setUserName] = useState("사용자");
  const [userEmail, setUserEmail] = useState("-");
  const [userPoint, setUserPoint] = useState(0);
  const [profileImageUrl, setProfileImageUrl] = useState(tempProfileImage);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showPointChargeModal, setShowPointChargeModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const profilePayload = await getMyProfile();
        const profile = extractProfile(profilePayload);
        setUserName(profile?.name || "사용자");
        setUserEmail(profile?.email || "-");
        setUserPoint(parsePoint(profile?.point));

        const directProfileUrl = normalizeProfileImageUrl(profile?.profileImageUrl || profile?.imageUrl);
        if (directProfileUrl) {
          setProfileImageUrl(directProfileUrl);
        }
      } catch {
        navigate("/login", { replace: true });
        return;
      }

      try {
        const filesPayload = await getMyFiles();
        const files = extractFileList(filesPayload);
        const profileImageFile = files.find((file) => file?.fileType === "PROFILE_IMAGE");
        const url = normalizeProfileImageUrl(profileImageFile?.fileUrl);
        setProfileImageUrl((prev) => (url ? url : prev || tempProfileImage));
      } catch {
        setProfileImageUrl((prev) => prev || tempProfileImage);
      }
    };

    loadData();
  }, [navigate]);

  const requestLogout = () => setShowLogoutModal(true);

  const confirmLogout = async () => {
    try {
      await logout();
    } catch {
      // ignore
    } finally {
      setShowLogoutModal(false);
      navigate("/login", { replace: true });
    }
  };

  const onSelectSidebar = (item) => {
    setIsMobileMenuOpen(false);
    if (item?.path) navigate(item.path);
  };

  return (
    <div className="min-h-screen bg-white pt-[54px]">
      <ContentTopNav
        point={formatPoint(userPoint)}
        onClickCharge={() => setShowPointChargeModal(true)}
        onOpenMenu={() => setIsMobileMenuOpen(true)}
      />

      <MobileSidebarDrawer
        open={isMobileMenuOpen}
        activeKey="mypage"
        onClose={() => setIsMobileMenuOpen(false)}
        onNavigate={onSelectSidebar}
        userName={userName}
        profileImageUrl={profileImageUrl}
        fallbackProfileImageUrl={tempProfileImage}
        onLogout={() => {
          setIsMobileMenuOpen(false);
          requestLogout();
        }}
      />

      <div className="flex min-h-[calc(100vh-54px)]">
        <div className="hidden w-[272px] shrink-0 md:block">
          <Sidebar
            activeKey="mypage"
            onNavigate={onSelectSidebar}
            userName={userName}
            profileImageUrl={profileImageUrl}
            fallbackProfileImageUrl={tempProfileImage}
            onLogout={requestLogout}
          />
        </div>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-4 pb-6 pt-6 sm:px-5 md:px-8 md:pt-10">
          <div className="mx-auto w-full max-w-[980px]">
            <h1 className="text-[26px] font-medium text-[#1f1f1f] sm:text-[30px] md:text-[32px]">마이페이지</h1>

            <div className="mt-6 rounded-[16px] border border-[#e0e0e0] bg-white p-6">
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <img src={profileImageUrl} alt="프로필" className="h-16 w-16 rounded-full border border-[#dddddd] object-cover sm:h-20 sm:w-20" />
                <div>
                  <p className="text-[18px] font-medium text-[#1f1f1f] sm:text-[20px]">{userName}</p>
                  <p className="text-[12px] text-[#777] sm:text-[13px]">{userEmail}</p>
                  <p className="mt-1 text-[12px] text-[#666]">보유 포인트: {formatPoint(userPoint)}</p>
                </div>
              </div>
            </div>
          </div>
          </div>
        </main>
      </div>

      {showLogoutModal ? <LogoutConfirmModal onCancel={() => setShowLogoutModal(false)} onConfirm={confirmLogout} /> : null}
      {showPointChargeModal ? <PointChargeModal onClose={() => setShowPointChargeModal(false)} /> : null}
    </div>
  );
};
