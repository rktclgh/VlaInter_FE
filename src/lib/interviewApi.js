import { apiRequest } from "./apiClient";

export async function getInterviewCategories() {
  return apiRequest("/api/interview/categories", {
    method: "GET",
  });
}

export async function getInterviewSets() {
  return apiRequest("/api/interview/sets", {
    method: "GET",
  });
}

export async function createInterviewSet(payload) {
  return apiRequest("/api/interview/sets", {
    method: "POST",
    body: payload,
  });
}

export async function getInterviewSetQuestions(setId) {
  return apiRequest(`/api/interview/sets/${encodeURIComponent(setId)}/questions`, {
    method: "GET",
  });
}

export async function startTechInterview(payload) {
  return apiRequest("/api/interview/tech/sessions", {
    method: "POST",
    body: payload,
  });
}

export async function getReadyMockDocuments() {
  return apiRequest("/api/interview/mock/documents", {
    method: "GET",
  });
}

export async function ingestMockDocument(fileId) {
  return apiRequest(`/api/interview/mock/documents/${encodeURIComponent(fileId)}/ingestion`, {
    method: "POST",
  });
}

export async function startMockInterview(payload) {
  return apiRequest("/api/interview/mock/sessions", {
    method: "POST",
    body: payload,
  });
}

export async function submitInterviewAnswer(apiBasePath, sessionId, answer) {
  return apiRequest(`${apiBasePath}/sessions/${encodeURIComponent(sessionId)}/answers`, {
    method: "POST",
    body: { answer },
  });
}

export async function getInterviewSessionResults(apiBasePath, sessionId) {
  return apiRequest(`${apiBasePath}/sessions/${encodeURIComponent(sessionId)}/results`, {
    method: "GET",
  });
}

export async function submitTechInterviewAnswer(sessionId, answer) {
  return submitInterviewAnswer("/api/interview/tech", sessionId, answer);
}

export async function bookmarkInterviewTurn(apiBasePath, turnId, note = null) {
  return apiRequest(`${apiBasePath}/turns/${encodeURIComponent(turnId)}/bookmark`, {
    method: "POST",
    body: note ? { note } : {},
  });
}

export async function getSavedInterviewQuestions() {
  return apiRequest("/api/interview/tech/saved-questions", {
    method: "GET",
  });
}

export async function deleteSavedInterviewQuestion(savedQuestionId) {
  return apiRequest(`/api/interview/tech/saved-questions/${encodeURIComponent(savedQuestionId)}`, {
    method: "DELETE",
  });
}
