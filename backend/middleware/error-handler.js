const { ZodError } = require("zod");

const errorHandler = (err, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error(err);
  if (err instanceof ZodError) {
    return res.status(400).json({ message: "Validation error", errors: err.issues });
  }

  const statusCode = err.statusCode || 500;
  return res.status(statusCode).json({
    message: err.message || "Internal server error",
  });
};

module.exports = errorHandler;
