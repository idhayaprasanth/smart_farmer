import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json"
  }
});

function errorMessage(error, fallback = "Request failed") {
  return (
    error?.response?.data?.detail ||
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}

async function request(promise, fallbackError = "Request failed") {
  try {
    const { data } = await promise;
    return data;
  } catch (error) {
    throw new Error(errorMessage(error, fallbackError));
  }
}

export const fieldApi = {
  createField: (payload) => request(api.post("/fields", payload), "Failed to create field"),
  getFields: () => request(api.get("/fields"), "Failed to load fields"),
  setActiveField: (fieldId) =>
    request(api.post(`/fields/set-active/${fieldId}`), "Failed to set active field"),
  getActiveField: () => request(api.get("/fields/active"), "Failed to load active field")
};

export const sensorApi = {
  updateActiveSensor: (payload) =>
    request(api.post("/sensors/update/active", payload), "Failed to update sensor"),
  getLiveSensor: (fieldId) =>
    request(api.get(`/sensors/live/${fieldId}`), "Failed to load live sensor"),
  getSensorHistory: (fieldId) =>
    request(api.get(`/sensors/history/${fieldId}`), "Failed to load sensor history")
};

export const cropApi = {
  createCrop: (payload) => request(api.post("/crops", payload), "Failed to create crop"),
  getLiveCrop: (fieldId) =>
    request(api.get(`/crops/live/${fieldId}`), "Failed to load active crop"),
  getCropHistory: (fieldId) =>
    request(api.get(`/crops/history/${fieldId}`), "Failed to load crop history"),
  getPlan: (fieldId) => request(api.get(`/plans/${fieldId}`), "Failed to load crop plan")
};

export const dashboardApi = {
  getDashboard: () => request(api.get("/dashboard"), "Failed to load dashboard")
};

export const aiApi = {
  chat: (question) => request(api.post("/ai/chat", { question }), "Failed to ask AI"),
  getFieldHealth: (fieldId) =>
    request(api.get(`/analytics/field-health/${fieldId}`), "Failed to load field analytics")
};

export default api;
