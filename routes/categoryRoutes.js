import express from "express";
import multer from "multer";
import {
  addCategory,
  updateCategory,
  deleteCategory,
  searchCategory,
  getCategories
} from "../controllers/categoryController.js";
import { adminAuth } from "../middlewares/authMiddleware.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// Expect named fields so controller can use req.files.image / req.files.audio
const categoryUpload = upload.fields([
  { name: "image", maxCount: 1 },
  { name: "audio", maxCount: 1 },
]);

router.post("/", adminAuth, categoryUpload, addCategory);
router.put("/:id", adminAuth, categoryUpload, updateCategory);

router.delete("/:id", adminAuth, deleteCategory);
router.get("/search", searchCategory);
router.get("/", getCategories);  
export default router;
