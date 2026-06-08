Đây là `server.js` hoàn chỉnh dùng:

* Express
* MySQL
* Render
* GPA
* học bổng
* admin thêm user
* admin thêm môn
* sửa điểm
* xoá điểm

```js
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

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

  database: "tdlsrhnuesite_school_lms",

  charset: "utf8mb4"

});

db.connect((err)=>{

  if(err){

    console.log("MYSQL ERROR:",err);

    return;
  }

  console.log("MYSQL CONNECTED");
});

/* =========================
   FUNCTIONS
========================= */

function calcTotal(x){

  return Number(

    x.attendance * 0.1 +
    x.mid * 0.3 +
    x.final * 0.6

  ).toFixed(2);
}

/* =========================
   ROOT
========================= */

app.get("/",(req,res)=>{

  res.send("LMS SERVER RUNNING");
});

/* =========================
   LOGIN
========================= */

app.post("/api/login",(req,res)=>{

  const {
    username,
    password
  } = req.body;

  db.query(

    `
    SELECT *
    FROM users
    WHERE username=?
    AND password=?
    `,

    [username,password],

    (err,result)=>{

      if(err){

        console.log(err);

        return res.status(500).json({
          msg:"Lỗi server"
        });
      }

      if(result.length === 0){

        return res.status(401).json({
          msg:"Sai tài khoản"
        });
      }

      res.json(result[0]);
    }
  );
});

/* =========================
   STUDENTS
========================= */

app.get("/api/students",(req,res)=>{

  db.query(

    `
    SELECT
      id,
      full_name,
      username,
      class_name
    FROM users
    WHERE role='student'
    `,

    (err,result)=>{

      if(err){

        console.log(err);

        return res.status(500).json({
          msg:"MYSQL ERROR",
          error: err
        });
      }

      res.json(result);
    }
  );
});

/* =========================
   SCORES
========================= */

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

        console.log(err);

        return res.status(500).json({
          msg:"Lỗi lấy điểm"
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

/* =========================
   GPA
========================= */

app.get("/api/gpa/:uid",(req,res)=>{

  const uid =
  req.params.uid;

  db.query(

    `
    SELECT *
    FROM scores
    WHERE user_id=?
    `,

    [uid],

    (err,result)=>{

      if(err){

        console.log(err);

        return res.status(500).json({
          msg:"Lỗi GPA"
        });
      }

      if(result.length === 0){

        return res.json({

          gpa:0,

          scholarship:"Không có"

        });
      }

      let totalCredits = 0;

      let totalScore = 0;

      result.forEach((x)=>{

        const finalScore =

          x.attendance * 0.1 +
          x.mid * 0.3 +
          x.final * 0.6;

        totalCredits +=
        Number(x.credit);

        totalScore +=
        finalScore * Number(x.credit);
      });

      const gpa = (

        totalScore / totalCredits

      ).toFixed(2);

      let scholarship =
      "Không có";

      if(gpa >= 9){

        scholarship =
        "Học bổng xuất sắc";

      }else if(gpa >= 8){

        scholarship =
        "Học bổng giỏi";

      }else if(gpa >= 7){

        scholarship =
        "Học bổng khá";
      }

      res.json({

        gpa,
        scholarship

      });
    }
  );
});

/* =========================
   UPDATE SCORE
========================= */

app.put("/api/scores/:id",(req,res)=>{

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
      req.params.id
    ],

    (err)=>{

      if(err){

        console.log(err);

        return res.status(500).json({
          msg:"Lỗi cập nhật"
        });
      }

      res.json({
        msg:"Đã lưu"
      });
    }
  );
});

/* =========================
   DELETE SCORE
========================= */

app.delete("/api/scores/:id",(req,res)=>{

  db.query(

    `
    DELETE FROM scores
    WHERE id=?
    `,

    [req.params.id],

    (err)=>{

      if(err){

        console.log(err);

        return res.status(500).json({
          msg:"Lỗi xoá"
        });
      }

      res.json({
        msg:"Đã xoá"
      });
    }
  );
});

/* =========================
   ADMIN ADD USER
========================= */

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
          msg:"Lỗi tạo user"
        });
      }

      res.json({
        msg:"Đã tạo user"
      });
    }
  );
});

/* =========================
   ADMIN ADD SUBJECT
========================= */

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
          msg:"Lỗi thêm môn"
        });
      }

      res.json({
        msg:"Đã thêm môn"
      });
    }
  );
});

/* =========================
   START
========================= */

app.listen(PORT,()=>{

  console.log(
    "SERVER RUNNING ON PORT " + PORT
  );
});
```
