import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import OpenAI from 'openai';

const app = express();

const PORT = process.env.PORT || 3000;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN;

const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;
const corsOptions = ALLOWED_ORIGIN ? { origin: ALLOWED_ORIGIN } : undefined;

const SYSTEM_PROMPT = `
You are an Amplitude analytics solutions architect. Given a call transcript, extract architecture-ready details for building a data/activation diagram.

Return ONLY valid JSON with this shape:
{
  "architecture": { "goal": string, "scope": string },
  "entities": [
    { "name": string, "type": "product|datasource|activation|warehouse|pipeline|other", "layer": "marketing|experiences|sources|analysis|activation", "notes": string }
  ],
  "events": [
    { "name": string, "properties": [string], "notes": string }
  ],
  "flows": [
    { "from": string, "to": string, "description": string, "direction": "uni|bi" }
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
- Prefer concise labels; derive stable ids from names (lowercase, dashes).
- Map AmpliStack layers: marketing, experiences (owned surfaces/apps), sources (ingest), analysis (warehouse/BI/Amplitude), activation (destinations/engagement).
- For flows, keep edge labels descriptive (e.g., "track events", "sync audiences").
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

