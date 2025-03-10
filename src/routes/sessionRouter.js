import express from "express";
import { authenticateToken } from "../middlewares/auth.js";
import Session from "../models/Session.js";

const router = express.Router();

router.get("/:sessionId", authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await Session.findById(sessionId).populate(
      "userId",
      "name email"
    ); // Lấy thông tin user

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    res.json(session);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/leaderboard/:quizId", authenticateToken, async (req, res) => {
  try {
    const { quizId } = req.params;

    // Lấy top 10 điểm cao nhất
    const leaderboard = await Session.find({
      quizSetId: quizId,
      status: "ended",
    })
      .sort({ score: -1 }) // Sắp xếp theo điểm giảm dần
      .limit(10)
      .populate("userId", "name email");

    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/active/:quizId", authenticateToken, async (req, res) => {
  try {
    const { quizId } = req.params;
    const userId = req.user._id;

    const session = await Session.findOne({
      quizSetId: quizId,
      userId: userId,
      status: "in-progress",
    }).sort({ lastTimePlay: -1 });

    if (!session) {
      return res.status(404).json({ message: "No active session found" });
    }

    res.json(session);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/", authenticateToken, async (req, res) => {
  try {
    const { quizSetId } = req.body;
    const userId = req.user._id;

    // Đánh dấu các phiên cũ là ended
    await Session.updateMany(
      {
        quizSetId,
        userId,
        status: "in-progress",
      },
      {
        status: "ended",
        dateFinished: new Date(),
      }
    );

    // Tạo phiên mới
    const session = new Session({
      quizSetId,
      userId,
      status: "in-progress",
      lastTimePlay: new Date(),
    });

    await session.save();
    res.status(201).json(session);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.patch("/:sessionId", authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user._id;

    const session = await Session.findOne({
      _id: sessionId,
      userId,
    });

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    Object.assign(session, req.body);

    await session.save();
    res.json(session);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
