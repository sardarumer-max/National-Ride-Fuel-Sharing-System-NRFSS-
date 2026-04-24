const express = require("express");
const { verifyUser, getStats } = require("../controllers/admin.controller");
const { requireAuth, requireRole } = require("../middleware/auth");
const asyncHandler = require("../middleware/async-handler");

const router = express.Router();
router.post("/verify/:userId", requireAuth, requireRole("admin"), asyncHandler(verifyUser));
router.get("/stats", requireAuth, requireRole("admin"), asyncHandler(getStats));

module.exports = router;
