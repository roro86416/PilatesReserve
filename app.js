import express from "express";
import "dotenv/config";
import cookieParser from "cookie-parser";
import session from "express-session";
import reserveRouter from "./routes/reserve.js";
import authRouter from "./routes/auth.js";
import meRouter from "./routes/me.js";

// 建立 app
const app = express();

// 解析器與 cookie、session
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  session({
    saveUninitialized: false,
    resave: false,
    secret: "1234567890",
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 },
  })
);

// 把 session 丟進所有 EJS
app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

// 靜態與路由
app.use(express.static("public"));
app.use(authRouter);
app.use("/reserve", reserveRouter);
app.use(meRouter); // 只掛一次

// 視圖與頁面
app.set("view engine", "ejs");
app.set("views", "./views");

// 健康檢查 + 檢視 session
app.get("/__ping", (req, res) => res.json({ ok: true }));
app.get("/whoami", (req, res) => res.json({ session: req.session || null }));

// 頁面路由
app.get("/", (req, res) => res.render("index"));
app.get("/login", (req, res) => res.render("login"));
app.get("/classes", (req, res) => res.render("classes"));
app.get("/booking", (req, res) => res.render("booking"));
app.get("/me", requireMember, (req, res) => {
  res.render("me", { me: req.session.member });
});

// 404
app.use((req, res) => res.status(404).send("<h1>你走錯路了</h1>"));

function requireMember(req, res, next) {
  if (!req.session?.member) return res.redirect("/login");
  next();
}

// 監聽
const port = process.env.WEB_PORT || 3000;
app.listen(port, () => console.log("listening on", port));
