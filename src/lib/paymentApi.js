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
  return apiRequest(`/api/payments/points/${chargeId}/refund`, {
    method: "POST",
  });
}
