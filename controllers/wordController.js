import Word from "../models/Word.js";
import { uploadMedia } from "../utils/upload.js";
import cloudinary from "../config/cloudinary.js";

// Helper function to extract public ID from Cloudinary URL
const getCloudinaryPublicId = (url) => {
  if (!url) return null;
  try {
    // Extract public ID from Cloudinary URL
    // Example URL: https://res.cloudinary.com/dacmd7jzc/image/upload/v1234567/pashto_dict/filename.jpg
    const urlParts = url.split('/');
    const uploadIndex = urlParts.findIndex(part => part === 'upload');
    if (uploadIndex !== -1 && urlParts.length > uploadIndex + 2) {
      // Get the part after version (v1234567) which contains folder/filename
      let publicId = urlParts.slice(uploadIndex + 2).join('/');
      // Remove file extension
      publicId = publicId.replace(/\.[^/.]+$/, "");
      return publicId;
    }
    return null;
  } catch (error) {
    console.error("Error extracting public ID from URL:", url, error);
    return null;
  }
};

export const addWord = async (req, res, next) => {
  try {
    console.log("addWord - Request body:", req.body);
    console.log("addWord - Request files:", req.files);
    
    const { word, translation, category, description } = req.body;
    if (!word || !category) return res.status(400).json({ message: "Word and category required" });

    let imageUrl = null, audioUrl = null;
    
    if (req.files?.image) {
      console.log("Processing image file:", req.files.image[0]);
      try {
        imageUrl = await uploadMedia(req.files.image[0].path, "image");
        console.log("Image uploaded successfully:", imageUrl);
      } catch (imgError) {
        console.error("Image upload error:", imgError);
        return res.status(400).json({ 
          success: false, 
          message: `Image upload failed: ${imgError.message}` 
        });
      }
    }
    
    if (req.files?.audio) {
      console.log("Processing audio file:", req.files.audio[0]);
      try {
        audioUrl = await uploadMedia(req.files.audio[0].path, "audio");
        console.log("Audio uploaded successfully:", audioUrl);
      } catch (audioError) {
        console.error("Audio upload error:", audioError);
        return res.status(400).json({ 
          success: false, 
          message: `Audio upload failed: ${audioError.message}` 
        });
      }
    }

    const newWord = await Word.create({
      word,
      translation: JSON.parse(translation),
      category,
      description,
      image: imageUrl,
      audio: audioUrl,
    });

    console.log("Word created successfully:", newWord);
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

    console.log("deleteWord - Deleting word:", word.word);
    console.log("deleteWord - Image URL:", word.image);
    console.log("deleteWord - Audio URL:", word.audio);

    // Delete from Cloudinary using public IDs
    if (word.image) {
      const imagePublicId = getCloudinaryPublicId(word.image);
      console.log("deleteWord - Image public ID:", imagePublicId);
      if (imagePublicId) {
        try {
          const imageResult = await cloudinary.uploader.destroy(imagePublicId, { resource_type: "image" });
          console.log("deleteWord - Image deletion result:", imageResult);
        } catch (error) {
          console.error("deleteWord - Error deleting image:", error);
        }
      }
    }

    if (word.audio) {
      const audioPublicId = getCloudinaryPublicId(word.audio);
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

    await word.deleteOne();
    console.log("deleteWord - Word deleted from database successfully");
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

    // If translation is sent as JSON string (from FormData)
    if (updateData.translation && typeof updateData.translation === "string") {
      updateData.translation = JSON.parse(updateData.translation);
    }

    // Handle image update
    if (req.files?.image) {
      const newImagePath = req.files.image[0].path;

      // Delete old image if exists
      if (existingWord.image) {
        const publicId = getCloudinaryPublicId(existingWord.image);
        if (publicId) {
          await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
        }
      }

      const uploadedImage = await uploadMedia(newImagePath, "image");
      updateData.image = uploadedImage;
    }

    // Handle audio update
    if (req.files?.audio) {
      const newAudioPath = req.files.audio[0].path;

      // Delete old audio if exists
      if (existingWord.audio) {
        const publicId = getCloudinaryPublicId(existingWord.audio);
        if (publicId) {
          await cloudinary.uploader.destroy(publicId, { resource_type: "video" });
        }
      }

      const uploadedAudio = await uploadMedia(newAudioPath, "audio");
      updateData.audio = uploadedAudio;
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
        { word: new RegExp(query, "i") },
        { "translation.english": new RegExp(query, "i") },
        { "translation.urdu": new RegExp(query, "i") },
        { "translation.roman": new RegExp(query, "i") },
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
