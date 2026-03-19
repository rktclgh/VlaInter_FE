import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { AcademicProfileRequiredModal } from "../../components/AcademicProfileRequiredModal";
import { StarRatingInput } from "../../components/DifficultyStars";
import { ContentTopNav } from "../../components/ContentTopNav";
import { MobileSidebarDrawer } from "../../components/MobileSidebarDrawer";
import { PointChargeModal } from "../../components/PointChargeModal";
import { PointChargeSuccessModal } from "../../components/PointChargeSuccessModal";
import { ProtectedImage } from "../../components/ProtectedImage";
import { Sidebar } from "../../components/Sidebar";
import { useToast } from "../../hooks/useToast";
import tempProfileImage from "../../assets/icon/temp.png";
import { isAuthenticationError } from "../../lib/apiClient";
import { logout } from "../../lib/authApi";
import { getInterviewLanguageLabel, INTERVIEW_LANGUAGE_OPTIONS, normalizeInterviewLanguage } from "../../lib/interviewLanguage";
import { consumePointChargeSuccessResult } from "../../lib/pointChargeFlow";
import { extractProfile, formatPoint, parsePoint } from "../../lib/profileUtils";
import { hasAcademicProfile } from "../../lib/serviceMode";
import { getStudentMyMenuItems, getStudentSidebarActiveKey, getStudentSidebarSections } from "../../lib/studentNavigation";
import {
  analyzeStudentCourseMaterial,
  createStudentCourseSummaryDocument,
  createStudentCourseSession,
  createStudentWrongAnswerRetest,
  deleteStudentCourseMaterial,
  downloadStudentCourseMaterialContent,
  deleteStudentExamSession,
  getMyProfile,
  getMyProfileImageUrl,
  getMyStudentCourses,
  getStudentCourseMaterials,
  getStudentCourseSessions,
  getStudentCourseWrongAnswerSets,
  uploadStudentCourseMaterial,
  previewStudentCourseSummary,
} from "../../lib/userApi";

const ConfirmModal = ({ open, title, description, pending, confirmLabel = "삭제", onCancel, onConfirm }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/45 px-4">
      <div className="w-full max-w-[420px] rounded-[24px] border border-[#dfe3ee] bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
        <h2 className="text-[22px] font-semibold text-[#111827]">{title}</h2>
        <p className="mt-3 text-[14px] leading-[1.8] text-[#5b6475]">{description}</p>
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
            {pending ? "처리 중..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

const AnalysisLockOverlay = ({ open, fileName, pendingRequest }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-[#0f172acc] px-6">
      <div className="w-full max-w-[420px] rounded-[28px] border border-white/15 bg-[#111827] px-6 py-7 text-center text-white shadow-[0_28px_100px_rgba(15,23,42,0.45)]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-white/5">
          <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-white/25 border-t-white" />
        </div>
        <p className="mt-5 text-[22px] font-semibold">{pendingRequest ? "분석 요청 중" : "AI 분석 진행 중"}</p>
        <p className="mt-3 text-[14px] leading-[1.8] text-white/80">
          {fileName ? `"${fileName}" 자료를 분석하고 있습니다.` : "과목 자료를 분석하고 있습니다."}
          <br />
          완료될 때까지 잠시만 기다려 주세요.
        </p>
        <p className="mt-4 text-[12px] font-medium tracking-[0.01em] text-[#cbd5e1]">
          한 번에 한 개의 문서만 분석할 수 있습니다. 분석 중에는 다른 자료 분석 요청과 페이지 내 조작이 잠시 잠깁니다.
        </p>
      </div>
    </div>
  );
};

const SummaryPdfSavingOverlay = ({ open, count }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[190] flex items-center justify-center bg-[#0f172acc] px-6">
      <div className="w-full max-w-[440px] rounded-[28px] border border-white/15 bg-[#111827] px-6 py-7 text-center text-white shadow-[0_28px_100px_rgba(15,23,42,0.45)]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-white/5">
          <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-white/25 border-t-white" />
        </div>
        <p className="mt-5 text-[22px] font-semibold">구조화 노트 PDF 저장 중</p>
        <p className="mt-3 text-[14px] leading-[1.8] text-white/80">
          선택한 강의자료 {count}개를 바탕으로 만든 구조화 노트를
          <br />
          현재 미리보기 모달 형태 그대로 PDF로 저장하고 있습니다.
        </p>
      </div>
    </div>
  );
};

const SummaryPreviewModal = ({ open, preview, savingPdf = false, exportRef, onDownloadPdf, onClose }) => {
  if (!open || !preview) return null;
  return (
    <div className="fixed inset-0 z-[180] bg-black/60 px-4 py-6">
      <div
        ref={exportRef}
        data-summary-pdf-root="true"
        className="mx-auto flex h-full w-full max-w-[1080px] flex-col rounded-[24px] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.32)]"
      >
        <div data-summary-pdf-header="true" className="flex items-start justify-between gap-4 border-b border-[#e5e7eb] px-5 py-4">
          <div className="min-w-0">
            <p className="text-[20px] font-semibold text-[#111827]">{preview.title}</p>
            <p className="mt-1 text-[12px] text-[#6b7280]">
              참고 자료 {Array.isArray(preview.sourceFileNames) ? preview.sourceFileNames.length : 0}개를 바탕으로 생성한 구조화 노트입니다.
            </p>
          </div>
          <div data-pdf-hidden="true" className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={onDownloadPdf}
              disabled={savingPdf}
              className="rounded-[10px] border border-[#d1d5db] bg-white px-3 py-2 text-[12px] font-semibold text-[#374151] disabled:opacity-55"
            >
              {savingPdf ? "PDF 저장 중..." : "PDF 저장"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={savingPdf}
              className="rounded-[10px] border border-[#d1d5db] px-3 py-2 text-[12px] font-semibold text-[#374151]"
            >
              닫기
            </button>
          </div>
        </div>
        <div data-summary-pdf-body="true" data-summary-preview-scroll="true" className="flex-1 overflow-y-auto px-5 py-5">
          <section data-summary-pdf-block="true" className="rounded-[18px] border border-[#e5e7eb] bg-[#fafbff] p-5">
            <p className="text-[12px] font-semibold tracking-[0.08em] text-[#6b7280]">OVERVIEW</p>
            <p className="mt-3 text-[14px] leading-[1.9] text-[#374151]">{preview.overview}</p>
          </section>

          {!!preview.coreTakeaways?.length && (
            <section data-summary-pdf-block="true" className="mt-4 rounded-[18px] border border-[#dbe4ff] bg-[#f5f8ff] p-5">
              <p className="text-[12px] font-semibold tracking-[0.08em] text-[#3151d3]">KEY TAKEAWAYS</p>
              <ul className="mt-3 space-y-2">
                {(preview.coreTakeaways || []).map((takeaway, takeawayIndex) => (
                  <li key={`takeaway-${takeawayIndex}`} className="flex gap-2 text-[13px] leading-[1.8] text-[#1f2937]">
                    <span className="mt-[2px] text-[#3151d3]">•</span>
                    <span>{takeaway}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section data-summary-pdf-block="true" className="mt-4 rounded-[18px] border border-[#e5e7eb] bg-white p-5">
            <p className="text-[12px] font-semibold tracking-[0.08em] text-[#6b7280]">SOURCE MATERIALS</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(preview.sourceFileNames || []).map((fileName) => (
                <span
                  key={fileName}
                  className="rounded-full border border-[#dbe4ff] bg-[#eef2ff] px-3 py-1.5 text-[11px] font-semibold text-[#4338ca]"
                >
                  {fileName}
                </span>
              ))}
            </div>
          </section>

          <div className="mt-4 space-y-4">
            {(preview.majorTopics || []).map((topic, topicIndex) => (
              <section
                key={`${topic.title}-${topicIndex}`}
                data-summary-topic="true"
                className="rounded-[20px] border border-[#dfe5f2] bg-[#fbfcfe] p-5"
              >
                <div data-summary-topic-header="true" className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#111827] text-[12px] font-semibold text-white">
                    {topicIndex + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[18px] font-semibold text-[#111827]">{topic.title}</p>
                    <p className="mt-2 text-[13px] leading-[1.8] text-[#4b5563]">{topic.summary}</p>
                  </div>
                </div>

                <div data-summary-topic-subtopics="true" className="mt-4 grid gap-3">
                  {(topic.subtopics || []).map((subtopic, subtopicIndex) => (
                    <article
                      key={`${subtopic.title}-${subtopicIndex}`}
                      data-summary-topic-subtopic="true"
                      className="rounded-[16px] border border-[#e5e7eb] bg-white p-4"
                    >
                      <p data-summary-subtopic-title="true" className="text-[14px] font-semibold text-[#111827]">{subtopic.title}</p>
                      <p data-summary-subtopic-summary="true" className="mt-2 text-[12px] leading-[1.8] text-[#5b6475]">{subtopic.summary}</p>
                      <ul data-summary-subtopic-points="true" className="mt-3 space-y-2">
                        {(subtopic.keyPoints || []).map((point, pointIndex) => (
                          <li
                            key={`${subtopic.title}-point-${pointIndex}`}
                            data-summary-subtopic-point="true"
                            className="flex gap-2 text-[12px] leading-[1.8] text-[#374151]"
                          >
                            <span className="mt-[2px] text-[#4158c7]">•</span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                      {!!subtopic.supplementaryNotes?.length && (
                        <div data-summary-subtopic-notes="true" className="mt-3 rounded-[14px] border border-[#dbe4ff] bg-[#f5f8ff] p-3">
                          <p data-summary-subtopic-notes-label="true" className="text-[11px] font-semibold tracking-[0.08em] text-[#3151d3]">보충 설명</p>
                          <div data-summary-subtopic-notes-body="true" className="mt-2 space-y-2">
                            {(subtopic.supplementaryNotes || []).map((note, noteIndex) => (
                              <p
                                key={`${subtopic.title}-note-${noteIndex}`}
                                data-summary-subtopic-note="true"
                                className="text-[12px] leading-[1.8] text-[#374151]"
                              >
                                {note}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const sanitizeSummaryPdfFileName = (fileName) => {
  const normalized = String(fileName || "structured-note")
    .trim()
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalized || "structured-note";
};

const buildPdfExportWrapper = (sourceWidth) => {
  const wrapper = document.createElement("div");
  wrapper.style.position = "fixed";
  wrapper.style.left = "-100000px";
  wrapper.style.top = "0";
  wrapper.style.zIndex = "-1";
  wrapper.style.width = `${sourceWidth}px`;
  wrapper.style.padding = "0";
  wrapper.style.margin = "0";
  wrapper.style.background = "#ffffff";
  wrapper.style.display = "flex";
  wrapper.style.flexDirection = "column";
  wrapper.style.gap = "0";
  return wrapper;
};

const normalizeSummaryPreviewClone = (clone, sourceWidth) => {
  clone.style.width = `${sourceWidth}px`;
  clone.style.height = "auto";
  clone.style.maxHeight = "none";
  clone.style.overflow = "visible";

  clone.querySelectorAll("[data-pdf-hidden='true']").forEach((element) => element.remove());
  clone.querySelectorAll("[data-summary-preview-scroll='true']").forEach((element) => {
    element.style.height = "auto";
    element.style.maxHeight = "none";
    element.style.overflow = "visible";
    element.style.flex = "0 0 auto";
  });
};

const createSummaryPdfPage = (rootTemplate, headerTemplate, bodyTemplate, sourceWidth) => {
  const shell = rootTemplate.cloneNode(false);
  normalizeSummaryPreviewClone(shell, sourceWidth);

  const header = headerTemplate.cloneNode(true);
  const body = bodyTemplate.cloneNode(false);
  body.style.height = "auto";
  body.style.maxHeight = "none";
  body.style.overflow = "visible";
  body.style.flex = "0 0 auto";
  body.innerHTML = "";

  shell.append(header, body);
  return { shell, body };
};

const buildSummaryTopicFragment = (topicTemplate, subtopicContainerTemplate, subtopicNodes) => {
  const section = topicTemplate.cloneNode(false);
  Array.from(topicTemplate.children).forEach((child) => {
    if (child === subtopicContainerTemplate) return;
    section.appendChild(child.cloneNode(true));
  });
  const subtopicContainer = subtopicContainerTemplate.cloneNode(false);
  subtopicNodes.forEach((subtopicNode) => subtopicContainer.appendChild(subtopicNode));
  section.appendChild(subtopicContainer);
  return { section, subtopicContainer };
};

const buildSummarySubtopicFragment = (articleTemplate, pointListTemplate, noteTemplate, pointNodes, noteNodes) => {
  const article = articleTemplate.cloneNode(false);
  const noteBodyTemplate = noteTemplate?.querySelector("[data-summary-subtopic-notes-body='true']") || null;
  Array.from(articleTemplate.children).forEach((child) => {
    if (child === pointListTemplate || child === noteTemplate) return;
    article.appendChild(child.cloneNode(true));
  });

  let pointList = null;
  if (pointListTemplate && pointNodes.length > 0) {
    pointList = pointListTemplate.cloneNode(false);
    pointNodes.forEach((pointNode) => pointList.appendChild(pointNode));
    article.appendChild(pointList);
  }

  let noteBody = null;
  if (noteTemplate && noteNodes.length > 0) {
    const noteBox = noteTemplate.cloneNode(false);
    Array.from(noteTemplate.children).forEach((child) => {
      if (child === noteBodyTemplate) return;
      noteBox.appendChild(child.cloneNode(true));
    });
    noteBody = noteBodyTemplate ? noteBodyTemplate.cloneNode(false) : document.createElement("div");
    noteNodes.forEach((noteNode) => noteBody.appendChild(noteNode));
    noteBox.appendChild(noteBody);
    article.appendChild(noteBox);
  }

  return { article, pointList, noteBody };
};

const buildSummaryPreviewPdfPages = (sourceNode, pageHeightPx) => {
  const sourceWidth = sourceNode.offsetWidth;
  const wrapper = buildPdfExportWrapper(sourceWidth);
  const measurementRoot = sourceNode.cloneNode(true);
  normalizeSummaryPreviewClone(measurementRoot, sourceWidth);
  wrapper.appendChild(measurementRoot);
  document.body.appendChild(wrapper);

  const rootTemplate = measurementRoot;
  const headerTemplate = measurementRoot.querySelector("[data-summary-pdf-header='true']");
  const bodyTemplate = measurementRoot.querySelector("[data-summary-pdf-body='true']");
  if (!headerTemplate || !bodyTemplate) {
    throw new Error("구조화 노트 PDF 템플릿을 찾지 못했습니다.");
  }

  const pages = [];
  let currentPage = createSummaryPdfPage(rootTemplate, headerTemplate, bodyTemplate, sourceWidth);
  wrapper.appendChild(currentPage.shell);
  pages.push(currentPage.shell);

  const ensureCurrentPage = () => currentPage;
  const exceedsPage = () => ensureCurrentPage().shell.getBoundingClientRect().height > pageHeightPx;
  const startNewPage = () => {
    currentPage = createSummaryPdfPage(rootTemplate, headerTemplate, bodyTemplate, sourceWidth);
    wrapper.appendChild(currentPage.shell);
    pages.push(currentPage.shell);
    return currentPage;
  };

  const appendBlock = (blockNode) => {
    const page = ensureCurrentPage();
    page.body.appendChild(blockNode);
    if (!exceedsPage()) return;
    page.body.removeChild(blockNode);
    if (page.body.childElementCount === 0) {
      page.body.appendChild(blockNode);
      return;
    }
    const nextPage = startNewPage();
    nextPage.body.appendChild(blockNode);
  };

  const appendTopic = (topicTemplate) => {
    const subtopicContainerTemplate = topicTemplate.querySelector("[data-summary-topic-subtopics='true']");
    if (!subtopicContainerTemplate) {
      appendBlock(topicTemplate.cloneNode(true));
      return;
    }
    const subtopicTemplates = Array.from(subtopicContainerTemplate.children);
    if (subtopicTemplates.length === 0) {
      appendBlock(topicTemplate.cloneNode(true));
      return;
    }

    let fragment = buildSummaryTopicFragment(topicTemplate, subtopicContainerTemplate, []);
    appendBlock(fragment.section);
    const appendSubtopic = (subtopicTemplate) => {
      const pointListTemplate = subtopicTemplate.querySelector("[data-summary-subtopic-points='true']");
      const noteTemplate = subtopicTemplate.querySelector("[data-summary-subtopic-notes='true']");
      const pointTemplates = pointListTemplate
        ? Array.from(pointListTemplate.querySelectorAll("[data-summary-subtopic-point='true']")).map((node) => node.cloneNode(true))
        : [];
      const noteTemplates = noteTemplate
        ? Array.from(noteTemplate.querySelectorAll("[data-summary-subtopic-note='true']")).map((node) => node.cloneNode(true))
        : [];

      if (pointTemplates.length === 0 && noteTemplates.length === 0) {
        const nextSubtopic = subtopicTemplate.cloneNode(true);
        fragment.subtopicContainer.appendChild(nextSubtopic);
        if (!exceedsPage()) return;

        fragment.subtopicContainer.removeChild(nextSubtopic);
        if (fragment.subtopicContainer.childElementCount === 0) {
          fragment.subtopicContainer.appendChild(nextSubtopic);
          return;
        }

        const nextPage = startNewPage();
        fragment = buildSummaryTopicFragment(topicTemplate, subtopicContainerTemplate, [nextSubtopic]);
        nextPage.body.appendChild(fragment.section);
        return;
      }

      let articleFragment = buildSummarySubtopicFragment(subtopicTemplate, pointListTemplate, noteTemplate, [], []);
      fragment.subtopicContainer.appendChild(articleFragment.article);
      if (exceedsPage()) {
        fragment.subtopicContainer.removeChild(articleFragment.article);
        if (fragment.subtopicContainer.childElementCount > 0) {
          const nextPage = startNewPage();
          fragment = buildSummaryTopicFragment(topicTemplate, subtopicContainerTemplate, []);
          nextPage.body.appendChild(fragment.section);
        }
        articleFragment = buildSummarySubtopicFragment(subtopicTemplate, pointListTemplate, noteTemplate, [], []);
        fragment.subtopicContainer.appendChild(articleFragment.article);
      }

      pointTemplates.forEach((pointTemplate) => {
        if (!articleFragment.pointList) {
          fragment.subtopicContainer.removeChild(articleFragment.article);
          articleFragment = buildSummarySubtopicFragment(subtopicTemplate, pointListTemplate, noteTemplate, [pointTemplate], []);
          fragment.subtopicContainer.appendChild(articleFragment.article);
          if (!exceedsPage()) return;

          fragment.subtopicContainer.removeChild(articleFragment.article);
          const nextPage = startNewPage();
          fragment = buildSummaryTopicFragment(topicTemplate, subtopicContainerTemplate, []);
          nextPage.body.appendChild(fragment.section);
          articleFragment = buildSummarySubtopicFragment(subtopicTemplate, pointListTemplate, noteTemplate, [pointTemplate], []);
          fragment.subtopicContainer.appendChild(articleFragment.article);
          return;
        }
        articleFragment.pointList.appendChild(pointTemplate);
        if (!exceedsPage()) return;

        articleFragment.pointList.removeChild(pointTemplate);
        const nextPage = startNewPage();
        fragment = buildSummaryTopicFragment(topicTemplate, subtopicContainerTemplate, []);
        nextPage.body.appendChild(fragment.section);
        articleFragment = buildSummarySubtopicFragment(subtopicTemplate, pointListTemplate, noteTemplate, [pointTemplate], []);
        fragment.subtopicContainer.appendChild(articleFragment.article);
      });

      noteTemplates.forEach((noteTemplateNode) => {
        if (!articleFragment.noteBody) {
          const existingPoints = articleFragment.pointList
            ? Array.from(articleFragment.pointList.children).map((node) => node.cloneNode(true))
            : [];
          fragment.subtopicContainer.removeChild(articleFragment.article);
          articleFragment = buildSummarySubtopicFragment(
            subtopicTemplate,
            pointListTemplate,
            noteTemplate,
            existingPoints,
            [noteTemplateNode]
          );
          fragment.subtopicContainer.appendChild(articleFragment.article);
          if (!exceedsPage()) return;

          fragment.subtopicContainer.removeChild(articleFragment.article);
          const nextPage = startNewPage();
          fragment = buildSummaryTopicFragment(topicTemplate, subtopicContainerTemplate, []);
          nextPage.body.appendChild(fragment.section);
          articleFragment = buildSummarySubtopicFragment(
            subtopicTemplate,
            pointListTemplate,
            noteTemplate,
            existingPoints,
            [noteTemplateNode]
          );
          fragment.subtopicContainer.appendChild(articleFragment.article);
          return;
        }

        articleFragment.noteBody.appendChild(noteTemplateNode);
        if (!exceedsPage()) return;

        articleFragment.noteBody.removeChild(noteTemplateNode);
        const existingPoints = articleFragment.pointList
          ? Array.from(articleFragment.pointList.children).map((node) => node.cloneNode(true))
          : [];
        const nextPage = startNewPage();
        fragment = buildSummaryTopicFragment(topicTemplate, subtopicContainerTemplate, []);
        nextPage.body.appendChild(fragment.section);
        articleFragment = buildSummarySubtopicFragment(
          subtopicTemplate,
          pointListTemplate,
          noteTemplate,
          existingPoints,
          [noteTemplateNode]
        );
        fragment.subtopicContainer.appendChild(articleFragment.article);
      });
    };

    subtopicTemplates.forEach((subtopicTemplate) => appendSubtopic(subtopicTemplate));
  };

  Array.from(bodyTemplate.children).forEach((block) => {
    if (block.matches("[data-summary-topic='true']")) {
      appendTopic(block);
      return;
    }
    appendBlock(block.cloneNode(true));
  });

  measurementRoot.remove();
  return { wrapper, pages };
};

const VisualAssetModal = ({ open, title, assets, onClose }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[150] bg-black/70 px-4 py-6">
      <div className="mx-auto flex h-full w-full max-w-[1080px] flex-col rounded-[24px] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.32)]">
        <div className="flex items-center justify-between border-b border-[#e5e7eb] px-5 py-4">
          <div>
            <p className="text-[18px] font-semibold text-[#111827]">{title}</p>
            <p className="mt-1 text-[12px] text-[#6b7280]">원문 페이지/슬라이드/이미지를 그대로 보여줍니다.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[10px] border border-[#d1d5db] px-3 py-2 text-[12px] font-semibold text-[#374151]"
          >
            닫기
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            {assets.map((asset) => (
              <figure key={asset.assetId} className="overflow-hidden rounded-[18px] border border-[#e5e7eb] bg-[#fafbff]">
                <div className="border-b border-[#e5e7eb] bg-white px-4 py-3">
                  <p className="text-[13px] font-semibold text-[#111827]">{asset.label}</p>
                  <p className="mt-1 text-[11px] text-[#7c8497]">
                    {asset.pageNo ? `페이지 ${asset.pageNo}` : asset.slideNo ? `슬라이드 ${asset.slideNo}` : "원본 이미지"}
                    {asset.width && asset.height ? ` · ${asset.width} × ${asset.height}` : ""}
                  </p>
                </div>
                <ProtectedImage
                  src={asset.downloadUrl}
                  alt={asset.label}
                  className="w-full bg-[#f8fafc] object-contain"
                  placeholderClassName="min-h-[220px] w-full bg-[#f8fafc]"
                />
              </figure>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const materialStatusLabel = (material) => {
  if (material?.sourceType === "AI_GENERATED_SUMMARY") return "요약본 생성 완료";
  if (material?.ingested) return "분석 완료";
  if (material?.ingestionStatus === "QUEUED") return "분석 대기";
  if (material?.ingestionStatus === "PROCESSING") return "분석 중";
  if (material?.ingestionStatus === "FAILED") return "분석 실패";
  return "분석 전";
};

const isMaterialAnalysisDisabled = (material, analyzingMaterialId, uploading, hasOngoingMaterialIngestion) => {
  if (material?.sourceType === "AI_GENERATED_SUMMARY") return true;
  if (uploading) return true;
  if (analyzingMaterialId !== null) return true;
  if (hasOngoingMaterialIngestion) return true;
  if (material?.ingested) return true;
  return material?.ingestionStatus === "QUEUED" || material?.ingestionStatus === "PROCESSING";
};

const materialAnalyzeButtonLabel = (material, analyzingMaterialId) => {
  if (analyzingMaterialId === material?.materialId) return "분석 요청 중...";
  if (material?.sourceType === "AI_GENERATED_SUMMARY") return "요약본";
  if (material?.ingested) return "분석 완료";
  if (material?.ingestionStatus === "QUEUED") return "분석 대기";
  if (material?.ingestionStatus === "PROCESSING") return "분석 중";
  return "AI 분석";
};

const materialKindMeta = (materialKind) => {
  if (materialKind === "PAST_EXAM") {
    return {
      title: "족보",
      emptyMessage: "아직 업로드된 족보가 없습니다.",
      uploadLabel: "족보 업로드",
      successLabel: "족보",
      toneClass: "bg-[#fff7ed] text-[#c2410c]",
    };
  }

  return {
    title: "강의자료",
    emptyMessage: "아직 업로드된 강의자료가 없습니다.",
    uploadLabel: "강의자료 업로드",
    successLabel: "강의자료",
    toneClass: "bg-[#eef2ff] text-[#4338ca]",
  };
};

const visualAssetTypeLabel = (assetType) => {
  switch (assetType) {
    case "PDF_PAGE_RENDER":
      return "PDF 페이지";
    case "PPT_SLIDE_RENDER":
      return "PPT 슬라이드";
    case "DOCX_EMBEDDED_IMAGE":
      return "DOCX 이미지";
    case "ORIGINAL_IMAGE":
      return "원본 이미지";
    default:
      return "원문 이미지";
  }
};

const EXAM_STYLE_OPTIONS = [
  { key: "DEFINITION", label: "정의형" },
  { key: "CODING", label: "코딩형" },
  { key: "CALCULATION", label: "계산형" },
];

const examStyleLabel = (style) => {
  switch (style) {
    case "DEFINITION":
      return "정의형";
    case "CODING":
      return "코딩형";
    case "CALCULATION":
      return "계산형";
    case "ESSAY":
      return "서술형";
    case "PRACTICAL":
      return "실습형";
    default:
      return style || "기타";
  }
};

const examModeLabel = (mode) => {
  switch (mode) {
    case "FAST_REVIEW":
      return "패스트 모의고사";
    case "PAST_EXAM":
      return "족보형";
    case "PAST_EXAM_PRACTICE":
      return "족보 그대로 연습";
    case "WRONG_ANSWER_RETEST":
      return "오답노트 재시험";
    default:
      return "모의고사";
  }
};

const studentExamDifficultyGuide = (level) => {
  switch (Number(level || 3)) {
    case 1:
      return "기초 확인형: 정의, 핵심 원리, 대표 예시를 바로 떠올리면 풀 수 있는 수준";
    case 2:
      return "기본 적용형: 개념 이해에 더해 간단한 비교나 전형적 적용까지 요구하는 수준";
    case 3:
      return "표준 시험형: 두 개 이상의 개념 연결, 과정 설명, 비교 판단이 섞이는 평균 난이도";
    case 4:
      return "응용 심화형: 변형 상황, 다단계 풀이, 예외 조건 판단이 필요한 상위권 수준";
    case 5:
      return "고난도 종합형: 복합 개념 연결, trade-off, 복합 계산 또는 설계 판단까지 요구하는 수준";
    default:
      return "";
  }
};

export const StudentCoursePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { courseId } = useParams();
  const normalizedCourseId = Number(courseId);
  const { showToast } = useToast();
  const summaryPreviewExportRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("사용자");
  const [isAdmin, setIsAdmin] = useState(false);
  const [userPoint, setUserPoint] = useState(0);
  const [profileImageUrl, setProfileImageUrl] = useState(tempProfileImage);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showPointChargeModal, setShowPointChargeModal] = useState(false);
  const [showPointChargeSuccessModal, setShowPointChargeSuccessModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const [courses, setCourses] = useState([]);
  const [course, setCourse] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [wrongAnswerSets, setWrongAnswerSets] = useState([]);

  const [pageErrorMessage, setPageErrorMessage] = useState("");
  const [requiresAcademicProfile, setRequiresAcademicProfile] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analyzingMaterialId, setAnalyzingMaterialId] = useState(null);
  const [downloadingMaterialId, setDownloadingMaterialId] = useState(null);
  const [deletingMaterialId, setDeletingMaterialId] = useState(null);
  const [creatingSessionCount, setCreatingSessionCount] = useState(null);
  const [creatingSummaryDocumentFormat, setCreatingSummaryDocumentFormat] = useState(null);
  const [savingSummaryPdf, setSavingSummaryPdf] = useState(false);
  const [creatingSummaryPreview, setCreatingSummaryPreview] = useState(false);
  const [deletingSessionId, setDeletingSessionId] = useState(null);
  const [creatingRetestSetId, setCreatingRetestSetId] = useState(null);
  const [sessionGenerationMode, setSessionGenerationMode] = useState("STANDARD");
  const [sessionQuestionCount, setSessionQuestionCount] = useState(5);
  const [sessionDifficultyLevel, setSessionDifficultyLevel] = useState(3);
  const [showDifficultyGuide, setShowDifficultyGuide] = useState(false);
  const [sessionQuestionStyles, setSessionQuestionStyles] = useState([]);
  const [summaryLanguage, setSummaryLanguage] = useState("KO");
  const [sessionLanguage, setSessionLanguage] = useState("KO");
  const [selectedSummaryMaterialIds, setSelectedSummaryMaterialIds] = useState([]);
  const [selectedPastExamMaterialIds, setSelectedPastExamMaterialIds] = useState([]);

  const [materialDeleteTarget, setMaterialDeleteTarget] = useState(null);
  const [sessionDeleteTarget, setSessionDeleteTarget] = useState(null);
  const [visualAssetViewer, setVisualAssetViewer] = useState(null);
  const [summaryPreview, setSummaryPreview] = useState(null);

  const handleAuthenticationFailure = useCallback((error) => {
    if (!isAuthenticationError(error)) return false;
    setPageErrorMessage("");
    navigate("/login", {
      replace: true,
      state: { redirectedFrom: location.pathname },
    });
    return true;
  }, [location.pathname, navigate]);

  useEffect(() => {
    const charged = consumePointChargeSuccessResult();
    if (!charged) return;
    setUserPoint(parsePoint(charged?.currentPoint));
    setShowPointChargeSuccessModal(true);
  }, []);

  const loadCourseData = useCallback(async (availableCourses) => {
    const matchedCourse = (availableCourses || []).find((item) => String(item?.courseId) === String(normalizedCourseId)) || null;
    if (!matchedCourse) {
      setCourse(null);
      setMaterials([]);
      setSessions([]);
      setWrongAnswerSets([]);
      return;
    }
    setCourse(matchedCourse);
    const [materialsPayload, sessionsPayload, wrongAnswerPayload] = await Promise.all([
      getStudentCourseMaterials(matchedCourse.courseId),
      getStudentCourseSessions(matchedCourse.courseId),
      getStudentCourseWrongAnswerSets(matchedCourse.courseId),
    ]);
    setMaterials(Array.isArray(materialsPayload) ? materialsPayload : []);
    setSessions(Array.isArray(sessionsPayload) ? sessionsPayload : []);
    setWrongAnswerSets(Array.isArray(wrongAnswerPayload) ? wrongAnswerPayload : []);
  }, [normalizedCourseId]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const profilePayload = await getMyProfile();
        if (cancelled) return;
        const profile = extractProfile(profilePayload);
        setUserName(String(profile?.name || "사용자"));
        setIsAdmin(profile?.role === "ADMIN");
        setUserPoint(parsePoint(profile?.point));
        setProfileImageUrl(getMyProfileImageUrl());
        const profileReady = hasAcademicProfile(profile);
        setRequiresAcademicProfile(!profileReady);
        if (!profileReady) {
          setCourses([]);
          setCourse(null);
          setMaterials([]);
          setSessions([]);
          setWrongAnswerSets([]);
          return;
        }
        const coursesPayload = await getMyStudentCourses();
        if (cancelled) return;
        const nextCourses = Array.isArray(coursesPayload) ? coursesPayload : [];
        setCourses(nextCourses);
        await loadCourseData(nextCourses);
      } catch (error) {
        if (!cancelled && !handleAuthenticationFailure(error)) {
          setPageErrorMessage(error?.message || "과목 정보를 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [handleAuthenticationFailure, loadCourseData]);

  const pointSummaryText = useMemo(() => formatPoint(userPoint), [userPoint]);
  const studentMenuSections = useMemo(() => getStudentSidebarSections(courses, { isAdmin }), [courses, isAdmin]);
  const studentMyMenuItems = useMemo(() => getStudentMyMenuItems(), []);
  const sidebarActiveKey = useMemo(() => getStudentSidebarActiveKey(location.pathname), [location.pathname]);
  const readyMaterialCount = useMemo(
    () => materials.filter((material) => material?.materialKind !== "PAST_EXAM" && material?.sourceType !== "AI_GENERATED_SUMMARY" && material?.ingested).length,
    [materials]
  );
  const readyLectureMaterials = useMemo(
    () => materials.filter((material) => material?.materialKind !== "PAST_EXAM" && material?.sourceType !== "AI_GENERATED_SUMMARY" && material?.ingested),
    [materials]
  );
  const lectureMaterials = useMemo(
    () => materials.filter((material) => material?.materialKind !== "PAST_EXAM"),
    [materials]
  );
  const pastExamMaterials = useMemo(
    () => materials.filter((material) => material?.materialKind === "PAST_EXAM"),
    [materials]
  );
  const readyPastExamCount = useMemo(
    () => materials.filter((material) => material?.materialKind === "PAST_EXAM" && material?.ingested).length,
    [materials]
  );
  const readyPastExamMaterials = useMemo(
    () => materials.filter((material) => material?.materialKind === "PAST_EXAM" && material?.ingested),
    [materials]
  );
  const hasOngoingMaterialIngestion = useMemo(
    () =>
      materials.some(
        (material) => material?.ingestionStatus === "QUEUED" || material?.ingestionStatus === "PROCESSING"
      ),
    [materials]
  );
  const activeIngestionMaterial = useMemo(
    () =>
      materials.find(
        (material) => material?.ingestionStatus === "QUEUED" || material?.ingestionStatus === "PROCESSING"
      ) || null,
    [materials]
  );
  const isAnalysisLocked = analyzingMaterialId !== null || hasOngoingMaterialIngestion;

  useEffect(() => {
    const readyIds = readyLectureMaterials.map((material) => material.materialId);
    setSelectedSummaryMaterialIds((prev) => {
      const preserved = prev.filter((id) => readyIds.includes(id));
      if (preserved.length > 0) return preserved;
      return readyIds;
    });
  }, [readyLectureMaterials]);

  useEffect(() => {
    const readyIds = readyPastExamMaterials.map((material) => material.materialId);
    setSelectedPastExamMaterialIds((prev) => {
      const preserved = prev.filter((id) => readyIds.includes(id));
      if (preserved.length > 0) return preserved;
      return readyIds;
    });
  }, [readyPastExamMaterials]);

  const refreshCourse = useCallback(async () => {
    const refreshedCourses = await getMyStudentCourses();
    const nextCourses = Array.isArray(refreshedCourses) ? refreshedCourses : [];
    setCourses(nextCourses);
    await loadCourseData(nextCourses);
  }, [loadCourseData]);

  useEffect(() => {
    if (!hasOngoingMaterialIngestion) return undefined;
    const timer = window.setInterval(() => {
      void (async () => {
        try {
          await refreshCourse();
        } catch (error) {
          if (handleAuthenticationFailure(error)) return;
          console.error("student course ingestion polling failed", error);
        }
      })();
    }, 4000);
    return () => window.clearInterval(timer);
  }, [handleAuthenticationFailure, hasOngoingMaterialIngestion, refreshCourse]);

  const handleUploadMaterial = async (file, materialKind = "LECTURE_MATERIAL") => {
    if (!file || !course || uploading || isAnalysisLocked) return;
    setUploading(true);
    try {
      await uploadStudentCourseMaterial(course.courseId, file, materialKind);
      const kindMeta = materialKindMeta(materialKind);
      showToast(`${kindMeta.successLabel}를 업로드했습니다.`, { type: "success" });
      await refreshCourse();
    } catch (error) {
      if (handleAuthenticationFailure(error)) return;
      showToast(error?.message || "자료 업로드에 실패했습니다.", { type: "error" });
    } finally {
      setUploading(false);
    }
  };

  const handleAnalyzeMaterial = async (material) => {
    if (!course || !material || analyzingMaterialId || hasOngoingMaterialIngestion) return;
    setAnalyzingMaterialId(material.materialId);
    try {
      await analyzeStudentCourseMaterial(course.courseId, material.materialId);
      showToast(`"${material.fileName}" 분석을 요청했습니다.`, { type: "success" });
      await refreshCourse();
    } catch (error) {
      if (handleAuthenticationFailure(error)) return;
      showToast(error?.message || "AI 분석 요청에 실패했습니다.", { type: "error" });
    } finally {
      setAnalyzingMaterialId(null);
    }
  };

  const handleDownloadMaterial = async (material) => {
    if (!course || !material || downloadingMaterialId) return;
    setDownloadingMaterialId(material.materialId);
    try {
      const payload = await downloadStudentCourseMaterialContent(course.courseId, material.materialId);
      const objectUrl = window.URL.createObjectURL(payload.blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = payload.fileName || material.fileName || "lecture-material";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (error) {
      if (handleAuthenticationFailure(error)) return;
      showToast(error?.message || "다운로드 링크 생성에 실패했습니다.", { type: "error" });
    } finally {
      setDownloadingMaterialId(null);
    }
  };

  const handleDeleteMaterial = async () => {
    if (!course || !materialDeleteTarget || deletingMaterialId) return;
    setDeletingMaterialId(materialDeleteTarget.materialId);
    try {
      await deleteStudentCourseMaterial(course.courseId, materialDeleteTarget.materialId);
      showToast(`"${materialDeleteTarget.fileName}" 자료를 삭제했습니다.`, { type: "success" });
      setMaterialDeleteTarget(null);
      await refreshCourse();
    } catch (error) {
      if (handleAuthenticationFailure(error)) return;
      showToast(error?.message || "자료 삭제에 실패했습니다.", { type: "error" });
    } finally {
      setDeletingMaterialId(null);
    }
  };

  const handleCreateSession = async (questionCount) => {
    if (!course || creatingSessionCount) return;
    setCreatingSessionCount(questionCount);
    try {
      await createStudentCourseSession(course.courseId, {
        questionCount,
        generationMode: sessionGenerationMode,
        difficultyLevel:
          sessionGenerationMode === "PAST_EXAM" || sessionGenerationMode === "PAST_EXAM_PRACTICE"
            ? null
            : sessionGenerationMode === "FAST_REVIEW"
              ? 1
              : sessionDifficultyLevel,
        questionStyles: sessionGenerationMode === "STANDARD" ? sessionQuestionStyles : [],
        selectedPastExamMaterialIds:
          sessionGenerationMode === "PAST_EXAM" || sessionGenerationMode === "PAST_EXAM_PRACTICE"
            ? selectedPastExamMaterialIds
            : [],
        language: normalizeInterviewLanguage(sessionLanguage),
      });
      showToast(`${examModeLabel(sessionGenerationMode)} ${questionCount}문항 모의고사를 ${getInterviewLanguageLabel(sessionLanguage)}로 생성했습니다.`, { type: "success" });
      await refreshCourse();
    } catch (error) {
      if (handleAuthenticationFailure(error)) return;
      showToast(error?.message || "모의고사 생성에 실패했습니다.", { type: "error" });
    } finally {
      setCreatingSessionCount(null);
    }
  };

  const toggleSummaryMaterialSelection = (materialId) => {
    setSelectedSummaryMaterialIds((prev) => (
      prev.includes(materialId)
        ? prev.filter((id) => id !== materialId)
        : [...prev, materialId]
    ));
  };

  const handleDownloadSummaryPreviewPdf = async () => {
    if (!course || !summaryPreview || !summaryPreviewExportRef.current || savingSummaryPdf) return;
    setSavingSummaryPdf(true);
    let exportWrapper = null;
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      const pdf = new jsPDF({
        orientation: "p",
        unit: "pt",
        format: "a4",
        compress: true,
      });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const pageHeightPx = Math.floor((summaryPreviewExportRef.current.offsetWidth * pageHeight) / pageWidth);

      const { wrapper, pages } = buildSummaryPreviewPdfPages(summaryPreviewExportRef.current, pageHeightPx);
      exportWrapper = wrapper;
      await new Promise((resolve) => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)));

      for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
        const pageNode = pages[pageIndex];
        const canvas = await html2canvas(pageNode, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
          width: pageNode.scrollWidth,
          windowWidth: pageNode.scrollWidth,
          windowHeight: pageNode.scrollHeight,
        });
        if (pageIndex > 0) pdf.addPage();
        const scale = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
        const renderWidth = canvas.width * scale;
        const renderHeight = canvas.height * scale;
        const offsetX = (pageWidth - renderWidth) / 2;
        pdf.addImage(canvas.toDataURL("image/png"), "PNG", offsetX, 0, renderWidth, renderHeight, undefined, "FAST");
      }

      pdf.save(`${sanitizeSummaryPdfFileName(summaryPreview.title || course.courseName)}.pdf`);
      showToast("구조화 노트를 PDF로 저장했습니다.", { type: "success" });
    } catch (error) {
      if (handleAuthenticationFailure(error)) return;
      showToast(error?.message || "구조화 노트 PDF 저장에 실패했습니다.", { type: "error" });
    } finally {
      exportWrapper?.remove();
      setSavingSummaryPdf(false);
    }
  };

  const handleCreateSummaryDocument = async (format) => {
    if (!course || creatingSummaryDocumentFormat || creatingSummaryPreview || savingSummaryPdf || selectedSummaryMaterialIds.length === 0) return;
    setCreatingSummaryDocumentFormat(format);
    try {
      const payload = await createStudentCourseSummaryDocument(course.courseId, {
        selectedMaterialIds: selectedSummaryMaterialIds,
        language: normalizeInterviewLanguage(summaryLanguage),
        format,
      });
      const objectUrl = window.URL.createObjectURL(payload.blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = payload.fileName || `${sanitizeSummaryPdfFileName(course.courseName)}-summary.${String(format || "").toLowerCase()}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(objectUrl);
      showToast(`${format} 요약본을 다운로드했습니다.`, { type: "success" });
    } catch (error) {
      if (handleAuthenticationFailure(error)) return;
      showToast(error?.message || `${format} 요약본 생성에 실패했습니다.`, { type: "error" });
    } finally {
      setCreatingSummaryDocumentFormat(null);
    }
  };

  const handlePreviewSummary = async () => {
    if (!course || creatingSummaryPreview || savingSummaryPdf || selectedSummaryMaterialIds.length === 0) return;
    setCreatingSummaryPreview(true);
    try {
      const payload = await previewStudentCourseSummary(course.courseId, {
        selectedMaterialIds: selectedSummaryMaterialIds,
        language: normalizeInterviewLanguage(summaryLanguage),
      });
      setSummaryPreview(payload);
      showToast("구조화 노트 미리보기를 생성했습니다.", { type: "success" });
    } catch (error) {
      if (handleAuthenticationFailure(error)) return;
      showToast(error?.message || "노트 미리보기에 실패했습니다.", { type: "error" });
    } finally {
      setCreatingSummaryPreview(false);
    }
  };

  const toggleQuestionStyle = (styleKey) => {
    setSessionQuestionStyles((prev) => {
      if (prev.includes(styleKey)) {
        return prev.length === 1 ? prev : prev.filter((item) => item !== styleKey);
      }
      return [...prev, styleKey];
    });
  };

  const togglePastExamMaterialSelection = (materialId) => {
    setSelectedPastExamMaterialIds((prev) => (
      prev.includes(materialId)
        ? prev.filter((id) => id !== materialId)
        : [...prev, materialId]
    ));
  };

  const handleCreateRetest = async (wrongSet) => {
    if (!wrongSet || creatingRetestSetId) return;
    setCreatingRetestSetId(wrongSet.setId);
    try {
      const payload = await createStudentWrongAnswerRetest(wrongSet.setId);
      showToast(`"${wrongSet.title}" 재시험 세션을 생성했습니다.`, { type: "success" });
      await refreshCourse();
      if (payload?.sessionId) {
        navigate(`/content/student/sessions/${payload.sessionId}`);
      }
    } catch (error) {
      if (handleAuthenticationFailure(error)) return;
      showToast(error?.message || "재시험 세션 생성에 실패했습니다.", { type: "error" });
    } finally {
      setCreatingRetestSetId(null);
    }
  };

  const handleDeleteSession = async () => {
    if (!sessionDeleteTarget || deletingSessionId) return;
    setDeletingSessionId(sessionDeleteTarget.sessionId);
    try {
      await deleteStudentExamSession(sessionDeleteTarget.sessionId);
      showToast(`"${sessionDeleteTarget.title}" 세션을 삭제했습니다.`, { type: "success" });
      setSessionDeleteTarget(null);
      await refreshCourse();
    } catch (error) {
      if (handleAuthenticationFailure(error)) return;
      showToast(error?.message || "모의고사 삭제에 실패했습니다.", { type: "error" });
    } finally {
      setDeletingSessionId(null);
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-6 text-center">
        <p className="text-[14px] text-[#555]">과목 페이지를 불러오는 중입니다...</p>
      </div>
    );
  }

  const academicProfileRequiredModal = (
    <AcademicProfileRequiredModal
      open={requiresAcademicProfile}
      onMoveToMyPage={() => navigate("/content/student/mypage")}
    />
  );

  if (!course) {
    return (
      <>
        <div className="flex min-h-screen items-center justify-center bg-white px-6 text-center">
          <div>
            <p className="text-[15px] font-medium text-[#111827]">과목을 찾을 수 없습니다.</p>
            {pageErrorMessage ? <p className="mt-2 text-[13px] text-[#d84a4a]">{pageErrorMessage}</p> : null}
            <button
              type="button"
              onClick={() => navigate("/content/student")}
              className="mt-4 rounded-[12px] bg-[#111827] px-4 py-2.5 text-[13px] font-semibold text-white"
            >
              과목 홈으로 돌아가기
            </button>
          </div>
        </div>
        {academicProfileRequiredModal}
      </>
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
                    <p className="text-[12px] font-semibold tracking-[0.12em] text-[#7c8497]">{course.universityName} · {course.departmentName}</p>
                    <h1 className="mt-3 text-[30px] font-semibold text-[#111827] sm:text-[36px]">{course.courseName}</h1>
                    <p className="mt-2 text-[14px] text-[#5b6475]">{course.professorName || "교수명 미입력"}</p>
                    <p className="mt-3 max-w-[760px] text-[14px] leading-[1.8] text-[#5b6475]">
                      {course.description || "과목 설명은 아직 없습니다."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate("/content/student")}
                    className="rounded-[14px] border border-[#d1d5db] px-4 py-2.5 text-[13px] font-semibold text-[#374151]"
                  >
                    과목 홈으로
                  </button>
                </div>

                {pageErrorMessage ? <p className="mt-4 text-[13px] text-[#d84a4a]">{pageErrorMessage}</p> : null}

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <div className="rounded-[18px] border border-[#e6e9f2] bg-[#fbfcfe] p-4">
                    <p className="text-[12px] text-[#7c8497]">업로드 자료</p>
                    <p className="mt-2 text-[26px] font-semibold text-[#111827]">{materials.length}</p>
                  </div>
                  <div className="rounded-[18px] border border-[#e6e9f2] bg-[#fbfcfe] p-4">
                    <p className="text-[12px] text-[#7c8497]">분석 완료</p>
                    <p className="mt-2 text-[26px] font-semibold text-[#111827]">{readyMaterialCount}</p>
                  </div>
                  <div className="rounded-[18px] border border-[#e6e9f2] bg-[#fbfcfe] p-4">
                    <p className="text-[12px] text-[#7c8497]">모의고사 세션</p>
                    <p className="mt-2 text-[26px] font-semibold text-[#111827]">{sessions.length}</p>
                  </div>
                </div>

                <section className="mt-6 rounded-[20px] border border-[#e6e9f2] bg-[#fbfcfe] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[18px] font-semibold text-[#111827]">과목 자료</p>
                      <p className="mt-1 text-[12px] text-[#6b7280]">강의자료는 PDF/DOCX/PPTX, 족보는 PDF/DOCX/PPTX/JPG/JPEG/PNG 형식을 업로드할 수 있습니다.</p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-4 xl:grid-cols-2">
                    {[
                      { key: "LECTURE_MATERIAL", items: lectureMaterials },
                      { key: "PAST_EXAM", items: pastExamMaterials },
                    ].map((section) => {
                      const meta = materialKindMeta(section.key);
                      return (
                        <div key={section.key} className="rounded-[16px] border border-[#e5e7eb] bg-white p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[15px] font-semibold text-[#111827]">{meta.title}</p>
                              <p className="mt-1 text-[12px] text-[#7c8497]">{section.items.length}개 업로드됨</p>
                            </div>
                            <div className="flex flex-wrap items-center justify-end gap-2">
                              <label className={`cursor-pointer rounded-[10px] px-3 py-2 text-[11px] font-semibold ${uploading ? "bg-[#d1d5db] text-white" : "bg-[#111827] text-white"}`}>
                                {uploading ? "업로드 중..." : meta.uploadLabel}
                                <input
                                  type="file"
                                  accept={
                                    section.key === "PAST_EXAM"
                                      ? ".pdf,.docx,.pptx,.jpg,.jpeg,.png,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/jpeg,image/png"
                                      : ".pdf,.docx,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                                  }
                                  className="hidden"
                                  disabled={uploading || isAnalysisLocked}
                                  onChange={(event) => {
                                    const file = event.target.files?.[0];
                                    void handleUploadMaterial(file, section.key);
                                    event.target.value = "";
                                  }}
                                />
                              </label>
                            </div>
                          </div>
                          <div className="mt-4">
                            {section.items.length === 0 ? (
                              <p className="text-[13px] text-[#7c8497]">{meta.emptyMessage}</p>
                            ) : (
                              <div className="grid gap-3 sm:grid-cols-2">
                                {section.items.map((material) => (
                                  <div key={material.materialId} className="rounded-[14px] border border-[#e5e7eb] bg-[#fcfcfd] p-3">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex flex-wrap gap-1.5">
                                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${meta.toneClass}`}>
                                          {meta.title}
                                        </span>
                                        {material?.sourceType === "AI_GENERATED_SUMMARY" ? (
                                          <span className="rounded-full bg-[#111827] px-2.5 py-1 text-[10px] font-semibold text-white">
                                            AI 요약본
                                          </span>
                                        ) : null}
                                      </div>
                                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                                        material?.ingested
                                          ? "bg-[#e8fff1] text-[#14804a]"
                                          : material?.ingestionStatus === "FAILED"
                                            ? "bg-[#fff1f1] text-[#dc2626]"
                                            : "bg-[#f3f4f6] text-[#4b5563]"
                                      }`}>
                                        {materialStatusLabel(material)}
                                      </span>
                                    </div>
                                    <p className="mt-3 line-clamp-2 text-[13px] font-semibold leading-[1.5] text-[#111827]">{material.fileName}</p>
                                    <p className="mt-2 text-[11px] text-[#7c8497]">
                                      {new Date(material.createdAt).toLocaleDateString("ko-KR")}
                                    </p>
                                    {material.extractionMethod ? (
                                      <p className="mt-1 text-[11px] font-medium text-[#4158c7]">{material.extractionMethod}</p>
                                    ) : null}
                                    {Array.isArray(material.visualAssets) && material.visualAssets.length > 0 ? (
                                      <div className="mt-3 rounded-[12px] border border-[#e5e7eb] bg-white p-2.5">
                                        <div className="flex items-center justify-between gap-2">
                                          <div>
                                            <p className="text-[11px] font-semibold text-[#111827]">원문 이미지 {material.visualAssets.length}개</p>
                                            <p className="mt-0.5 text-[10px] text-[#7c8497]">
                                              {visualAssetTypeLabel(material.visualAssets[0]?.assetType)}
                                              {material.visualAssets.length > 1 ? ` 외 ${material.visualAssets.length - 1}개` : ""}
                                            </p>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => setVisualAssetViewer({ title: material.fileName, assets: material.visualAssets })}
                                            className="rounded-[8px] border border-[#d1d5db] px-2.5 py-1.5 text-[10px] font-semibold text-[#374151]"
                                          >
                                            보기
                                          </button>
                                        </div>
                                        <div className="mt-2 grid grid-cols-3 gap-2">
                                          {material.visualAssets.slice(0, 3).map((asset) => (
                                            <button
                                              key={asset.assetId}
                                              type="button"
                                              onClick={() => setVisualAssetViewer({ title: material.fileName, assets: material.visualAssets })}
                                              className="overflow-hidden rounded-[10px] border border-[#e5e7eb] bg-[#f8fafc]"
                                            >
                                              <ProtectedImage
                                                src={asset.downloadUrl}
                                                alt={asset.label}
                                                className="h-20 w-full object-cover"
                                                placeholderClassName="h-20 w-full bg-[#eef2f7]"
                                              />
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    ) : null}
                                    {material?.ingestionStatus === "FAILED" && material?.errorMessage ? (
                                      <p className="mt-2 line-clamp-3 text-[11px] leading-[1.6] text-[#dc2626]">{material.errorMessage}</p>
                                    ) : null}
                                    <div className="mt-3 grid grid-cols-3 gap-2">
                                      <button
                                        type="button"
                                        onClick={() => void handleAnalyzeMaterial(material)}
                                        disabled={isMaterialAnalysisDisabled(material, analyzingMaterialId, uploading, hasOngoingMaterialIngestion)}
                                        className="rounded-[9px] border border-[#d1d5db] bg-white px-2 py-2 text-[10px] font-semibold text-[#374151] disabled:opacity-55"
                                      >
                                        {materialAnalyzeButtonLabel(material, analyzingMaterialId)}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => void handleDownloadMaterial(material)}
                                        disabled={Boolean(downloadingMaterialId)}
                                        className="rounded-[9px] border border-[#d1d5db] bg-white px-2 py-2 text-[10px] font-semibold text-[#374151] disabled:opacity-55"
                                      >
                                        {downloadingMaterialId === material.materialId ? "생성 중..." : "다운로드"}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setMaterialDeleteTarget(material)}
                                        disabled={Boolean(deletingMaterialId)}
                                        className="rounded-[9px] border border-[#fecaca] bg-[#fff5f5] px-2 py-2 text-[10px] font-semibold text-[#dc2626] disabled:opacity-55"
                                      >
                                        삭제
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className="mt-6 rounded-[20px] border border-[#e6e9f2] bg-[#fbfcfe] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[18px] font-semibold text-[#111827]">강의자료 요약본</p>
                      <p className="mt-1 text-[12px] text-[#6b7280]">
                        분석 완료된 강의자료를 여러 개 선택해 구조화 노트를 미리 보고, 현재 미리보기 모달 디자인 그대로 PDF로 저장할 수 있습니다.
                      </p>
                    </div>
                    <p className="text-[12px] font-semibold text-[#4b5563]">{selectedSummaryMaterialIds.length}개 선택</p>
                  </div>
                  <div className="mt-4 rounded-[16px] border border-[#e5e7eb] bg-white p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex rounded-[12px] border border-[#d1d5db] bg-white p-1">
                        {INTERVIEW_LANGUAGE_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setSummaryLanguage(option.value)}
                            disabled={savingSummaryPdf || creatingSummaryPreview}
                            className={`rounded-[10px] px-3 py-2 text-[11px] font-semibold ${
                              summaryLanguage === option.value
                                ? "bg-[#111827] text-white"
                                : "text-[#4b5563]"
                            } disabled:opacity-55`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="mt-4 grid gap-2">
                      {readyLectureMaterials.length === 0 ? (
                        <p className="text-[12px] text-[#7c8497]">요약에 사용할 분석 완료 강의자료가 없습니다.</p>
                      ) : (
                        readyLectureMaterials.map((material) => (
                          <label
                            key={material.materialId}
                            className={`flex cursor-pointer items-center justify-between gap-3 rounded-[12px] border px-3 py-3 transition ${
                              selectedSummaryMaterialIds.includes(material.materialId)
                                ? "border-[#111827] bg-[#eef2ff] shadow-[0_10px_24px_rgba(17,24,39,0.08)]"
                                : "border-[#e5e7eb] bg-[#fcfcfd]"
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="truncate text-[12px] font-semibold text-[#111827]">{material.fileName}</p>
                              <p className="mt-1 text-[10px] text-[#7c8497]">{new Date(material.createdAt).toLocaleDateString("ko-KR")}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {selectedSummaryMaterialIds.includes(material.materialId) ? (
                                <span className="rounded-full bg-[#111827] px-2 py-1 text-[10px] font-semibold text-white">
                                  선택됨
                                </span>
                              ) : null}
                              <input
                                type="checkbox"
                                checked={selectedSummaryMaterialIds.includes(material.materialId)}
                                onChange={() => toggleSummaryMaterialSelection(material.materialId)}
                                className="h-4 w-4 accent-[#111827]"
                              />
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                    <div className="mt-4 flex flex-wrap justify-end gap-2">
                      {["DOCX", "PDF"].map((format) => (
                        <button
                          key={format}
                          type="button"
                          disabled={Boolean(creatingSummaryDocumentFormat) || creatingSummaryPreview || savingSummaryPdf || selectedSummaryMaterialIds.length === 0}
                          onClick={() => void handleCreateSummaryDocument(format)}
                          className="rounded-[12px] border border-[#d1d5db] bg-white px-4 py-3 text-[12px] font-semibold text-[#374151] disabled:opacity-55"
                        >
                          {creatingSummaryDocumentFormat === format ? `${format} 생성 중...` : `${format} 요약본 다운로드`}
                        </button>
                      ))}
                      <button
                        type="button"
                        disabled={Boolean(creatingSummaryDocumentFormat) || creatingSummaryPreview || savingSummaryPdf || selectedSummaryMaterialIds.length === 0}
                        onClick={() => void handlePreviewSummary()}
                        className="rounded-[12px] border border-[#111827] bg-white px-4 py-3 text-[12px] font-semibold text-[#111827] disabled:opacity-55"
                      >
                        {creatingSummaryPreview ? "노트 생성 중..." : "구조화 노트 미리보기"}
                      </button>
                    </div>
                    <p className="mt-3 text-[11px] text-[#7c8497]">
                      현재 요약본 언어: {getInterviewLanguageLabel(summaryLanguage)}. 강의자료 요약본은 DOCX/PDF로 다운로드하고, 구조화 노트는 미리보기 모달을 현재 보이는 화면 그대로 PDF로 저장할 수 있습니다.
                    </p>
                  </div>
                </section>

                <section className="mt-6 rounded-[20px] border border-[#e6e9f2] bg-[#fbfcfe] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[18px] font-semibold text-[#111827]">모의고사 세션</p>
                      <p className="mt-1 text-[12px] text-[#6b7280]">
                        강의자료 {readyMaterialCount}개를 기반으로 실제 대학 시험 스타일 문제를 생성합니다.
                        {sessionGenerationMode === "FAST_REVIEW" ? " 패스트 모의고사는 매우 쉬운 개념 암기형 문제만 빠르게 생성합니다." : ""}
                        {sessionGenerationMode === "PAST_EXAM" ? ` 선택한 족보 ${selectedPastExamMaterialIds.length || readyPastExamCount}개로 난이도와 출제 경향을 맞춥니다.` : ""}
                        {sessionGenerationMode === "PAST_EXAM_PRACTICE" ? ` 선택한 족보 ${selectedPastExamMaterialIds.length || readyPastExamCount}개를 바탕으로 실제 문제를 그대로 복원 연습합니다.` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 rounded-[16px] border border-[#e5e7eb] bg-white p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex rounded-[12px] border border-[#d1d5db] bg-white p-1">
                        {INTERVIEW_LANGUAGE_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setSessionLanguage(option.value)}
                            disabled={Boolean(creatingSessionCount)}
                            className={`rounded-[10px] px-3 py-1.5 text-[11px] font-semibold ${
                              sessionLanguage === option.value
                                ? "bg-[#111827] text-white"
                                : "text-[#4b5563]"
                            } disabled:opacity-55`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                      <div className="flex rounded-[12px] border border-[#d1d5db] bg-white p-1">
                        {[
                          { key: "STANDARD", label: "모의고사" },
                          { key: "FAST_REVIEW", label: "패스트 모의고사" },
                          { key: "PAST_EXAM", label: "족보형" },
                          { key: "PAST_EXAM_PRACTICE", label: "족보 그대로 연습" },
                        ].map((mode) => (
                          <button
                            key={mode.key}
                            type="button"
                            onClick={() => setSessionGenerationMode(mode.key)}
                            disabled={Boolean(creatingSessionCount)}
                            className={`rounded-[10px] px-3 py-1.5 text-[11px] font-semibold ${
                              sessionGenerationMode === mode.key
                                ? "bg-[#111827] text-white"
                                : "text-[#4b5563]"
                            } disabled:opacity-55`}
                          >
                            {mode.label}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 rounded-[12px] border border-[#d1d5db] px-3 py-2">
                        <span className="text-[11px] font-semibold text-[#6b7280]">문항 수</span>
                        <input
                          type="number"
                          min={3}
                          max={20}
                          value={sessionQuestionCount}
                          onChange={(event) => {
                            const nextValue = Number(event.target.value);
                            if (!Number.isFinite(nextValue)) return;
                            setSessionQuestionCount(Math.min(20, Math.max(3, nextValue)));
                          }}
                          className="w-[68px] rounded-[8px] border border-[#d1d5db] px-2 py-1 text-[12px] font-semibold text-[#111827]"
                        />
                      </div>
                    </div>

                    {sessionGenerationMode === "STANDARD" ? (
                      <>
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          {EXAM_STYLE_OPTIONS.map((style) => {
                            const active = sessionQuestionStyles.includes(style.key);
                            return (
                              <button
                                key={style.key}
                                type="button"
                                onClick={() => toggleQuestionStyle(style.key)}
                                disabled={Boolean(creatingSessionCount)}
                                className={`rounded-[10px] border px-3 py-2 text-[11px] font-semibold transition ${
                                  active
                                    ? "border-[#111827] bg-[#111827] text-white"
                                    : "border-[#d1d5db] bg-white text-[#4b5563]"
                                } disabled:opacity-55`}
                              >
                                {style.label}
                              </button>
                            );
                          })}
                        </div>
                        <p className="mt-2 text-[11px] text-[#7c8497]">
                          문제 스타일을 1개 이상 직접 선택해 주세요. 코딩형만 원하면 코딩형만 선택해야 합니다.
                        </p>
                      </>
                    ) : sessionGenerationMode === "FAST_REVIEW" ? (
                      <div className="mt-4 rounded-[12px] border border-[#dbe4ff] bg-[#f5f8ff] px-4 py-3 text-[12px] leading-[1.7] text-[#44506a]">
                        패스트 모의고사는 강의자료 전 범위를 넓게 훑는 암기 점검용 모드입니다. 난이도는 매우 쉬움으로 고정되고,
                        정의형 개념 확인 문제만 짧게 생성됩니다.
                      </div>
                    ) : (
                      <>
                        <div className="mt-4 rounded-[12px] border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3 text-[12px] leading-[1.7] text-[#5b6475]">
                          {sessionGenerationMode === "PAST_EXAM_PRACTICE"
                            ? "족보 그대로 연습은 사용자가 문제 스타일을 고르지 않습니다. 선택한 족보의 문제 유형과 문항을 그대로 복원합니다."
                            : "족보형은 사용자가 문제 스타일을 고르지 않습니다. 선택한 족보의 실제 문제 출제 유형과 경향에 맞춰 문제를 만듭니다."}
                        </div>
                        <div className="mt-4 rounded-[14px] border border-[#e5e7eb] bg-white p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[13px] font-semibold text-[#111827]">사용할 족보 선택</p>
                              <p className="mt-1 text-[11px] text-[#7c8497]">분석 완료된 족보만 반영됩니다.</p>
                            </div>
                            <p className="text-[11px] font-semibold text-[#4b5563]">{selectedPastExamMaterialIds.length}개 선택</p>
                          </div>
                          <div className="mt-3 grid gap-2">
                            {readyPastExamMaterials.length === 0 ? (
                              <p className="text-[12px] text-[#7c8497]">선택 가능한 족보가 없습니다.</p>
                            ) : (
                              readyPastExamMaterials.map((material) => (
                                <label
                                  key={material.materialId}
                                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-[12px] border px-3 py-3 transition ${
                                    selectedPastExamMaterialIds.includes(material.materialId)
                                      ? "border-[#111827] bg-[#eef2ff] shadow-[0_10px_24px_rgba(17,24,39,0.08)]"
                                      : "border-[#e5e7eb] bg-[#fcfcfd]"
                                  }`}
                                >
                                  <div className="min-w-0">
                                    <p className={`truncate text-[12px] font-semibold ${
                                      selectedPastExamMaterialIds.includes(material.materialId) ? "text-[#111827]" : "text-[#111827]"
                                    }`}>
                                      {material.fileName}
                                    </p>
                                    <p className={`mt-1 text-[10px] ${
                                      selectedPastExamMaterialIds.includes(material.materialId) ? "text-[#4158c7]" : "text-[#7c8497]"
                                    }`}>
                                      {new Date(material.createdAt).toLocaleDateString("ko-KR")}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {selectedPastExamMaterialIds.includes(material.materialId) ? (
                                      <span className="rounded-full bg-[#111827] px-2 py-1 text-[10px] font-semibold text-white">
                                        선택됨
                                      </span>
                                    ) : null}
                                    <input
                                      type="checkbox"
                                      checked={selectedPastExamMaterialIds.includes(material.materialId)}
                                      onChange={() => togglePastExamMaterialSelection(material.materialId)}
                                      className="h-4 w-4 accent-[#111827]"
                                    />
                                  </div>
                                </label>
                              ))
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    {sessionGenerationMode === "STANDARD" ? (
                      <div className="relative mt-4 rounded-[12px] border border-[#f3ddad] bg-[#fff8e8] px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-[12px] font-semibold text-[#8a5a00]">난이도</span>
                          <StarRatingInput value={sessionDifficultyLevel} onChange={setSessionDifficultyLevel} />
                          <span className="text-[12px] font-semibold text-[#8a5a00]">{sessionDifficultyLevel} / 5</span>
                          <button
                            type="button"
                            onClick={() => setShowDifficultyGuide((prev) => !prev)}
                            className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#d4a948] bg-white text-[11px] font-bold text-[#8a5a00]"
                            aria-label="난이도 가이드 보기"
                            aria-expanded={showDifficultyGuide}
                          >
                            ?
                          </button>
                        </div>
                        {showDifficultyGuide ? (
                          <div className="mt-3 rounded-[10px] border border-[#e9c97e] bg-white/85 px-3 py-3 text-[11px] leading-[1.7] text-[#8a5a00] shadow-[0_12px_24px_rgba(138,90,0,0.08)]">
                            <p className="font-semibold text-[#7c5100]">난이도 가이드</p>
                            <ul className="mt-2 space-y-1.5">
                              {[1, 2, 3, 4, 5].map((level) => (
                                <li key={`difficulty-guide-${level}`} className={level === sessionDifficultyLevel ? "font-semibold text-[#6b4600]" : ""}>
                                  {level}. {studentExamDifficultyGuide(level)}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    ) : sessionGenerationMode === "FAST_REVIEW" ? (
                      <div className="mt-4 rounded-[12px] border border-[#dcfce7] bg-[#f0fdf4] px-4 py-3 text-[12px] leading-[1.7] text-[#166534]">
                        패스트 모의고사는 난이도 1/5로 고정됩니다. OX 퀴즈처럼 빠르게 핵심 개념을 떠올릴 수 있는 짧은 서술형 문제만 출제합니다.
                      </div>
                    ) : sessionGenerationMode === "PAST_EXAM_PRACTICE" ? (
                      <div className="mt-4 rounded-[12px] border border-[#dbe4ff] bg-[#f5f8ff] px-4 py-3 text-[12px] leading-[1.7] text-[#44506a]">
                        족보 그대로 연습은 업로드한 족보 문제를 우선적으로 복원해 연습지처럼 만듭니다. 이미지 족보는 OCR로 읽은 뒤, 족보 문맥 안에서만 AI가 깨진 문장을 후보정합니다.
                      </div>
                    ) : (
                      <div className="mt-4 rounded-[12px] border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3 text-[12px] leading-[1.7] text-[#5b6475]">
                        족보형은 강의자료를 기반으로 문제를 만들되, 업로드한 족보의 난이도와 출제 문장 스타일을 반영합니다.
                      </div>
                    )}

                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        disabled={
                          Boolean(creatingSessionCount) ||
                          (sessionGenerationMode !== "PAST_EXAM_PRACTICE" && readyMaterialCount === 0) ||
                          (sessionGenerationMode === "STANDARD" && sessionQuestionStyles.length === 0) ||
                          ((sessionGenerationMode === "PAST_EXAM" || sessionGenerationMode === "PAST_EXAM_PRACTICE") &&
                            (readyPastExamCount === 0 || selectedPastExamMaterialIds.length === 0))
                        }
                        onClick={() => void handleCreateSession(sessionQuestionCount)}
                        className="rounded-[12px] bg-[#111827] px-4 py-3 text-[12px] font-semibold text-white disabled:opacity-55"
                      >
                        {creatingSessionCount ? "세션 생성 중..." : `${examModeLabel(sessionGenerationMode)} 세션 생성`}
                      </button>
                    </div>
                    <p className="mt-3 text-[11px] text-[#7c8497]">현재 모의고사 언어: {getInterviewLanguageLabel(sessionLanguage)}</p>
                  </div>
                  <div className="mt-4 space-y-3">
                    {sessions.length === 0 ? (
                      <p className="text-[13px] text-[#7c8497]">아직 생성된 모의고사 세션이 없습니다.</p>
                    ) : (
                      sessions.map((session) => (
                        <div key={session.sessionId} className="rounded-[14px] border border-[#e5e7eb] bg-white px-4 py-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-[14px] font-semibold text-[#111827]">{session.title}</p>
                              <p className="mt-1 text-[12px] text-[#7c8497]">
                                {session.questionCount}문항 · 만점 {session.maxScore}점 · 자료 {session.sourceMaterialCount}개 · {new Date(session.createdAt).toLocaleString("ko-KR")}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <span className="rounded-full bg-[#eef2ff] px-2.5 py-1 text-[10px] font-semibold text-[#4338ca]">
                                  {examModeLabel(session.generationMode)}
                                </span>
                                <span className="rounded-full bg-[#ecfeff] px-2.5 py-1 text-[10px] font-semibold text-[#0f766e]">
                                  {getInterviewLanguageLabel(session.language)}
                                </span>
                                {session.difficultyLevel ? (
                                  <span className="rounded-full bg-[#fff8e8] px-2.5 py-1 text-[10px] font-semibold text-[#8a5a00]">
                                    난이도 {session.difficultyLevel} / 5
                                  </span>
                                ) : null}
                                {(session.questionStyles || []).map((style) => (
                                  <span
                                    key={`${session.sessionId}-${style}`}
                                    className="rounded-full bg-[#f3f4f6] px-2.5 py-1 text-[10px] font-semibold text-[#4b5563]"
                                  >
                                    {examStyleLabel(style)}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => navigate(`/content/student/sessions/${session.sessionId}`)}
                                className="rounded-[10px] border border-[#d1d5db] bg-white px-3 py-2 text-[11px] font-semibold text-[#374151]"
                              >
                                세션 풀어보기
                              </button>
                              <button
                                type="button"
                                onClick={() => setSessionDeleteTarget(session)}
                                disabled={Boolean(deletingSessionId)}
                                className="rounded-[10px] border border-[#fecaca] bg-[#fff5f5] px-3 py-2 text-[11px] font-semibold text-[#dc2626] disabled:opacity-55"
                              >
                                삭제
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <section className="mt-6 rounded-[20px] border border-[#e6e9f2] bg-[#fbfcfe] p-5">
                  <div>
                    <p className="text-[18px] font-semibold text-[#111827]">오답노트</p>
                    <p className="mt-1 text-[12px] text-[#6b7280]">세션 결과에서 저장한 문제들을 다시 보고, 새 재시험 세션으로 이어갈 수 있습니다.</p>
                  </div>
                  <div className="mt-4 space-y-3">
                    {wrongAnswerSets.length === 0 ? (
                      <p className="text-[13px] text-[#7c8497]">아직 저장된 오답노트가 없습니다.</p>
                    ) : (
                      wrongAnswerSets.map((wrongSet) => (
                        <div key={wrongSet.setId} className="rounded-[14px] border border-[#e5e7eb] bg-white px-4 py-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-[14px] font-semibold text-[#111827]">{wrongSet.title}</p>
                              <p className="mt-1 text-[12px] text-[#7c8497]">
                                {wrongSet.questionCount}문항 · {new Date(wrongSet.updatedAt).toLocaleString("ko-KR")}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => navigate(`/content/student/wrong-answer-sets/${wrongSet.setId}`)}
                                className="rounded-[10px] border border-[#d1d5db] bg-white px-3 py-2 text-[11px] font-semibold text-[#374151]"
                              >
                                상세 보기
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleCreateRetest(wrongSet)}
                                disabled={creatingRetestSetId === wrongSet.setId}
                                className="rounded-[10px] border border-[#111827] bg-[#111827] px-3 py-2 text-[11px] font-semibold text-white disabled:opacity-55"
                              >
                                {creatingRetestSetId === wrongSet.setId ? "생성 중..." : "재시험"}
                              </button>
                            </div>
                          </div>
                          {Array.isArray(wrongSet.previewQuestions) && wrongSet.previewQuestions.length > 0 ? (
                            <ul className="mt-2 space-y-1 text-[12px] leading-[1.7] text-[#4b5563]">
                              {wrongSet.previewQuestions.map((question, index) => (
                                <li key={`${wrongSet.setId}-preview-${index}`}>• {question}</li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </div>
            </div>
          </main>
        </div>
      </div>

      <ConfirmModal
        open={Boolean(materialDeleteTarget)}
        title="과목 자료 삭제"
        description={`"${materialDeleteTarget?.fileName || "선택한 자료"}"를 정말 삭제하시겠습니까? 분석 결과와 연결 정보도 함께 삭제됩니다.`}
        pending={Boolean(deletingMaterialId)}
        onCancel={() => {
          if (deletingMaterialId) return;
          setMaterialDeleteTarget(null);
        }}
        onConfirm={() => void handleDeleteMaterial()}
      />
      <ConfirmModal
        open={Boolean(sessionDeleteTarget)}
        title="모의고사 삭제"
        description={`"${sessionDeleteTarget?.title || "선택한 모의고사"}"를 정말 삭제하시겠습니까? 세션 문항과 오답노트 기록도 함께 삭제됩니다.`}
        pending={Boolean(deletingSessionId)}
        onCancel={() => {
          if (deletingSessionId) return;
          setSessionDeleteTarget(null);
        }}
        onConfirm={() => void handleDeleteSession()}
      />
      {showPointChargeModal ? (
        <PointChargeModal
          onClose={() => setShowPointChargeModal(false)}
          onCharged={(result) => {
            setUserPoint(parsePoint(result?.currentPoint));
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
      <AnalysisLockOverlay
        open={isAnalysisLocked}
        fileName={activeIngestionMaterial?.fileName}
        pendingRequest={analyzingMaterialId !== null && !activeIngestionMaterial}
      />
      <SummaryPdfSavingOverlay
        open={savingSummaryPdf}
        count={selectedSummaryMaterialIds.length}
      />
      <VisualAssetModal
        open={Boolean(visualAssetViewer)}
        title={visualAssetViewer ? `${visualAssetViewer.title} 원문 이미지` : ""}
        assets={Array.isArray(visualAssetViewer?.assets) ? visualAssetViewer.assets : []}
        onClose={() => setVisualAssetViewer(null)}
      />
      {academicProfileRequiredModal}
      <SummaryPreviewModal
        open={Boolean(summaryPreview)}
        preview={summaryPreview}
        savingPdf={savingSummaryPdf}
        exportRef={summaryPreviewExportRef}
        onDownloadPdf={() => void handleDownloadSummaryPreviewPdf()}
        onClose={() => setSummaryPreview(null)}
      />
    </>
  );
};
