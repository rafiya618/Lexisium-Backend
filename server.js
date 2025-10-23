import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import wordRoutes from "./routes/wordRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import { errorHandler } from "./middlewares/errorMiddleware.js";

dotenv.config();
connectDB();

const app = express();

app.use(cors({
  origin: "*",  // frontend URL
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/words", wordRoutes);

// Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
