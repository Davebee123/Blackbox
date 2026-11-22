-- The demo's telemetry (worker.js): one row an event. id: the install's random id; v: the build; k: the event's kind;
-- t: when (ms); p: play ms so far; L: level; data: the rest of the event as JSON.
CREATE TABLE IF NOT EXISTS events (id TEXT NOT NULL, v TEXT, k TEXT NOT NULL, t INTEGER NOT NULL, p INTEGER, L INTEGER, data TEXT);
CREATE INDEX IF NOT EXISTS events_id ON events (id);
CREATE INDEX IF NOT EXISTS events_k ON events (k);
