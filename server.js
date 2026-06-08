
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

/* =========================
   MYSQL POOL
========================= */

const db = mysql.createPool({
  host: "ns95.dailysieure.com",
  user: "tdlsrhnuesite_hehe",
  password: "@Binquynh76",
  database: "tdlsrhnuesite_hehe",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

console.log("MySQL Pool Ready");

/* =========================
   ROOT
========================= */

app.get("/", (req, res) => {
  res.send("LMS Server Running");
});

/* =========================
   CALC TOTAL
========================= */

function calcTotal(x) {
  return (
    x.attendance * 0.1 +
    x.mid * 0.3 +
    x.final * 0.6
  ).toFixed(2);
}

/* =========================
   LOGIN
========================= */

app.post("/api/login", (req, res) => {

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      msg: "Thiếu tài khoản hoặc mật khẩu"
    });
  }

  db.query(
    "SELECT * FROM users WHERE username=? AND password=?",
    [username, password],

    (err, rows) => {

      if (err) {
        console.log(err);

        return res.status(500).json({
          msg: "Lỗi server"
        });
      }

      if (!rows || rows.length === 0) {
        return res.status(401).json({
          msg: "Sai tài khoản hoặc mật khẩu"
        });
      }

      res.json(rows[0]);
    }
  );
});

/* =========================
   STUDENTS
========================= */

app.get("/api/students", (req, res) => {

  db.query(
    "SELECT id, full_name, class_name FROM users WHERE role='student'",
    (err, result) => {

      if (err) {

        console.log("Lỗi students:", err);

        return res.status(500).json({
          msg: "Lỗi server students"
        });
      }

      res.json(result);
    }
  );

});

/* =========================
   SCORES
========================= */

app.get("/api/scores/:uid/:sem", (req, res) => {

  db.query(
    "SELECT * FROM scores WHERE user_id=? AND semester=?",
    [req.params.uid, req.params.sem],

    (err, rows) => {

      if (err) {
        console.log(err);

        return res.status(500).json({
          msg: "Không tải được bảng điểm"
        });
      }

      const result = rows.map(x => ({
        ...x,
        total: calcTotal(x)
      }));

      res.json(result);
    }
  );
});

/* =========================
   UPDATE SCORE
========================= */

app.put("/api/scores/:id", (req, res) => {

  const {
    attendance,
    mid,
    final
  } = req.body;

  db.query(
    "UPDATE scores SET attendance=?, mid=?, final=? WHERE id=?",

    [
      attendance,
      mid,
      final,
      req.params.id
    ],

    (err) => {

      if (err) {
        console.log(err);

        return res.status(500).json({
          msg: "Không lưu được điểm"
        });
      }

      res.json({
        msg: "Đã lưu điểm"
      });
    }
  );
});

/* =========================
   DELETE SCORE
========================= */

app.delete("/api/scores/:id", (req, res) => {

  db.query(
    "DELETE FROM scores WHERE id=?",
    [req.params.id],

    (err) => {

      if (err) {
        console.log(err);

        return res.status(500).json({
          msg: "Không xoá được môn"
        });
      }

      res.json({
        msg: "Đã xoá môn"
      });
    }
  );
});

/* =========================
   ADD USER
========================= */

app.post("/api/admin/user", (req, res) => {

  const {
    full_name,
    username,
    password,
    class_name
  } = req.body;

  if (!full_name || !username || !password) {
    return res.status(400).json({
      msg: "Thiếu dữ liệu"
    });
  }

  db.query(
    "SELECT id FROM users WHERE username=?",
    [username],

    (err, rows) => {

      if (err) {
        console.log(err);

        return res.status(500).json({
          msg: "Lỗi server"
        });
      }

      if (rows.length > 0) {
        return res.status(400).json({
          msg: "Username đã tồn tại"
        });
      }

      db.query(
        `INSERT INTO users
        (full_name, username, password, role, class_name)
        VALUES (?, ?, ?, 'student', ?)`,

        [
          full_name,
          username,
          password,
          class_name
        ],

        (err2) => {

          if (err2) {
            console.log(err2);

            return res.status(500).json({
              msg: "Không tạo được tài khoản"
            });
          }

          res.json({
            msg: "Đã tạo tài khoản"
          });
        }
      );
    }
  );
});

/* =========================
   ADD SUBJECT
========================= */

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

  if (
    !user_id ||
    !semester ||
    !subject
  ) {
    return res.status(400).json({
      msg: "Thiếu dữ liệu môn học"
    });
  }

  db.query(
    `INSERT INTO scores
    (
      user_id,
      semester,
      subject,
      credit,
      attendance,
      mid,
      final
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)`,

    [
      user_id,
      semester,
      subject,
      credit,
      attendance,
      mid,
      final
    ],

    (err) => {

      if (err) {
        console.log(err);

        return res.status(500).json({
          msg: "Không thêm được môn"
        });
      }

      res.json({
        msg: "Đã thêm môn"
      });
    }
  );
});

/* =========================
   GPA
========================= */

app.get("/api/gpa/:uid/:sem", (req, res) => {

  db.query(
    "SELECT * FROM scores WHERE user_id=? AND semester=?",
    [req.params.uid, req.params.sem],

    (err, rows) => {

      if (err) {
        console.log(err);

        return res.status(500).json({
          msg: "Lỗi GPA"
        });
      }

      if (!rows.length) {
        return res.json({
          gpa: 0
        });
      }

      let totalScore = 0;
      let totalCredit = 0;

      rows.forEach(x => {

        const total =
          x.attendance * 0.1 +
          x.mid * 0.3 +
          x.final * 0.6;

        totalScore += total * x.credit;
        totalCredit += Number(x.credit);
      });

      const gpa = totalScore / totalCredit;

      res.json({
        gpa: gpa.toFixed(2)
      });
    }
  );
});

/* =========================
   AI ADVICE
========================= */

app.get("/api/advice/:uid/:sem", (req, res) => {

  db.query(
    "SELECT * FROM scores WHERE user_id=? AND semester=?",
    [req.params.uid, req.params.sem],

    (err, rows) => {

      if (err) {
        console.log(err);

        return res.status(500).json({
          msg: "Lỗi AI advice"
        });
      }

      if (!rows.length) {
        return res.json({
          advice: "Chưa có dữ liệu học tập"
        });
      }

      let weakSubjects = [];

      rows.forEach(x => {

        const total =
          x.attendance * 0.1 +
          x.mid * 0.3 +
          x.final * 0.6;

        if (total < 5) {
          weakSubjects.push(x.subject);
        }
      });

      if (weakSubjects.length === 0) {
        return res.json({
          advice:
            "Kết quả học tập khá tốt. Bạn nên tiếp tục giữ phong độ."
        });
      }

      res.json({
        advice:
          "Bạn nên cải thiện các môn: " +
          weakSubjects.join(", ")
      });
    }
  );
});

/* =========================
   START
========================= */

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
