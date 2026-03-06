import { useEffect, useMemo, useRef, useState } from "react";
import { confirmPointCharge, getPointChargeProducts, preparePointCharge } from "../lib/paymentApi";
import { refreshAuthSession } from "../lib/apiClient";
import { buildMobileRedirectUrl, savePointChargeReturnPath } from "../lib/pointChargeFlow";

const PORTONE_SCRIPT_SRC = "https://cdn.iamport.kr/v1/iamport.js";
const DEFAULT_PG = import.meta.env.VITE_PORTONE_PG || "html5_inicis";

const formatNumber = (value) => {
  const safe = Number.isFinite(Number(value)) ? Number(value) : 0;
  return new Intl.NumberFormat("ko-KR").format(safe);
};

const toArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.products)) return payload.products;
  return [];
};

const toObject = (payload) => {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) return payload;
  return {};
};

const normalizePrepareData = (payload) => {
  const root = toObject(payload);
  const body = toObject(root.data);
  const source = Object.keys(body).length > 0 ? body : root;
  return {
    productId: String(source.productId || ""),
    merchantUid: String(source.merchantUid || ""),
    amount: Number(source.amount || 0),
    rewardPoint: Number(source.rewardPoint || 0),
    customerCode: String(source.customerCode || ""),
    buyerEmail: String(source.buyerEmail || ""),
    buyerName: String(source.buyerName || ""),
  };
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const loadPortoneScript = () => {
  return new Promise((resolve, reject) => {
    if (window.IMP) {
      resolve(window.IMP);
      return;
    }

    const existing = document.querySelector(`script[src="${PORTONE_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(window.IMP), { once: true });
      existing.addEventListener("error", () => reject(new Error("결제 스크립트를 불러오지 못했습니다.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = PORTONE_SCRIPT_SRC;
    script.async = true;
    script.onload = () => {
      if (!window.IMP) {
        reject(new Error("결제 모듈 초기화에 실패했습니다."));
        return;
      }
      resolve(window.IMP);
    };
    script.onerror = () => reject(new Error("결제 스크립트를 불러오지 못했습니다."));
    document.head.appendChild(script);
  });
};

const requestPortonePayment = ({ imp, pg, prepareData }) => {
  return new Promise((resolve, reject) => {
    imp.request_pay(
      {
        pg,
        pay_method: "card",
        merchant_uid: prepareData.merchantUid,
        name: `Vlainter 포인트 ${formatNumber(prepareData.rewardPoint)}P 충전`,
        amount: prepareData.amount,
        buyer_email: prepareData.buyerEmail,
        buyer_name: prepareData.buyerName,
        m_redirect_url: buildMobileRedirectUrl(),
      },
      (response) => {
        if (!response) {
          reject(new Error("결제 결과를 확인하지 못했습니다."));
          return;
        }

        if (!response.success) {
          reject(new Error(response.error_msg || "결제가 취소되었거나 실패했습니다."));
          return;
        }

        if (!response.imp_uid) {
          reject(new Error("결제 식별자(imp_uid)를 확인하지 못했습니다."));
          return;
        }
        resolve(response);
      }
    );
  });
};

export const PointChargeModal = ({ onClose, onCharged }) => {
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const closeButtonRef = useRef(null);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const payload = await getPointChargeProducts();
        const list = toArray(payload)
          .map((item) => ({
            productId: String(item?.productId || ""),
            amount: Number(item?.amount || 0),
            rewardPoint: Number(item?.rewardPoint || 0),
          }))
          .filter((item) => item.productId && item.amount > 0 && item.rewardPoint > 0)
          .sort((a, b) => a.amount - b.amount);

        setProducts(list);
        if (list.length > 0) {
          setSelectedProductId(list[0].productId);
        }
      } catch (error) {
        setErrorMessage(error?.message || "충전 상품을 불러오지 못했습니다.");
      } finally {
        setLoadingProducts(false);
      }
    };

    loadProducts();
  }, []);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  const selectedProduct = useMemo(() => {
    return products.find((product) => product.productId === selectedProductId) || null;
  }, [products, selectedProductId]);

  const handleCharge = async () => {
    if (!selectedProduct) {
      setErrorMessage("충전 상품을 선택해 주세요.");
      return;
    }

    setProcessing(true);
    setErrorMessage("");

    try {
      savePointChargeReturnPath(`${window.location.pathname}${window.location.search}`);
      const preparePayload = await preparePointCharge(selectedProduct.productId);
      const prepareData = normalizePrepareData(preparePayload);
      const imp = await loadPortoneScript();
      if (!prepareData.customerCode || !prepareData.merchantUid || prepareData.amount <= 0) {
        setErrorMessage("결제 설정(customerCode)이 누락되었습니다.");
        return;
      }

      imp.init(prepareData.customerCode);

      const paymentResult = await requestPortonePayment({
        imp,
        pg: DEFAULT_PG,
        prepareData,
      });

      const merchantUid = paymentResult.merchant_uid || prepareData.merchantUid;
      let confirmResult = null;
      let lastError = null;
      let recoveredUnauthorized = false;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          confirmResult = await confirmPointCharge({
            impUid: paymentResult.imp_uid,
            merchantUid,
          });
          break;
        } catch (error) {
          lastError = error;
          const message = String(error?.message || "");
          const status = Number(error?.status || 0);
          if (status === 401) {
            if (!recoveredUnauthorized) {
              const refreshed = await refreshAuthSession();
              if (refreshed) {
                recoveredUnauthorized = true;
                continue;
              }
            }
            setErrorMessage("로그인이 만료되었습니다. 다시 로그인한 뒤 결제 상태를 확인해 주세요.");
            return;
          }
          const retryable =
            message.includes("결제 정보를 찾을 수 없습니다") ||
            status === 408 ||
            status === 429 ||
            status >= 500 ||
            [502, 503, 504].includes(status);
          if (!retryable || attempt === 2) {
            break;
          }
          await sleep(700);
        }
      }

      if (!confirmResult) {
        setErrorMessage(lastError?.message || "결제 확인에 실패했습니다.");
        return;
      }

      if (typeof onCharged === "function") {
        await onCharged(confirmResult);
      }

      onClose();
    } catch (error) {
      setErrorMessage(error?.message || "포인트 충전에 실패했습니다.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-80 flex items-center justify-center bg-black/45 px-4"
      onClick={() => {
        if (!processing) onClose();
      }}
    >
      <div
        className="w-full max-w-[92vw] rounded-[18px] border border-[#d9d9d9] bg-white p-5 sm:max-w-130 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="point-charge-title"
        aria-describedby="point-charge-description"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="point-charge-title" className="text-[20px] font-semibold text-[#1f1f1f]">
              포인트 충전
            </h2>
            <p id="point-charge-description" className="mt-1 text-[12px] text-[#6f6f6f]">
              원하는 충전 상품을 선택하고 결제를 진행해 주세요.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => {
              if (!processing) onClose();
            }}
            disabled={processing}
            aria-disabled={processing}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#dddddd] text-[16px] text-[#777] disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="충전 모달 닫기"
          >
            ×
          </button>
        </div>

        <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
          {loadingProducts
            ? Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-[14vw] min-h-16 max-h-18.5 animate-pulse rounded-xl border border-[#e8e8e8] bg-[#f7f7f7] sm:h-18.5"
                />
              ))
            : products.map((product) => {
                const selected = selectedProductId === product.productId;
                const bonusPoint = Math.max(0, product.rewardPoint - product.amount);
                return (
                  <button
                    key={product.productId}
                    type="button"
                    onClick={() => setSelectedProductId(product.productId)}
                    className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                      selected ? "border-[#1f1f1f] bg-[#f7f7f7]" : "border-[#e1e1e1] bg-white hover:bg-[#fafafa]"
                    }`}
                  >
                    <p className="text-[12px] text-[#7a7a7a]">결제금액</p>
                    <p className="text-[18px] font-semibold text-[#202020]">{formatNumber(product.amount)}원</p>
                    <p className="mt-1 text-[12px] text-[#4b4b4b]">
                      지급 포인트 <span className="font-semibold">{formatNumber(product.rewardPoint)}P</span>
                      {bonusPoint > 0 ? ` (+${formatNumber(bonusPoint)}P)` : ""}
                    </p>
                  </button>
                );
              })}
        </div>

        {errorMessage ? <p className="mt-3 text-[12px] text-[#e14b4b]">{errorMessage}</p> : null}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              if (!processing) onClose();
            }}
            disabled={processing}
            className="rounded-[10px] border border-[#d6d6d6] px-4 py-2 text-[12px] text-[#666] disabled:cursor-not-allowed disabled:opacity-60"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleCharge}
            disabled={processing || loadingProducts || !selectedProduct}
            className="rounded-[10px] border border-[#1f1f1f] bg-[#1f1f1f] px-4 py-2 text-[12px] text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {processing ? "결제 진행 중..." : "결제하기"}
          </button>
        </div>
      </div>
    </div>
  );
};
