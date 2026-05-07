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

// ================= AI TỰ TẠO PHÂN TÍCH HỌC TẬP =================
function analyzeStudy(scores, student, question) {
  const q = (question || "").toLowerCase();

  if (!scores || scores.length === 0) {
    return `
Chào ${student?.full_name || "em"}.

Hiện hệ thống chưa có dữ liệu điểm của em trong học kỳ này nên AI chưa thể phân tích chính xác.

Em có thể:
- Kiểm tra lại học kỳ đang chọn.
- Liên hệ quản trị viên nếu điểm chưa được nhập.
- Chủ động theo dõi điểm chuyên cần, điểm giữa kỳ và cuối kỳ để có kế hoạch học tập sớm.
`;
  }

  const analyzed = scores.map(s => {
    const attendance = Number(s.attendance) || 0;
    const mid = Number(s.mid) || 0;
    const final = Number(s.final) || 0;
    const total = calcTotal(s);

    let level = "";
    if (total >= 8.5) level = "rất tốt";
    else if (total >= 7) level = "khá";
    else if (total >= 5) level = "trung bình";
    else level = "nguy cơ không đạt";

    let mainReason = "điểm tổng kết chưa cao";
    if (final < 5) mainReason = "điểm cuối kỳ thấp";
    else if (mid < 5) mainReason = "điểm giữa kỳ/điều kiện thấp";
    else if (attendance < 5) mainReason = "điểm chuyên cần thấp";

    return {
      subject: s.subject,
      credit: Number(s.credit) || 0,
      attendance,
      mid,
      final,
      total,
      level,
      mainReason
    };
  });

  analyzed.sort((a, b) => a.total - b.total);

  const avg = Number(
    (analyzed.reduce((sum, x) => sum + x.total, 0) / analyzed.length).toFixed(2)
  );

  const weak = analyzed.filter(x => x.total < 5);
  const warning = analyzed.filter(x => x.total >= 5 && x.total < 6.5);
  const good = analyzed.filter(x => x.total >= 8);
  const lowest = analyzed[0];
  const highest = analyzed[analyzed.length - 1];

  let rank = "";
  if (avg >= 8.5) rank = "Giỏi";
  else if (avg >= 7) rank = "Khá";
  else if (avg >= 5) rank = "Trung bình";
  else rank = "Yếu";

  let answer = "";

  answer += `Chào ${student?.full_name || "em"}, AI đã phân tích kết quả học tập hiện tại của em.\n\n`;
  answer += `Tổng quan học kỳ:\n`;
  answer += `- Số môn đã có điểm: ${analyzed.length}\n`;
  answer += `- Điểm trung bình tạm tính: ${avg}\n`;
  answer += `- Xếp loại tạm thời: ${rank}\n`;
  answer += `- Môn cao nhất: ${highest.subject} (${highest.total} điểm)\n`;
  answer += `- Môn thấp nhất: ${lowest.subject} (${lowest.total} điểm)\n\n`;

  if (avg >= 8) {
    answer += `Nhận xét chung: Kết quả học tập của em đang khá tốt. Em nên duy trì nhịp học hiện tại, đồng thời không chủ quan ở các môn có điểm dưới 7.\n\n`;
  } else if (avg >= 6.5) {
    answer += `Nhận xét chung: Kết quả của em ở mức ổn, nhưng vẫn còn dư địa để cải thiện. Em nên tập trung vào các môn điểm trung bình để kéo điểm học kỳ lên.\n\n`;
  } else if (avg >= 5) {
    answer += `Nhận xét chung: Em đang ở mức an toàn nhưng chưa thật sự vững. Nếu không cải thiện các môn thấp, kết quả cuối kỳ có thể bị ảnh hưởng.\n\n`;
  } else {
    answer += `Nhận xét chung: Em đang có nguy cơ học tập cao. Cần ưu tiên xử lý các môn dưới 5 điểm trước, đặc biệt là các môn có điểm cuối kỳ thấp.\n\n`;
  }

  if (weak.length > 0) {
    answer += `Các môn có nguy cơ không đạt:\n`;
    weak.forEach(x => {
      answer += `- ${x.subject}: ${x.total} điểm. Nguyên nhân chính có thể là ${x.mainReason}.\n`;
    });
    answer += `\n`;
  }

  if (warning.length > 0) {
    answer += `Các môn cần chú ý thêm:\n`;
    warning.forEach(x => {
      answer += `- ${x.subject}: ${x.total} điểm. Môn này chưa nguy hiểm nhưng cần cải thiện để tránh tụt điểm.\n`;
    });
    answer += `\n`;
  }

  if (good.length > 0) {
    answer += `Các môn học tốt:\n`;
    good.forEach(x => {
      answer += `- ${x.subject}: ${x.total} điểm. Đây là môn em đang có nền tảng tốt.\n`;
    });
    answer += `\n`;
  }

  answer += `Tư vấn theo câu hỏi của em:\n`;

  if (
    q.includes("môn nào") ||
    q.includes("ưu tiên") ||
    q.includes("học môn gì") ||
    q.includes("nên học gì")
  ) {
    answer += `Em nên ưu tiên học môn ${lowest.subject} trước vì đây là môn có điểm thấp nhất hiện tại (${lowest.total} điểm).\n`;

    if (lowest.final < 5) {
      answer += `Đặc biệt, điểm cuối kỳ của môn này đang thấp nên em cần luyện đề, ôn trọng tâm và làm lại các dạng bài hay sai.\n`;
    } else if (lowest.mid < 5) {
      answer += `Điểm giữa kỳ/điều kiện của môn này thấp, em nên học lại phần kiến thức nền và hoàn thành bài tập thường xuyên hơn.\n`;
    } else if (lowest.attendance < 5) {
      answer += `Điểm chuyên cần thấp, em cần đi học đầy đủ và tham gia hoạt động trên lớp nhiều hơn.\n`;
    }
  }

  else if (
    q.includes("yếu") ||
    q.includes("kém") ||
    q.includes("cải thiện") ||
    q.includes("nâng điểm")
  ) {
    answer += `Để cải thiện kết quả, em nên làm theo 4 bước:\n`;
    answer += `1. Chọn môn thấp nhất là ${lowest.subject} để xử lý trước.\n`;
    answer += `2. Chia nội dung môn học thành từng chương nhỏ.\n`;
    answer += `3. Mỗi ngày học lại 30-45 phút, ưu tiên phần hay sai.\n`;
    answer += `4. Trước kỳ thi, luyện đề và ghi lại lỗi sai để tránh lặp lại.\n`;

    if (weak.length > 0) {
      answer += `Vì em đang có ${weak.length} môn dưới 5 điểm, cần tập trung cứu các môn này trước khi nghĩ đến nâng điểm các môn khá.\n`;
    }
  }

  else if (
    q.includes("trượt") ||
    q.includes("thi lại") ||
    q.includes("học lại") ||
    q.includes("qua môn")
  ) {
    if (weak.length > 0) {
      answer += `Hiện em có nguy cơ không đạt ở ${weak.length} môn:\n`;
      weak.forEach(x => {
        answer += `- ${x.subject}: ${x.total} điểm.\n`;
      });
      answer += `Em nên kiểm tra quy định của trường về điều kiện thi lại/học lại. Về học tập, cần ưu tiên các môn dưới 5 điểm trước.\n`;
    } else {
      answer += `Hiện tại em chưa có môn nào dưới 5 điểm, nên nguy cơ trượt chưa cao. Tuy nhiên các môn từ 5 đến 6.5 vẫn cần cải thiện để an toàn hơn.\n`;
    }
  }

  else if (
    q.includes("học bổng") ||
    q.includes("giỏi") ||
    q.includes("xuất sắc")
  ) {
    answer += `Nếu muốn hướng tới học bổng hoặc xếp loại cao, em nên đặt mục tiêu điểm trung bình từ 8.0 trở lên, tốt nhất là 8.5.\n`;
    answer += `Hiện điểm trung bình của em là ${avg}. `;

    if (avg >= 8) {
      answer += `Em đang có nền tảng khá tốt, cần duy trì các môn mạnh và kéo các môn thấp lên trên 7.5.\n`;
    } else {
      answer += `Em cần cải thiện rõ rệt các môn dưới 7, đặc biệt là môn ${lowest.subject}.\n`;
    }
  }

  else if (
    q.includes("lịch học") ||
    q.includes("kế hoạch") ||
    q.includes("thời gian biểu")
  ) {
    answer += `AI gợi ý kế hoạch học 7 ngày như sau:\n`;
    answer += `- Ngày 1-2: Ôn môn yếu nhất: ${lowest.subject}.\n`;
    answer += `- Ngày 3-4: Làm bài tập và luyện dạng câu hỏi thường gặp.\n`;
    answer += `- Ngày 5: Ôn môn cần chú ý tiếp theo${warning[0] ? `: ${warning[0].subject}` : ""}.\n`;
    answer += `- Ngày 6: Tự kiểm tra bằng đề hoặc bài tập tổng hợp.\n`;
    answer += `- Ngày 7: Tổng kết lỗi sai và hỏi lại giáo viên/bạn bè phần chưa hiểu.\n`;
  }

  else if (
    q.includes("cuối kỳ") ||
    q.includes("thi") ||
    q.includes("ôn thi")
  ) {
    answer += `Vì điểm cuối kỳ chiếm 60% tổng kết, em nên ưu tiên ôn thi theo dạng bài trọng tâm.\n`;
    answer += `Cách ôn hiệu quả:\n`;
    answer += `- Xem lại đề cương hoặc nội dung giáo viên nhấn mạnh.\n`;
    answer += `- Làm bài tập theo từng dạng.\n`;
    answer += `- Ghi lại lỗi sai sau mỗi lần luyện đề.\n`;
    answer += `- Không học dàn trải quá nhiều môn trong một buổi.\n`;
  }

  else if (
    q.includes("chuyên cần") ||
    q.includes("đi học") ||
    q.includes("vắng")
  ) {
    const badAttendance = analyzed.filter(x => x.attendance < 5);
    if (badAttendance.length > 0) {
      answer += `Một số môn có điểm chuyên cần thấp:\n`;
      badAttendance.forEach(x => {
        answer += `- ${x.subject}: chuyên cần ${x.attendance} điểm.\n`;
      });
      answer += `Em nên đi học đầy đủ hơn, ghi chép bài và tham gia hoạt động trên lớp để tránh mất điểm quá trình.\n`;
    } else {
      answer += `Điểm chuyên cần của em hiện không quá đáng lo. Em nên tiếp tục duy trì việc đi học đều.\n`;
    }
  }

  else {
    answer += `Dựa trên dữ liệu hiện tại, em nên tập trung trước vào môn ${lowest.subject}, vì đây là môn có điểm thấp nhất. Sau đó cải thiện dần các môn ở mức trung bình để nâng điểm học kỳ.\n`;
  }

  answer += `\nKết luận:\n`;

  if (weak.length > 0) {
    answer += `Mục tiêu gần nhất của em là đưa các môn dưới 5 lên mức đạt. Khi đã an toàn, hãy tiếp tục nâng các môn trung bình lên mức khá.\n`;
  } else if (avg >= 8) {
    answer += `Em đang có kết quả tốt. Mục tiêu tiếp theo là duy trì sự ổn định và nâng các môn chưa cao để đạt kết quả giỏi hơn.\n`;
  } else {
    answer += `Em chưa ở mức nguy hiểm, nhưng cần học đều hơn để tránh bị tụt điểm ở cuối kỳ.\n`;
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
