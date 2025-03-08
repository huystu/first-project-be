import mongoose from "mongoose";
const QuizSetSchema = new mongoose.Schema({
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    // uncomment the line below later when have feat User Login
    // required: true,
  },
  title: { type: String, required: true },
  description: { type: String },
  questions: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
    },
  ],
  playCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});
export default mongoose.model("QuizSet", QuizSetSchema);
