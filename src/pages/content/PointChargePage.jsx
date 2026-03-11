import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ContentTopNav } from "../../components/ContentTopNav";
import { Sidebar } from "../../components/Sidebar";
import { MobileSidebarDrawer } from "../../components/MobileSidebarDrawer";
import { PointChargeModal } from "../../components/PointChargeModal";
import { PointChargeSuccessModal } from "../../components/PointChargeSuccessModal";
import tempProfileImage from "../../assets/icon/temp.png";
import { isAuthenticationError } from "../../lib/apiClient";
import { logout } from "../../lib/authApi";
import { consumePointChargeSuccessResult } from "../../lib/pointChargeFlow";
import {
  getPointLedgerHistory,
  getPointPaymentHistory,
  refundPointPayment,
} from "../../lib/paymentApi";
import { getMyProfile, getMyProfileImageUrl } from "../../lib/userApi";

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

const extractProfile = (payload) => {
  if (!payload || typeof payload !== "object") return {};
  if (payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)) return payload.data;
  if (payload.result && typeof payload.result === "object" && !Array.isArray(payload.result)) return payload.result;
  if (payload.user && typeof payload.user === "object" && !Array.isArray(payload.user)) return payload.user;
  return payload;
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
    <div className="mt-4 flex items-center justify-end gap-2">
      <button
        type="button"
        onClick={() => onChangePage(page - 1)}
        disabled={!hasPages || page <= 0}
        className="rounded-[8px] border border-[#d7d7d7] px-3 py-1 text-[12px] text-[#4f4f4f] disabled:cursor-not-allowed disabled:opacity-50"
      >
        이전
      </button>
      <span className="text-[12px] text-[#666]">
        {hasPages ? `${page + 1} / ${totalPages}` : "0 / 0"}
      </span>
      <button
        type="button"
        onClick={() => onChangePage(page + 1)}
        disabled={!hasPages || page >= totalPages - 1}
        className="rounded-[8px] border border-[#d7d7d7] px-3 py-1 text-[12px] text-[#4f4f4f] disabled:cursor-not-allowed disabled:opacity-50"
      >
        다음
      </button>
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

export const PointChargePage = () => {
  const navigate = useNavigate();

  const [userName, setUserName] = useState("사용자");
  const [userPoint, setUserPoint] = useState(0);
  const [profileImageUrl, setProfileImageUrl] = useState(tempProfileImage);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showPointChargeModal, setShowPointChargeModal] = useState(false);
  const [showPointChargeSuccessModal, setShowPointChargeSuccessModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
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

  const refreshPaymentHistory = async (targetPage = paymentPage) => {
    setPaymentLoading(true);
    setPaymentErrorMessage("");
    try {
      const payload = await getPointPaymentHistory(targetPage, PAGE_SIZE);
      const pageData = toPageData(payload);
      setPaymentHistory(pageData);
      setUserPoint(parsePoint(pageData.currentPoint));
    } catch (error) {
      setPaymentErrorMessage(error?.message || "결제 내역을 불러오지 못했습니다.");
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
      setLedgerErrorMessage(error?.message || "포인트 내역을 불러오지 못했습니다.");
    } finally {
      setLedgerLoading(false);
    }
  };

  useEffect(() => {
    const charged = consumePointChargeSuccessResult();
    if (!charged) return;
    const nextPoint = parsePoint(charged?.currentPoint);
    setUserPoint(nextPoint);
    setShowPointChargeSuccessModal(true);
    setPaymentPage(0);
    setLedgerPage(0);
  }, []);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profilePayload = await getMyProfile();
        const profile = extractProfile(profilePayload);
        setUserName(profile?.name || "사용자");
      setUserPoint(parsePoint(profile?.point));
      setProfileImageUrl(getMyProfileImageUrl());
    } catch (error) {
      if (isAuthenticationError(error)) {
        navigate("/login", { replace: true });
      }
    }
  };

    loadProfile();
  }, [navigate]);

  useEffect(() => {
    refreshPaymentHistory(paymentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentPage]);

  useEffect(() => {
    refreshLedgerHistory(ledgerPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ledgerPage]);

  const onSelectSidebar = (item) => {
    setIsMobileMenuOpen(false);
    if (item?.path) navigate(item.path);
  };

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

  const handleRefund = async (chargeId) => {
    setRefundingChargeId(chargeId);
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

  return (
    <div className="min-h-screen overflow-x-hidden bg-white pt-[54px]">
      <ContentTopNav
        point={pointSummaryText}
        onClickCharge={() => setShowPointChargeModal(true)}
        onOpenMenu={() => setIsMobileMenuOpen(true)}
      />

      <MobileSidebarDrawer
        open={isMobileMenuOpen}
        activeKey="point_charge"
        onClose={() => setIsMobileMenuOpen(false)}
        onNavigate={onSelectSidebar}
        userName={userName}
        profileImageUrl={profileImageUrl}
        onLogout={() => {
          setIsMobileMenuOpen(false);
          requestLogout();
        }}
      />

      <div className="flex min-h-[calc(100vh-54px)]">
        <div className="hidden w-[272px] shrink-0 md:block">
          <Sidebar
            activeKey="point_charge"
            onNavigate={onSelectSidebar}
            userName={userName}
            profileImageUrl={profileImageUrl}
            onLogout={requestLogout}
          />
        </div>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-4 pb-6 pt-6 sm:px-5 md:px-8 md:pt-10">
            <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6">
              <section className="rounded-[16px] border border-[#dedede] bg-[#f8f8f8] p-5 sm:p-6">
                <h1 className="text-[34px] font-semibold tracking-[-0.02em] text-[#1f1f1f]">결제 내역</h1>
                <p className="mt-3 text-[34px] font-semibold text-[#f45b2a]">현재 보유 포인트: {pointSummaryText}</p>

                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-[980px] table-auto border-collapse text-left">
                    <thead>
                      <tr className="bg-[#e7e7ea] text-[20px] text-[#1f1f1f]">
                        <th className="px-4 py-3 font-semibold">일자</th>
                        <th className="px-4 py-3 font-semibold">결제금액</th>
                        <th className="px-4 py-3 font-semibold">포인트변동</th>
                        <th className="px-4 py-3 font-semibold">결제수단</th>
                        <th className="px-4 py-3 font-semibold">상태</th>
                        <th className="px-4 py-3 font-semibold">결제번호</th>
                        <th className="px-4 py-3 font-semibold text-center">환불</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentLoading ? (
                        Array.from({ length: 5 }).map((_, index) => (
                          <tr key={`payment-skeleton-${index}`} className={index % 2 === 0 ? "bg-[#f4f4f6]" : "bg-[#ededf0]"}>
                            <td className="px-4 py-4" colSpan={7}>
                              <div className="h-5 w-full animate-pulse rounded bg-[#dcdce2]" />
                            </td>
                          </tr>
                        ))
                      ) : paymentHistory.items.length === 0 ? (
                        <tr className="bg-[#f4f4f6]">
                          <td className="px-4 py-8 text-center text-[15px] text-[#666]" colSpan={7}>
                            결제 내역이 없습니다.
                          </td>
                        </tr>
                      ) : (
                        paymentHistory.items.map((item, index) => {
                          const pointDelta = Number(item?.pointDelta || 0);
                          const refundable = Boolean(item?.refundable);
                          const busy = refundingChargeId === item?.chargeId;
                          return (
                            <tr key={`payment-row-${item.chargeId}-${index}`} className={index % 2 === 0 ? "bg-[#f4f4f6]" : "bg-[#ededf0]"}>
                              <td className="px-4 py-3 text-[16px] text-[#1f1f1f]">{toDateTime(item?.occurredAt)}</td>
                              <td className="px-4 py-3 text-[16px] text-[#1f1f1f]">{formatWon(item?.amount)}</td>
                              <td className={`px-4 py-3 text-[16px] font-semibold ${pointClassName(pointDelta)}`}>{formatDeltaPoint(pointDelta)}</td>
                              <td className="px-4 py-3 text-[16px] text-[#1f1f1f]">{item?.paymentMethod || "CARD"}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex rounded-full px-2.5 py-1 text-[13px] font-semibold ${statusClassName(item?.status)}`}>
                                  {statusLabel(item?.status)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-[15px] text-[#1f1f1f]">{item?.paymentNumber || "-"}</td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRefund(item.chargeId)}
                                  disabled={!refundable || busy}
                                  className={`rounded-[8px] border px-3 py-1.5 text-[13px] font-semibold ${
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

                {paymentErrorMessage ? <p className="mt-3 text-[13px] text-[#e14b4b]">{paymentErrorMessage}</p> : null}
                <HistoryPagination
                  page={paymentPage}
                  totalPages={paymentHistory.totalPages}
                  onChangePage={(nextPage) => setPaymentPage(Math.max(0, nextPage))}
                />
              </section>

              <section className="rounded-[16px] border border-[#dedede] bg-[#f8f8f8] p-5 sm:p-6">
                <h2 className="text-[34px] font-semibold tracking-[-0.02em] text-[#1f1f1f]">포인트 관리</h2>
                <p className="mt-4 text-[20px] text-[#111]">보유 포인트</p>
                <p className="mt-1 text-[48px] font-semibold text-[#f45b2a]">{pointSummaryText.replace("P", " P")}</p>
                <p className="mt-1 text-[16px] text-[#444]">현재 사용 가능한 포인트입니다</p>

                <button
                  type="button"
                  onClick={() => setShowPointChargeModal(true)}
                  className="mt-6 rounded-[12px] border border-black bg-black px-5 py-2.5 text-[18px] font-semibold text-white"
                >
                  포인트 충전하기
                </button>

                <h3 className="mt-8 text-[30px] font-semibold text-[#1f1f1f]">포인트 사용 내역</h3>

                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-[760px] table-auto border-collapse text-left">
                    <thead>
                      <tr className="bg-[#e7e7ea] text-[20px] text-[#1f1f1f]">
                        <th className="px-4 py-3 font-semibold">일자</th>
                        <th className="px-4 py-3 font-semibold">포인트변동</th>
                        <th className="px-4 py-3 font-semibold">내역</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledgerLoading ? (
                        Array.from({ length: 5 }).map((_, index) => (
                          <tr key={`ledger-skeleton-${index}`} className={index % 2 === 0 ? "bg-[#f4f4f6]" : "bg-[#ededf0]"}>
                            <td className="px-4 py-4" colSpan={3}>
                              <div className="h-5 w-full animate-pulse rounded bg-[#dcdce2]" />
                            </td>
                          </tr>
                        ))
                      ) : ledgerHistory.items.length === 0 ? (
                        <tr className="bg-[#f4f4f6]">
                          <td className="px-4 py-8 text-center text-[15px] text-[#666]" colSpan={3}>
                            포인트 내역이 없습니다.
                          </td>
                        </tr>
                      ) : (
                        ledgerHistory.items.map((item, index) => {
                          const delta = Number(item?.pointDelta || 0);
                          return (
                            <tr key={`ledger-row-${index}`} className={index % 2 === 0 ? "bg-[#f4f4f6]" : "bg-[#ededf0]"}>
                              <td className="px-4 py-3 text-[18px] text-[#1f1f1f]">{toDate(item?.occurredAt)}</td>
                              <td className={`px-4 py-3 text-[24px] font-semibold ${pointClassName(delta)}`}>{formatDeltaPoint(delta)}</td>
                              <td className="px-4 py-3 text-[18px] text-[#1f1f1f]">{item?.description || "-"}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {ledgerErrorMessage ? <p className="mt-3 text-[13px] text-[#e14b4b]">{ledgerErrorMessage}</p> : null}
                <HistoryPagination
                  page={ledgerPage}
                  totalPages={ledgerHistory.totalPages}
                  onChangePage={(nextPage) => setLedgerPage(Math.max(0, nextPage))}
                />
              </section>
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
    </div>
  );
};
