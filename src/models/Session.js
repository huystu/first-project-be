import mongoose from "mongoose";
const SessionSchema = new mongoose.Schema({
  quizSetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "QuizSet",
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  questionAnswer: {
    type: Array,
    default: [],
  },
  status: {
    type: String,
    enum: ["in-progress", "ended"],
    default: "in-progress",
  },
  score: {
    type: Number,
    default: 0,
  },
  questionIndex: {
    type: Number,
    default: 0,
  },
  dateFinished: {
    type: Date,
  },
  lastTimePlay: {
    type: Date,
    default: Date.now,
  },
});
export default mongoose.model("Session", SessionSchema);
