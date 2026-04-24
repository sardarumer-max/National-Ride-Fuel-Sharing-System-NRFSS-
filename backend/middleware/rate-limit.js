const redis = require("../utils/redis");
const { HttpError } = require("../utils/http");

const WINDOW_SECONDS = 60 * 15;
const LIMIT = 100;

const rateLimit = async (req, _res, next) => {
  try {
    const ip = req.ip || req.headers["x-forwarded-for"] || "unknown";
    const key = `rate-limit:${ip}`;
    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, WINDOW_SECONDS);
    }
    if (current > LIMIT) {
      return next(new HttpError(429, "Too many requests"));
    }
  } catch (_error) {
    // Fail open: keep app usable when Redis is unavailable.
  }
  return next();
};

module.exports = rateLimit;
