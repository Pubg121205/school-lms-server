
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

const db = mysql.createPool({
  host: "ns95.dailysieure.com",
  user: "tgtusnakesite_huhu",
  password: "tgtusnakesite_huhu",
  database: "tgtusnakesite_huhu",
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


app.get("/curriculum/all", (req,res)=>{

    db.query(
        `
        SELECT
            subject_code,
            subject_name,
            credit,
            semester,
            open_semester
        FROM curriculum
        ORDER BY subject_code
        `,
        (err,rows)=>{

            if(err){
                return res.status(500).json({
                    msg:err.message
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
    `INSERT INTO users
    (
      full_name,
      username,
      password,
      role,
      class_name
    )
    VALUES
    (
      ?,?,?, 'student', ?
    )`,
    [
      full_name,
      username,
      password,
      class_name
    ],
    err => {

      if(err){
        return res.status(500).json({
          msg: err.message
        });
      }

      res.json({
        msg:"Tạo sinh viên thành công"
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
    subject_code,
    subject_name,
    credit,
    prerequisite_subject
  } = req.body;

  db.query(
    `INSERT INTO curriculum
    (semester,subject_code,subject_name,credit,prerequisite_subject)
    VALUES (?,?,?,?,?)`,
    [
      semester,
      subject_code,
      subject_name,
      credit,
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
    FROM curriculum
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


app.delete("/planned-subject/:id", (req, res) => {

  db.query(
    "DELETE FROM curriculum WHERE id=?",
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



app.get("/curriculum", (req,res)=>{

  db.query(
    `
    SELECT *
    FROM curriculum
    ORDER BY semester,id
    `,
    (err,rows)=>{

      if(err){
        return res.status(500).json({
          msg:err.message
        });
      }

      res.json(rows);
    }
  );

});


app.get("/curriculum",(req,res)=>{

db.query(
`
SELECT *
FROM curriculum
ORDER BY semester, subject_code
`,
(err,rows)=>{

if(err){
return res.status(500).json({
msg:err.message
});
}

res.json(rows);

});

});




app.post("/admin/curriculum",(req,res)=>{
    

  const {
    semester,
    subject_code,
    subject_name,
    credit,
    prerequisite_subject
  } = req.body;

  db.query(
    `
    INSERT INTO curriculum
    (
      semester,
      subject_code,
      subject_name,
      credit,
      prerequisite_subject
    )
    VALUES
    (
      ?,?,?,?,?
    )
    `,
    [
      semester,
      subject_code,
      subject_name,
      credit,
      prerequisite_subject || null
    ],
    err=>{

      if(err){
        return res.status(500).json({
          msg:err.message
        });
      }

      res.json({
        msg:"Đã thêm môn học"
      });

    }
  );

});
app.put("/curriculum/:id",(req,res)=>{

  const { id } = req.params;

  const {
    semester,
    subject_code,
    subject_name,
    credit,
    prerequisite_subject
  } = req.body;

  db.query(
    `
    UPDATE curriculum
    SET
      semester=?,
      subject_code=?,
      subject_name=?,
      credit=?,
      prerequisite_subject=?
    WHERE id=?
    `,
    [
      semester,
      subject_code,
      subject_name,
      credit,
      prerequisite_subject || null,
      id
    ],
    err=>{

      if(err){
        return res.status(500).json({
          msg: err.message
        });
      }

      res.json({
        msg:"Đã cập nhật môn học"
      });

    }
  );

});




app.delete("/curriculum/:id",(req,res)=>{

  db.query(
    "DELETE FROM curriculum WHERE id=?",
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









/* AI ADVICE */

app.get("/advice/:userId/:semester", (req, res) => {

  const { userId, semester } = req.params;
  const question = (req.query.q || "").toLowerCase();

  db.query(
    `
    SELECT *
    FROM scores
    WHERE user_id=?
    
    `,
    
    [userId],
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

/* GPA */

if(
    question.includes("gpa") ||
    question.includes("điểm trung bình")
){

    let rank = "";

    if(GPA >= 3.6) rank = "Xuất sắc";
    else if(GPA >= 3.2) rank = "Giỏi";
    else if(GPA >= 2.5) rank = "Khá";
    else if(GPA >= 2.0) rank = "Trung bình";
    else rank = "Yếu";

    answer =
    `GPA hiện tại: ${GPA.toFixed(2)}/4.0\n`+
    `Xếp loại: ${rank}`;
}

/* HỌC BỔNG */

else if(
    question.includes("học bổng")
){

    if(scholarship){

        answer =
        `Bạn đủ điều kiện xét học bổng.\n`+
        `GPA hiện tại: ${GPA.toFixed(2)}/4.0`;

    }else{

        answer =
        `Bạn chưa đủ điều kiện học bổng.\n`+
        `GPA hiện tại: ${GPA.toFixed(2)}/4.0`;
    }
}

/* HỌC LẠI */

else if(
    question.includes("học lại") ||
    question.includes("trượt")
){

    if(failedSubjects.length){

        answer =
        "Các môn cần học lại:\n- " +
        failedSubjects.join("\n- ");

    }else{

        answer =
        "Hiện tại không có môn nào phải học lại.";
    }
}

/* MÔN YẾU */

else if(
    question.includes("môn yếu") ||
    question.includes("yếu")
){

    if(weakSubjects.length){

        answer =
        "Các môn nên cải thiện:\n- " +
        weakSubjects.join("\n- ");

    }else{

        answer =
        "Không có môn yếu đáng lo ngại.";
    }
}

/* TÍN CHỈ */

else if(
    question.includes("tín chỉ")
){

    answer =
    `Bạn đã tích lũy ${totalCredit} tín chỉ.`;
}

/* CẢNH BÁO HỌC VỤ */

else if(
    question.includes("cảnh báo") ||
    question.includes("học vụ")
){

    if(GPA < 2){

        answer =
        `GPA hiện tại ${GPA.toFixed(2)}.\n`+
        `Bạn có nguy cơ bị cảnh báo học vụ.`;

    }else{

        answer =
        `GPA hiện tại ${GPA.toFixed(2)}.\n`+
        `Bạn không nằm trong diện cảnh báo học vụ.`;
    }
}

/* ĐIỂM CAO NHẤT */

else if(
    question.includes("cao nhất") ||
    question.includes("giỏi nhất")
){

    let best = rows[0];

    rows.forEach(r=>{

        if(Number(r.total) > Number(best.total))
            best = r;

    });

    answer =
    `Môn có điểm cao nhất:\n`+
    `${best.subject} (${best.total})`;
}

/* ĐIỂM THẤP NHẤT */

else if(
    question.includes("thấp nhất")
){

    let worst = rows[0];

    rows.forEach(r=>{

        if(Number(r.total) < Number(worst.total))
            worst = r;

    });

    answer =
    `Môn có điểm thấp nhất:\n`+
    `${worst.subject} (${worst.total})`;
}

/* TƯ VẤN CẢI THIỆN */

else if(
    question.includes("cải thiện") ||
    question.includes("nâng điểm")
){

    if(weakSubjects.length){

        answer =
        "Bạn nên tập trung cải thiện:\n- " +
        weakSubjects.join("\n- ");

    }else{

        answer =
        "Kết quả học tập khá tốt, chưa có môn cần cải thiện nhiều.";
    }
}



      app.put("/student-semester/:id",(req,res)=>{

    const id=req.params.id;

    const {
        current_semester
    }=req.body;

    db.query(

        `
        UPDATE users
        SET current_semester=?
        WHERE id=?
        `,

        [
            current_semester,
            id
        ],

        err=>{

            if(err){

                return res.status(500).json({
                    msg:err.message
                });

            }

            res.json({
                msg:"Đã cập nhật học kỳ"
            });

        }

    );

});

  
  
/* KỲ TỚI HỌC GÌ */

else if(
    question.includes("kỳ tới") ||
    question.includes("đăng ký môn") ||
    question.includes("môn nào")
){

const nextSemester =
Number(semester) + 1;

db.query(
`
SELECT *
FROM curriculum
ORDER BY semester,id
`,
(err,plannedRows)=>{

        if(err){

          return res.json({
            advice:"Không lấy được môn dự kiến."
          });
        }

        if(plannedRows.length === 0){

          return res.json({
            advice:
            `Chưa có dữ liệu môn mở cho học kỳ ${nextSemester}.`
          });
        }

const passedSubjects = [];
const failedSubjects = [];
const studiedSubjects=[];

rows.forEach(r=>{

    studiedSubjects.push(r.subject_code);

    if(Number(r.total)>=5){

        passedSubjects.push(r.subject_code);

    }else{

        failedSubjects.push(r.subject_code);

    }

});
rows.forEach(r=>{

  if(Number(r.total) >= 5){

    passedSubjects.push(
      r.subject
    );

  }else{

    failedSubjects.push(
      r.subject
    );

  }

});

        let canLearn = [];
let prioritySubjects=[];

let normalSubjects=[];

let improveSubjects=[];

let cannotLearn=[];

let totalCredit=0;


plannedRows.forEach(subject=>{

    const code=subject.subject_code;

    const credit=Number(subject.credit);

    const opens=
    subject.open_semester
    .split(",");

    // kỳ hiện tại có mở không

    if(
        !opens.includes(String(nextSemester))
    ){
        return;
    }

    //------------------------------------------------
    // 1. MÔN TIÊN QUYẾT CHƯA HỌC
    //------------------------------------------------

    if(subject.prerequisite_subject){

        if(
            !passedSubjects.includes(
                subject.prerequisite_subject
            )
        ){

            cannotLearn.push(subject);

            return;
        }
    }

    //------------------------------------------------
    // 2. CHƯA HỌC BAO GIỜ
    //------------------------------------------------

    if(
        !studiedSubjects.includes(code)
    ){

        normalSubjects.push(subject);

        return;
    }

    //------------------------------------------------
    // 3. HỌC RỒI NHƯNG ĐIỂM THẤP
    //------------------------------------------------

    const score=
    rows.find(r=>r.subject_code==code);

    if(score && score.total<6.5){

        improveSubjects.push(subject);

    }

});


let recommend=[];

recommend=[
    ...prioritySubjects,
    ...normalSubjects,
    ...improveSubjects
];


let finalRecommend=[];

let creditSum=0;

recommend.forEach(sub=>{

    if(
        creditSum+Number(sub.credit)<=22
    ){

        finalRecommend.push(sub);

        creditSum+=Number(sub.credit);

    }

});
  

        

        let answer ="";


        if(retakeSubjects.length){

  answer +=
  "Các môn nên học lại:\n- " +
  retakeSubjects.join("\n- ");

  answer += "\n\n";
}


        answer +=
`Các môn có thể đăng ký HK${nextSemester}:\n`;

        if(canLearn.length){

answer="";

answer+="Đề xuất đăng ký:\n\n";

finalRecommend.forEach(sub=>{

    answer+=
    `• ${sub.subject_code} - ${sub.subject_name}
(${sub.credit} TC)\n`;

});

answer+=
`\nTổng số tín chỉ: ${creditSum}`;

          answer+="\n\nLý do đề xuất:\n";

answer+="- Hoàn thành môn tiên quyết trước\n";

answer+="- Ưu tiên môn chưa học\n";

answer+="- Sau đó cải thiện các môn điểm thấp\n";

answer+="- Không vượt quá 22 tín chỉ";

        }else{

          answer +=
          "Chưa có môn nào đủ điều kiện.";
        }

        if(cannotLearn.length){

          answer +=
          "\n\nCác môn chưa đủ điều kiện:\n- " +
          cannotLearn.join("\n- ");
        }

        return res.json({
          advice: answer
        });

      }
    );

    return;
}

/* TỐT NGHIỆP */

else if(
    question.includes("tốt nghiệp")
){

    const needCredit = 136;

    const remain =
    needCredit - totalCredit;

    answer =
    `Đã tích lũy ${totalCredit}/${needCredit} tín chỉ.\n`+
    `Còn thiếu ${remain} tín chỉ để tốt nghiệp.`;
}

/* NGHỀ NGHIỆP */

else if(
    question.includes("nghề") ||
    question.includes("việc làm")
){

    answer =
    `Dựa trên kết quả học tập hiện tại, bạn có thể định hướng:\n`+
    `- Backend Developer\n`+
    `- Data Analyst\n`+
    `- AI Engineer`;
}

/* TỔNG QUAN */

else{

    answer =
    `Tổng số môn: ${rows.length}\n`+
    `GPA: ${GPA.toFixed(2)}/4.0\n`+
    `Tín chỉ: ${totalCredit}\n`+
    `Môn trượt: ${failedSubjects.length}\n`+
    `Học bổng: ${
        scholarship
        ? "Đủ điều kiện"
        : "Chưa đủ điều kiện"
    }`;

    if(weakSubjects.length){

        answer +=
        "\nMôn cần cải thiện:\n- " +
        weakSubjects.join("\n- ");
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

