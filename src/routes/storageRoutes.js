import express from "express";
import { protect } from "../middleware/protect.js";
import { storageHealth } from "../controllers/storageController.js";

const router = express.Router();

router.get("/health", protect, storageHealth);

export default router;
