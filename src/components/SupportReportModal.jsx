import { useEffect, useMemo, useRef, useState } from "react";
import { sendSupportReport } from "../lib/supportApi";

const CATEGORY_OPTIONS = [
  { value: "BUG_REPORT", label: "버그 리포트" },
  { value: "MESSAGE", label: "운영자에게 한마디" },
];

export const SupportReportModal = ({ open, onClose }) => {
  const dialogRef = useRef(null);
  const titleInputRef = useRef(null);
  const screenshotInputRef = useRef(null);
  const lastFocusedElementRef = useRef(null);
  const [category, setCategory] = useState("BUG_REPORT");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [screenshot, setScreenshot] = useState(null);
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showSuccessState, setShowSuccessState] = useState(false);

  useEffect(() => {
    if (!open) return;
    lastFocusedElementRef.current = document.activeElement;
    setCategory("BUG_REPORT");
    setTitle("");
    setMessage("");
    setScreenshot(null);
    setSending(false);
    setErrorMessage("");
    setSuccessMessage("");
    setShowSuccessState(false);
    if (screenshotInputRef.current) {
      screenshotInputRef.current.value = "";
    }
  }, [open]);

  useEffect(() => {
    if (!showSuccessState) return undefined;
    const timer = window.setTimeout(() => {
      onClose?.();
    }, 900);
    return () => window.clearTimeout(timer);
  }, [showSuccessState, onClose]);

  useEffect(() => {
    if (!open) return undefined;

    titleInputRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !sending) {
        onClose?.();
        return;
      }
      if (event.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = dialog.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      lastFocusedElementRef.current?.focus?.();
    };
  }, [open, onClose, sending]);

  const helperText = useMemo(() => (
    category === "BUG_REPORT"
      ? "오류가 난 화면과 재현 방법을 적어주시면 운영자 디스코드로 바로 전송됩니다."
      : "운영자에게 남길 의견이나 요청사항을 적어주시면 운영자 디스코드로 전송됩니다."
  ), [category]);

  if (!open) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (sending) return;

    setSending(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const response = await sendSupportReport({
        category,
        title: title.trim(),
        message: message.trim(),
        screenshot,
      });
      setSuccessMessage(response?.message || "운영자에게 성공적으로 전달되었습니다. 감사합니다!");
      setTitle("");
      setMessage("");
      setScreenshot(null);
      setShowSuccessState(true);
      if (screenshotInputRef.current) {
        screenshotInputRef.current.value = "";
      }
    } catch (error) {
      setErrorMessage(error?.message || "전송에 실패했습니다.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/45 px-4 py-6">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="닫기"
        onClick={() => {
          if (!sending) onClose?.();
        }}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="support-report-modal-title"
        className="relative z-10 w-full max-w-[640px] rounded-[26px] border border-[#e4e7ee] bg-white p-6 shadow-[0_30px_90px_rgba(15,23,42,0.22)]"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[12px] font-semibold tracking-[0.12em] text-[#7a8190]">REPORT</p>
            <h2 id="support-report-modal-title" className="mt-2 text-[24px] font-semibold text-[#171b24]">버그 리포트 / 운영자에게 한마디</h2>
            <p className="mt-2 text-[13px] leading-[1.7] text-[#5e6472]">{helperText}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!sending) onClose?.();
            }}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#d8dde7] text-[18px] text-[#586172]"
            aria-label="닫기"
          >
            ×
          </button>
        </div>

        <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-2">
            <span className="text-[12px] font-semibold text-[#4f5664]">종류</span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="h-11 rounded-[14px] border border-[#d9dde5] px-3 text-[14px] text-[#171b24] outline-none focus:border-[#171b24]"
            >
              {CATEGORY_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-[12px] font-semibold text-[#4f5664]">제목</span>
            <input
              ref={titleInputRef}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={120}
              placeholder={category === "BUG_REPORT" ? "예: 모의면접 시작 버튼이 동작하지 않습니다" : "예: 이런 개선이 있었으면 좋겠습니다"}
              className="h-11 rounded-[14px] border border-[#d9dde5] px-3 text-[14px] text-[#171b24] outline-none focus:border-[#171b24]"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-[12px] font-semibold text-[#4f5664]">내용</span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={5000}
              rows={7}
              placeholder={category === "BUG_REPORT" ? "어느 화면에서 어떤 문제가 발생했는지 적어주세요." : "운영자에게 전달할 내용을 적어주세요."}
              className="rounded-[18px] border border-[#d9dde5] px-4 py-3 text-[14px] leading-[1.7] text-[#171b24] outline-none focus:border-[#171b24]"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-[12px] font-semibold text-[#4f5664]">스크린샷 첨부</span>
            <input
              ref={screenshotInputRef}
              type="file"
              accept="image/*"
              onChange={(event) => setScreenshot(event.target.files?.[0] || null)}
              className="block w-full text-[13px] text-[#4f5664] file:mr-3 file:rounded-[12px] file:border-0 file:bg-[#f3f5f9] file:px-3 file:py-2 file:text-[12px] file:font-semibold file:text-[#171b24]"
            />
            <p className="text-[12px] text-[#7a8190]">{screenshot ? screenshot.name : "이미지가 없어도 디스코드로 전송할 수 있습니다."}</p>
          </label>

          {errorMessage ? <p className="rounded-[14px] bg-[#fff2f2] px-4 py-3 text-[13px] text-[#d12f2f]">{errorMessage}</p> : null}
          {successMessage ? (
            <p className="flex items-center gap-2 rounded-[14px] bg-[#eefaf1] px-4 py-3 text-[13px] text-[#18794e]">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#18794e] text-[12px] font-bold text-white">
                ✓
              </span>
              <span>{successMessage}</span>
            </p>
          ) : null}

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                if (!sending) onClose?.();
              }}
              className="rounded-[14px] border border-[#d8dde7] px-4 py-2.5 text-[13px] font-semibold text-[#4f5664]"
            >
              닫기
            </button>
            <button
              type="submit"
              disabled={sending}
              className="rounded-[14px] bg-[#171b24] px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
            >
              {sending ? "전송 중..." : "전송하기"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
