-- AmpliStack Database Schema
-- Run this against your PostgreSQL database to initialize tables.

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  google_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS diagrams (
  id SERIAL PRIMARY KEY,
  short_code TEXT UNIQUE NOT NULL,
  owner_id INTEGER REFERENCES users(id),
  title TEXT DEFAULT 'Untitled Diagram',
  state_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS diagram_access (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  diagram_id INTEGER REFERENCES diagrams(id),
  role TEXT DEFAULT 'viewer',
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, diagram_id)
);

CREATE INDEX IF NOT EXISTS idx_diagrams_short_code ON diagrams(short_code);
CREATE INDEX IF NOT EXISTS idx_diagram_access_user ON diagram_access(user_id);
CREATE INDEX IF NOT EXISTS idx_diagram_access_diagram ON diagram_access(diagram_id);
