import Word from "../models/Word.js";
import { uploadMedia } from "../utils/upload.js";
import cloudinary from "../config/cloudinary.js";

// Helper function to extract Cloudinary public ID from a secure URL
// Handles URLs with or without transformation segments, e.g.:
// - https://res.cloudinary.com/<cloud>/image/upload/v1234567/pashto_dict/file.mp3
// - https://res.cloudinary.com/<cloud>/image/upload/q_auto,f_auto/v1234567/pashto_dict/file.mp3
const getCloudinaryPublicId = (url) => {
  if (!url) return null;
  try {
    const uploadSplit = url.split("/upload/");
    if (uploadSplit.length < 2) return null;

    const afterUpload = uploadSplit[1];
    const segments = afterUpload.split("/");

    // Remove leading transformation and version segments
    const cleanedSegments = [];
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      if (cleanedSegments.length === 0) {
        const isVersion = /^v\d+$/.test(segment);
        const isTransform = segment.includes(",");
        if (isVersion || isTransform) {
          continue;
        }
      }
      cleanedSegments.push(segment);
    }

    if (cleanedSegments.length === 0) return null;

    let publicId = cleanedSegments.join("/");
    publicId = publicId.replace(/\.[^/.]+$/, "");
    return publicId;
  } catch (error) {
    console.error("Error extracting public ID from URL:", url, error);
    return null;
  }
};

export const addWord = async (req, res, next) => {
  try {
    console.log("addWord - Request body:", req.body);
    console.log("addWord - Request files:", req.files);
    
    const { category, words } = req.body;
    if (!category || !words) {
      return res.status(400).json({ message: "Category and words required" });
    }

    let parsedWords = words;
    if (typeof words === "string") {
      parsedWords = JSON.parse(words);
    }

    // Process each dialect word to handle media uploads
    const processedWords = [];
    if (req.files && req.files.length > 0) {
      const filesByIndex = {};
      
      // Group files by their word index
      // req.files is an array from multer with upload.any()
      req.files.forEach(file => {
        const fieldName = file.fieldname;
        const match = fieldName.match(/(\w+)\[(\d+)\]/);
        if (match) {
          const [, mediaType, index] = match;
          if (!filesByIndex[index]) filesByIndex[index] = {};
          if (!filesByIndex[index][mediaType]) {
            filesByIndex[index][mediaType] = [];
          }
          filesByIndex[index][mediaType].push(file);
        }
      });

      for (let i = 0; i < parsedWords.length; i++) {
        const wordObj = { ...parsedWords[i] };
        
        if (filesByIndex[i]) {
          if (filesByIndex[i].audio && filesByIndex[i].audio.length > 0) {
            try {
              wordObj.audio = await uploadMedia(filesByIndex[i].audio[0].path, "audio");
              console.log("Audio uploaded for word", i, ":", wordObj.audio);
            } catch (audioError) {
              console.error("Audio upload error for word", i, ":", audioError);
              return res.status(400).json({ success: false, message: `Audio upload failed for word ${i}: ${audioError.message}` });
            }
          }
        }
        
        processedWords.push(wordObj);
      }
    } else {
      processedWords.push(...parsedWords);
    }

    const newWord = await Word.create({
      category,
      words: processedWords,
      status: "Pending",
    });

    console.log("Word document created successfully:", newWord);
    res.status(201).json({ success: true, word: newWord });
  } catch (err) {
    console.error("addWord - Unexpected error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Server Error"
    });
  }
};

export const deleteWord = async (req, res, next) => {
  try {
    const { id } = req.params;
    const word = await Word.findById(id);
    if (!word) return res.status(404).json({ message: "Word not found" });

    console.log("deleteWord - Deleting word document:", word._id);

    // Delete audio files from Cloudinary for each dialect word
    if (word.words && word.words.length > 0) {
      for (const dialectWord of word.words) {
        if (dialectWord.audio) {
          const audioPublicId = getCloudinaryPublicId(dialectWord.audio);
          console.log("deleteWord - Audio public ID:", audioPublicId);
          if (audioPublicId) {
            try {
              const audioResult = await cloudinary.uploader.destroy(audioPublicId, { resource_type: "video" });
              console.log("deleteWord - Audio deletion result:", audioResult);
            } catch (error) {
              console.error("deleteWord - Error deleting audio:", error);
            }
          }
        }
      }
    }

    await word.deleteOne();
    console.log("deleteWord - Word document deleted from database successfully");
    res.json({ success: true, message: "Word and associated files deleted successfully" });
  } catch (err) {
    console.error("deleteWord - Error:", err);
    next(err);
  }
};

export const getPendingWords = async (req, res, next) => {
  try {
    const pending = await Word.find({ status: "Pending" }).populate("category");
    res.json({ success: true, words: pending });
  } catch (err) {
    next(err);
  }
};

export const approveWord = async (req, res, next) => {
  try {
    const { id } = req.params;
    const word = await Word.findByIdAndUpdate(id, { status: "Approved" }, { new: true });
    if (!word) return res.status(404).json({ message: "Word not found" });
    res.json({ success: true, word });
  } catch (err) {
    next(err);
  }
};

export const hideWord = async (req, res, next) => {
  try {
    const { id } = req.params;
    const word = await Word.findByIdAndUpdate(id, { status: "Hidden" }, { new: true });
    if (!word) return res.status(404).json({ message: "Word not found" });
    res.json({ success: true, word });
  } catch (err) {
    next(err);
  }
};

export const moveWord = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newCategory } = req.body;
    const word = await Word.findByIdAndUpdate(
      id,
      { category: newCategory, status: "Approved" },
      { new: true }
    );
    if (!word) return res.status(404).json({ message: "Word not found" });
    res.json({ success: true, word });
  } catch (err) {
    next(err);
  }
};

export const updateWord = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existingWord = await Word.findById(id);
    if (!existingWord) return res.status(404).json({ message: "Word not found" });

    let updateData = { ...req.body };

    // If words is sent as JSON string (from FormData)
    if (updateData.words && typeof updateData.words === "string") {
      updateData.words = JSON.parse(updateData.words);
    }

    // Handle audio updates for dialect words
    if (req.files && req.files.length > 0 && updateData.words) {
      const filesByIndex = {};
      
      // Group files by their word index
      // req.files is an array from multer with upload.any()
      req.files.forEach(file => {
        const fieldName = file.fieldname;
        const match = fieldName.match(/(\w+)\[(\d+)\]/);
        if (match) {
          const [, mediaType, index] = match;
          if (!filesByIndex[index]) filesByIndex[index] = {};
          if (!filesByIndex[index][mediaType]) {
            filesByIndex[index][mediaType] = [];
          }
          filesByIndex[index][mediaType].push(file);
        }
      });

      for (let i = 0; i < updateData.words.length; i++) {
        if (filesByIndex[i] && filesByIndex[i].audio && filesByIndex[i].audio.length > 0) {
          // Delete old audio if exists
          if (existingWord.words[i] && existingWord.words[i].audio) {
            const publicId = getCloudinaryPublicId(existingWord.words[i].audio);
            if (publicId) {
              try {
                await cloudinary.uploader.destroy(publicId, { resource_type: "video" });
              } catch (error) {
                console.error("Error deleting old audio:", error);
              }
            }
          }

          try {
            const uploadedAudio = await uploadMedia(filesByIndex[i].audio[0].path, "audio");
            updateData.words[i].audio = uploadedAudio;
          } catch (audioError) {
            console.error("Audio upload error for word", i, ":", audioError);
            return res.status(400).json({ success: false, message: `Audio upload failed for word ${i}: ${audioError.message}` });
          }
        }
      }
    }

    const updatedWord = await Word.findByIdAndUpdate(id, updateData, { new: true });
    res.json({ success: true, word: updatedWord });
  } catch (err) {
    console.error("updateWord error:", err);
    next(err);
  }
};


export const getWords = async (req, res, next) => {
  try {
    const words = await Word.find().populate("category");
    res.json({ success: true, words });
  } catch (err) {
    next(err);
  }
};

export const getApprovedWords = async (req, res, next) => {
  try {
    const words = await Word.find({ status: "Approved" }).populate("category");
    res.json({ success: true, words });
  } catch (err) {
    next(err);
  }
};

export const getHiddenWords = async (req, res, next) => {
  try {
    const words = await Word.find({ status: "Hidden" }).populate("category");
    res.json({ success: true, words });
  } catch (err) {
    next(err);
  }
};

export const searchWord = async (req, res, next) => {
  try {
    const { query } = req.query;
    const words = await Word.find({
      $or: [
        { "words.word": new RegExp(query, "i") },
        { "words.meanings.value": new RegExp(query, "i") },
      ],
    }).populate("category");
    res.json({ success: true, words });
  } catch (err) {
    next(err);
  }
};

export const getWordsByCategory = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const words = await Word.find({ 
      category: categoryId,
      status: "Approved" 
    }).populate("category");
    
    res.json({ success: true, words });
    console.log(words);
  } catch (err) {
    next(err);
  }
};
