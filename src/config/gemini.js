import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();
if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not set in environment variables");
}

if (!process.env.GEMINI_API_KEY.startsWith("AIza")) {
  throw new Error(
    "GEMINI_API_KEY appears to be invalid. It should start with 'AIza'"
  );
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export const generateQuiz = async (topic, numberOfQuestions, language) => {
  try {
    console.log("Generating quiz for topic:", topic);

    const prompt = `Generate a quiz with ${numberOfQuestions} multiple choice questions about ${topic}, language:${language}. 
    Format each question as a JSON object with the following structure:
    {
      "question_text": "The question",
      "answer_a": "First option",
      "answer_b": "Second option",
      "answer_c": "Third option",
      "answer_d": "Fourth option",
      "correct_answer": "A or B or C or D"
    }
    Return an array of these question objects in valid JSON format. The response should start with '[' and end with ']'.`;

    // Generate content
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Log raw response for debugging
    console.log("Raw Gemini response:", text);

    // Try to find JSON array in the response
    let jsonStr = text;
    const jsonMatch = text.match(/\[\s*{[\s\S]*}\s*\]/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    try {
      const questions = JSON.parse(jsonStr);

      // Validate questions format
      if (!Array.isArray(questions)) {
        throw new Error("Generated content is not an array");
      }

      // Validate each question
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

      return questions;
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", parseError);
      console.error("Raw response was:", text);
      throw new Error("Failed to parse quiz questions from Gemini response");
    }
  } catch (error) {
    console.error("Error in generateQuiz:", error);
    if (error.message.includes("API_KEY_INVALID")) {
      throw new Error(
        "Invalid API key. Please check your GEMINI_API_KEY environment variable."
      );
    }
    throw error;
  }
};

export const testGeminiConnection = async () => {
  try {
    console.log("Testing Gemini connection...");
    const result = await model.generateContent("Say hello!");
    const response = await result.response;
    const text = response.text();
    console.log("Gemini Test Response:", text);
    return true;
  } catch (error) {
    console.error("Gemini Connection Test Failed:", error);
    if (error.message.includes("API_KEY_INVALID")) {
      console.error(
        "API key validation failed. Please check your GEMINI_API_KEY."
      );
    }
    return false;
  }
};
