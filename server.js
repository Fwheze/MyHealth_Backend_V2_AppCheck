
// My Health Backend V2 - With Firebase App Check
// Only YOUR Android app can call /api/analyze-meal - even if someone finds the URL
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const OpenAI = require('openai');
const admin = require('firebase-admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Config from env
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const APP_SECRET = process.env.APP_SECRET || 'myhealth_secret_123';
const FIREBASE_SERVICE_ACCOUNT_JSON = process.env.FIREBASE_SERVICE_ACCOUNT_JSON; // For App Check verification
const ENABLE_APP_CHECK = process.env.ENABLE_APP_CHECK === 'true'; // Set to true after Firebase setup

if (!OPENAI_API_KEY) {
  console.warn('⚠️ OPENAI_API_KEY not set - check Render Environment tab');
} else {
  console.log('✅ OPENAI_API_KEY loaded');
}

let openai = null;
if (OPENAI_API_KEY && OPENAI_API_KEY.startsWith('sk-')) {
  openai = new OpenAI({ apiKey: OPENAI_API_KEY });
  console.log('✅ OpenAI client initialized');
} else {
  console.warn('⚠️ OpenAI client NOT initialized - will start server anyway');
}

// Initialize Firebase Admin for App Check verification
let firebaseInitialized = false;
if (FIREBASE_SERVICE_ACCOUNT_JSON) {
  try {
    const serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT_JSON);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    firebaseInitialized = true;
    console.log('✅ Firebase Admin initialized - App Check verification enabled');
  } catch (e) {
    console.error('⚠️ Failed to init Firebase Admin:', e.message);
  }
} else {
  console.log('ℹ️ FIREBASE_SERVICE_ACCOUNT_JSON not set - App Check verification disabled (using APP_SECRET only)');
  console.log('   To enable: Add service account JSON to .env and set ENABLE_APP_CHECK=true');
}

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rate limit
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: { error: 'Too many requests, try again later - premium users get more' }
});
app.use('/api/', limiter);

// Firebase App Check verification middleware
async function verifyAppCheck(req, res, next) {
  // If App Check not enabled yet, fall back to APP_SECRET check
  if (!ENABLE_APP_CHECK || !firebaseInitialized) {
    const secret = req.headers['x-app-secret'];
    if (!APP_SECRET || secret === APP_SECRET) {
      return next();
    } else {
      return res.status(401).json({ error: 'Unauthorized - invalid app secret' });
    }
  }

  // App Check enabled - verify token
  const appCheckToken = req.headers['x-firebase-appcheck'];
  
  if (!appCheckToken) {
    return res.status(401).json({ 
      error: 'Missing App Check token - call must come from your app',
      hint: 'Make sure Firebase App Check is initialized in Android app'
    });
  }

  try {
    const decodedToken = await admin.appCheck().verifyToken(appCheckToken);
    // Token valid - it came from YOUR app that you registered in Firebase
    console.log(`✅ App Check verified - appId: ${decodedToken.appId}`);
    next();
  } catch (err) {
    console.error('❌ App Check verification failed:', err.message);
    return res.status(401).json({ 
      error: 'Invalid App Check token - only your app can call this',
      details: err.message 
    });
  }
}

// Routes
app.get('/', (req, res) => {
  res.json({ 
    status: 'My Health Backend V2 Running 🔒',
    appCheck: ENABLE_APP_CHECK && firebaseInitialized ? 'ENABLED - Only your app can call /api/analyze-meal' : 'DISABLED - Using APP_SECRET only (enable for production)',
    endpoints: ['POST /api/analyze-meal (protected by App Check)']
  });
});

// Protected endpoint - only YOUR app can call it with valid App Check token
app.post('/api/analyze-meal', verifyAppCheck, async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'Missing imageBase64' });
    if (imageBase64.length > 7_000_000) return res.status(400).json({ error: 'Image too large' });

    console.log('📸 Analyzing meal - verified app request');

    const prompt = `
Analyze this meal photo for health tracking. Return ONLY valid JSON with no markdown:
{
  "name": "short meal name (e.g., Grilled Chicken + Rice)",
  "calories": 420,
  "protein": 38,
  "carbs": 32,
  "fat": 12,
  "tip": "short supportive tip for shift worker, max 15 words"
}
Estimate nutrition. If not food, return {"name":"Not food","calories":0,"protein":0,"carbs":0,"fat":0,"tip":"Try again with meal photo"}
    `.trim();

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}`, detail: 'low' } }
        ]
      }],
      max_tokens: 400,
      temperature: 0.3
    });

    let content = completion.choices[0]?.message?.content || '';
    content = content.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error('Parse failed:', content);
      return res.status(500).json({ error: 'AI parse failed', raw: content });
    }

    console.log('✅', parsed.name, parsed.calories + ' cal');
    res.json(parsed);

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.status === 429) res.status(429).json({ error: 'OpenAI rate limit' });
    else res.status(500).json({ error: 'AI failed', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 My Health Backend V2 running on port ${PORT}`);
  console.log(`🔒 App Check: ${ENABLE_APP_CHECK && firebaseInitialized ? 'ENABLED ✅ Only your app can call' : 'DISABLED ⚠️ Using APP_SECRET (set ENABLE_APP_CHECK=true for prod)'}`);
  console.log(`📡 POST ${PORT ? `http://localhost:${PORT}` : ''}/api/analyze-meal`);
});
