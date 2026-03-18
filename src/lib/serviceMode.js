export const SERVICE_MODE = {
  JOB_SEEKER: "JOB_SEEKER",
  STUDENT: "STUDENT",
};

export const normalizeServiceMode = (value) => {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === SERVICE_MODE.JOB_SEEKER) return SERVICE_MODE.JOB_SEEKER;
  if (normalized === SERVICE_MODE.STUDENT) return SERVICE_MODE.STUDENT;
  return null;
};

export const hasAcademicProfile = (profile) => {
  const universityName = String(profile?.universityName || "").trim();
  const departmentName = String(profile?.departmentName || "").trim();
  return Boolean(universityName && departmentName);
};
