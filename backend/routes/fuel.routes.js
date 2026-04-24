const express = require("express");
const { calculateFuel } = require("../controllers/fuel.controller");
const { requireAuth } = require("../middleware/auth");
const asyncHandler = require("../middleware/async-handler");

const router = express.Router();
router.get("/calculate", requireAuth, asyncHandler(calculateFuel));

module.exports = router;
