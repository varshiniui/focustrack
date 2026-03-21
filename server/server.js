const express = require("express");
const cors    = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  host:     process.env.PG_HOST     || "localhost",
  port:     process.env.PG_PORT     || 5432,
  database: process.env.PG_DB       || "focustrack",
  user:     process.env.PG_USER     || "postgres",
  password: process.env.PG_PASSWORD || "postgre123",
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS time_logs (
      id         SERIAL PRIMARY KEY,
      user_id    TEXT    NOT NULL DEFAULT 'default',
      domain     TEXT    NOT NULL,
      seconds    INTEGER NOT NULL DEFAULT 0,
      category   TEXT    NOT NULL DEFAULT 'unproductive',
      date       DATE    NOT NULL DEFAULT CURRENT_DATE,
      UNIQUE (user_id, domain, date)
    );
    CREATE TABLE IF NOT EXISTS site_categories (
      domain   TEXT PRIMARY KEY,
      category TEXT NOT NULL DEFAULT 'unproductive',
      label    TEXT
    );
    CREATE TABLE IF NOT EXISTS blocked_sites (
      id      SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'default',
      domain  TEXT NOT NULL,
      UNIQUE (user_id, domain)
    );
    CREATE TABLE IF NOT EXISTS daily_goals (
      id              SERIAL PRIMARY KEY,
      user_id         TEXT    NOT NULL DEFAULT 'default',
      productive_goal INTEGER NOT NULL DEFAULT 14400,
      date            DATE    NOT NULL DEFAULT CURRENT_DATE,
      UNIQUE (user_id, date)
    );
  `);

  // Seed productive sites
  await pool.query(`
    INSERT INTO site_categories (domain, category, label) VALUES
      ('github.com','productive','Development'),
      ('stackoverflow.com','productive','Development'),
      ('developer.mozilla.org','productive','Development'),
      ('leetcode.com','productive','Development'),
      ('codepen.io','productive','Development'),
      ('docs.google.com','productive','Work'),
      ('notion.so','productive','Work'),
      ('figma.com','productive','Design'),
      ('youtube.com','unproductive','Entertainment'),
      ('instagram.com','unproductive','Social Media'),
      ('twitter.com','unproductive','Social Media'),
      ('x.com','unproductive','Social Media'),
      ('facebook.com','unproductive','Social Media'),
      ('reddit.com','unproductive','Social Media'),
      ('netflix.com','unproductive','Entertainment'),
      ('tiktok.com','unproductive','Entertainment')
    ON CONFLICT (domain) DO NOTHING;
  `);
  console.log("✅ Database ready");
}

// ── LOG TIME ──
app.post("/api/log", async (req, res) => {
  const { user_id = "default", domain, seconds } = req.body;
  if (!domain || !seconds) return res.status(400).json({ error: "Missing fields" });
  try {
    const cat = await pool.query(
      "SELECT category FROM site_categories WHERE domain = $1", [domain]
    );
    const category = cat.rows[0]?.category || "unproductive";

    await pool.query(`
      INSERT INTO time_logs (user_id, domain, seconds, category, date)
      VALUES ($1, $2, $3, $4, CURRENT_DATE)
      ON CONFLICT (user_id, domain, date)
      DO UPDATE SET seconds = time_logs.seconds + EXCLUDED.seconds
    `, [user_id, domain, seconds, category]);

    res.json({ ok: true, category });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── TODAY STATS ──
app.get("/api/stats/today", async (req, res) => {
  const { user_id = "default" } = req.query;
  try {
    const logs = await pool.query(`
      SELECT domain, seconds, category FROM time_logs
      WHERE user_id = $1 AND date = CURRENT_DATE
      ORDER BY seconds DESC
    `, [user_id]);

    const total        = logs.rows.reduce((s, r) => s + r.seconds, 0);
    const productive   = logs.rows.filter(r => r.category === "productive").reduce((s, r) => s + r.seconds, 0);
    const unproductive = total - productive;
    const goalRes      = await pool.query(
      "SELECT productive_goal FROM daily_goals WHERE user_id=$1 AND date=CURRENT_DATE", [user_id]
    );
    const goal = goalRes.rows[0]?.productive_goal || 14400;

    res.json({ sites: logs.rows, total, productive, unproductive, goal });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── WEEKLY STATS ──
app.get("/api/stats/weekly", async (req, res) => {
  const { user_id = "default" } = req.query;
  try {
    const daily = await pool.query(`
      SELECT date, category, SUM(seconds) as seconds FROM time_logs
      WHERE user_id=$1 AND date >= CURRENT_DATE - INTERVAL '6 days'
      GROUP BY date, category ORDER BY date ASC
    `, [user_id]);
    const top = await pool.query(`
      SELECT domain, SUM(seconds) as seconds, category FROM time_logs
      WHERE user_id=$1 AND date >= CURRENT_DATE - INTERVAL '6 days'
      GROUP BY domain, category ORDER BY seconds DESC LIMIT 10
    `, [user_id]);
    res.json({ daily: daily.rows, topSites: top.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── BLOCKED SITES ──
app.get("/api/blocked", async (req, res) => {
  const { user_id = "default" } = req.query;
  try {
    const r = await pool.query("SELECT domain FROM blocked_sites WHERE user_id=$1", [user_id]);
    res.json(r.rows.map(r => r.domain));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/blocked", async (req, res) => {
  const { user_id = "default", domain } = req.body;
  try {
    await pool.query(
      "INSERT INTO blocked_sites (user_id, domain) VALUES ($1,$2) ON CONFLICT DO NOTHING",
      [user_id, domain]
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/blocked/:domain", async (req, res) => {
  const { user_id = "default" } = req.query;
  try {
    await pool.query("DELETE FROM blocked_sites WHERE user_id=$1 AND domain=$2",
      [user_id, req.params.domain]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── CATEGORIES ──
app.get("/api/categories", async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM site_categories ORDER BY domain");
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/categories", async (req, res) => {
  const { domain, category, label } = req.body;
  try {
    await pool.query(`
      INSERT INTO site_categories (domain, category, label) VALUES ($1,$2,$3)
      ON CONFLICT (domain) DO UPDATE SET category=$2, label=$3
    `, [domain, category, label || ""]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GOAL ──
app.post("/api/goal", async (req, res) => {
  const { user_id = "default", productive_goal } = req.body;
  try {
    await pool.query(`
      INSERT INTO daily_goals (user_id, productive_goal, date) VALUES ($1,$2,CURRENT_DATE)
      ON CONFLICT (user_id, date) DO UPDATE SET productive_goal=$2
    `, [user_id, productive_goal]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/", (req, res) => res.json({ status: "ok", message: "FocusTrack server running" }));

const PORT = process.env.PORT || 3002;
initDB().then(() =>
  app.listen(PORT, () => console.log(`\n🚀 FocusTrack server running on http://localhost:${PORT}\n`))
).catch(err => {
  console.error("DB init failed:", err.message);
  app.listen(PORT, () => console.log(`🚀 Server running (no DB) on port ${PORT}`));
});