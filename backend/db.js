const Pool = require("pg").Pool;

const pool = new Pool({
  user: "postgres",
  host: "db",
  database: "db",
  password: "postgres",
  port: 5432,
});

module.exports = pool;
