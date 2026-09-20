<h1 align="center">Study Reminder Assistant</h1>

<div align="center">
  <p><em>Other repositories in this project ecosystem:</em></p>
  <h3>
    <a href="https://github.com/El-Ikhsan/Rinchan-Frontend">Frontend</a>
    <br>
    <a href="https://github.com/El-Ikhsan/Rinchan-IOT">Firmware IoT</a>
  </h3>
</div> 

<div align="center">
  <a href="#what-is">About</a>
  <span> • </span>
  <a href="#features">Features</a>
  <span> • </span>
  <a href="#tech-stack">Tech Stack</a>
  <span> • </span>
  <a href="#requirements">Requirements</a>
  <span> • </span>
  <a href="#local-installation">Installation</a>
  <span> • </span>
  <a href="#license">License</a>
  <p></p>
</div> 

<div align="center">
 
[![Repo Size](https://img.shields.io/github/repo-size/El-Ikhsan/Rinchan?style=flat-square&color=blue)](https://github.com/El-Ikhsan/Rinchan)
[![GitHub Issues](https://img.shields.io/github/issues/El-Ikhsan/Rinchan?style=flat-square&color=orange)](https://github.com/El-Ikhsan/Rinchan/issues)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](https://opensource.org/licenses/MIT)

</div>

## Showcase

## What is it?

Study Reminder Assistant (Rin-chan) is an intelligent study companion system combining Pomodoro time management, environmental IoT sensor monitoring (temperature, light, and noise), and AI-driven interactions. This repository serves as the **Backend API & Real-time Service**, handling authentication, Pomodoro sessions, IoT device synchronization, environmental classification, and AI integrations.

## Features

- User authentication (JWT with access and refresh tokens) and profile management.
- Pomodoro timer management, status synchronization, and study history tracking.
- Real-time two-way communication between web clients and IoT devices via WebSockets (Cloudflare Durable Objects).
- IoT environmental sensor telemetry and smart classifier (maps temperature, light, and noise to device facial emotions).
- AI voice transcription using Groq Whisper Speech-to-Text (STT) and LLM companion responses.
- Object storage integration with Cloudflare R2 for user avatars and audio files.

## Tech Stack

- Cloudflare Workers
- Hono
- TypeScript
- Cloudflare D1 (SQLite)
- Drizzle ORM
- Cloudflare Durable Objects
- Cloudflare R2 Storage
- Bun / Node.js

## Requirements

Make sure your system has the following tools installed:

- Node.js 20+ or [Bun](https://bun.sh/) (recommended)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (Cloudflare Workers CLI)

## Local Installation

1. Pre-install Wrangler globally.

```bash
npm install -g wrangler
# or with Bun:
bun add -g wrangler
```

2. Clone the repository and enter the project directory.

```bash
git clone https://github.com/El-Ikhsan/Rinchan.git
cd Rinchan
```

3. Install dependencies.

```bash
bun install
# or: npm install
```

4. Create the environment file.

```bash
cp .dev.vars.example .dev.vars
```

5. Run migrations and seed data for local D1 database.

```bash
bun run db:dev-migrate
bun run seeds
```

6. Start the development server.

```bash
bun run dev
```

The server will be running at `http://localhost:8787`.

## License

This project is licensed under the MIT License.