import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyProfile } from "../lib/userApi";
import { isAuthenticationError } from "../lib/apiClient";
import guideImage1 from "../assets/api_guide/1.png";
import guideImage2 from "../assets/api_guide/2.png";
import guideImage3 from "../assets/api_guide/3.png";
import guideImage4 from "../assets/api_guide/4.png";
import guideImage5 from "../assets/api_guide/5.png";
import guideImage6 from "../assets/api_guide/6.png";
import guideImage7 from "../assets/api_guide/7.png";
import guideImage8 from "../assets/api_guide/8.png";

const extractProfile = (payload) => {
  if (!payload || typeof payload !== "object") return {};
  if (payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)) return payload.data;
  if (payload.result && typeof payload.result === "object" && !Array.isArray(payload.result)) return payload.result;
  if (payload.user && typeof payload.user === "object" && !Array.isArray(payload.user)) return payload.user;
  return payload;
};

const GUIDE_STEPS = [
  { step: 1, image: guideImage1, body: "첫번째 체크박스를 체크하고 계속 버튼을 클릭합니다." },
  { step: 2, image: guideImage2, body: "좌측 하단 Get API key 버튼을 클릭합니다." },
  { step: 3, image: guideImage3, body: "우측 상단 API 키 만들기 버튼을 클릭합니다." },
  { step: 4, image: guideImage4, body: "프로젝트 만들기 버튼을 클릭합니다. 이름은 아무렇게나 지으셔도 상관 없습니다." },
  { step: 5, image: guideImage5, body: "프로젝트 만들기 버튼을 클릭합니다." },
  { step: 6, image: guideImage6, body: "키 만들기 버튼을 클릭합니다." },
  { step: 7, image: guideImage7, body: "빨간색 동그라미 외계어를 클릭합니다." },
  { step: 8, image: guideImage8, body: "키를 복사해서 마이페이지에 입력하고 저장하면 끝입니다." },
];

const GeminiApiGuideModal = ({ onClose, onGoToMyPage }) => {
  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/65 px-4 py-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="gemini-api-guide-title"
        aria-describedby="gemini-api-guide-description"
        className="flex max-h-[90vh] w-full max-w-[960px] flex-col overflow-hidden rounded-[24px] border border-[#e5e7eb] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.28)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#eef2f7] px-6 py-5 sm:px-7">
          <div>
            <p className="text-[12px] font-semibold tracking-[0.08em] text-[#6b7280]">API GUIDE</p>
            <h2 id="gemini-api-guide-title" className="mt-2 text-[26px] font-semibold text-[#111827]">
              Gemini API 발급 가이드
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[#d1d5db] px-3 py-1 text-[12px] font-semibold text-[#4b5563]"
          >
            닫기
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5 sm:px-7">
          <p id="gemini-api-guide-description" className="text-[14px] leading-[1.7] text-[#4b5563]">
            아래 순서대로 진행하신 뒤 발급된 키를 마이페이지에 저장하시면 바로 이용하실 수 있습니다.
          </p>

          <div className="mt-4">
            <a
              href="https://aistudio.google.com/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-[12px] border border-[#d1d5db] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#111827]"
            >
              Google AI Studio 열기
            </a>
          </div>

          <div className="mt-5 space-y-5">
            {GUIDE_STEPS.map((item) => (
              <section key={item.step} className="rounded-[22px] border border-[#e5e7eb] bg-[#fbfcfe] p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-[#111827] px-2 text-[12px] font-semibold text-white">
                    {item.step}
                  </span>
                  <p className="text-[15px] font-semibold text-[#111827]">STEP {item.step}</p>
                </div>

                <p className="mt-3 text-[14px] leading-[1.7] text-[#4b5563]">{item.body}</p>

                <div className="mt-4 overflow-hidden rounded-[18px] border border-[#dbe2ea] bg-white p-3 sm:p-4">
                  <img
                    src={item.image}
                    alt={`Gemini API 발급 가이드 ${item.step}단계`}
                    className="mx-auto w-full max-w-[820px] rounded-[12px] object-contain"
                  />
                </div>

                {item.step === 8 ? (
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={onGoToMyPage}
                      className="rounded-[12px] bg-[#111827] px-4 py-2.5 text-[13px] font-semibold text-white"
                    >
                      마이페이지로 가기
                    </button>
                  </div>
                ) : null}
              </section>
            ))}
          </div>
        </div>

        <div className="flex justify-end border-t border-[#eef2f7] px-6 py-4 sm:px-7">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[12px] bg-[#111827] px-4 py-2.5 text-[13px] font-semibold text-white"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
};

export const GeminiApiKeyGuard = ({ children }) => {
  const navigate = useNavigate();
  const [hasGeminiApiKey, setHasGeminiApiKey] = useState(true);
  const [loading, setLoading] = useState(true);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [profileCheckError, setProfileCheckError] = useState("");
  const [reloadSeed, setReloadSeed] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setProfileCheckError("");
      try {
        const payload = await getMyProfile();
        if (cancelled) return;
        const profile = extractProfile(payload);
        setHasGeminiApiKey(Boolean(profile?.hasGeminiApiKey));
      } catch (error) {
        if (cancelled) return;
        if (isAuthenticationError(error)) {
          navigate("/login", { replace: true });
          return;
        }
        console.error("GeminiApiKeyGuard profile check failed", error);
        setProfileCheckError("계정 상태를 확인하지 못했습니다. 네트워크를 확인한 뒤 다시 시도해 주세요.");
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
  }, [navigate, reloadSeed]);

  if (!loading && profileCheckError) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 px-4">
        <div className="w-full max-w-[520px] rounded-[20px] border border-[#e5e7eb] bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.24)]">
          <p className="text-[12px] font-semibold tracking-[0.08em] text-[#6b7280]">PROFILE CHECK FAILED</p>
          <h2 className="mt-2 text-[24px] font-semibold text-[#111827]">계정 정보를 다시 확인해 주세요</h2>
          <p className="mt-3 whitespace-pre-line text-[14px] leading-[1.7] text-[#4b5563]">
            {profileCheckError}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setReloadSeed((prev) => prev + 1)}
              className="rounded-[12px] border border-[#d1d5db] px-4 py-2.5 text-[13px] font-semibold text-[#374151]"
            >
              다시 시도
            </button>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="rounded-[12px] bg-[#111827] px-4 py-2.5 text-[13px] font-semibold text-white"
            >
              홈으로 이동
            </button>
          </div>
        </div>
      </div>
    );
  }

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
      <>
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 px-4">
          <div className="w-full max-w-[520px] rounded-[20px] border border-[#e5e7eb] bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.24)]">
            <p className="text-[12px] font-semibold tracking-[0.08em] text-[#6b7280]">API KEY REQUIRED</p>
            <h2 className="mt-2 text-[24px] font-semibold text-[#111827]">Gemini API 키 입력이 필요합니다</h2>
            <p className="mt-3 whitespace-pre-line text-[14px] leading-[1.7] text-[#4b5563]">
              {"본 서비스는 Gemini API를 기반으로 작동합니다.\n입력하신 API 키는 암호화되어 관리되며 비용이 따로 발생하지 않습니다."}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowGuideModal(true)}
                className="rounded-[12px] border border-[#d1d5db] px-4 py-2.5 text-[13px] font-semibold text-[#374151]"
              >
                API 발급 가이드
              </button>
              <button
                type="button"
                onClick={() => navigate("/content/mypage")}
                className="rounded-[12px] bg-[#111827] px-4 py-2.5 text-[13px] font-semibold text-white"
              >
                마이페이지로 이동
              </button>
            </div>
          </div>
        </div>
        {showGuideModal ? (
          <GeminiApiGuideModal
            onClose={() => setShowGuideModal(false)}
            onGoToMyPage={() => {
              setShowGuideModal(false);
              navigate("/content/mypage");
            }}
          />
        ) : null}
      </>
    );
  }

  return children;
};
