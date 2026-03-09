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
      page_content TEXT DEFAULT '[]',
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

  // Migration: add page_content column to existing DBs that don't have it
  const cols = db.pragma('table_info(collections)');
  if (!cols.some(c => c.name === 'page_content')) {
    db.exec("ALTER TABLE collections ADD COLUMN page_content TEXT DEFAULT '[]'");
  }

  return db;
}

// Full content extracted from the actual HTML collection pages
const COLLECTION_SEED = [
  {
    slug: 'tangram',
    name: 'Tangram',
    designer: 'Design by Garcia Cumini',
    description: [
      'Tangram состоит из пяти изогнутых элементов, которые можно комбинировать с прямыми элементами по желанию, создавая кухонные острова необычных форм, композиции у стены или даже решения, обвивающие углы.',
      'Чтобы подчеркнуть плавность линий Tangram, дверцы шкафов по запросу могут быть украшены специальным декоративным элементом: трехмерным элементом под названием Groove, состоящим из последовательности вертикальных надрезов.',
      'Неправильный контур, чередование полных и пустых пространств, а также игра света и тени скрывают проемы дверей, тем самым способствуя эффекту маскировки.'
    ],
    page_content: [
      { type: 'hero', image: 'images/tangram/catalog_02.png', alt: 'Кухня Tangram с плавным островом' },
      { type: 'rich_block', image: 'images/tangram/catalog_01.png', alt: 'Дизайнеры Garcia Cumini', text: 'Студия дизайна Garcia Cumini объединяет итальянскую и испанскую культуры с их креативностью, любовью к красоте и желанием жить полной жизнью. Она была создана в 2012 году дизайнерами Виченте Гарсиа Хименесом и Чинцией Кумини - дополняющими друг друга личностями, которые в работе и в личной жизни развивают собственный подход к проектированию и концепции Slow Design. Целостное видение, когда время и энергия концентрируются на поиске идеального решения и предварительном анализе с двух точек зрения: образ жизни тех, кто будет пользоваться проектом, и технические инновации с производственными процессами. Результат - создание форм и организация пространства, которые долго сохраняют гармонию эстетики, функциональности и технологии.' },
      { type: 'img_grid', layout: '3-left', images: [
        { src: 'images/tangram/catalog_09.png', alt: 'Tangram — кухня с деревянными фасадами' },
        { src: 'images/tangram/catalog_04.png', alt: 'Tangram — остров, вид сверху' },
        { src: 'images/tangram/catalog_07.png', alt: 'Tangram — мебельный модуль' }
      ]},
      { type: 'text_image', title: 'Winding', paragraphs: [
        'Поиск своего пути в жизни - это суть любого человека.',
        'Наиболее удачливыми оказываются не те, кто выбирает самый простой маршрут, а те, кто не боится поворотов и незнакомых направлений, в итоге достигая своих целей.'
      ], image: 'images/tangram/catalog_08.png', alt: 'Tangram Winding — столешница с волнообразным контуром' },
      { type: 'img_grid', layout: '3-right', images: [
        { src: 'images/tangram/catalog_06.png', alt: 'Tangram — зона приготовления' },
        { src: 'images/tangram/catalog_05.png', alt: 'Tangram — деталь фасада Groove' },
        { src: 'images/tangram/catalog_03.png', alt: 'Tangram — интерьер с композицией цвета терракота' }
      ]}
    ],
    images: ['images/tangram/tangram_1.webp', 'images/tangram/tangram_2.webp', 'images/tangram/tangram_3.webp']
  },
  {
    slug: 'maxima',
    name: 'Maxima 2.2',
    designer: 'Design by R&D Cesar',
    description: [
      'Maxima 2.2 — универсальная архитектурная система Cesar, отличающаяся широкими возможностями для самовыражения. Более 160 финишей в сочетании с различными способами открывания делают её гибким проектным инструментом, сохраняющим чёткость линий и внимание к материалам в любой компоновке.',
      'Система органично сочетается с другими коллекциями, переходя из кухни в жилую зону без потери единства стиля. Модульность и технологичность здесь не противоречат эстетике — они её усиливают.',
      'Широкий выбор материалов, цветов и систем открывания позволяет создать пространство, которое точно отражает характер и образ жизни своего владельца.'
    ],
    page_content: [
      { type: 'hero', image: 'images/maxima/maxima_1.webp', alt: 'Кухня Maxima 2.2 — архитектурная система Cesar' },
      { type: 'rich_block', image: 'images/maxima/maxima_2.webp', alt: 'Maxima 2.2 — детали фасадов и материалов', text: 'Жизнь — это перемены. Каждый день я сталкиваюсь с выборами и событиями, которые помогают понять, кто я есть. Развиваясь, я остаюсь верна своему представлению о себе — мечте, в которой я была счастлива, умела ценить красоту во всех её проявлениях и прославлять её чистоту. Maxima 2.2 создана командой дизайнеров R&D Cesar — внутренним бюро фабрики, которое объединяет производственную точность и архитектурное мышление. Пространство, материал и технология работают как единая система — строгая, но способная адаптироваться к любому интерьеру, сохраняя баланс между функцией и красотой.' },
      { type: 'text_image', title: 'Modularity', paragraphs: [
        'Maxima 2.2 строится как архитектурная система, в которой каждый элемент точен и осмыслен.',
        'Богатство материалов и чёткость форм сохраняются в любом масштабе — от компактной городской квартиры до просторного дома с открытой планировкой.'
      ], image: 'images/maxima/maxima_3.webp', alt: 'Maxima 2.2 — модульная компоновка кухни' }
    ],
    images: ['images/maxima/maxima_1.webp', 'images/maxima/maxima_2.webp', 'images/maxima/maxima_3.webp']
  },
  {
    slug: 'unit',
    name: 'Unit',
    designer: 'Design by Garcia Cumini',
    description: [
      'Unit — кухонный остров нового поколения, построенный на алюминиевой конструктивной раме. Приподнятая над полом структура создаёт ощущение лёгкости и визуально освобождает пространство, превращая кухню в архитектурный объект интерьера.',
      'Система Unit Pocket органично соединяет кухню с жилой зоной: раздвижные панели скрывают рабочую поверхность, позволяя пространству свободно перетекать из одной функции в другую. Регулируемые ножки с отделкой Champagne Brass подчёркивают благородство материалов.',
      'Широкий выбор отделок — от матового лака до натурального дерева и камня — позволяет адаптировать Unit под любой характер интерьера: от строгого минималистичного до тёплого и фактурного.'
    ],
    page_content: [
      { type: 'hero', image: 'images/unit/unit_1.webp', alt: 'Кухонный остров Unit — приподнятая конструкция на алюминиевой раме' },
      { type: 'rich_block', image: 'images/unit/unit_2.webp', alt: 'Unit — детали конструкции и материалов', text: 'Свобода — самое важное в жизни: свобода меняться, адаптироваться, открывать новые пути. Я учусь слышать себя — это даёт мне смелость идти вперёд, не оглядываясь. Каждое решение я принимаю осознанно, зная, что именно оно ведёт меня туда, где я должен быть. Unit создан дизайнерами Garcia Cumini — студией, в которой итальянская точность встречается со страстью к жизни во всей её полноте. Кухня здесь перестаёт быть только утилитарным объектом: она становится частью архитектуры, языком, на котором пространство разговаривает с человеком. Алюминиевая рама, парящий над полом корпус, материалы с характером — всё это не детали, а принципы, из которых складывается целое.' },
      { type: 'text_image', title: 'Home', paragraphs: [
        'В конце любого путешествия мы возвращаемся домой. Unit создаёт это ощущение через материал, свет и пропорции.',
        'Конструктивная логика острова и тщательно подобранные отделки превращают кухню в место, к которому хочется возвращаться снова и снова.'
      ], image: 'images/unit/unit_3.webp', alt: 'Unit — остров в интерьере открытой планировки' }
    ],
    images: ['images/unit/unit_1.webp', 'images/unit/unit_2.webp', 'images/unit/unit_3.webp']
  },
  {
    slug: 'n-elle',
    name: 'N_Elle',
    designer: 'Design by R&D Cesar',
    description: [
      'N_Elle — система с дверцами толщиной 2,2 см, скошенными под углом 45° по периметру. Этот приём визуально убирает толщину фасада, создавая ощущение невесомости и подчёркивая чистоту линий в любой компоновке.',
      'Система поддерживает различные способы открывания: push-to-open для полностью безручковых решений и системы Inside grip с интегрированным захватом. Оба варианта сохраняют гладкость поверхности и единство плоскости фасада.',
      'N_Elle органично сочетается с деревянными шпонами, мраморными столешницами и металлическими вставками — материалами, которые усиливают лаконичность формы, не нарушая её целостности.'
    ],
    page_content: [
      { type: 'hero', image: 'images/n-elle/n-elle_1.webp', alt: 'Кухня N_Elle — ультратонкие фасады со скошенным профилем' },
      { type: 'rich_block', image: 'images/n-elle/n-elle_2.webp', alt: 'N_Elle — детали фасадов и материалов', text: 'Я ищу главное во всём. Научившись быть избирательным, я нашёл новые пространства в своей жизни — свободные от лишнего, наполненные тем, что действительно важно. Это не аскетизм, а осознанность: понимание того, что красота рождается в точности, а не в избыточности. N_Elle создана командой R&D Cesar — внутренним бюро фабрики, которое работает на пересечении инженерной мысли и архитектурного видения. Скошенный профиль под 45° — это не просто деталь: это принципиальное решение, которое меняет восприятие фасада целиком. Пространство, где нет лишнего, становится больше — и как комната, и как возможность.' },
      { type: 'text_image', title: 'Essentials', paragraphs: [
        'Когда всё лишнее отброшено, форма говорит сама за себя. N_Elle строится именно на этом принципе.',
        'Ультратонкий фасад и безручковые решения — не компромисс, а намеренный выбор в пользу чистоты и долговременной выразительности.'
      ], image: 'images/n-elle/n-elle_3.webp', alt: 'N_Elle — безручковая кухня с минималистичным фасадом' }
    ],
    images: ['images/n-elle/n-elle_1.webp', 'images/n-elle/n-elle_2.webp', 'images/n-elle/n-elle_3.webp']
  },
  {
    slug: 'intarsio',
    name: 'Intarsio',
    designer: 'Design by Garcia Cumini',
    description: [
      'Intarsio — коллекция, вдохновлённая техникой инкрустации: деревянные дверцы с контрастными вставками создают ритмичный орнамент, который превращает фасад в самостоятельный художественный объект. Название отсылает к итальянской традиции intarsio — искусству вкладного декора из различных пород дерева.',
      'Сочетание текстур — тёплого дерева, матового лака и мрамора Verde Guatemala — выстраивает диалог между природным и рукотворным. Каждая комбинация материалов рождает уникальный образ, сохраняя при этом архитектурную строгость системы.',
      'Коллекция создана студией Garcia Cumini в русле философии Slow Design: вместо тенденций — вечные решения, вместо эффектных жестов — глубина и точность каждой детали.'
    ],
    page_content: [
      { type: 'hero', image: 'images/intarsio/intarsio_1.webp', alt: 'Кухня Intarsio — деревянные фасады с контрастными вставками' },
      { type: 'rich_block', image: 'images/intarsio/intarsio_2.webp', alt: 'Intarsio — детали инкрустации и материалов', text: 'Отступить от правил — значит произвести наибольшее впечатление. Я люблю симметрию, но не конвенцию. Я ценю порядок, но ищу в нём место для неожиданного. Именно в этом напряжении между структурой и свободой рождается то, что запоминается надолго. Intarsio создана дизайнерами Garcia Cumini — дуэтом, который соединяет испанскую экспрессию и итальянскую школу. Инкрустированный фасад здесь — это не орнамент ради орнамента, а осознанный архитектурный жест: каждый элемент занимает своё место, каждый материал несёт смысл. Кухня, которая не просто функционирует, но рассказывает историю.' },
      { type: 'text_image', title: 'Art & Order', paragraphs: [
        'Каждая эмоция, каждая мысль, каждый момент уникальны и требуют своего пространства. Intarsio организует это пространство с точностью и поэзией.',
        'Контраст фактур и ритм инкрустации создают интерьер, в котором красота и функция существуют как единое целое.'
      ], image: 'images/intarsio/intarsio_3.webp', alt: 'Intarsio — кухня с мраморной столешницей и деревянными фасадами' }
    ],
    images: ['images/intarsio/intarsio_1.webp', 'images/intarsio/intarsio_2.webp', 'images/intarsio/intarsio_3.webp']
  }
];

function seedDefaults() {
  const db = getDb();

  // Default admin user
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCount.count === 0) {
    const hash = bcrypt.hashSync('admin', 10);
    db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run('admin', hash);
  }

  // Seed / migrate collections
  const collectionCount = db.prepare('SELECT COUNT(*) as count FROM collections').get();
  if (collectionCount.count === 0) {
    // Fresh install
    const insertCollection = db.prepare(
      'INSERT INTO collections (slug, name, designer, description, page_content, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const insertImage = db.prepare(
      'INSERT INTO collection_images (collection_id, image_path, image_type, sort_order) VALUES (?, ?, ?, ?)'
    );

    db.transaction(() => {
      COLLECTION_SEED.forEach((sys, idx) => {
        const result = insertCollection.run(
          sys.slug, sys.name, sys.designer,
          JSON.stringify(sys.description),
          JSON.stringify(sys.page_content),
          idx
        );
        sys.images.forEach((img, imgIdx) => {
          insertImage.run(result.lastInsertRowid, img, 'card', imgIdx);
        });
      });
    })();
  } else {
    // Existing DB — seed page_content and update descriptions if they're old abbreviated versions
    COLLECTION_SEED.forEach(sys => {
      const col = db.prepare('SELECT id, page_content, description FROM collections WHERE slug = ?').get(sys.slug);
      if (!col) return;

      const updates = {};

      // Seed page_content if empty
      const pc = col.page_content || '[]';
      if (pc === '[]' || pc === 'null' || !pc) {
        updates.page_content = JSON.stringify(sys.page_content);
      }

      // Update description if it looks like the old abbreviated short version
      try {
        const existingDesc = JSON.parse(col.description || '[]');
        if (existingDesc.join('').length < 250) {
          updates.description = JSON.stringify(sys.description);
        }
      } catch (e) {
        updates.description = JSON.stringify(sys.description);
      }

      if (Object.keys(updates).length > 0) {
        const sets = Object.keys(updates).map(k => k + ' = ?').join(', ');
        db.prepare(`UPDATE collections SET ${sets} WHERE id = ?`).run(...Object.values(updates), col.id);
      }
    });
  }

  // Default settings
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
    db.transaction(() => defaults.forEach(s => insertSetting.run(s.key, s.value, s.label)))();
  }
}

module.exports = { getDb, initDb, seedDefaults };
