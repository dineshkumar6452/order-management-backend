const multer = require("multer");

// Images are now compressed + converted to WebP and uploaded straight to
// Cloudflare R2, so we keep them in memory (as a Buffer) rather than
// writing to local disk first.
const storage = multer.memoryStorage();

// File type validation
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG, PNG, and WEBP files are allowed!"), false);
  }
};

// Upload middleware. 15MB ceiling on the *original* file before compression
// (the compressed WebP that actually gets stored will be far smaller).
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 15 * 1024 * 1024 },
});

module.exports = upload;
