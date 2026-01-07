import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
  word: { type: String, required: true, unique: true },

  translation: {
    english: { type: String },
    urdu: { type: String },
    roman: { type: String },
  },

  audio: { type: String },
  image: { type: String },
  description: { type: String },
});

export default mongoose.model("Category", categorySchema);
