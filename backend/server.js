const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const path = require("path");
const env = require("./utils/env");
const rateLimit = require("./middleware/rate-limit");
const errorHandler = require("./middleware/error-handler");

const authRoutes = require("./routes/auth.routes");
const ridesRoutes = require("./routes/rides.routes");
const usersRoutes = require("./routes/users.routes");
const fuelRoutes = require("./routes/fuel.routes");
const notificationRoutes = require("./routes/notifications.routes");
const adminRoutes = require("./routes/admin.routes");

const app = express();
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://unpkg.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://unpkg.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:", "https://lh3.googleusercontent.com", "https://*.tile.openstreetmap.org", "https://*.basemaps.cartocdn.com"],
        connectSrc: ["'self'", "https://nominatim.openstreetmap.org", "https://api.mapbox.com"],
      },
    },
  }),
);
app.use(
  cors({
    origin: env.FRONTEND_ORIGIN,
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));
app.get("/health", (_req, res) => res.json({ ok: true }));

app.use(express.static(path.join(__dirname, "..", "frontend")));
app.use("/api", rateLimit);

app.use("/api/auth", authRoutes);
app.use("/api/rides", ridesRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/fuel", fuelRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);

app.use(errorHandler);

app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`NRFSS backend running at http://localhost:${env.PORT}`);
});
