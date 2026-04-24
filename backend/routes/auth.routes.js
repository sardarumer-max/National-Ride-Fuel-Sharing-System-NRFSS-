const express = require("express");
const { register, login, refresh } = require("../controllers/auth.controller");
const asyncHandler = require("../middleware/async-handler");

const router = express.Router();
router.post("/register", asyncHandler(register));
router.post("/login", asyncHandler(login));
router.post("/refresh", asyncHandler(refresh));

module.exports = router;
