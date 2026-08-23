const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const sharp = require("sharp");

const MAX_BYTES = 100 * 1024; // 100 KB cap requested for product images

let s3Client = null;
let s3ClientKey = null; // Tracks which credentials the cached client was built with

function getClient() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "Cloudflare R2 is not configured (missing R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY)."
    );
  }

  const currentKey = `${accountId}:${accessKeyId}`;
  if (s3Client && s3ClientKey === currentKey) return s3Client;

  s3Client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  s3ClientKey = currentKey;
  return s3Client;
}

/**
 * Turns "Amul  Butter 500g!!" into "amul-butter-500g" - safe for use as an
 * R2 object key path segment. Falls back to a provided default if the
 * input is empty/blank after sanitizing (e.g. product name wasn't typed
 * yet when the image was picked).
 */
function slugify(value, fallback) {
  const slug = String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || fallback;
}

/**
 * Compresses an image buffer to WebP, iteratively lowering quality and (if
 * that alone isn't enough) shrinking dimensions, until the result is at or
 * under maxBytes. Always returns the smallest buffer it managed to produce
 * even if that's still over the cap (an extremely busy/detailed source
 * image may not get there without becoming unusable) - callers get a
 * console warning in that case rather than a hard failure.
 */
async function compressToWebp(inputBuffer, maxBytes = MAX_BYTES) {
  const qualitySteps = [80, 70, 60, 50, 40, 30, 20];
  const resizeWidths = [null, 1600, 1200, 900, 600, 400]; // null = original size first

  let best = null;

  for (const width of resizeWidths) {
    for (const quality of qualitySteps) {
      let pipeline = sharp(inputBuffer).rotate(); // auto-orient from EXIF
      if (width) {
        pipeline = pipeline.resize({ width, withoutEnlargement: true });
      }

      const buffer = await pipeline.webp({ quality }).toBuffer();

      if (!best || buffer.length < best.length) {
        best = buffer;
      }
      if (buffer.length <= maxBytes) {
        return buffer;
      }
    }
  }

  console.warn(
    `⚠️ [r2Storage] Could not compress image under ${maxBytes} bytes; using smallest achieved (${best ? best.length : 0} bytes).`
  );
  return best;
}

/**
 * Compresses the given image buffer to WebP (<=100KB where achievable) and
 * uploads it to Cloudflare R2 at:
 *   <productName>/<productCode>/image.webp
 *
 * @param {Object} opts
 * @param {Buffer} opts.buffer - Raw image bytes (jpeg/png/webp/etc.).
 * @param {string} [opts.productName]
 * @param {string} [opts.productCode] - Typically the barcode.
 * @returns {Promise<string>} The public URL of the uploaded image.
 */
async function uploadProductImageToR2({ buffer, productName, productCode }) {
  const bucketName = process.env.R2_BUCKET_NAME;
  const publicUrl = (process.env.R2_PUBLIC_URL || "").replace(/\/+$/, "");

  if (!bucketName) {
    throw new Error("Cloudflare R2 is not configured (missing R2_BUCKET_NAME).");
  }
  if (!publicUrl) {
    throw new Error("Cloudflare R2 is not configured (missing R2_PUBLIC_URL).");
  }
  if (!buffer || buffer.length === 0) {
    throw new Error("No image data received to upload.");
  }

  const nameSlug = slugify(productName, "unknown-product");
  const codeSlug = slugify(productCode, `code-${Date.now()}`);
  const key = `${nameSlug}/${codeSlug}/image.webp`;

  const webpBuffer = await compressToWebp(buffer);

  const client = getClient();
  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: webpBuffer,
      ContentType: "image/webp",
      // NOTE: since the key is deterministic (name+code), re-uploading a
      // new image for the same product overwrites this same key. If you
      // ever see a stale cached image after replacing one, that's a CDN/
      // browser cache issue, not a storage one - consider a shorter
      // max-age or a cache-busting query param if that becomes a problem.
      CacheControl: "public, max-age=86400",
    })
  );

  return `${publicUrl}/${key}`;
}

module.exports = { uploadProductImageToR2, compressToWebp, slugify };
