require("dotenv").config();
const express = require("express");
const rateLimit = require("express-rate-limit");
const { syncDB } = require('./config/index');
const productRoutes = require("./routes/productRoutes");
const imageRoutes = require("./routes/imageRoutes");
const orderRoutes = require("./routes/orderRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes"); 
const categoryRoutes = require('./routes/categoryRoutes');
const accountsRoutes = require('./routes/accounts');
const transactionsRoutes = require('./routes/transactions');
const todoRoutes = require("./routes/todoRoutes");
const healthz = require("./controllers/healthz");
const startHealthzJob = require("./jobs/healthzJob");
const cors = require("cors");

const app = express();
const PORT = 5000;

// ✅ Allow all origins (for development)
app.use(cors());

// ✅ Log every incoming request (with IP and User-Agent)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] IP: ${req.ip} | ${req.method} ${req.originalUrl} | UA: ${req.headers['user-agent']}`);
  next();
});

// ✅ Apply rate limiter to all /api routes
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per minute
  handler: (req, res) => {
    console.warn(`⚠️ Too many requests from IP: ${req.ip} to ${req.originalUrl}`);
    res.status(429).json({ message: "Too Many Requests. Please slow down." });
  },
});
app.use("/api", apiLimiter);

// ✅ Parse JSON and URL-encoded bodies
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));

// ✅ Serve uploaded files statically
app.use("/uploads", express.static("uploads"));

// ✅ Mount all routes
app.use("/api", imageRoutes);
app.use("/api", productRoutes);
app.use("/api", orderRoutes);
app.use("/api", dashboardRoutes); 
app.use("/api/categories", categoryRoutes);
app.use('/api/accounts', accountsRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use("/api", todoRoutes);
app.use("/api",healthz);

// ✅ Start server after DB sync
syncDB().then(() => {
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
});

startHealthzJob();


