import mongoose from "mongoose";
const QuizSetSchema = new mongoose.Schema({
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  title: { type: String, required: true },
  description: { type: String },
  questions: [
    {
      type: Schema.Types.ObjectId,
      ref: "Question",
    },
  ],
  playCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});
export default mongoose.model("QuizSet", QuizSetSchema);
