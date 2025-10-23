import express from "express";
import multer from "multer";
import {
  addWord,
  deleteWord,
  getWords,
  getApprovedWords,
  getHiddenWords,
  getPendingWords,
  approveWord,
  hideWord,
  moveWord,
  updateWord,
  searchWord,
  getWordsByCategory,
} from "../controllers/wordController.js";
import { adminAuth } from "../middlewares/authMiddleware.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/", upload.fields([{ name: "image" }, { name: "audio" }]), addWord);
router.get("/", getWords);
router.get("/approved", getApprovedWords);
router.get("/hidden", getHiddenWords);
router.delete("/:id", adminAuth, deleteWord);
router.get("/pending", adminAuth, getPendingWords);
router.put("/approve/:id", adminAuth, approveWord);
router.put("/hide/:id", adminAuth, hideWord);
router.put("/move/:id", adminAuth, moveWord);
router.put(
  "/:id",
  adminAuth,
  upload.fields([{ name: "image" }, { name: "audio" }]),
  updateWord
);

router.get("/search", searchWord);
router.get("/category/:categoryId", getWordsByCategory);

export default router;
