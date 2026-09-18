# Documan Web SPA (@documan/web)

## 1. Overview & Purpose

The **Documan Web Application** is a modern Single-Page Application (SPA) built with React 19, Vite 8, and Tailwind CSS v4. It delivers the frontend user experience for Documan, featuring the Stitch UI design system, rich visual governance dashboards, interactive topology graphs, printable release certificates, and document versioning interfaces.

### Technology Stack

- **Framework:** React 19.2.8
- **Build Tool / Bundler:** Vite 8.2.0 (`@vitejs/plugin-react`)
- **Styling:** Tailwind CSS 4.3.3 (`@tailwindcss/vite`)
- **Routing:** React Router v7.18.2
- **State Management:** Zustand 5.0.15
- **HTTP Client:** Axios 1.19.0
- **Testing:** Vitest 4.1.11 & Testing Library

---

## 2. Quick Start & Development Commands

All commands can be executed from the repository root using `pnpm --filter web <command>` or directly inside `apps/web/`:

```bash
# Start Vite local development server (http://localhost:5173)
pnpm --filter web dev

# Execute TypeScript type checking
pnpm --filter web typecheck

# Execute ESLint check
pnpm --filter web lint

# Run frontend Vitest component tests
pnpm --filter web test

# Build production static bundle (dist/)
pnpm --filter web build

# Preview production build locally
pnpm --filter web preview
```

---

## 3. Environment Configuration

The frontend consumes client-side environment variables defined at build time via Vite's `import.meta.env`.

| Variable Name | Required? | Purpose & Description | Example Value |
| :--- | :---: | :--- | :--- |
| `VITE_API_URL` | Yes | Base URL for API HTTP requests made by Axios client. | `http://localhost:4000/api/v1` (Local) <br>`https://documan-api.onrender.com/api/v1` (Production/Demo) |

---

## 4. API Client & Authentication Flow

The Axios HTTP client configuration resides in [`src/api/client.ts`](file:///c:/MERN_STACK/Documan/documan/apps/web/src/api/client.ts):

- **`withCredentials: true`:** Instructs the browser to send HTTP-Only refresh cookies (`documan_refresh_token`) on requests to the backend API.
- **Request Interceptor:** Reads `accessToken` from `useAuthStore` (Zustand) and injects the header `Authorization: Bearer <accessToken>`.
- **Response Interceptor:** Automatically catches `401 Unauthorized` responses and triggers background silent token refresh (`POST /auth/refresh`). If refresh succeeds, original failed requests are automatically retried with the new access token.

---

## 5. Directory Structure & Architecture

```
apps/web/src/
├── api/                  # Axios apiClient instance and interceptor logic (client.ts)
├── components/           # Shared Stitch UI design components (Button, Card, Badge, Modal, Table, etc.)
├── features/             # Domain feature components and Zustand state stores
│   ├── auth/             # Login, signup, OTP verification UI and auth.store.ts
│   ├── documents/        # Document workspace, upload forms, and version diff views
│   ├── governance/       # Baselines, release certificates, waivers, and lineage graphs
│   └── projects/         # Project workspaces and topology graph views
├── pages/                # Top-level view components mapped to router paths
├── routes/               # Router configuration and ProtectedRoute.tsx authentication guard
└── index.css             # Tailwind CSS v4 directives and Stitch UI global styles
```

---

## 6. Vercel SPA Routing Configuration

When deploying the Vite SPA bundle (`apps/web/dist`) to Vercel, deep URL navigation or browser page refreshes on client-side subroutes (e.g. `/dashboard`, `/projects`, `/governance`) require rewriting requests back to `index.html`.

This is configured via [`apps/web/vercel.json`](file:///c:/MERN_STACK/Documan/documan/apps/web/vercel.json):

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

---

## 7. References to Canonical Documentation

- [Free Public Demo Deployment Implementation Plan](../../docs/plans/POST-COMPLETION-FREE-PUBLIC-DEMO-DEPLOYMENT-IMPLEMENTATION-PLAN.md)
- [Free Public Demo Compatibility Completion Report](../../docs/reports/POST-COMPLETION-FREE-DEMO-DEPLOYMENT-COMPATIBILITY-COMPLETION-REPORT.md)
- [Production Deployment Guide](../../docs/DEPLOYMENT.md)
