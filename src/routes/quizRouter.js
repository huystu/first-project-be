import express from "express";
const router = express.Router();
import QuizSet from "../models/QuizSet.js";
import Question from "../models/Question.js";
import { authenticateToken } from "../middlewares/auth.js";
import User from "../models/User.js";
import { generateQuiz } from "../config/gemini.js";
import mongoose from "mongoose";
import Session from "../models/Session.js";

router.get("/", (req, res) => {
  res.send("Quiz Route is working");
});

router.post("/generate", authenticateToken, async (req, res) => {
  try {
    const { topic, numberOfQuestions, language = "en" } = req.body;
    const creatorId = req.user._id;
    console.log("Creator ID:", creatorId);
    if (!creatorId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const questions = await generateQuiz(topic, numberOfQuestions, language);

    console.log("Generated questions:", JSON.stringify(questions, null, 2));

    if (!Array.isArray(questions)) {
      throw new Error("Generated questions must be an array");
    }

    questions.forEach((q, index) => {
      if (
        !q.question_text ||
        !q.answer_a ||
        !q.answer_b ||
        !q.answer_c ||
        !q.answer_d ||
        !q.correct_answer
      ) {
        throw new Error(
          `Question at index ${index} is missing required fields`
        );
      }
      if (!["A", "B", "C", "D"].includes(q.correct_answer)) {
        throw new Error(
          `Invalid correct_answer "${q.correct_answer}" for question at index ${index}`
        );
      }
    });

    const savedQuestions = await Promise.all(
      questions.map(async (q) => {
        const question = new Question({
          question: q.question_text,
          answer_a: q.answer_a,
          answer_b: q.answer_b,
          answer_c: q.answer_c,
          answer_d: q.answer_d,
          correct_answer: q.correct_answer,
        });
        await question.save();
        return question;
      })
    );

    const quizSet = new QuizSet({
      creator: creatorId,
      title: `Quiz about ${topic}`,
      description: `A generated quiz about ${topic}`,
      questions: savedQuestions.map((q) => q._id),
    });

    await quizSet.save();

    // Return full quiz information including questions
    res.json({
      message: "Quiz generated successfully",
      quizSet: {
        id: quizSet._id,
        title: quizSet.title,
        description: quizSet.description,
        questions: savedQuestions.map((q) => ({
          id: q._id,
          question: q.question,
          answer_a: q.answer_a,
          answer_b: q.answer_b,
          answer_c: q.answer_c,
          answer_d: q.answer_d,
          correct_answer: q.correct_answer,
        })),
      },
    });
  } catch (error) {
    console.error("Quiz generation error:", error);
    res.status(500).json({
      message: "Failed to generate quiz",
      error: error.message,
      details: error.stack,
    });
  }
});

router.get("/all", async (req, res) => {
  try {
    const quizzes = await QuizSet.find()
      .populate("questions")
      .populate("creator", "name email profilePicture")
      .lean();
    res.json(quizzes);
  } catch (error) {
    console.error("Error fetching quizzes:", error);
    res.status(500).json({
      message: "Failed to fetch quizzes",
      error: error.message,
      details: error.stack,
    });
  }
});

router.get("/popular", async (req, res) => {
  try {
    // Get the count of ended sessions for each quiz
    const sessionCounts = await Session.aggregate([
      { $match: { status: "ended" } },
      {
        $group: {
          _id: "$quizSetId",
          playCount: { $sum: 1 },
        },
      },
    ]);

    // Create a map of quizId to playCount
    const playCountMap = sessionCounts.reduce((acc, curr) => {
      acc[curr._id.toString()] = curr.playCount;
      return acc;
    }, {});

    // Get all quizzes with populated fields
    const quizzes = await QuizSet.find()
      .populate("questions")
      .populate("creator", "name email profilePicture")
      .lean();

    // Add the actual playCount to each quiz
    const quizzesWithPlayCount = quizzes.map((quiz) => ({
      ...quiz,
      playCount: playCountMap[quiz._id.toString()] || 0,
    }));

    // Sort by playCount in descending order
    quizzesWithPlayCount.sort((a, b) => b.playCount - a.playCount);

    res.json(quizzesWithPlayCount);
  } catch (error) {
    console.error("Error fetching popular quizzes:", error);
    res.status(500).json({
      message: "Failed to fetch popular quizzes",
      error: error.message,
      details: error.stack,
    });
  }
});

router.get("/new", async (req, res) => {
  try {
    // Get the count of ended sessions for each quiz
    const sessionCounts = await Session.aggregate([
      { $match: { status: "ended" } },
      {
        $group: {
          _id: "$quizSetId",
          playCount: { $sum: 1 },
        },
      },
    ]);

    // Create a map of quizId to playCount
    const playCountMap = sessionCounts.reduce((acc, curr) => {
      acc[curr._id.toString()] = curr.playCount;
      return acc;
    }, {});

    // Get all quizzes with populated fields, sorted by creation date
    const quizzes = await QuizSet.find()
      .populate("questions")
      .populate("creator", "name email profilePicture")
      .sort({ createdAt: -1 }) // Sort by creation date, newest first
      .limit(10) // Limit to 10 newest quizzes
      .lean();

    // Add the actual playCount to each quiz
    const quizzesWithPlayCount = quizzes.map((quiz) => ({
      ...quiz,
      playCount: playCountMap[quiz._id.toString()] || 0,
    }));

    res.json(quizzesWithPlayCount);
  } catch (error) {
    console.error("Error fetching new quizzes:", error);
    res.status(500).json({
      message: "Failed to fetch new quizzes",
      error: error.message,
      details: error.stack,
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const quizId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(quizId)) {
      return res.status(400).json({ message: "Invalid quiz ID" });
    }

    const quiz = await QuizSet.findById(quizId)
      .populate("questions")
      .populate("creator", "name email profilePicture")
      .lean();

    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    res.json(quiz);
  } catch (error) {
    console.error("Error fetching quiz:", error);
    res.status(500).json({
      message: "Failed to fetch quiz",
      error: error.message,
      details: error.stack,
    });
  }
});

router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const quizId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(quizId)) {
      return res.status(400).json({ message: "Invalid quiz ID" });
    }

    const quiz = await QuizSet.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    // Check if the user is the creator of the quiz
    if (quiz.creator.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this quiz" });
    }

    // Delete all questions associated with this quiz
    await Question.deleteMany({ _id: { $in: quiz.questions } });

    // Delete the quiz set
    await QuizSet.findByIdAndDelete(quizId);

    res.json({ message: "Quiz deleted successfully" });
  } catch (error) {
    console.error("Error deleting quiz:", error);
    res.status(500).json({
      message: "Failed to delete quiz",
      error: error.message,
      details: error.stack,
    });
  }
});

router.post("/regenerate/:id", authenticateToken, async (req, res) => {
  try {
    const quizId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(quizId)) {
      return res.status(400).json({ message: "Invalid quiz ID" });
    }

    // Find the existing quiz
    const existingQuiz = await QuizSet.findById(quizId);
    if (!existingQuiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    // Check if the user is the creator of the quiz
    if (existingQuiz.creator.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to regenerate this quiz" });
    }

    // Get topic from the title (remove "Quiz about " prefix)
    const topic = existingQuiz.title.replace("Quiz about ", "");
    const numberOfQuestions = existingQuiz.questions.length;
    const { language = "en" } = req.body;

    // Generate new questions
    const questions = await generateQuiz(topic, numberOfQuestions, language);

    if (!Array.isArray(questions)) {
      throw new Error("Generated questions must be an array");
    }

    questions.forEach((q, index) => {
      if (
        !q.question_text ||
        !q.answer_a ||
        !q.answer_b ||
        !q.answer_c ||
        !q.answer_d ||
        !q.correct_answer
      ) {
        throw new Error(
          `Question at index ${index} is missing required fields`
        );
      }
      if (!["A", "B", "C", "D"].includes(q.correct_answer)) {
        throw new Error(
          `Invalid correct_answer "${q.correct_answer}" for question at index ${index}`
        );
      }
    });

    // Delete old questions
    await Question.deleteMany({ _id: { $in: existingQuiz.questions } });

    // Create new questions
    const savedQuestions = await Promise.all(
      questions.map(async (q) => {
        const question = new Question({
          question: q.question_text,
          answer_a: q.answer_a,
          answer_b: q.answer_b,
          answer_c: q.answer_c,
          answer_d: q.answer_d,
          correct_answer: q.correct_answer,
        });
        await question.save();
        return question;
      })
    );

    // Update quiz with new questions
    existingQuiz.questions = savedQuestions.map((q) => q._id);
    await existingQuiz.save();

    // Return full quiz information including questions
    res.json({
      message: "Quiz regenerated successfully",
      quizSet: {
        id: existingQuiz._id,
        title: existingQuiz.title,
        description: existingQuiz.description,
        questions: savedQuestions.map((q) => ({
          id: q._id,
          question: q.question,
          answer_a: q.answer_a,
          answer_b: q.answer_b,
          answer_c: q.answer_c,
          answer_d: q.answer_d,
          correct_answer: q.correct_answer,
        })),
      },
    });
  } catch (error) {
    console.error("Quiz regeneration error:", error);
    res.status(500).json({
      message: "Failed to regenerate quiz",
      error: error.message,
      details: error.stack,
    });
  }
});

export default router;
