import cloudinary from "../config/cloudinary.js";
import fs from "fs";
import path from "path";

export const uploadMedia = async (filePath, type) => {
  try {
    console.log(`uploadMedia - Processing ${type} file: ${filePath}`);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    // Validate file size
    const stats = fs.statSync(filePath);
    const sizeKB = stats.size / 1024;
    
    console.log(`uploadMedia - File size: ${sizeKB}KB`);

    if (type === "image" && sizeKB > 100) {
      throw new Error(`Image size exceeds 100KB limit (current: ${sizeKB.toFixed(2)}KB)`);
    }

    if (type === "audio" && sizeKB > 200) { // 200KB ~ 6 seconds MP3 roughly
      throw new Error(`Audio size exceeds 200KB limit (current: ${sizeKB.toFixed(2)}KB)`);
    }

    console.log(`uploadMedia - Uploading to Cloudinary...`);
    
    const uploadOptions = {
      resource_type: type === "image" ? "image" : "video", // Cloudinary uses 'video' for audio
      folder: "pashto_dict",
    };
    
    // For audio files, add additional options
    if (type === "audio") {
      uploadOptions.resource_type = "video"; // Cloudinary treats audio as video
      // Don't force format conversion, let Cloudinary handle it
      const ext = path.extname(filePath).toLowerCase();
      if (ext === '.webm') {
        uploadOptions.format = "mp3"; // Convert webm to mp3 for better compatibility
      }
    }
    
    const uploadResponse = await cloudinary.uploader.upload(filePath, uploadOptions);
    
    console.log(`uploadMedia - Upload successful: ${uploadResponse.secure_url}`);
    
    // Clean up temp file
    fs.unlinkSync(filePath);
    return uploadResponse.secure_url;
  } catch (err) {
    console.error(`uploadMedia - Error uploading ${type}:`, err.message);
    // Clean up temp file on error
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    throw err;
  }
};
