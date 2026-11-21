require("dotenv").config();
const app = require("./app");
const { checkDatabaseConnection } = require("./config/database");
const { ensureAuthTables } = require("./middleware/auth");

const port = Number(process.env.PORT || 5000);

app.listen(port, async () => {
  console.log(`Batloung Farm API listening on port ${port}`);
  const connected = await checkDatabaseConnection();
  if (connected) {
    try { await ensureAuthTables(); } catch (error) { console.error(`Authentication setup failed: ${error.message}`); }
  }
});
