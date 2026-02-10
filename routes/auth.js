import express from "express";
import db from "../utils/connect-mysql.js";
const router = express.Router();

// 顯示登入頁
router.get("/login", (req, res) => {
  res.render("login");
});

// 提交登入，成功→回首頁
router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password)
    return res.status(400).render("login", { error: "請輸入帳密" });

  const [rows] = await db.query(
    "SELECT id,name FROM members WHERE email=? AND password=?",
    [email, password]
  );
  if (!rows.length)
    return res.status(401).render("login", { error: "帳密錯誤" });

  req.session.member = rows[0]; // 記住登入者
  res.redirect("/"); // 回首頁
});

// 登出
router.post("/logout", (req, res) =>
  req.session.destroy(() => res.redirect("/"))
);
export default router;
