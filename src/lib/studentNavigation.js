import { STUDENT_MY_MENU_ITEMS, buildStudentMenuSections } from "../components/sidebarMenuItems";

export const getStudentSidebarSections = (courses) => buildStudentMenuSections(courses);

export const getStudentMyMenuItems = () => STUDENT_MY_MENU_ITEMS;

export const getStudentSidebarActiveKey = (pathname) => {
  const currentPath = String(pathname || "");
  if (currentPath.startsWith("/content/student/mypage")) return "student_mypage";
  const matchedCourse = currentPath.match(/^\/content\/student\/courses\/([^/]+)/);
  if (matchedCourse) {
    return `student_course_${matchedCourse[1]}`;
  }
  return "student_home";
};
