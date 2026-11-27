-- Flo Lite TV v5.0 — Cloudflare D1 Schema (SQLite)
-- Free tier Cloudflare D1 database: users, licenses, payments, activation_codes, stream_catalog

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  label TEXT,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'customer',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS licenses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  device_id TEXT NOT NULL UNIQUE,
  pairing_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'trial',
  trial_used INTEGER NOT NULL DEFAULT 1,
  plan_days INTEGER NOT NULL DEFAULT 7,
  expires_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_licenses_device_id ON licenses(device_id);
CREATE INDEX IF NOT EXISTS idx_licenses_pairing_code ON licenses(pairing_code);
CREATE INDEX IF NOT EXISTS idx_licenses_expires_at ON licenses(expires_at);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  license_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  external_tx_id TEXT UNIQUE,
  amount_ron REAL NOT NULL DEFAULT 6.0,
  currency TEXT NOT NULL DEFAULT 'RON',
  amount_charged TEXT,
  status TEXT NOT NULL,
  note TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (license_id) REFERENCES licenses(id)
);

CREATE INDEX IF NOT EXISTS idx_payments_license ON payments(license_id);
CREATE INDEX IF NOT EXISTS idx_payments_tx ON payments(external_tx_id);

CREATE TABLE IF NOT EXISTS activation_codes (
  code TEXT PRIMARY KEY,
  days INTEGER NOT NULL DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'unused',
  used_by_license_id TEXT,
  used_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS stream_catalog (
  id TEXT PRIMARY KEY,
  payload_json TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL
);
