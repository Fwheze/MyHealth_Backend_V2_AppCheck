
# My Health - Secure Backend

This backend hides your OpenAI API key. Your Android app calls this server, this server calls OpenAI.

## Why needed?
If you put `sk-...` directly in Android APK, anyone can decompile and steal it ($$$ bill). This proxy keeps it secret.

## Quick Start

1. Install Node.js (https://nodejs.org)
2. Clone this folder
3. Copy env:
   ```bash
   cp .env.example .env
   ```
4. Edit `.env` and add your OpenAI key:
   ```
   OPENAI_API_KEY=sk-proj-xxxx
   APP_SECRET=my_super_secret_123
   ```
5. Install & run:
   ```bash
   npm install
   npm start
   ```
   Server runs at http://localhost:3000

6. Test:
   ```bash
   curl -X POST http://localhost:3000/api/analyze-meal \
     -H "Content-Type: application/json" \
     -H "x-app-secret: my_super_secret_123" \
     -d '{"imageBase64":"...base64..."}'
   ```

## Deploy for Free (so app works everywhere)

### Option A: Render.com (Easiest, free)
1. Push this folder to GitHub
2. Go to render.com -> New Web Service -> Connect repo
3. Build command: `npm install`
4. Start command: `npm start`
5. Add Environment Variables: OPENAI_API_KEY and APP_SECRET
6. Deploy - you get URL like https://myhealth-backend.onrender.com

### Option B: Railway.app
Same steps - free tier works.

### Option C: Firebase Cloud Functions
See `firebase-functions/` folder - alternative if you already use Firebase.

## Update Android App

In Android app:
1. Open `data/BackendConfig.kt`
2. Set `BACKEND_URL = "https://your-backend-url.com"`
3. Set `APP_SECRET` same as backend .env
4. Build APK - now NO OpenAI key inside!

## Security Features Included

- Rate limiting: 30 requests/hour per IP (prevents abuse if someone finds URL)
- Helmet security headers
- Shared secret header `x-app-secret` (simple auth)
- 10MB payload limit
- Low-detail image analysis to save cost (~$0.005 per meal vs $0.01)

## Cost

- OpenAI gpt-4o with low detail: ~$0.005 per meal photo
- 1000 users x 3 meals/day = 3000 requests/day = ~$15/day
- Add caching later to save cost

## Next Level Security (for later)

- Replace APP_SECRET with Firebase App Check or Google Play Integrity API
- Add user authentication via Firebase Auth
- Cache identical meal analyses
- Add usage limits per user tied to RevenueCat premium

Need help deploying? Ask me.
