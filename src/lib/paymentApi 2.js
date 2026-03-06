import { apiRequest } from "./apiClient";

export async function getPointChargeProducts() {
  return apiRequest("/api/payments/points/products", {
    method: "GET",
  });
}

export async function preparePointCharge(productId) {
  return apiRequest("/api/payments/points/prepare", {
    method: "POST",
    body: {
      productId,
    },
  });
}

export async function confirmPointCharge({ impUid, merchantUid }) {
  return apiRequest("/api/payments/points/confirm", {
    method: "POST",
    retryOnUnauthorized: false,
    body: {
      impUid,
      merchantUid,
    },
  });
}

export async function getPointPaymentHistory(page = 0, size = 10) {
  return apiRequest(`/api/payments/points/history?page=${page}&size=${size}`, {
    method: "GET",
  });
}

export async function getPointLedgerHistory(page = 0, size = 10) {
  return apiRequest(`/api/payments/points/ledger?page=${page}&size=${size}`, {
    method: "GET",
  });
}

export async function refundPointPayment(chargeId) {
  if (chargeId === null || chargeId === undefined || String(chargeId).trim() === "") {
    throw new Error("유효한 결제 ID가 필요합니다.");
  }
  const encodedChargeId = encodeURIComponent(String(chargeId).trim());
  return apiRequest(`/api/payments/points/${encodedChargeId}/refund`, {
    method: "POST",
    retryOnUnauthorized: false,
  });
}
