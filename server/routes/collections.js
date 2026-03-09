const express = require('express');
const { getDb } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Public: get all published collections
router.get('/', (req, res) => {
  const db = getDb();
  const isAdmin = req.session && req.session.userId;
  const collections = isAdmin
    ? db.prepare('SELECT * FROM collections ORDER BY sort_order').all()
    : db.prepare('SELECT * FROM collections WHERE is_published = 1 ORDER BY sort_order').all();

  const images = db.prepare('SELECT * FROM collection_images ORDER BY sort_order').all();
  const imagesByCollection = {};
  images.forEach(img => {
    if (!imagesByCollection[img.collection_id]) imagesByCollection[img.collection_id] = [];
    imagesByCollection[img.collection_id].push(img);
  });

  const result = collections.map(c => ({
    ...c,
    description: JSON.parse(c.description || '[]'),
    images: (imagesByCollection[c.id] || []).filter(i => i.image_type === 'card').map(i => i.image_path),
    catalogImages: (imagesByCollection[c.id] || []).filter(i => i.image_type === 'catalog').map(i => ({
      id: i.id,
      path: i.image_path,
      alt: i.alt_text
    })),
    link: 'collections/' + c.slug + '.html'
  }));

  res.json(result);
});

// Public: get single collection by slug
router.get('/:slug', (req, res) => {
  const db = getDb();
  const collection = db.prepare('SELECT * FROM collections WHERE slug = ?').get(req.params.slug);
  if (!collection) return res.status(404).json({ error: 'Not found' });

  const images = db.prepare('SELECT * FROM collection_images WHERE collection_id = ? ORDER BY sort_order').all(collection.id);

  res.json({
    ...collection,
    description: JSON.parse(collection.description || '[]'),
    images: images.filter(i => i.image_type === 'card').map(i => i.image_path),
    catalogImages: images.filter(i => i.image_type === 'catalog').map(i => ({
      id: i.id,
      path: i.image_path,
      alt: i.alt_text
    })),
    link: 'collections/' + collection.slug + '.html'
  });
});

// Admin: create collection
router.post('/', requireAuth, (req, res) => {
  const db = getDb();
  const { slug, name, designer, description, sort_order, is_published } = req.body;
  if (!slug || !name) return res.status(400).json({ error: 'slug and name required' });

  try {
    const result = db.prepare(
      'INSERT INTO collections (slug, name, designer, description, sort_order, is_published) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(slug, name, designer || '', JSON.stringify(description || []), sort_order || 0, is_published !== undefined ? is_published : 1);

    res.json({ ok: true, id: result.lastInsertRowid });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Admin: update collection
router.put('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const { name, designer, description, sort_order, is_published, slug } = req.body;
  const id = parseInt(req.params.id);

  const existing = db.prepare('SELECT * FROM collections WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  db.prepare(`
    UPDATE collections SET
      name = ?, designer = ?, description = ?, sort_order = ?, is_published = ?, slug = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    name || existing.name,
    designer !== undefined ? designer : existing.designer,
    description !== undefined ? JSON.stringify(description) : existing.description,
    sort_order !== undefined ? sort_order : existing.sort_order,
    is_published !== undefined ? is_published : existing.is_published,
    slug || existing.slug,
    id
  );

  res.json({ ok: true });
});

// Admin: delete collection
router.delete('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const id = parseInt(req.params.id);
  db.prepare('DELETE FROM collections WHERE id = ?').run(id);
  res.json({ ok: true });
});

// Admin: add image to collection
router.post('/:id/images', requireAuth, (req, res) => {
  const db = getDb();
  const { image_path, image_type, sort_order, alt_text } = req.body;
  const id = parseInt(req.params.id);

  const result = db.prepare(
    'INSERT INTO collection_images (collection_id, image_path, image_type, sort_order, alt_text) VALUES (?, ?, ?, ?, ?)'
  ).run(id, image_path, image_type || 'card', sort_order || 0, alt_text || '');

  res.json({ ok: true, id: result.lastInsertRowid });
});

// Admin: delete collection image
router.delete('/:id/images/:imageId', requireAuth, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM collection_images WHERE id = ? AND collection_id = ?')
    .run(parseInt(req.params.imageId), parseInt(req.params.id));
  res.json({ ok: true });
});

// Admin: reorder collections
router.put('/reorder/batch', requireAuth, (req, res) => {
  const db = getDb();
  const { order } = req.body; // [{id, sort_order}]
  if (!Array.isArray(order)) return res.status(400).json({ error: 'order array required' });

  const update = db.prepare('UPDATE collections SET sort_order = ? WHERE id = ?');
  const reorder = db.transaction(() => {
    order.forEach(item => update.run(item.sort_order, item.id));
  });
  reorder();
  res.json({ ok: true });
});

module.exports = router;
