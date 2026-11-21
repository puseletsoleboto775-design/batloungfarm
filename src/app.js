require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const supplierRoutes = require("./routes/supplierRoutes");
const fruitRoutes = require("./routes/fruitRoutes");
const vendorRoutes = require("./routes/vendorRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const authRoutes = require("./routes/authRoutes");
const { requireAuth, requireAdmin } = require("./middleware/auth");
const { pool } = require("./config/database");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();


const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(helmet());
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ success: true, service: "Batloung Farm API", database: "connected" });
  } catch (error) {
    res.status(503).json({
      success: false,
      service: "Batloung Farm API",
      database: "unavailable",
      message: error.message,
    });
  }
});
app.use("/api/auth", authRoutes);
app.use("/api/suppliers", requireAuth, requireAdmin, supplierRoutes);
app.use("/api/fruits", requireAuth, fruitRoutes);
app.use("/api/vendors", requireAuth, vendorRoutes);
app.use("/api", requireAuth, transactionRoutes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
