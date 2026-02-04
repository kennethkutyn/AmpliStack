# AmpliStack

Interactive architecture diagram for the Amplitude stack. Static client + optional OpenAI proxy.

## Repo layout
- Client (static): root files `index.html`, `styles.css`, `app.js`, `js/`, `assets/`.
- Proxy (server): `proxy/` with `index.js`, `package.json`, `Dockerfile`, `env.example`.
- Ignore real secrets: `.env`, `proxy/.env`, `node_modules` are gitignored.

## Running the client locally (no proxy calls)
- Serve the root statics (modules won’t load over `file://`):
  - `python3 -m http.server 5173` → open `http://localhost:5173`
  - or `npx serve . --listen 5173`
  - or VS Code/ Cursor “Go Live”.

## Running the proxy locally
```
cd proxy
npm install
cp env.example .env   # set OPENAI_API_KEY, optional OPENAI_MODEL, ALLOWED_ORIGIN, PORT
npm run dev           # listens on PORT (default 3000)
```

> Note: env vars are only read from `proxy/.env`. The client is static and ignores `.env` in the repo root.

## Point client to local vs Railway proxy
- Default base: `https://amplistack-production.up.railway.app` (set in `js/ai.js`).
- To use local proxy while developing, set before loading scripts (e.g. in `index.html`):
  ```html
  <script>window.AMPLISTACK_API_BASE_URL = 'http://localhost:3000';</script>
  ```
  Remove/comment this to revert to Railway.

## Deploying
- Proxy on Railway: deploy from `proxy/` (monorepo root); add `OPENAI_API_KEY` in Railway Variables; no need to set `PORT` (Railway injects it). Dockerfile handles install/start.
- Client on GitHub Pages: serve the root statics (or `/docs` if you move them). No build step required.

## Notes
- Diagram state persists in `localStorage`.
- OpenAI key stays server-side; the client never sees it.***
