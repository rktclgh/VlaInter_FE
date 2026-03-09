import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyProfile } from "../lib/userApi";

const extractProfile = (payload) => {
  if (!payload || typeof payload !== "object") return {};
  if (payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)) return payload.data;
  if (payload.result && typeof payload.result === "object" && !Array.isArray(payload.result)) return payload.result;
  if (payload.user && typeof payload.user === "object" && !Array.isArray(payload.user)) return payload.user;
  return payload;
};

export const GeminiApiKeyGuard = ({ children }) => {
  const navigate = useNavigate();
  const [hasGeminiApiKey, setHasGeminiApiKey] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const payload = await getMyProfile();
        if (cancelled) return;
        const profile = extractProfile(payload);
        setHasGeminiApiKey(Boolean(profile?.hasGeminiApiKey));
      } catch (error) {
        if (cancelled) return;
        console.error("GeminiApiKeyGuard profile check failed", error);
        setHasGeminiApiKey(false);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const showBlockingModal = !loading && !hasGeminiApiKey;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white pt-[54px]">
        <div className="inline-flex items-center gap-2 rounded-[12px] border border-[#e5e7eb] bg-white px-4 py-3 text-[13px] text-[#4b5563]">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#cbd5e1] border-t-[#111827]" />
          계정 상태를 확인하고 있습니다.
        </div>
      </div>
    );
  }

  if (showBlockingModal) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 px-4">
        <div className="w-full max-w-[520px] rounded-[20px] border border-[#e5e7eb] bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.24)]">
          <p className="text-[12px] font-semibold tracking-[0.08em] text-[#6b7280]">API KEY REQUIRED</p>
          <h2 className="mt-2 text-[24px] font-semibold text-[#111827]">Gemini API 키 입력이 필요합니다</h2>
          <p className="mt-3 whitespace-pre-line text-[14px] leading-[1.7] text-[#4b5563]">
            {"본 서비스는 Gemini API를 기반으로 작동합니다.\n입력하신 API 키는 암호화되어 관리되며 비용이 따로 발생하지 않습니다."}
          </p>
          <button
            type="button"
            onClick={() => navigate("/content/mypage")}
            className="mt-5 rounded-[12px] bg-[#111827] px-4 py-2.5 text-[13px] font-semibold text-white"
          >
            마이페이지로 이동
          </button>
        </div>
      </div>
    );
  }

  return children;
};
