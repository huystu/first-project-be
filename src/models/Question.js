import mongoose from "mongoose";
const QuestionSchema = new mongoose.Schema({
  quizSetId: {
    type: Schema.Types.ObjectId,
    ref: "QuizSet",
    required: true,
  },
  question: {
    type: String,
    required: true,
  },
  answer_a: {
    type: String,
    required: true,
  },
  answer_b: {
    type: String,
    required: true,
  },
  answer_c: {
    type: String,
    required: true,
  },
  answer_d: {
    type: String,
    required: true,
  },
  correct_answer: { type: String, enum: ["A", "B", "C", "D"], required: true },
  createAt: {
    type: Date,
    default: Date.now,
  },
});
export default mongoose.model("Question", QuestionSchema);
