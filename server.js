const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ================= MYSQL =================
const db = mysql.createConnection({
  host: process.env.DB_HOST || "ns95.dailysieure.com",
  user: process.env.DB_USER || "YOUR_DB_USER",
  password: process.env.DB_PASSWORD || "YOUR_DB_PASSWORD",
  database: process.env.DB_NAME || "YOUR_DB_NAME",
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

// ================= AI RULE =================
function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function matchRule(question, rules) {
  const q = normalizeText(question);

  for (const rule of rules) {
    const keywords = String(rule.keywords || "")
      .split(",")
      .map(k => normalizeText(k.trim()))
      .filter(Boolean);

    for (const keyword of keywords) {
      if (keyword && q.includes(keyword)) {
        return rule;
      }
    }
  }

  return null;
}

function isScoreQuestion(question) {
  const q = normalizeText(question);

  const keywords = [
    "diem",
    "bang diem",
    "mon nao",
    "mon hoc nao",
    "hoc luc",
    "gpa",
    "trung binh",
    "yeu mon",
    "kem mon",
    "mon yeu",
    "mon kem",
    "truot",
    "thi lai",
    "hoc lai",
    "qua mon",
    "cai thien diem",
    "nang diem",
    "ket qua hoc tap",
    "xep loai"
  ];

  return keywords.some(k => q.includes(k));
}

// ================= AI TRẢ LỜI CHUNG =================
function answerGeneral(question, student) {
  const q = normalizeText(question);
  let answer = `Chào ${student?.full_name || "em"}, AI trả lời câu hỏi của em:\n\n`;

  if (q.includes("cach hoc") || q.includes("hoc nhu nao") || q.includes("hoc hieu qua")) {
    answer += `Để học hiệu quả, em nên:\n`;
    answer += `- Chia thời gian học thành từng phiên 30-45 phút.\n`;
    answer += `- Học lý thuyết xong cần làm bài tập ngay.\n`;
    answer += `- Sau 1-2 ngày nên ôn lại để tránh quên.\n`;
    answer += `- Không nên học dồn quá nhiều môn trong một buổi.\n`;
  }

  else if (q.includes("on thi") || q.includes("thi cuoi ky") || q.includes("cuoi ky")) {
    answer += `Khi ôn thi, em nên:\n`;
    answer += `- Ôn theo đề cương hoặc phần giáo viên nhấn mạnh.\n`;
    answer += `- Làm lại bài tập, đề cũ và ghi lỗi sai.\n`;
    answer += `- Ưu tiên phần kiến thức có khả năng xuất hiện trong bài thi.\n`;
    answer += `- Tránh học quá khuya ngay trước ngày thi.\n`;
  }

  else if (q.includes("mat goc")) {
    answer += `Nếu em bị mất gốc, em nên:\n`;
    answer += `- Học lại từ kiến thức cơ bản nhất.\n`;
    answer += `- Chia nhỏ bài học, không học quá nhanh.\n`;
    answer += `- Làm bài dễ trước, sau đó mới tăng độ khó.\n`;
    answer += `- Hỏi giáo viên hoặc bạn học tốt khi gặp phần chưa hiểu.\n`;
  }

  else if (q.includes("lich hoc") || q.includes("ke hoach") || q.includes("thoi gian bieu")) {
    answer += `AI gợi ý kế hoạch học đơn giản:\n`;
    answer += `- Mỗi ngày học 2-3 môn.\n`;
    answer += `- Mỗi môn học 30-45 phút.\n`;
    answer += `- Cuối tuần dành 1 buổi để ôn lại toàn bộ.\n`;
    answer += `- Môn khó nên học vào lúc tỉnh táo nhất trong ngày.\n`;
  }

  else if (q.includes("hoc bong")) {
    answer += `Để hướng tới học bổng, em nên:\n`;
    answer += `- Giữ điểm trung bình ở mức cao, thường nên từ 8.0 trở lên.\n`;
    answer += `- Hạn chế môn điểm thấp, đặc biệt là môn dưới 7.\n`;
    answer += `- Duy trì chuyên cần và thái độ học tập tốt.\n`;
    answer += `- Theo dõi quy định học bổng cụ thể của nhà trường vì mỗi trường có tiêu chí riêng.\n`;
  }

  else if (q.includes("phuc khao")) {
    answer += `Nếu muốn phúc khảo, em nên:\n`;
    answer += `- Kiểm tra kỹ điểm công bố.\n`;
    answer += `- Xem thời hạn nhận đơn phúc khảo của trường.\n`;
    answer += `- Liên hệ phòng đào tạo hoặc giảng viên phụ trách để biết thủ tục chính xác.\n`;
  }

  else {
    answer += `Em nên học đều mỗi ngày, tập trung hiểu bản chất thay vì chỉ học thuộc. Nếu câu hỏi liên quan đến điểm số, em có thể hỏi rõ hơn như “em yếu môn nào” hoặc “em có nguy cơ trượt không” để AI phân tích dựa trên bảng điểm.\n`;
  }

  return answer;
}

// ================= AI PHÂN TÍCH ĐIỂM =================
function analyzeStudy(scores, student, question) {
  if (!scores || scores.length === 0) {
    return `Chào ${student?.full_name || "em"}.\n\nHiện hệ thống chưa có dữ liệu điểm của em trong học kỳ này nên AI chưa thể phân tích chính xác.`;
  }

  const analyzed = scores.map(s => {
    const attendance = Number(s.attendance) || 0;
    const mid = Number(s.mid) || 0;
    const final = Number(s.final) || 0;
    const total = calcTotal(s);

    let reason = "điểm tổng kết chưa cao";
    if (final < 5) reason = "điểm cuối kỳ thấp";
    else if (mid < 5) reason = "điểm giữa kỳ thấp";
    else if (attendance < 5) reason = "điểm chuyên cần thấp";

    return {
      subject: s.subject,
      credit: Number(s.credit) || 0,
      attendance,
      mid,
      final,
      total,
      reason
    };
  });

  analyzed.sort((a, b) => a.total - b.total);

  const avg = Number((analyzed.reduce((sum, x) => sum + x.total, 0) / analyzed.length).toFixed(2));
  const weak = analyzed.filter(x => x.total < 5);
  const warning = analyzed.filter(x => x.total >= 5 && x.total < 6.5);
  const good = analyzed.filter(x => x.total >= 8);
  const lowest = analyzed[0];
  const highest = analyzed[analyzed.length - 1];

  let rank = "Yếu";
  if (avg >= 8.5) rank = "Giỏi";
  else if (avg >= 7) rank = "Khá";
  else if (avg >= 5) rank = "Trung bình";

  let answer = "";
  answer += `Chào ${student?.full_name || "em"}, AI đã phân tích kết quả học tập hiện tại của em.\n\n`;

  answer += `Tổng quan học kỳ:\n`;
  answer += `- Số môn đã có điểm: ${analyzed.length}\n`;
  answer += `- Điểm trung bình tạm tính: ${avg}\n`;
  answer += `- Xếp loại tạm thời: ${rank}\n`;
  answer += `- Môn cao nhất: ${highest.subject} (${highest.total} điểm)\n`;
  answer += `- Môn thấp nhất: ${lowest.subject} (${lowest.total} điểm)\n\n`;

  answer += `Nhận xét chung:\n`;
  if (avg >= 8) {
    answer += `Kết quả của em đang tốt. Em nên duy trì nhịp học hiện tại và cải thiện thêm các môn chưa đạt mức cao.\n\n`;
  } else if (avg >= 6.5) {
    answer += `Kết quả của em ở mức ổn, nhưng vẫn có thể cải thiện. Nên tập trung vào các môn điểm trung bình để kéo điểm học kỳ lên.\n\n`;
  } else if (avg >= 5) {
    answer += `Em đang ở mức an toàn nhưng chưa thật sự vững. Cần cải thiện các môn thấp để tránh rủi ro cuối kỳ.\n\n`;
  } else {
    answer += `Em đang có nguy cơ học tập cao. Cần ưu tiên xử lý các môn dưới 5 điểm trước.\n\n`;
  }

  if (weak.length > 0) {
    answer += `Các môn có nguy cơ không đạt:\n`;
    weak.forEach(x => {
      answer += `- ${x.subject}: ${x.total} điểm. Nguyên nhân chính có thể là ${x.reason}.\n`;
    });
    answer += `\n`;
  }

  if (warning.length > 0) {
    answer += `Các môn cần chú ý thêm:\n`;
    warning.forEach(x => {
      answer += `- ${x.subject}: ${x.total} điểm. Môn này chưa quá nguy hiểm nhưng cần cải thiện.\n`;
    });
    answer += `\n`;
  }

  if (good.length > 0) {
    answer += `Các môn học tốt:\n`;
    good.forEach(x => {
      answer += `- ${x.subject}: ${x.total} điểm.\n`;
    });
    answer += `\n`;
  }

  answer += `Tư vấn theo câu hỏi của em:\n`;
  const q = normalizeText(question);

  if (q.includes("mon nao") || q.includes("uu tien") || q.includes("nen hoc")) {
    answer += `Em nên ưu tiên học môn ${lowest.subject} trước vì đây là môn có điểm thấp nhất hiện tại (${lowest.total} điểm).\n`;
  } else if (q.includes("truot") || q.includes("thi lai") || q.includes("hoc lai") || q.includes("qua mon")) {
    if (weak.length > 0) {
      answer += `Hiện em có ${weak.length} môn dưới 5 điểm, nên có nguy cơ không đạt nếu quy định qua môn là từ 5 điểm trở lên.\n`;
    } else {
      answer += `Hiện chưa có môn nào dưới 5 điểm, nên nguy cơ trượt chưa cao. Tuy nhiên vẫn cần cải thiện các môn điểm thấp.\n`;
    }
  } else if (q.includes("cai thien") || q.includes("nang diem") || q.includes("yeu") || q.includes("kem")) {
    answer += `Để cải thiện, em nên ưu tiên môn ${lowest.subject}, chia nhỏ nội dung học và luyện bài tập mỗi ngày 30-45 phút.\n`;
  } else {
    answer += `Dựa trên dữ liệu hiện tại, em nên tập trung trước vào môn ${lowest.subject}, sau đó cải thiện dần các môn ở mức trung bình.\n`;
  }

  answer += `\nKết luận:\n`;
  if (weak.length > 0) {
    answer += `Mục tiêu gần nhất là đưa các môn dưới 5 lên mức đạt. Sau đó tiếp tục nâng các môn trung bình lên mức khá.\n`;
  } else if (avg >= 8) {
    answer += `Em đang có kết quả tốt. Hãy duy trì sự ổn định và tiếp tục nâng các môn chưa cao.\n`;
  } else {
    answer += `Em chưa ở mức quá nguy hiểm, nhưng cần học đều hơn để tránh tụt điểm cuối kỳ.\n`;
  }

  return answer;
}

// ================= ROUTES =================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
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
    e => {
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
    e => {
      if (e) return res.status(500).json({ message: "Lỗi xoá điểm" });
      res.json({ message: "Đã xoá" });
    }
  );
});

// ADD USER
app.post("/api/admin/user", (req, res) => {
  const { full_name, username, password, class_name, role } = req.body;

  if (!full_name || !username || !password) {
    return res.status(400).json({ message: "Thiếu thông tin tài khoản" });
  }

  db.query(
    "INSERT INTO users (full_name, username, password, role, class_name) VALUES (?, ?, ?, ?, ?)",
    [full_name, username, password, role || "student", class_name || ""],
    e => {
      if (e) return res.status(500).json({ message: "Lỗi tạo user" });
      res.json({ message: "Đã tạo user" });
    }
  );
});

// ADD SUBJECT / SCORE
app.post("/api/admin/score", (req, res) => {
  const { user_id, semester, subject, credit, attendance, mid, final } = req.body;

  if (!user_id || !semester || !subject) {
    return res.status(400).json({ message: "Thiếu thông tin môn học" });
  }

  db.query(
    "INSERT INTO scores (user_id, semester, subject, credit, attendance, mid, final) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [user_id, semester, subject, credit || 0, attendance || 0, mid || 0, final || 0],
    e => {
      if (e) return res.status(500).json({ message: "Lỗi thêm môn" });
      res.json({ message: "Đã thêm môn" });
    }
  );
});

// GET RULES
app.get("/api/admin/rules", (req, res) => {
  db.query("SELECT * FROM ai_rules ORDER BY id DESC", (e, r) => {
    if (e) return res.status(500).json({ message: "Lỗi lấy rule AI" });
    res.json(r);
  });
});

// ADD RULE
app.post("/api/admin/rule", (req, res) => {
  const { keywords, response } = req.body;

  if (!keywords || !response) {
    return res.status(400).json({ message: "Thiếu từ khóa hoặc nội dung trả lời" });
  }

  db.query(
    "INSERT INTO ai_rules (keywords, response) VALUES (?, ?)",
    [keywords, response],
    e => {
      if (e) return res.status(500).json({ message: "Lỗi thêm rule AI" });
      res.json({ message: "Đã thêm rule AI" });
    }
  );
});

// UPDATE RULE
app.put("/api/admin/rule/:id", (req, res) => {
  const { keywords, response } = req.body;

  if (!keywords || !response) {
    return res.status(400).json({ message: "Thiếu dữ liệu" });
  }

  db.query(
    "UPDATE ai_rules SET keywords=?, response=? WHERE id=?",
    [keywords, response, req.params.id],
    e => {
      if (e) return res.status(500).json({ message: "Lỗi sửa rule AI" });
      res.json({ message: "Đã sửa rule AI" });
    }
  );
});

// DELETE RULE
app.delete("/api/admin/rule/:id", (req, res) => {
  db.query(
    "DELETE FROM ai_rules WHERE id=?",
    [req.params.id],
    e => {
      if (e) return res.status(500).json({ message: "Lỗi xoá rule AI" });
      res.json({ message: "Đã xoá rule AI" });
    }
  );
});

// AI ADVISOR
app.post("/api/ai-advisor", (req, res) => {
  const { student, semester, question } = req.body;

  if (!question || !question.trim()) {
    return res.status(400).json({ message: "Bạn chưa nhập câu hỏi" });
  }

  db.query("SELECT * FROM ai_rules ORDER BY id DESC", (ruleErr, rules) => {
    if (ruleErr) return res.status(500).json({ message: "Lỗi đọc rule AI" });

    const rule = matchRule(question, rules);

    if (rule) {
      return res.json({ answer: rule.response });
    }

    if (!student || !student.id) {
      return res.json({ answer: answerGeneral(question, student) });
    }

    if (!isScoreQuestion(question)) {
      return res.json({ answer: answerGeneral(question, student) });
    }

    db.query(
      "SELECT * FROM scores WHERE user_id=? AND semester=?",
      [student.id, semester || 1],
      (e, scores) => {
        if (e) return res.status(500).json({ message: "Lỗi lấy dữ liệu điểm" });

        const answer = analyzeStudy(scores, student, question);
        res.json({ answer });
      }
    );
  });
});

// START SERVER
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server đang chạy trên port " + PORT);
});
