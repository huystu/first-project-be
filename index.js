import express from "express";
import dotenv from "dotenv";
import { createServer } from "http";
dotenv.config();

import userRouter from "./src/routes/userRouter.js";
import quizRouter from "./src/routes/quizRouter.js";
import authRouter from "./src/routes/authRouter.js";
import sessionRouter from "./src/routes/sessionRouter.js";
import connectDB from "./src/config/connectDB.js";
import { testGeminiConnection } from "./src/config/gemini.js";
import { initSocket } from "./src/socket/socket.config.js";
import { setupSocketHandlers } from "./src/socket/socketHandlers.js";
import cors from "cors";

const PORT = process.env.PORT || 3000;
const MONGO_URI_DEV = process.env.MONGO_URI_DEV;

const app = express();
const httpServer = createServer(app);

// Initialize socket.io
const io = initSocket(httpServer);
setupSocketHandlers(io);

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

httpServer.listen(PORT, () => {
  connectDB(MONGO_URI_DEV);
  testGeminiConnection();
  console.log("Server is running on port: ", PORT);
});
