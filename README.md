# PulseOps — Distributed API Uptime, Latency & SSL Certificate Monitoring Platform

PulseOps is an event-driven, asynchronous API uptime, latency percentile, and SSL certificate monitoring platform built with **Node.js, TypeScript, Express, PostgreSQL 16 (Prisma), Redis 7, and BullMQ 5 background workers**.

---

## ⚡ Quick Start: Populate Demo Data in 30 Seconds

```bash
# 1. Install dependencies & initialize environment
npm install
cp .env.example .env

# 2. Start PostgreSQL and Redis containers
docker-compose up -d

# 3. Generate Prisma client, push database schema & seed demo data
npx prisma generate
npx prisma db push
npm run prisma:seed
```

Seeding creates sample monitors (GitHub Status API, Stripe API, failing microservice), health check latency history, active/resolved incidents, and a public status page (`acme-corp`).

---

## 🏗️ Architectural Blueprint

```text
                               ┌───────────────────────────┐
                               │   REST API (Modular)      │
                               └─────────────┬─────────────┘
                                             │
                   ┌─────────────────────────┼─────────────────────────┐
                   ▼                         ▼                         ▼
             Authentication              Monitors                   Workspaces
                   │                         │                         │
                   └─────────────────────────┼─────────────────────────┘
                                             ▼
                                    PostgreSQL (Prisma)
                                             │
                                             ▼
                                    Scheduler Worker
                                             │
                                             ▼
                                    Redis Queue (BullMQ)
                                             │
                   ┌─────────────────────────┼─────────────────────────┐
                   ▼                         ▼                         ▼
         Health Check Worker          Incident Worker            SSL Cert Worker
                   │                         │                         │
                   ▼                         ▼                         ▼
           Health Metrics           Notification Worker         TLS Inspector
                                             │
                                             ▼
                                     Email Alerts
```

---

## 💡 Engineering Design Decisions & Technical Trade-offs

### Q1: Why a Modular Monolith for the API layer instead of Microservices?
> **Answer**: Splitting the HTTP API into microservices for user management, workspace CRUD, and status pages introduces network hop overhead and distributed transaction complexity without operational benefit. I chose a **Modular Monolith** for the API layer, while physically decoupling heavy I/O operations (health checks, scheduling, email alerts) into **independent worker runtimes** powered by Redis & BullMQ.

### Q2: Why Deterministic Job IDs (`check-${monitorId}-${timeWindow}`) in the Scheduler?
> **Answer**: If the scheduler process executes rapidly or restarts, a naive implementation might queue duplicate health check jobs for the same monitor in the exact same interval window. By stamping jobs with a time-windowed deterministic ID, BullMQ natively deduplicates enqueued jobs, guaranteeing **at-most-once execution per interval window**.

### Q3: Why intercept HTTP redirects in SSRF Protection instead of relying on default HTTP agents?
> **Answer**: Standard HTTP clients automatically follow `301`/`302`/`307` redirects. An attacker could configure a monitor to target `http://public-url.com/redirect` which responds with `Location: http://169.254.169.254/latest/meta-data/` to bypass host validation. PulseOps sets `maxRedirects: 0`, inspects every `Location` header manually, and resolves DNS to enforce SSRF rules on every redirect hop.

### Q4: How does the Incident Engine prevent notification spam during long outages?
> **Answer**: If a monitored API is down for 3 hours and checked every 15 seconds, sending 720 emails or creating 720 database incidents is notification spam. PulseOps enforces **1 continuous outage = 1 active incident**. When a check fails twice consecutively, the worker queries for an existing `ACTIVE` incident. If one exists, it remains untouched. When the endpoint recovers, it resolves the active incident and calculates exact downtime duration.

### Q5: How are latency percentiles (P50, P95, P99) calculated?
> **Answer**: PulseOps collects exact DNS, TLS, and TCP response times for every health check. The analytics engine uses nearest-rank percentile formulas to calculate P50 (median latency), P95, and P99 latency percentiles, providing accurate insights into tail-latency spikes that standard averages hide.

---

## 🪵 Structured Logging Showcase (Winston JSON)

PulseOps uses structured JSON logging for real-time observability across services and background workers:

```json
// SSRF Guard Intercepting Malicious Private IP Request
{
  "level": "warn",
  "message": "SSRF Guard blocked restricted target IP",
  "targetUrl": "http://169.254.169.254/latest/meta-data/",
  "resolvedIp": "169.254.169.254",
  "category": "linkLocal",
  "timestamp": "2026-08-13T19:30:15.123Z"
}

// Health Worker Recording Check Execution
{
  "level": "info",
  "message": "Health check processed for monitor mon-github-1",
  "url": "https://www.githubstatus.com/api/v2/status.json",
  "success": true,
  "statusCode": 200,
  "responseTime": 134,
  "timestamp": "2026-08-13T19:31:00.456Z"
}

// Incident Engine Emitting Alert Event
{
  "level": "error",
  "message": "Outage detected: Active incident created",
  "monitorId": "mon-legacy-auth",
  "incidentId": "inc-active-100",
  "reason": "Expected HTTP 200, received HTTP 500 Internal Server Error",
  "timestamp": "2026-08-13T19:31:15.789Z"
}
```

---

## 🛠️ Tech Stack & Tooling

- **Language & Runtime:** Node.js (v20+), TypeScript, Express.js
- **Database & ORM:** PostgreSQL 16, Prisma ORM
- **Queue & Cache:** Redis 7, BullMQ 5
- **Authentication & Security:** JWT (Access + Refresh Rotation), Bcrypt, Express Rate Limit, Helmet, Zod, SSRF Guard
- **API Tooling:** Postman Collection (`pulseops.postman_collection.json`), VS Code REST Client (`pulseops.http`), Swagger UI (`/api-docs`)
- **Testing Suite:** 12 Test Suites / 44 Tests Passed (Jest, Supertest)
- **DevOps & Infrastructure:** Docker, Docker Compose, GitHub Actions CI (`ci.yml`), Render Blueprint (`render.yaml`)

---

## 🧪 Run Test Suite

```bash
# Run all 12 test suites (44 tests)
npm test

# Run coverage report
npm run test:coverage

# Run TypeScript compilation check
npm run lint
```

---

## 📚 API Testing & Documentation

- **Swagger UI**: `http://localhost:4000/api-docs`
- **Postman Collection**: Import [pulseops.postman_collection.json](file:///c:/PulseOPS/pulseops.postman_collection.json)
- **VS Code REST Client**: Open [pulseops.http](file:///c:/PulseOPS/pulseops.http)
- **Public Status Page**: `http://localhost:4000/api/v1/status/acme-corp`
- **Telemetry Metrics**: `http://localhost:4000/api/v1/metrics`
