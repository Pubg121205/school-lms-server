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
  database: "tdlsrhnuesite_hehe",
  charset: "utf8mb4"
});

db.connect(err => {
  if (err) {
    console.log("Lỗi MySQL:", err);
    return;
  }
  console.log("MySQL connected");
});

function calcTotal(x) {
  return (x.attendance * 0.1 + x.mid * 0.3 + x.final * 0.6).toFixed(2);
}

app.get("/", (req, res) => {
  res.send("School LMS API is running with MySQL + Gemini AI");
});

// LOGIN
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  db.query(
    "SELECT * FROM users WHERE username=? AND password=?",
    [username, password],
    (e, r) => {
      if (e) return res.status(500).json({ message: "Lỗi server" });
      if (!r.length) return res.status(401).json({ message: "Sai tài khoản hoặc mật khẩu" });
      res.json(r[0]);
    }
  );
});

// STUDENTS
app.get("/api/students", (req, res) => {
  db.query(
    "SELECT id, full_name, username, class_name FROM users WHERE role='student'",
    (e, r) => {
      if (e) return res.status(500).json({ message: "Lỗi lấy sinh viên" });
      res.json(r);
    }
  );
});

// SCORES
app.get("/api/scores/:uid/:sem", (req, res) => {
  db.query(
    "SELECT * FROM scores WHERE user_id=? AND semester=?",
    [req.params.uid, req.params.sem],
    (e, r) => {
      if (e) return res.status(500).json({ message: "Lỗi lấy bảng điểm" });

      res.json(r.map(x => ({
        ...x,
        total: calcTotal(x)
      })));
    }
  );
});

// UPDATE SCORE
app.put("/api/scores/:id", (req, res) => {
  const { attendance, mid, final } = req.body;

  db.query(
    "UPDATE scores SET attendance=?, mid=?, final=? WHERE id=?",
    [attendance, mid, final, req.params.id],
    (e) => {
      if (e) return res.status(500).json({ message: "Lỗi cập nhật điểm" });
      res.json({ message: "Đã lưu" });
    }
  );
});

// DELETE SCORE
app.delete("/api/scores/:id", (req, res) => {
  db.query(
    "DELETE FROM scores WHERE id=?",
    [req.params.id],
    (e) => {
      if (e) return res.status(500).json({ message: "Lỗi xoá điểm" });
      res.json({ message: "Đã xoá" });
    }
  );
});

// ADD USER
app.post("/api/admin/user", (req, res) => {
  const { full_name, username, password, class_name } = req.body;

  if (!full_name || !username || !password) {
    return res.status(400).json({ message: "Thiếu thông tin tài khoản" });
  }

  db.query(
    "INSERT INTO users (full_name, username, password, role, class_name) VALUES (?, ?, ?, 'student', ?)",
    [full_name, username, password, class_name || ""],
    (e) => {
      if (e) return res.status(500).json({ message: "Lỗi tạo user" });
      res.json({ message: "Đã tạo user" });
    }
  );
});

// AI ADVISOR - OLLAMA (FREE)
app.post("/api/ai-advisor", async (req, res) => {
  try {
    const { question, student } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({ message: "Bạn chưa nhập câu hỏi" });
    }

    const prompt = `
Bạn là cố vấn học tập AI trong hệ thống LMS.

Yêu cầu:
- Trả lời bằng tiếng Việt
- Ngắn gọn, dễ hiểu
- Đưa lời khuyên cụ thể
- Nếu có dữ liệu sinh viên thì phân tích

Thông tin sinh viên:
Tên: ${student?.full_name || "Không rõ"}
Lớp: ${student?.class_name || "Không rõ"}
Tài khoản: ${student?.username || "Không rõ"}

Câu hỏi:
${question}
`;

    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "qwen2.5:1.5b",
        prompt: prompt,
        stream: false
      })
    });

    const data = await response.json();

    res.json({
      answer: data.response || "AI không trả lời được."
    });

  } catch (error) {
    console.error("Ollama error:", error);
    res.status(500).json({
      message: "Không gọi được Ollama. Hãy kiểm tra Ollama đã chạy."
    });
  }
});
