
// Alternative: Firebase Cloud Functions version
// If you use Firebase, deploy this as a function instead of Express server

const functions = require('firebase-functions');
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

exports.analyzeMeal = functions.https.onRequest(async (req, res) => {
  // CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type, x-app-secret');
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }

  // Auth
  if (req.headers['x-app-secret'] !== process.env.APP_SECRET) {
    res.status(401).json({ error: 'Unauthorized' }); return;
  }

  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) { res.status(400).json({ error: 'Missing image' }); return; }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: 'Analyze meal photo. Return ONLY JSON: {"name":"meal","calories":420,"protein":38,"carbs":32,"fat":12,"tip":"short tip"}' },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}`, detail: 'low' } }
        ]
      }],
      max_tokens: 400
    });

    let content = completion.choices[0].message.content.replace(/```json|```/g, '').trim();
    res.json(JSON.parse(content));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});
