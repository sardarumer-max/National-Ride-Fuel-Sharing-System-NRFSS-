const API_BASE = "";

const ACCESS_TOKEN_KEY = "nrfss_access_token";
const USER_KEY = "nrfss_user";
const PRIVATE_PAGES = [
  "dashboard.html",
  "post-ride.html",
  "find-ride.html",
  "calculator.html",
  "profile.html",
  "admin.html",
];

const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);
const setAccessToken = (token) => localStorage.setItem(ACCESS_TOKEN_KEY, token);
const clearAuth = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

const getUser = () => JSON.parse(localStorage.getItem(USER_KEY) || "{}");
const setUser = (user) => localStorage.setItem(USER_KEY, JSON.stringify(user));

const safeJson = async (response) => {
  const body = await response.json().catch(() => ({}));
  return body;
};

async function requestWithAuth(url, options = {}, retried = false) {
  const token = getAccessToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (response.status === 401 && !retried) {
    const refresh = await fetch(`${API_BASE}/api/auth/refresh`, { method: "POST", credentials: "include" });
    if (refresh.ok) {
      const data = await refresh.json();
      setAccessToken(data.accessToken);
      return requestWithAuth(url, options, true);
    }

    clearAuth();
    window.location.href = "login.html";
    throw new Error("Unauthorized");
  }

  return response;
}

window.NRFSS = {
  requestWithAuth,
  getAccessToken,
  setAccessToken,
  clearAuth,
  getUser,
  setUser,
  safeJson,
  PRIVATE_PAGES,
};

document.addEventListener("DOMContentLoaded", () => {
  const page = window.location.pathname.split("/").pop() || "index.html";
  const token = getAccessToken();
  if (PRIVATE_PAGES.includes(page) && !token) {
    window.location.href = "login.html";
  }
});
