const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');

const DB_PATH = path.join(__dirname, '..', 'data', 'site.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function initDb() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS collections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      designer TEXT DEFAULT '',
      description TEXT DEFAULT '[]',
      sort_order INTEGER DEFAULT 0,
      is_published INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS collection_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
      image_path TEXT NOT NULL,
      image_type TEXT DEFAULT 'card',
      sort_order INTEGER DEFAULT 0,
      alt_text TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      content TEXT DEFAULT '{}',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      label TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      original_name TEXT DEFAULT '',
      path TEXT NOT NULL,
      mime_type TEXT DEFAULT '',
      size INTEGER DEFAULT 0,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  return db;
}

function seedDefaults() {
  const db = getDb();

  // Create default admin user if none exists
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCount.count === 0) {
    const hash = bcrypt.hashSync('admin', 10);
    db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run('admin', hash);
  }

  // Seed collections from SYSTEMS_DATA
  const collectionCount = db.prepare('SELECT COUNT(*) as count FROM collections').get();
  if (collectionCount.count === 0) {
    const systems = [
      {
        slug: 'tangram',
        name: 'Tangram',
        designer: 'Design by Garcia Cumini',
        desc: [
          'Модульная система со свободной геометрией.',
          'Позволяет создавать острова и композиции сложной формы, подстраиваясь под архитектуру пространства.',
          'Акцент на пластичность и игру света.'
        ],
        images: ['images/tangram/tangram_1.webp', 'images/tangram/tangram_2.webp', 'images/tangram/tangram_3.webp']
      },
      {
        slug: 'maxima',
        name: 'Maxima 2.2',
        designer: 'Design by R&D Cesar',
        desc: [
          'Строгая и универсальная архитектурная система.',
          'Подходит для индивидуальных проектов и сложных планировок.',
          'Чёткая геометрия и контроль каждой детали.'
        ],
        images: ['images/maxima/maxima_1.webp', 'images/maxima/maxima_2.webp', 'images/maxima/maxima_3.webp']
      },
      {
        slug: 'unit',
        name: 'Unit',
        designer: 'Design by Garcia Cumini',
        desc: [
          'Гибкая система для современного образа жизни.',
          'Кухня как центр дома, открытая к изменениям и новым сценариям.',
          'Функциональность, технологичность и свобода компоновки.'
        ],
        images: ['images/unit/unit_1.webp', 'images/unit/unit_2.webp', 'images/unit/unit_3.webp']
      },
      {
        slug: 'n-elle',
        name: 'N_Elle',
        designer: 'Design by R&D Cesar',
        desc: [
          'Кухня о тишине и балансе.',
          'Минималистичная система, где форма, материал и пространство работают вместе.',
          'Для сдержанных интерьеров и спокойного ритма жизни.'
        ],
        images: ['images/n-elle/n-elle_1.webp', 'images/n-elle/n-elle_2.webp', 'images/n-elle/n-elle_3.webp']
      },
      {
        slug: 'intarsio',
        name: 'Intarsio',
        designer: 'Design by Garcia Cumini',
        desc: [
          'Архитектурная система, основанная на работе с плоскостью и материалом. Игра пропорций и текстур формирует выразительный, но сдержанный образ. Для интерьеров, где кухня становится частью общей архитектуры.'
        ],
        images: ['images/intarsio/intarsio_1.webp', 'images/intarsio/intarsio_2.webp', 'images/intarsio/intarsio_3.webp']
      }
    ];

    const insertCollection = db.prepare(
      'INSERT INTO collections (slug, name, designer, description, sort_order) VALUES (?, ?, ?, ?, ?)'
    );
    const insertImage = db.prepare(
      'INSERT INTO collection_images (collection_id, image_path, image_type, sort_order) VALUES (?, ?, ?, ?)'
    );

    const insertAll = db.transaction(() => {
      systems.forEach((sys, idx) => {
        const result = insertCollection.run(sys.slug, sys.name, sys.designer, JSON.stringify(sys.desc), idx);
        sys.images.forEach((img, imgIdx) => {
          insertImage.run(result.lastInsertRowid, img, 'card', imgIdx);
        });
      });
    });

    insertAll();
  }

  // Seed default settings
  const settingsCount = db.prepare('SELECT COUNT(*) as count FROM settings').get();
  if (settingsCount.count === 0) {
    const defaults = [
      { key: 'site_phone', value: '+7 (495) 000-00-00', label: 'Телефон' },
      { key: 'site_email', value: 'INTERIORTODAY@MAIL.RU', label: 'Email' },
      { key: 'site_address', value: '12345, Москва Россия', label: 'Адрес (строка 1)' },
      { key: 'site_address_2', value: 'ул. Примерная, д. 1', label: 'Адрес (строка 2)' },
      { key: 'site_hours', value: 'Пн-Пт 10:00 — 19:00', label: 'Часы работы' },
      { key: 'form_recipient', value: 'INTERIORTODAY@MAIL.RU', label: 'Получатель заявок' },
      { key: 'form_subject', value: 'Заявка на консультацию Cesar Studio', label: 'Тема письма' }
    ];

    const insertSetting = db.prepare('INSERT INTO settings (key, value, label) VALUES (?, ?, ?)');
    const insertAllSettings = db.transaction(() => {
      defaults.forEach(s => insertSetting.run(s.key, s.value, s.label));
    });
    insertAllSettings();
  }
}

module.exports = { getDb, initDb, seedDefaults };
