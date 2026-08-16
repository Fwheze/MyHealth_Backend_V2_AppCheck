
# Deploy to Live URL in 3 Minutes

## You asked me to deploy - I can't from this sandbox (no internet), but here's 1-click deploy:

### Step 1: Push backend to GitHub
```bash
cd MyHealth_Backend
git init
git add .
git commit -m "My Health secure backend with App Check"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/myhealth-backend.git
git push -u origin main
```

### Step 2: Deploy to Render (Free)
1. Go to https://dashboard.render.com -> New Web Service
2. Connect your GitHub repo myhealth-backend
3. Settings:
   - Name: myhealth-backend
   - Build Command: npm install
   - Start Command: npm start
   - Plan: Free
4. Add Environment Variables:
   - OPENAI_API_KEY = sk-proj-xxxx (your key)
   - APP_SECRET = myhealth_secret_123
   - FIREBASE_SERVICE_ACCOUNT_JSON = { ...paste entire service account json... }
   - ENABLE_APP_CHECK = false (set true after Firebase setup)
5. Click Create Web Service -> Wait 2 mins -> You get LIVE URL: https://myhealth-backend-xxxx.onrender.com

### Step 3: Enable Firebase App Check (Locks to only your app)

1. Firebase Console -> Create Project My Health
2. Add Android app: com.myhealth.app
3. Download google-services.json -> Put in MyHealthApp/app/google-services.json (replace placeholder)
4. Firebase Console -> App Check -> Register -> Play Integrity
5. Project Settings -> Service Accounts -> Generate New Private Key -> Download JSON
6. In Render dashboard -> Environment -> Edit FIREBASE_SERVICE_ACCOUNT_JSON -> Paste JSON content
7. Set ENABLE_APP_CHECK = true -> Save -> Redeploy

### Step 4: Update Android App

1. In BackendConfig.kt set BACKEND_URL to your Render URL
2. Build APK - now calls https://your-url/api/analyze-meal with App Check token
3. Only YOUR app can call it - hackers get 401

### Step 5: Test

- Run app on real device (not emulator for Play Integrity)
- Take meal photo -> Should log "App Check verified" in Render logs
- Try curl without token -> Should get 401

Done! Live URL secured.

### For Debugging

- In Android Studio Logcat, filter "FirebaseAppCheck" - you will see debug token for emulator
- Firebase Console -> App Check -> Manage Debug Tokens -> Add that token
- Now emulator works too

Need me to generate the google-services.json after you create Firebase project? Paste your project ID and I will update.
