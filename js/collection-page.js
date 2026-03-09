(function () {
  'use strict';

  // Detect slug from URL: /collections/tangram.html → 'tangram'
  const slug = location.pathname.split('/').pop().replace('.html', '');
  if (!slug) return;

  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Image paths in DB are root-relative (images/...), collection pages are in /collections/
  function imgSrc(path) {
    if (!path) return '';
    if (path.startsWith('http') || path.startsWith('/')) return path;
    return '../' + path;
  }

  function renderBlock(block, isFirst) {
    const loading = isFirst ? 'eager' : 'lazy';

    switch (block.type) {
      case 'hero':
        return `<figure class="collection-page__img-hero">
  <img src="${esc(imgSrc(block.image))}" alt="${esc(block.alt)}" loading="${loading}" decoding="async">
</figure>`;

      case 'rich_block':
        return `<div class="collection-page__rich-block">
  <figure class="collection-page__rich-img">
    <img src="${esc(imgSrc(block.image))}" alt="${esc(block.alt)}" loading="${loading}" decoding="async">
  </figure>
  <p class="collection-page__rich-text t-body">${esc(block.text)}</p>
</div>`;

      case 'img_grid': {
        const layout = block.layout || '3-left';
        const cells = (block.images || []).map(img =>
          `  <figure class="collection-page__img-cell">
    <img src="${esc(imgSrc(img.src))}" alt="${esc(img.alt)}" loading="${loading}" decoding="async">
  </figure>`
        ).join('\n');
        return `<div class="collection-page__img-grid collection-page__img-grid--${esc(layout)}">
${cells}
</div>`;
      }

      case 'text_image': {
        const paras = (block.paragraphs || []).map(p =>
          `  <p class="collection-page__text-cell-body t-body">${esc(p)}</p>`
        ).join('\n');
        return `<div class="collection-page__img-grid collection-page__img-grid--text-img">
  <div class="collection-page__text-cell">
    <h2 class="collection-page__text-cell-title t-title">${esc(block.title)}</h2>
${paras}
  </div>
  <figure class="collection-page__img-cell">
    <img src="${esc(imgSrc(block.image))}" alt="${esc(block.alt)}" loading="${loading}" decoding="async">
  </figure>
</div>`;
      }

      default:
        return '';
    }
  }

  function renderCollection(data) {
    // Update page title
    document.title = 'Cesar Studio — ' + data.name;

    // Update header text
    const titleEl = document.querySelector('.collection-page__header-title');
    if (titleEl) {
      titleEl.innerHTML = esc(data.name) + (data.designer ? '<br>' + esc(data.designer) : '');
    }

    // Update description paragraphs
    const textEl = document.querySelector('.collection-page__header-text');
    if (textEl) {
      const desc = Array.isArray(data.description) ? data.description : [];
      textEl.innerHTML = desc.map(p => `<p>${esc(p)}</p>`).join('');
    }

    // Render page_content blocks into gallery
    const gallery = document.querySelector('.collection-page__gallery');
    if (gallery) {
      const blocks = Array.isArray(data.page_content) ? data.page_content : [];
      gallery.innerHTML = blocks.map((b, i) => renderBlock(b, i === 0)).join('\n');
    }
  }

  // Fetch and render
  fetch('/api/collections/' + encodeURIComponent(slug))
    .then(function (r) {
      if (!r.ok) throw new Error('Not found');
      return r.json();
    })
    .then(renderCollection)
    .catch(function (err) {
      console.warn('[collection-page] Failed to load from API, keeping static content.', err);
    });
})();
