import express from "express";
import dotenv from "dotenv";
dotenv.config();

import userRouter from "./src/routes/userRouter.js";
import quizRouter from "./src/routes/quizRouter.js";
import authRouter from "./src/routes/authRouter.js";
import sessionRouter from "./src/routes/sessionRouter.js";
import connectDB from "./src/config/connectDB.js";
import { testGeminiConnection } from "./src/config/gemini.js";
import cors from "cors";
const PORT = process.env.PORT || 3000;
const MONGO_URI_DEV = process.env.MONGO_URI_DEV;
const app = express();
// Middleware
app.use(express.json());
app.use(cors());
// Routes
app.use("/api/users", userRouter);
app.use("/api/quizzes", quizRouter);
app.use("/api/auth", authRouter);
app.use("/api/sessions", sessionRouter);
app.get("/", (req, res) => {
  res.send("Hello World");
});

app.listen(PORT, () => {
  connectDB(MONGO_URI_DEV);
  testGeminiConnection();
  console.log("Server is running on port: ", PORT);
});
