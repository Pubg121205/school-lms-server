
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

const db = mysql.createPool({
  host: "ns95.dailysieure.com",
  user: "tdlsrhnuesite_vip",
  password: "tdlsrhnuesite_vip",
  database: "tdlsrhnuesite_vip",
  waitForConnections: true,
  connectionLimit: 10
});

db.getConnection((err, conn) => {

  if (err) {
    console.log("MYSQL ERROR:", err.message);
  } else {
    console.log("MYSQL CONNECTED");
    conn.release();
  }

});

app.get("/", (req, res) => {
  res.send("LMS Server Running");
});

/* LOGIN */

app.post("/login", (req, res) => {

  const { username, password } = req.body;

  db.query(
    "SELECT * FROM users WHERE username=? AND password=?",
    [username, password],
    (err, rows) => {

      if (err) {
        return res.status(500).json({
          msg: err.message
        });
      }

      if (rows.length === 0) {
        return res.status(401).json({
          msg: "Sai tài khoản hoặc mật khẩu"
        });
      }

      res.json(rows[0]);
    }
  );

});

/* STUDENTS */

app.get("/students", (req, res) => {

  db.query(
    "SELECT * FROM users WHERE role='student'",
    (err, rows) => {

      if (err) {
        return res.status(500).json({
          msg: err.message
        });
      }

      res.json(rows);
    }
  );

});

/* CREATE STUDENT */

app.post("/admin/user", (req, res) => {

  const {
    full_name,
    username,
    password,
    class_name
  } = req.body;

  db.query(
    `
    INSERT INTO users
    (
      full_name,
      username,
      password,
      role,
      class_name
    )
    VALUES
    (
      ?,
      ?,
      ?,
      'student',
      ?
    )
    `,
    [
      full_name,
      username,
      password,
      class_name
    ],
    err => {

      if (err) {
        return res.status(500).json({
          msg: err.message
        });
      }

      res.json({
        msg: "Tạo sinh viên thành công"
      });

    }
  );

});

/* SCORES */

app.get("/scores/:userId/:semester", (req, res) => {

  const {
    userId,
    semester
  } = req.params;

  db.query(
    `
    SELECT *
    FROM scores
    WHERE user_id=?
    AND semester=?
    `,
    [userId, semester],
    (err, rows) => {

      if (err) {
        return res.status(500).json({
          msg: err.message
        });
      }

      res.json(rows);
    }
  );

});

/* ADD SCORE */

app.post("/admin/score", (req, res) => {

  const {
    user_id,
    semester,
    subject,
    credit,
    attendance,
    mid,
    final
  } = req.body;

  const total =
    attendance * 0.1 +
    mid * 0.3 +
    final * 0.6;

  db.query(
    `
    INSERT INTO scores
    (
      user_id,
      semester,
      subject,
      credit,
      attendance,
      mid,
      final,
      total
    )
    VALUES
    (
      ?,?,?,?,?,?,?,?
    )
    `,
    [
      user_id,
      semester,
      subject,
      credit,
      attendance,
      mid,
      final,
      total.toFixed(2)
    ],
    err => {

      if (err) {
        return res.status(500).json({
          msg: err.message
        });
      }

      res.json({
        msg: "Thêm môn thành công"
      });

    }
  );

});

app.post("/admin/planned-subject",(req,res)=>{

  const {
    semester,
    subject_name,
    prerequisite_subject
  } = req.body;

  db.query(
    `INSERT INTO planned_subjects
    (semester,subject_name,prerequisite_subject)
    VALUES (?,?,?)`,
    [
      semester,
      subject_name,
      prerequisite_subject || null
    ],
    err => {

      if(err){
        return res.status(500).json({
          msg: err.message
        });
      }

      res.json({
        msg:"Đã thêm môn dự kiến"
      });
    }
  );
});
/* UPDATE SCORE */

app.put("/scores/:id", (req, res) => {

  const { id } = req.params;

  const {
    attendance,
    mid,
    final
  } = req.body;

  const total =
    attendance * 0.1 +
    mid * 0.3 +
    final * 0.6;

  db.query(
    `
    UPDATE scores
    SET
      attendance=?,
      mid=?,
      final=?,
      total=?
    WHERE id=?
    `,
    [
      attendance,
      mid,
      final,
      total.toFixed(2),
      id
    ],
    err => {

      if (err) {
        return res.status(500).json({
          msg: err.message
        });
      }

      res.json({
        msg: "Đã cập nhật"
      });

    }
  );

});

/* DELETE SCORE */

app.delete("/scores/:id", (req, res) => {

  db.query(
    "DELETE FROM scores WHERE id=?",
    [req.params.id],
    err => {

      if (err) {
        return res.status(500).json({
          msg: err.message
        });
      }

      res.json({
        msg: "Đã xóa"
      });

    }
  );

});

/* PLANNED SUBJECTS */

app.get("/planned-subjects", (req, res) => {

  db.query(
    `
    SELECT *
    FROM planned_subjects
    ORDER BY semester,id
    `,
    (err, rows) => {

      if (err) {
        return res.status(500).json({
          msg: err.message
        });
      }

      res.json(rows);

    }
  );

});

app.post("/admin/planned-subject", (req, res) => {

  const {
    semester,
    subject_name,
    prerequisite_subject
  } = req.body;

  db.query(
    `
    INSERT INTO planned_subjects
    (
      semester,
      subject_name,
      prerequisite_subject
    )
    VALUES
    (
      ?,?,?
    )
    `,
    [
      semester,
      subject_name,
      prerequisite_subject || null
    ],
    err => {

      if (err) {
        return res.status(500).json({
          msg: err.message
        });
      }

      res.json({
        msg: "Đã thêm môn dự kiến"
      });

    }
  );

});

app.delete("/planned-subject/:id", (req, res) => {

  db.query(
    "DELETE FROM planned_subjects WHERE id=?",
    [req.params.id],
    err => {

      if (err) {
        return res.status(500).json({
          msg: err.message
        });
      }

      res.json({
        msg: "Đã xóa môn dự kiến"
      });

    }
  );

});

/* AI ADVICE */

app.get("/advice/:userId/:semester", (req, res) => {

  const { userId, semester } = req.params;
  const question = (req.query.q || "").toLowerCase();

  db.query(
    `
    SELECT *
    FROM scores
    WHERE user_id=?
    AND semester=?
    `,
    [userId, semester],
    (err, rows) => {

      if (err) {
        return res.json({
          advice: "Lỗi hệ thống"
        });
      }

      if (rows.length === 0) {
        return res.json({
          advice: "Chưa có dữ liệu học tập."
        });
      }

      let totalCredit = 0;
      let totalPoint = 0;

      const failedSubjects = [];
      const weakSubjects = [];

      rows.forEach(row => {

        const score = Number(row.total);
        const credit = Number(row.credit);

        let gpa4 = 0;

        if(score >= 8.5) gpa4 = 4;
        else if(score >= 8) gpa4 = 3.5;
        else if(score >= 7) gpa4 = 3;
        else if(score >= 6.5) gpa4 = 2.5;
        else if(score >= 5.5) gpa4 = 2;
        else if(score >= 5) gpa4 = 1;
        else gpa4 = 0;

        totalPoint += gpa4 * credit;
        totalCredit += credit;

        if(score < 5){
          failedSubjects.push(row.subject);
        }

        if(score < 6.5){
          weakSubjects.push(
            `${row.subject} (${score})`
          );
        }

      });

      const GPA =
        totalCredit > 0
        ? totalPoint / totalCredit
        : 0;

      let scholarship = false;

      if(
        GPA >= 3.2 &&
        failedSubjects.length === 0
      ){
        scholarship = true;
      }

      let answer = "";

      if(
        question.includes("gpa")
      ){

        answer =
          `GPA hiện tại của bạn là ${GPA.toFixed(2)}/4.0`;

      }

      else if(
        question.includes("học bổng")
      ){

        if(scholarship){

          answer =
            `Bạn đủ điều kiện xét học bổng. GPA hiện tại là ${GPA.toFixed(2)} và không có môn trượt.`;

        }else{

          answer =
            `Bạn chưa đủ điều kiện học bổng. GPA hiện tại là ${GPA.toFixed(2)}.`;
        }

      }

      else if(
        question.includes("học lại") ||
        question.includes("trượt")
      ){

        if(failedSubjects.length){

          answer =
            "Các môn cần học lại: " +
            failedSubjects.join(", ");

        }else{

          answer =
            "Hiện tại bạn không có môn nào phải học lại.";
        }

      }

      else if(
        question.includes("môn yếu")
      ){

        if(weakSubjects.length){

          answer =
            "Các môn nên cải thiện: " +
            weakSubjects.join(", ");

        }else{

          answer =
            "Không có môn yếu đáng lo ngại.";
        }

      }

      else{

        answer =
          `Tổng số môn: ${rows.length}\n` +
          `GPA: ${GPA.toFixed(2)}/4.0\n` +
          `Môn trượt: ${failedSubjects.length}\n` +
          `Học bổng: ${
            scholarship
            ? "Đủ điều kiện"
            : "Chưa đủ điều kiện"
          }`;

        if(weakSubjects.length){

          answer +=
            `\nNên cải thiện: ${weakSubjects.join(", ")}`;
        }
      }

      res.json({
        advice: answer
      });

    }
  );

});

app.listen(PORT, () => {

  console.log(
    "Server running on port " + PORT
  );

});

