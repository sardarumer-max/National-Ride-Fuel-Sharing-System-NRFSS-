const express = require("express");
const { getNotifications } = require("../controllers/notifications.controller");
const { requireAuth } = require("../middleware/auth");
const asyncHandler = require("../middleware/async-handler");

const router = express.Router();
router.get("/", requireAuth, asyncHandler(getNotifications));

module.exports = router;
