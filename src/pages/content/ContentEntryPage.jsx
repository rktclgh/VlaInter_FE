import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getMyProfile } from "../../lib/userApi";
import { extractProfile } from "../../lib/profileUtils";
import { normalizeServiceMode, SERVICE_MODE } from "../../lib/serviceMode";

export const ContentEntryPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const resolveEntry = async () => {
      try {
        const payload = await getMyProfile();
        if (cancelled) return;
        const profile = extractProfile(payload);
        const serviceMode = normalizeServiceMode(profile?.serviceMode);
        if (serviceMode === SERVICE_MODE.STUDENT) {
          navigate("/content/student", { replace: true });
          return;
        }
        if (serviceMode === SERVICE_MODE.JOB_SEEKER) {
          navigate("/content/interview", { replace: true });
          return;
        }
        navigate("/content/service-mode", { replace: true });
      } catch {
        if (!cancelled) {
          navigate("/login", { replace: true });
        }
      }
    };

    void resolveEntry();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6 text-center">
      <p className="text-[14px] text-[#555]">서비스 모드를 확인하는 중입니다...</p>
    </div>
  );
};
