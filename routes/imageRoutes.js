const express = require("express");
const router = express.Router();
const upload = require('../middleware/upload');

router.post("/upload", upload.single("image"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const filePath = `${process.env.LOCALHOST/req.file.filename}`;

    res.status(200).json({
      success: true,
      message: "File uploaded successfully",
      filePath: filePath,
    });
  } catch (error) {
    console.error("❌ Error in file upload:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
