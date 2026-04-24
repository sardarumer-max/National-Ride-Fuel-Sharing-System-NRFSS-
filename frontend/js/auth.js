const API_BASE = "";

const ACCESS_TOKEN_KEY = "nrfss_access_token";
const USER_KEY = "nrfss_user";

const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);
const setAccessToken = (token) => localStorage.setItem(ACCESS_TOKEN_KEY, token);
const clearAuth = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

const PRIVATE_PAGES = ["dashboard.html", "post-ride.html", "find-ride.html", "calculator.html", "profile.html", "admin.html"];

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

const wireRegister = () => {
  const form = document.querySelector("form");
  if (!form) return;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const inputs = form.querySelectorAll("input, select");
    const payload = {
      full_name: inputs[0]?.value?.trim(),
      cnic: inputs[1]?.value?.trim(),
      mobile: inputs[2]?.value?.trim(),
      email: inputs[3]?.value?.trim(),
      age: inputs[4]?.value,
      city: inputs[5]?.value?.trim(),
      profession: inputs[6]?.value?.trim(),
      password: inputs[7]?.value,
    };
    if (payload.password !== inputs[8]?.value) return alert("Passwords do not match.");

    const isVehicleOwner = form.querySelector('input[type="checkbox"]')?.checked;
    if (isVehicleOwner) {
      payload.vehicle = {
        type: "car",
        fuel_type: "petrol",
        fuel_efficiency: Number(inputs[10]?.value || 12),
        seats: 4,
      };
      const vehicleType = form.querySelector("select")?.value?.toLowerCase() || "car";
      if (vehicleType.includes("bike")) payload.vehicle.type = "bike";
      if (vehicleType.includes("van")) payload.vehicle.type = "van";
    }

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) return alert(data.message || "Registration failed");
    setAccessToken(data.accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    window.location.href = "dashboard.html";
  });
};

const wireLogin = () => {
  const form = document.querySelector("form");
  if (!form) return;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const inputs = form.querySelectorAll("input");
    const payload = { credential: inputs[0]?.value?.trim(), password: inputs[1]?.value };
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) return alert(data.message || "Login failed");
    setAccessToken(data.accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    window.location.href = "dashboard.html";
  });
};

window.NRFSS = { requestWithAuth, getAccessToken, clearAuth };

document.addEventListener("DOMContentLoaded", () => {
  const page = window.location.pathname.split("/").pop() || "index.html";
  const token = getAccessToken();
  if (PRIVATE_PAGES.includes(page) && !token) {
    window.location.href = "login.html";
    return;
  }

  const openFaq = (button) => {
    const content = button.nextElementSibling;
    if (!content) return;
    const hidden = content.classList.contains("hidden");
    document.querySelectorAll("section .glass-card > div.hidden, section .glass-card > div:not(.hidden)").forEach((panel) => {
      panel.classList.add("hidden");
    });
    if (hidden) content.classList.remove("hidden");
  };

  document.querySelectorAll("a,button").forEach((el) => {
    const text = el.textContent.trim().toLowerCase();
    if (el.tagName === "A" && el.getAttribute("href") === "#") el.setAttribute("href", "javascript:void(0)");
    if (text === "login") el.addEventListener("click", () => (window.location.href = "login.html"));
    if (text === "register" || text.includes("register now")) el.addEventListener("click", () => (window.location.href = "register.html"));
    if (text.includes("post a ride")) el.addEventListener("click", () => (window.location.href = "post-ride.html"));
    if (text.includes("find a ride")) el.addEventListener("click", () => (window.location.href = "find-ride.html"));
    if (text.includes("fuel calculator")) el.addEventListener("click", () => (window.location.href = "calculator.html"));
    if (text.includes("settings")) el.addEventListener("click", () => (window.location.href = "profile.html"));
    if (text.includes("logout")) {
      el.addEventListener("click", () => {
        clearAuth();
        window.location.href = "login.html";
      });
    }
    if (text.includes("how is my cnic data protected") || text.includes("what happens if i cancel a ride") || text.includes("how are ride disputes resolved")) {
      el.addEventListener("click", () => openFaq(el));
    }
  });
  if (page === "register.html") wireRegister();
  if (page === "login.html") wireLogin();
});
