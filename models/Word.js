import mongoose from "mongoose";

const meaningSchema = new mongoose.Schema(
  {
    language: {
      type: String, // e.g. "english", "urdu", "roman"
      required: true,
    },
    value: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const dialectWordSchema = new mongoose.Schema(
  {
    word: { type: String, required: true },

    dialect: {
      type: String, // e.g. "Yousafzai", "Kandahari", etc.
      required: true,
    },

    meanings: {
      type: [meaningSchema],
      validate: v => v.length > 0,
    },

    audio: { type: String },
    description: { type: String },
  },
  { _id: false }
);

const wordSchema = new mongoose.Schema(
  {
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },

    words: {
      type: [dialectWordSchema],
      validate: v => v.length > 0,
    },

    status: {
      type: String,
      enum: ["Approved", "Hidden", "Pending"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Word", wordSchema);
