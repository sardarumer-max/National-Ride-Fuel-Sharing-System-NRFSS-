const { verifyAccessToken } = require("../utils/tokens");
const { HttpError } = require("../utils/http");

const requireAuth = (req, _res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return next(new HttpError(401, "Missing access token"));

  try {
    req.user = verifyAccessToken(token);
    return next();
  } catch (_error) {
    return next(new HttpError(401, "Invalid or expired access token"));
  }
};

const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new HttpError(403, "Forbidden"));
  }
  return next();
};

module.exports = { requireAuth, requireRole };
