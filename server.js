const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const db = new sqlite3.Database("./database.db");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT,
      username TEXT UNIQUE,
      password TEXT,
      role TEXT,
      class_name TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      semester INTEGER,
      subject TEXT,
      credit INTEGER,
      attendance REAL,
      mid REAL,
      final REAL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  db.get("SELECT COUNT(*) AS count FROM users", (err, row) => {
    if (row.count === 0) {
      seedDatabase();
    }
  });
});

function seedDatabase() {
  db.run(`
    INSERT INTO users (id, full_name, username, password, role, class_name)
    VALUES 
    (1, 'Lê Tú Anh', '735114004', 'toibingu', 'student', 'K73 KT&CN'),
    (2, 'Nguyễn Ngọc Ánh', '735114014', 'toibingu', 'student', 'K73 KT&CN'),
    (3, 'Sơn', 'admin', 'admin', 'admin', 'Phòng đào tạo')
  `);

  const subjects = [
    ["Toán cao cấp", 3],
    ["Tin học cơ sở", 3],
    ["Tiếng Anh", 2],
    ["Giáo dục thể chất", 1],
  ];

  for (let userId = 1; userId <= 2; userId++) {
    for (let semester = 1; semester <= 12; semester++) {
      subjects.forEach((s, index) => {
        db.run(
          `
          INSERT INTO scores 
          (user_id, semester, subject, credit, attendance, mid, final)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          `,
          [userId, semester, s[0], s[1], 8 + (index % 2), 7 + (index % 3), 8],
        );
      });
    }
  }
}

function calcTotal(score) {
  return Number(
    score.attendance * 0.1 + score.mid * 0.3 + score.final * 0.6,
  ).toFixed(2);
}

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  db.get(
    "SELECT id, full_name, username, role, class_name FROM users WHERE username = ? AND password = ?",
    [username, password],
    (err, user) => {
      if (err) return res.status(500).json({ message: "Lỗi server" });
      if (!user)
        return res.status(401).json({ message: "Sai tài khoản hoặc mật khẩu" });

      res.json(user);
    },
  );
});

app.get("/api/students", (req, res) => {
  db.all(
    "SELECT id, full_name, username, class_name FROM users WHERE role = 'student'",
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ message: "Lỗi lấy sinh viên" });
      res.json(rows);
    },
  );
});

app.get("/api/scores/:userId/:semester", (req, res) => {
  const { userId, semester } = req.params;

  db.all(
    "SELECT * FROM scores WHERE user_id = ? AND semester = ?",
    [userId, semester],
    (err, rows) => {
      if (err) return res.status(500).json({ message: "Lỗi lấy bảng điểm" });

      const result = rows.map((item) => ({
        ...item,
        total: calcTotal(item),
      }));

      res.json(result);
    },
  );
});

app.put("/api/scores/:id", (req, res) => {
  const { id } = req.params;
  const { attendance, mid, final } = req.body;

  db.run(
    `
    UPDATE scores
    SET attendance = ?, mid = ?, final = ?
    WHERE id = ?
    `,
    [attendance, mid, final, id],
    function (err) {
      if (err) return res.status(500).json({ message: "Lỗi cập nhật điểm" });

      res.json({ message: "Đã cập nhật điểm" });
    },
  );
});

app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
