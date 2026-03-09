const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getDb } = require('../db');
const { requireAuth } = require('../middleware/auth');

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'data', 'uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .toLowerCase();
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e4);
    cb(null, name + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|webp|gif|svg|avif)$/i;
    if (allowed.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

const router = express.Router();

// Admin: upload file
router.post('/upload', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const db = getDb();
  const relativePath = 'data/uploads/' + req.file.filename;

  const result = db.prepare(
    'INSERT INTO media (filename, original_name, path, mime_type, size) VALUES (?, ?, ?, ?, ?)'
  ).run(req.file.filename, req.file.originalname, relativePath, req.file.mimetype, req.file.size);

  res.json({
    ok: true,
    id: result.lastInsertRowid,
    filename: req.file.filename,
    path: relativePath,
    url: '/' + relativePath
  });
});

// Admin: list files
router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const files = db.prepare('SELECT * FROM media ORDER BY uploaded_at DESC').all();
  res.json(files.map(f => ({
    ...f,
    url: '/' + f.path
  })));
});

// Admin: delete file
router.delete('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const file = db.prepare('SELECT * FROM media WHERE id = ?').get(parseInt(req.params.id));
  if (!file) return res.status(404).json({ error: 'Not found' });

  const fullPath = path.join(__dirname, '..', '..', file.path);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }

  db.prepare('DELETE FROM media WHERE id = ?').run(file.id);
  res.json({ ok: true });
});

module.exports = router;
