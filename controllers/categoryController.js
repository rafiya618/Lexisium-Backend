import Category from "../models/Category.js";
import { uploadMedia } from "../utils/upload.js";
import cloudinary from "../config/cloudinary.js";

// Helper function to extract Cloudinary public ID from a secure URL
// Handles URLs with or without transformation segments, e.g.:
// - https://res.cloudinary.com/<cloud>/image/upload/v1234567/pashto_dict/file.jpg
// - https://res.cloudinary.com/<cloud>/image/upload/q_auto,f_auto/v1234567/pashto_dict/file.jpg
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
        // Skip transformation segment(s) like "q_auto,f_auto" and version like "v1234567"
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
    // Remove file extension
    publicId = publicId.replace(/\.[^/.]+$/, "");
    return publicId;
  } catch (error) {
    console.error("Error extracting public ID from URL:", url, error);
    return null;
  }
};

export const addCategory = async (req, res, next) => {
  try {
    const { word, description, translation } = req.body;
    if (!word) return res.status(400).json({ message: "Category word required" });

    const existing = await Category.findOne({ word });
    if (existing) return res.status(400).json({ message: "Category already exists" });

    let imageUrl = null;
    let audioUrl = null;
    
    if (req.files?.image) {
      try {
        imageUrl = await uploadMedia(req.files.image[0].path, "image");
      } catch (imgError) {
        console.error("Image upload error:", imgError);
        return res.status(400).json({ success: false, message: `Image upload failed: ${imgError.message}` });
      }
    }
    
    if (req.files?.audio) {
      try {
        audioUrl = await uploadMedia(req.files.audio[0].path, "audio");
      } catch (audioError) {
        console.error("Audio upload error:", audioError);
        return res.status(400).json({ success: false, message: `Audio upload failed: ${audioError.message}` });
      }
    }

    let parsedTranslation = translation;
    if (translation && typeof translation === "string") {
      parsedTranslation = JSON.parse(translation);
    }

    const category = await Category.create({ 
      word, 
      description, 
      image: imageUrl,
      audio: audioUrl,
      translation: parsedTranslation
    });
    res.status(201).json({ success: true, category });
  } catch (err) {
    next(err);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { word, description, translation } = req.body;

    // Find the category first
    const category = await Category.findById(id);
    if (!category) return res.status(404).json({ message: "Category not found" });

    let imageUrl = category.image;
    let audioUrl = category.audio;

    // If a new image is uploaded
    if (req.files?.image) {
      // Delete old image from Cloudinary if exists
      if (category.image) {
        const oldPublicId = getCloudinaryPublicId(category.image);
        if (oldPublicId) {
          try {
            await cloudinary.uploader.destroy(oldPublicId, { resource_type: "image" });
          } catch (error) {
            console.error("Error deleting old image from Cloudinary:", error);
          }
        }
      }

      // Upload new image
      imageUrl = await uploadMedia(req.files.image[0].path, "image");
    }

    // If a new audio is uploaded
    if (req.files?.audio) {
      // Delete old audio from Cloudinary if exists
      if (category.audio) {
        const oldPublicId = getCloudinaryPublicId(category.audio);
        if (oldPublicId) {
          try {
            await cloudinary.uploader.destroy(oldPublicId, { resource_type: "video" });
          } catch (error) {
            console.error("Error deleting old audio from Cloudinary:", error);
          }
        }
      }

      // Upload new audio
      audioUrl = await uploadMedia(req.files.audio[0].path, "audio");
    }

    let parsedTranslation = translation;
    if (translation && typeof translation === "string") {
      parsedTranslation = JSON.parse(translation);
    }

    const updated = await Category.findByIdAndUpdate(
      id,
      { word, description, image: imageUrl, audio: audioUrl, translation: parsedTranslation },
      { new: true }
    );

    res.json({ success: true, category: updated });
  } catch (err) {
    console.error("Error updating category:", err);
    next(err);
  }
};


export const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);
    if (!category) return res.status(404).json({ message: "Category not found" });

    console.log("deleteCategory - Deleting category:", category.word);
    console.log("deleteCategory - Image URL:", category.image);
    console.log("deleteCategory - Audio URL:", category.audio);

    // Delete image from Cloudinary if exists
    if (category.image) {
      const imagePublicId = getCloudinaryPublicId(category.image);
      console.log("deleteCategory - Image public ID:", imagePublicId);
      if (imagePublicId) {
        try {
          const imageResult = await cloudinary.uploader.destroy(imagePublicId, { resource_type: "image" });
          console.log("deleteCategory - Image deletion result:", imageResult);
          
          if (imageResult.result !== 'ok' && imageResult.result !== 'not found') {
            console.warn("deleteCategory - Unexpected deletion result:", imageResult);
          }
        } catch (error) {
          console.error("deleteCategory - Error deleting image from Cloudinary:", error);
        }
      }
    }

    // Delete audio from Cloudinary if exists
    if (category.audio) {
      const audioPublicId = getCloudinaryPublicId(category.audio);
      console.log("deleteCategory - Audio public ID:", audioPublicId);
      if (audioPublicId) {
        try {
          const audioResult = await cloudinary.uploader.destroy(audioPublicId, { resource_type: "video" });
          console.log("deleteCategory - Audio deletion result:", audioResult);
          
          if (audioResult.result !== 'ok' && audioResult.result !== 'not found') {
            console.warn("deleteCategory - Unexpected deletion result:", audioResult);
          }
        } catch (error) {
          console.error("deleteCategory - Error deleting audio from Cloudinary:", error);
        }
      }
    }

    // Delete category from database
    await Category.findByIdAndDelete(id);
    console.log("deleteCategory - Category deleted from database successfully");
    
    res.json({ 
      success: true, 
      message: "Category and associated files deleted successfully" 
    });
  } catch (err) {
    console.error("deleteCategory - Error:", err);
    next(err);
  }
};

export const searchCategory = async (req, res, next) => {
  try {
    const { query } = req.query;
    const categories = await Category.find({ word: new RegExp(query, "i") });
    res.json({ success: true, categories });
  } catch (err) {
    next(err);
  }
};

export const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find();
    res.json({ success: true, categories });
  } catch (err) {
    next(err);
  }
};

