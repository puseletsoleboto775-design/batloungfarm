const { pool } = require("../config/database");
const { tokenFor, checkPassword, hashPassword } = require("../middleware/auth");

const login = async (req,res,next) => {
  try {
    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "");
    if (!username || !password) return res.status(400).json({success:false,message:"Enter your username and password."});
    const [rows] = await pool.execute("SELECT user_id,username,password_hash,role,active FROM users WHERE username=? LIMIT 1",[username]);
    const user = rows[0];
    if (!user || !user.active || !checkPassword(password,user.password_hash))
      return res.status(401).json({success:false,message:"Incorrect username or password."});
    res.json({success:true,token:tokenFor(user),user:{id:user.user_id,username:user.username,role:user.role}});
  } catch(e){ next(e); }
};
const createUser = async (req,res,next) => {
  try {
    const username=String(req.body.username||"").trim();
    const password=String(req.body.password||"");
    const role=String(req.body.role||"").toUpperCase();
    if(username.length<3 || password.length<8 || !["ADMIN","SALES"].includes(role))
      return res.status(400).json({success:false,message:"Username must be at least 3 characters, password at least 8 characters, and role must be ADMIN or SALES."});
    await pool.execute("INSERT INTO users(username,password_hash,role) VALUES(?,?,?)",[username,hashPassword(password),role]);
    res.status(201).json({success:true,message:"User created."});
  } catch(e){ if(e.code==="ER_DUP_ENTRY") return res.status(409).json({success:false,message:"That username already exists."}); next(e); }
};
const listUsers = async (_req,res,next) => {
  try { const [rows]=await pool.query("SELECT user_id AS id,username,role,active,created_at FROM users ORDER BY user_id"); res.json({success:true,data:rows}); } catch(e){next(e);}
};
module.exports={login,createUser,listUsers};
