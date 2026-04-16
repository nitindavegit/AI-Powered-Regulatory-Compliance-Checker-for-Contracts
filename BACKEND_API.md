# ComplyChain Backend

## Stack
- Runtime: Node.js (ESM)
- Framework: Express
- Database: SQLite (`better-sqlite3`)
- AI provider: Google Gemini (`@google/genai`)
- Auth: Bearer token sessions stored in DB

## Files Added
- `backend/server.js`: API server and routes
- `backend/db.js`: SQLite connection + schema
- `backend/auth.js`: password hashing + session auth
- `backend/gemini.js`: Gemini analysis integration
- `backend/.env.example`: backend env template

## Start Backend
1. Create env file:
   - Copy `backend/.env.example` to `.env` (project root), or set vars in your terminal.
2. Run:
   - `npm run backend:dev`
3. Base URL:
   - `http://localhost:4000`

## Environment Variables
- `BACKEND_PORT` (default: `4000`)
- `FRONTEND_ORIGIN` (default: `http://localhost:3000`)
- `GEMINI_API_KEY` (optional but recommended for real AI output)

## Auth Model
- Signup/Signin returns a token.
- Send token on protected routes:
  - `Authorization: Bearer <token>`
- Session TTL: 7 days.

## API Endpoints

### Health
- `GET /api/health`
- Response:
```json
{
  "ok": true,
  "service": "ComplyChain Backend",
  "timestamp": "2026-03-05T00:00:00.000Z"
}
```

### Auth
- `POST /api/auth/signup`
  - Body:
```json
{
  "name": "John Doe",
  "email": "john@company.com",
  "password": "secret123",
  "role": "Client"
}
```
  - Response: `201`
```json
{
  "token": "....",
  "expiresAt": "2026-03-12T00:00:00.000Z",
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@company.com",
    "role": "Client",
    "createdAt": "2026-03-05T00:00:00.000Z"
  }
}
```

- `POST /api/auth/signin`
  - Body:
```json
{
  "email": "john@company.com",
  "password": "secret123"
}
```
  - Response: `200` (same shape as signup, user without `createdAt`).

- `POST /api/auth/signout` (protected)
  - Response: `204`

- `GET /api/auth/me` (protected)
  - Response:
```json
{
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@company.com",
    "role": "Client"
  },
  "expiresAt": "2026-03-12T00:00:00.000Z"
}
```

### Contracts
- `POST /api/contracts` (protected)
  - Body:
```json
{
  "fileName": "msa.pdf",
  "fileSize": "421.03 KB",
  "hash": "0xabc123...",
  "status": "Pending",
  "riskScore": null
}
```
  - Response: `201`

- `GET /api/contracts` (protected)
  - Response:
```json
{
  "items": [
    {
      "id": "uuid",
      "fileName": "msa.pdf",
      "fileSize": "421.03 KB",
      "hash": "0xabc123...",
      "status": "Warning",
      "riskScore": 58,
      "createdAt": "2026-03-05T00:00:00.000Z"
    }
  ]
}
```

- `GET /api/contracts/:id` (protected)
  - Returns contract + latest analysis + blockchain records.

### Analysis
- `POST /api/contracts/:id/analysis` (protected)
  - Body:
```json
{
  "text": "contract text or extracted content"
}
```
  - Behavior:
    - Uses Gemini model `gemini-2.5-flash` when `GEMINI_API_KEY` is present.
    - Falls back to deterministic mock analysis if key is missing.
  - Response: `201`
```json
{
  "contractId": "uuid",
  "analysis": {
    "overallRiskScore": 52,
    "complianceStatus": "Review Needed",
    "issues": []
  },
  "analyzedAt": "2026-03-05T00:00:00.000Z"
}
```

### Blockchain Metadata
- `POST /api/contracts/:id/blockchain` (protected)
  - Body:
```json
{
  "txId": "0xhash",
  "blockNumber": 12345,
  "timestamp": "2026-03-05T00:00:00.000Z",
  "status": "Confirmed",
  "contractAddress": "0xcontract",
  "explorerUrl": "https://sepolia.etherscan.io/tx/0xhash"
}
```
  - Response: `201`

- `GET /api/contracts/:id/blockchain` (protected)
  - Response:
```json
{
  "items": [
    {
      "id": "uuid",
      "txId": "0xhash",
      "blockNumber": 12345,
      "timestamp": "2026-03-05T00:00:00.000Z",
      "status": "Confirmed",
      "contractAddress": "0xcontract",
      "explorerUrl": "https://sepolia.etherscan.io/tx/0xhash",
      "createdAt": "2026-03-05T00:00:00.000Z"
    }
  ]
}
```

## Database
- File: `backend/data/complychain.db`
- Tables:
  - `users`
  - `sessions`
  - `contracts`
  - `analyses`
  - `blockchain_records`

## Suggested Frontend Integration
- Replace local `AuthContext` login/signup with:
  - `POST /api/auth/signup`
  - `POST /api/auth/signin`
- Store returned token in localStorage and attach bearer token to protected API requests.
- In upload flow:
  1. Create contract via `/api/contracts`
  2. Save chain tx via `/api/contracts/:id/blockchain`
  3. Run AI via `/api/contracts/:id/analysis`
