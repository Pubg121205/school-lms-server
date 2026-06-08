const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 🔥 THAY THÔNG TIN CỦA BẠN Ở ĐÂY
const db = mysql.createConnection({
  host: "IP_HOSTING", // ví dụ: 103.xxx.xxx.xxx
  user: "tdlsrhnuestie_lms_user",
  password: "MAT_KHAU_DB",
  database: "tdlsrhnuestie_school_lms",
});

db.connect((err) => {
  if (err) {
    console.error("❌ Lỗi kết nối MySQL:", err);
    return;
  }
  console.log("✅ Kết nối MySQL thành công");
});

// LOGIN
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  db.query(
    "SELECT id, full_name, username, role, class_name FROM users WHERE username=? AND password=?",
    [username, password],
    (err, results) => {
      if (err) return res.status(500).json({ message: "Lỗi server" });

      if (results.length === 0) {
        return res.status(401).json({ message: "Sai tài khoản hoặc mật khẩu" });
      }

      res.json(results[0]);
    }
  );
});

// LẤY DANH SÁCH SINH VIÊN
app.get("/api/students", (req, res) => {
  db.query(
    "SELECT id, full_name, username, class_name FROM users WHERE role='student'",
    (err, results) => {
      if (err) return res.status(500).json({ message: "Lỗi" });
      res.json(results);
    }
  );
});

app.listen(PORT, () => {
  console.log("Server chạy tại cổng", PORT);
});
