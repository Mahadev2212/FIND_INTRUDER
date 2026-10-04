/**
 * ChainTrace – API client.
 * Set USE_MOCKS = true to use mock JSON during development (before H7 integration).
 * Flip to false when connecting to real backend.
 * Owner: Mahadev H
 */

const USE_MOCKS = true; // TODO: flip to false at H7 integration
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── Mock imports (loaded only when USE_MOCKS = true) ─────────────────────────
const getMock = async (name) => {
  const mod = await import(`./mocks/${name}.json`);
  return mod.default;
};

// ─── API functions ─────────────────────────────────────────────────────────────

export async function uploadLogs(files) {
  if (USE_MOCKS) return getMock("analyze_response");
  const form = new FormData();
  files.forEach((f) => form.append("files", f));
  const res = await fetch(`${BASE_URL}/api/analyze`, { method: "POST", body: form });
  if (!res.ok) throw new Error((await res.json()).detail || "Upload failed");
  return res.json();
}

export async function simulate(scenarios, seed = 42) {
  if (USE_MOCKS) return getMock("analyze_response");
  return request("/api/simulate", {
    method: "POST",
    body: JSON.stringify({ scenarios, seed }),
  });
}

export async function listAnalyses() {
  if (USE_MOCKS) return getMock("analyses_list");
  return request("/api/analyses");
}

export async function getSummary(analysisId) {
  if (USE_MOCKS) return getMock("summary");
  return request(`/api/analyses/${analysisId}/summary`);
}

export async function getIncidents(analysisId) {
  if (USE_MOCKS) return getMock("incidents");
  return request(`/api/analyses/${analysisId}/incidents`);
}

export async function getIncidentDetail(analysisId, incidentId) {
  if (USE_MOCKS) return getMock("incident_detail");
  return request(`/api/analyses/${analysisId}/incidents/${incidentId}`);
}

export async function getEntities(analysisId) {
  if (USE_MOCKS) return getMock("entities");
  return request(`/api/analyses/${analysisId}/entities`);
}

export async function getEvaluation(analysisId) {
  if (USE_MOCKS) return getMock("evaluation");
  return request(`/api/analyses/${analysisId}/evaluation`);
}

export async function healthCheck() {
  return request("/api/health");
}
