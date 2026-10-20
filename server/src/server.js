
require("dotenv").config();

const app = require("./app");
const { pool } = require("./config/database");

const PORT = process.env.PORT || 4000;

async function startServer() {
  try {
    await pool.query("SELECT 1");

    app.listen(PORT, () => {
      console.log(`ResolveIQ running on port ${PORT}`);
      console.log("PostgreSQL connection successful");
    });
  } catch (error) {
    console.error("Unable to connect to PostgreSQL:", error.message);
    process.exit(1);
  }
}

startServer();
