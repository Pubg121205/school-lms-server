
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
open_semesters,
prerequisite_subject,
is_required
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
    subject_code,
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
    subject_code,
    subject,
    credit,
    attendance,
    mid,
    final,
    total
)
VALUES (?,?,?,?,?,?,?,?,?)
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

//////

app.get("/curriculum/:semester",(req,res)=>{

    const semester=req.params.semester;

    db.query(
        `
        SELECT *
        FROM curriculum
        WHERE semester=?
        ORDER BY subject_code
        `,
        [semester],
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

  
  app.post("/scores", (req, res) => {

    const {
        student_id,
        semester,
        subject_code,
        subject_name,
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
            student_id,
            semester,
            subject_code,
            subject,
            credit,
            attendance,
            mid,
            final,
            total
        )
        VALUES(?,?,?,?,?,?,?,?,?)
        `,
        [
            student_id,
            semester,
            subject_code,
            subject_name,
            credit,
            attendance,
            mid,
            final,
            total
        ],
        (err) => {

            if(err){

                return res.status(500).json({
                    msg: err.message
                });

            }

            res.json({
                msg:"Đã thêm môn"
            });

        }

    );

});
/////

/* AI ADVICE */

app.get("/advice/:userId/:semester", (req, res) => {

  const { userId, semester } = req.params;
  const question = (req.query.q || "").toLowerCase();

  db.query(
    `
SELECT *
FROM scores
WHERE student_id=?
ORDER BY semester
    
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

///////

/* KỲ TỚI HỌC GÌ */

else if(
    question.includes("kỳ tới") ||
    question.includes("đăng ký môn") ||
    question.includes("môn nào")
){

    db.query(
        `
        SELECT current_semester
        FROM users
        WHERE id=?
        `,
        [userId],
        (err,userRows)=>{

            if(err){
                return res.json({
                    advice:"Không lấy được học kỳ hiện tại."
                });
            }

            const currentSemester =
                Number(userRows[0].current_semester);

            const nextSemester =
                currentSemester + 1;

            db.query(
                `
                SELECT *
                FROM curriculum
                ORDER BY semester,id
                `,
                (err,plannedRows)=>{

                    if(err){

                        return res.json({
                            advice:"Không lấy được chương trình đào tạo."
                        });

                    }

                    if(plannedRows.length===0){

                        return res.json({
                            advice:"Chưa có dữ liệu CTĐT."
                        });

                    }

                    //==========================
                    // MÔN ĐÃ HỌC
                    //==========================

                    let passedCodes=[];
                    let failedCodes=[];
                    let weakCodes=[];

                    rows.forEach(r=>{

                        if(Number(r.total)>=5){

                            passedCodes.push(r.subject_code);

                        }else{

                            failedCodes.push(r.subject_code);

                        }

                        if(
                            Number(r.total)>=5 &&
                            Number(r.total)<7
                        ){
                            weakCodes.push(r.subject_code);
                        }

                    });

                    //==========================
                    // DANH SÁCH ĐỀ XUẤT
                    //==========================

                    let prioritySubjects=[];
                    let normalSubjects=[];
                    let improveSubjects=[];
                    let cannotLearn=[];
                    let retakeSubjects=[];

                    plannedRows.forEach(subject=>{

                        // HK tới có mở không
                        const openList =
                            subject.open_semesters
                            ? subject.open_semesters.split(",")
                            : [];

                        if(
                            !openList.includes(
                                String(nextSemester)
                            )
                        ){
                            return;
                        }

                        // Đã qua rồiif(
    passedCodes.includes(subject.subject_code)
){

    // điểm thấp thì học cải thiện
    if(
        weakCodes.includes(subject.subject_code)
    ){

        improveSubjects.push(subject);

    }

    return;

}

                        // Học lại
                        if(
                            failedCodes.includes(subject.subject_code)
                        ){

                            prioritySubjects.push(subject);

                            retakeSubjects.push(subject.subject_name);
                            return;

                        }

                        // Môn còn nợ
                        if(
                            Number(subject.semester)<currentSemester
                        ){

                            prioritySubjects.push(subject);
                            return;

                        }

                        // Có tiên quyết
if(subject.prerequisite_subject){

    const preList =
        subject.prerequisite_subject
        .split(",");

    const ok =
        preList.every(code =>
            passedCodes.includes(code.trim())
        );

    if(!ok){

        cannotLearn.push(subject);
        return;

    }

}

                        normalSubjects.push(subject);

                    });

                    //==========================
                    // GHÉP DANH SÁCH
                    //==========================

let recommend=[];

recommend.push(...prioritySubjects);

recommend.push(...normalSubjects);

recommend.push(...improveSubjects);

                    //==========================
                    // GIỚI HẠN 22 TC
                    //==========================

let finalRecommend=[];

let creditSum=0;

for(const subject of recommend){

    const tc=Number(subject.credit);

    if(creditSum+tc>22){

        continue;

    }

    finalRecommend.push(subject);

    creditSum+=tc;

}

                    //==========================
                    // TẠO CÂU TRẢ LỜI
                    //==========================

                    let answer=
`Đề xuất đăng ký học kỳ ${nextSemester}

`;
                  if(retakeSubjects.length){

    answer+="Các môn nên học lại:\n";

    retakeSubjects.forEach(name=>{

        answer+="• "+name+"\n";

    });

    answer+="\n";

}

                    if(finalRecommend.length){

                        finalRecommend.forEach(subject=>{

                            answer+=
`• ${subject.subject_code}
- ${subject.subject_name}
(${subject.credit} tín chỉ)

`;

                        });

                        answer+=
`Tổng tín chỉ: ${creditSum}/22

`;

                        answer+=
`Lý do đề xuất:
- Ưu tiên môn còn nợ.
- Ưu tiên học lại môn trượt.
- Hoàn thành môn tiên quyết.
- Sau đó học các môn đúng CTĐT.
- Cuối cùng mới học cải thiện.
`;

                    }else{

                        answer+="Không có môn phù hợp.\n";

                    }

                    if(cannotLearn.length){

                        answer+="\nCác môn chưa đủ điều kiện:\n";

                        cannotLearn.forEach(subject=>{

answer+=
`• ${subject.subject_code} - ${subject.subject_name}
Thiếu tiên quyết:
${subject.prerequisite_subject}

`;

                        });

                    }

                    return res.json({
                        advice:answer
                    });

                }
            );

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

