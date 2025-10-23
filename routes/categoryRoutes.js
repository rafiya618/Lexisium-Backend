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

router.post("/", adminAuth, upload.single("image"), addCategory);
router.put("/:id", adminAuth, upload.single("image"), updateCategory);

router.delete("/:id", adminAuth, deleteCategory);
router.get("/search", searchCategory);
router.get("/", getCategories);  
export default router;
