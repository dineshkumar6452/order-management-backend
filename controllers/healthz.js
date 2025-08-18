const express = require("express");
const router = express.Router();

// Health check endpoint
router.get("/healthz", (req, res) => {
  res.status(200).json({ status: "ok", time: new Date() });
});

module.exports = router;