import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AcademicProfileFields } from "../../components/AcademicProfileFields";
import { ContentTopNav } from "../../components/ContentTopNav";
import { MobileSidebarDrawer } from "../../components/MobileSidebarDrawer";
import { PointChargeModal } from "../../components/PointChargeModal";
import { PointChargeSuccessModal } from "../../components/PointChargeSuccessModal";
import { Sidebar } from "../../components/Sidebar";
import tempProfileImage from "../../assets/icon/temp.png";
import { logout } from "../../lib/authApi";
import { consumePointChargeSuccessResult } from "../../lib/pointChargeFlow";
import { extractProfile, formatPoint, parsePoint } from "../../lib/profileUtils";
import { STUDENT_MENU_SECTIONS } from "../../components/sidebarMenuItems";
import {
  createStudentCourseSession,
  createStudentCourse,
  getMyProfile,
  getMyProfileImageUrl,
  getStudentCourseMaterials,
  getStudentCourseSessions,
  getMyStudentCourses,
  uploadStudentCourseMaterial,
  updateMyAcademicProfile,
  updateMyServiceMode,
} from "../../lib/userApi";
import { hasAcademicProfile, SERVICE_MODE } from "../../lib/serviceMode";

const StudentProfileModal = ({
  open,
  universityName,
  departmentName,
  onChangeUniversityName,
  onChangeDepartmentName,
  onSelectUniversity,
  onSelectDepartment,
  universitySelected,
  departmentSelected,
  onClose,
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

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[12px] border border-[#d1d5db] px-4 py-2.5 text-[13px] font-semibold text-[#4b5563]"
          >
            닫기
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

export const StudentHomePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
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
  const [switchingMode, setSwitchingMode] = useState(false);
  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [courseName, setCourseName] = useState("");
  const [professorName, setProfessorName] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [courseSubmitting, setCourseSubmitting] = useState(false);
  const [courseErrorMessage, setCourseErrorMessage] = useState("");
  const [courseMessage, setCourseMessage] = useState("");
  const [materialsByCourse, setMaterialsByCourse] = useState({});
  const [materialLoadingByCourse, setMaterialLoadingByCourse] = useState({});
  const [materialUploadingByCourse, setMaterialUploadingByCourse] = useState({});
  const [materialMessageByCourse, setMaterialMessageByCourse] = useState({});
  const [materialErrorByCourse, setMaterialErrorByCourse] = useState({});
  const [sessionsByCourse, setSessionsByCourse] = useState({});
  const [sessionLoadingByCourse, setSessionLoadingByCourse] = useState({});
  const [sessionCreatingByCourse, setSessionCreatingByCourse] = useState({});
  const [sessionMessageByCourse, setSessionMessageByCourse] = useState({});
  const [sessionErrorByCourse, setSessionErrorByCourse] = useState({});

  useEffect(() => {
    const charged = consumePointChargeSuccessResult();
    if (!charged) return;
    const nextPoint = parsePoint(charged?.currentPoint);
    setUserPoint(nextPoint);
    setShowPointChargeSuccessModal(true);
  }, []);

  const loadMaterialsForCourses = async (courseItems) => {
    const nextCourses = Array.isArray(courseItems) ? courseItems : [];
    if (nextCourses.length === 0) {
      setMaterialsByCourse({});
      setMaterialLoadingByCourse({});
      return;
    }
    const loadingState = Object.fromEntries(nextCourses.map((course) => [course.courseId, true]));
    setMaterialLoadingByCourse(loadingState);
    try {
      const responses = await Promise.all(
        nextCourses.map(async (course) => {
          const items = await getStudentCourseMaterials(course.courseId);
          return [course.courseId, Array.isArray(items) ? items : []];
        })
      );
      setMaterialsByCourse(Object.fromEntries(responses));
    } catch (error) {
      setCourseErrorMessage(error?.message || "과목 자료 목록을 불러오지 못했습니다.");
    } finally {
      setMaterialLoadingByCourse({});
    }
  };

  const loadSessionsForCourses = async (courseItems) => {
    const nextCourses = Array.isArray(courseItems) ? courseItems : [];
    if (nextCourses.length === 0) {
      setSessionsByCourse({});
      setSessionLoadingByCourse({});
      return;
    }
    const loadingState = Object.fromEntries(nextCourses.map((course) => [course.courseId, true]));
    setSessionLoadingByCourse(loadingState);
    try {
      const responses = await Promise.all(
        nextCourses.map(async (course) => {
          const items = await getStudentCourseSessions(course.courseId);
          return [course.courseId, Array.isArray(items) ? items : []];
        })
      );
      setSessionsByCourse(Object.fromEntries(responses));
    } catch (error) {
      setCourseErrorMessage(error?.message || "모의고사 세션 목록을 불러오지 못했습니다.");
    } finally {
      setSessionLoadingByCourse({});
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      try {
        const payload = await getMyProfile();
        if (cancelled) return;
        const nextProfile = extractProfile(payload);
        setProfile(nextProfile);
        setUserName(String(nextProfile?.name || "사용자"));
        setUserPoint(parsePoint(nextProfile?.point));
        setProfileImageUrl(getMyProfileImageUrl());
        setUniversityName(String(nextProfile?.universityName || ""));
        setSelectedUniversityId(null);
        setDepartmentName(String(nextProfile?.departmentName || ""));
        setSelectedDepartmentId(null);
        setModalOpen(!hasAcademicProfile(nextProfile));
        if (hasAcademicProfile(nextProfile)) {
          try {
            const coursesPayload = await getMyStudentCourses();
            const nextCourses = Array.isArray(coursesPayload) ? coursesPayload : [];
            if (!cancelled) {
              setCourses(nextCourses);
              await loadMaterialsForCourses(nextCourses);
              await loadSessionsForCourses(nextCourses);
            }
          } catch (error) {
            if (!cancelled) setCourseErrorMessage(error?.message || "과목 목록을 불러오지 못했습니다.");
          } finally {
            if (!cancelled) setCoursesLoading(false);
          }
        } else if (!cancelled) {
          setCourses([]);
          setCoursesLoading(false);
        }
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

  const handleSaveAcademicProfile = async () => {
    if (savingAcademicProfile) return;
    if (!selectedUniversityId || !selectedDepartmentId) {
      setAcademicProfileError("대학교와 학과는 검색 결과에서 선택한 항목만 저장할 수 있습니다.");
      return;
    }
    setSavingAcademicProfile(true);
    setAcademicProfileError("");
    try {
      const payload = await updateMyAcademicProfile({
        universityName,
        universityId: selectedUniversityId,
        departmentName,
        departmentId: selectedDepartmentId,
      });
      const nextProfile = extractProfile(payload);
      setProfile(nextProfile);
      setSelectedUniversityId(null);
      setSelectedDepartmentId(null);
      const hasProfile = hasAcademicProfile(nextProfile);
      setModalOpen(!hasProfile);
      if (hasProfile) {
        const refreshedCourses = await getMyStudentCourses();
        const nextCourses = Array.isArray(refreshedCourses) ? refreshedCourses : [];
        setCourses(nextCourses);
        await loadMaterialsForCourses(nextCourses);
        await loadSessionsForCourses(nextCourses);
      } else {
        setCourses([]);
      }
    } catch (error) {
      setAcademicProfileError(error?.message || "학습 기본 정보를 저장하지 못했습니다.");
    } finally {
      setSavingAcademicProfile(false);
    }
  };

  const handleCreateCourse = async () => {
    if (courseSubmitting) return;
    setCourseSubmitting(true);
    setCourseErrorMessage("");
    setCourseMessage("");
    try {
      const payload = await createStudentCourse({
        courseName,
        professorName,
        description: courseDescription,
      });
      setCourses((prev) => [payload, ...prev]);
      setMaterialsByCourse((prev) => ({ ...prev, [payload.courseId]: [] }));
      setSessionsByCourse((prev) => ({ ...prev, [payload.courseId]: [] }));
      setCourseName("");
      setProfessorName("");
      setCourseDescription("");
      setCourseMessage("과목이 등록되었습니다.");
    } catch (error) {
      setCourseErrorMessage(error?.message || "과목 등록에 실패했습니다.");
    } finally {
      setCourseSubmitting(false);
    }
  };

  const handleUploadCourseMaterial = async (courseId, file) => {
    if (!file) return;
    setMaterialUploadingByCourse((prev) => ({ ...prev, [courseId]: true }));
    setMaterialErrorByCourse((prev) => ({ ...prev, [courseId]: "" }));
    setMaterialMessageByCourse((prev) => ({ ...prev, [courseId]: "" }));
    try {
      const uploaded = await uploadStudentCourseMaterial(courseId, file);
      setMaterialsByCourse((prev) => ({
        ...prev,
        [courseId]: [uploaded, ...(prev[courseId] || [])],
      }));
      setCourses((prev) => prev.map((course) => (
        course.courseId === courseId
          ? { ...course, materialCount: Number(course.materialCount || 0) + 1 }
          : course
      )));
      setMaterialMessageByCourse((prev) => ({ ...prev, [courseId]: "자료가 업로드되었습니다." }));
    } catch (error) {
      setMaterialErrorByCourse((prev) => ({
        ...prev,
        [courseId]: error?.message || "과목 자료 업로드에 실패했습니다.",
      }));
    } finally {
      setMaterialUploadingByCourse((prev) => ({ ...prev, [courseId]: false }));
    }
  };

  const handleCreateCourseSession = async (courseId, questionCount) => {
    setSessionCreatingByCourse((prev) => ({ ...prev, [courseId]: true }));
    setSessionErrorByCourse((prev) => ({ ...prev, [courseId]: "" }));
    setSessionMessageByCourse((prev) => ({ ...prev, [courseId]: "" }));
    try {
      const created = await createStudentCourseSession(courseId, questionCount);
      setSessionsByCourse((prev) => ({
        ...prev,
        [courseId]: [created, ...(prev[courseId] || [])],
      }));
      setSessionMessageByCourse((prev) => ({
        ...prev,
        [courseId]: `${questionCount}문항 모의고사가 생성되었습니다.`,
      }));
    } catch (error) {
      setSessionErrorByCourse((prev) => ({
        ...prev,
        [courseId]: error?.message || "모의고사 세션 생성에 실패했습니다.",
      }));
    } finally {
      setSessionCreatingByCourse((prev) => ({ ...prev, [courseId]: false }));
    }
  };

  const handleSwitchToJobSeeker = async () => {
    if (switchingMode) return;
    setSwitchingMode(true);
    try {
      await updateMyServiceMode(SERVICE_MODE.JOB_SEEKER);
      navigate("/content/interview", { replace: true });
    } catch (error) {
      setAcademicProfileError(error?.message || "서비스 모드 전환에 실패했습니다.");
      setSwitchingMode(false);
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
  const sidebarActiveKey = useMemo(() => {
    if (location.pathname.startsWith("/content/student")) return "student_home";
    return "student_home";
  }, [location.pathname]);

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
          menuSectionsOverride={STUDENT_MENU_SECTIONS}
        />

        <div className="flex min-h-[calc(100vh-3.75rem)]">
          <div className="hidden w-[17rem] shrink-0 md:block">
            <Sidebar
              activeKey={sidebarActiveKey}
              onNavigate={onSelectSidebar}
              userName={userName}
              profileImageUrl={profileImageUrl}
              onLogout={requestLogout}
              menuSectionsOverride={STUDENT_MENU_SECTIONS}
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
                과목별 자료 업로드, 자료 기반 시험문제 생성, 오답노트 흐름을 여기에 연결할 예정입니다.
                현재는 진입 구조와 기본 프로필 저장부터 먼저 고정했습니다.
              </p>
            </div>
            <button
              type="button"
              disabled={switchingMode}
              onClick={handleSwitchToJobSeeker}
              className="rounded-[14px] border border-[#d1d5db] px-4 py-2.5 text-[13px] font-semibold text-[#374151] disabled:cursor-not-allowed disabled:opacity-55"
            >
              {switchingMode ? "전환 중..." : "취준생 모드로 전환"}
            </button>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-[1.2fr,0.8fr]">
            <section className="rounded-[22px] border border-[#e6e9f2] bg-[#fbfcfe] p-5">
              <h2 className="text-[18px] font-semibold text-[#111827]">기본 학습 컨텍스트</h2>
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
                {courseMessage ? <p className="text-[12px] text-[#1f8f55]">{courseMessage}</p> : null}
                {courseErrorMessage ? <p className="text-[12px] text-[#d84a4a]">{courseErrorMessage}</p> : null}
              </div>
            </section>
          </div>

          <section className="mt-4 rounded-[22px] border border-[#e6e9f2] bg-[#fbfcfe] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[18px] font-semibold text-[#111827]">내 과목</h2>
                <p className="mt-1 text-[13px] text-[#5b6475]">등록된 과목별로 자료 업로드와 시험문제 생성을 이어 붙일 예정입니다.</p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-[12px] font-medium text-[#4b5563]">
                {courses.length}개
              </span>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {coursesLoading ? (
                Array.from({ length: 2 }).map((_, index) => (
                  <div key={`student-course-skeleton-${index}`} className="rounded-[16px] border border-[#e2e8f0] bg-white p-4">
                    <div className="h-4 w-28 animate-pulse rounded bg-[#e5e7eb]" />
                    <div className="mt-3 h-3 w-full animate-pulse rounded bg-[#eef2f7]" />
                    <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-[#eef2f7]" />
                  </div>
                ))
              ) : courses.length === 0 ? (
                <div className="rounded-[16px] border border-dashed border-[#d7dbe7] bg-white px-4 py-8 text-[14px] text-[#6b7280] md:col-span-2">
                  아직 등록된 과목이 없습니다. 위에서 첫 과목을 먼저 만들어 주세요.
                </div>
              ) : (
                courses.map((course) => (
                  <article key={course.courseId} className="rounded-[16px] border border-[#e2e8f0] bg-white p-4">
                    <p className="text-[12px] font-medium text-[#7c8497]">{course.universityName} · {course.departmentName}</p>
                    <h3 className="mt-2 text-[18px] font-semibold text-[#111827]">{course.courseName}</h3>
                    <p className="mt-1 text-[13px] text-[#5b6475]">{course.professorName || "교수명 미입력"}</p>
                    <p className="mt-3 min-h-[44px] text-[13px] leading-[1.7] text-[#4b5563]">
                      {course.description || "설명이 아직 없습니다."}
                    </p>
                    <div className="mt-4 rounded-[14px] border border-[#edf1f6] bg-[#fbfcfe] p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[13px] font-semibold text-[#1f2937]">과목 자료</p>
                          <p className="mt-1 text-[11px] text-[#6b7280]">
                            PDF, DOCX, PPTX만 업로드할 수 있습니다. 현재 {Number(course.materialCount || 0)}개
                          </p>
                        </div>
                        <label className={`rounded-[10px] px-3 py-2 text-[12px] font-semibold ${materialUploadingByCourse[course.courseId] ? "bg-[#d1d5db] text-white" : "bg-[#111827] text-white"} cursor-pointer`}>
                          {materialUploadingByCourse[course.courseId] ? "업로드 중..." : "자료 업로드"}
                          <input
                            type="file"
                            accept=".pdf,.docx,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                            className="hidden"
                            disabled={Boolean(materialUploadingByCourse[course.courseId])}
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              void handleUploadCourseMaterial(course.courseId, file);
                              event.target.value = "";
                            }}
                          />
                        </label>
                      </div>
                      {materialMessageByCourse[course.courseId] ? (
                        <p className="mt-2 text-[11px] text-[#1f8f55]">{materialMessageByCourse[course.courseId]}</p>
                      ) : null}
                      {materialErrorByCourse[course.courseId] ? (
                        <p className="mt-2 text-[11px] text-[#d84a4a]">{materialErrorByCourse[course.courseId]}</p>
                      ) : null}
                      <div className="mt-3 space-y-2">
                        {materialLoadingByCourse[course.courseId] ? (
                          <p className="text-[12px] text-[#7c8497]">자료 목록을 불러오는 중입니다...</p>
                        ) : (materialsByCourse[course.courseId] || []).length === 0 ? (
                          <p className="text-[12px] text-[#7c8497]">아직 업로드된 자료가 없습니다.</p>
                        ) : (
                          (materialsByCourse[course.courseId] || []).slice(0, 4).map((material) => (
                            <div key={material.materialId} className="rounded-[10px] border border-[#e5e7eb] bg-white px-3 py-2">
                              <p className="text-[12px] font-medium text-[#111827]">{material.fileName}</p>
                              <p className="mt-1 text-[11px] text-[#7c8497]">
                                업로드: {new Date(material.createdAt).toLocaleString("ko-KR")}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    <div className="mt-4 rounded-[14px] border border-[#edf1f6] bg-[#fbfcfe] p-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-[13px] font-semibold text-[#1f2937]">모의고사 세션</p>
                          <p className="mt-1 text-[11px] text-[#6b7280]">
                            자료 기반으로 즉시 연습 세션을 만들 수 있습니다.
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {[5, 10, 15].map((count) => (
                            <button
                              key={`student-session-create-${course.courseId}-${count}`}
                              type="button"
                              disabled={Boolean(sessionCreatingByCourse[course.courseId])}
                              onClick={() => void handleCreateCourseSession(course.courseId, count)}
                              className="rounded-[10px] border border-[#d1d5db] bg-white px-3 py-2 text-[11px] font-semibold text-[#374151] disabled:cursor-not-allowed disabled:opacity-55"
                            >
                              {count}문항
                            </button>
                          ))}
                        </div>
                      </div>
                      {sessionMessageByCourse[course.courseId] ? (
                        <p className="mt-2 text-[11px] text-[#1f8f55]">{sessionMessageByCourse[course.courseId]}</p>
                      ) : null}
                      {sessionErrorByCourse[course.courseId] ? (
                        <p className="mt-2 text-[11px] text-[#d84a4a]">{sessionErrorByCourse[course.courseId]}</p>
                      ) : null}
                      <div className="mt-3 space-y-2">
                        {sessionLoadingByCourse[course.courseId] ? (
                          <p className="text-[12px] text-[#7c8497]">세션 목록을 불러오는 중입니다...</p>
                        ) : (sessionsByCourse[course.courseId] || []).length === 0 ? (
                          <p className="text-[12px] text-[#7c8497]">아직 생성된 모의고사 세션이 없습니다.</p>
                        ) : (
                          (sessionsByCourse[course.courseId] || []).slice(0, 3).map((session) => (
                            <div key={session.sessionId} className="rounded-[10px] border border-[#e5e7eb] bg-white px-3 py-3">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-[12px] font-semibold text-[#111827]">{session.title}</p>
                                  <p className="mt-1 text-[11px] text-[#7c8497]">
                                    {session.questionCount}문항 · 자료 {session.sourceMaterialCount}개 · {new Date(session.createdAt).toLocaleString("ko-KR")}
                                  </p>
                                </div>
                                <span className="rounded-full bg-[#f3f4f6] px-2.5 py-1 text-[10px] font-semibold text-[#4b5563]">
                                  {session.status}
                                </span>
                              </div>
                              {Array.isArray(session.previewQuestions) && session.previewQuestions.length > 0 ? (
                                <ul className="mt-2 space-y-1 text-[11px] leading-[1.6] text-[#4b5563]">
                                  {session.previewQuestions.map((question, index) => (
                                    <li key={`${session.sessionId}-preview-${index}`}>• {question}</li>
                                  ))}
                                </ul>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => navigate(`/content/student/sessions/${session.sessionId}`)}
                                className="mt-3 rounded-[10px] border border-[#d1d5db] bg-white px-3 py-2 text-[11px] font-semibold text-[#374151]"
                              >
                                세션 풀어보기
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    <p className="mt-3 text-[11px] text-[#9ca3af]">최근 갱신: {new Date(course.updatedAt).toLocaleString("ko-KR")}</p>
                  </article>
                ))
              )}
            </div>
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
        selectedUniversityId={selectedUniversityId}
        universitySelected={Boolean(selectedUniversityId)}
        departmentSelected={Boolean(selectedDepartmentId)}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSaveAcademicProfile}
        pending={savingAcademicProfile}
        errorMessage={academicProfileError}
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
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/35 px-4">
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
