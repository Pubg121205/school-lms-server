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

// ADD SUBJECT
app.post("/api/admin/score",(req,res)=>{
  db.query(
    "INSERT INTO scores (user_id,semester,subject,credit,attendance,mid,final) VALUES (?,?,?,?,?,?,?)",
    Object.values(req.body),
    ()=>res.json({msg:"Đã thêm môn"})
  );
});

app.listen(PORT,()=>console.log("Server OK"));
