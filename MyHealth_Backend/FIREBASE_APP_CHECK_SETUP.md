
# Firebase App Check Setup - Lock Backend to ONLY Your App

This prevents anyone who finds your backend URL from using it. Only YOUR Android app (signed with your keystore) can get a valid App Check token.

## Step 1: Create Firebase Project

1. Go to https://console.firebase.google.com -> Add Project -> Name: My Health
2. No Google Analytics needed for now

## Step 2: Add Android App to Firebase

1. In Firebase Console -> Project Overview -> Add App -> Android
2. Package name: com.myhealth.app (must match Android app)
3. App nickname: My Health
4. SHA-256: Get from Android Studio -> Gradle -> Tasks -> android -> signingReport (or `keytool -list -v -keystore ~/.android/debug.keystore`)
   For release: use your release keystore SHA-256
5. Download google-services.json -> Put in app/ folder of Android project

## Step 3: Enable App Check

1. Firebase Console -> App Check (left menu)
2. Click Get Started
3. For Android app -> Register
4. Provider: Play Integrity (recommended)
5. Save

## Step 4: Create Service Account for Backend Verification

1. Firebase Console -> Project Settings -> Service Accounts
2. Click Generate New Private Key -> Downloads JSON file
3. Open JSON file, copy entire content
4. In Render/Railway env vars:
   - Key: FIREBASE_SERVICE_ACCOUNT_JSON
   - Value: Paste entire JSON as single line (minify it - remove newlines or keep as string)
   - Key: ENABLE_APP_CHECK
   - Value: true

## Step 5: Deploy Backend

On Render:
- Add env vars: OPENAI_API_KEY, FIREBASE_SERVICE_ACCOUNT_JSON, ENABLE_APP_CHECK=true, APP_SECRET
- Deploy - check logs: should say "Firebase Admin initialized - App Check verification enabled"

## Step 6: Android App Already Updated

I already added in your Android app:

build.gradle.kts:
```
implementation(platform("com.google.firebase:firebase-bom:32.7.4"))
implementation("com.google.firebase:firebase-appcheck-playintegrity")
```

MyHealthApplication.kt:
```kotlin
FirebaseAppCheck.getInstance().installAppCheckProviderFactory(
  PlayIntegrityAppCheckProviderFactory.getInstance()
)
```

BackendAnalyzer.kt:
```kotlin
// Gets App Check token and sends as X-Firebase-AppCheck header
val appCheckToken = Firebase.appCheck.getToken().await().token
header("X-Firebase-AppCheck", appCheckToken)
```

## How It Works

1. Your app starts -> Firebase App Check gets token from Play Integrity (proves it's YOUR app, not emulator/hacker)
2. App calls backend with token in header X-Firebase-AppCheck
3. Backend verifies token with Firebase Admin -> if valid, allows request
4. Hacker finds URL but can't get valid token -> 401 Unauthorized

## Testing

- Debug build: App Check uses debug token (see Firebase Console -> App Check -> Manage Debug Tokens)
- Create debug token in console, add to local.properties: firebase.appcheck.debug.token=xxxx
- Release build: Automatically uses Play Integrity - no extra code

## Cost

- Firebase App Check: Free
- OpenAI: ~$0.005 per meal

Done! Now only your app can use your backend.
