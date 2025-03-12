// Game state management
const games = new Map();

// Function to generate a 6-character room code
function generateRoomCode() {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
}

export const setupSocketHandlers = (io) => {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Create a new room
    socket.on("create_room", ({ playerName, isHost }) => {
      try {
        let roomId;
        // Keep generating room codes until we find an unused one
        do {
          roomId = generateRoomCode();
        } while (games.get(roomId));

        // Create new game state
        const game = {
          hostId: socket.id,
          players: new Map([
            [socket.id, { id: socket.id, name: playerName, isHost: true }],
          ]),
          isStarted: false,
          quizSet: null,
          questions: [],
          currentQuestionIndex: -1,
          scores: new Map(),
          answers: {},
          timeLeft: 30,
          timePerQuestion: 30,
          timer: null,
        };

        games.set(roomId, game);
        socket.join(roomId);

        socket.emit("room_created", {
          roomId,
          room: {
            hostId: game.hostId,
            players: Array.from(game.players.values()),
          },
        });
      } catch (error) {
        socket.emit("error", { message: error.message });
      }
    });

    // Join a room
    socket.on("join_room", ({ roomId, playerName }) => {
      try {
        const game = games.get(roomId);
        if (!game) throw new Error("Room not found");

        // Add player to game
        game.players.set(socket.id, {
          id: socket.id,
          name: playerName,
          isHost: false,
        });
        game.scores.set(socket.id, 0);

        socket.join(roomId);

        // Notify all players in the room about the new player
        io.to(roomId).emit("player_joined", {
          playerId: socket.id,
          playerName,
          players: Array.from(game.players.values()),
        });
      } catch (error) {
        socket.emit("error", { message: error.message });
      }
    });

    // Set quiz set for the room
    socket.on("set_quiz", ({ roomId, quizSet }) => {
      try {
        const game = games.get(roomId);
        if (game.hostId !== socket.id) {
          throw new Error("Only host can set quiz");
        }

        game.quizSet = quizSet;
        io.to(roomId).emit("quiz_set", { quizSet });
      } catch (error) {
        socket.emit("error", { message: error.message });
      }
    });

    // Set time per question
    socket.on("set_time", ({ roomId, seconds }) => {
      try {
        const game = games.get(roomId);
        if (game.hostId !== socket.id) {
          throw new Error("Only host can set time");
        }

        game.timePerQuestion = seconds;
        io.to(roomId).emit("time_set", { seconds });
      } catch (error) {
        socket.emit("error", { message: error.message });
      }
    });

    // Start game
    socket.on("start_game", ({ roomId, quiz }) => {
      try {
        const game = games.get(roomId);
        if (!game) throw new Error("Game not found");
        if (game.hostId !== socket.id)
          throw new Error("Only host can start game");
        if (!game.quizSet) throw new Error("Quiz set not selected");

        game.isStarted = true;
        game.questions = game.quizSet.questions;
        game.currentQuestionIndex = 0;
        game.currentQuestion = game.questions[0];
        game.answers = {};
        game.timeLeft = game.timePerQuestion;

        // Initialize scores
        game.players.forEach((player) => {
          game.scores.set(player.id, 0);
        });

        // Send first question
        io.to(roomId).emit("game_started", {
          question: {
            text: game.currentQuestion.question,
            options: [
              game.currentQuestion.answer_a,
              game.currentQuestion.answer_b,
              game.currentQuestion.answer_c,
              game.currentQuestion.answer_d,
            ],
          },
          questionNumber: 1,
          totalQuestions: game.questions.length,
          timeLeft: game.timeLeft,
        });

        // Start timer
        startTimer(io, roomId);
      } catch (error) {
        socket.emit("error", { message: error.message });
      }
    });

    // Submit answer
    socket.on("submit_answer", ({ roomId, answer }) => {
      try {
        const game = games.get(roomId);
        if (!game || !game.isStarted)
          throw new Error("Game not found or not started");

        // Only accept answer if player hasn't answered yet
        if (!game.answers[socket.id]) {
          game.answers[socket.id] = answer;

          const currentQuestion = game.questions[game.currentQuestionIndex];
          const isCorrect = answer === currentQuestion.correct_answer;

          // Calculate points based on time left
          const points = isCorrect ? calculatePoints(game.timeLeft) : 0;
          game.scores.set(
            socket.id,
            (game.scores.get(socket.id) || 0) + points
          );

          // Send result to player
          socket.emit("answer_result", {
            correct_answer: currentQuestion.correct_answer,
            is_correct: isCorrect,
            points: points,
          });

          // Check if all players have answered
          if (Object.keys(game.answers).length === game.players.size) {
            clearInterval(game.timer);
            showQuestionResult(io, roomId);
          }
        }
      } catch (error) {
        socket.emit("error", { message: error.message });
      }
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);

      // Find all rooms this socket is in
      games.forEach((game, roomId) => {
        if (game.players.has(socket.id)) {
          const wasHost = game.hostId === socket.id;
          if (wasHost) {
            // If host left, end game and close room
            io.to(roomId).emit("room_closed");
            games.delete(roomId);
          } else {
            // Remove player
            game.players.delete(socket.id);
            game.scores.delete(socket.id);
            io.to(roomId).emit("player_left", {
              playerId: socket.id,
              players: Array.from(game.players.values()),
            });
          }
        }
      });
    });
  });
};

// Helper functions
function calculatePoints(timeLeft) {
  const basePoints = 1000;
  const timeBonus = Math.max(0, timeLeft / 30); // Assuming 30 seconds max time
  return Math.round(basePoints * (0.5 + timeBonus));
}

function startTimer(io, roomId) {
  const game = games.get(roomId);
  if (!game) return;

  if (game.timer) {
    clearInterval(game.timer);
  }

  game.timer = setInterval(() => {
    game.timeLeft--;
    io.to(roomId).emit("time_update", { timeLeft: game.timeLeft });

    if (game.timeLeft <= 0) {
      clearInterval(game.timer);
      showQuestionResult(io, roomId);
    }
  }, 1000);
}

function showQuestionResult(io, roomId) {
  const game = games.get(roomId);
  if (!game) return;

  const currentQuestion = game.questions[game.currentQuestionIndex];

  // Send results to all players
  io.to(roomId).emit("show_answer", {
    correctAnswer: currentQuestion.correct_answer,
    answers: game.answers,
    leaderboard: Array.from(game.scores.entries()).map(([playerId, score]) => ({
      playerId,
      playerName: game.players.get(playerId).name,
      score,
      pointsEarned:
        game.answers[playerId] === currentQuestion.correct_answer
          ? calculatePoints(game.timeLeft)
          : 0,
    })),
  });

  // Wait 5 seconds before moving to next question
  setTimeout(() => {
    game.currentQuestionIndex++;

    if (game.currentQuestionIndex < game.questions.length) {
      // Start next question
      game.currentQuestion = game.questions[game.currentQuestionIndex];
      game.answers = {};
      game.timeLeft = game.timePerQuestion;

      io.to(roomId).emit("next_question", {
        question: {
          text: game.currentQuestion.question,
          options: [
            game.currentQuestion.answer_a,
            game.currentQuestion.answer_b,
            game.currentQuestion.answer_c,
            game.currentQuestion.answer_d,
          ],
        },
        questionNumber: game.currentQuestionIndex + 1,
        totalQuestions: game.questions.length,
        timeLeft: game.timeLeft,
        leaderboard: Array.from(game.scores.entries()).map(
          ([playerId, score]) => ({
            playerId,
            playerName: game.players.get(playerId).name,
            score,
          })
        ),
      });

      startTimer(io, roomId);
    } else {
      // End game
      io.to(roomId).emit("game_ended", {
        leaderboard: Array.from(game.scores.entries())
          .sort(([, a], [, b]) => b - a)
          .map(([playerId, score]) => ({
            playerId,
            playerName: game.players.get(playerId).name,
            score,
          })),
      });

      // Clean up game after 1 minute
      setTimeout(() => {
        games.delete(roomId);
      }, 60000);
    }
  }, 5000);
}
