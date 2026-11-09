# Pinger

Pinger is a scalable, production-ready SaaS for monitoring websites, APIs, and Supabase projects.

## Architecture

This project is built using:
- **Frontend & API:** Next.js (App Router), React, Tailwind CSS, Three.js
- **Database:** Supabase PostgreSQL with Drizzle ORM
- **Authentication:** Custom session-based auth with HTTP-only cookies and Argon2id hashing
- **Billing:** Stripe Subscriptions
- **Worker Engine:** Standalone Node.js processes using `tsx` (independent from Vercel Serverless functions)

The architecture is explicitly designed so the web frontend can be deployed on a serverless platform (like Vercel), while the worker processes run on a continuous computing platform (like Railway, Render, Fly.io, or AWS ECS). This avoids the timeout and cost limitations of serverless cron for minute-by-minute monitoring.

## Local Development

### 1. Database Setup
Create a new Supabase project (or local PostgreSQL database).

Execute the schema file directly against your database to set up the tables, enums, and triggers:
```bash
psql $DATABASE_URL -f supabase/schema.sql
```
*(Alternatively, you can run this file in the Supabase SQL Editor).*

### 2. Environment Variables
Copy the example environment variables:
```bash
cp .env.example .env
```
Fill in the required variables, particularly `DATABASE_URL`, `SESSION_SECRET`, `ENCRYPTION_KEY`, and Stripe keys.

### 3. Install Dependencies
```bash
npm install
```

### 4. Run the Web Server
```bash
npm run dev
```
The web app will be available at `http://localhost:3000`.

### 5. Run the Worker Engine
In a separate terminal, start the standalone ping worker. This process queries the database for monitors that are due, executes the HTTP requests, and saves the results.
```bash
npm run worker
```

### 6. Run the Cleanup Engine (Optional)
To test the log retention logic (which deletes old `ping_logs` beyond the retention limit):
```bash
npm run cleanup
```

## Security Considerations
- **SSRF Protection:** The worker explicitly rejects targets pointing to local network addresses (e.g., `localhost`, `10.x.x.x`, `169.254.169.254`).
- **No Supabase Auth:** This project implements custom secure auth to maintain complete control over the session lifecycle and cookie configuration.
- **Sensitive Credentials:** Any sensitive headers or Supabase API keys attached to monitors should be encrypted at rest using the `ENCRYPTION_KEY`.

## Deployment

### Web Frontend (Vercel)
1. Push your repository to GitHub.
2. Import the project into Vercel.
3. Add all the environment variables from `.env`.
4. Deploy.

### Worker Node (Railway / Render / Fly.io)
The worker MUST run on an always-on container or VM.
1. Create a new service on your hosting platform using this repository.
2. Override the start command to:
   ```bash
   npm run worker
   ```
3. Provide the `DATABASE_URL` and `ENCRYPTION_KEY` environment variables.
4. Scale to multiple instances if needed—the worker uses `FOR UPDATE SKIP LOCKED` (or equivalent query logic) to ensure jobs are claimed atomically and never executed twice.
