const express = require("express");
const router = express.Router();
const { initiateMpesa, getPaymentStatus, mpesaCallback } = require("../controllers/paymentController");
router.post("/mpesa", initiateMpesa);
router.get("/status/:checkoutId", getPaymentStatus);
router.post("/callback", mpesaCallback);
module.exports = router;