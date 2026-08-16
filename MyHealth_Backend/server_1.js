
// My Health - Secure Backend Proxy
// Keeps OPENAI_API_KEY secret - Android app never sees it
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const APP_SECRET = process.env.APP_SECRET || 'myhealth_secret_123';

if (!OPENAI_API_KEY) {
  console.error('❌ Missing OPENAI_API_KEY in .env - add it!');
  process.exit(1);
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Security middleware
app.use(helmet());
app.use(cors()); // In production, set origin to your app only
app.use(express.json({ limit: '10mb' })); // For base64 images

// Rate limit: 30 meal analyses per hour per IP (prevents abuse)
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: { error: 'Too many requests, try again later' }
});
app.use('/api/', limiter);

// Simple auth middleware - checks shared secret from app
function checkAuth(req, res, next) {
  const secret = req.headers['x-app-secret'];
  // Allow if no secret configured (dev) or matches
  if (!APP_SECRET || secret === APP_SECRET) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'My Health Backend Running', version: '1.0.0', endpoints: ['POST /api/analyze-meal'] });
});

// Main endpoint: Analyze meal photo securely
app.post('/api/analyze-meal', checkAuth, async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    
    if (!imageBase64) {
      return res.status(400).json({ error: 'Missing imageBase64' });
    }

    // Validate base64 size (max ~5MB)
    if (imageBase64.length > 7_000_000) {
      return res.status(400).json({ error: 'Image too large' });
    }

    console.log('📸 Analyzing meal...');

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
Estimate nutrition. Be helpful, not judgmental. If not food, return {"name":"Not food","calories":0,"protein":0,"carbs":0,"fat":0,"tip":"Try again with meal photo"}
    `.trim();

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}`, detail: 'low' } }
          ]
        }
      ],
      max_tokens: 400,
      temperature: 0.3
    });

    let content = completion.choices[0]?.message?.content || '';
    // Clean markdown wrappers
    content = content.replace(/```json/g, '').replace(/```/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse OpenAI response:', content);
      return res.status(500).json({ error: 'Failed to parse AI response', raw: content });
    }

    console.log('✅ Analysis:', parsed.name, parsed.calories + ' cal');
    res.json(parsed);

  } catch (error) {
    console.error('❌ OpenAI Error:', error.message);
    if (error.status === 429) {
      res.status(429).json({ error: 'OpenAI rate limit, try again in a minute' });
    } else {
      res.status(500).json({ error: 'AI analysis failed', details: error.message });
    }
  }
});

// Optional: Validate premium entitlement server-side via RevenueCat
app.get('/api/validate-premium/:appUserId', async (req, res) => {
  // You can call RevenueCat API here if you want server-side validation
  // For now, return mock - client already checks via SDK
  res.json({ isPremium: false, note: 'Client-side validation via RevenueCat SDK - implement server check if needed' });
});

app.listen(PORT, () => {
  console.log(`🚀 My Health Backend running on port ${PORT}`);
  console.log(`🔒 OpenAI key loaded: ${OPENAI_API_KEY.substring(0, 10)}...`);
  console.log(`🔑 App secret: ${APP_SECRET}`);
  console.log(`📡 Endpoint: POST http://localhost:${PORT}/api/analyze-meal`);
});
