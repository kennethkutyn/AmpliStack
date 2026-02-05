import path from 'path';
import { fileURLToPath } from 'url';
import { config as loadEnv } from 'dotenv';
import cors from 'cors';
import express from 'express';
import OpenAI from 'openai';

// Ensure we always load env vars from this folder, regardless of where the process is started.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.join(__dirname, '.env') });

const app = express();

const PORT = process.env.PORT || 3000;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
// Accept either a single origin (ALLOWED_ORIGIN) or a comma-separated list (ALLOWED_ORIGINS)
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN;

const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

// Allow explicit origin plus common local dev hosts.
const defaultAllowed = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  // Hosted client (custom domain + GH Pages fallback)
  'https://amplistack.amplitude.com',
  'https://amplitude.github.io',
  'https://kennethkutyn.github.io'
];

const envAllowed = (ALLOWED_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const allowedOrigins = new Set([...defaultAllowed, ...envAllowed]);
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  }
};

const SYSTEM_PROMPT = `
You are an Amplitude analytics solutions architect. Given a call transcript, extract architecture-ready details for building a data/activation diagram.

Return ONLY valid JSON with this shape:
{
  "architecture": { "goal": string, "scope": string },
  "events": [
    { "name": string, "properties": [string], "notes": string }
  ],
  "risks": [string],
  "assumptions": [string],
  "diagramNodes": [
    { "id": string, "label": string, "layer": "marketing|experiences|sources|analysis|activation", "kind": "amplitude|warehouse|activation|custom", "notes": string }
  ],
  "diagramEdges": [
    { "sourceId": string, "targetId": string, "label": string }
  ]
}

Rules:
- JSON only; no prose.
- Use best-effort extraction even if partial.
- If there is mention of web site, web app, or mobile app, make sure to add an appropriate node to the "owned experiences" layer. 
- if they mention a service or vendor that doesn't exist, you can suggest a new node and guess the most appropriate layer. 
- Pay special attention to mention of Amplitude SDK. If they mention Mobile or Web app, assume an AMplitude SDK will be present unless the specifically say otherwise or mention a CDP. 
- Prefer concise labels; derive stable ids from names (lowercase, dashes).
- Map AmpliStack layers: marketing, experiences (owned surfaces/apps), sources (ingest), analysis (warehouse/BI/Amplitude), activation (destinations/engagement).
- For diagramEdges, keep labels descriptive (e.g., "track events", "sync audiences").
- If there is a mention of push, email, ads or similar, make sure to add the appropriate node to the "marketing channesl" layer
- If something is unknown, use an empty array or empty string rather than guessing.
`;

app.use(cors(corsOptions));
app.use(express.json({ limit: '2mb' }));

app.post('/api/ai/transcript', async (req, res) => {
  try {
    const transcript = (req.body?.transcript || '').toString().trim();
    if (!transcript) {
      return res.status(400).json({ error: 'Transcript is required.' });
    }
    if (!openai) {
      return res.status(500).json({ error: 'Missing OpenAI API key on server.' });
    }

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Transcript:\n${transcript}` }
    ];

    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.2
    });

    const content = completion.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from OpenAI.');
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      throw new Error('Failed to parse OpenAI response as JSON.');
    }

    return res.json({ data: parsed });
  } catch (error) {
    console.error('AI transcript error', error);
    const status = error?.status;
    const safeStatus = status && status >= 400 && status < 600 ? status : 500;
    return res.status(safeStatus).json({
      error: 'AI request failed',
      details: error?.message || 'Unknown error'
    });
  }
});

app.listen(PORT, () => {
  console.log(`AI proxy listening on port ${PORT}`);
});

