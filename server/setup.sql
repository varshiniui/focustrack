-- Run this first:
-- psql -U postgres -f server/setup.sql

CREATE DATABASE focus_tracker;

\c focus_tracker

CREATE TABLE IF NOT EXISTS time_logs (
  id         SERIAL PRIMARY KEY,
  domain     TEXT NOT NULL,
  duration   INTEGER NOT NULL DEFAULT 0,
  category   TEXT NOT NULL DEFAULT 'uncategorized',
  logged_at  DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS site_rules (
  id         SERIAL PRIMARY KEY,
  domain     TEXT UNIQUE NOT NULL,
  category   TEXT NOT NULL DEFAULT 'uncategorized',
  blocked    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_goals (
  id                 SERIAL PRIMARY KEY,
  productive_target  INTEGER NOT NULL DEFAULT 240,
  unproductive_limit INTEGER NOT NULL DEFAULT 60,
  goal_date          DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE(goal_date)
);

SELECT 'Focus Tracker DB setup complete!' AS status;