import express from "express";
import { signToken, verifyToken } from "../utils/jwt.js";
import User from "../models/User.js";
import admin from "../config/firebase-admin.config.js";

const router = express.Router();

router.post("/google", async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ message: "ID token is required" });
    }
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    console.log(decodedToken);

    let user = await User.findOne({ email: decodedToken.email });
    if (!user) {
      user = new User({
        email: decodedToken.email,
        name: decodedToken.name,
        profilePicture: decodedToken.picture,
      });
      await user.save();
      console.log("New user created:", user);
    }
    const token = signToken({
      userId: user._id,
    });

    res.send({
      message: "Authentication successful",
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    console.error("Google sign-in error:", error);
    res.status(500).json({
      message: "Authentication failed",
      error: error.message,
    });
  }
});

router.post("/logout", (req, res) => {
  res.status(200).json({ message: "Logged out successfully" });
});

export default router;
