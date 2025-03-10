import express from "express";
import { authenticateToken } from "../middlewares/auth.js";
const router = express.Router();
router.get("/", (req, res) => {
  res.send("User Route is working");
});
router.get("/profile", authenticateToken, (req, res) => {
  res.send(req.user);
});
export default router;
