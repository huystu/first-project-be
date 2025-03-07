import express from "express";
import dotenv from "dotenv";
dotenv.config();

import userRouter from "./src/routes/userRouter.js";
import quizRouter from "./src/routes/quizRouter.js";
import connectDB from "./src/config/connectDB.js";

const PORT = process.env.PORT || 3000;
const MONGO_URI_DEV = process.env.MONGO_URI_DEV;
const app = express();
app.use(express.json());
app.use("/api/users", userRouter);
app.use("/api/quizzes", quizRouter);
app.get("/", (req, res) => {
  res.send("Hello World");
});

app.listen(PORT, () => {
  connectDB(MONGO_URI_DEV);
  console.log("Server is running on port: ", PORT);
});
