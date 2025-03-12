class GameState {
  constructor() {
    this.rooms = new Map(); // Map to store room information
  }

  createRoom(roomId, hostId) {
    if (this.rooms.has(roomId)) {
      throw new Error("Room already exists");
    }

    const room = {
      id: roomId,
      hostId: hostId,
      players: new Map([[hostId, { id: hostId, score: 0, name: "" }]]),
      quizSet: null,
      timePerQuestion: 30, // default 30 seconds
      currentQuestion: null,
      isPlaying: false,
      scores: new Map(),
      startTime: null,
    };

    this.rooms.set(roomId, room);
    return room;
  }

  joinRoom(roomId, playerId) {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    if (room.isPlaying) {
      throw new Error("Game is already in progress");
    }

    if (!room.players.has(playerId)) {
      room.players.set(playerId, { id: playerId, score: 0, name: "" });
    }

    return room;
  }

  setPlayerName(roomId, playerId, name) {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    const player = room.players.get(playerId);
    if (!player) {
      throw new Error("Player not found");
    }

    player.name = name;
  }

  leaveRoom(roomId, playerId) {
    const room = this.rooms.get(roomId);
    if (!room) {
      return;
    }

    room.players.delete(playerId);

    // If host leaves, delete the room
    if (playerId === room.hostId) {
      this.rooms.delete(roomId);
      return true;
    }

    return false;
  }

  setQuizSet(roomId, quizSet) {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    room.quizSet = quizSet;
  }

  setTimePerQuestion(roomId, seconds) {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    room.timePerQuestion = seconds;
  }

  startGame(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    if (!room.quizSet) {
      throw new Error("Quiz set not selected");
    }

    room.isPlaying = true;
    room.currentQuestion = 0;
    room.startTime = Date.now();

    // Reset scores
    room.players.forEach((player) => {
      player.score = 0;
    });

    return room;
  }

  submitAnswer(roomId, playerId, answer) {
    const room = this.rooms.get(roomId);
    if (!room || !room.isPlaying) {
      throw new Error("Game not in progress");
    }

    const player = room.players.get(playerId);
    if (!player) {
      throw new Error("Player not found");
    }

    const currentQuestion = room.quizSet[room.currentQuestion];
    const timeTaken = (Date.now() - room.startTime) / 1000; // Convert to seconds

    if (timeTaken > room.timePerQuestion) {
      return { correct: false, score: 0 };
    }

    let score = 0;
    if (answer === currentQuestion.correctAnswer) {
      // Calculate score based on time taken (faster = more points)
      score = Math.round((1 - timeTaken / room.timePerQuestion) * 1000);
      player.score += score;
    }

    return { correct: answer === currentQuestion.correctAnswer, score };
  }

  nextQuestion(roomId) {
    const room = this.rooms.get(roomId);
    if (!room || !room.isPlaying) {
      throw new Error("Game not in progress");
    }

    if (room.currentQuestion >= room.quizSet.length - 1) {
      room.isPlaying = false;
      return null;
    }

    room.currentQuestion++;
    room.startTime = Date.now();
    return room.quizSet[room.currentQuestion];
  }

  getRoomLeaderboard(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    return Array.from(room.players.values()).sort((a, b) => b.score - a.score);
  }

  getRoom(roomId) {
    return this.rooms.get(roomId);
  }
}

export const gameState = new GameState();
