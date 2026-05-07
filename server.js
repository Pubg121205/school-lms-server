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

db.connect(err => {
  if (err) return console.log(err);
  console.log("MySQL connected");
});

function calcTotal(x){
  return (x.attendance*0.1 + x.mid*0.3 + x.final*0.6).toFixed(2);
}

// LOGIN
app.post("/api/login",(req,res)=>{
  const {username,password}=req.body;
  db.query("SELECT * FROM users WHERE username=? AND password=?",
  [username,password],(e,r)=>{
    if(!r.length) return res.status(401).json({msg:"Sai TK"});
    res.json(r[0]);
  });
});

// STUDENTS
app.get("/api/students",(req,res)=>{
  db.query("SELECT id,full_name,class_name FROM users WHERE role='student'",
  (e,r)=>res.json(r));
});

// SCORES
app.get("/api/scores/:uid/:sem",(req,res)=>{
  db.query("SELECT * FROM scores WHERE user_id=? AND semester=?",
  [req.params.uid,req.params.sem],(e,r)=>{
    res.json(r.map(x=>({...x,total:calcTotal(x)})));
  });
});

// UPDATE SCORE
app.put("/api/scores/:id",(req,res)=>{
  const {attendance,mid,final}=req.body;
  db.query("UPDATE scores SET attendance=?,mid=?,final=? WHERE id=?",
  [attendance,mid,final,req.params.id],
  ()=>res.json({msg:"Đã lưu"}));
});

// DELETE
app.delete("/api/scores/:id",(req,res)=>{
  db.query("DELETE FROM scores WHERE id=?",[req.params.id],
  ()=>res.json({msg:"Đã xoá"}));
});

// ADD USER
app.post("/api/admin/user",(req,res)=>{
  const {full_name,username,password,class_name}=req.body;
  db.query(
    "INSERT INTO users (full_name,username,password,role,class_name) VALUES (?,?,?,'student',?)",
    [full_name,username,password,class_name],
    ()=>res.json({msg:"Đã tạo user"})
  );
});

// ADMIN - THÊM MÔN DỰ KIẾN
app.post("/api/admin/planned-course", (req, res) => {
  const { semester, subject, credit, description } = req.body;

  if (!semester || !subject) {
    return res.status(400).json({ message: "Thiếu học kỳ hoặc tên môn" });
  }

  db.query(
    "INSERT INTO planned_courses (semester, subject, credit, description) VALUES (?, ?, ?, ?)",
    [semester, subject, credit || 3, description || ""],
    (err) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ message: "Lỗi thêm môn dự kiến" });
      }

      res.json({ message: "Đã thêm môn dự kiến" });
    }
  );
});


// AI CỐ VẤN HỌC TẬP THEO DATA SINH VIÊN
app.post("/api/advisor/chat", (req, res) => {
  const { user_id, question } = req.body;

  if (!user_id || !question) {
    return res.status(400).json({ message: "Thiếu user_id hoặc câu hỏi" });
  }

  db.query(
    "SELECT * FROM scores WHERE user_id = ?",
    [user_id],
    (err, scores) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ message: "Lỗi lấy điểm sinh viên" });
      }

      db.query(
        "SELECT * FROM planned_courses ORDER BY semester ASC",
        [],
        (err2, plannedCourses) => {
          if (err2) {
            console.log(err2);
            return res.status(500).json({ message: "Lỗi lấy môn dự kiến" });
          }

          const answer = buildAdvisorAnswer(question, scores, plannedCourses);

          db.query(
            "INSERT INTO chat_history (user_id, question, answer) VALUES (?, ?, ?)",
            [user_id, question, answer],
            (err3) => {
              if (err3) {
                console.log(err3);
              }

              res.json({
                answer: answer
              });
            }
          );
        }
      );
    }
  );
});

function buildAdvisorAnswer(question, scores, plannedCourses) {
  const q = question.toLowerCase();

  const learnedSubjects = scores.map(s => String(s.subject || "").toLowerCase());

  const weakSubjects = scores.filter(s => {
    const total = Number(
      s.total ||
      (Number(s.attendance) * 0.1 + Number(s.mid) * 0.3 + Number(s.final) * 0.6)
    );

    return total < 6.5;
  });

  const goodSubjects = scores.filter(s => {
    const total = Number(
      s.total ||
      (Number(s.attendance) * 0.1 + Number(s.mid) * 0.3 + Number(s.final) * 0.6)
    );

    return total >= 8;
  });

  let totalCredit = 0;
  let weightedSum = 0;

  scores.forEach(s => {
    const credit = Number(s.credit || 0);
    const total = Number(
      s.total ||
      (Number(s.attendance) * 0.1 + Number(s.mid) * 0.3 + Number(s.final) * 0.6)
    );

    totalCredit += credit;
    weightedSum += total * credit;
  });

  const gpa = totalCredit > 0 ? (weightedSum / totalCredit).toFixed(2) : "Chưa có dữ liệu";

  let html = "";

  if (
    q.includes("gpa") ||
    q.includes("điểm trung bình") ||
    q.includes("diem trung binh") ||
    q.includes("đtb") ||
    q.includes("dtb")
  ) {
    html += `<b>Phân tích GPA của em:</b><br><br>`;
    html += `GPA tạm tính theo dữ liệu hiện có là: <b>${gpa}</b>.<br><br>`;

    if (weakSubjects.length > 0) {
      html += `Một số môn đang kéo GPA xuống:<br>`;
      weakSubjects.forEach(s => {
        const total = (
          Number(s.attendance) * 0.1 +
          Number(s.mid) * 0.3 +
          Number(s.final) * 0.6
        ).toFixed(2);

        html += `- ${s.subject}: <b>${total}</b><br>`;
      });

      html += `<br>Em nên ưu tiên cải thiện các môn này, đặc biệt là môn có nhiều tín chỉ.<br>`;
    } else {
      html += `Hiện chưa có môn nào quá thấp. Em nên tiếp tục giữ phong độ học tập ổn định.<br>`;
    }

    return html;
  }

  if (
    q.includes("học bổng") ||
    q.includes("hoc bong") ||
    q.includes("scholarship")
  ) {
    html += `<b>Phân tích khả năng học bổng:</b><br><br>`;
    html += `GPA tạm tính của em là: <b>${gpa}</b>.<br><br>`;

    if (Number(gpa) >= 8) {
      html += `Em đang có mức điểm khá tốt để hướng tới học bổng. Nên duy trì các môn từ 8.0 trở lên và hạn chế môn điểm thấp.<br>`;
    } else if (Number(gpa) >= 7) {
      html += `Em có cơ hội cải thiện để đạt học bổng. Nên tập trung nâng điểm các môn còn thấp.<br>`;
    } else {
      html += `Hiện GPA chưa cao. Em nên ưu tiên cải thiện các môn điểm thấp trước khi đặt mục tiêu học bổng.<br>`;
    }

    if (weakSubjects.length > 0) {
      html += `<br>Các môn nên cải thiện:<br>`;
      weakSubjects.forEach(s => {
        html += `- ${s.subject}<br>`;
      });
    }

    return html;
  }

  if (
    q.includes("học môn nào") ||
    q.includes("hoc mon nao") ||
    q.includes("kỳ tới") ||
    q.includes("ky toi") ||
    q.includes("môn mở") ||
    q.includes("mon mo") ||
    q.includes("đăng ký môn") ||
    q.includes("dang ky mon")
  ) {
    html += `<b>Gợi ý môn học kỳ tới:</b><br><br>`;

    const recommended = [];

    plannedCourses.forEach(course => {
      const courseName = String(course.subject || "").toLowerCase();

      const alreadyLearned = learnedSubjects.includes(courseName);

      if (!alreadyLearned) {
        recommended.push({
          subject: course.subject,
          reason: "Em chưa học môn này, có thể đăng ký trong kỳ tới."
        });
      } else {
        const learned = scores.find(s =>
          String(s.subject || "").toLowerCase() === courseName
        );

        const total = learned
          ? (
              Number(learned.attendance) * 0.1 +
              Number(learned.mid) * 0.3 +
              Number(learned.final) * 0.6
            )
          : 0;

        if (total < 6.5) {
          recommended.push({
            subject: course.subject,
            reason: "Em đã học môn này nhưng điểm còn thấp, nên cân nhắc học cải thiện."
          });
        }
      }
    });

    if (recommended.length === 0) {
      html += `Hiện chưa có môn dự kiến phù hợp hoặc các môn mở kỳ tới em đã học đạt rồi.<br>`;
    } else {
      recommended.forEach(item => {
        html += `- <b>${item.subject}</b>: ${item.reason}<br>`;
      });
    }

    if (weakSubjects.length > 0) {
      html += `<br>Ngoài ra, em nên chú ý cải thiện các môn điểm thấp:<br>`;
      weakSubjects.forEach(s => {
        html += `- ${s.subject}<br>`;
      });
    }

    return html;
  }

  if (
    q.includes("điểm kém") ||
    q.includes("diem kem") ||
    q.includes("cải thiện") ||
    q.includes("cai thien") ||
    q.includes("học lại") ||
    q.includes("hoc lai")
  ) {
    html += `<b>Phân tích các môn cần cải thiện:</b><br><br>`;

    if (weakSubjects.length === 0) {
      html += `Hiện chưa thấy môn nào dưới 6.5. Em nên tiếp tục duy trì kết quả hiện tại.<br>`;
    } else {
      html += `Các môn nên cải thiện:<br>`;
      weakSubjects.forEach(s => {
        const total = (
          Number(s.attendance) * 0.1 +
          Number(s.mid) * 0.3 +
          Number(s.final) * 0.6
        ).toFixed(2);

        html += `- ${s.subject}: tổng kết <b>${total}</b><br>`;
      });

      html += `<br>Gợi ý: ưu tiên môn nhiều tín chỉ và môn liên quan trực tiếp đến chuyên ngành.<br>`;
    }

    return html;
  }

  html += `Tôi đã xem dữ liệu học tập của em.<br><br>`;
  html += `GPA tạm tính: <b>${gpa}</b>.<br><br>`;

  if (weakSubjects.length > 0) {
    html += `Em nên cải thiện các môn sau:<br>`;
    weakSubjects.forEach(s => {
      html += `- ${s.subject}<br>`;
    });
  } else {
    html += `Hiện kết quả học tập khá ổn. Em nên tiếp tục duy trì và chuẩn bị tốt cho các môn kỳ tiếp theo.<br>`;
  }

  html += `<br>Em có thể hỏi rõ hơn như: "Em nên học môn nào kỳ tới?", "GPA của em thế nào?", hoặc "Em có đủ điều kiện học bổng không?".`;

  return html;
}


// LỊCH SỬ CHAT THEO SINH VIÊN
app.get("/api/advisor/history/:user_id", (req, res) => {
  const user_id = req.params.user_id;

  db.query(
    "SELECT * FROM chat_history WHERE user_id = ? ORDER BY created_at ASC",
    [user_id],
    (err, rows) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ message: "Lỗi lấy lịch sử chat" });
      }

      res.json(rows);
    }
  );
});


// ADD SUBJECT
app.post("/api/admin/score",(req,res)=>{
  db.query(
    "INSERT INTO scores (user_id,semester,subject,credit,attendance,mid,final) VALUES (?,?,?,?,?,?,?)",
    Object.values(req.body),
    ()=>res.json({msg:"Đã thêm môn"})
  );
});

app.listen(PORT,()=>console.log("Server OK"));
