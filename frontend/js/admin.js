const wireAdmin = () => {
  const statsButton = document.getElementById("load-stats");
  const verifyButton = document.getElementById("verify-user-btn");
  const statsBox = document.getElementById("stats-output");

  if (statsButton) {
    statsButton.addEventListener("click", async () => {
      const response = await NRFSS.requestWithAuth("/api/admin/stats");
      const data = await response.json();
      if (!response.ok) return alert(data.message || "Cannot load stats");
      statsBox.textContent = `Users: ${data.users} | Rides: ${data.rides} | Requests: ${data.ride_requests}`;
    });
  }

  if (verifyButton) {
    verifyButton.addEventListener("click", async () => {
      const userId = document.getElementById("verify-user-id").value.trim();
      if (!userId) return alert("Enter user ID");
      const response = await NRFSS.requestWithAuth(`/api/admin/verify/${userId}`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) return alert(data.message || "Verification failed");
      alert(`Verified user: ${data.full_name}`);
    });
  }
};

document.addEventListener("DOMContentLoaded", wireAdmin);
