require("dotenv").config();
const express = require("express");
const rateLimit = require("express-rate-limit");
const cors = require("cors");
const { syncDB } = require('./config/index');

// Routes
const productRoutes = require("./routes/productRoutes");
const imageRoutes = require("./routes/imageRoutes");
const orderRoutes = require("./routes/orderRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const categoryRoutes = require('./routes/categoryRoutes');

const app = express();
const PORT = 5000;

// ✅ Trust proxy to correctly handle X-Forwarded-For headers
app.set("trust proxy", true);

// ✅ Enable CORS (allow all origins for dev)
app.use(cors());

// ✅ Request Logging with real client IP
app.use((req, res, next) => {
  const clientIP = req.headers['x-forwarded-for'] || req.ip;
  console.log(`[${new Date().toISOString()}] IP: ${clientIP} | ${req.method} ${req.originalUrl} | UA: ${req.headers['user-agent']}`);
  next();
});

// ✅ Global Rate Limiting for /api routes
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per minute
  handler: (req, res) => {
    console.warn(`⚠️ Too many requests from IP: ${req.ip} to ${req.originalUrl}`);
    res.status(429).json({ message: "Too Many Requests. Please slow down." });
  },
});
app.use("/api", apiLimiter);

// ✅ Body Parsers
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));

// ✅ Serve static files from /uploads
app.use("/uploads", express.static("uploads"));

// ✅ Mount Routes
app.use("/api", imageRoutes);
app.use("/api", productRoutes);
app.use("/api", orderRoutes);
app.use("/api", dashboardRoutes);
app.use("/api/categories", categoryRoutes);

// ✅ Health check route
app.get("/health", (req, res) => res.send("OK"));

// ✅ Start server after DB is ready
syncDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
});
