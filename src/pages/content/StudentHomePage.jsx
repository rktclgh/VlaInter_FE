import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AcademicProfileFields } from "../../components/AcademicProfileFields";
import { ContentTopNav } from "../../components/ContentTopNav";
import { MobileSidebarDrawer } from "../../components/MobileSidebarDrawer";
import { PointChargeModal } from "../../components/PointChargeModal";
import { PointChargeSuccessModal } from "../../components/PointChargeSuccessModal";
import { Sidebar } from "../../components/Sidebar";
import { useToast } from "../../hooks/useToast";
import tempProfileImage from "../../assets/icon/temp.png";
import { logout } from "../../lib/authApi";
import { consumePointChargeSuccessResult } from "../../lib/pointChargeFlow";
import { extractProfile, formatPoint, parsePoint } from "../../lib/profileUtils";
import { getStudentMyMenuItems, getStudentSidebarActiveKey, getStudentSidebarSections } from "../../lib/studentNavigation";
import {
  createStudentCourse,
  deleteStudentCourse,
  getMyProfile,
  getMyProfileImageUrl,
  getMyStudentCourses,
  updateMyAcademicProfile,
  updateMyServiceMode,
} from "../../lib/userApi";
import { hasAcademicProfile, normalizeServiceMode, SERVICE_MODE } from "../../lib/serviceMode";

const StudentProfileModal = ({
  open,
  universityName,
  departmentName,
  selectedUniversityId,
  onChangeUniversityName,
  onChangeDepartmentName,
  onSelectUniversity,
  onSelectDepartment,
  universitySelected,
  departmentSelected,
  onMoveToMyPage,
  onSubmit,
  pending,
  errorMessage,
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 px-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-[520px] rounded-[24px] border border-[#dfe3ee] bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.22)]"
      >
        <h2 className="text-[24px] font-semibold text-[#111827]">대학교 / 학과를 먼저 등록해 주세요</h2>
        <p className="mt-2 text-[14px] leading-[1.8] text-[#5b6475]">
          대학생 모드는 사용자의 기본 학습 컨텍스트를 기준으로 과목과 자료를 관리합니다.
        </p>
        <div className="mt-5">
          <AcademicProfileFields
            universityName={universityName}
            departmentName={departmentName}
            selectedUniversityId={selectedUniversityId}
            onChangeUniversityName={onChangeUniversityName}
            onChangeDepartmentName={onChangeDepartmentName}
            onSelectUniversity={onSelectUniversity}
            onSelectDepartment={onSelectDepartment}
            universitySelected={universitySelected}
            departmentSelected={departmentSelected}
            disabled={pending}
          />
        </div>

        {errorMessage ? <p className="mt-3 text-[13px] text-[#d84a4a]">{errorMessage}</p> : null}

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onMoveToMyPage}
            className="rounded-[12px] border border-[#d1d5db] px-4 py-2.5 text-[13px] font-semibold text-[#4b5563]"
          >
            마이페이지에서 설정
          </button>
          <button
            type="button"
            disabled={pending || !universitySelected || !departmentSelected}
            aria-disabled={pending || !universitySelected || !departmentSelected}
            onClick={onSubmit}
            className="rounded-[12px] bg-[#111827] px-4 py-2.5 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-55"
          >
            {pending ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
};

const DeleteCourseConfirmModal = ({
  open,
  courseName,
  pending,
  onCancel,
  onConfirm,
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/45 px-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-[420px] rounded-[24px] border border-[#dfe3ee] bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.22)]"
      >
        <h2 className="text-[22px] font-semibold text-[#111827]">과목 삭제</h2>
        <p className="mt-3 text-[14px] leading-[1.8] text-[#5b6475]">
          정말 과목을 삭제하시겠습니까?
        </p>
        <p className="mt-2 rounded-[12px] bg-[#f8fafc] px-4 py-3 text-[14px] font-medium text-[#111827]">
          {courseName || "선택한 과목"}
        </p>
        <p className="mt-3 text-[12px] leading-[1.7] text-[#8a93a5]">
          과목과 함께 업로드한 자료, 모의고사 세션, 오답노트 기록까지 모두 삭제됩니다.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="rounded-[12px] border border-[#d1d5db] px-4 py-2.5 text-[13px] font-semibold text-[#4b5563] disabled:opacity-60"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="rounded-[12px] bg-[#dc2626] px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
          >
            {pending ? "삭제 중..." : "삭제"}
          </button>
        </div>
      </div>
    </div>
  );
};

export const StudentHomePage = () => {
  const COURSE_PAGE_SIZE = 5;
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const hasSearchBackedAcademicProfile = (nextProfile) => {
    const universityId = Number(nextProfile?.universityId);
    const departmentId = Number(nextProfile?.departmentId);
    return hasAcademicProfile(nextProfile) && Number.isFinite(universityId) && universityId > 0 && Number.isFinite(departmentId) && departmentId > 0;
  };
  const [profile, setProfile] = useState({});
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("사용자");
  const [userPoint, setUserPoint] = useState(0);
  const [profileImageUrl, setProfileImageUrl] = useState(tempProfileImage);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showPointChargeModal, setShowPointChargeModal] = useState(false);
  const [showPointChargeSuccessModal, setShowPointChargeSuccessModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [universityName, setUniversityName] = useState("");
  const [selectedUniversityId, setSelectedUniversityId] = useState(null);
  const [departmentName, setDepartmentName] = useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(null);
  const [savingAcademicProfile, setSavingAcademicProfile] = useState(false);
  const [academicProfileError, setAcademicProfileError] = useState("");
  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [courseName, setCourseName] = useState("");
  const [professorName, setProfessorName] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [courseSubmitting, setCourseSubmitting] = useState(false);
  const [courseErrorMessage, setCourseErrorMessage] = useState("");
  const [deleteTargetCourse, setDeleteTargetCourse] = useState(null);
  const [courseDeleting, setCourseDeleting] = useState(false);
  const [coursePage, setCoursePage] = useState(0);

  useEffect(() => {
    const charged = consumePointChargeSuccessResult();
    if (!charged) return;
    const nextPoint = parsePoint(charged?.currentPoint);
    setUserPoint(nextPoint);
    setShowPointChargeSuccessModal(true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      try {
        const payload = await getMyProfile();
        if (cancelled) return;
        const nextProfile = extractProfile(payload);
        const normalizedMode = normalizeServiceMode(nextProfile?.serviceMode);
        const hasProfile = hasSearchBackedAcademicProfile(nextProfile);
        setProfile(nextProfile);
        setUserName(String(nextProfile?.name || "사용자"));
        setUserPoint(parsePoint(nextProfile?.point));
        setProfileImageUrl(getMyProfileImageUrl());
        setUniversityName(String(nextProfile?.universityName || ""));
        setSelectedUniversityId(Number.isFinite(Number(nextProfile?.universityId)) ? Number(nextProfile.universityId) : null);
        setDepartmentName(String(nextProfile?.departmentName || ""));
        setSelectedDepartmentId(Number.isFinite(Number(nextProfile?.departmentId)) ? Number(nextProfile.departmentId) : null);
        setModalOpen(!hasProfile || normalizedMode !== SERVICE_MODE.STUDENT);
        if (hasProfile && normalizedMode === SERVICE_MODE.STUDENT) {
          try {
            const coursesPayload = await getMyStudentCourses();
            const nextCourses = Array.isArray(coursesPayload) ? coursesPayload : [];
            if (!cancelled) {
              setCourses(nextCourses);
              setCourseErrorMessage("");
            }
          } catch (error) {
            if (!cancelled) setCourseErrorMessage(error?.message || "과목 목록을 불러오지 못했습니다.");
          } finally {
            if (!cancelled) setCoursesLoading(false);
          }
        } else if (!cancelled) {
          setCourses([]);
          setCourseErrorMessage("");
          setCoursesLoading(false);
        }
      } catch (error) {
        if (cancelled) return;
        setProfile({});
        setUserName("사용자");
        setCourseErrorMessage(error?.message || "프로필을 불러오지 못했습니다.");
        setCourses([]);
        setCoursesLoading(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  const academicProfileLabel = useMemo(() => {
    const university = String(profile?.universityName || "").trim();
    const department = String(profile?.departmentName || "").trim();
    if (!university || !department) return "미등록";
    return `${university} · ${department}`;
  }, [profile]);
  const isAdmin = profile?.role === "ADMIN";

  const handleSaveAcademicProfile = async () => {
    if (savingAcademicProfile) return;
    if (!selectedUniversityId || !selectedDepartmentId) {
      setAcademicProfileError("대학교와 학과를 모두 검색 결과에서 선택해 주세요.");
      return;
    }
    setSavingAcademicProfile(true);
    setAcademicProfileError("");
    try {
      const payload = await updateMyAcademicProfile({
        universityName,
        universityId: selectedUniversityId,
        departmentName,
        departmentId: selectedDepartmentId || null,
      });
      let nextProfile = extractProfile(payload);
      if (hasSearchBackedAcademicProfile(nextProfile) && normalizeServiceMode(nextProfile?.serviceMode) !== SERVICE_MODE.STUDENT) {
        const modePayload = await updateMyServiceMode(SERVICE_MODE.STUDENT);
        nextProfile = extractProfile(modePayload);
      }

      const normalizedMode = normalizeServiceMode(nextProfile?.serviceMode);
      const hasProfile = hasSearchBackedAcademicProfile(nextProfile);
      setProfile(nextProfile);
      setUniversityName(String(nextProfile?.universityName || ""));
      setSelectedUniversityId(Number.isFinite(Number(nextProfile?.universityId)) ? Number(nextProfile.universityId) : null);
      setDepartmentName(String(nextProfile?.departmentName || ""));
      setSelectedDepartmentId(Number.isFinite(Number(nextProfile?.departmentId)) ? Number(nextProfile.departmentId) : null);
      setModalOpen(!hasProfile || normalizedMode !== SERVICE_MODE.STUDENT);
      if (hasProfile && normalizedMode === SERVICE_MODE.STUDENT) {
        const refreshedCourses = await getMyStudentCourses();
        const nextCourses = Array.isArray(refreshedCourses) ? refreshedCourses : [];
        setCourses(nextCourses);
        setCourseErrorMessage("");
        showToast("대학생 모드로 전환했고 학적 정보를 저장했습니다.", { type: "success" });
      } else {
        setCourses([]);
        setCourseErrorMessage("");
      }
    } catch (error) {
      setAcademicProfileError(error?.message || "학습 기본 정보를 저장하지 못했습니다.");
    } finally {
      setSavingAcademicProfile(false);
    }
  };

  const handleCreateCourse = async () => {
    if (courseSubmitting) return;
      const normalizedCourseName = String(courseName || "").trim();
    if (!normalizedCourseName) {
      setCourseErrorMessage("과목명을 입력해 주세요.");
      setCourseSubmitting(false);
      return;
    }
    setCourseSubmitting(true);
    setCourseErrorMessage("");
    try {
      const payload = await createStudentCourse({
        courseName: normalizedCourseName,
        professorName,
        description: courseDescription,
      });
      setCourses((prev) => [payload, ...prev]);
      setCourseName("");
      setProfessorName("");
      setCourseDescription("");
      setCourseErrorMessage("");
      showToast("과목이 등록되었습니다.", { type: "success" });
    } catch (error) {
      setCourseErrorMessage(error?.message || "과목 등록에 실패했습니다.");
      showToast(error?.message || "과목 등록에 실패했습니다.", { type: "error" });
    } finally {
      setCourseSubmitting(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (!deleteTargetCourse || courseDeleting) return;
    const targetCourseId = Number(deleteTargetCourse.courseId);
    setCourseDeleting(true);
    setCourseErrorMessage("");
    try {
      await deleteStudentCourse(targetCourseId);
      setCourses((prev) => prev.filter((course) => course.courseId !== targetCourseId));
      setCourseErrorMessage("");
      showToast(`과목 "${deleteTargetCourse.courseName}"을 삭제했습니다.`, { type: "success" });
      setDeleteTargetCourse(null);
    } catch (error) {
      setCourseErrorMessage(error?.message || "과목 삭제에 실패했습니다.");
      showToast(error?.message || "과목 삭제에 실패했습니다.", { type: "error" });
    } finally {
      setCourseDeleting(false);
    }
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

  const onSelectSidebar = (item) => {
    setIsMobileMenuOpen(false);
    if (item?.path) navigate(item.path);
  };

  const pointSummaryText = useMemo(() => formatPoint(userPoint), [userPoint]);
  const studentMenuSections = useMemo(() => getStudentSidebarSections(courses, { isAdmin }), [courses, isAdmin]);
  const studentMyMenuItems = useMemo(() => getStudentMyMenuItems(), []);
  const sidebarActiveKey = useMemo(() => getStudentSidebarActiveKey(location.pathname), [location.pathname]);
  const totalCoursePages = useMemo(
    () => Math.max(1, Math.ceil(courses.length / COURSE_PAGE_SIZE)),
    [courses.length, COURSE_PAGE_SIZE]
  );
  const pagedCourses = useMemo(() => {
    const start = coursePage * COURSE_PAGE_SIZE;
    return courses.slice(start, start + COURSE_PAGE_SIZE);
  }, [coursePage, courses, COURSE_PAGE_SIZE]);

  useEffect(() => {
    setCoursePage(0);
  }, [courses.length]);

  useEffect(() => {
    if (coursePage < totalCoursePages) return;
    setCoursePage(Math.max(0, totalCoursePages - 1));
  }, [coursePage, totalCoursePages]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-6 text-center">
        <p className="text-[14px] text-[#555]">대학생 모드를 준비하는 중입니다...</p>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen overflow-x-hidden bg-white pt-[3.75rem]">
        <ContentTopNav
          point={pointSummaryText}
          onClickCharge={() => setShowPointChargeModal(true)}
          onOpenMenu={() => setIsMobileMenuOpen(true)}
        />

        <MobileSidebarDrawer
          open={isMobileMenuOpen}
          activeKey={sidebarActiveKey}
          onClose={() => setIsMobileMenuOpen(false)}
          onNavigate={onSelectSidebar}
          userName={userName}
          profileImageUrl={profileImageUrl}
          point={pointSummaryText}
          onClickCharge={() => setShowPointChargeModal(true)}
          onLogout={() => {
            setIsMobileMenuOpen(false);
            requestLogout();
          }}
          menuSectionsOverride={studentMenuSections}
          myMenuItemsOverride={studentMyMenuItems}
        />

        <div className="flex min-h-[calc(100vh-3.75rem)]">
          <div className="hidden w-[17rem] shrink-0 md:block">
            <Sidebar
              activeKey={sidebarActiveKey}
              onNavigate={onSelectSidebar}
              userName={userName}
              profileImageUrl={profileImageUrl}
              onLogout={requestLogout}
              menuSectionsOverride={studentMenuSections}
              myMenuItemsOverride={studentMyMenuItems}
            />
          </div>

          <main className="flex min-w-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto px-4 pb-6 pt-6 sm:px-5 md:px-8 md:pt-10">
              <div className="mx-auto w-full max-w-[1080px] rounded-[28px] border border-[#e4e6ee] bg-white px-6 py-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[12px] font-semibold tracking-[0.12em] text-[#7c8497]">STUDENT MODE</p>
              <h1 className="mt-3 text-[30px] font-semibold text-[#111827] sm:text-[36px]">대학생 학습 모드</h1>
              <p className="mt-3 max-w-[760px] text-[14px] leading-[1.8] text-[#5b6475]">
                과목별 학습 자료를 정리하고, 자료 기반 모의고사를 만들고, 오답노트를 누적 관리할 수 있는 공간입니다.
                대학교와 학과를 등록한 뒤 과목을 추가해 학습을 시작해 주세요.
              </p>
              {courseErrorMessage ? <p className="mt-3 text-[13px] text-[#d84a4a]">{courseErrorMessage}</p> : null}
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-[1.2fr,0.8fr]">
            <section className="rounded-[22px] border border-[#e6e9f2] bg-[#fbfcfe] p-5">
              <h2 className="text-[18px] font-semibold text-[#111827]">학습 기본 정보</h2>
              <p className="mt-3 text-[14px] text-[#4b5563]">현재 등록: {academicProfileLabel}</p>
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="mt-4 rounded-[12px] bg-[#111827] px-4 py-2.5 text-[13px] font-semibold text-white"
              >
                대학교 / 학과 설정
              </button>
            </section>

            <section className="rounded-[22px] border border-[#e6e9f2] bg-[#fbfcfe] p-5">
              <h2 className="text-[18px] font-semibold text-[#111827]">과목 빠른 등록</h2>
              <div className="mt-4 space-y-3">
                <label className="block">
                  <span className="mb-1 block text-[12px] text-[#5b6475]">과목명</span>
                  <input
                    type="text"
                    value={courseName}
                    onChange={(event) => setCourseName(event.target.value)}
                    className="h-11 w-full rounded-[12px] border border-[#d7dbe7] px-3 text-[14px] text-[#111827]"
                    placeholder="예: 자료구조"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[12px] text-[#5b6475]">교수명 (선택)</span>
                  <input
                    type="text"
                    value={professorName}
                    onChange={(event) => setProfessorName(event.target.value)}
                    className="h-11 w-full rounded-[12px] border border-[#d7dbe7] px-3 text-[14px] text-[#111827]"
                    placeholder="예: 김교수"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[12px] text-[#5b6475]">설명 (선택)</span>
                  <textarea
                    value={courseDescription}
                    onChange={(event) => setCourseDescription(event.target.value)}
                    className="min-h-[104px] w-full rounded-[12px] border border-[#d7dbe7] px-3 py-3 text-[14px] text-[#111827]"
                    placeholder="시험 범위, 사용하는 자료, 메모 등을 적어둘 수 있습니다."
                  />
                </label>
                <button
                  type="button"
                  disabled={courseSubmitting}
                  onClick={handleCreateCourse}
                  className="rounded-[12px] bg-[#111827] px-4 py-2.5 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {courseSubmitting ? "등록 중..." : "과목 등록"}
                </button>
              </div>
            </section>
          </div>

          <section className="mt-4 rounded-[22px] border border-[#e6e9f2] bg-[#fbfcfe] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[18px] font-semibold text-[#111827]">내 과목</h2>
                <p className="mt-1 text-[13px] text-[#5b6475]">카드를 눌러 과목 상세로 이동하면 자료, 분석, 모의고사, 오답노트를 관리할 수 있습니다.</p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-[12px] font-medium text-[#4b5563]">
                {courses.length}개
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {coursesLoading ? (
                Array.from({ length: 2 }).map((_, index) => (
                  <div key={`student-course-skeleton-${index}`} className="rounded-[16px] border border-[#e2e8f0] bg-white p-4">
                    <div className="h-4 w-28 animate-pulse rounded bg-[#e5e7eb]" />
                    <div className="mt-3 h-3 w-full animate-pulse rounded bg-[#eef2f7]" />
                    <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-[#eef2f7]" />
                  </div>
                ))
              ) : courses.length === 0 ? (
                <div className="rounded-[16px] border border-dashed border-[#d7dbe7] bg-white px-4 py-8 text-[14px] text-[#6b7280]">
                  아직 등록된 과목이 없습니다. 위에서 첫 과목을 먼저 만들어 주세요.
                </div>
              ) : (
                pagedCourses.map((course, index) => {
                  const sequence = coursePage * COURSE_PAGE_SIZE + index + 1;
                  return (
                    <article
                      key={course.courseId}
                      className="relative rounded-[16px] border border-[#e2e8f0] bg-white p-5 transition hover:border-[#cfd6e4] hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)]"
                    >
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setDeleteTargetCourse(course);
                        }}
                        aria-label={`${course.courseName} 삭제`}
                        className="absolute right-4 top-4 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#fecaca] bg-[#fff5f5] text-[18px] font-semibold leading-none text-[#dc2626]"
                      >
                        ×
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/content/student/courses/${course.courseId}`)}
                        className="block w-full pr-10 text-left"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-[#eef2ff] px-2.5 py-1 text-[11px] font-semibold text-[#4338ca]">
                                {String(sequence).padStart(2, "0")}
                              </span>
                              <h3 className="text-[20px] font-semibold text-[#111827]">{course.courseName}</h3>
                            </div>
                            <p className="mt-2 text-[14px] text-[#4b5563]">
                              {course.professorName ? `${course.professorName} 교수` : "교수명 미입력"}
                            </p>
                            {course.courseDescription ? (
                              <p className="mt-2 line-clamp-2 text-[13px] leading-[1.7] text-[#6b7280]">
                                {course.courseDescription}
                              </p>
                            ) : null}
                          </div>
                          <div className="shrink-0 rounded-[12px] border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2 text-[12px] font-medium text-[#475569]">
                            상세 보기
                          </div>
                        </div>
                      </button>
                    </article>
                  );
                })
              )}
            </div>
            {!coursesLoading && courses.length > COURSE_PAGE_SIZE ? (
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCoursePage((prev) => Math.max(0, prev - 1))}
                  disabled={coursePage <= 0}
                  className="rounded-[10px] border border-[#d7dbe7] bg-white px-3 py-2 text-[12px] font-semibold text-[#475569] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  이전
                </button>
                <span className="text-[12px] font-medium text-[#64748b]">
                  {coursePage + 1} / {totalCoursePages}
                </span>
                <button
                  type="button"
                  onClick={() => setCoursePage((prev) => Math.min(totalCoursePages - 1, prev + 1))}
                  disabled={coursePage >= totalCoursePages - 1}
                  className="rounded-[10px] border border-[#d7dbe7] bg-white px-3 py-2 text-[12px] font-semibold text-[#475569] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  다음
                </button>
              </div>
            ) : null}
          </section>
              </div>
            </div>
          </main>
        </div>
      </div>

      <StudentProfileModal
        open={modalOpen}
        universityName={universityName}
        departmentName={departmentName}
        selectedUniversityId={selectedUniversityId}
        onChangeUniversityName={(value) => {
          setUniversityName(value);
          setSelectedUniversityId(null);
          setDepartmentName("");
          setSelectedDepartmentId(null);
        }}
        onChangeDepartmentName={(value) => {
          setDepartmentName(value);
          setSelectedDepartmentId(null);
        }}
        onSelectUniversity={(item) => {
          setUniversityName(String(item?.universityName || ""));
          setSelectedUniversityId(Number.isFinite(Number(item?.universityId)) ? Number(item.universityId) : null);
          setDepartmentName("");
          setSelectedDepartmentId(null);
        }}
        onSelectDepartment={(item) => {
          setDepartmentName(String(item?.departmentName || ""));
          setSelectedDepartmentId(Number.isFinite(Number(item?.departmentId)) ? Number(item.departmentId) : null);
        }}
        universitySelected={Boolean(selectedUniversityId)}
        departmentSelected={Boolean(selectedDepartmentId)}
        onMoveToMyPage={() => navigate("/content/student/mypage")}
        onSubmit={handleSaveAcademicProfile}
        pending={savingAcademicProfile}
        errorMessage={academicProfileError}
      />
      <DeleteCourseConfirmModal
        open={Boolean(deleteTargetCourse)}
        courseName={deleteTargetCourse?.courseName}
        pending={courseDeleting}
        onCancel={() => {
          if (courseDeleting) return;
          setDeleteTargetCourse(null);
        }}
        onConfirm={() => void handleDeleteCourse()}
      />
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
      {showLogoutModal ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/35 px-4">
          <div className="w-full max-w-[420px] rounded-[16px] border border-[#d9d9d9] bg-white p-5">
            <p className="text-[15px] font-medium text-[#252525]">
              정말 로그아웃 하시겠습니까?
              <br />
              종료하지 않은 작업은 저장되지 않을 수 있습니다.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="rounded-[10px] border border-[#d6d6d6] px-3 py-1.5 text-[12px] text-[#666]"
              >
                취소
              </button>
              <button
                type="button"
                onClick={confirmLogout}
                className="rounded-[10px] border border-[#1f1f1f] bg-[#1f1f1f] px-3 py-1.5 text-[12px] text-white"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};
