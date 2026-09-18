# Documan Operational Scripts Guide

## 1. Overview

The `scripts/` directory contains automated operational utilities for backing up MongoDB database data and document upload files, restoring backups, and performing container stack smoke testing.

To support both Linux/macOS and Windows environments, scripts are provided as paired implementations:
- **Bash Scripts (`.sh`):** Compatible with Linux, macOS, WSL, and Git Bash.
- **PowerShell Scripts (`.ps1`):** Compatible with Windows PowerShell and PowerShell Core.

---

## 2. Scripts Inventory & Usage

### 2.1 Database & Upload Backup Scripts

- **Linux / macOS Bash:** [`scripts/backup-mongodb.sh`](file:///c:/MERN_STACK/Documan/documan/scripts/backup-mongodb.sh)
- **Windows PowerShell:** [`scripts/backup-mongodb.ps1`](file:///c:/MERN_STACK/Documan/documan/scripts/backup-mongodb.ps1)

#### Purpose
Executes a complete backup of both MongoDB database data (via `mongodump`) and uploaded document version binary files from disk into a timestamped backup directory (e.g. `backups/2026-09-18_20-00-00/`).

#### Usage

```bash
# Execute Bash backup (Linux / macOS / WSL)
./scripts/backup-mongodb.sh

# Execute PowerShell backup (Windows)
powershell -ExecutionPolicy Bypass -File scripts/backup-mongodb.ps1
```

#### Environment Variable Overrides

| Variable Name | Default Value | Purpose |
| :--- | :--- | :--- |
| `MONGO_URI` | `mongodb://localhost:27017/documan` | MongoDB connection URI for `mongodump`. |
| `UPLOADS_SOURCE` | `apps/api/uploads` | Path to local document upload directory. |
| `BACKUP_BASE_DIR` | `backups` | Root output folder for timestamped archives. |

#### Generated Backup Artifacts
- `backups/<TIMESTAMP>/mongo-dump.gz`: Compressed MongoDB dump archive.
- `backups/<TIMESTAMP>/uploads/`: Archived document version files.
- `backups/<TIMESTAMP>/backup-metadata.json`: Backup completion manifest.

---

### 2.2 Database & Upload Restore Scripts

- **Linux / macOS Bash:** [`scripts/restore-mongodb.sh`](file:///c:/MERN_STACK/Documan/documan/scripts/restore-mongodb.sh)
- **Windows PowerShell:** [`scripts/restore-mongodb.ps1`](file:///c:/MERN_STACK/Documan/documan/scripts/restore-mongodb.ps1)

#### Purpose
Restores database collections and document upload files from a previously created backup directory archive into the target MongoDB instance and upload storage folder.

#### Usage

```bash
# Execute Bash restore (Linux / macOS / WSL)
./scripts/restore-mongodb.sh backups/2026-09-18_20-00-00

# Execute PowerShell restore (Windows)
powershell -ExecutionPolicy Bypass -File scripts/restore-mongodb.ps1 -BackupDir backups/2026-09-18_20-00-00
```

#### Prerequisites & Safety Warnings
- Requires `mongorestore` installed in system `PATH`.
- **Caution:** Restoring database archives replaces or modifies existing collections in the target `MONGO_URI` database.

---

### 2.3 Container Stack Smoke Test Scripts

- **Linux / macOS Bash:** [`scripts/container-smoke-test.sh`](file:///c:/MERN_STACK/Documan/documan/scripts/container-smoke-test.sh)
- **Windows PowerShell:** [`scripts/container-smoke-test.ps1`](file:///c:/MERN_STACK/Documan/documan/scripts/container-smoke-test.ps1)

#### Purpose
Verifies Docker Compose infrastructure configuration, verifies Docker daemon availability, builds multi-container images (`documan-mongodb`, `documan-api`, `documan-web`), launches the container stack, polls API health probes (`/api/v1/health/live`), and performs clean container teardown.

#### Usage

```bash
# Execute Bash container smoke test (Linux / macOS / WSL)
./scripts/container-smoke-test.sh

# Execute PowerShell container smoke test (Windows or package.json runner)
pnpm test:container
# or:
powershell -ExecutionPolicy Bypass -File scripts/container-smoke-test.ps1
```

---

## 3. Prerequisites & Execution Policies

1. **Database Tools:** `mongodump` and `mongorestore` (from MongoDB Database Tools package) are required for full database archive operations. If tools are missing, backup scripts issue warnings and generate placeholder metadata for verification testing.
2. **Windows PowerShell Execution Policy:** On Windows systems where script execution is restricted, pass `-ExecutionPolicy Bypass` when invoking `.ps1` scripts.
3. **Docker Requirements:** Docker Desktop or Docker Engine version 24+ and Docker Compose 2.20+ are required for `container-smoke-test`.

---

## 4. References to Canonical Documentation

- [Operations Guide](../docs/OPERATIONS.md) — Detailed operational monitoring and backup procedures.
- [Deployment Guide](../docs/DEPLOYMENT.md) — Production Docker Compose stack deployment procedures.
