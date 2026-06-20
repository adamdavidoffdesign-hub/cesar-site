const express = require('express');
const compression = require('compression');
const session = require('express-session');
const path = require('path');
const { initDb, seedDefaults } = require('./db');

// Initialize database
initDb();
seedDefaults();

const app = express();
const PORT = process.env.PORT || 3000;

// Session store (SQLite-backed)
const SQLiteStore = require('connect-sqlite3')(session);

app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  store: new SQLiteStore({
    db: 'sessions.db',
    dir: path.join(__dirname, '..', 'data')
  }),
  secret: process.env.SESSION_SECRET || 'cesar-studio-admin-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    sameSite: 'lax'
  }
}));

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/collections', require('./routes/collections'));
app.use('/api/pages', require('./routes/pages'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/media', require('./routes/media'));
app.use('/api/contact', require('./routes/contact'));

// Serve uploaded files
app.use('/data/uploads', express.static(path.join(__dirname, '..', 'data', 'uploads')));

// Serve admin panel
app.use('/admin', express.static(path.join(__dirname, '..', 'admin')));

// Serve the public site (static files from project root)
app.use(express.static(path.join(__dirname, '..'), {
  index: 'index.html',
  extensions: ['html'],
  setHeaders(res, filePath) {
    if (/\.(css|js|woff2?|ttf|otf)$/.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (/\.(webp|jpg|jpeg|png|svg|ico)$/.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=2592000');
    } else if (/\.html$/.test(filePath)) {
      res.setHeader('Cache-Control', 'no-cache');
    }
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }
}));

// 404 handler
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, '..', '404.html'));
});

app.listen(PORT, () => {
  console.log(`Cesar Studio server running on http://localhost:${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin`);
});
