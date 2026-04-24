const express = require("express");
const { getUser, updateUser, getDashboard } = require("../controllers/users.controller");
const { requireAuth } = require("../middleware/auth");
const asyncHandler = require("../middleware/async-handler");

const router = express.Router();
router.get("/:id/dashboard", requireAuth, asyncHandler(getDashboard));
router.get("/:id", requireAuth, asyncHandler(getUser));
router.patch("/:id", requireAuth, asyncHandler(updateUser));

module.exports = router;
