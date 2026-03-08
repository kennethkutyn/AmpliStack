import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { config as loadEnv } from 'dotenv';
import cors from 'cors';
import express from 'express';
import OpenAI from 'openai';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.join(__dirname, '.env') });

const app = express();

const PORT = process.env.PORT || 3000;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN;

const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

// --- Database ---
let pool = null;
if (DATABASE_URL) {
    pool = new pg.Pool({
        connectionString: DATABASE_URL,
        ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false }
    });
}

async function initDb() {
    if (!pool) {
        console.warn('DATABASE_URL not set — database features disabled.');
        return;
    }
    const schema = (await import('fs')).readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await pool.query(schema);
    console.log('Database tables initialized.');
}

// --- Auth helpers ---
function generateShortCode() {
    return crypto.randomBytes(6).toString('base64url').slice(0, 8);
}

function createToken(userId) {
    const payload = Buffer.from(JSON.stringify({
        userId,
        exp: Date.now() + 30 * 24 * 60 * 60 * 1000
    })).toString('base64url');
    const sig = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('base64url');
    return `${payload}.${sig}`;
}

function verifyToken(token) {
    try {
        const [payload, sig] = token.split('.');
        if (!payload || !sig) return null;
        const expected = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('base64url');
        if (sig !== expected) return null;
        const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
        if (data.exp < Date.now()) return null;
        return data;
    } catch {
        return null;
    }
}

async function verifyGoogleToken(credential) {
    try {
        // Decode the JWT payload directly (Google ID tokens are standard JWTs)
        const parts = credential.split('.');
        if (parts.length !== 3) return null;
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

        // Verify issuer
        if (payload.iss !== 'accounts.google.com' && payload.iss !== 'https://accounts.google.com') {
            console.error('Google token: invalid issuer', payload.iss);
            return null;
        }
        // Verify audience
        if (GOOGLE_CLIENT_ID && payload.aud !== GOOGLE_CLIENT_ID) {
            console.error('Google token: audience mismatch', payload.aud, '!=', GOOGLE_CLIENT_ID);
            return null;
        }
        // Verify not expired
        if (payload.exp && payload.exp * 1000 < Date.now()) {
            console.error('Google token: expired');
            return null;
        }

        console.log('Google token verified for:', payload.email);
        return payload;
    } catch (err) {
        console.error('Google token verification failed:', err);
        return null;
    }
}

function authMiddleware(required = true) {
    return async (req, res, next) => {
        const header = req.headers.authorization || '';
        const token = header.startsWith('Bearer ') ? header.slice(7) : null;
        if (!token) {
            if (required) return res.status(401).json({ error: 'Authentication required' });
            req.user = null;
            return next();
        }
        const decoded = verifyToken(token);
        if (!decoded) {
            if (required) return res.status(401).json({ error: 'Invalid or expired token' });
            req.user = null;
            return next();
        }
        try {
            const result = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
            if (result.rows.length === 0) {
                if (required) return res.status(401).json({ error: 'User not found' });
                req.user = null;
                return next();
            }
            req.user = result.rows[0];
            next();
        } catch (err) {
            console.error('Auth middleware error:', err);
            if (required) return res.status(500).json({ error: 'Auth error' });
            req.user = null;
            next();
        }
    };
}

// --- CORS ---
const defaultAllowed = [
    'http://localhost:5173', 'http://127.0.0.1:5173',
    'http://localhost:3000', 'http://127.0.0.1:3000',
    'http://localhost:3001', 'http://127.0.0.1:3001',
    'http://localhost:5500', 'http://127.0.0.1:5500',
    'https://amplistack.amplitude.com',
    'https://amplitude.github.io',
    'https://kennethkutyn.github.io'
];
const envAllowed = (ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);
const allowedOrigins = new Set([...defaultAllowed, ...envAllowed]);
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.has(origin)) return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
    }
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '2mb' }));

// --- AI endpoint (existing) ---
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

app.post('/api/ai/transcript', async (req, res) => {
    try {
        const transcript = (req.body?.transcript || '').toString().trim();
        if (!transcript) return res.status(400).json({ error: 'Transcript is required.' });
        if (!openai) return res.status(500).json({ error: 'Missing OpenAI API key on server.' });

        const completion = await openai.chat.completions.create({
            model: OPENAI_MODEL,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: `Transcript:\n${transcript}` }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.2
        });

        const content = completion.choices?.[0]?.message?.content;
        if (!content) throw new Error('Empty response from OpenAI.');

        let parsed;
        try { parsed = JSON.parse(content); }
        catch { throw new Error('Failed to parse OpenAI response as JSON.'); }

        return res.json({ data: parsed });
    } catch (error) {
        console.error('AI transcript error', error);
        const status = error?.status;
        const safeStatus = status && status >= 400 && status < 600 ? status : 500;
        return res.status(safeStatus).json({ error: 'AI request failed', details: error?.message || 'Unknown error' });
    }
});

// --- Auth endpoints ---
app.post('/api/auth/google', async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'Database not configured' });

    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: 'Missing credential' });

    const googleUser = await verifyGoogleToken(credential);
    if (!googleUser) return res.status(401).json({ error: 'Invalid Google credential' });

    const email = (googleUser.email || '').toLowerCase();
    console.log('Login attempt:', email, '| hd:', googleUser.hd);
    if (!email.endsWith('@amplitude.com')) {
        return res.status(403).json({ error: 'Only @amplitude.com accounts are allowed' });
    }

    try {
        // Upsert user
        const result = await pool.query(
            `INSERT INTO users (google_id, email, name, avatar_url)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (google_id) DO UPDATE SET name = $3, avatar_url = $4
             RETURNING *`,
            [googleUser.sub, email, googleUser.name || email.split('@')[0], googleUser.picture || null]
        );
        const user = result.rows[0];
        const token = createToken(user.id);

        return res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                avatar_url: user.avatar_url
            }
        });
    } catch (err) {
        console.error('Auth error:', err);
        return res.status(500).json({ error: 'Login failed' });
    }
});

app.get('/api/auth/me', authMiddleware(true), (req, res) => {
    res.json({
        user: {
            id: req.user.id,
            email: req.user.email,
            name: req.user.name,
            avatar_url: req.user.avatar_url
        }
    });
});

// --- Diagram endpoints ---

// List diagrams (owned + accessed)
app.get('/api/diagrams', authMiddleware(true), async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT d.id, d.short_code, d.title, d.created_at, d.updated_at, d.owner_id,
                    da.role, da.last_accessed_at
             FROM diagram_access da
             JOIN diagrams d ON d.id = da.diagram_id
             WHERE da.user_id = $1
             ORDER BY da.last_accessed_at DESC`,
            [req.user.id]
        );
        const diagrams = result.rows.map(r => ({
            short_code: r.short_code,
            title: r.title,
            role: r.role,
            created_at: r.created_at,
            updated_at: r.updated_at,
            last_accessed_at: r.last_accessed_at
        }));
        res.json({ diagrams });
    } catch (err) {
        console.error('List diagrams error:', err);
        res.status(500).json({ error: 'Failed to list diagrams' });
    }
});

// Save new diagram
app.post('/api/diagrams', authMiddleware(true), async (req, res) => {
    const { title, state_json } = req.body;
    if (!state_json) return res.status(400).json({ error: 'state_json is required' });

    let shortCode;
    for (let i = 0; i < 5; i++) {
        shortCode = generateShortCode();
        const exists = await pool.query('SELECT 1 FROM diagrams WHERE short_code = $1', [shortCode]);
        if (exists.rows.length === 0) break;
    }

    try {
        const result = await pool.query(
            `INSERT INTO diagrams (short_code, owner_id, title, state_json)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [shortCode, req.user.id, title || 'Untitled Diagram', state_json]
        );
        const diagram = result.rows[0];

        // Record owner access
        await pool.query(
            `INSERT INTO diagram_access (user_id, diagram_id, role, last_accessed_at)
             VALUES ($1, $2, 'owner', NOW())
             ON CONFLICT (user_id, diagram_id) DO UPDATE SET last_accessed_at = NOW()`,
            [req.user.id, diagram.id]
        );

        res.json({
            short_code: diagram.short_code,
            title: diagram.title,
            created_at: diagram.created_at,
            updated_at: diagram.updated_at
        });
    } catch (err) {
        console.error('Save diagram error:', err);
        res.status(500).json({ error: 'Failed to save diagram' });
    }
});

// Load diagram by short code
app.get('/api/diagrams/:shortCode', authMiddleware(true), async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM diagrams WHERE short_code = $1',
            [req.params.shortCode]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Diagram not found' });

        const diagram = result.rows[0];

        // Record access
        await pool.query(
            `INSERT INTO diagram_access (user_id, diagram_id, role, last_accessed_at)
             VALUES ($1, $2, 'viewer', NOW())
             ON CONFLICT (user_id, diagram_id) DO UPDATE SET last_accessed_at = NOW()`,
            [req.user.id, diagram.id]
        );

        res.json({
            short_code: diagram.short_code,
            title: diagram.title,
            state_json: diagram.state_json,
            owner_id: diagram.owner_id,
            created_at: diagram.created_at,
            updated_at: diagram.updated_at
        });
    } catch (err) {
        console.error('Load diagram error:', err);
        res.status(500).json({ error: 'Failed to load diagram' });
    }
});

// Update diagram
app.put('/api/diagrams/:shortCode', authMiddleware(true), async (req, res) => {
    const { title, state_json } = req.body;
    if (!state_json) return res.status(400).json({ error: 'state_json is required' });

    try {
        const result = await pool.query(
            `UPDATE diagrams SET title = $1, state_json = $2, updated_at = NOW()
             WHERE short_code = $3
             RETURNING *`,
            [title || 'Untitled Diagram', state_json, req.params.shortCode]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Diagram not found' });

        const diagram = result.rows[0];

        // Update access role to editor if not owner
        await pool.query(
            `INSERT INTO diagram_access (user_id, diagram_id, role, last_accessed_at)
             VALUES ($1, $2, 'editor', NOW())
             ON CONFLICT (user_id, diagram_id) DO UPDATE SET
                role = CASE WHEN diagram_access.role = 'owner' THEN 'owner' ELSE 'editor' END,
                last_accessed_at = NOW()`,
            [req.user.id, diagram.id]
        );

        res.json({
            short_code: diagram.short_code,
            title: diagram.title,
            updated_at: diagram.updated_at
        });
    } catch (err) {
        console.error('Update diagram error:', err);
        res.status(500).json({ error: 'Failed to update diagram' });
    }
});

// Delete diagram (owner only)
app.delete('/api/diagrams/:shortCode', authMiddleware(true), async (req, res) => {
    try {
        const diagram = await pool.query(
            'SELECT * FROM diagrams WHERE short_code = $1',
            [req.params.shortCode]
        );
        if (diagram.rows.length === 0) return res.status(404).json({ error: 'Diagram not found' });
        if (diagram.rows[0].owner_id !== req.user.id) {
            return res.status(403).json({ error: 'Only the owner can delete this diagram' });
        }

        await pool.query('DELETE FROM diagram_access WHERE diagram_id = $1', [diagram.rows[0].id]);
        await pool.query('DELETE FROM diagrams WHERE id = $1', [diagram.rows[0].id]);
        res.json({ ok: true });
    } catch (err) {
        console.error('Delete diagram error:', err);
        res.status(500).json({ error: 'Failed to delete diagram' });
    }
});

// Duplicate diagram
app.post('/api/diagrams/:shortCode/fork', authMiddleware(true), async (req, res) => {
    try {
        const original = await pool.query(
            'SELECT * FROM diagrams WHERE short_code = $1',
            [req.params.shortCode]
        );
        if (original.rows.length === 0) return res.status(404).json({ error: 'Diagram not found' });

        const source = original.rows[0];
        let shortCode;
        for (let i = 0; i < 5; i++) {
            shortCode = generateShortCode();
            const exists = await pool.query('SELECT 1 FROM diagrams WHERE short_code = $1', [shortCode]);
            if (exists.rows.length === 0) break;
        }

        const result = await pool.query(
            `INSERT INTO diagrams (short_code, owner_id, title, state_json)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [shortCode, req.user.id, `${source.title} (copy)`, source.state_json]
        );
        const diagram = result.rows[0];

        await pool.query(
            `INSERT INTO diagram_access (user_id, diagram_id, role, last_accessed_at)
             VALUES ($1, $2, 'owner', NOW())`,
            [req.user.id, diagram.id]
        );

        res.json({
            short_code: diagram.short_code,
            title: diagram.title,
            created_at: diagram.created_at
        });
    } catch (err) {
        console.error('Fork diagram error:', err);
        res.status(500).json({ error: 'Failed to fork diagram' });
    }
});

// --- Start server ---
(async () => {
    await initDb();
    app.listen(PORT, () => {
        console.log(`AI proxy listening on port ${PORT}`);
        if (pool) console.log('Database connected.');
        else console.log('Running without database (no DATABASE_URL).');
    });
})();
