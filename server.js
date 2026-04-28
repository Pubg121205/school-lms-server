const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const OpenAI = require("openai");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

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
  res.send("School LMS API is running with MySQL + AI");
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

// ADD SUBJECT / SCORE
app.post("/api/admin/score", (req, res) => {
  const {
    user_id,
    semester,
    subject,
    credit,
    attendance,
    mid,
    final
  } = req.body;

  if (!user_id || !semester || !subject) {
    return res.status(400).json({ message: "Thiếu thông tin môn học" });
  }

  db.query(
    "INSERT INTO scores (user_id, semester, subject, credit, attendance, mid, final) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [
      user_id,
      semester,
      subject,
      credit || 0,
      attendance || 0,
      mid || 0,
      final || 0
    ],
    (e) => {
      if (e) return res.status(500).json({ message: "Lỗi thêm môn" });
      res.json({ message: "Đã thêm môn" });
    }
  );
});

// AI ADVISOR
app.post("/api/ai-advisor", async (req, res) => {
  try {
    const { question, student } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({ message: "Bạn chưa nhập câu hỏi" });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ message: "Chưa cấu hình OPENAI_API_KEY trên Render" });
    }

    const response = await openai.responses.create({
      model: "gpt-5.2-mini",
      instructions: `
Bạn là cố vấn học tập AI trong hệ thống LMS của trường học.
Trả lời bằng tiếng Việt, ngắn gọn, dễ hiểu, phù hợp với sinh viên.

Phạm vi trả lời:
- học tập
- điểm số
- học kỳ
- môn học
- quy chế đào tạo
- đăng ký học phần
- thi cử
- phúc khảo
- học bổng
- định hướng học tập
- thắc mắc trong trường học

Nếu câu hỏi ngoài phạm vi trường học, hãy từ chối nhẹ nhàng và hướng sinh viên quay lại chủ đề học tập.
Không bịa quy định cụ thể nếu chưa có dữ liệu chính thức; hãy nói sinh viên liên hệ phòng đào tạo/cố vấn học tập khi cần xác minh.
      `,
      input: `
Thông tin sinh viên:
Tên: ${student?.full_name || "Không rõ"}
Lớp: ${student?.class_name || "Không rõ"}
Tài khoản: ${student?.username || "Không rõ"}

Câu hỏi:
${question}
      `
    });

    res.json({
      answer: response.output_text
    });
  } catch (error) {
    console.error("AI error:", error);
    res.status(500).json({
      message: "AI đang lỗi, hết quota, sai API key hoặc server chưa cấu hình đúng"
    });
  }
});

app.listen(PORT, () => console.log("Server OK"));
