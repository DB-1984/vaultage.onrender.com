import express from "express";
import { register, login, logout } from "../controllers/authController.js";
import { protect } from "../middleware/protect.js";

const router = express.Router();

router.get("/test", (req, res) => res.send("Auth router is alive"));
router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);

export default router;
