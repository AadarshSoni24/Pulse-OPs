# PulseOps — Distributed API Uptime, Latency & SSL Certificate Monitoring Platform

PulseOps is an event-driven, asynchronous API uptime, latency, and SSL certificate monitoring platform built with Node.js, TypeScript, Express, PostgreSQL (Prisma), Redis 7, and BullMQ 5 background workers.

---

## Key Technical Architecture

```text
                                ┌───────────────────────────┐
                                │   REST API (Modular)      │
                                └─────────────┬─────────────┘
                                              │
                   ┌──────────────────────────┼──────────────────────────┐
                   ▼                          ▼                          ▼
             Authentication              Monitors                   Workspaces
                   │                          │                          │
                   └──────────────────────────┼──────────────────────────┘
                                              ▼
                                     PostgreSQL (Prisma)
                                              │
                                              ▼
                                     Scheduler Worker
                                              │
                                              ▼
                                     Redis Queue (BullMQ)
                                              │
                   ┌──────────────────────────┼──────────────────────────┐
                   ▼                          ▼                          ▼
         Health Check Worker          Incident Worker            SSL Cert Worker
                   │                          │                          │
                   ▼                          ▼                          ▼
           Health Metrics            Notification Worker         TLS Inspector
                                              │
                                              ▼
                                      Email Alerts
```

---

## Key Features

- **Asynchronous Background Task Processing**: Offloads scheduled checks, incident processing, SSL inspections, and email alerts into distributed Redis & BullMQ queues.
- **SSRF Protection Guard**: Implements URL syntax validation, DNS resolution, and IP range blocking (`127.0.0.1`, `0.0.0.0`, IPv6 loopbacks, `10.x`, `172.16.x`, `192.168.x`, `169.254.169.254`) with redirect-chain interceptors (`301`, `302`, `307`, `308`).
- **Incident De-duplication & Recovery Engine**: Guarantees **1 continuous outage = 1 active incident** (prevents incident duplication and notification spam), computes downtime duration, and emits recovery events.
- **Multi-Tenant Workspaces & RBAC**: Workspace boundary enforcement with role hierarchy (`OWNER`, `ADMIN`, `DEVELOPER`, `VIEWER`).
- **Reliability Analytics**: Computes uptime %, MTTR (Mean Time to Resolve), MTBF (Mean Time Between Failures), and latency percentiles (P50, P95, P99).
- **Public Status Pages**: Unauthenticated real-time system status view (`/api/v1/status/:slug`).
- **System Observability & Telemetry**: Exposes internal queue depths, check throughput, latency averages, and active incident counts via `/api/v1/metrics`.

---

## Tech Stack

- **Runtime & Language:** Node.js (v20+), TypeScript, Express.js
- **Database & ORM:** PostgreSQL 16, Prisma ORM
- **Queue & Cache:** Redis 7, BullMQ 5
- **Authentication & Security:** JWT (Access + Refresh Rotation), Bcrypt, Express Rate Limit, Helmet, Zod, SSRF Guard
- **Documentation & Testing:** Swagger/OpenAPI (`/api-docs`), Jest, Supertest
- **DevOps & CI/CD:** Docker, Docker Compose, GitHub Actions

---

## Getting Started

### 1. Local Environment Setup

```bash
# Install dependencies
npm install

# Start PostgreSQL and Redis via Docker Compose
docker-compose up -d

# Generate Prisma Client and push schema
npx prisma generate
npx prisma db push

# Start API Server in development mode
npm run dev
```

### 2. Run Background Workers

```bash
npm run worker:scheduler     # Scheduler Daemon
npm run worker:health        # Health & Incident Worker
npm run worker:notification  # Email Notification Worker
npm run worker:ssl           # SSL Certificate Worker
```

### 3. Run Test Suite

```bash
npm test         # Run 31 automated integration & E2E tests
npm run lint     # TypeScript compilation check
```

---

## API Documentation

Interactive Swagger OpenAPI UI is available at `http://localhost:4000/api-docs`.
JSON specification is served at `http://localhost:4000/api-docs.json`.
