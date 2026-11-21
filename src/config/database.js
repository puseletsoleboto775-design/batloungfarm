const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "batloung_farm",
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  queueLimit: 0,
  decimalNumbers: true,
  // Return DATE/DATETIME columns as plain strings. Otherwise mysql2 builds JS Dates in the
  // server's time zone and JSON turns them into UTC, which shifts DATE values back a day.
  dateStrings: true,
});

async function checkDatabaseConnection() {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    console.log("MySQL connection established");
    return true;
  } catch (error) {
    // The API stays alive so /api/health can report the failure clearly.
    console.error(`MySQL unavailable: ${error.message}`);
    return false;
  }
}

module.exports = { pool, checkDatabaseConnection };
