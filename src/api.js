import axios from "axios";

// Client pour routes utilisateurs (/users/...)
const API = axios.create({
  baseURL: "http://localhost:5000/users", // user-specific base (user routes)
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor pour ajouter le token si présent
const attachToken = (client) => {
  client.interceptors.request.use((config) => {
    // login.js stores the Firebase ID token under 'idToken'
    const token = localStorage.getItem("idToken") || localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
};

attachToken(API);

export const getMyProfile = async () => {
  const res = await API.get("/profile/me");
  return res.data;
};

export const updateMyProfile = async (profileData) => {
  const res = await API.put("/profile/me", profileData);
  return res.data;
};

// Root client for other endpoints (cotisations, etc.)
const ROOT = axios.create({
  baseURL: (process.env.REACT_APP_API_URL || "http://localhost:5000"),
});
attachToken(ROOT);

// Global response interceptor: si 401 -> token expiré ou invalide, vider le token et rediriger
const attachAuthExpiredHandler = (client) => {
  client.interceptors.response.use(
    (res) => res,
    (err) => {
      try {
        const status = err?.response?.status
        if (status === 401) {
          localStorage.removeItem("idToken")
          localStorage.removeItem("token")
          // redirection vers la racine (login page)
          if (typeof window !== "undefined") window.location.href = "/"
        }
      } catch (e) {
        // ignore
      }
      return Promise.reject(err)
    }
  )
}

attachAuthExpiredHandler(API)
attachAuthExpiredHandler(ROOT)

// Cotisations helpers
export const getMemberCotisationsHistory = async () => {
  const res = await ROOT.get("/cotisations/member/history");
  return Array.isArray(res.data) ? res.data : (res.data?.data || res.data?.cotisations || []);
};

export const getMemberCotisationsByPeriod = async (startDate, endDate) => {
  const params = {};
  // Accept YYYY-MM-DD from inputs, normalize to start/end ISO and ms timestamps
  let startISO = null;
  let endISO = null;
  let startMs = null;
  let endMs = null;
  try {
    if (startDate) {
      const s = new Date(startDate + "T00:00:00");
      if (!isNaN(s.getTime())) {
        startISO = s.toISOString();
        startMs = s.getTime();
      }
    }
    if (endDate) {
      const e = new Date(endDate + "T23:59:59.999");
      if (!isNaN(e.getTime())) {
        endISO = e.toISOString();
        endMs = e.getTime();
      }
    }
  } catch (e) {
    /* ignore */
  }

  // send multiple param name variants to maximize backend compatibility
  if (startDate) {
    params.startDate = startISO || startDate;
    params.start_date = startISO || startDate;
    params.from = startISO || startDate;
    params.start = startISO || startDate;
    if (startMs) params.start_ms = startMs;
    if (startMs) params.startEpoch = startMs;
  }
  if (endDate) {
    params.endDate = endISO || endDate;
    params.end_date = endISO || endDate;
    params.to = endISO || endDate;
    params.end = endISO || endDate;
    if (endMs) params.end_ms = endMs;
    if (endMs) params.endEpoch = endMs;
  }

  const res = await ROOT.get("/cotisations/member/period", { params });
  return Array.isArray(res.data) ? res.data : (res.data?.data || res.data?.cotisations || []);
};

export const createCotisation = async (formData, forceValidate = false) => {
  const config = { headers: { "Content-Type": "multipart/form-data" }, params: {} };
  if (forceValidate) config.params.forceValidate = true;
  const res = await ROOT.post("/cotisations", formData, config);
  return res.data;
};

// Manager (superviseur) endpoints
export const getManagerDashboard = async () => {
  const res = await ROOT.get("/cotisations/manager/dashboard");
  return res.data;
};

// Get all users (manager sees only their committee members)
export const getUsers = async () => {
  const res = await ROOT.get("/users");
  return Array.isArray(res.data) ? res.data : (res.data?.data || res.data?.users || []);
};




// Helper to flatten contributions from memberStats structure
const flattenContributions = (data) => {
  // If data is already an array of contributions, return as-is
  if (Array.isArray(data)) {
    return data;
  }
  // If data has memberStats array (structure with statistics + memberStats)
  if (data?.memberStats && Array.isArray(data.memberStats)) {
    const flattened = [];
    data.memberStats.forEach((memberStat) => {
      if (memberStat.contributions && Array.isArray(memberStat.contributions)) {
        flattened.push(...memberStat.contributions);
      }
    });
    return flattened;
  }
  // If data has data property or cotisations property
  if (data?.data && Array.isArray(data.data)) {
    return data.data;
  }
  if (data?.cotisations && Array.isArray(data.cotisations)) {
    return data.cotisations;
  }
  // Fallback: return empty array
  return [];
};

// NEW: Fetch all cotisations for the committee (like member history)
export const getManagerCotisationsHistory = async () => {
  try {
    const res = await ROOT.get("/cotisations/manager/history");
    return flattenContributions(res.data);
  } catch (err) {
    // Fallback: try the period endpoint without filters to get all
    try {
      const res2 = await ROOT.get("/cotisations/manager/period");
      return flattenContributions(res2.data);
    } catch (e) {
      throw err;
    }
  }
};

// NEW: Fetch all cotisations for the committee
export const getManagerAllCotisations = async () => {
  try {
    const res = await ROOT.get("/cotisations/manager/all");
    return flattenContributions(res.data);
  } catch (err) {
    // Fallback: try the period endpoint without filters to get all
    try {
      const res2 = await ROOT.get("/cotisations/manager/period");
      return flattenContributions(res2.data);
    } catch (e) {
      throw err;
    }
  }
};

export const getManagerDashboardByPeriod = async (startDate, endDate) => {
  // reuse same param normalization as member period
  const params = {};
  let startISO = null;
  let endISO = null;
  let startMs = null;
  let endMs = null;
  try {
    if (startDate) {
      const s = new Date(startDate + "T00:00:00");
      if (!isNaN(s.getTime())) {
        startISO = s.toISOString();
        startMs = s.getTime();
      }
    }
    if (endDate) {
      const e = new Date(endDate + "T23:59:59.999");
      if (!isNaN(e.getTime())) {
        endISO = e.toISOString();
        endMs = e.getTime();
      }
    }
  } catch (e) {}

  if (startDate) {
    params.startDate = startISO || startDate;
    params.start_date = startISO || startDate;
    params.from = startISO || startDate;
    if (startMs) params.start_ms = startMs;
  }
  if (endDate) {
    params.endDate = endISO || endDate;
    params.end_date = endISO || endDate;
    params.to = endISO || endDate;
    if (endMs) params.end_ms = endMs;
  }

  const res = await ROOT.get("/cotisations/manager/period", { params });
  // Return cotisations list, handling memberStats structure
  return flattenContributions(res.data);
};

export const getMemberContributionsForManagerAll = async (memberId) => {
  try {
    const res = await ROOT.get(`/cotisations/manager/member/${memberId}`);
    return flattenContributions(res.data);
  } catch (err) {
    // If /manager/member/{id} doesn't exist, try alternative routes
    try {
      const res2 = await ROOT.get(`/cotisations/member/${memberId}`);
      return flattenContributions(res2.data);
    } catch (e) {
      throw err;
    }
  }
};

export const getPendingForManager = async () => {
  const res = await ROOT.get("/cotisations/pending");
  return Array.isArray(res.data) ? res.data : (res.data?.data || res.data?.cotisations || []);
};

export const validateCotisation = async (id) => {
  const res = await ROOT.put(`/cotisations/${id}/validate`);
  return res.data;
};

export const rejectCotisation = async (id, reason) => {
  const res = await ROOT.put(`/cotisations/${id}/reject`, { reason });
  return res.data;
};

// Utility to parse Firebase timestamps and various date formats
export function parseDate(value) {
  if (!value) return null

  // Déjà une Date JS
  if (value instanceof Date) return value

  // Firestore Timestamp (SDK)
  if (typeof value?.toDate === "function") {
    return value.toDate()
  }

  // Firestore Timestamp sérialisé
  if (typeof value === "object") {
    if (value.seconds) {
      return new Date(value.seconds * 1000)
    }
    if (value._seconds) {
      return new Date(value._seconds * 1000)
    }
  }

  // ISO string ou timestamp
  const date = new Date(value)
  return isNaN(date.getTime()) ? null : date
}


export default API;
