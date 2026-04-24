const express = require("express");
const { postRide, matchRides, requestRide, updateRideRequest } = require("../controllers/rides.controller");
const { requireAuth } = require("../middleware/auth");
const asyncHandler = require("../middleware/async-handler");

const router = express.Router();
router.get("/match", requireAuth, asyncHandler(matchRides));
router.post("/post", requireAuth, asyncHandler(postRide));
router.post("/:id/request", requireAuth, asyncHandler(requestRide));
router.patch("/request/:id", requireAuth, asyncHandler(updateRideRequest));

module.exports = router;
