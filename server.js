const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

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
    `SELECT id, full_name, username, role, class_name 
     FROM users 
     WHERE username = ? AND password = ?`,
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

// Lấy danh sách học sinh
app.get("/api/students", (req, res) => {
  db.query(
    `SELECT id, full_name, username, class_name 
     FROM users 
     WHERE role = 'student'`,
    (err, results) => {
      if (err) return res.status(500).json({ message: "Lỗi lấy sinh viên" });

      res.json(results);
    }
  );
});

// Lấy điểm theo học sinh và học kỳ
app.get("/api/scores/:userId/:semester", (req, res) => {
  const { userId, semester } = req.params;

  db.query(
    `SELECT * FROM scores WHERE user_id = ? AND semester = ?`,
    [userId, semester],
    (err, results) => {
      if (err) return res.status(500).json({ message: "Lỗi lấy bảng điểm" });

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
    `UPDATE scores 
     SET attendance = ?, mid = ?, final = ? 
     WHERE id = ?`,
    [attendance, mid, final, id],
    (err) => {
      if (err) return res.status(500).json({ message: "Lỗi cập nhật điểm" });

      res.json({ message: "Đã cập nhật điểm" });
    }
  );
});

// Admin thêm tài khoản
app.post("/api/admin/create-user", (req, res) => {
  const { full_name, username, password, role, class_name } = req.body;

  if (!full_name || !username || !password || !role) {
    return res.status(400).json({ message: "Thiếu thông tin tài khoản" });
  }

  db.query(
    `INSERT INTO users (full_name, username, password, role, class_name)
     VALUES (?, ?, ?, ?, ?)`,
    [full_name, username, password, role, class_name || ""],
    (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Lỗi tạo tài khoản" });
      }

      res.json({ message: "Đã tạo tài khoản thành công" });
    }
  );
});

// Admin thêm môn/điểm cho học sinh
app.post("/api/admin/add-score", (req, res) => {
  const { user_id, semester, subject, credit, attendance, mid, final } = req.body;

  if (!user_id || !semester || !subject) {
    return res.status(400).json({ message: "Thiếu thông tin môn học" });
  }

  db.query(
    `INSERT INTO scores 
     (user_id, semester, subject, credit, attendance, mid, final)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      user_id,
      semester,
      subject,
      credit || 0,
      attendance || 0,
      mid || 0,
      final || 0
    ],
    (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Lỗi thêm môn/điểm" });
      }

      res.json({ message: "Đã thêm môn/điểm thành công" });
    }
  );
});

// Admin xoá môn/điểm
app.delete("/api/admin/delete-score/:id", (req, res) => {
  const { id } = req.params;

  db.query(
    `DELETE FROM scores WHERE id = ?`,
    [id],
    (err) => {
      if (err) return res.status(500).json({ message: "Lỗi xoá điểm" });

      res.json({ message: "Đã xoá điểm" });
    }
  );
});

app.listen(PORT, () => {
  console.log("Server đang chạy tại cổng " + PORT);
});
