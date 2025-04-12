require("dotenv").config();
const express = require("express");
const { syncDB } = require('./config/index');
const productRoutes = require("./routes/productRoutes");
const imageRoutes = require("./routes/imageRoutes");
const orderRoutes = require("./routes/orderRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes"); 
const cors = require("cors");

const app = express();
// ✅ Allow all origins (for development)
app.use(cors());

app.use(express.json());

// Serve uploaded files statically
app.use("/uploads", express.static("uploads"));

// Images Routes
app.use("/api", imageRoutes);

// Product Routes
app.use("/api", productRoutes);

// Order Routes
app.use("/api", orderRoutes);

// Dashboard Routes
app.use("/api", dashboardRoutes); 


// Sync DB & Start Server
const PORT = 5000;

syncDB().then(() => {
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
});
