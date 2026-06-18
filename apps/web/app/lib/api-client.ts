"use client";

import type {
  BudgetResponse,
  Detection,
  PriceItem,
  Project,
  ProjectStatusResponse,
} from "./types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

/** Single fetch core: JSON in, JSON out, throwing the server message on failure. */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json() as Promise<T>;
}

/** Typed, endpoint-per-method client. Pages depend on this instead of raw fetch. */
export const api = {
  listProjects: () => request<Project[]>("/projects"),
  getProject: (id: string) => request<Project>(`/projects/${id}`),
  createProject: (name: string) =>
    request<Project>("/projects", { method: "POST", body: JSON.stringify({ name }) }),
  getStatus: (id: string) => request<ProjectStatusResponse>(`/projects/${id}/status`),
  process: (id: string) => request<unknown>(`/projects/${id}/process`, { method: "POST" }),

  listDetections: (id: string) => request<Detection[]>(`/projects/${id}/detections`),
  updateDetection: (
    id: string,
    detectionId: string,
    body: { label: string; quantity: number; box: Detection["box"] },
  ) =>
    request<Detection>(`/projects/${id}/detections/${detectionId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  setDetectionStatus: (id: string, detectionId: string, command: "accept" | "reject") =>
    request<Detection>(`/projects/${id}/detections/${detectionId}/${command}`, { method: "POST" }),

  getBudget: (id: string) => request<BudgetResponse>(`/projects/${id}/budget`),
  recalculateBudget: (id: string) =>
    request<unknown>(`/projects/${id}/budget/recalculate`, { method: "POST" }),
  exportCsvUrl: (id: string) => `${API_URL}/projects/${id}/export.csv`,

  listPrices: () => request<PriceItem[]>("/price-catalog"),
  upsertPrice: (body: { label: string; unitPrice: number; unit?: string }) =>
    request<PriceItem>("/price-catalog", { method: "POST", body: JSON.stringify(body) }),

  uploadPdf: async (projectId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    const response = await fetch(`${API_URL}/projects/${projectId}/upload`, {
      method: "POST",
      body: form,
    });
    if (!response.ok) {
      throw new Error(await response.text());
    }
    return response.json();
  },
};
