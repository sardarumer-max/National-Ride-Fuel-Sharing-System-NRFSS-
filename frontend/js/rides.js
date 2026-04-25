const wirePostRide = () => {
  const button = Array.from(document.querySelectorAll("button")).find((b) => b.textContent.includes("Post This Ride") || b.textContent.includes("Publish Route"));
  if (!button) return;
  button.addEventListener("click", async () => {
    const inputs = document.querySelectorAll("input, select");
    const payload = {
      origin: inputs[0]?.value || "Unknown origin",
      destination: inputs[2]?.value || "Unknown destination",
      stops: inputs[1]?.value ? [inputs[1].value] : [],
      date: inputs[3]?.value || new Date().toISOString().slice(0, 10),
      departure_time: inputs[4]?.value || "09:00",
      available_seats: Number(inputs[5]?.value || 1),
      fuel_type: "petrol",
      fare_per_seat: Number(inputs[7]?.value || 500),
      total_distance: Number(window.NRFSSRoute?.distanceKm || inputs[6]?.value || 10),
      status: "open",
    };
    if (window.NRFSSRoute?.stops?.length) payload.stops = window.NRFSSRoute.stops;
    const res = await NRFSS.requestWithAuth("/api/rides/post", { method: "POST", body: JSON.stringify(payload) });
    const data = await NRFSS.safeJson(res);
    if (!res.ok) return alert(data.message || "Failed to post ride");
    alert("Ride posted successfully");
    window.location.href = "dashboard.html";
  });
};

const renderMatchCards = (rides) => {
  const container = document.querySelector("section.max-w-7xl.mx-auto.grid");
  if (!container) return;
  container.innerHTML = "";
  rides.forEach((ride) => {
    const card = document.createElement("div");
    card.className = "glass-card rounded-xl p-md flex flex-col gap-gutter";
    card.innerHTML = `
      <div class="flex justify-between"><h3 class="font-h2 text-body-lg">${ride.users?.full_name || "Driver"}</h3><div class="text-primary text-h1 font-black">PKR ${ride.fare_per_seat}</div></div>
      <div class="text-on-surface-variant">${ride.origin} -> ${ride.destination}</div>
      <div class="text-label-sm text-emerald-500/60">${ride.date} ${ride.departure_time} | Seats: ${ride.available_seats}</div>
      <button class="request-ride-btn flex-1 py-3 bg-gradient-to-r from-[#16a34a] to-[#22c55e] text-on-primary rounded-lg font-button uppercase" data-ride-id="${ride.id}">Request Ride</button>
    `;
    container.appendChild(card);
  });
  container.querySelectorAll(".request-ride-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const res = await NRFSS.requestWithAuth(`/api/rides/${button.dataset.rideId}/request`, { method: "POST" });
      const data = await NRFSS.safeJson(res);
      if (!res.ok) return alert(data.message || "Failed to request ride");
      alert("Ride requested successfully");
    });
  });
};

const wireFindRide = () => {
  const searchButton = Array.from(document.querySelectorAll("button")).find((b) => b.textContent.trim().toLowerCase() === "search");
  if (!searchButton) return;
  searchButton.addEventListener("click", async () => {
    const inputs = document.querySelectorAll('input[type="text"], input[type="date"], select');
    const params = new URLSearchParams({
      origin: inputs[0]?.value || "Lahore",
      destination: inputs[1]?.value || "Islamabad",
      date: inputs[2]?.value || "",
      seats: String(Number((inputs[3]?.value || "1").slice(0, 1) || 1)),
    });
    const res = await NRFSS.requestWithAuth(`/api/rides/match?${params.toString()}`);
    const data = await NRFSS.safeJson(res);
    if (!res.ok) return alert(data.message || "Ride search failed");
    renderMatchCards(data.rides || []);
  });
};

const wireDashboard = () => {
  const user = NRFSS.getUser();
  const greeting = Array.from(document.querySelectorAll("h1")).find((h) => h.textContent.includes("Good Morning"));
  if (greeting && user.full_name) greeting.textContent = `Good Morning, ${user.full_name.split(" ")[0]} 👋`;

  if (!user.id) return;
  NRFSS.requestWithAuth(`/api/users/${user.id}/dashboard`)
    .then((res) => NRFSS.safeJson(res))
    .then((data) => {
      const statCards = document.querySelectorAll("header .glass-card span.text-primary");
      if (statCards[0]) statCards[0].textContent = String(data.stats?.rides_as_driver || 0);
      if (statCards[1]) statCards[1].textContent = String((data.ride_history?.as_driver || []).reduce((sum, r) => sum + Number(r.fare_per_seat || 0), 0));
      const tableBody = document.querySelector("table tbody");
      if (tableBody && Array.isArray(data.ride_history?.as_driver)) {
        tableBody.innerHTML = "";
        data.ride_history.as_driver.slice(0, 5).forEach((ride) => {
          const tr = document.createElement("tr");
          tr.className = "hover:bg-primary/5 transition-colors";
          tr.innerHTML = `
            <td class="px-6 py-4 text-on-surface">${ride.date || ""}</td>
            <td class="px-6 py-4"><div class="flex items-center gap-2"><span class="text-sm font-medium">${ride.origin}</span><span class="material-symbols-outlined text-xs text-emerald-500/40">arrow_forward</span><span class="text-sm font-medium">${ride.destination}</span></div></td>
            <td class="px-6 py-4"><span class="px-2 py-1 bg-surface-container-high text-[10px] rounded uppercase">Driver</span></td>
            <td class="px-6 py-4 font-medium text-primary">PKR ${ride.fare_per_seat || 0}</td>
            <td class="px-6 py-4"><span class="flex items-center gap-1.5 text-secondary text-xs"><span class="w-1.5 h-1.5 rounded-full bg-secondary"></span>${ride.status || "open"}</span></td>
          `;
          tableBody.appendChild(tr);
        });
      }
    })
    .catch(() => {});
};

const pollNotifications = () => {
  setInterval(async () => {
    try {
      const res = await NRFSS.requestWithAuth("/api/notifications");
      const data = await NRFSS.safeJson(res);
      const badge = document.querySelector(".material-symbols-outlined + span");
      if (badge && Array.isArray(data)) {
        const unread = data.filter((n) => !n.is_read).length;
        badge.style.display = unread > 0 ? "block" : "none";
      }
    } catch (_err) {}
  }, 30000);
};

const wireProfile = async () => {
  const user = NRFSS.getUser();
  if (!user.id) return;
  const response = await NRFSS.requestWithAuth(`/api/users/${user.id}`);
  if (response.ok) {
    const data = await response.json();
    const nameHeading = Array.from(document.querySelectorAll("h2")).find((h) => h.textContent.trim().length > 2);
    if (nameHeading) nameHeading.textContent = data.full_name;
  }
  const editBtn = Array.from(document.querySelectorAll("button")).find((b) => b.textContent.includes("Edit Profile"));
  if (editBtn) {
    editBtn.addEventListener("click", async () => {
      const full_name = prompt("Update full name:", user.full_name || "");
      const city = prompt("Update city:", "");
      const profession = prompt("Update profession:", "");
      if (!full_name && !city && !profession) return;
      const patchResponse = await NRFSS.requestWithAuth(`/api/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ full_name: full_name || undefined, city: city || undefined, profession: profession || undefined }),
      });
      const body = await NRFSS.safeJson(patchResponse);
      if (!patchResponse.ok) return alert(body.message || "Update failed");
      NRFSS.setUser({ ...user, full_name: body.full_name || user.full_name });
      alert("Profile updated");
      window.location.reload();
    });
  }
};

document.addEventListener("DOMContentLoaded", () => {
  const page = window.location.pathname;
  if (page.endsWith("post-ride.html")) wirePostRide();
  if (page.endsWith("find-ride.html")) wireFindRide();
  if (page.endsWith("dashboard.html")) wireDashboard();
  if (page.endsWith("profile.html")) wireProfile();
  if (page.endsWith("dashboard.html") || page.endsWith("profile.html")) pollNotifications();
});
