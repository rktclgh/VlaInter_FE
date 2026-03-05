import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ContentTopNav } from "../../components/ContentTopNav";
import { Sidebar } from "../../components/Sidebar";
import { MobileSidebarDrawer } from "../../components/MobileSidebarDrawer";
import { PointChargeModal } from "../../components/PointChargeModal";
import { PointChargeSuccessModal } from "../../components/PointChargeSuccessModal";
import dragDropIcon from "../../assets/icon/Drag_Drop.png";
import plusIcon from "../../assets/icon/plus.png";
import tempProfileImage from "../../assets/icon/temp.png";
import { logout } from "../../lib/authApi";
import { consumePointChargeSuccessResult } from "../../lib/pointChargeFlow";
import { deleteMyFile, getMyFiles, getMyProfile, uploadMyFile } from "../../lib/userApi";

const DOCUMENT_TYPES = [
  { key: "RESUME", title: "이력서" },
  { key: "INTRODUCE", title: "자기소개서" },
  { key: "PORTFOLIO", title: "포트폴리오" },
];

const formatPoint = (value) => {
  const safeNumber = Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
  return `${new Intl.NumberFormat("ko-KR").format(safeNumber)}P`;
};

const parsePoint = (rawValue) => {
  if (typeof rawValue === "number") return rawValue;
  if (typeof rawValue === "string") {
    const normalized = rawValue.replace(/,/g, "").trim();
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const normalizeProfileImageUrl = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  const trimmed = rawUrl.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return "";
};

const extractFileList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.files)) return payload.files;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

const extractFileRecord = (payload) => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  if (payload.fileId || payload.fileType || payload.fileUrl || payload.fileName) return payload;
  if (payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)) return payload.data;
  if (payload.result && typeof payload.result === "object" && !Array.isArray(payload.result)) return payload.result;
  if (payload.file && typeof payload.file === "object" && !Array.isArray(payload.file)) return payload.file;
  if (payload.item && typeof payload.item === "object" && !Array.isArray(payload.item)) return payload.item;
  return payload;
};

const resolveDisplayFileName = (file, fallback = "") => {
  const rawNameCandidates = [
    file?.fileName,
    file?.filename,
    file?.file_name,
    file?.originalFileName,
    file?.original_filename,
    file?.name,
    fallback,
  ];
  const directName = rawNameCandidates.find((value) => typeof value === "string" && value.trim().length > 0);
  if (directName) return directName.trim();

  const rawUrlCandidates = [file?.fileUrl, file?.url, file?.file_url];
  const rawUrl = rawUrlCandidates.find((value) => typeof value === "string" && value.trim().length > 0);
  if (rawUrl) {
    const lastSegment = rawUrl.split("/").pop() || "";
    let decoded = lastSegment;
    try {
      decoded = decodeURIComponent(lastSegment);
    } catch {
      decoded = lastSegment;
    }
    // key 예: uuid-original.pdf 형태일 수 있으므로 UUID prefix 제거
    const withoutUuidPrefix = decoded.replace(/^[0-9a-fA-F-]{16,}-/, "");
    return withoutUuidPrefix || decoded || "파일명 없음";
  }

  return "파일명 없음";
};

const normalizeFileRecord = (file, fallbackName = "") => {
  const source = extractFileRecord(file);
  if (!source || typeof source !== "object") {
    return {
      fileId: null,
      fileType: "",
      fileUrl: "",
      fileName: fallbackName || "파일명 없음",
      createdAt: new Date().toISOString(),
    };
  }

  return {
    ...source,
    fileId: source.fileId ?? source.file_id ?? null,
    fileType: source.fileType ?? source.file_type ?? "",
    fileUrl: source.fileUrl ?? source.file_url ?? source.url ?? "",
    fileName: resolveDisplayFileName(source, fallbackName),
    createdAt: source.createdAt ?? source.created_at ?? new Date().toISOString(),
  };
};

const extractProfile = (payload) => {
  if (!payload || typeof payload !== "object") return {};
  if (payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)) return payload.data;
  if (payload.result && typeof payload.result === "object" && !Array.isArray(payload.result)) return payload.result;
  if (payload.user && typeof payload.user === "object" && !Array.isArray(payload.user)) return payload.user;
  return payload;
};

const isPdfFile = (file) => {
  const lowerName = (file?.name || "").toLowerCase();
  const extensionValid = lowerName.endsWith(".pdf");
  const mimeValid = !file?.type || file.type === "application/pdf";
  return extensionValid && mimeValid;
};

const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "-";
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
};

const formatDate = (iso) => {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toISOString().slice(0, 10).replace(/-/g, ".");
};

const LogoutConfirmModal = ({ onCancel, onConfirm }) => {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/35 px-4">
      <div className="w-full max-w-[420px] rounded-[16px] border border-[#d9d9d9] bg-white p-5">
        <p className="text-[15px] font-medium text-[#252525]">
          정말 로그아웃 하시겠습니까?
          <br />
          종료하지 않은 면접 내용은 저장되지 않습니다
        </p>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-[10px] border border-[#d6d6d6] px-3 py-1.5 text-[12px] text-[#666]"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-[10px] border border-[#1f1f1f] bg-[#1f1f1f] px-3 py-1.5 text-[12px] text-white"
          >
            로그아웃
          </button>
        </div>
      </div>
    </div>
  );
};

const FileDeleteConfirmModal = ({ onCancel, onConfirm }) => {
  return (
    <div className="fixed inset-0 z-[72] flex items-center justify-center bg-black/35 px-4">
      <div className="w-full max-w-[360px] rounded-[16px] border border-[#d9d9d9] bg-white p-5">
        <div className="flex items-start gap-3">
          <div className="relative mt-[2px] h-0 w-0 border-l-[14px] border-r-[14px] border-b-[24px] border-l-transparent border-r-transparent border-b-[#ff4d4f]">
            <span className="absolute left-[-3px] top-[7px] text-[10px] font-bold leading-none text-white">!</span>
          </div>
          <p className="text-[15px] font-medium text-[#252525]">정말 파일을 삭제하시겠습니까?</p>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-[10px] border border-[#d6d6d6] px-3 py-1.5 text-[12px] text-[#666]"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-[10px] border border-[#ff4a4a] bg-[#ff4a4a] px-3 py-1.5 text-[12px] text-white"
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  );
};

const FileRow = ({ fileName, uploadedDate, sizeLabel, showPdfBadge = true, actionNode = null }) => {
  return (
    <div className="flex flex-col gap-3 rounded-[12px] border border-[#dddddd] bg-[#f7f7f7] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        {showPdfBadge ? (
          <div className="flex h-9 w-7 shrink-0 flex-col items-center justify-center rounded-[4px] border border-[#ff5c5c] text-[9px] font-semibold text-[#ff3d3d]">
            PDF
          </div>
        ) : null}
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-[#2b2b2b]">{fileName}</p>
          <p className="mt-0.5 text-[10px] text-[#9d9d9d]">업로드 날짜: {uploadedDate}</p>
          <p className="text-[10px] text-[#9d9d9d]">{sizeLabel}</p>
        </div>
      </div>
      <div className="self-end sm:self-auto">{actionNode}</div>
    </div>
  );
};

const UploadDropZone = ({
  dragActive,
  pendingFile,
  savedFile,
  error,
  loading,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileInput,
  onDeletePending,
  onSavePending,
  onDeleteSaved,
  isExpanded,
  onToggleExpanded,
  inputId,
}) => {
  const renderDropArea = () => (
    <div
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`rounded-[14px] border border-dashed px-4 py-7 text-center transition-colors ${
        dragActive ? "border-[#8db0ff] bg-[#f7faff]" : "border-[#dfdfdf] bg-white"
      }`}
    >
      <img src={dragDropIcon} alt="드래그 앤 드롭" className="mx-auto h-7 w-7" />
      <p className="mt-3 text-[16px] text-[#222] sm:text-[18px]">드래그하여 업로드하기</p>
      <label htmlFor={inputId} className="mt-1 inline-block cursor-pointer text-[11px] text-[#8d8d8d] underline">
        또는 파일 불러오기
      </label>
      <input id={inputId} type="file" accept="application/pdf,.pdf" onChange={onFileInput} className="hidden" />
      <p className="mt-2 text-[10px] text-[#c0c0c0]">pdf</p>
      {error ? <p className="mt-2 text-[11px] text-[#e34b4b]">{error}</p> : null}
    </div>
  );

  if (pendingFile) {
    return (
      <div className="relative rounded-[14px] border border-[#dedede] bg-white px-4 py-4">
        <button
          type="button"
          onClick={onDeletePending}
          className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full border border-[#d9d9d9] text-[12px] text-[#8a8a8a]"
          aria-label="업로드 대기 파일 제거"
        >
          ×
        </button>

        <FileRow
          fileName={pendingFile.name}
          uploadedDate={formatDate(new Date().toISOString())}
          sizeLabel={formatBytes(pendingFile.size)}
        />

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={onSavePending}
            disabled={loading}
            className="rounded-[10px] border border-[#d0d0d0] px-3 py-1 text-[11px] text-[#2a2a2a] disabled:opacity-60"
          >
            {loading ? "저장 중..." : "저장"}
          </button>
        </div>

        {error ? <p className="mt-2 text-[11px] text-[#e34b4b]">{error}</p> : null}
      </div>
    );
  }

  if (savedFile) {
    return (
      <div>
        <div className="rounded-[14px] border border-[#dedede] bg-white px-4 py-4">
          <FileRow
            fileName={resolveDisplayFileName(savedFile)}
            uploadedDate={formatDate(savedFile.createdAt ?? savedFile.created_at)}
            sizeLabel="PDF"
            actionNode={
              <button
                type="button"
                onClick={onDeleteSaved}
                className="rounded-full bg-[#ff4a4a] px-2 py-1 text-[10px] font-semibold text-white"
              >
                삭제
              </button>
            }
          />
        </div>

        <div className="mt-3 flex justify-center">
          <button
            type="button"
            onClick={onToggleExpanded}
            aria-label={isExpanded ? "업로드 창 닫기" : "업로드 창 열기"}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-[#d7d7d7] bg-[#fcfcfc] transition-colors hover:bg-[#f3f3f3]"
          >
            <img
              src={plusIcon}
              alt=""
              className={`h-[11px] w-[11px] transition-transform duration-300 ${isExpanded ? "rotate-45" : "rotate-0"}`}
            />
          </button>
        </div>

        <div
          className={`overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isExpanded ? "mt-2 max-h-[230px] translate-y-0 opacity-100" : "max-h-0 -translate-y-1 opacity-0"
          }`}
        >
          <div className={isExpanded ? "pointer-events-auto" : "pointer-events-none"}>{renderDropArea()}</div>
        </div>
      </div>
    );
  }

  return renderDropArea();
};

export const FileUploadPage = () => {
  const navigate = useNavigate();

  const [userName, setUserName] = useState("사용자");
  const [userPoint, setUserPoint] = useState(0);
  const [profileImageUrl, setProfileImageUrl] = useState(tempProfileImage);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showPointChargeModal, setShowPointChargeModal] = useState(false);
  const [showPointChargeSuccessModal, setShowPointChargeSuccessModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState(null);

  const [savedFiles, setSavedFiles] = useState({ RESUME: null, INTRODUCE: null, PORTFOLIO: null });
  const [pendingFiles, setPendingFiles] = useState({ RESUME: null, INTRODUCE: null, PORTFOLIO: null });
  const [expandedUploadByType, setExpandedUploadByType] = useState({ RESUME: false, INTRODUCE: false, PORTFOLIO: false });
  const [errors, setErrors] = useState({ RESUME: "", INTRODUCE: "", PORTFOLIO: "" });
  const [dragActiveType, setDragActiveType] = useState("");
  const [savingType, setSavingType] = useState("");

  useEffect(() => {
    const charged = consumePointChargeSuccessResult();
    if (!charged) return;
    const nextPoint = parsePoint(charged?.currentPoint);
    setUserPoint(nextPoint);
    setShowPointChargeSuccessModal(true);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const profilePayload = await getMyProfile();
        const profile = extractProfile(profilePayload);
        setUserName(profile?.name || "사용자");
        setUserPoint(parsePoint(profile?.point));
        const directProfileUrl = normalizeProfileImageUrl(profile?.profileImageUrl || profile?.imageUrl);
        if (directProfileUrl) {
          setProfileImageUrl(directProfileUrl);
        }
      } catch {
        navigate("/login", { replace: true });
        return;
      }

      try {
        const filesPayload = await getMyFiles();
        const files = extractFileList(filesPayload).map((file) => normalizeFileRecord(file));

        const nextSaved = { RESUME: null, INTRODUCE: null, PORTFOLIO: null };
        for (const file of files) {
          if (nextSaved[file?.fileType] === null && nextSaved[file?.fileType] !== undefined) {
            nextSaved[file.fileType] = file;
          }
        }
        setSavedFiles(nextSaved);

        const profileImageFile = files.find((file) => file?.fileType === "PROFILE_IMAGE");
        const url = normalizeProfileImageUrl(profileImageFile?.fileUrl);
        setProfileImageUrl((prev) => (url ? url : prev || tempProfileImage));
      } catch {
        setProfileImageUrl((prev) => prev || tempProfileImage);
      }
    };

    loadData();
  }, [navigate]);

  const onSelectSidebar = (item) => {
    setIsMobileMenuOpen(false);
    if (item?.path) navigate(item.path);
  };

  const requestLogout = () => setShowLogoutModal(true);

  const confirmLogout = async () => {
    try {
      await logout();
    } catch {
      // ignore
    } finally {
      setShowLogoutModal(false);
      navigate("/login", { replace: true });
    }
  };

  const setTypeError = (type, message) => {
    setErrors((prev) => ({ ...prev, [type]: message }));
  };

  const handleFilePicked = (type, file) => {
    if (!file) return;
    if (!isPdfFile(file)) {
      setTypeError(type, "PDF 파일만 업로드할 수 있습니다.");
      return;
    }

    setTypeError(type, "");
    setPendingFiles((prev) => ({ ...prev, [type]: file }));
    setExpandedUploadByType((prev) => ({ ...prev, [type]: false }));
  };

  const makeDragHandlers = (type) => ({
    onDragEnter: (event) => {
      event.preventDefault();
      event.stopPropagation();
      setDragActiveType(type);
    },
    onDragOver: (event) => {
      event.preventDefault();
      event.stopPropagation();
      setDragActiveType(type);
    },
    onDragLeave: (event) => {
      event.preventDefault();
      event.stopPropagation();
      setDragActiveType((prev) => (prev === type ? "" : prev));
    },
    onDrop: (event) => {
      event.preventDefault();
      event.stopPropagation();
      setDragActiveType("");
      const file = event.dataTransfer?.files?.[0];
      handleFilePicked(type, file);
    },
  });

  const handleFileInput = (type, event) => {
    const file = event.target.files?.[0];
    handleFilePicked(type, file);
    event.target.value = "";
  };

  const removePending = (type) => {
    setPendingFiles((prev) => ({ ...prev, [type]: null }));
    setTypeError(type, "");
  };

  const toggleExpandedUploader = (type) => {
    setExpandedUploadByType((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const savePending = async (type) => {
    const file = pendingFiles[type];
    if (!file) return;

    setSavingType(type);
    setTypeError(type, "");

    try {
      const uploaded = await uploadMyFile(type, file);
      const normalizedUploaded = normalizeFileRecord(uploaded, file.name);
      setSavedFiles((prev) => ({ ...prev, [type]: normalizedUploaded }));
      setPendingFiles((prev) => ({ ...prev, [type]: null }));
    } catch (error) {
      setTypeError(type, error?.message || "파일 저장 중 오류가 발생했습니다.");
    } finally {
      setSavingType("");
    }
  };

  const deleteSaved = async (type) => {
    const target = savedFiles[type];
    if (!target?.fileId) {
      setSavedFiles((prev) => ({ ...prev, [type]: null }));
      return;
    }

    try {
      await deleteMyFile(target.fileId);
      setSavedFiles((prev) => ({ ...prev, [type]: null }));
      setExpandedUploadByType((prev) => ({ ...prev, [type]: false }));
    } catch (error) {
      setTypeError(type, error?.message || "파일 삭제 중 오류가 발생했습니다.");
    }
  };

  const requestDeletePending = (type) => {
    setDeleteConfirmTarget({ type, mode: "pending" });
  };

  const requestDeleteSaved = (type) => {
    setDeleteConfirmTarget({ type, mode: "saved" });
  };

  const confirmDelete = async () => {
    if (!deleteConfirmTarget?.type) {
      setDeleteConfirmTarget(null);
      return;
    }

    const { type, mode } = deleteConfirmTarget;
    setDeleteConfirmTarget(null);

    if (mode === "pending") {
      removePending(type);
      return;
    }
    await deleteSaved(type);
  };

  const hasAnyPending = useMemo(() => Object.values(pendingFiles).some(Boolean), [pendingFiles]);

  return (
    <div className="min-h-screen bg-white pt-[54px]">
      <ContentTopNav
        point={formatPoint(userPoint)}
        onClickCharge={() => setShowPointChargeModal(true)}
        onOpenMenu={() => setIsMobileMenuOpen(true)}
      />

      <MobileSidebarDrawer
        open={isMobileMenuOpen}
        activeKey="file_upload"
        onClose={() => setIsMobileMenuOpen(false)}
        onNavigate={onSelectSidebar}
        userName={userName}
        profileImageUrl={profileImageUrl}
        fallbackProfileImageUrl={tempProfileImage}
        onLogout={() => {
          setIsMobileMenuOpen(false);
          requestLogout();
        }}
      />

      <div className="flex min-h-[calc(100vh-54px)]">
        <div className="hidden w-[272px] shrink-0 md:block">
          <Sidebar
            activeKey="file_upload"
            onNavigate={onSelectSidebar}
            userName={userName}
            profileImageUrl={profileImageUrl}
            fallbackProfileImageUrl={tempProfileImage}
            onLogout={requestLogout}
          />
        </div>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-4 pb-6 pt-6 sm:px-5 md:px-8 md:pt-10">
          <div className="mx-auto w-full max-w-[980px]">
            <h1 className="text-[24px] font-medium text-[#202020] sm:text-[28px] md:text-[30px]">이력서 및 자기소개서 업로드</h1>

            {hasAnyPending ? (
              <p className="mt-2 text-[12px] text-[#8a8a8a]">저장 버튼을 눌러 업로드를 확정해 주세요.</p>
            ) : null}

            <div className="mt-6 space-y-6">
              {DOCUMENT_TYPES.map((item) => {
                const dragHandlers = makeDragHandlers(item.key);
                return (
                  <section key={item.key}>
                    <h2 className="mb-2 text-[16px] font-medium text-[#2a2a2a] sm:text-[18px]">{item.title}</h2>

                    <UploadDropZone
                      dragActive={dragActiveType === item.key}
                      pendingFile={pendingFiles[item.key]}
                      savedFile={savedFiles[item.key]}
                      error={errors[item.key]}
                      loading={savingType === item.key}
                      onDragEnter={dragHandlers.onDragEnter}
                      onDragOver={dragHandlers.onDragOver}
                      onDragLeave={dragHandlers.onDragLeave}
                      onDrop={dragHandlers.onDrop}
                      onFileInput={(event) => handleFileInput(item.key, event)}
                      onDeletePending={() => requestDeletePending(item.key)}
                      onSavePending={() => savePending(item.key)}
                      onDeleteSaved={() => requestDeleteSaved(item.key)}
                      isExpanded={expandedUploadByType[item.key]}
                      onToggleExpanded={() => toggleExpandedUploader(item.key)}
                      inputId={`file-input-${item.key}`}
                    />
                  </section>
                );
              })}
            </div>
          </div>
          </div>
        </main>
      </div>

      {showLogoutModal ? <LogoutConfirmModal onCancel={() => setShowLogoutModal(false)} onConfirm={confirmLogout} /> : null}
      {deleteConfirmTarget ? (
        <FileDeleteConfirmModal onCancel={() => setDeleteConfirmTarget(null)} onConfirm={confirmDelete} />
      ) : null}
      {showPointChargeModal ? (
        <PointChargeModal
          onClose={() => setShowPointChargeModal(false)}
          onCharged={(result) => {
            const nextPoint = parsePoint(result?.currentPoint);
            setUserPoint(nextPoint);
            setShowPointChargeSuccessModal(true);
          }}
        />
      ) : null}
      {showPointChargeSuccessModal ? (
        <PointChargeSuccessModal onClose={() => setShowPointChargeSuccessModal(false)} />
      ) : null}
    </div>
  );
};
