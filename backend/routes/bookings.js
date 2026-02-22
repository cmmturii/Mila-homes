const express = require("express");
const router = express.Router();
const { createBooking, getBooking } = require("../controllers/bookingsController");
router.post("/", createBooking);
router.get("/:id", getBooking);
module.exports = router;