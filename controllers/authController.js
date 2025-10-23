import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

/**
 * Admin Login (uses credentials from .env)
 * POST /api/auth/admin-login
 */
export const adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password)
      return res.status(400).json({ message: "Username and password required" });

    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (username !== adminUsername)
      return res.status(401).json({ message: "Invalid credentials" });

    // Compare hashed passwords (optional, if you store hashed)
    const isMatch = password === adminPassword;
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ role: "admin", username }, process.env.JWT_SECRET, {
      expiresIn: "2h",
    });

    res.json({
      success: true,
      message: "Admin logged in successfully",
      token,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error during login" });
  }
};

/**
 * Admin Logout
 * POST /api/auth/logout
 */
export const adminLogout = async (req, res) => {
  try {
    // Since JWT is stateless, logout is client-side (just discard token)
    res.json({ success: true, message: "Admin logged out successfully" });
  } catch (err) {
    res.status(500).json({ message: "Logout error" });
  }
};
