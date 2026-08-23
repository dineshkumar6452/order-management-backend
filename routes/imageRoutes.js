const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const { uploadProductImageToR2 } = require("../utils/r2Storage");

// POST /api/upload  (multipart/form-data)
// Fields: image (file, required), productName, productCode (both optional
// but recommended - they determine the R2 object key: <name>/<code>/image.webp)
router.post("/upload", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const imageUrl = await uploadProductImageToR2({
      buffer: req.file.buffer,
      productName: req.body.productName,
      productCode: req.body.productCode,
    });

    res.status(200).json({
      success: true,
      message: "File uploaded successfully",
      imageUrl,
    });
  } catch (error) {
    console.error("❌ Error in file upload:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
