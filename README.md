# AmpliStack

Interactive, client-side architecture diagram for the Amplitude stack. Everything runs in the browser—no backend or build step required—just serve the static files.

## Prerequisites
- Modern browser (Chrome, Edge, or Safari).
- Any simple local HTTP server (needed because modules don’t load over `file://`).

## Run locally

### Easiest: “Go Live” in Cursor/VS Code
1. Open the project folder in Cursor/VS Code.
2. Open `index.html`.
3. Click “Go Live” (from the status bar or Command Palette). This launches a local server and opens the app in your browser.

### Alternative: quick ad-hoc server
From the project root:
- Python: `python3 -m http.server 5173` then visit `http://localhost:5173`
- Node (if installed): `npx serve . --listen 5173` then visit `http://localhost:5173`

Stop the server with `Ctrl+C`.

## How it works
- Static assets live in `index.html`, `styles.css`, and the `js/` modules.
- Diagram state (title, last edited, layout) is persisted in `localStorage`.

## Project layout
- `index.html` – page shell and component containers.
- `styles.css` – layout and styling.
- `app.js` – app bootstrap, title/last-edited wiring.
- `js/` – feature modules (nodes, state, persistence, connections, layout, analytics).
- `assets/` – icons and logos for providers/connectors.
