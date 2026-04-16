# Independent Setup

This app is self-contained inside this folder.

## Included locally

- `analyze_contract.py`
- `contract_ai_model/`
- `python-requirements.txt`
- backend bridge files in `backend/`

## First-time setup

Run these commands from this folder:

```powershell
npm install
npm run python:setup
```

## Start the app

```powershell
npm run backend:dev
npm run dev
```

The backend will use `.\.venv\Scripts\python.exe` automatically if it exists.
