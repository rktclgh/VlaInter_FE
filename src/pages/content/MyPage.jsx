import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ContentTopNav } from "../../components/ContentTopNav";
import { Sidebar } from "../../components/Sidebar";
import { MobileSidebarDrawer } from "../../components/MobileSidebarDrawer";
import { PointChargeModal } from "../../components/PointChargeModal";
import { PointChargeSuccessModal } from "../../components/PointChargeSuccessModal";
import tempProfileImage from "../../assets/icon/temp.png";
import { logout } from "../../lib/authApi";
import { consumePointChargeSuccessResult } from "../../lib/pointChargeFlow";
import {
  getPointLedgerHistory,
  getPointPaymentHistory,
  refundPointPayment,
} from "../../lib/paymentApi";
import {
  changeMyPassword,
  deleteMyFile,
  getMyFiles,
  getMyProfile,
  getMyProfileImageUrl,
  uploadMyFile,
} from "../../lib/userApi";

const PAGE_SIZE = 10;

const formatPoint = (value) => {
  const safeNumber = Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
  return `${new Intl.NumberFormat("ko-KR").format(safeNumber)}P`;
};

const formatWon = (value) => {
  const safeNumber = Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
  return `${new Intl.NumberFormat("ko-KR").format(safeNumber)}원`;
};

const formatDeltaPoint = (value) => {
  const amount = Number(value || 0);
  if (amount > 0) return `+${new Intl.NumberFormat("ko-KR").format(amount)}P`;
  if (amount < 0) return `${new Intl.NumberFormat("ko-KR").format(amount)}P`;
  return "0P";
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

const extractFileId = (file) => file?.fileId ?? file?.file_id ?? null;

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

const toObject = (payload) => {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) return payload;
  return {};
};

const toPageData = (payload) => {
  const root = toObject(payload);
  const body = toObject(root.data);
  const source = Object.keys(body).length > 0 ? body : root;
  return {
    currentPoint: Number(source.currentPoint || 0),
    page: Number(source.page || 0),
    size: Number(source.size || PAGE_SIZE),
    totalCount: Number(source.totalCount || 0),
    totalPages: Number(source.totalPages || 0),
    items: Array.isArray(source.items) ? source.items : [],
  };
};

const toDate = (rawDateTime) => {
  if (!rawDateTime) return "-";
  const date = new Date(rawDateTime);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date).replace(/\.\s?/g, "-").replace(/-$/, "");
};

const toDateTime = (rawDateTime) => {
  if (!rawDateTime) return "-";
  const date = new Date(rawDateTime);
  if (Number.isNaN(date.getTime())) return "-";
  const datePart = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date).replace(/\.\s?/g, "-").replace(/-$/, "");
  const timePart = new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
  return `${datePart} ${timePart}`;
};

const statusLabel = (status) => {
  if (status === "PAID") return "결제완료";
  if (status === "CANCELLED") return "환불";
  if (status === "FAILED") return "실패";
  if (status === "READY") return "대기";
  return status || "-";
};

const statusClassName = (status) => {
  if (status === "PAID") return "bg-[#e8f1ff] text-[#2f67d8]";
  if (status === "CANCELLED") return "bg-[#ffe7ea] text-[#e04355]";
  if (status === "FAILED") return "bg-[#eceef1] text-[#808893]";
  return "bg-[#efefef] text-[#808080]";
};

const pointClassName = (delta) => {
  if (delta > 0) return "text-[#11a24e]";
  if (delta < 0) return "text-[#f45b2a]";
  return "text-[#6b7280]";
};

const HistoryPagination = ({ page, totalPages, onChangePage }) => {
  const hasPages = totalPages > 0;
  return (
    <div className="mt-3 flex items-center justify-end gap-2">
      <button
        type="button"
        onClick={() => onChangePage(page - 1)}
        disabled={!hasPages || page <= 0}
        className="rounded-[8px] border border-[#d7d7d7] px-2.5 py-1 text-[11px] text-[#4f4f4f] disabled:cursor-not-allowed disabled:opacity-50"
      >
        이전
      </button>
      <span className="text-[11px] text-[#666]">
        {hasPages ? `${page + 1} / ${totalPages}` : "0 / 0"}
      </span>
      <button
        type="button"
        onClick={() => onChangePage(page + 1)}
        disabled={!hasPages || page >= totalPages - 1}
        className="rounded-[8px] border border-[#d7d7d7] px-2.5 py-1 text-[11px] text-[#4f4f4f] disabled:cursor-not-allowed disabled:opacity-50"
      >
        다음
      </button>
    </div>
  );
};

const TabTrigger = ({ active, label, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-t-[11px] border border-b-0 px-3 py-1.5 text-[12px] font-semibold ${
        active
          ? "border-[#cfd4dd] bg-white text-[#242424]"
          : "border-[#d7dbe3] bg-[#eef1f6] text-[#666]"
      }`}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 fill-current">
        <path d="M3 6.5A2.5 2.5 0 0 1 5.5 4h4.3c.6 0 1.2.25 1.6.7l1.2 1.3h5.9A2.5 2.5 0 0 1 21 8.5v9A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5v-11z" />
      </svg>
      <span>{label}</span>
    </button>
  );
};

const PasswordChangeModal = ({
  currentPassword,
  newPassword,
  newPasswordConfirm,
  onChangeCurrentPassword,
  onChangeNewPassword,
  onChangeNewPasswordConfirm,
  onCancel,
  onSubmit,
  submitting,
  errorMessage,
}) => {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-4" onClick={onCancel}>
      <div
        className="w-full max-w-[420px] rounded-[16px] border border-[#d9d9d9] bg-white p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="text-[18px] font-semibold text-[#1f1f1f]">비밀번호 변경</h3>
        <p className="mt-1 text-[12px] text-[#6a6a6a]">
          변경 완료 후 보안을 위해 자동 로그아웃됩니다.
        </p>

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1 block text-[12px] text-[#5e5e5e]">현재 비밀번호</span>
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => onChangeCurrentPassword(event.target.value)}
              className="h-[38px] w-full rounded-[10px] border border-[#d8d8d8] px-3 text-[13px] text-[#202020] outline-none focus:border-[#9a9a9a]"
              autoComplete="current-password"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] text-[#5e5e5e]">새 비밀번호</span>
            <input
              type="password"
              value={newPassword}
              onChange={(event) => onChangeNewPassword(event.target.value)}
              className="h-[38px] w-full rounded-[10px] border border-[#d8d8d8] px-3 text-[13px] text-[#202020] outline-none focus:border-[#9a9a9a]"
              autoComplete="new-password"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] text-[#5e5e5e]">새 비밀번호 확인</span>
            <input
              type="password"
              value={newPasswordConfirm}
              onChange={(event) => onChangeNewPasswordConfirm(event.target.value)}
              className="h-[38px] w-full rounded-[10px] border border-[#d8d8d8] px-3 text-[13px] text-[#202020] outline-none focus:border-[#9a9a9a]"
              autoComplete="new-password"
            />
          </label>
        </div>

        {errorMessage ? <p className="mt-3 text-[12px] text-[#dc4b4b]">{errorMessage}</p> : null}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="rounded-[10px] border border-[#d6d6d6] px-3 py-1.5 text-[12px] text-[#666] disabled:opacity-60"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="rounded-[10px] border border-[#1f1f1f] bg-[#1f1f1f] px-3 py-1.5 text-[12px] text-white disabled:opacity-60"
          >
            {submitting ? "변경 중..." : "비밀번호 변경"}
          </button>
        </div>
      </div>
    </div>
  );
};

const ReLoginGuideModal = ({ onConfirm }) => {
  return (
    <div className="fixed inset-0 z-[82] flex items-center justify-center bg-black/45 px-4">
      <div className="w-full max-w-[400px] rounded-[16px] border border-[#d9d9d9] bg-white p-5">
        <h3 className="text-[18px] font-semibold text-[#1f1f1f]">비밀번호 변경 완료</h3>
        <p className="mt-2 text-[13px] leading-[1.6] text-[#575757]">
          변경된 비밀번호로 다시 로그인해 주세요.
        </p>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-[10px] border border-[#1f1f1f] bg-[#1f1f1f] px-4 py-2 text-[12px] text-white"
          >
            로그인 페이지로 이동
          </button>
        </div>
      </div>
    </div>
  );
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
  const location = useLocation();

  const [userName, setUserName] = useState("사용자");
  const [userEmail, setUserEmail] = useState("-");
  const [userPoint, setUserPoint] = useState(0);
  const [profileImageUrl, setProfileImageUrl] = useState(tempProfileImage);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showPointChargeModal, setShowPointChargeModal] = useState(false);
  const [showPointChargeSuccessModal, setShowPointChargeSuccessModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [showReLoginGuideModal, setShowReLoginGuideModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordErrorMessage, setPasswordErrorMessage] = useState("");

  const [profileUploading, setProfileUploading] = useState(false);
  const [profileUploadErrorMessage, setProfileUploadErrorMessage] = useState("");
  const profileImageInputRef = useRef(null);

  const [activeHistoryTab, setActiveHistoryTab] = useState("payment");
  const [refundingChargeId, setRefundingChargeId] = useState(null);

  const [paymentPage, setPaymentPage] = useState(0);
  const [paymentHistory, setPaymentHistory] = useState({
    currentPoint: 0,
    page: 0,
    totalPages: 0,
    totalCount: 0,
    items: [],
  });
  const [paymentLoading, setPaymentLoading] = useState(true);
  const [paymentErrorMessage, setPaymentErrorMessage] = useState("");

  const [ledgerPage, setLedgerPage] = useState(0);
  const [ledgerHistory, setLedgerHistory] = useState({
    currentPoint: 0,
    page: 0,
    totalPages: 0,
    totalCount: 0,
    items: [],
  });
  const [ledgerLoading, setLedgerLoading] = useState(true);
  const [ledgerErrorMessage, setLedgerErrorMessage] = useState("");

  useEffect(() => {
    const charged = consumePointChargeSuccessResult();
    if (!charged) return;
    const nextPoint = parsePoint(charged?.currentPoint);
    setUserPoint(nextPoint);
    setPaymentPage(0);
    setLedgerPage(0);
    setShowPointChargeSuccessModal(true);
  }, []);

  const refreshPaymentHistory = async (targetPage = paymentPage) => {
    setPaymentLoading(true);
    setPaymentErrorMessage("");
    try {
      const payload = await getPointPaymentHistory(targetPage, PAGE_SIZE);
      const pageData = toPageData(payload);
      setPaymentHistory(pageData);
      setUserPoint(parsePoint(pageData.currentPoint));
    } catch (error) {
      setPaymentErrorMessage(error?.message || "결제 내역 조회에 실패했습니다.");
    } finally {
      setPaymentLoading(false);
    }
  };

  const refreshLedgerHistory = async (targetPage = ledgerPage) => {
    setLedgerLoading(true);
    setLedgerErrorMessage("");
    try {
      const payload = await getPointLedgerHistory(targetPage, PAGE_SIZE);
      const pageData = toPageData(payload);
      setLedgerHistory(pageData);
      setUserPoint((prev) => {
        const candidate = parsePoint(pageData.currentPoint);
        return Number.isFinite(candidate) ? candidate : prev;
      });
    } catch (error) {
      setLedgerErrorMessage(error?.message || "포인트 내역 조회에 실패했습니다.");
    } finally {
      setLedgerLoading(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const profilePayload = await getMyProfile();
        const profile = extractProfile(profilePayload);
        setUserName(profile?.name || "사용자");
        setUserEmail(profile?.email || "-");
        setUserPoint(parsePoint(profile?.point));
        setProfileImageUrl(getMyProfileImageUrl());
      } catch {
        navigate("/login", { replace: true });
      }
    };

    loadData();
  }, [navigate]);

  useEffect(() => {
    refreshPaymentHistory(paymentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentPage]);

  useEffect(() => {
    refreshLedgerHistory(ledgerPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ledgerPage]);

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

  const handleClickProfileImage = () => {
    if (profileUploading) return;
    profileImageInputRef.current?.click();
  };

  const handleProfileImageFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const extension = file.name.toLowerCase();
    const isImageMime = file.type.startsWith("image/");
    const isImageExtension =
      extension.endsWith(".png") ||
      extension.endsWith(".jpg") ||
      extension.endsWith(".jpeg") ||
      extension.endsWith(".webp");
    if (!isImageMime || !isImageExtension) {
      setProfileUploadErrorMessage("프로필 사진은 PNG/JPG/JPEG/WEBP 형식만 업로드할 수 있습니다.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setProfileUploadErrorMessage("프로필 사진은 5MB 이하만 업로드할 수 있습니다.");
      return;
    }

    setProfileUploading(true);
    setProfileUploadErrorMessage("");

    try {
      let existingProfileFileIds;
      try {
        const filesPayload = await getMyFiles();
        existingProfileFileIds = extractFileList(filesPayload)
          .filter((savedFile) => savedFile?.fileType === "PROFILE_IMAGE")
          .map((savedFile) => extractFileId(savedFile))
          .filter((fileId) => fileId !== null && fileId !== undefined);
      } catch {
        existingProfileFileIds = [];
      }

      const uploaded = await uploadMyFile("PROFILE_IMAGE", file);
      const uploadedFileId = extractFileId(uploaded);

      const staleProfileFileIds = existingProfileFileIds.filter(
        (fileId) => String(fileId) !== String(uploadedFileId ?? "")
      );
      if (staleProfileFileIds.length > 0) {
        await Promise.allSettled(staleProfileFileIds.map((fileId) => deleteMyFile(fileId)));
      }
      setProfileImageUrl(getMyProfileImageUrl());
    } catch (error) {
      setProfileUploadErrorMessage(error?.message || "프로필 사진 업로드에 실패했습니다.");
    } finally {
      setProfileUploading(false);
    }
  };

  const openPasswordChangeModal = () => {
    setCurrentPassword("");
    setNewPassword("");
    setNewPasswordConfirm("");
    setPasswordErrorMessage("");
    setShowPasswordChangeModal(true);
  };

  const submitPasswordChange = async () => {
    if (!currentPassword || !newPassword || !newPasswordConfirm) {
      setPasswordErrorMessage("현재 비밀번호와 새 비밀번호를 모두 입력해 주세요.");
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setPasswordErrorMessage("새 비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    setPasswordSubmitting(true);
    setPasswordErrorMessage("");
    try {
      await changeMyPassword(currentPassword, newPassword);
      setShowPasswordChangeModal(false);
      setShowReLoginGuideModal(true);
    } catch (error) {
      setPasswordErrorMessage(error?.message || "비밀번호 변경에 실패했습니다.");
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const moveToLoginAfterPasswordChange = async () => {
    setShowReLoginGuideModal(false);
    try {
      await logout();
    } catch {
      // ignore logout failure and proceed to login screen
    } finally {
      navigate("/login", { replace: true });
    }
  };

  const handleRefund = async (chargeId) => {
    setRefundingChargeId(chargeId);
    setPaymentErrorMessage("");
    try {
      const result = await refundPointPayment(chargeId);
      setUserPoint(parsePoint(result?.currentPoint));
      await Promise.all([refreshPaymentHistory(paymentPage), refreshLedgerHistory(ledgerPage)]);
    } catch (error) {
      setPaymentErrorMessage(error?.message || "환불 처리에 실패했습니다.");
    } finally {
      setRefundingChargeId(null);
    }
  };

  const pointSummaryText = useMemo(() => formatPoint(userPoint), [userPoint]);
  const sidebarActiveKey = useMemo(() => {
    if (location.pathname.startsWith("/content/files")) return "file_upload";
    if (location.pathname.startsWith("/content/point-charge")) return "mypage";
    if (location.pathname.startsWith("/content/mypage")) return "mypage";
    return "mypage";
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-white pt-[54px]">
      <ContentTopNav
        point={pointSummaryText}
        onClickCharge={() => setShowPointChargeModal(true)}
        onOpenMenu={() => setIsMobileMenuOpen(true)}
      />

      <MobileSidebarDrawer
        open={isMobileMenuOpen}
        activeKey={sidebarActiveKey}
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
            activeKey={sidebarActiveKey}
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
                  <div className="relative">
                    <button
                      type="button"
                      onClick={handleClickProfileImage}
                      disabled={profileUploading}
                      className="relative"
                      aria-label="프로필 사진 변경"
                    >
                      <img
                        src={profileImageUrl}
                        alt="프로필"
                        className="h-16 w-16 rounded-full border border-[#dddddd] object-cover sm:h-20 sm:w-20"
                        onError={(event) => {
                          event.currentTarget.onerror = null;
                          event.currentTarget.src = tempProfileImage;
                        }}
                      />
                      <span className="absolute bottom-[-2px] right-[-2px] inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#d5d8de] bg-white text-[#5f6670] shadow-[0_2px_5px_rgba(0,0,0,0.16)]">
                        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
                          <path d="M7.5 5.5a2 2 0 0 1 1.8-1.1h5.4a2 2 0 0 1 1.8 1.1l.7 1.3h1.3a2.5 2.5 0 0 1 2.5 2.5v7.2a2.5 2.5 0 0 1-2.5 2.5H5.5A2.5 2.5 0 0 1 3 16.5V9.3a2.5 2.5 0 0 1 2.5-2.5h1.3l.7-1.3zm4.5 3.3a4.2 4.2 0 1 0 0 8.4 4.2 4.2 0 0 0 0-8.4zm0 1.8a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8z" />
                        </svg>
                      </span>
                    </button>
                    <input
                      ref={profileImageInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleProfileImageFileChange}
                      className="hidden"
                    />
                  </div>
                  <div>
                    <p className="text-[18px] font-medium text-[#1f1f1f] sm:text-[20px]">{userName}</p>
                    <p className="text-[12px] text-[#777] sm:text-[13px]">{userEmail}</p>
                    <p className="mt-1 text-[12px] text-[#666]">보유 포인트: {pointSummaryText}</p>
                    <p className="mt-1 text-[11px] text-[#8a8a8a]">
                      {profileUploading ? "프로필 사진 업로드 중..." : "프로필 이미지를 클릭해 사진을 변경할 수 있습니다."}
                    </p>
                  </div>
                </div>
                {profileUploadErrorMessage ? <p className="mt-3 text-[12px] text-[#d84a4a]">{profileUploadErrorMessage}</p> : null}
              </div>

              <div className="mt-4 rounded-[16px] border border-[#e0e0e0] bg-white p-6">
                <h2 className="text-[18px] font-medium text-[#1f1f1f]">보안 설정</h2>
                <p className="mt-1 text-[12px] text-[#7a7a7a]">비밀번호 변경 시 현재 세션은 종료되며 다시 로그인해야 합니다.</p>
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={openPasswordChangeModal}
                    className="rounded-[10px] border border-[#1f1f1f] bg-[#1f1f1f] px-4 py-2 text-[12px] text-white"
                  >
                    비밀번호 변경
                  </button>
                </div>
              </div>

              <div className="mt-5 rounded-[16px] border border-[#dde0e6] bg-[#f7f8fb] p-4 sm:p-5">
                <div className="mb-[-1px] flex items-end gap-1.5">
                  <TabTrigger
                    active={activeHistoryTab === "payment"}
                    label="결제내역"
                    onClick={() => setActiveHistoryTab("payment")}
                  />
                  <TabTrigger
                    active={activeHistoryTab === "point"}
                    label="포인트관리"
                    onClick={() => setActiveHistoryTab("point")}
                  />
                </div>

                <div className="rounded-[12px] border border-[#cfd4dd] bg-white p-3 sm:p-4">
                  {activeHistoryTab === "payment" ? (
                    <>
                      <h3 className="text-[20px] font-semibold text-[#1f1f1f]">결제 내역</h3>
                      <p className="mt-1 text-[16px] font-semibold text-[#f45b2a]">현재 보유 포인트: {pointSummaryText}</p>

                      <div className="mt-3 overflow-x-auto">
                        <table className="min-w-[760px] table-auto border-collapse text-left">
                          <thead>
                            <tr className="bg-[#ececf0] text-[13px] text-[#1f1f1f]">
                              <th className="px-3 py-2.5 font-semibold">일자</th>
                              <th className="px-3 py-2.5 font-semibold">결제금액</th>
                              <th className="px-3 py-2.5 font-semibold">포인트변동</th>
                              <th className="px-3 py-2.5 font-semibold">결제수단</th>
                              <th className="px-3 py-2.5 font-semibold">상태</th>
                              <th className="px-3 py-2.5 font-semibold">결제번호</th>
                              <th className="px-3 py-2.5 font-semibold text-center">환불</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paymentLoading ? (
                              Array.from({ length: 5 }).map((_, index) => (
                                <tr key={`payment-skeleton-${index}`} className={index % 2 === 0 ? "bg-[#f8f8fa]" : "bg-[#f2f3f6]"}>
                                  <td className="px-3 py-3" colSpan={7}>
                                    <div className="h-4 w-full animate-pulse rounded bg-[#dcdee4]" />
                                  </td>
                                </tr>
                              ))
                            ) : paymentHistory.items.length === 0 ? (
                              <tr className="bg-[#f8f8fa]">
                                <td className="px-3 py-8 text-center text-[12px] text-[#666]" colSpan={7}>
                                  결제 내역이 없습니다.
                                </td>
                              </tr>
                            ) : (
                              paymentHistory.items.map((item, index) => {
                                const pointDelta = Number(item?.pointDelta || 0);
                                const refundable = Boolean(item?.refundable);
                                const busy = refundingChargeId === item?.chargeId;
                                return (
                                  <tr key={`payment-row-${item.chargeId}-${index}`} className={index % 2 === 0 ? "bg-[#f8f8fa]" : "bg-[#f2f3f6]"}>
                                    <td className="px-3 py-2.5 text-[12px] text-[#1f1f1f]">{toDateTime(item?.occurredAt)}</td>
                                    <td className="px-3 py-2.5 text-[12px] text-[#1f1f1f]">{formatWon(item?.amount)}</td>
                                    <td className={`px-3 py-2.5 text-[12px] font-semibold ${pointClassName(pointDelta)}`}>{formatDeltaPoint(pointDelta)}</td>
                                    <td className="px-3 py-2.5 text-[12px] text-[#1f1f1f]">{item?.paymentMethod || "CARD"}</td>
                                    <td className="px-3 py-2.5">
                                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusClassName(item?.status)}`}>
                                        {statusLabel(item?.status)}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2.5 text-[12px] text-[#1f1f1f]">{item?.paymentNumber || "-"}</td>
                                    <td className="px-3 py-2.5 text-center">
                                      <button
                                        type="button"
                                        onClick={() => handleRefund(item.chargeId)}
                                        disabled={!refundable || busy}
                                        className={`rounded-[8px] border px-2.5 py-1 text-[11px] font-semibold ${
                                          refundable
                                            ? "border-[#ef4654] bg-[#ef4654] text-white hover:bg-[#df3342]"
                                            : "border-[#d4d7dd] bg-[#eceff3] text-[#9aa1ac]"
                                        } disabled:cursor-not-allowed disabled:opacity-70`}
                                      >
                                        {busy ? "처리중" : "환불"}
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>

                      {paymentErrorMessage ? <p className="mt-2 text-[12px] text-[#e14b4b]">{paymentErrorMessage}</p> : null}
                      <HistoryPagination
                        page={paymentPage}
                        totalPages={paymentHistory.totalPages}
                        onChangePage={(nextPage) => setPaymentPage(Math.max(0, nextPage))}
                      />
                    </>
                  ) : (
                    <>
                      <h3 className="text-[20px] font-semibold text-[#1f1f1f]">포인트 관리</h3>
                      <p className="mt-2 text-[13px] text-[#111]">보유 포인트</p>
                      <p className="mt-0.5 text-[34px] font-semibold text-[#f45b2a]">{pointSummaryText.replace("P", " P")}</p>
                      <p className="mt-0.5 text-[12px] text-[#555]">현재 사용 가능한 포인트입니다</p>

                      <button
                        type="button"
                        onClick={() => setShowPointChargeModal(true)}
                        className="mt-3 rounded-[10px] border border-black bg-black px-4 py-1.5 text-[12px] font-semibold text-white"
                      >
                        포인트 충전하기
                      </button>

                      <h4 className="mt-5 text-[16px] font-semibold text-[#1f1f1f]">포인트 사용 내역</h4>

                      <div className="mt-2 overflow-x-auto">
                        <table className="min-w-[560px] table-auto border-collapse text-left">
                          <thead>
                            <tr className="bg-[#ececf0] text-[13px] text-[#1f1f1f]">
                              <th className="px-3 py-2.5 font-semibold">일자</th>
                              <th className="px-3 py-2.5 font-semibold">포인트변동</th>
                              <th className="px-3 py-2.5 font-semibold">내역</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ledgerLoading ? (
                              Array.from({ length: 5 }).map((_, index) => (
                                <tr key={`ledger-skeleton-${index}`} className={index % 2 === 0 ? "bg-[#f8f8fa]" : "bg-[#f2f3f6]"}>
                                  <td className="px-3 py-3" colSpan={3}>
                                    <div className="h-4 w-full animate-pulse rounded bg-[#dcdee4]" />
                                  </td>
                                </tr>
                              ))
                            ) : ledgerHistory.items.length === 0 ? (
                              <tr className="bg-[#f8f8fa]">
                                <td className="px-3 py-8 text-center text-[12px] text-[#666]" colSpan={3}>
                                  포인트 내역이 없습니다.
                                </td>
                              </tr>
                            ) : (
                              ledgerHistory.items.map((item, index) => {
                                const delta = Number(item?.pointDelta || 0);
                                return (
                                  <tr key={`ledger-row-${index}`} className={index % 2 === 0 ? "bg-[#f8f8fa]" : "bg-[#f2f3f6]"}>
                                    <td className="px-3 py-2.5 text-[12px] text-[#1f1f1f]">{toDate(item?.occurredAt)}</td>
                                    <td className={`px-3 py-2.5 text-[12px] font-semibold ${pointClassName(delta)}`}>{formatDeltaPoint(delta)}</td>
                                    <td className="px-3 py-2.5 text-[12px] text-[#1f1f1f]">{item?.description || "-"}</td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>

                      {ledgerErrorMessage ? <p className="mt-2 text-[12px] text-[#e14b4b]">{ledgerErrorMessage}</p> : null}
                      <HistoryPagination
                        page={ledgerPage}
                        totalPages={ledgerHistory.totalPages}
                        onChangePage={(nextPage) => setLedgerPage(Math.max(0, nextPage))}
                      />
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {showLogoutModal ? <LogoutConfirmModal onCancel={() => setShowLogoutModal(false)} onConfirm={confirmLogout} /> : null}
      {showPointChargeModal ? (
        <PointChargeModal
          onClose={() => setShowPointChargeModal(false)}
          onCharged={async (result) => {
            const nextPoint = parsePoint(result?.currentPoint);
            setUserPoint(nextPoint);
            setPaymentPage(0);
            setLedgerPage(0);
            await Promise.all([refreshPaymentHistory(0), refreshLedgerHistory(0)]);
            setShowPointChargeSuccessModal(true);
          }}
        />
      ) : null}
      {showPointChargeSuccessModal ? (
        <PointChargeSuccessModal onClose={() => setShowPointChargeSuccessModal(false)} />
      ) : null}
      {showPasswordChangeModal ? (
        <PasswordChangeModal
          currentPassword={currentPassword}
          newPassword={newPassword}
          newPasswordConfirm={newPasswordConfirm}
          onChangeCurrentPassword={setCurrentPassword}
          onChangeNewPassword={setNewPassword}
          onChangeNewPasswordConfirm={setNewPasswordConfirm}
          onCancel={() => setShowPasswordChangeModal(false)}
          onSubmit={submitPasswordChange}
          submitting={passwordSubmitting}
          errorMessage={passwordErrorMessage}
        />
      ) : null}
      {showReLoginGuideModal ? <ReLoginGuideModal onConfirm={moveToLoginAfterPasswordChange} /> : null}
    </div>
  );
};
