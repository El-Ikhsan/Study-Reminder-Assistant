<h1 align="center">Study Reminder Assistant</h1>

<div align="center">
  <p><em>Other repositories in this project ecosystem:</em></p>
  <h3>
    <a href="https://github.com/El-Ikhsan/Study-Reminder-Assistant-Frontend">Frontend</a>
    <br>
    <a href="https://github.com/El-Ikhsan/Study-Reminder-Assistant-IoT">Firmware IoT</a>
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
 
[![Repo Size](https://img.shields.io/github/repo-size/El-Ikhsan/Study-Reminder-Assistant?style=flat-square&color=blue)](https://github.com/El-Ikhsan/Study-Reminder-Assistant)
[![GitHub Issues](https://img.shields.io/github/issues/El-Ikhsan/Study-Reminder-Assistant?style=flat-square&color=orange)](https://github.com/El-Ikhsan/Study-Reminder-Assistant/issues)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](https://opensource.org/licenses/MIT)

</div>

## Showcase

<img alt="dashboard" src="https://github.com/user-attachments/assets/b6a561b9-40d4-4b9e-9d54-59dad12d0056" />
<img alt="booting" src="https://github.com/user-attachments/assets/110efed4-76e8-4729-9592-01c74a8245c9" />
<img alt="pomodoro_on" src="https://github.com/user-attachments/assets/83787ce5-75ca-4ae1-a254-3f285ba71f53" />
<img alt="respon_LLM" src="https://github.com/user-attachments/assets/e119bb2b-98cc-40ff-ac3f-e49caa1f1c20" />

## What is it?

Study Reminder Assistant (Rinchan) is an intelligent study companion system combining Pomodoro time management, environmental IoT sensor monitoring (temperature, light, and noise), and AI-driven responses. This repository serves as the **Backend API & Real-time Service**, handling authentication, Pomodoro sessions, IoT device synchronization, environmental classification, and AI integrations.

## Features

- User authentication (JWT with access and refresh tokens) and profile management.
- Pomodoro timer management, status synchronization, and study history tracking.
- Real-time two-way communication between web clients and IoT devices via WebSockets (Cloudflare Durable Objects).
- IoT environmental sensor telemetry and smart classifier (maps temperature, light, and noise to device facial emotions).
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
git clone https://github.com/El-Ikhsan/Study-Reminder-Assistant.git
cd Study-Reminder-Assistant
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

5. Set up local D1 database, R2 bucket, and Durable Objects.

The project uses the following Cloudflare resources for local development:

* **D1 Database:** `dummy-db`, bound as `DB`
* **R2 Bucket:** `dummy-bucket`, bound as `MY_BUCKET`
* **Durable Object:** `DeviceRoom`, bound as `DEVICE_ROOM`

The resource bindings are already configured in `wrangler.jsonc`.

Create the local R2 bucket:

```bash

wrangler r2 bucket create dummy-bucket --local

```

6. Run migrations for local D1 database.

```bash

bun run db:dev-migrate

```

7. Start the development server.

```bash

bun run dev

```

The server will be running at `http://localhost:8787`.

## License

This project is licensed under the MIT License.
