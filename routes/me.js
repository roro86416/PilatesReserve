// /routes/me.js
import express from "express";
import db from "../utils/connect-mysql.js";
import moment from "moment-timezone";

const router = express.Router();

function requireMember(req, res, next) {
  if (!req.session?.member) return res.redirect("/login");
  next();
}
// 個人資料頁
router.get("/me", requireMember, async (req, res) => {
  const mid = req.session.member.id;
  let page = parseInt(req.query.page) || 1;
  const perPage = 20; // 每一頁最多有幾筆
  const t_sql = "SELECT COUNT(1) totalRows FROM `classes`";
  const [[{ totalRows }]] = await db.query(t_sql); // 多層的解構 destruct
  const totalPages = Math.ceil(totalRows / perPage); // 總頁數

  // 找出這個會員的預約紀錄
  const sql = `SELECT classes.*, coaches.name 'coach_name', members.name 'member_name'
  FROM classes join coaches on classes.coach_id = coaches.id join members on classes.member_id = members.id
      ORDER BY id DESC LIMIT ${(page - 1) * perPage}, ${perPage}`;
  const [rows] = await db.query(sql, [mid]);

  //轉換日期格式;
  rows.forEach((r) => {
    const m = moment(r.date);
    if (m.isValid()) {
      r.date = m.format("YYYY-MM-DD");
    } else {
      r.date = "";
    }
  });

  res.render("me", {
    me: req.session.member,
    bookings: totalRows,
    totalPages,
    page,
    rows,
    perPage,
  });
});
//更改
// 編輯頁（GET）
router.get("/me/bookings/edit/:id", requireMember, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.redirect("/me");
  const [rows] = await db.query(
    `SELECT id, coach_id, member_id, date, DATE_FORMAT(start_time,'%H:%i') AS start_time, status
     FROM classes WHERE id=? AND member_id=?`,
    [id, req.session.member.id]
  );
  if (!rows.length) return res.redirect("/me");
  // 簡單取得教練清單供下拉
  const [coaches] = await db.query("SELECT id, name FROM coaches ORDER BY id");
  res.render("edit", { me: req.session.member, r: rows[0], coaches });
});

// 編輯提交（POST）
router.post("/me/bookings/edit/:id", requireMember, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { date, start_time, coach_id } = req.body || {};
  if (!id || !date || !start_time || !coach_id)
    return res.redirect(`/me/bookings/edit/${id}`);
  try {
    await db.query(
      "UPDATE classes SET date=?, start_time=?, coach_id=?, updated_at=NOW() WHERE id=? AND member_id=?",
      [date, `${start_time}:00`, +coach_id, id, req.session.member.id]
    );
    res.redirect("/me");
  } catch (e) {
    // 撞到唯一鍵（同教練同日同時段）
    res.redirect(`/me/bookings/edit/${id}`);
  }
});

//刪除
router.get("/me/bookings/delete/:id", requireMember, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.redirect("/me");
  await db.query("DELETE FROM classes WHERE id=? AND member_id=?", [
    id,
    req.session.member.id,
  ]);
  const back = req.get("referer") || "/me";
  res.redirect(back);
});

export default router;
