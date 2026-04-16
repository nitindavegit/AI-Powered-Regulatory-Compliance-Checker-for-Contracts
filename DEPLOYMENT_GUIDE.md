# ComplyChain Deployment Guide

## Recommended Approach

Deploy this app as a single web service:

- `backend/server.js` runs the API
- the backend also serves the built Vite frontend from `dist/`
- SQLite data stays in `backend/data/`
- Python is required because AI analysis calls `backend/model_bridge.py`

This is the simplest production setup for the current codebase.

## What This Project Needs

- Node.js 22+
- Python 3.11+
- npm dependencies
- Python packages from `python-requirements.txt`
- writable disk for `backend/data/complychain.db`

## Environment Variables

Set these in your host:

- `BACKEND_PORT=4000`
- `FRONTEND_ORIGIN=https://your-domain.example`
- `PYTHON_EXECUTABLE=python3` on Linux hosts if needed

Optional:

- `VITE_API_URL=` leave empty when deploying as one service
- `VITE_RPC_URL=...`
- `VITE_CHAIN_ID=...`
- `VITE_NETWORK_NAME=...`
- `VITE_EXPLORER_URL=...`
- `VITE_CONTRACT_ADDRESS=...`
- `SEPOLIA_RPC_URL=...`
- `PRIVATE_KEY=...`

## Local Production Test

```bash
npm ci
pip install -r python-requirements.txt
npm run build
node backend/server.js
```

Open `http://localhost:4000`.

## Docker Deploy

Build and run:

```bash
docker build -t complychain .
docker run -p 4000:4000 --name complychain-app complychain
```

Then open `http://localhost:4000`.

## Railway / Render Style Deploy

Use a Docker-based deployment.

Build source:

- repo root: this project folder
- dockerfile: `Dockerfile`

Set environment variables:

- `BACKEND_PORT=4000`
- `FRONTEND_ORIGIN=https://your-public-url`
- `PYTHON_EXECUTABLE=python3`

Notes:

- SQLite works for demos and small usage, but not for multi-instance scaling.
- if your platform has ephemeral disk, uploaded app data and DB state can reset on redeploy/restart.
- for long-term production, move from SQLite to Postgres and store persistent files outside the container.

## Important Limitation

The Python model depends on `torch` and `transformers`, so deploys can be heavy and slower than a normal Node app.

If you want cheaper and easier hosting later, the next step is:

1. move the database from SQLite to Postgres
2. move AI analysis to an external API or separate worker
3. keep the frontend and API in separate services if needed
