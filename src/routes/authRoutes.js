const router=require("express").Router();
const controller=require("../controllers/authController");
const {requireAuth,requireAdmin}=require("../middleware/auth");
router.post("/login",controller.login);
router.get("/users",requireAuth,requireAdmin,controller.listUsers);
router.post("/users",requireAuth,requireAdmin,controller.createUser);
module.exports=router;
