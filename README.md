# ComplyChain

ComplyChain is a full-stack contract compliance app with:

- A Vite + React frontend
- An Express backend with SQLite persistence
- Optional Python-based contract analysis
- Optional blockchain registration for contract hashes

## Production setup

1. Install dependencies:

```bash
npm ci
```

2. Copy the environment template and set real values:

```bash
cp .env.example .env
```

Important variables:

- `PORT`: Runtime port for platforms like Render, Railway, Fly.io, and Docker
- `FRONTEND_ORIGIN`: Allowed browser origin for a separately hosted frontend
- `FRONTEND_ORIGINS`: Optional comma-separated list of additional allowed origins
- `VITE_API_URL`: Leave empty when the frontend is served by the same backend
- `VITE_CONTRACT_ADDRESS`: Required only if blockchain submission should be enabled
- `GEMINI_API_KEY`: Optional, only if Gemini-backed features are enabled
- `PYTHON_EXECUTABLE`: Optional override for the Python runtime

3. Build the frontend:

```bash
npm run build
```

4. Start the production server:

```bash
npm start
```

The backend serves the built frontend from `dist/` and exposes the API on the same origin.

## Docker

Build and run:

```bash
docker build -t complychain .
docker run --env-file .env -p 4000:4000 complychain
```

If your hosting platform injects `PORT`, map that port instead.

## Render

This repo now includes a [render.yaml](/c:/Users/Abhishekh%20Kumar%20Jha/OneDrive/Desktop/complychain_app/render.yaml) Blueprint for Render.

Recommended setup on Render:

- Deploy as a Docker web service
- Keep the frontend and backend on the same service
- Use the attached persistent disk for `backend/data/complychain.db`

Steps:

1. Push this repository to GitHub or GitLab.
2. In Render, create a new Blueprint and point it at this repo.
3. Render will read `render.yaml` and create the `complychain` web service.
4. In the Render dashboard, fill in any secret env vars that are left unsynced:
   `GEMINI_API_KEY`, `VITE_RPC_URL`, and `VITE_CONTRACT_ADDRESS`.
5. Deploy the service.

Notes:

- The Blueprint uses the `starter` plan because Render persistent disks require a paid instance.
- The persistent disk is mounted at `/app/backend/data`, which preserves the SQLite database across restarts and deploys.
- `VITE_API_URL` is intentionally blank so the built frontend calls the same Render service origin.

## Deployment notes

- The SQLite database is stored in `backend/data/complychain.db`. Use a persistent volume in production.
- Blockchain submission stays disabled until `VITE_CONTRACT_ADDRESS` is configured.
- Python analysis routes require Python plus the packages from `python-requirements.txt`.
- For split frontend/backend deployments, set `VITE_API_URL` to the backend URL and set `FRONTEND_ORIGIN` on the backend to the frontend URL.

## Verification

Run these before deploying:

```bash
npm run lint
npm run build
```

## Demonstration:
- Link: https://drive.google.com/file/d/1MUjzrgWq4Cl-y9uRQndEx39GZ2nwhpeT/view?usp=sharing
