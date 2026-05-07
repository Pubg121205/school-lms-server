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

// ================= HÀM TÍNH ĐIỂM =================
function calcTotal(x) {
  const attendance = Number(x.attendance) || 0;
  const mid = Number(x.mid) || 0;
  const final = Number(x.final) || 0;

  return Number((attendance * 0.1 + mid * 0.3 + final * 0.6).toFixed(2));
}

function getRank(avg) {
  if (avg >= 8.5) return "Giỏi";
  if (avg >= 7.0) return "Khá";
  if (avg >= 5.0) return "Trung bình";
  return "Yếu";
}

// ================= AI TỰ PHÂN TÍCH HỌC TẬP =================
function analyzeStudy(scores, student, question) {
  if (!scores || scores.length === 0) {
    return `
Hiện chưa có dữ liệu điểm để phân tích.

Em hãy:
- Kiểm tra lại học kỳ đang chọn.
- Liên hệ quản trị viên nếu chưa có điểm.
- Theo dõi điểm thường xuyên để có kế hoạch học tập phù hợp.
`;
  }

  let totalSum = 0;
  let weakSubjects = [];
  let warningSubjects = [];
  let goodSubjects = [];
  let finalWeakSubjects = [];
  let attendanceWeakSubjects = [];

  scores.forEach(s => {
    const total = calcTotal(s);
    totalSum += total;

    const attendance = Number(s.attendance) || 0;
    const mid = Number(s.mid) || 0;
    const final = Number(s.final) || 0;

    if (total < 5) {
      let reason = "điểm tổng kết thấp";

      if (final < 5) reason = "điểm cuối kỳ thấp";
      else if (mid < 5) reason = "điểm điều kiện thấp";
      else if (attendance < 5) reason = "điểm chuyên cần thấp";

      weakSubjects.push({
        subject: s.subject,
        total,
        reason
      });
    }

    if (total >= 5 && total < 6.5) {
      warningSubjects.push({
        subject: s.subject,
        total
      });
    }

    if (total >= 8) {
      goodSubjects.push({
        subject: s.subject,
        total
      });
    }

    if (final < 5) {
      finalWeakSubjects.push(s.subject);
    }

    if (attendance < 5) {
      attendanceWeakSubjects.push(s.subject);
    }
  });

  const avg = Number((totalSum / scores.length).toFixed(2));
  const rank = getRank(avg);

  let answer = "";

  answer += `Chào ${student?.full_name || "em"}, đây là phân tích học tập của em.\n\n`;
  answer += `Điểm trung bình học kỳ: ${avg}\n`;
  answer += `Xếp loại tạm thời: ${rank}\n\n`;

  if (weakSubjects.length > 0) {
    answer += `Các môn đang có nguy cơ không đạt:\n`;
    weakSubjects.forEach(x => {
      answer += `- ${x.subject}: ${x.total} điểm, nguyên nhân chính có thể do ${x.reason}.\n`;
    });

    answer += `\nLời khuyên ưu tiên:\n`;
    answer += `- Em nên ưu tiên ôn các môn dưới 5 điểm trước.\n`;
    answer += `- Cần tập trung vào điểm cuối kỳ vì điểm cuối kỳ chiếm 60% tổng kết.\n`;
    answer += `- Mỗi ngày nên dành 30-45 phút cho môn yếu nhất.\n`;
    answer += `- Nếu chưa hiểu bài, nên hỏi lại giáo viên hoặc bạn học khá hơn.\n`;
  } else {
    answer += `Hiện tại em chưa có môn nào dưới 5 điểm. Đây là tín hiệu tốt.\n`;
    answer += `Em nên tiếp tục duy trì việc học đều và không chủ quan trước kỳ thi cuối kỳ.\n`;
  }

  if (warningSubjects.length > 0) {
    answer += `\nCác môn cần chú ý thêm:\n`;
    warningSubjects.forEach(x => {
      answer += `- ${x.subject}: ${x.total} điểm.\n`;
    });
  }

  if (goodSubjects.length > 0) {
    answer += `\nCác môn học tốt:\n`;
    goodSubjects.forEach(x => {
      answer += `- ${x.subject}: ${x.total} điểm.\n`;
    });
    answer += `Em có thể duy trì phương pháp học hiện tại ở các môn này.\n`;
  }

  if (finalWeakSubjects.length > 0) {
    answer += `\nNhận xét về điểm cuối kỳ:\n`;
    answer += `Một số môn có điểm cuối kỳ thấp: ${finalWeakSubjects.join(", ")}.\n`;
    answer += `Em nên luyện đề, ôn trọng tâm và hệ thống lại kiến thức trước khi thi.\n`;
  }

  if (attendanceWeakSubjects.length > 0) {
    answer += `\nNhận xét về chuyên cần:\n`;
    answer += `Một số môn có điểm chuyên cần thấp: ${attendanceWeakSubjects.join(", ")}.\n`;
    answer += `Em cần đi học đầy đủ hơn vì chuyên cần vẫn ảnh hưởng đến điểm tổng kết.\n`;
  }

  if (question && question.trim()) {
    const q = question.toLowerCase();

    answer += `\nTrả lời câu hỏi của em:\n`;

    if (q.includes("yếu") || q.includes("kém") || q.includes("cải thiện")) {
      answer += `Em nên bắt đầu từ môn có điểm thấp nhất, chia nhỏ nội dung theo từng chương và học lại phần mất gốc trước.\n`;
    } else if (q.includes("học bổng")) {
      answer += `Muốn đạt học bổng, em nên cố gắng giữ điểm trung bình từ mức khá giỏi trở lên và hạn chế môn dưới 7 điểm.\n`;
    } else if (q.includes("thi lại") || q.includes("trượt")) {
      answer += `Nếu môn dưới 5 điểm, em cần xem quy định của trường về thi lại hoặc học lại. Nên liên hệ phòng đào tạo để xác nhận chính xác.\n`;
    } else if (q.includes("môn nào")) {
      if (weakSubjects.length > 0) {
        answer += `Môn cần ưu tiên nhất là ${weakSubjects[0].subject}, vì môn này đang dưới 5 điểm.\n`;
      } else {
        answer += `Hiện chưa có môn nào quá yếu. Em nên ưu tiên các môn điểm thấp nhất trong danh sách.\n`;
      }
    } else {
      answer += `Dựa trên dữ liệu điểm hiện tại, em nên tập trung cải thiện các môn điểm thấp và duy trì các môn đang học tốt.\n`;
    }
  }

  return answer;
}

// ================= ROUTE TEST =================
app.get("/", (req, res) => {
  res.send("School LMS API is running with MySQL + Study AI");
});

// ================= LOGIN =================
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

// ================= STUDENTS =================
app.get("/api/students", (req, res) => {
  db.query(
    "SELECT id, full_name, username, class_name FROM users WHERE role='student'",
    (e, r) => {
      if (e) return res.status(500).json({ message: "Lỗi lấy sinh viên" });
      res.json(r);
    }
  );
});

// ================= GET SCORES =================
app.get("/api/scores/:uid/:sem", (req, res) => {
  db.query(
    "SELECT * FROM scores WHERE user_id=? AND semester=?",
    [req.params.uid, req.params.sem],
    (e, r) => {
      if (e) return res.status(500).json({ message: "Lỗi lấy bảng điểm" });

      res.json(
        r.map(x => ({
          ...x,
          total: calcTotal(x)
        }))
      );
    }
  );
});

// ================= UPDATE SCORE =================
app.put("/api/scores/:id", (req, res) => {
  const { attendance, mid, final } = req.body;

  db.query(
    "UPDATE scores SET attendance=?, mid=?, final=? WHERE id=?",
    [attendance, mid, final, req.params.id],
    e => {
      if (e) return res.status(500).json({ message: "Lỗi cập nhật điểm" });
      res.json({ message: "Đã lưu" });
    }
  );
});

// ================= DELETE SCORE =================
app.delete("/api/scores/:id", (req, res) => {
  db.query(
    "DELETE FROM scores WHERE id=?",
    [req.params.id],
    e => {
      if (e) return res.status(500).json({ message: "Lỗi xoá điểm" });
      res.json({ message: "Đã xoá" });
    }
  );
});

// ================= ADD USER =================
app.post("/api/admin/user", (req, res) => {
  const { full_name, username, password, class_name } = req.body;

  if (!full_name || !username || !password) {
    return res.status(400).json({ message: "Thiếu thông tin tài khoản" });
  }

  db.query(
    "INSERT INTO users (full_name, username, password, role, class_name) VALUES (?, ?, ?, 'student', ?)",
    [full_name, username, password, class_name || ""],
    e => {
      if (e) return res.status(500).json({ message: "Lỗi tạo user" });
      res.json({ message: "Đã tạo user" });
    }
  );
});

// ================= ADD SUBJECT / SCORE =================
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
    e => {
      if (e) return res.status(500).json({ message: "Lỗi thêm môn" });
      res.json({ message: "Đã thêm môn" });
    }
  );
});

// ================= AI CỐ VẤN HỌC TẬP TỰ TẠO =================
app.post("/api/ai-advisor", (req, res) => {
  const { student, semester, question } = req.body;

  if (!student || !student.id) {
    return res.status(400).json({
      message: "Thiếu thông tin học sinh"
    });
  }

  const sem = semester || 1;

  db.query(
    "SELECT * FROM scores WHERE user_id=? AND semester=?",
    [student.id, sem],
    (e, scores) => {
      if (e) {
        console.log("Lỗi AI lấy điểm:", e);
        return res.status(500).json({
          message: "Lỗi lấy dữ liệu điểm để phân tích"
        });
      }

      const answer = analyzeStudy(scores, student, question);

      res.json({ answer });
    }
  );
});

// ================= START SERVER =================
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server đang chạy trên port " + PORT);
});
