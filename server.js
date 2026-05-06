const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ================= MYSQL =================
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

// ================= TÍNH ĐIỂM =================
function calcTotal(x) {
  const attendance = Number(x.attendance) || 0;
  const mid = Number(x.mid) || 0;
  const final = Number(x.final) || 0;

  return Number((attendance * 0.1 + mid * 0.3 + final * 0.6).toFixed(2));
}

// ================= NHẬN DIỆN CÂU HỎI =================
function isScoreQuestion(q) {
  const keywords = [
    "điểm","môn","học lực","gpa","trung bình",
    "yếu","kém","giỏi","học bổng","trượt",
    "thi lại","qua môn","cải thiện","nâng điểm","kết quả"
  ];
  return keywords.some(k => q.includes(k));
}

// ================= AI TRẢ LỜI CHUNG =================
function answerGeneral(question, student) {
  const q = question.toLowerCase();
  let answer = `Chào ${student?.full_name || "em"}, AI trả lời câu hỏi của em:\n\n`;

  if (q.includes("cách học") || q.includes("học như nào")) {
    answer += `Để học hiệu quả:\n- Học mỗi ngày 30-60 phút/môn\n- Học theo chương\n- Làm bài tập sau lý thuyết\n- Ôn lại sau 1-2 ngày\n`;
  }

  else if (q.includes("ôn thi")) {
    answer += `Cách ôn thi hiệu quả:\n- Ôn theo đề cương\n- Làm đề cũ\n- Ghi lỗi sai\n`;
  }

  else if (q.includes("mất gốc")) {
    answer += `Nếu mất gốc:\n- Học lại từ cơ bản\n- Xem video dễ hiểu\n- Không học nhanh\n`;
  }

  else if (q.includes("lịch học")) {
    answer += `Gợi ý lịch học:\n- 2-3 môn/ngày\n- 30-45 phút/môn\n- 1 ngày ôn lại\n`;
  }

  else {
    answer += `Em nên học đều mỗi ngày, hiểu bản chất và luyện tập thường xuyên.`;
  }

  return answer;
}

// ================= AI PHÂN TÍCH ĐIỂM =================
function analyzeStudy(scores, student, question) {
  if (!scores || scores.length === 0) {
    return "Chưa có dữ liệu điểm để phân tích.";
  }

  const analyzed = scores.map(s => ({
    subject: s.subject,
    attendance: Number(s.attendance),
    mid: Number(s.mid),
    final: Number(s.final),
    total: calcTotal(s)
  }));

  analyzed.sort((a, b) => a.total - b.total);

  const avg = (analyzed.reduce((sum, x) => sum + x.total, 0) / analyzed.length).toFixed(2);

  const weak = analyzed.filter(x => x.total < 5);
  const good = analyzed.filter(x => x.total >= 8);

  const lowest = analyzed[0];
  const highest = analyzed[analyzed.length - 1];

  let answer = `Chào ${student?.full_name || "em"}, đây là phân tích học tập:\n\n`;

  answer += `Tổng quan:\n`;
  answer += `- Điểm TB: ${avg}\n`;
  answer += `- Môn cao nhất: ${highest.subject} (${highest.total})\n`;
  answer += `- Môn thấp nhất: ${lowest.subject} (${lowest.total})\n\n`;

  if (weak.length > 0) {
    answer += `Môn yếu:\n`;
    weak.forEach(x => {
      answer += `- ${x.subject}: ${x.total}\n`;
    });
    answer += `\nEm nên ưu tiên học môn ${lowest.subject} trước.\n`;
  } else {
    answer += `Không có môn dưới 5.\n`;
  }

  if (good.length > 0) {
    answer += `\nMôn tốt:\n`;
    good.forEach(x => {
      answer += `- ${x.subject}: ${x.total}\n`;
    });
  }

  return answer;
}

// ================= ROUTES =================
app.get("/", (req, res) => {
  res.send("LMS + AI running");
});

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  db.query(
    "SELECT * FROM users WHERE username=? AND password=?",
    [username, password],
    (e, r) => {
      if (e) return res.status(500).json({ message: "Lỗi server" });
      if (!r.length) return res.status(401).json({ message: "Sai tài khoản" });
      res.json(r[0]);
    }
  );
});

app.get("/api/students", (req, res) => {
  db.query(
    "SELECT id, full_name, username, class_name FROM users WHERE role='student'",
    (e, r) => {
      if (e) return res.status(500).json({ message: "Lỗi" });
      res.json(r);
    }
  );
});

app.get("/api/scores/:uid/:sem", (req, res) => {
  db.query(
    "SELECT * FROM scores WHERE user_id=? AND semester=?",
    [req.params.uid, req.params.sem],
    (e, r) => {
      if (e) return res.status(500).json({ message: "Lỗi" });
      res.json(r.map(x => ({ ...x, total: calcTotal(x) })));
    }
  );
});

// ================= AI =================
app.post("/api/ai-advisor", (req, res) => {
  const { student, semester, question } = req.body;

  if (!student || !student.id) {
    return res.status(400).json({ message: "Thiếu user" });
  }

  db.query("SELECT * FROM ai_rules", (err, rules) => {
    if (err) return res.status(500).json({ message: "Lỗi rules" });

    // 🔥 ưu tiên rule admin
    const ruleAnswer = findRuleAnswer(question, rules);

    if (ruleAnswer) {
      return res.json({
        answer: `AI: ${ruleAnswer}`
      });
    }

    // 🔥 nếu không có rule → mới xét tiếp
    const q = (question || "").toLowerCase();

    db.query(
      "SELECT * FROM scores WHERE user_id=? AND semester=?",
      [student.id, semester || 1],
      (e, scores) => {
        if (e) return res.status(500).json({ message: "Lỗi DB" });

        let answer = "";

        if (isScoreQuestion(q)) {
          answer = analyzeStudy(scores, student, question);
        } else {
          answer = answerGeneral(question, student);
        }

        res.json({ answer });
      }
    );
  });
});

app.post("/api/admin/rule", (req, res) => {
  const { keyword, response } = req.body;

  if (!keyword || !response) {
    return res.status(400).json({ message: "Thiếu dữ liệu" });
  }

  db.query(
    "INSERT INTO ai_rules (keyword, response) VALUES (?, ?)",
    [keyword, response],
    (e) => {
      if (e) return res.status(500).json({ message: "Lỗi DB" });
      res.json({ message: "Đã thêm rule" });
    }
  );
});

function findRuleAnswer(question, rules) {
  const q = question.toLowerCase();

  for (let rule of rules) {
    if (q.includes(rule.keyword.toLowerCase())) {
      return rule.response;
    }
  }

  return null;
}
// ================= START =================
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server chạy port " + PORT);
});
