import { useCallback, useEffect, useState } from "react";

export const PUBLIC_LOCALE_STORAGE_KEY = "public-locale";

export const normalizePublicLocale = (value) => (value === "en" ? "en" : "ko");

export const readPublicLocale = () => {
  if (typeof window === "undefined") return "ko";
  return normalizePublicLocale(window.localStorage.getItem(PUBLIC_LOCALE_STORAGE_KEY));
};

export const writePublicLocale = (value) => {
  if (typeof window === "undefined") return;
  const normalized = normalizePublicLocale(value);
  window.localStorage.setItem(PUBLIC_LOCALE_STORAGE_KEY, normalized);
  window.dispatchEvent(new CustomEvent("public-locale-change", { detail: normalized }));
};

export const usePublicLocale = () => {
  const [locale, setLocale] = useState(() => readPublicLocale());

  useEffect(() => {
    const handleLocaleChange = (event) => {
      setLocale(normalizePublicLocale(event?.detail));
    };
    const handleStorage = () => {
      setLocale(readPublicLocale());
    };

    window.addEventListener("public-locale-change", handleLocaleChange);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("public-locale-change", handleLocaleChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const updateLocale = useCallback((value) => {
    const normalized = normalizePublicLocale(value);
    setLocale(normalized);
    writePublicLocale(normalized);
  }, []);

  return { locale, setLocale: updateLocale };
};
