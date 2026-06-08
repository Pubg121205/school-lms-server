const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

/* =========================
   MYSQL
========================= */

const db = mysql.createConnection({
  host: "ns95.dailysieure.com",
  user: "tdlsrhnuesite_hehe",
  password: "@Binquynh76",
  database: "tdlsrhnuesite_school_lms"
});

db.connect((err) => {
  if (err) {
    console.log("MySQL lỗi:", err);
    return;
  }

  console.log("MySQL connected");
});

/* =========================
   GEMINI API KEY
========================= */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/* =========================
   FUNCTIONS
========================= */

function calcTotal(x) {
  return (
    x.attendance * 0.1 +
    x.mid * 0.3 +
    x.final * 0.6
  ).toFixed(2);
}

/* =========================
   ROOT
========================= */

app.get("/", (req, res) => {
  res.send("LMS Server Running");
});

/* =========================
   LOGIN
========================= */

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  db.query(
    "SELECT * FROM users WHERE username=? AND password=?",
    [username, password],
    (err, result) => {

      if (err) {
        console.log(err);
        return res.status(500).json({
          msg: "Lỗi server"
        });
      }

      if (result.length === 0) {
        return res.status(401).json({
          msg: "Sai tài khoản hoặc mật khẩu"
        });
      }

      res.json(result[0]);
    }
  );
});

/* =========================
   STUDENTS
========================= */

app.get("/api/students", (req, res) => {

  db.query(
    `
    SELECT id, full_name, username, class_name
    FROM users
    WHERE role='student'
    `,
    (err, result) => {

      if (err) {
        return res.status(500).json({
          msg: "Lỗi lấy danh sách"
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

  const uid = req.params.uid;
  const sem = req.params.sem;

  db.query(
    `
    SELECT *
    FROM scores
    WHERE user_id=? AND semester=?
    `,
    [uid, sem],
    (err, result) => {

      if (err) {
        return res.status(500).json({
          msg: "Lỗi lấy điểm"
        });
      }

      const data = result.map((x) => ({
        ...x,
        total: calcTotal(x)
      }));

      res.json(data);
    }
  );
});

/* =========================
   UPDATE SCORE
========================= */

app.put("/api/scores/:id", (req, res) => {

  const { attendance, mid, final } = req.body;

  db.query(
    `
    UPDATE scores
    SET attendance=?, mid=?, final=?
    WHERE id=?
    `,
    [
      attendance,
      mid,
      final,
      req.params.id
    ],
    (err) => {

      if (err) {
        return res.status(500).json({
          msg: "Lỗi cập nhật"
        });
      }

      res.json({
        msg: "Đã lưu"
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
        return res.status(500).json({
          msg: "Lỗi xoá"
        });
      }

      res.json({
        msg: "Đã xoá"
      });
    }
  );
});

/* =========================
   ADMIN - ADD USER
========================= */

app.post("/api/admin/user", (req, res) => {

  const {
    full_name,
    username,
    password,
    class_name
  } = req.body;

  db.query(
    `
    INSERT INTO users
    (full_name, username, password, role, class_name)
    VALUES (?, ?, ?, 'student', ?)
    `,
    [
      full_name,
      username,
      password,
      class_name
    ],
    (err) => {

      if (err) {
        console.log(err);

        return res.status(500).json({
          msg: "Không thể tạo tài khoản"
        });
      }

      res.json({
        msg: "Đã tạo user"
      });
    }
  );
});

/* =========================
   ADMIN - ADD SUBJECT
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
      final
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
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
          msg: "Không thể thêm môn"
        });
      }

      res.json({
        msg: "Đã thêm môn"
      });
    }
  );
});

/* =========================
   AI CHAT
========================= */

app.post("/api/ai", async (req, res) => {

  try {

    const { message } = req.body;

    const prompt = `
Bạn là cố vấn học tập AI của trường Đại học Sư phạm Hà Nội.
Hãy trả lời thân thiện, dễ hiểu và hỗ trợ sinh viên.

Câu hỏi:
${message}
`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ]
      }
    );

    const reply =
      response.data.candidates[0]
      .content.parts[0].text;

    res.json({
      reply
    });

  } catch (err) {

    console.log(err.response?.data || err);

    res.status(500).json({
      reply: "AI đang bận, thử lại sau"
    });
  }
});

/* =========================
   START
========================= */

app.listen(PORT, () => {
  console.log("Server OK");
});
