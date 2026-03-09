const express = require('express');
const { getDb } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Public: get all settings
router.get('/', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM settings ORDER BY key').all();
  const result = {};
  rows.forEach(r => {
    result[r.key] = { value: r.value, label: r.label };
  });
  res.json(result);
});

// Admin: update settings (batch)
router.put('/', requireAuth, (req, res) => {
  const db = getDb();
  const updates = req.body; // { key: value, ... }

  const upsert = db.prepare(`
    INSERT INTO settings (key, value, label) VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);

  const updateAll = db.transaction(() => {
    Object.entries(updates).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        upsert.run(key, value.value || '', value.label || key);
      } else {
        upsert.run(key, String(value), key);
      }
    });
  });

  updateAll();
  res.json({ ok: true });
});

module.exports = router;
