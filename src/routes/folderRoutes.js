import express from "express";
import { protect } from "../middleware/protect.js";
import {
  createFolder,
  getFolderContent,
  updateFolder,
  deleteFolder,
} from "../controllers/folderController.js";

const router = express.Router();
/* DISABLED FOR DEMO
router.post("/", protect, createFolder);
router.delete("/:id", protect, deleteFolder);
router.patch("/:id", protect, updateFolder);
*/
router.get("/content", protect, getFolderContent);

export default router;
