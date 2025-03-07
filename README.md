# Automated Quiz Generation System - Backend

## Introduction

The **Automated Quiz Generation System** backend provides API endpoints to interact with Gemini AI for quiz generation, manage user sessions, and store quiz progress. It serves as the bridge between the frontend and the AI-powered quiz generation service.

## Features

- Generate quizzes using Gemini AI API.
- Provide RESTful API endpoints for quiz management.
- Store and retrieve quiz progress using a database.
- Evaluate quizzes and return results.
- Authentication for user session management (future enhancement).

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB (via Docker for local setup)
- **API Integration:** Gemini AI
- **FrontEnd:** HTML, CSS

## Installation

### Prerequisites

- Install [Node.js](https://nodejs.org/)
- Install [Docker](https://www.docker.com/) (for MongoDB container)
- Get access to the Gemini AI API key

### Setup & Run

Clone the repository:

```bash
git clone https://github.com/huystu/first-project-be
cd first-project-be
```

Install dependencies:

```bash
npm install
```

Create a `.env` file:

```bash
touch .env
```

Add environment variables
