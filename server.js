const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const axios = require("axios");

const app = express();

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

/* ================= DATABASE ================= */

const db = mysql.createConnection({

  host: "YOUR_HOST",
  user: "YOUR_USER",
  password: "YOUR_PASSWORD",
  database: "YOUR_DATABASE",

  charset: "utf8mb4"

});

db.connect((err)=>{

  if(err){

    console.log("MySQL Error:", err);
    return;
  }

  console.log("MySQL Connected");
});

/* ================= GEMINI ================= */

const GEMINI_API_KEY =
"YOUR_GEMINI_API_KEY";

/* ================= FUNCTIONS ================= */

function calcTotal(x){

  return Number(
    x.attendance * 0.1 +
    x.mid * 0.3 +
    x.final * 0.6
  ).toFixed(2);
}

/* ================= HOME ================= */

app.get("/",(req,res)=>{

  res.send("LMS Server Running");
});

/* ================= LOGIN ================= */

app.post("/api/login",(req,res)=>{

  const {username,password} = req.body;

  db.query(
    `
    SELECT
      id,
      full_name,
      username,
      role,
      class_name
    FROM users
    WHERE username=?
    AND password=?
    `,
    [username,password],

    (err,result)=>{

      if(err){

        console.log(err);

        return res.status(500).json({
          message:"Lỗi server"
        });
      }

      if(result.length === 0){

        return res.status(401).json({
          message:"Sai tài khoản"
        });
      }

      res.json(result[0]);
    }
  );
});

/* ================= STUDENTS ================= */

app.get("/api/students",(req,res)=>{

  db.query(
    `
    SELECT
      id,
      full_name,
      class_name
    FROM users
    WHERE role='student'
    `,
    (err,result)=>{

      if(err){

        return res.status(500).json({
          message:"Lỗi lấy sinh viên"
        });
      }

      res.json(result);
    }
  );
});

/* ================= GET SCORES ================= */

app.get("/api/scores/:uid/:semester",(req,res)=>{

  const uid =
  req.params.uid;

  const semester =
  req.params.semester;

  db.query(
    `
    SELECT *
    FROM scores
    WHERE user_id=?
    AND semester=?
    `,
    [uid,semester],

    (err,result)=>{

      if(err){

        return res.status(500).json({
          message:"Lỗi lấy điểm"
        });
      }

      const data =
      result.map(x=>({

        ...x,

        total: calcTotal(x)

      }));

      res.json(data);
    }
  );
});

/* ================= UPDATE SCORE ================= */

app.put("/api/scores/:id",(req,res)=>{

  const id =
  req.params.id;

  const {
    attendance,
    mid,
    final
  } = req.body;

  db.query(
    `
    UPDATE scores
    SET
      attendance=?,
      mid=?,
      final=?
    WHERE id=?
    `,
    [
      attendance,
      mid,
      final,
      id
    ],

    (err)=>{

      if(err){

        return res.status(500).json({
          message:"Lỗi cập nhật"
        });
      }

      res.json({
        message:"Đã lưu"
      });
    }
  );
});

/* ================= DELETE SCORE ================= */

app.delete("/api/scores/:id",(req,res)=>{

  db.query(
    `
    DELETE FROM scores
    WHERE id=?
    `,
    [req.params.id],

    (err)=>{

      if(err){

        return res.status(500).json({
          message:"Lỗi xoá"
        });
      }

      res.json({
        message:"Đã xoá"
      });
    }
  );
});

/* ================= ADD USER ================= */

app.post("/api/admin/user",(req,res)=>{

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

    (err)=>{

      if(err){

        console.log(err);

        return res.status(500).json({
          message:"Lỗi tạo user"
        });
      }

      res.json({
        message:"Đã tạo user"
      });
    }
  );
});

/* ================= ADD SUBJECT ================= */

app.post("/api/admin/score",(req,res)=>{

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

    VALUES
    (
      ?,
      ?,
      ?,
      ?,
      ?,
      ?,
      ?
    )
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

    (err)=>{

      if(err){

        console.log(err);

        return res.status(500).json({
          message:"Lỗi thêm môn"
        });
      }

      res.json({
        message:"Đã thêm môn"
      });
    }
  );
});

/* ================= AI ADVISOR ================= */

app.post("/api/ai-advisor", async(req,res)=>{

  try{

    const {
      question,
      student
    } = req.body;

    const prompt = `
Bạn là cố vấn học tập AI của trường đại học.

Sinh viên:
${student.full_name}

Lớp:
${student.class_name}

Câu hỏi:
${question}

Hãy trả lời ngắn gọn,
thân thiện,
hữu ích bằng tiếng Việt.
`;

    const response =
    await axios.post(

      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,

      {
        contents:[
          {
            parts:[
              {
                text: prompt
              }
            ]
          }
        ]
      }
    );

    const answer =
    response.data
    .candidates[0]
    .content.parts[0]
    .text;

    res.json({
      answer
    });

  }catch(err){

    console.log(err.response?.data || err);

    res.status(500).json({
      answer:"AI đang bận"
    });
  }
});

/* ================= START ================= */

app.listen(PORT,()=>{

  console.log(
    "Server running at port " + PORT
  );
});
