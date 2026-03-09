import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ContentTopNav } from "../../components/ContentTopNav";
import { MobileSidebarDrawer } from "../../components/MobileSidebarDrawer";
import { PointChargeModal } from "../../components/PointChargeModal";
import { Sidebar } from "../../components/Sidebar";
import tempProfileImage from "../../assets/icon/temp.png";
import { logout } from "../../lib/authApi";
import {
  activateAdminMember,
  createAdminInterviewCategory,
  deactivateAdminMember,
  getAdminInterviewCategories,
  getAdminInterviewSets,
  getAdminMemberDetail,
  getAdminMembers,
  hardDeleteAdminMember,
  moveAdminInterviewCategory,
  promoteAdminInterviewSet,
  softDeleteAdminMember,
  updateAdminInterviewCategory,
} from "../../lib/adminApi";
import { getInterviewSetQuestions } from "../../lib/interviewApi";
import { extractProfile, formatPoint, parsePoint } from "../../lib/profileUtils";
import { getMyProfile, getMyProfileImageUrl } from "../../lib/userApi";

const TABS = [
  { key: "members", label: "회원 관리" },
  { key: "sets", label: "질문 세트 운영" },
  { key: "categories", label: "카테고리 운영" },
  { key: "billing", label: "결제/포인트" },
  { key: "kpi", label: "매출 KPI" },
];

const LogoutConfirmModal = ({ onCancel, onConfirm }) => (
  <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/35 px-4">
    <div className="w-full max-w-[420px] rounded-[16px] border border-[#d9d9d9] bg-white p-5">
      <p className="text-[15px] font-medium text-[#252525]">
        정말 로그아웃 하시겠습니까?
        <br />
        저장되지 않은 작업은 유지되지 않습니다.
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-[10px] border border-[#d6d6d6] px-3 py-1.5 text-[12px] text-[#666]">
          취소
        </button>
        <button type="button" onClick={onConfirm} className="rounded-[10px] border border-[#1f1f1f] bg-[#1f1f1f] px-3 py-1.5 text-[12px] text-white">
          로그아웃
        </button>
      </div>
    </div>
  </div>
);

const InlineSpinner = ({ label }) => (
  <div className="inline-flex items-center gap-2 text-[12px] text-[#5e6472]">
    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#cbd5e1] border-t-[#171b24]" />
    <span>{label}</span>
  </div>
);

const toInt = (value, fallback = 0) => {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const AdminConsolePage = () => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("관리자");
  const [userPoint, setUserPoint] = useState(0);
  const [profileImageUrl, setProfileImageUrl] = useState(tempProfileImage);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showPointChargeModal, setShowPointChargeModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loadingPage, setLoadingPage] = useState(true);
  const [pageErrorMessage, setPageErrorMessage] = useState("");
  const [activeTab, setActiveTab] = useState("members");

  const [members, setMembers] = useState([]);
  const [memberPage, setMemberPage] = useState(0);
  const [memberSize] = useState(20);
  const [memberTotalCount, setMemberTotalCount] = useState(0);
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [selectedMemberDetail, setSelectedMemberDetail] = useState(null);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingMemberDetail, setLoadingMemberDetail] = useState(false);
  const [memberActionLoading, setMemberActionLoading] = useState("");

  const [sets, setSets] = useState([]);
  const [loadingSets, setLoadingSets] = useState(false);
  const [promotingSetId, setPromotingSetId] = useState(null);
  const [selectedSetId, setSelectedSetId] = useState(null);
  const [selectedSetQuestions, setSelectedSetQuestions] = useState([]);
  const [loadingSetQuestions, setLoadingSetQuestions] = useState(false);

  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [newCategoryForm, setNewCategoryForm] = useState({
    parentId: "",
    name: "",
    description: "",
    sortOrder: "0",
  });
  const [categoryForm, setCategoryForm] = useState({
    parentId: "",
    name: "",
    description: "",
    sortOrder: "0",
    isActive: true,
    isLeaf: true,
  });
  const [selectedCategoryParentId, setSelectedCategoryParentId] = useState("");

  const loadMembers = useCallback(async (targetPage = 0) => {
    setLoadingMembers(true);
    try {
      const payload = await getAdminMembers({ page: targetPage, size: memberSize });
      const nextMembers = Array.isArray(payload?.members) ? payload.members : [];
      const nextTotal = toInt(payload?.totalCount, nextMembers.length);
      setMembers(nextMembers);
      setMemberTotalCount(nextTotal);
      setMemberPage(targetPage);
      setSelectedMemberId((prev) => {
        if (prev && nextMembers.some((item) => item.memberId === prev)) {
          return prev;
        }
        return nextMembers[0]?.memberId ?? null;
      });
    } catch (error) {
      setPageErrorMessage(error?.message || "회원 목록을 불러오지 못했습니다.");
    } finally {
      setLoadingMembers(false);
    }
  }, [memberSize]);

  const loadSets = useCallback(async () => {
    setLoadingSets(true);
    try {
      const payload = await getAdminInterviewSets();
      const nextSets = Array.isArray(payload) ? payload : [];
      setSets(nextSets);
      setSelectedSetId((prev) => {
        if (prev && nextSets.some((item) => item.setId === prev)) {
          return prev;
        }
        return nextSets[0]?.setId ?? null;
      });
    } catch (error) {
      setPageErrorMessage(error?.message || "질문 세트를 불러오지 못했습니다.");
    } finally {
      setLoadingSets(false);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const payload = await getAdminInterviewCategories();
      const nextCategories = Array.isArray(payload) ? payload : [];
      setCategories(nextCategories);
      setSelectedCategoryId((prev) => {
        if (prev && nextCategories.some((item) => item.categoryId === prev)) {
          return prev;
        }
        return nextCategories[0]?.categoryId ?? null;
      });
    } catch (error) {
      setPageErrorMessage(error?.message || "카테고리를 불러오지 못했습니다.");
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const initialize = async () => {
      setLoadingPage(true);
      setPageErrorMessage("");
      try {
        const profilePayload = await getMyProfile();
        if (cancelled) return;
        const profile = extractProfile(profilePayload);
        if (String(profile?.role || "").toUpperCase() !== "ADMIN") {
          navigate("/errors/403", { replace: true });
          return;
        }
        setUserName(profile?.name || "관리자");
        setUserPoint(parsePoint(profile?.point));
        setProfileImageUrl(getMyProfileImageUrl());
      } catch {
        if (!cancelled) {
          navigate("/login", { replace: true });
        }
        return;
      }

      await Promise.all([loadMembers(0), loadSets(), loadCategories()]);
      if (!cancelled) {
        setLoadingPage(false);
      }
    };

    void initialize();
    return () => {
      cancelled = true;
    };
  }, [loadCategories, loadMembers, loadSets, navigate]);

  useEffect(() => {
    if (!selectedMemberId) {
      setSelectedMemberDetail(null);
      return;
    }

    let cancelled = false;
    const loadMemberDetail = async () => {
      setLoadingMemberDetail(true);
      try {
        const payload = await getAdminMemberDetail(selectedMemberId);
        if (cancelled) return;
        setSelectedMemberDetail(payload);
      } catch (error) {
        if (!cancelled) {
          setPageErrorMessage(error?.message || "회원 상세 정보를 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) {
          setLoadingMemberDetail(false);
        }
      }
    };

    void loadMemberDetail();
    return () => {
      cancelled = true;
    };
  }, [selectedMemberId]);

  useEffect(() => {
    if (!selectedSetId) {
      setSelectedSetQuestions([]);
      return;
    }

    let cancelled = false;
    const loadSetQuestions = async () => {
      setLoadingSetQuestions(true);
      try {
        const payload = await getInterviewSetQuestions(selectedSetId);
        if (cancelled) return;
        setSelectedSetQuestions(Array.isArray(payload) ? payload : []);
      } catch (error) {
        if (!cancelled) {
          setPageErrorMessage(error?.message || "질문 세트 문항을 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) {
          setLoadingSetQuestions(false);
        }
      }
    };

    void loadSetQuestions();
    return () => {
      cancelled = true;
    };
  }, [selectedSetId]);

  useEffect(() => {
    if (!selectedCategoryId) {
      return;
    }
    const selectedCategory = categories.find((item) => item.categoryId === selectedCategoryId);
    if (!selectedCategory) {
      return;
    }
    const normalizedParentId = selectedCategory.parentId ? String(selectedCategory.parentId) : "";
    setSelectedCategoryParentId(normalizedParentId);
    setCategoryForm({
      parentId: normalizedParentId,
      name: selectedCategory.name || "",
      description: selectedCategory.description || "",
      sortOrder: String(selectedCategory.sortOrder ?? 0),
      isActive: Boolean(selectedCategory.isActive),
      isLeaf: Boolean(selectedCategory.isLeaf),
    });
  }, [categories, selectedCategoryId]);

  const totalMemberPages = Math.max(1, Math.ceil(memberTotalCount / memberSize));
  const currentMemberPageDisplay = memberPage + 1;

  const selectedSet = useMemo(
    () => sets.find((item) => item.setId === selectedSetId) || null,
    [selectedSetId, sets]
  );

  const sortedCategories = useMemo(() => {
    return [...categories].sort((left, right) => {
      const depthCompare = toInt(left.depth) - toInt(right.depth);
      if (depthCompare !== 0) return depthCompare;
      const orderCompare = toInt(left.sortOrder) - toInt(right.sortOrder);
      if (orderCompare !== 0) return orderCompare;
      return String(left.name || "").localeCompare(String(right.name || ""), "ko");
    });
  }, [categories]);

  const handleSidebarNavigate = (item) => {
    setIsMobileMenuOpen(false);
    if (item?.path) {
      navigate(item.path);
    }
  };

  const handleLogoutConfirm = async () => {
    try {
      await logout();
    } catch {
      // ignore
    } finally {
      setShowLogoutModal(false);
      navigate("/login", { replace: true });
    }
  };

  const handleDeactivateMember = async () => {
    if (!selectedMemberId) return;
    const confirmed = window.confirm("해당 회원을 비활성화하시겠습니까? 이후 로그인할 수 없습니다.");
    if (!confirmed) return;

    setMemberActionLoading("deactivate");
    setPageErrorMessage("");
    try {
      await deactivateAdminMember(selectedMemberId);
      const refreshed = await getAdminMemberDetail(selectedMemberId);
      setSelectedMemberDetail(refreshed);
      await loadMembers(memberPage);
    } catch (error) {
      setPageErrorMessage(error?.message || "회원 비활성화(로그인 차단) 처리에 실패했습니다.");
    } finally {
      setMemberActionLoading("");
    }
  };

  const handleActivateMember = async () => {
    if (!selectedMemberId) return;
    const confirmed = window.confirm("해당 회원 계정을 다시 활성화하시겠습니까?");
    if (!confirmed) return;

    setMemberActionLoading("activate");
    setPageErrorMessage("");
    try {
      await activateAdminMember(selectedMemberId);
      const refreshed = await getAdminMemberDetail(selectedMemberId);
      setSelectedMemberDetail(refreshed);
      await loadMembers(memberPage);
    } catch (error) {
      setPageErrorMessage(error?.message || "회원 활성화 처리에 실패했습니다.");
    } finally {
      setMemberActionLoading("");
    }
  };

  const handleSoftDeleteMember = async () => {
    if (!selectedMemberId) return;
    const confirmed = window.confirm("해당 회원을 소프트 삭제하시겠습니까? 계정 식별 정보가 마스킹됩니다.");
    if (!confirmed) return;

    setMemberActionLoading("softDelete");
    setPageErrorMessage("");
    try {
      await softDeleteAdminMember(selectedMemberId);
      await loadMembers(memberPage);
    } catch (error) {
      setPageErrorMessage(error?.message || "회원 소프트 삭제 처리에 실패했습니다.");
    } finally {
      setMemberActionLoading("");
    }
  };

  const handleHardDeleteMember = async () => {
    if (!selectedMemberId) return;
    const confirmed = window.confirm("정말 이 회원을 영구 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.");
    if (!confirmed) return;

    setMemberActionLoading("delete");
    setPageErrorMessage("");
    try {
      await hardDeleteAdminMember(selectedMemberId);
      await loadMembers(Math.max(0, memberPage - (members.length === 1 && memberPage > 0 ? 1 : 0)));
    } catch (error) {
      setPageErrorMessage(error?.message || "회원 영구 삭제에 실패했습니다.");
    } finally {
      setMemberActionLoading("");
    }
  };

  const handlePromoteSet = async (setId) => {
    setPromotingSetId(setId);
    setPageErrorMessage("");
    try {
      await promoteAdminInterviewSet(setId);
      await loadSets();
    } catch (error) {
      setPageErrorMessage(error?.message || "질문 세트 승격에 실패했습니다.");
    } finally {
      setPromotingSetId(null);
    }
  };

  const handleCreateCategory = async () => {
    const normalizedName = newCategoryForm.name.trim();
    if (!normalizedName) {
      setPageErrorMessage("카테고리 이름을 입력해 주세요.");
      return;
    }

    setCreatingCategory(true);
    setPageErrorMessage("");
    try {
      await createAdminInterviewCategory({
        parentId: newCategoryForm.parentId ? Number(newCategoryForm.parentId) : null,
        name: normalizedName,
        description: newCategoryForm.description.trim() || null,
        sortOrder: toInt(newCategoryForm.sortOrder, 0),
      });
      setNewCategoryForm({
        parentId: "",
        name: "",
        description: "",
        sortOrder: "0",
      });
      await loadCategories();
    } catch (error) {
      setPageErrorMessage(error?.message || "카테고리 생성에 실패했습니다.");
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleSaveCategory = async () => {
    if (!selectedCategoryId) return;
    const normalizedName = categoryForm.name.trim();
    if (!normalizedName) {
      setPageErrorMessage("카테고리 이름을 입력해 주세요.");
      return;
    }

    setSavingCategory(true);
    setPageErrorMessage("");
    try {
      await updateAdminInterviewCategory(selectedCategoryId, {
        name: normalizedName,
        description: categoryForm.description.trim() || null,
        sortOrder: toInt(categoryForm.sortOrder, 0),
        isActive: Boolean(categoryForm.isActive),
        isLeaf: Boolean(categoryForm.isLeaf),
      });

      const normalizedParent = categoryForm.parentId || "";
      if (normalizedParent !== selectedCategoryParentId) {
        await moveAdminInterviewCategory(selectedCategoryId, normalizedParent ? Number(normalizedParent) : null);
      }

      await loadCategories();
    } catch (error) {
      setPageErrorMessage(error?.message || "카테고리 저장에 실패했습니다.");
    } finally {
      setSavingCategory(false);
    }
  };

  if (loadingPage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white pt-[54px]">
        <InlineSpinner label="관리자 콘솔을 준비하고 있습니다." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      <ContentTopNav point={formatPoint(userPoint)} onClickCharge={() => setShowPointChargeModal(true)} onOpenMenu={() => setIsMobileMenuOpen(true)} />

      <MobileSidebarDrawer
        open={isMobileMenuOpen}
        activeKey="admin_console"
        isAdmin
        onClose={() => setIsMobileMenuOpen(false)}
        onNavigate={handleSidebarNavigate}
        userName={userName}
        profileImageUrl={profileImageUrl}
        fallbackProfileImageUrl={tempProfileImage}
        onLogout={() => {
          setIsMobileMenuOpen(false);
          setShowLogoutModal(true);
        }}
      />

      <div className="mx-auto flex w-full max-w-[1600px] pt-[54px]">
        <div className="hidden w-[272px] shrink-0 md:block">
          <Sidebar
            activeKey="admin_console"
            isAdmin
            onNavigate={handleSidebarNavigate}
            userName={userName}
            profileImageUrl={profileImageUrl}
            fallbackProfileImageUrl={tempProfileImage}
            onLogout={() => setShowLogoutModal(true)}
          />
        </div>

        <main className="min-w-0 flex-1 px-4 pb-8 pt-5 md:px-6">
          <section className="rounded-[24px] border border-[#dfe4ef] bg-white px-5 py-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
            <p className="text-[12px] font-semibold tracking-[0.08em] text-[#7a8190]">ADMIN CONSOLE</p>
            <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.02em] text-[#161a22]">운영자 대시보드</h1>
            <p className="mt-2 max-w-[760px] text-[13px] leading-[1.7] text-[#5e6472]">
              회원 관리, 공용 질문 세트 승격, 카테고리 운영을 한 화면에서 처리하실 수 있습니다.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`rounded-full border px-4 py-1.5 text-[12px] transition ${
                    activeTab === tab.key
                      ? "border-[#171b24] bg-[#171b24] text-white"
                      : "border-[#d9dde5] bg-white text-[#4f5664] hover:bg-[#f5f7fb]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {pageErrorMessage ? <p className="mt-3 text-[12px] text-[#dc4b4b]">{pageErrorMessage}</p> : null}
          </section>

          {activeTab === "members" ? (
            <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
              <article className="rounded-[20px] border border-[#dfe4ef] bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-[16px] font-semibold text-[#1f2937]">회원 목록</h2>
                  {loadingMembers ? <InlineSpinner label="불러오는 중" /> : null}
                </div>
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full text-left text-[12px]">
                    <thead>
                      <tr className="border-b border-[#eef2f7] text-[#6b7280]">
                        <th className="px-2 py-2 font-medium">ID</th>
                        <th className="px-2 py-2 font-medium">이메일</th>
                        <th className="px-2 py-2 font-medium">이름</th>
                        <th className="px-2 py-2 font-medium">상태</th>
                        <th className="px-2 py-2 font-medium">권한</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((member) => {
                        const selected = member.memberId === selectedMemberId;
                        return (
                          <tr
                            key={member.memberId}
                            onClick={() => setSelectedMemberId(member.memberId)}
                            className={`cursor-pointer border-b border-[#f2f4f8] ${selected ? "bg-[#f1f5ff]" : "hover:bg-[#fafbfd]"}`}
                          >
                            <td className="px-2 py-2">{member.memberId}</td>
                            <td className="max-w-[260px] truncate px-2 py-2">{member.email}</td>
                            <td className="px-2 py-2">{member.name}</td>
                            <td className="px-2 py-2">{member.status}</td>
                            <td className="px-2 py-2">{member.role}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {!loadingMembers && members.length === 0 ? (
                    <p className="px-2 py-5 text-[12px] text-[#6b7280]">조회된 회원이 없습니다.</p>
                  ) : null}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-[12px] text-[#6b7280]">
                    {currentMemberPageDisplay} / {totalMemberPages} 페이지
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={memberPage <= 0 || loadingMembers}
                      onClick={() => void loadMembers(Math.max(0, memberPage - 1))}
                      className="rounded-[10px] border border-[#d9dde5] px-3 py-1 text-[12px] text-[#4f5664] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      이전
                    </button>
                    <button
                      type="button"
                      disabled={memberPage + 1 >= totalMemberPages || loadingMembers}
                      onClick={() => void loadMembers(memberPage + 1)}
                      className="rounded-[10px] border border-[#d9dde5] px-3 py-1 text-[12px] text-[#4f5664] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      다음
                    </button>
                  </div>
                </div>
              </article>

              <article className="rounded-[20px] border border-[#dfe4ef] bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
                <h2 className="text-[16px] font-semibold text-[#1f2937]">회원 상세</h2>
                {loadingMemberDetail ? (
                  <div className="mt-4">
                    <InlineSpinner label="회원 정보를 불러오는 중입니다." />
                  </div>
                ) : selectedMemberDetail ? (
                  <div className="mt-4 space-y-3 text-[13px]">
                    <p className="text-[#4b5563]">회원 ID: <strong className="text-[#111827]">{selectedMemberDetail.memberId}</strong></p>
                    <p className="text-[#4b5563]">이메일: <strong className="text-[#111827]">{selectedMemberDetail.email}</strong></p>
                    <p className="text-[#4b5563]">이름: <strong className="text-[#111827]">{selectedMemberDetail.name}</strong></p>
                    <p className="text-[#4b5563]">상태: <strong className="text-[#111827]">{selectedMemberDetail.status}</strong></p>
                    <p className="text-[#4b5563]">권한: <strong className="text-[#111827]">{selectedMemberDetail.role}</strong></p>
                    <p className="text-[#4b5563]">포인트: <strong className="text-[#111827]">{selectedMemberDetail.point}</strong></p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {selectedMemberDetail.status === "BLOCKED" ? (
                        <button
                          type="button"
                          disabled={memberActionLoading !== ""}
                          onClick={() => void handleActivateMember()}
                          className="rounded-[10px] border border-[#9ed6ab] px-3 py-1.5 text-[12px] text-[#1b7f3a] disabled:opacity-60"
                        >
                          {memberActionLoading === "activate" ? "처리 중..." : "회원 활성화"}
                        </button>
                      ) : null}
                      {selectedMemberDetail.status === "ACTIVE" ? (
                        <button
                          type="button"
                          disabled={memberActionLoading !== ""}
                          onClick={() => void handleDeactivateMember()}
                          className="rounded-[10px] border border-[#d9dde5] px-3 py-1.5 text-[12px] text-[#334155] disabled:opacity-60"
                        >
                          {memberActionLoading === "deactivate" ? "처리 중..." : "회원 비활성화(로그인 차단)"}
                        </button>
                      ) : null}
                      {selectedMemberDetail.status !== "DELETED" ? (
                        <button
                          type="button"
                          disabled={memberActionLoading !== ""}
                          onClick={() => void handleSoftDeleteMember()}
                          className="rounded-[10px] border border-[#f3c986] px-3 py-1.5 text-[12px] text-[#a45c00] disabled:opacity-60"
                        >
                          {memberActionLoading === "softDelete" ? "처리 중..." : "회원 삭제(소프트 딜리트)"}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={memberActionLoading !== ""}
                        onClick={() => void handleHardDeleteMember()}
                        className="rounded-[10px] border border-[#ef9a9a] px-3 py-1.5 text-[12px] text-[#c62828] disabled:opacity-60"
                      >
                        {memberActionLoading === "delete" ? "삭제 중..." : "회원 영구 삭제"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-[13px] text-[#6b7280]">회원을 선택해 주세요.</p>
                )}
              </article>
            </section>
          ) : null}

          {activeTab === "sets" ? (
            <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
              <article className="rounded-[20px] border border-[#dfe4ef] bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-[16px] font-semibold text-[#1f2937]">질문 세트 목록</h2>
                  {loadingSets ? <InlineSpinner label="불러오는 중" /> : null}
                </div>
                <div className="mt-3 space-y-2">
                  {sets.map((set) => {
                    const selected = set.setId === selectedSetId;
                    return (
                      <div
                        key={set.setId}
                        onClick={() => setSelectedSetId(set.setId)}
                        className={`cursor-pointer rounded-[14px] border px-3 py-3 ${selected ? "border-[#9eb1dd] bg-[#f5f8ff]" : "border-[#edf1f6] hover:bg-[#fafbfd]"}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[13px] font-semibold text-[#1f2937]">{set.title}</p>
                            <p className="mt-1 text-[12px] text-[#6b7280]">{set.jobName || "-"} / {set.skillName || "-"}</p>
                            <p className="mt-1 text-[11px] text-[#8b95a7]">
                              owner={set.ownerType} · visibility={set.visibility} · questions={set.questionCount}
                            </p>
                          </div>
                          <button
                            type="button"
                            disabled={set.isPromoted || promotingSetId === set.setId}
                            onClick={(event) => {
                              event.stopPropagation();
                              void handlePromoteSet(set.setId);
                            }}
                            className="rounded-[10px] border border-[#d9dde5] px-3 py-1 text-[11px] text-[#334155] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {set.isPromoted ? "승격됨" : promotingSetId === set.setId ? "승격 중..." : "공용 승격"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {!loadingSets && sets.length === 0 ? (
                    <p className="text-[12px] text-[#6b7280]">조회된 질문 세트가 없습니다.</p>
                  ) : null}
                </div>
              </article>

              <article className="rounded-[20px] border border-[#dfe4ef] bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
                <h2 className="text-[16px] font-semibold text-[#1f2937]">선택 세트 문항</h2>
                {selectedSet ? (
                  <p className="mt-1 text-[12px] text-[#6b7280]">{selectedSet.title}</p>
                ) : (
                  <p className="mt-1 text-[12px] text-[#6b7280]">세트를 선택해 주세요.</p>
                )}
                {loadingSetQuestions ? (
                  <div className="mt-4">
                    <InlineSpinner label="문항을 불러오는 중입니다." />
                  </div>
                ) : (
                  <div className="mt-3 space-y-2">
                    {selectedSetQuestions.map((question, index) => (
                      <article key={question.questionId} className="rounded-[12px] border border-[#edf1f6] bg-[#fafcff] p-3">
                        <p className="text-[11px] text-[#7a8190]">문항 {index + 1}</p>
                        <p className="mt-1 text-[13px] leading-[1.6] text-[#1f2937]">{question.questionText}</p>
                        {question.canonicalAnswer ? (
                          <p className="mt-2 line-clamp-3 text-[12px] leading-[1.6] text-[#4b5563]">{question.canonicalAnswer}</p>
                        ) : null}
                      </article>
                    ))}
                    {selectedSet && selectedSetQuestions.length === 0 && !loadingSetQuestions ? (
                      <p className="text-[12px] text-[#6b7280]">문항이 없습니다.</p>
                    ) : null}
                  </div>
                )}
              </article>
            </section>
          ) : null}

          {activeTab === "categories" ? (
            <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
              <article className="rounded-[20px] border border-[#dfe4ef] bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-[16px] font-semibold text-[#1f2937]">카테고리 목록</h2>
                  {loadingCategories ? <InlineSpinner label="불러오는 중" /> : null}
                </div>
                <div className="mt-3 space-y-2">
                  {sortedCategories.map((category) => {
                    const selected = category.categoryId === selectedCategoryId;
                    const indent = Math.max(0, toInt(category.depth) - 1) * 14;
                    return (
                      <div
                        key={category.categoryId}
                        onClick={() => setSelectedCategoryId(category.categoryId)}
                        className={`cursor-pointer rounded-[12px] border px-3 py-2 ${selected ? "border-[#9eb1dd] bg-[#f5f8ff]" : "border-[#edf1f6] hover:bg-[#fafbfd]"}`}
                      >
                        <p style={{ paddingLeft: `${indent}px` }} className="text-[13px] font-medium text-[#1f2937]">
                          {category.name}
                        </p>
                        <p className="mt-1 text-[11px] text-[#7b8699]">
                          id={category.categoryId} · depth={category.depth} · active={String(category.isActive)} · leaf={String(category.isLeaf)}
                        </p>
                      </div>
                    );
                  })}
                  {!loadingCategories && sortedCategories.length === 0 ? (
                    <p className="text-[12px] text-[#6b7280]">등록된 카테고리가 없습니다.</p>
                  ) : null}
                </div>
              </article>

              <article className="space-y-4">
                <div className="rounded-[20px] border border-[#dfe4ef] bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
                  <h2 className="text-[15px] font-semibold text-[#1f2937]">카테고리 신규 생성</h2>
                  <div className="mt-3 grid gap-3 text-[13px]">
                    <select
                      value={newCategoryForm.parentId}
                      onChange={(event) => setNewCategoryForm((prev) => ({ ...prev, parentId: event.target.value }))}
                      className="w-full rounded-[12px] border border-[#d9dde5] px-3 py-2 outline-none focus:border-[#9aa9cd]"
                    >
                      <option value="">상위 카테고리 없음(루트)</option>
                      {sortedCategories.map((category) => (
                        <option key={category.categoryId} value={String(category.categoryId)}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    <input
                      value={newCategoryForm.name}
                      onChange={(event) => setNewCategoryForm((prev) => ({ ...prev, name: event.target.value }))}
                      placeholder="카테고리 이름"
                      className="w-full rounded-[12px] border border-[#d9dde5] px-3 py-2 outline-none focus:border-[#9aa9cd]"
                    />
                    <input
                      value={newCategoryForm.description}
                      onChange={(event) => setNewCategoryForm((prev) => ({ ...prev, description: event.target.value }))}
                      placeholder="설명(선택)"
                      className="w-full rounded-[12px] border border-[#d9dde5] px-3 py-2 outline-none focus:border-[#9aa9cd]"
                    />
                    <input
                      value={newCategoryForm.sortOrder}
                      onChange={(event) => setNewCategoryForm((prev) => ({ ...prev, sortOrder: event.target.value }))}
                      placeholder="정렬 순서"
                      className="w-full rounded-[12px] border border-[#d9dde5] px-3 py-2 outline-none focus:border-[#9aa9cd]"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={creatingCategory}
                    onClick={() => void handleCreateCategory()}
                    className="mt-3 rounded-[10px] bg-[#111827] px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-60"
                  >
                    {creatingCategory ? "생성 중..." : "카테고리 생성"}
                  </button>
                </div>

                <div className="rounded-[20px] border border-[#dfe4ef] bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
                  <h2 className="text-[15px] font-semibold text-[#1f2937]">카테고리 수정/이동</h2>
                  {selectedCategoryId ? (
                    <div className="mt-3 grid gap-3 text-[13px]">
                      <select
                        value={categoryForm.parentId}
                        onChange={(event) => setCategoryForm((prev) => ({ ...prev, parentId: event.target.value }))}
                        className="w-full rounded-[12px] border border-[#d9dde5] px-3 py-2 outline-none focus:border-[#9aa9cd]"
                      >
                        <option value="">상위 카테고리 없음(루트)</option>
                        {sortedCategories
                          .filter((category) => category.categoryId !== selectedCategoryId)
                          .map((category) => (
                            <option key={category.categoryId} value={String(category.categoryId)}>
                              {category.name}
                            </option>
                          ))}
                      </select>
                      <input
                        value={categoryForm.name}
                        onChange={(event) => setCategoryForm((prev) => ({ ...prev, name: event.target.value }))}
                        placeholder="카테고리 이름"
                        className="w-full rounded-[12px] border border-[#d9dde5] px-3 py-2 outline-none focus:border-[#9aa9cd]"
                      />
                      <input
                        value={categoryForm.description}
                        onChange={(event) => setCategoryForm((prev) => ({ ...prev, description: event.target.value }))}
                        placeholder="설명(선택)"
                        className="w-full rounded-[12px] border border-[#d9dde5] px-3 py-2 outline-none focus:border-[#9aa9cd]"
                      />
                      <input
                        value={categoryForm.sortOrder}
                        onChange={(event) => setCategoryForm((prev) => ({ ...prev, sortOrder: event.target.value }))}
                        placeholder="정렬 순서"
                        className="w-full rounded-[12px] border border-[#d9dde5] px-3 py-2 outline-none focus:border-[#9aa9cd]"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <label className="flex items-center gap-2 rounded-[10px] border border-[#e5e7eb] px-3 py-2 text-[12px] text-[#4b5563]">
                          <input
                            type="checkbox"
                            checked={Boolean(categoryForm.isActive)}
                            onChange={(event) => setCategoryForm((prev) => ({ ...prev, isActive: event.target.checked }))}
                          />
                          활성 상태
                        </label>
                        <label className="flex items-center gap-2 rounded-[10px] border border-[#e5e7eb] px-3 py-2 text-[12px] text-[#4b5563]">
                          <input
                            type="checkbox"
                            checked={Boolean(categoryForm.isLeaf)}
                            onChange={(event) => setCategoryForm((prev) => ({ ...prev, isLeaf: event.target.checked }))}
                          />
                          리프 여부
                        </label>
                      </div>
                      <button
                        type="button"
                        disabled={savingCategory}
                        onClick={() => void handleSaveCategory()}
                        className="rounded-[10px] bg-[#111827] px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-60"
                      >
                        {savingCategory ? "저장 중..." : "카테고리 저장"}
                      </button>
                    </div>
                  ) : (
                    <p className="mt-3 text-[12px] text-[#6b7280]">수정할 카테고리를 선택해 주세요.</p>
                  )}
                </div>
              </article>
            </section>
          ) : null}

          {activeTab === "billing" ? (
            <section className="mt-4 rounded-[20px] border border-[#dfe4ef] bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
              <h2 className="text-[16px] font-semibold text-[#1f2937]">결제/포인트 관리</h2>
              <p className="mt-2 text-[13px] leading-[1.7] text-[#5e6472]">
                Notion 요구사항의 결제 금액/포인트 내역 조회 영역입니다. 현재 백엔드 운영자 API에 해당 엔드포인트가 아직 준비되지 않아
                화면 뼈대만 먼저 배치했습니다.
              </p>
              <div className="mt-4 rounded-[14px] border border-dashed border-[#cbd5e1] bg-[#f8fafc] px-4 py-6 text-[12px] text-[#64748b]">
                예정 API 예시: 회원별 포인트 변동 내역, 결제 내역, 총 결제 금액 집계
              </div>
            </section>
          ) : null}

          {activeTab === "kpi" ? (
            <section className="mt-4 rounded-[20px] border border-[#dfe4ef] bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
              <h2 className="text-[16px] font-semibold text-[#1f2937]">매출 KPI</h2>
              <p className="mt-2 text-[13px] leading-[1.7] text-[#5e6472]">
                Notion 요구사항의 관리자 KPI 대시보드 영역입니다. 현재 백엔드 API가 준비되는 즉시 카드/차트 위젯으로 연결할 수 있게
                기본 섹션을 구성해 두었습니다.
              </p>
              <div className="mt-4 rounded-[14px] border border-dashed border-[#cbd5e1] bg-[#f8fafc] px-4 py-6 text-[12px] text-[#64748b]">
                예정 지표 예시: 일/주/월 결제액, 활성 사용자 수, 세트 승격 건수, 재사용률
              </div>
            </section>
          ) : null}
        </main>
      </div>

      {showPointChargeModal ? (
        <PointChargeModal
          onClose={() => setShowPointChargeModal(false)}
          onCharged={(result) => {
            setUserPoint(parsePoint(result?.currentPoint));
          }}
        />
      ) : null}
      {showLogoutModal ? <LogoutConfirmModal onCancel={() => setShowLogoutModal(false)} onConfirm={handleLogoutConfirm} /> : null}
    </div>
  );
};
