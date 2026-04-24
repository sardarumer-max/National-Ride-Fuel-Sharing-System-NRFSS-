const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

const loadLeaflet = async () => {
  if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = LEAFLET_CSS;
    document.head.appendChild(link);
  }
  if (window.L) return;
  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = LEAFLET_JS;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

const geocode = async (query) => {
  if (!query) return null;
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  const items = await response.json();
  if (!Array.isArray(items) || !items.length) return null;
  return { lat: Number(items[0].lat), lon: Number(items[0].lon), name: items[0].display_name };
};

const createDarkTiles = (map) =>
  window.L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
  }).addTo(map);

const initPostRideMap = async () => {
  if (!window.location.pathname.endsWith("post-ride.html")) return;
  await loadLeaflet();
  const mapHost = document.querySelector(".xl\\:col-span-7 .glass-panel");
  if (!mapHost) return;
  mapHost.innerHTML = '<div id="nrfss-map" style="width:100%;height:100%;min-height:420px;"></div>';

  const map = window.L.map("nrfss-map").setView([31.5204, 74.3587], 6);
  createDarkTiles(map);

  const inputs = document.querySelectorAll('input[type="text"]');
  const startInput = inputs[0];
  const stopInput = inputs[1];
  const endInput = inputs[2];
  let startMarker;
  let stopMarker;
  let endMarker;
  let routeLine;

  const drawRoute = async () => {
    const start = await geocode(startInput?.value);
    const stop = await geocode(stopInput?.value);
    const end = await geocode(endInput?.value);
    if (!start || !end) return;
    if (startMarker) map.removeLayer(startMarker);
    if (stopMarker) map.removeLayer(stopMarker);
    if (endMarker) map.removeLayer(endMarker);
    if (routeLine) map.removeLayer(routeLine);

    startMarker = window.L.marker([start.lat, start.lon]).addTo(map).bindPopup("Start");
    if (stop) stopMarker = window.L.marker([stop.lat, stop.lon]).addTo(map).bindPopup("Stop");
    endMarker = window.L.marker([end.lat, end.lon]).addTo(map).bindPopup("Destination");

    const points = stop ? [[start.lat, start.lon], [stop.lat, stop.lon], [end.lat, end.lon]] : [[start.lat, start.lon], [end.lat, end.lon]];
    routeLine = window.L.polyline(points, { color: "#22c55e", weight: 4, dashArray: "8 6" }).addTo(map);
    map.fitBounds(routeLine.getBounds(), { padding: [30, 30] });

    const distanceKm = points.reduce((sum, p, i) => {
      if (i === 0) return 0;
      return sum + map.distance(window.L.latLng(points[i - 1][0], points[i - 1][1]), window.L.latLng(p[0], p[1])) / 1000;
    }, 0);
    window.NRFSSRoute = { distanceKm: Number(distanceKm.toFixed(2)), stops: stop ? [stop.name] : [] };
  };

  [startInput, stopInput, endInput].forEach((input) => {
    if (input) input.addEventListener("change", drawRoute);
  });
};

document.addEventListener("DOMContentLoaded", initPostRideMap);
