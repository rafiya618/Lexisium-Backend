import Category from "../models/Category.js";
import { uploadMedia } from "../utils/upload.js";
import cloudinary from "../config/cloudinary.js";

// Helper function to extract public ID from Cloudinary URL
const getCloudinaryPublicId = (url) => {
  if (!url) return null;
  try {
    // Extract public ID from Cloudinary URL
    const urlParts = url.split('/');
    const uploadIndex = urlParts.findIndex(part => part === 'upload');
    if (uploadIndex !== -1 && urlParts.length > uploadIndex + 2) {
      let publicId = urlParts.slice(uploadIndex + 2).join('/');
      publicId = publicId.replace(/\.[^/.]+$/, "");
      return publicId;
    }
    return null;
  } catch (error) {
    console.error("Error extracting public ID from URL:", url, error);
    return null;
  }
};

export const addCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: "Category name required" });

    const existing = await Category.findOne({ name });
    if (existing) return res.status(400).json({ message: "Category already exists" });

    let imageUrl = null;
    if (req.file) imageUrl = await uploadMedia(req.file.path, "image");

    const category = await Category.create({ name, description, image: imageUrl });
    res.status(201).json({ success: true, category });
  } catch (err) {
    next(err);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    // Find the category first
    const category = await Category.findById(id);
    if (!category) return res.status(404).json({ message: "Category not found" });

    let imageUrl = category.image;

    // If a new image is uploaded
    if (req.file) {
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
      imageUrl = await uploadMedia(req.file.path, "image");
    }

    const updated = await Category.findByIdAndUpdate(
      id,
      { name, description, image: imageUrl },
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

    console.log("deleteCategory - Deleting category:", category.name);
    console.log("deleteCategory - Image URL:", category.image);

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
          // Continue with category deletion even if image deletion fails
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
    const categories = await Category.find({ name: new RegExp(query, "i") });
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

