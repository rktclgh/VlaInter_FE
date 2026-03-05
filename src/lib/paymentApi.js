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
