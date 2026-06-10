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
  connectionLimit: 10,
  queueLimit: 0
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
        return res.status(500).json({ msg: err.message });
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

/* DANH SÁCH SINH VIÊN */
app.get("/students", (req, res) => {

  db.query(
    "SELECT * FROM users WHERE role='student'",
    (err, rows) => {

      if (err) {
        return res.status(500).json({ msg: err.message });
      }

      res.json(rows);
    }
  );
});

/* LẤY BẢNG ĐIỂM */
app.get("/scores/:userId/:semester", (req, res) => {

  const { userId, semester } = req.params;

  db.query(
    `SELECT * FROM scores
     WHERE user_id=? AND semester=?`,
    [userId, semester],
    (err, rows) => {

      if (err) {
        return res.status(500).json({ msg: err.message });
      }

      res.json(rows);
    }
  );
});

/* THÊM SINH VIÊN */
app.post("/admin/user", (req, res) => {

  const {
    full_name,
    username,
    password,
    class_name
  } = req.body;

  db.query(
    `INSERT INTO users
    (full_name,username,password,role,class_name)
    VALUES (?,?,?,'student',?)`,
    [
      full_name,
      username,
      password,
      class_name
    ],
    (err) => {

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
    VALUES (?,?,?)
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
        msg: "Đã thêm môn"
      });
    }
  );

});
/* THÊM MÔN HỌC */
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
    `INSERT INTO scores
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
    VALUES (?,?,?,?,?,?,?,?)`,
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
    (err) => {

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


app.get("/planned-subjects",(req,res)=>{

  db.query(
    "SELECT * FROM planned_subjects ORDER BY semester,id",
    (err,rows)=>{

      if(err){
        return res.status(500).json([]);
      }

      res.json(rows);
    }
  );

});


app.post("/admin/planned-subject",(req,res)=>{

  const{
    semester,
    subject_name,
    prerequisite_subject
  }=req.body;

  db.query(
    `
    INSERT INTO planned_subjects
    (
      semester,
      subject_name,
      prerequisite_subject
    )
    VALUES(?,?,?)
    `,
    [
      semester,
      subject_name,
      prerequisite_subject || null
    ],
    err=>{

      if(err){
        return res.status(500).json({
          msg:err.message
        });
      }

      res.json({
        msg:"Đã thêm môn dự kiến"
      });

    }
  );

});

app.delete(
"/planned-subject/:id",
(req,res)=>{

  db.query(
    "DELETE FROM planned_subjects WHERE id=?",
    [req.params.id],
    err=>{

      if(err){
        return res.status(500).json({
          msg:err.message
        });
      }

      res.json({
        msg:"Đã xóa"
      });

    }
  );

});
/* CẬP NHẬT ĐIỂM */
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
    `UPDATE scores
     SET attendance=?,
         mid=?,
         final=?,
         total=?
     WHERE id=?`,
    [
      attendance,
      mid,
      final,
      total.toFixed(2),
      id
    ],
    (err) => {

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

app.get("/planned-subjects", (req, res) => {

  db.query(
    "SELECT * FROM planned_subjects ORDER BY semester",
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
/* XÓA MÔN */
app.delete("/scores/:id", (req, res) => {

  db.query(
    "DELETE FROM scores WHERE id=?",
    [req.params.id],
    (err) => {

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

/* AI CỐ VẤN */
app.get("/advice/:userId/:semester", (req, res) => {

  const { userId, semester } = req.params;

  db.query(
    `SELECT * FROM scores
     WHERE user_id=? AND semester=?`,
    [userId, semester],
    (err, rows) => {

      if (err) {
        return res.status(500).json({
          advice: "Lỗi hệ thống"
        });
      }

      if (rows.length === 0) {
        return res.json({
          advice: "Chưa có dữ liệu học tập."
        });
      }

      let weak = rows.filter(x => x.total < 5);

      let advice =
        `Bạn đang học ${rows.length} môn. `;

      if (weak.length > 0) {

        advice +=
          `Cần cải thiện ${weak.length} môn có điểm dưới 5. `;

      } else {

        advice +=
          "Kết quả học tập đang khá tốt. ";
      }

      let avg =
        rows.reduce(
          (s, x) => s + Number(x.total),
          0
        ) / rows.length;

      advice +=
        `Điểm trung bình hiện tại khoảng ${avg.toFixed(2)}.`;

      res.json({ advice });
    }
  );
});

app.listen(PORT, () => {
  console.log(
    "Server running on port " + PORT
  );
});
