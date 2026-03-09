const express = require('express');
const { getDb } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Public: list pages
router.get('/', (req, res) => {
  const db = getDb();
  const pages = db.prepare('SELECT slug, title, updated_at FROM pages ORDER BY slug').all();
  res.json(pages);
});

// Public: get page content
router.get('/:slug', (req, res) => {
  const db = getDb();
  const page = db.prepare('SELECT * FROM pages WHERE slug = ?').get(req.params.slug);
  if (!page) return res.status(404).json({ error: 'Not found' });

  res.json({
    ...page,
    content: JSON.parse(page.content || '{}')
  });
});

// Admin: update page content
router.put('/:slug', requireAuth, (req, res) => {
  const db = getDb();
  const { title, content } = req.body;
  const slug = req.params.slug;

  const existing = db.prepare('SELECT * FROM pages WHERE slug = ?').get(slug);
  if (existing) {
    db.prepare('UPDATE pages SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE slug = ?')
      .run(title || existing.title, JSON.stringify(content || {}), slug);
  } else {
    db.prepare('INSERT INTO pages (slug, title, content) VALUES (?, ?, ?)')
      .run(slug, title || slug, JSON.stringify(content || {}));
  }

  res.json({ ok: true });
});

module.exports = router;
