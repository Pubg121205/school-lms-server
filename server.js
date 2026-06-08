const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

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
    console.log("MYSQL ERROR:", err);
  } else {
    console.log("MYSQL CONNECTED");
    conn.release();
  }

});

app.get("/", (req, res) => {
  res.send("LMS Server Running");
});

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
