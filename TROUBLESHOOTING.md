# ComplyChain API Integration - Troubleshooting Guide

## ✅ Current Status

- **Backend Server**: Running on `http://localhost:4002`
- **Frontend Server**: Running on `http://localhost:3000`
- **CORS Configuration**: Properly configured to allow requests from `http://localhost:3000`
- **API URLs**: Frontend configured to use `http://localhost:4002` as API endpoint

## 🔍 Debugging Steps

### 1. **Check Browser Console for Errors**

When you try to sign up or login:
1. Open the browser's Developer Tools: **F12** or **Right-click → Inspect**
2. Go to the **Console** tab
3. Look for logs like:
   ```
   API_BASE configured as: http://localhost:4002
   Signup request to: http://localhost:4002/api/auth/signup
   Signup response status: 201
   ```

### 2. **Check Network Tab**

1. Go to **Network** tab in Developer Tools
2. Attempt signup
3. Look for the request to `/api/auth/signup`
4. Check the response - should be `201` status with JSON data containing:
   ```json
   {
     "token": "...",
     "user": {...},
     "expiresAt": "..."
   }
   ```

### 3. **Check Servers are Running**

**PowerShell Commands:**

```powershell
# Check if backend is running
Invoke-WebRequest -Uri "http://localhost:4002/api/health" -UseBasicParsing

# Check if frontend is running
Invoke-WebRequest -Uri "http://localhost:3000/" -UseBasicParsing
```

Both should return successful responses (status 200).

### 4. **Test API Directly**

```powershell
$body = @{
    name = "Test User"
    email = "test@example.com"
    password = "password123"
    role = "Client"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:4002/api/auth/signup" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body `
  -UseBasicParsing
```

Expected response: Status 201 with user data and token

## 🔧 Common Issues & Fixes

### Issue: "Failed to fetch" Error

**Cause**: Browser can't reach the API server

**Solution**:
1. Make sure both servers are running: `npm run dev` and `npm run backend:dev`
2. Check the browser console for the actual error
3. Verify frontend is on `http://localhost:3000` (not 3001, 3002, etc.)
4. Verify backend is on `http://localhost:4002`

### Issue: CORS Error

**Cause**: Backend doesn't allow requests from the frontend origin

**Solution**:
1. Update `.env` file with correct `FRONTEND_ORIGIN`
2. If frontend is running on `http://localhost:3000`, set:
   ```
   FRONTEND_ORIGIN=http://localhost:3000
   ```
3. Restart the backend server with `npm run backend:dev`

### Issue: "Email already exists" Error

**Cause**: You're trying to sign up with an email that's already registered

**Solution**:
- Use a different email address
- Or, delete the database file: `backend/data/complychain.db`
- Then restart the backend (it will recreate an empty database)

### Issue: Wrong Frontend Port

**Cause**: Vite assigns a different port if the default one is in use

**Solution**:
1. Kill all Node processes: `Get-Process -Name node | Stop-Process -Force`
2. Update `.env` to match the port shown in the frontend output
3. Restart both servers

## 🚀 Quick Restart Guide

If something goes wrong:

1. **Kill all servers**:
   ```powershell
   Get-Process -Name node | Stop-Process -Force
   ```

2. **Clear ports** (wait 5 seconds)

3. **Start backend**:
   ```powershell
   cd "c:\Users\Abhishekh Kumar Jha\OneDrive\Desktop\complychain"
   npm run backend:dev
   ```

4. **Start frontend** (in a new PowerShell window):
   ```powershell
   cd "c:\Users\Abhishekh Kumar Jha\OneDrive\Desktop\complychain"
   npm run dev
   ```

5. **Verify**:
   - Backend health: `Invoke-WebRequest -Uri "http://localhost:4002/api/health" -UseBasicParsing`
   - Frontend: Open `http://localhost:3000` in browser

## 📋 Environment Files

### Backend Configuration (`.env`)
```
BACKEND_PORT=4002
FRONTEND_ORIGIN=http://localhost:3000
GEMINI_API_KEY=your_key_here
```

### Frontend Configuration (`.env.local`)
```
VITE_API_URL=http://localhost:4002
```

## 🧪 Test Users

You can use these test credentials after signup:

- **Email**: test@example.com
- **Password**: password123
- **Role**: Client

Or create your own account during signup.

## 📞 Support

If you still get "Failed to fetch":

1. Check browser console (F12) for exact error message
2. Check Network tab to see if request is being sent
3. Look at backend logs for any errors
4. Verify both servers are running with health checks above
