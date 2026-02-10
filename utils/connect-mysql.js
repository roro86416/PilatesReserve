import mysql from "mysql2/promise";

const { DB_HOST, DB_USER, DB_PASS, DB_NAME, DB_PORT } = process.env;
console.log({ DB_HOST, DB_USER, DB_PASS, DB_NAME, DB_PORT });

const pool = mysql.createPool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASS,
  database: DB_NAME,
  port: parseInt(DB_PORT) || 3306,

  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,

  charset: "utf8mb4",
});

pool.on("connection", (c) => {
  console.log(`新的資料庫連線建⽴ ID: ${c.threadId}`);
});

pool.on("error", (err) => {
  console.error("❌ 資料庫連線池錯誤:", err);
  if (err.code === "PROTOCOL_CONNECTION_LOST") {
    console.log("資料庫連線中斷，嘗試重新連線...");
  } else if (err.code === "ER_CON_COUNT_ERROR") {
    console.log("資料庫連線數過多");
  } else if (err.code === "ECONNREFUSED") {
    console.log("資料庫連線被拒絕");
  }
});

try {
  const connection = await pool.getConnection();
  console.log("🎯 資料庫連線測試成功");
  // 檢查資料庫版本
  const [rows] = await connection.execute("SELECT VERSION() as version");
  console.log(`📊 MySQL 版本: ${rows[0].version}`);
  connection.release(); // 釋放連線
} catch (error) {
  console.log({ DB_HOST, DB_USER, DB_PASS, DB_NAME, DB_PORT });
  console.error("❌ 資料庫連線測試失敗:", error.message);
}

export default pool;
