import mongoose from "mongoose";

const wordSchema = new mongoose.Schema({
  word: { type: String, required: true },
  translation: {
    english: { type: String },
    urdu: { type: String },
    roman: { type: String },
  },
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
  audio: { type: String },
  image: { type: String },
  description: { type: String },
  status: {
    type: String,
    enum: ["Approved", "Hidden", "Pending"],
    default: "Pending",
  },
});

export default mongoose.model("Word", wordSchema);
