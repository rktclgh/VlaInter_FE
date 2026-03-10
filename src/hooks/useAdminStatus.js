import { useEffect, useState } from "react";
import { extractProfile } from "../lib/profileUtils";
import { getMyProfile } from "../lib/userApi";

let cachedAdminStatus = null;
let adminStatusPromise = null;

const fetchAdminStatus = async () => {
  if (typeof cachedAdminStatus === "boolean") {
    return cachedAdminStatus;
  }
  if (!adminStatusPromise) {
    adminStatusPromise = getMyProfile()
      .then((payload) => {
        const profile = extractProfile(payload);
        cachedAdminStatus = String(profile?.role || "").toUpperCase() === "ADMIN";
        return cachedAdminStatus;
      })
      .catch((error) => {
        console.error("관리자 상태 확인에 실패했습니다.", error);
        cachedAdminStatus = false;
        return false;
      })
      .finally(() => {
        adminStatusPromise = null;
      });
  }
  return adminStatusPromise;
};

export function useAdminStatus(isAdmin) {
  const [fetchedIsAdmin, setFetchedIsAdmin] = useState(
    cachedAdminStatus ?? false
  );

  useEffect(() => {
    if (typeof isAdmin === "boolean") return;

    let cancelled = false;
    void fetchAdminStatus().then((resolved) => {
      if (!cancelled) {
        setFetchedIsAdmin(Boolean(resolved));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  return typeof isAdmin === "boolean" ? isAdmin : fetchedIsAdmin;
}
