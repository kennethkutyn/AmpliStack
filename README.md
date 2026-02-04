# AmpliStack

Interactive architecture diagram for the Amplitude stack. Static client + optional OpenAI proxy.

## Repo layout
- Client (static, hosted on GH pages from Amplitude GH org): almost all the logic
- Proxy (NPN, deployed on Railway, managed by Ken, from KK GH org): has OpenAI API keys and proxies requests to API

## Running the client locally (no proxy calls)
- Serve the root statics (modules won’t load over `file://`):
  - `python3 -m http.server 5173` → open `http://localhost:5173`
  - or `npx serve . --listen 5173`
  - or VS Code/ Cursor “Go Live”.

## Running the proxy locally - NOT REQUIRED UNLESS YOU WANT TO CHANGE THE PROXY, MOST LOGIC IS IN CLIENT
```
Swap Base URL code from raileway to localhost: 
    <script>
        window.AMPLISTACK_API_BASE_URL = 'https://amplistack-production.up.railway.app';
        //window.AMPLISTACK_API_BASE_URL = 'http://localhost:3000';

    </script>

cd proxy
npm install
cp env.example .env   # set OPENAI_API_KEY, optional OPENAI_MODEL, ALLOWED_ORIGIN, PORT
npm run dev           # listens on PORT (default 3000)
```

> Note: env vars are only read from `proxy/.env`. The client is static and ignores `.env` in the repo root.


## Deploying
- Proxy on Railway: git push
- Client on GitHub Pages: git push, then KK to test and manually sync to Amplitude GH org repo to update amplistack.amplitude.com

