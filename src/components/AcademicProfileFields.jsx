import { useEffect, useMemo, useState } from "react";
import { searchDepartments, searchUniversities } from "../lib/userApi";

const dropdownClassName =
  "absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-[12px] border border-[#d8dbe5] bg-white shadow-[0_16px_40px_rgba(15,23,42,0.12)]";

export const AcademicProfileFields = ({
  universityName,
  departmentName,
  selectedUniversityId = null,
  onChangeUniversityName,
  onChangeDepartmentName,
  onSelectUniversity,
  onSelectDepartment,
  universitySelected = false,
  departmentSelected = false,
  disabled = false,
}) => {
  const [universityResults, setUniversityResults] = useState([]);
  const [departmentResults, setDepartmentResults] = useState([]);
  const [loadingUniversityResults, setLoadingUniversityResults] = useState(false);
  const [loadingDepartmentResults, setLoadingDepartmentResults] = useState(false);
  const [universityFocused, setUniversityFocused] = useState(false);
  const [departmentFocused, setDepartmentFocused] = useState(false);

  const normalizedUniversityName = String(universityName || "").trim();
  const normalizedDepartmentName = String(departmentName || "").trim();
  const departmentInputDisabled = disabled || !selectedUniversityId;

  useEffect(() => {
    if (disabled || normalizedUniversityName.length < 2) {
      setUniversityResults([]);
      setLoadingUniversityResults(false);
      return;
    }

    let cancelled = false;
    setLoadingUniversityResults(true);
    const timer = window.setTimeout(async () => {
      try {
        const items = await searchUniversities(normalizedUniversityName);
        if (!cancelled) setUniversityResults(Array.isArray(items) ? items : []);
      } catch {
        if (!cancelled) setUniversityResults([]);
      } finally {
        if (!cancelled) setLoadingUniversityResults(false);
      }
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [disabled, normalizedUniversityName]);

  useEffect(() => {
    if (departmentInputDisabled || normalizedUniversityName.length < 2 || normalizedDepartmentName.length < 2) {
      setDepartmentResults([]);
      setLoadingDepartmentResults(false);
      return;
    }

    let cancelled = false;
    setLoadingDepartmentResults(true);
    const timer = window.setTimeout(async () => {
      try {
        const items = await searchDepartments(selectedUniversityId, normalizedUniversityName, normalizedDepartmentName);
        if (!cancelled) setDepartmentResults(Array.isArray(items) ? items : []);
      } catch {
        if (!cancelled) setDepartmentResults([]);
      } finally {
        if (!cancelled) setLoadingDepartmentResults(false);
      }
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [departmentInputDisabled, normalizedDepartmentName, normalizedUniversityName, selectedUniversityId]);

  const showUniversityResults = useMemo(
    () => universityFocused && normalizedUniversityName.length >= 2 && universityResults.length > 0,
    [normalizedUniversityName.length, universityFocused, universityResults.length]
  );
  const showDepartmentResults = useMemo(
    () => departmentFocused && normalizedDepartmentName.length >= 2 && departmentResults.length > 0,
    [departmentFocused, departmentResults.length, normalizedDepartmentName.length]
  );

  const handleSelectUniversity = (item) => {
    onSelectUniversity(item);
    setUniversityFocused(false);
    setDepartmentFocused(false);
    setUniversityResults([]);
    setDepartmentResults([]);
  };

  const handleSelectDepartment = (item) => {
    onSelectDepartment(item);
    setDepartmentFocused(false);
    setDepartmentResults([]);
  };

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-[12px] font-medium text-[#4b5563]">대학교</span>
        <div className="relative">
          <input
            type="text"
            value={universityName}
            onChange={(event) => onChangeUniversityName(event.target.value)}
            onFocus={() => setUniversityFocused(true)}
            onBlur={() => {
              window.setTimeout(() => {
                setUniversityFocused(false);
              }, 120);
            }}
            disabled={disabled}
            className="h-11 w-full rounded-[12px] border border-[#d7dbe7] px-3 text-[14px] text-[#111827] disabled:bg-[#f3f4f6] disabled:text-[#9ca3af]"
            placeholder="예: 서울대학교"
          />
          {loadingUniversityResults ? (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[#7c8497]">
              검색 중...
            </span>
          ) : null}
          {showUniversityResults ? (
            <div className={dropdownClassName}>
              {universityResults.map((item) => (
                <button
                  key={`${item.universityCode || item.universityName}-university`}
                  type="button"
                  onClick={() => handleSelectUniversity(item)}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    handleSelectUniversity(item);
                  }}
                  className="block w-full px-3 py-2 text-left text-[13px] text-[#111827] hover:bg-[#f6f7fb]"
                >
                  {item.universityName}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <p className={`mt-1 text-[11px] ${universitySelected ? "text-[#1f8f55]" : "text-[#7c8497]"}`}>
          {universitySelected ? "검색 결과에서 선택된 대학교입니다." : "반드시 검색 결과에서 대학교를 선택해 주세요."}
        </p>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[12px] font-medium text-[#4b5563]">학과</span>
        <div className="relative">
          <input
            type="text"
            value={departmentName}
            onChange={(event) => onChangeDepartmentName(event.target.value)}
            onFocus={() => setDepartmentFocused(true)}
            onBlur={() => {
              window.setTimeout(() => {
                setDepartmentFocused(false);
              }, 120);
            }}
            disabled={departmentInputDisabled}
            className="h-11 w-full rounded-[12px] border border-[#d7dbe7] px-3 text-[14px] text-[#111827] disabled:bg-[#f3f4f6] disabled:text-[#9ca3af]"
            placeholder={selectedUniversityId ? "예: 컴퓨터공학과" : "대학교를 먼저 검색 결과에서 선택해 주세요"}
          />
          {loadingDepartmentResults ? (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[#7c8497]">
              검색 중...
            </span>
          ) : null}
          {showDepartmentResults ? (
            <div className={dropdownClassName}>
              {departmentResults.map((item) => (
                <button
                  key={`${item.departmentCode || item.departmentName}-department`}
                  type="button"
                  onClick={() => handleSelectDepartment(item)}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    handleSelectDepartment(item);
                  }}
                  className="block w-full px-3 py-2 text-left text-[13px] text-[#111827] hover:bg-[#f6f7fb]"
                >
                  {item.departmentName}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <p className={`mt-1 text-[11px] ${departmentSelected ? "text-[#1f8f55]" : "text-[#7c8497]"}`}>
          {departmentSelected ? "검색 결과에서 선택된 학과입니다." : "반드시 검색 결과에서 학과를 선택해 주세요."}
        </p>
      </label>

      <p className="text-[11px] leading-[1.7] text-[#7c8497]">
        대학생 모드의 학교 정보는 자유 입력으로 저장되지 않으며, 검색 결과에서 선택한 대학교와 학과만 저장할 수 있습니다.
      </p>
    </div>
  );
};
