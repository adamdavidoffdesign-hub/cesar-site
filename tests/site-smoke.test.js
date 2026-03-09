const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const publicPages = [
  'index.html',
  'about.html',
  'contacts.html',
  'design-system.html',
  'collections/tangram.html',
  'collections/maxima.html',
  'collections/unit.html',
  'collections/n-elle.html',
  'collections/intarsio.html'
];

function readFile(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
}

function fileExistsFromRef(pagePath, ref) {
  const cleanRef = ref.split('?')[0].split('#')[0];

  if (!cleanRef || cleanRef === '#') return true;
  if (/^(https?:|mailto:|tel:|data:)/.test(cleanRef)) return true;

  const resolvedPath = cleanRef.startsWith('/')
    ? path.join(rootDir, cleanRef.slice(1))
    : path.resolve(path.dirname(path.join(rootDir, pagePath)), cleanRef);

  return fs.existsSync(resolvedPath);
}

function extractLocalRefs(html) {
  const refs = [];
  const attrPattern = /\b(?:src|href)=["']([^"']+)["']/g;
  let match;

  while ((match = attrPattern.exec(html))) {
    refs.push(match[1]);
  }

  return refs;
}

test('public pages include core structure and local assets resolve', () => {
  publicPages.forEach((pagePath) => {
    const html = readFile(pagePath);

    assert.match(html, /<title>[\s\S]*?<\/title>/, `${pagePath} should define a <title>`);
    assert.match(html, /<main\b/i, `${pagePath} should include <main>`);
    assert.match(html, /id="header"/, `${pagePath} should include the header mount point`);
    assert.match(html, /id="footer"/, `${pagePath} should include the footer mount point`);
    assert.match(html, /css\/animations\.css\?v=10/, `${pagePath} should include the current animations stylesheet`);
    assert.match(html, /js\/main\.js\?v=\d+/, `${pagePath} should include the current main bundle`);

    extractLocalRefs(html).forEach((ref) => {
      assert.equal(fileExistsFromRef(pagePath, ref), true, `${pagePath} references missing asset: ${ref}`);
    });
  });
});

test('partials resolve their internal local links', () => {
  ['partials/header.html', 'partials/footer.html'].forEach((partialPath) => {
    const html = readFile(partialPath);

    extractLocalRefs(html).forEach((ref) => {
      assert.equal(fileExistsFromRef(partialPath, ref), true, `${partialPath} references missing asset: ${ref}`);
    });
  });
});

test('systems data points to existing images and collection pages', () => {
  const script = readFile('js/main.js');
  const imageRefs = [...script.matchAll(/images\/[^'"\]]+\.(?:png|jpg|jpeg|webp|svg)/g)].map((match) => match[0]);
  const pageRefs = [...script.matchAll(/collections\/[^'"]+\.html/g)].map((match) => match[0]);

  assert.ok(imageRefs.length >= 15, 'Expected systems data to include the image set for all cards');
  assert.ok(pageRefs.length >= 5, 'Expected systems data to include collection page links');

  imageRefs.forEach((ref) => {
    assert.equal(fs.existsSync(path.join(rootDir, ref)), true, `Missing systems image: ${ref}`);
  });

  pageRefs.forEach((ref) => {
    assert.equal(fs.existsSync(path.join(rootDir, ref)), true, `Missing systems page: ${ref}`);
  });
});

test('design tokens expose semantic typography and layout scale', () => {
  const tokens = readFile('css/tokens.css');

  [
    '--type-display-size',
    '--type-title-size',
    '--type-body-size',
    '--type-label-size',
    '--type-caption-size',
    '--container-gutter',
    '--container-gutter-mobile',
    '--section-space',
    '--section-space-mobile',
    '.t-display',
    '.t-title',
    '.t-body',
    '.t-label',
    '.t-caption'
  ].forEach((needle) => {
    assert.match(tokens, new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `Missing design-system token or utility: ${needle}`);
  });

  ['--ps-0', '--ps-4', '--ps-8', '--grid-max', '--c-menu-overlay'].forEach((deprecatedToken) => {
    assert.doesNotMatch(tokens, new RegExp(deprecatedToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `Deprecated token still present: ${deprecatedToken}`);
  });
});

test('core HTML blocks have matching component selectors', () => {
  const css = [
    readFile('css/base.css'),
    readFile('css/layout.css'),
    readFile('css/components.css'),
    readFile('css/animations.css')
  ].join('\n');

  [
    '.page-home',
    '.page-template',
    '.header__logo',
    '.menu-nav-bar__logo',
    '.footer__logo',
    '.contact-cta__outer',
    '.contact-cta__col',
    '.about-hero',
    '.about-content',
    '.page-contacts',
    '.contacts-page',
    '.collection-hero',
    '.collection-content'
  ].forEach((selector) => {
    assert.match(css, new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `Missing component selector for ${selector}`);
  });
});
