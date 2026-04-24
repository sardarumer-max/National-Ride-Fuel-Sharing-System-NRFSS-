const wireCalculator = () => {
  const calculateButton = Array.from(document.querySelectorAll("button")).find((b) => b.textContent.includes("CALCULATE"));
  if (!calculateButton) return;

  calculateButton.addEventListener("click", async () => {
    const inputs = document.querySelectorAll('input[type="number"], input[type="range"]');
    const params = new URLSearchParams({
      distance_km: inputs[0]?.value || "100",
      fuel_efficiency: inputs[1]?.value || "10",
      fuel_price: inputs[2]?.value || "280",
      passengers_count: inputs[3]?.value || "4",
    });
    const response = await NRFSS.requestWithAuth(`/api/fuel/calculate?${params.toString()}`);
    const data = await response.json();
    if (!response.ok) return alert(data.message || "Calculation failed");

    const blocks = document.querySelectorAll(".text-display, .text-h1.font-h1.text-secondary");
    if (blocks[0]) blocks[0].textContent = `PKR ${data.total_fuel_cost}`;
    if (blocks[1]) blocks[1].textContent = `PKR ${data.cost_per_passenger}`;
    if (blocks[2]) blocks[2].textContent = `${data.fuel_consumed_liters} L`;
  });
};

document.addEventListener("DOMContentLoaded", wireCalculator);
