import express from "express";
import db from "../utils/connect-mysql.js";
import moment from "moment-timezone";
import { buildSlots } from "../utils/time.js";

const router = express.Router();

// 預約列表頁的內容
router.get("/", async (req, res) => {
  let page = parseInt(req.query.page) || 1;
  const perPage = 20; // 每一頁最多有幾筆
  const t_sql = "SELECT COUNT(1) totalRows FROM `classes`";
  const [[{ totalRows }]] = await db.query(t_sql); // 多層的解構 destruct
  const totalPages = Math.ceil(totalRows / perPage); // 總頁數

  const sql = `SELECT classes.*, coaches.name 'coach_name', members.name 'member_name'
  FROM classes join coaches on classes.coach_id = coaches.id join members on classes.member_id = members.id
      ORDER BY id DESC LIMIT ${(page - 1) * perPage}, ${perPage}`;
  const [rows] = await db.query(sql);

  //轉換日期格式
  rows.forEach((r) => {
    const m = moment(r.date);
    if (m.isValid()) {
      r.date = m.format("YYYY-MM-DD");
    } else {
      r.date = "";
    }
  });
  res.render("classes", { totalRows, totalPages, page, rows, perPage });
});

// 建立預約
// body: { coach_id, member_id, date: 'YYYY-MM-DD', start_time: 'HH:mm' }
router.post("/", async (req, res) => {
  try {
    const { coach_id, member_id, date, start_time } = req.body;

    if (!coach_id || !member_id || !date || !start_time) {
      return res.status(400).json({ error: "缺少必要欄位" });
    }

    // 確認這個時段是否已被預約
    const [exist] = await db.query(
      "SELECT id FROM classes WHERE coach_id=? AND date=? AND start_time=? AND status <> 'cancelled'",
      [coach_id, date, `${start_time}:00`]
    );
    if (exist.length > 0) {
      return res.status(409).json({ error: "該時段已被預約" });
    }

    // 建立新預約
    await db.query(
      `INSERT INTO classes (coach_id, member_id, date, start_time, created_at, updated_at, status)
       VALUES (?, ?, ?, ?, NOW(), NOW(), 'pending')`,
      [coach_id, member_id, date, `${start_time}:00`]
    );

    res.status(201).json({ message: "預約成功" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// 取得某日期的可預約時段
// GET /reserve/booking?date=YYYY-MM-DD&coach_id=1
router.get("/booking", async (req, res) => {
  const { date, coach_id } = req.query;
  try {
    const start = process.env.WORK_START || "09:00";
    const end = process.env.WORK_END || "21:00";
    const step = parseInt(process.env.SLOT_MINUTES || "60", 10);
    const allSlots = buildSlots(start, end, step);

    const [rows] = await db.query(
      "SELECT id, start_time, status FROM classes WHERE date=? AND coach_id=? AND status<> 'cancelled'",
      [date, coach_id]
    );

    const booked = new Map(
      rows.map((r) => [
        r.start_time.slice(0, 5),
        { id: r.id, status: r.status },
      ])
    );

    const slots = allSlots.map((t) =>
      booked.has(t)
        ? { time: t, available: false, class_id: booked.get(t).id }
        : { time: t, available: true }
    );

    res.json({ date, coach_id, slots });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server_error" });
  }
});

//取消預約 API
router.patch("/:id/cancel", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0)
    return res.status(400).json({ error: "bad_id" });
  const [r] = await db.query(
    "UPDATE classes SET status='cancelled', updated_at=NOW() WHERE id=?",
    [id]
  );
  if (r.affectedRows === 0) return res.status(404).json({ error: "not_found" });
  res.json({ message: "cancelled" });
});

export default router;
