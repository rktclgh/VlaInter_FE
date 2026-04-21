import { useEffect, useState } from "react";
import { extractProfile } from "../lib/profileUtils";
import { getMyProfile } from "../lib/userApi";

let cachedAdminStatus = null;
let adminStatusPromise = null;
let adminStatusCacheVersion = 0;

export function resetAdminStatusCache() {
  cachedAdminStatus = null;
  adminStatusPromise = null;
  adminStatusCacheVersion += 1;
}

const fetchAdminStatus = async () => {
  if (typeof cachedAdminStatus === "boolean") {
    return cachedAdminStatus;
  }
  const requestVersion = adminStatusCacheVersion;
  if (!adminStatusPromise) {
    adminStatusPromise = getMyProfile()
      .then((payload) => {
        if (requestVersion !== adminStatusCacheVersion) {
          return cachedAdminStatus ?? false;
        }
        const profile = extractProfile(payload);
        cachedAdminStatus = String(profile?.role || "").toUpperCase() === "ADMIN";
        return cachedAdminStatus;
      })
      .catch((error) => {
        if (requestVersion !== adminStatusCacheVersion) {
          return cachedAdminStatus ?? false;
        }
        console.error("관리자 상태 확인에 실패했습니다.", error);
        cachedAdminStatus = false;
        return false;
      })
      .finally(() => {
        if (requestVersion === adminStatusCacheVersion) {
          adminStatusPromise = null;
        }
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
