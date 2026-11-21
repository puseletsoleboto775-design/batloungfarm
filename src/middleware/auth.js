const crypto = require("crypto");
const { pool } = require("../config/database");

const secret = () => { const value=process.env.JWT_SECRET; if (!value || value.length < 32) throw new Error("Set JWT_SECRET to at least 32 characters in backend/.env"); return value; };
const tokenFor = (user) => {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ sub: user.user_id, username: user.username, role: user.role, exp: Math.floor(Date.now()/1000)+60*60*12 })).toString("base64url");
  const signature = crypto.createHmac("sha256", secret()).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${signature}`;
};
const verify = (token) => {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) return null;
  const expected = crypto.createHmac("sha256", secret()).update(`${parts[0]}.${parts[1]}`).digest();
  let actual;
  try { actual = Buffer.from(parts[2], "base64url"); } catch { return null; }
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    if (!payload.exp || payload.exp < Math.floor(Date.now()/1000)) return null;
    return payload;
  } catch { return null; }
};
const hashPassword = (password, salt = crypto.randomBytes(16).toString("hex")) => {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
};
const checkPassword = (password, stored) => {
  const [salt, hash] = String(stored).split(":");
  if (!salt || !hash) return false;
  const actual = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
};
async function ensureAuthTables() {
  await pool.query(`CREATE TABLE IF NOT EXISTS users (
    user_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(80) NOT NULL UNIQUE,
    password_hash VARCHAR(200) NOT NULL,
    role ENUM('ADMIN','SALES') NOT NULL,
    active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  const [[{ total }]] = await pool.query("SELECT COUNT(*) AS total FROM users");
  if (Number(total) === 0) {
    const adminName = process.env.ADMIN_USERNAME || "admin";
    const adminPassword = process.env.ADMIN_PASSWORD;
    const salesName = process.env.SALES_USERNAME || "sales";
    const salesPassword = process.env.SALES_PASSWORD;
    if (!adminPassword || !salesPassword) {
      console.warn("No login users exist. Set ADMIN_PASSWORD and SALES_PASSWORD in backend/.env, then restart.");
      return;
    }
    await pool.execute("INSERT INTO users (username,password_hash,role) VALUES (?,?,?),(?,?,?)", [
      adminName, hashPassword(adminPassword), "ADMIN",
      salesName, hashPassword(salesPassword), "SALES"
    ]);
    console.log("Initial admin and sales accounts created from backend/.env");
  }
}
const requireAuth = (req, res, next) => {
  const header = req.headers.authorization || "";
  const payload = header.startsWith("Bearer ") ? verify(header.slice(7)) : null;
  if (!payload) return res.status(401).json({ success:false, message:"Please log in to continue." });
  req.user = payload;
  next();
};
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== "ADMIN") return res.status(403).json({ success:false, message:"Administrator access is required." });
  next();
};
module.exports = { tokenFor, hashPassword, checkPassword, ensureAuthTables, requireAuth, requireAdmin };
