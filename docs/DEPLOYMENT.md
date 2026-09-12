# Documan Deployment Guide

## 1. Overview

This document provides step-by-step instructions for deploying Documan using production Docker containers and Docker Compose.

The production deployment architecture consists of three containerized services connected via an internal bridge network:

1. **Web Container (`documan-web`)**: Nginx Alpine running as a non-root user (`nginx`), serving the compiled React 19 SPA static assets on port `8080` with SPA fallback routing.
2. **API Container (`documan-api`)**: Express 5 on Node 22 Alpine running as a non-root user (`node`) on port `4000`, handling authentication, Zod validation, Pino logging, and domain workflows.
3. **Database Container (`documan-mongodb`)**: Official MongoDB 7.0 container with data persisted on a local named volume (`mongodb_data`).

---

## 2. Prerequisites

- **Docker**: Version 24.0 or higher.
- **Docker Compose**: Version 2.20 or higher.
- **Hardware Requirements**: Minimum 2 GB RAM, 2 CPU cores, 10 GB disk space.

---

## 3. Environment Configuration

Copy `.env.example` to create your environment configuration file:

```bash
cp .env.example .env
```

### Environment Variables Reference

| Variable Name  | Purpose                                                        | Example / Default Value               | Required |
| -------------- | -------------------------------------------------------------- | ------------------------------------- | -------- |
| `NODE_ENV`     | Application environment                                        | `production`                          | Yes      |
| `PORT`         | API server HTTP port                                           | `4000`                                | Yes      |
| `MONGO_URI`    | MongoDB connection string                                      | `mongodb://mongodb:27017/documan`     | Yes      |
| `JWT_SECRET`   | Secret key for JWT access token signing (min 32 chars)         | `your_secure_32_character_jwt_secret` | Yes      |
| `CORS_ORIGIN`  | Allowed origin for browser CORS requests                       | `http://localhost:8080`               | Yes      |
| `LOG_LEVEL`    | Pino logging level (`fatal`, `error`, `warn`, `info`, `debug`) | `info`                                | Yes      |
| `VITE_API_URL` | API base URL for Web SPA requests                              | `http://localhost:4000/api/v1`        | Yes      |

---

## 4. Deploying with Docker Compose

### 1. Build and Start Container Stack

Execute the following command from the repository root:

```bash
docker compose up -d --build
```

### 2. Verify Container Status

```bash
docker compose ps
```

All three services (`documan-mongodb`, `documan-api`, `documan-web`) should report state `running (healthy)`.

### 3. Synchronize Database Indexes

Run the explicit index synchronization script to build Mongoose indexes safely without blocking application startup:

```bash
docker compose exec api pnpm --filter @documan/api db:index
```

---

## 5. Security & Container Hardening

1. **Non-Root Execution**:
   - `documan-api` executes as unprivileged user `node` (UID 1000).
   - `documan-web` executes as unprivileged user `nginx` (UID 101).
2. **Minimal Image Footprint**:
   - Multi-stage Docker builds strip TypeScript source files and devDependencies from final production runner stages.
3. **HTTP Security Headers**:
   - Nginx adds `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and `X-XSS-Protection: 1; mode=block`.
4. **Volume Persistence**:
   - MongoDB database data is stored in volume `mongodb_data`.
   - Uploaded document version files are stored in volume `api_uploads`.

---

## 6. Verification and Health Testing

Execute the automated container smoke test suite:

```bash
pnpm test:container
```

Verify service responses manually:

- **API Health**: `curl http://localhost:4000/api/v1/health`
- **API Readiness**: `curl http://localhost:4000/api/v1/health/ready`
- **API Liveness**: `curl http://localhost:4000/api/v1/health/live`
- **Web App**: `curl http://localhost:8080/`
