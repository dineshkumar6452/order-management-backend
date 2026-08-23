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

// Wraps upload.single(fieldName) so a wrong file type or oversized file
// returns a clean 400 JSON response instead of an unhandled 500 - e.g. this
// is exactly what happens if a client sends the wrong Content-Type on the
// image part (application/octet-stream instead of image/*), which multer's
// fileFilter correctly rejects but Express would otherwise turn into a
// generic, unhelpful 500 error.
function singleImageUpload(fieldName) {
  const middleware = upload.single(fieldName);
  return (req, res, next) => {
    middleware(req, res, (err) => {
      if (err) {
        console.error(`❌ [upload] ${err.message}`);
        return res.status(400).json({ success: false, message: err.message });
      }
      next();
    });
  };
}

module.exports = upload;
module.exports.singleImageUpload = singleImageUpload;
