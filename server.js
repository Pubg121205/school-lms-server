const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// THAY THÔNG TIN DATABASE CỦA BẠN Ở ĐÂY
const db = mysql.createConnection({
  host: "ns95.dailysieure.com",
  user: "tdlsrhnuesite_hehe",
  password: "@Binquynh76",
  database: "tdlsrhnuesite_hehe"
});

db.connect((err) => {
  if (err) {
    console.error("Lỗi kết nối MySQL:", err);
    return;
  }
  console.log("Đã kết nối MySQL thành công");
});

function calcTotal(item) {
  return Number(
    item.attendance * 0.1 +
    item.mid * 0.3 +
    item.final * 0.6
  ).toFixed(2);
}

app.get("/", (req, res) => {
  res.send("School LMS API is running with MySQL");
});

// Đăng nhập
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  db.query(
    `
    SELECT id, full_name, username, role, class_name
    FROM users
    WHERE username = ? AND password = ?
    `,
    [username, password],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Lỗi server" });
      }

      if (results.length === 0) {
        return res.status(401).json({ message: "Sai tài khoản hoặc mật khẩu" });
      }

      res.json(results[0]);
    }
  );
});

// Lấy danh sách học sinh
app.get("/api/students", (req, res) => {
  db.query(
    `
    SELECT id, full_name, username, class_name
    FROM users
    WHERE role = 'student'
    `,
    (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Lỗi lấy sinh viên" });
      }

      res.json(results);
    }
  );
});

// Lấy điểm theo học sinh và học kỳ
app.get("/api/scores/:userId/:semester", (req, res) => {
  const { userId, semester } = req.params;

  db.query(
    `
    SELECT *
    FROM scores
    WHERE user_id = ? AND semester = ?
    `,
    [userId, semester],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Lỗi lấy bảng điểm" });
      }

      const data = results.map((item) => ({
        ...item,
        total: calcTotal(item)
      }));

      res.json(data);
    }
  );
});

// Admin sửa điểm
app.put("/api/scores/:id", (req, res) => {
  const { id } = req.params;
  const { attendance, mid, final } = req.body;

  db.query(
    `
    UPDATE scores
    SET attendance = ?, mid = ?, final = ?
    WHERE id = ?
    `,
    [attendance, mid, final, id],
    (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Lỗi cập nhật điểm" });
      }

      res.json({ message: "Đã cập nhật điểm" });
    }
  );
});

app.listen(PORT, () => {
  console.log("Server đang chạy tại cổng " + PORT);
});
