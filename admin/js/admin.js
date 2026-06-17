/* ===== Cesar Studio Admin Panel ===== */
(function () {
  'use strict';

  var state = {
    collections: [],
    settings: {},
    media: [],
    editingCollectionId: null,
    pageBlocks: [],
    mediaPickerCallback: null,
    currentSection: 'dashboard'
  };

  var PAGE_META = {
    dashboard: { title: 'Обзор' },
    collections: { title: 'Коллекции' },
    editor: { title: 'Редактирование коллекции' },
    settings: { title: 'Настройки' },
    media: { title: 'Медиафайлы' }
  };

  var BLOCK_LABELS = {
    hero: 'Герой (полная ширина)',
    rich_block: 'Текст + фото',
    text_image: 'Заголовок + фото',
    img_grid: 'Сетка изображений'
  };

  var GRID_LAYOUT_LABELS = {
    '3-left': 'Крупное слева (3 ячейки)',
    '3-right': 'Крупное справа (3 ячейки)',
    '2-col': 'Две колонки'
  };

  var SETTINGS_GROUPS = [
    {
      id: 'site',
      title: 'Контакты сайта',
      description: 'Телефон, email, адрес и часы работы, отображаемые на сайте.',
      match: function (key) { return key.indexOf('site_') === 0; }
    },
    {
      id: 'form',
      title: 'Параметры формы',
      description: 'Получатель и тема писем, отправляемых из формы сайта.',
      match: function (key) { return key.indexOf('form_') === 0; }
    },
    {
      id: 'other',
      title: 'Дополнительно',
      description: 'Прочие параметры, которые не попали в основные группы.',
      match: function () { return true; }
    }
  ];

  function api(method, url, body) {
    var opts = {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin'
    };
    if (body) opts.body = JSON.stringify(body);
    return fetch(url, opts).then(function (res) {
      if (res.status === 401) {
        showLogin();
        throw new Error('Unauthorized');
      }
      return res.json();
    });
  }

  function uploadFile(file) {
    var formData = new FormData();
    formData.append('file', file);
    return fetch('/api/media/upload', {
      method: 'POST',
      body: formData,
      credentials: 'same-origin'
    }).then(function (res) {
      if (res.status === 401) {
        toast('Сессия истекла. Войдите заново.', 'error');
        setTimeout(function () { showLogin(); }, 1500);
        return { ok: false };
      }
      return res.json().catch(function () {
        toast('Ошибка загрузки файла', 'error');
        return { ok: false };
      });
    }).catch(function () {
      toast('Ошибка сети при загрузке', 'error');
      return { ok: false };
    });
  }

  function toast(message, type) {
    var container = document.getElementById('toast-container');
    var el = document.createElement('div');
    el.className = 'toast toast--' + (type || 'info');
    el.textContent = message;
    container.appendChild(el);
    setTimeout(function () { el.remove(); }, 3000);
  }

  function checkAuth() {
    api('GET', '/api/auth/check').then(function (data) {
      if (data.ok) showAdmin(data.username);
      else showLogin();
    }).catch(function () { showLogin(); });
  }

  function showLogin() {
    document.getElementById('login-screen').hidden = false;
    document.getElementById('admin-panel').hidden = true;
  }

  function showAdmin(username) {
    document.getElementById('login-screen').hidden = true;
    document.getElementById('admin-panel').hidden = false;
    document.getElementById('admin-username').textContent = username;
    document.getElementById('topbar-username').textContent = username;
    showSection(state.currentSection || 'dashboard');
  }

  function updatePageMeta(section) {
    var meta = PAGE_META[section] || PAGE_META.dashboard;
    document.getElementById('page-title').textContent = meta.title;
  }

  function showSection(name) {
    state.currentSection = name;

    document.querySelectorAll('.admin-section').forEach(function (section) {
      section.classList.toggle('active', section.id === 'section-' + name);
    });

    // При редактировании подсвечиваем "Коллекции" в сайдбаре
    var sidebarTarget = name === 'editor' ? 'collections' : name;
    document.querySelectorAll('.sidebar__link').forEach(function (link) {
      link.classList.toggle('active', link.getAttribute('data-section') === sidebarTarget);
    });

    updatePageMeta(name);

    if (name === 'dashboard') loadDashboard();
    if (name === 'collections') loadCollections();
    if (name === 'settings') loadSettings();
    if (name === 'media') loadMedia();
  }

  function loadDashboard() {
    Promise.all([
      api('GET', '/api/collections'),
      api('GET', '/api/media')
    ]).then(function (result) {
      state.collections = result[0];
      state.media = result[1];
      renderDashboard();
    }).catch(function () {});
  }

  function renderDashboard() {
    var collections = state.collections || [];
    var media = state.media || [];
    var published = collections.filter(function (item) { return !!item.is_published; }).length;
    var drafts = collections.length - published;
    var totalBlocks = collections.reduce(function (sum, item) {
      return sum + ((item.page_content || []).length || 0);
    }, 0);

    document.getElementById('dashboard-last-sync').textContent = 'Обновлено ' + formatDateTime(new Date());

    document.getElementById('dashboard-metrics').innerHTML = [
      renderMetricCard('Коллекции', collections.length, published ? published + ' опубликовано' : 'Нет публикаций'),
      renderMetricCard('Черновики', drafts, drafts ? 'Требуют проверки' : 'Все коллекции опубликованы'),
      renderMetricCard('Блоки страниц', totalBlocks, collections.length ? roundNumber(totalBlocks / collections.length) + ' в среднем на коллекцию' : 'Нет данных'),
      renderMetricCard('Медиафайлы', media.length, media.length ? 'Доступны для переиспользования' : 'Библиотека пуста')
    ].join('');

    var statusList = document.getElementById('dashboard-status-list');
    if (!collections.length) {
      statusList.innerHTML = '<div class="empty-state">Коллекций пока нет. Создайте первую коллекцию в соответствующем разделе.</div>';
      return;
    }

    var ranked = collections.slice().sort(function (a, b) {
      if (!!a.is_published !== !!b.is_published) return a.is_published ? 1 : -1;
      return (b.updated_at || '').localeCompare(a.updated_at || '');
    }).slice(0, 6);

    statusList.innerHTML = ranked.map(function (item) {
      var blockCount = (item.page_content || []).length;
      var badgeClass = item.is_published ? 'status-row__badge status-row__badge--published' : 'status-row__badge status-row__badge--draft';
      return '' +
        '<div class="status-row">' +
          '<div>' +
            '<div class="status-row__title">' + esc(item.name) + '</div>' +
            '<div class="status-row__meta">' + esc(item.slug) + ' · ' + blockCount + ' блок(ов)</div>' +
          '</div>' +
          '<span class="' + badgeClass + '">' + (item.is_published ? 'Опубликовано' : 'Черновик') + '</span>' +
          '<button class="btn btn--small" onclick="app.showSection(\'collections\'); app.editCollection(' + item.id + ')">Открыть</button>' +
        '</div>';
    }).join('');
  }

  function renderMetricCard(label, value, meta) {
    return '' +
      '<article class="metric-card">' +
        '<span class="metric-card__label">' + esc(label) + '</span>' +
        '<div class="metric-card__value">' + esc(String(value)) + '</div>' +
        '<div class="metric-card__meta">' + esc(meta) + '</div>' +
      '</article>';
  }

  function loadCollections() {
    api('GET', '/api/collections').then(function (data) {
      state.collections = data;
      renderCollections();
    });
  }

  function getFilteredCollections() {
    var search = (document.getElementById('collections-search').value || '').trim().toLowerCase();
    var filter = document.getElementById('collections-filter').value;

    return state.collections.filter(function (item) {
      var matchesStatus = filter === 'all' ||
        (filter === 'published' && !!item.is_published) ||
        (filter === 'draft' && !item.is_published);

      if (!matchesStatus) return false;
      if (!search) return true;

      var haystack = [
        item.name,
        item.slug,
        item.designer
      ].join(' ').toLowerCase();

      return haystack.indexOf(search) !== -1;
    });
  }

  function renderCollections() {
    var list = document.getElementById('collections-list');
    var summary = document.getElementById('collections-summary');
    var filtered = getFilteredCollections();
    var published = state.collections.filter(function (item) { return !!item.is_published; }).length;
    var drafts = state.collections.length - published;

    summary.innerHTML = [
      renderInlineStat('Всего', state.collections.length),
      renderInlineStat('Опубликовано', published),
      renderInlineStat('Черновики', drafts),
      renderInlineStat('Показано', filtered.length)
    ].join('');

    if (!state.collections.length) {
      list.innerHTML = '<div class="empty-state">Нет коллекций. Нажмите "Добавить коллекцию", чтобы создать первую запись.</div>';
      return;
    }

    if (!filtered.length) {
      list.innerHTML = '<div class="empty-state">По текущим фильтрам коллекции не найдены.</div>';
      return;
    }

    list.innerHTML = filtered.map(function (item) {
      var thumb = item.images && item.images[0] ? '/' + item.images[0] : '';
      var badge = item.is_published
        ? '<span class="badge badge--published">Опубликовано</span>'
        : '<span class="badge badge--draft">Черновик</span>';
      var blocks = (item.page_content || []).length;
      return '' +
        '<article class="collection-card" data-id="' + item.id + '">' +
          (thumb
            ? '<img class="collection-card__thumb" src="' + attr('/' + item.images[0]) + '" alt="' + attr(item.name) + '">'
            : '<div class="collection-card__thumb"></div>') +
          '<div class="collection-card__info">' +
            '<h3>' + esc(item.name) + '</h3>' +
            '<div class="collection-card__slug">/' + esc(item.slug) + '</div>' +
            '<div class="collection-card__meta">' +
              '<span>' + esc(item.designer || 'Дизайнер не указан') + '</span>' +
              '<span>' + blocks + ' блок(ов)</span>' +
              '<span>Порядок: ' + esc(String(item.sort_order || 0)) + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="collection-card__status">' + badge + '</div>' +
          '<div class="collection-card__actions">' +
            '<button class="btn btn--small" onclick="app.editCollection(' + item.id + ')">Изменить</button>' +
            '<button class="btn btn--small btn--danger" onclick="app.deleteCollection(' + item.id + ')">Удалить</button>' +
          '</div>' +
        '</article>';
    }).join('');
  }

  function renderInlineStat(label, value) {
    return '<span class="inline-stat"><strong>' + esc(String(value)) + '</strong> ' + esc(label) + '</span>';
  }

  function editCollection(id) {
    var collection = state.collections.find(function (item) { return item.id === id; });
    if (!collection) return;

    state.editingCollectionId = id;
    document.getElementById('editor-title').textContent = collection.name;
    document.getElementById('col-id').value = id;
    document.getElementById('col-name').value = collection.name;
    document.getElementById('col-slug').value = collection.slug;
    document.getElementById('col-designer').value = collection.designer || '';
    document.getElementById('col-desc').value = (collection.description || []).join('\n');
    document.getElementById('col-order').value = collection.sort_order || 0;
    document.getElementById('col-published').checked = !!collection.is_published;

    // Slug скрываем при редактировании (клиенту не нужно менять URL)
    var slugGroup = document.getElementById('col-slug-group');
    if (slugGroup) slugGroup.style.display = 'none';

    // Ссылка "Посмотреть на сайте"
    var viewLink = document.getElementById('editor-view-link');
    if (viewLink) {
      viewLink.href = '/collections/' + collection.slug + '.html';
      viewLink.hidden = false;
    }

    renderCollectionImages(collection.cardImages || (collection.images || []).map(function (path) {
      return { path: path };
    }));

    state.pageBlocks = Array.isArray(collection.page_content) ? collection.page_content : [];
    renderBlockList();
    switchModalTab('basic');
    showSection('editor');
  }

  function renderCollectionImages(images) {
    var container = document.getElementById('col-images');
    if (!images.length) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = images.map(function (img, idx) {
      return '' +
        '<div class="image-list__item">' +
          '<img src="' + attr('/' + img.path) + '" alt="Image ' + (idx + 1) + '">' +
          '<button class="remove-img" data-path="' + attr(img.path) + '"' +
            (img.id ? ' data-id="' + img.id + '"' : '') +
            ' onclick="app.removeCollectionImage(this)">&times;</button>' +
        '</div>';
    }).join('');
  }

  function addNewCollection() {
    state.editingCollectionId = null;
    state.pageBlocks = [];
    document.getElementById('editor-title').textContent = 'Новая коллекция';
    document.getElementById('col-id').value = '';
    document.getElementById('col-name').value = '';
    document.getElementById('col-slug').value = '';
    document.getElementById('col-designer').value = '';
    document.getElementById('col-desc').value = '';
    document.getElementById('col-order').value = state.collections.length;
    document.getElementById('col-published').checked = true;
    document.getElementById('col-images').innerHTML = '';

    // Показываем slug при создании новой
    var slugGroup = document.getElementById('col-slug-group');
    if (slugGroup) slugGroup.style.display = '';

    // Скрываем ссылку "Посмотреть на сайте" для новой коллекции
    var viewLink = document.getElementById('editor-view-link');
    if (viewLink) viewLink.hidden = true;

    renderBlockList();
    switchModalTab('basic');
    showSection('editor');
  }

  function handleCollectionSubmit(e) {
    e.preventDefault();
    collectBlocksFromDom();

    var saveBtn = document.getElementById('editor-save-btn');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Сохраняем...'; }

    var description = (document.getElementById('col-desc').value || '')
      .split('\n')
      .filter(function (line) { return line.trim(); });

    var payload = {
      name: document.getElementById('col-name').value,
      slug: document.getElementById('col-slug').value,
      designer: document.getElementById('col-designer').value,
      description: description,
      page_content: state.pageBlocks,
      sort_order: parseInt(document.getElementById('col-order').value, 10) || 0,
      is_published: document.getElementById('col-published').checked ? 1 : 0
    };

    var id = document.getElementById('col-id').value;
    var method = id ? 'PUT' : 'POST';
    var url = id ? '/api/collections/' + id : '/api/collections';

    api(method, url, payload).then(function (data) {
      if (!data.ok) {
        toast(data.error || 'Ошибка сохранения', 'error');
        return;
      }
      toast('Коллекция сохранена', 'success');
      closeEditor();
    }).catch(function (err) {
      toast('Ошибка: ' + err.message, 'error');
    }).finally(function () {
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Сохранить изменения'; }
    });
  }

  function deleteCollection(id) {
    var collection = state.collections.find(function (item) { return item.id === id; });
    if (!collection) return;
    if (!confirm('Удалить коллекцию "' + collection.name + '"?')) return;

    api('DELETE', '/api/collections/' + id).then(function () {
      toast('Коллекция удалена', 'success');
      loadCollections();
      if (state.currentSection === 'dashboard') loadDashboard();
    });
  }

  function removeCollectionImage(btn) {
    var collectionId = document.getElementById('col-id').value;
    var imageId = btn.getAttribute('data-id');

    if (!imageId || !collectionId) {
      btn.closest('.image-list__item').remove();
      return;
    }

    api('DELETE', '/api/collections/' + collectionId + '/images/' + imageId).then(function () {
      btn.closest('.image-list__item').remove();
      toast('Изображение удалено', 'success');
      loadCollections();
    }).catch(function () {
      toast('Не удалось удалить изображение', 'error');
    });
  }

  function closeEditor() {
    showSection('collections');
    closeMediaPicker();
  }

  // Обратная совместимость (вызывается из некоторых мест)
  function openModal() { showSection('editor'); }
  function closeModal() { closeEditor(); }

  function switchModalTab(tabName) {
    document.querySelectorAll('.modal-tab').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
    });

    document.querySelectorAll('.tab-panel').forEach(function (panel) {
      panel.classList.toggle('active', panel.id === 'tab-' + tabName);
    });
  }

  function addBlock(type, layout) {
    collectBlocksFromDom();

    var block = { type: type };
    if (type === 'hero') {
      block.image = '';
      block.alt = '';
    } else if (type === 'rich_block') {
      block.image = '';
      block.alt = '';
      block.text = '';
    } else if (type === 'text_image') {
      block.title = '';
      block.paragraphs = [''];
      block.image = '';
      block.alt = '';
    } else if (type === 'img_grid') {
      block.layout = layout || '3-left';
      block.images = [{ src: '', alt: '' }];
    }

    state.pageBlocks.push(block);
    renderBlockList();

    var list = document.getElementById('block-list');
    if (list && list.lastElementChild) {
      list.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function deleteBlock(idx) {
    collectBlocksFromDom();
    state.pageBlocks.splice(idx, 1);
    renderBlockList();
  }

  function moveBlock(idx, dir) {
    collectBlocksFromDom();
    var newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= state.pageBlocks.length) return;

    var temp = state.pageBlocks[idx];
    state.pageBlocks[idx] = state.pageBlocks[newIdx];
    state.pageBlocks[newIdx] = temp;
    renderBlockList();
  }

  function renderBlockList() {
    var list = document.getElementById('block-list');
    if (!list) return;

    if (!state.pageBlocks.length) {
      list.innerHTML = '<p class="block-list-empty">Нет блоков. Добавьте первый блок, чтобы собрать страницу коллекции.</p>';
      return;
    }

    list.innerHTML = state.pageBlocks.map(function (block, idx) {
      return renderBlockEditor(block, idx);
    }).join('');
  }

  function renderBlockEditor(block, idx) {
    var isFirst = idx === 0;
    var isLast = idx === state.pageBlocks.length - 1;
    var label = BLOCK_LABELS[block.type] || block.type;
    if (block.type === 'img_grid' && block.layout) {
      label += ' - ' + (GRID_LAYOUT_LABELS[block.layout] || block.layout);
    }

    var html = '<div class="block-editor" data-idx="' + idx + '" data-type="' + attr(block.type) + '">';
    html += '<div class="block-editor__header">';
    html += '<span class="block-editor__label">' + esc(label) + '</span>';
    html += '<div class="block-editor__controls">';
    if (!isFirst) html += '<button type="button" class="btn btn--icon" title="Вверх" onclick="app.moveBlock(' + idx + ', -1)">↑</button>';
    if (!isLast) html += '<button type="button" class="btn btn--icon" title="Вниз" onclick="app.moveBlock(' + idx + ', 1)">↓</button>';
    html += '<button type="button" class="btn btn--icon btn--danger" title="Удалить блок" onclick="app.deleteBlock(' + idx + ')">×</button>';
    html += '</div></div>';
    html += '<div class="block-editor__fields">';

    if (block.type === 'hero') {
      html += renderImageField('image', block.image, 'Изображение', idx);
      html += renderTextField('alt', block.alt, 'Альтернативный текст', idx);
    }

    if (block.type === 'rich_block') {
      html += renderImageField('image', block.image, 'Фотография слева', idx);
      html += renderTextField('alt', block.alt, 'Альтернативный текст', idx);
      html += renderTextareaField('text', block.text, 'Текст', idx, 6);
    }

    if (block.type === 'text_image') {
      html += renderTextField('title', block.title, 'Заголовок', idx);
      html += renderTextareaField('paragraphs', (block.paragraphs || []).join('\n'), 'Абзацы (каждый с новой строки)', idx, 4);
      html += renderImageField('image', block.image, 'Фотография справа', idx);
      html += renderTextField('alt', block.alt, 'Альтернативный текст', idx);
    }

    if (block.type === 'img_grid') {
      html += '<div class="form-group">';
      html += '<label>Расположение</label>';
      html += '<select class="block-field-select" data-idx="' + idx + '" data-field="layout">';
      ['3-left', '3-right', '2-col'].forEach(function (layout) {
        html += '<option value="' + layout + '"' + (block.layout === layout ? ' selected' : '') + '>' +
          esc(GRID_LAYOUT_LABELS[layout] || layout) + '</option>';
      });
      html += '</select></div>';

      html += '<div class="img-grid-images" data-idx="' + idx + '">';
      (block.images || []).forEach(function (img, imgIdx) {
        html += renderGridImageItem(img, idx, imgIdx, (block.images || []).length);
      });
      html += '</div>';
      html += '<button type="button" class="btn btn--small" onclick="app.addGridImage(' + idx + ')">Добавить изображение</button>';
    }

    html += '</div></div>';
    return html;
  }

  function renderImageField(fieldName, value, label, blockIdx) {
    var hasImage = value && value.trim();
    return '' +
      '<div class="form-group block-img-field">' +
        '<label>' + esc(label) + '</label>' +
        '<div class="block-img-row">' +
          (hasImage ? '<img class="block-img-thumb" src="' + attr('/' + value) + '" alt="">' : '') +
          '<div class="block-img-controls">' +
            '<input type="text" class="block-field-text block-img-path" data-idx="' + blockIdx + '" data-field="' + fieldName + '" value="' + attr(value || '') + '" placeholder="images/collection/file.jpg">' +
            '<button type="button" class="btn btn--small" onclick="app.openMediaPicker(' + blockIdx + ', \'' + fieldName + '\')">Медиатека</button>' +
            '<label class="btn btn--small btn--upload">Загрузить<input type="file" accept="image/*" hidden onchange="app.uploadBlockImage(this, ' + blockIdx + ', \'' + fieldName + '\')"></label>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function renderTextField(fieldName, value, label, blockIdx) {
    return '' +
      '<div class="form-group">' +
        '<label>' + esc(label) + '</label>' +
        '<input type="text" class="block-field-text" data-idx="' + blockIdx + '" data-field="' + fieldName + '" value="' + attr(value || '') + '">' +
      '</div>';
  }

  function renderTextareaField(fieldName, value, label, blockIdx, rows) {
    return '' +
      '<div class="form-group">' +
        '<label>' + esc(label) + '</label>' +
        '<textarea class="block-field-text" data-idx="' + blockIdx + '" data-field="' + fieldName + '" rows="' + (rows || 4) + '">' + esc(value || '') + '</textarea>' +
      '</div>';
  }

  function renderGridImageItem(img, blockIdx, imgIdx) {
    return '' +
      '<div class="img-grid-item" data-img-idx="' + imgIdx + '">' +
        (img.src ? '<img class="block-img-thumb" src="' + attr('/' + img.src) + '" alt="">' : '') +
        '<div class="img-grid-item__fields">' +
          '<input type="text" class="block-grid-src" data-idx="' + blockIdx + '" data-img-idx="' + imgIdx + '" value="' + attr(img.src || '') + '" placeholder="images/...">' +
          '<input type="text" class="block-grid-alt" data-idx="' + blockIdx + '" data-img-idx="' + imgIdx + '" value="' + attr(img.alt || '') + '" placeholder="Alt текст">' +
        '</div>' +
        '<div class="img-grid-item__actions">' +
          '<button type="button" class="btn btn--small" onclick="app.openMediaPickerForGrid(' + blockIdx + ', ' + imgIdx + ')">Медиатека</button>' +
          '<label class="btn btn--small btn--upload">Загрузить<input type="file" accept="image/*" hidden onchange="app.uploadGridImage(this, ' + blockIdx + ', ' + imgIdx + ')"></label>' +
          '<button type="button" class="btn btn--icon btn--danger" onclick="app.removeGridImage(' + blockIdx + ', ' + imgIdx + ')">×</button>' +
        '</div>' +
      '</div>';
  }

  function collectBlocksFromDom() {
    document.querySelectorAll('.block-field-text').forEach(function (el) {
      var idx = parseInt(el.getAttribute('data-idx'), 10);
      var field = el.getAttribute('data-field');
      if (!state.pageBlocks[idx]) return;
      var value = el.value;
      if (field === 'paragraphs') {
        state.pageBlocks[idx].paragraphs = value.split('\n').filter(function (line) { return line.trim(); });
      } else {
        state.pageBlocks[idx][field] = value;
      }
    });

    document.querySelectorAll('.block-field-select').forEach(function (el) {
      var idx = parseInt(el.getAttribute('data-idx'), 10);
      var field = el.getAttribute('data-field');
      if (!state.pageBlocks[idx]) return;
      state.pageBlocks[idx][field] = el.value;
    });

    document.querySelectorAll('.block-grid-src').forEach(function (el) {
      var blockIdx = parseInt(el.getAttribute('data-idx'), 10);
      var imgIdx = parseInt(el.getAttribute('data-img-idx'), 10);
      if (!state.pageBlocks[blockIdx] || !state.pageBlocks[blockIdx].images || !state.pageBlocks[blockIdx].images[imgIdx]) return;
      state.pageBlocks[blockIdx].images[imgIdx].src = el.value;
    });

    document.querySelectorAll('.block-grid-alt').forEach(function (el) {
      var blockIdx = parseInt(el.getAttribute('data-idx'), 10);
      var imgIdx = parseInt(el.getAttribute('data-img-idx'), 10);
      if (!state.pageBlocks[blockIdx] || !state.pageBlocks[blockIdx].images || !state.pageBlocks[blockIdx].images[imgIdx]) return;
      state.pageBlocks[blockIdx].images[imgIdx].alt = el.value;
    });
  }

  function addGridImage(blockIdx) {
    collectBlocksFromDom();
    if (!state.pageBlocks[blockIdx]) return;
    if (!state.pageBlocks[blockIdx].images) state.pageBlocks[blockIdx].images = [];
    state.pageBlocks[blockIdx].images.push({ src: '', alt: '' });
    renderBlockList();
  }

  function removeGridImage(blockIdx, imgIdx) {
    collectBlocksFromDom();
    if (!state.pageBlocks[blockIdx] || !state.pageBlocks[blockIdx].images) return;
    state.pageBlocks[blockIdx].images.splice(imgIdx, 1);
    renderBlockList();
  }

  function uploadBlockImage(input, blockIdx, fieldName) {
    var file = input.files[0];
    if (!file) return;
    toast('Загружаем...', 'info');

    uploadFile(file).then(function (result) {
      if (!result.ok) { toast(result.error || 'Не удалось загрузить фото', 'error'); return; }
      collectBlocksFromDom();
      if (state.pageBlocks[blockIdx]) state.pageBlocks[blockIdx][fieldName] = result.path;
      renderBlockList();
      toast('Изображение загружено', 'success');
    });
  }

  function uploadGridImage(input, blockIdx, imgIdx) {
    var file = input.files[0];
    if (!file) return;
    toast('Загружаем...', 'info');

    uploadFile(file).then(function (result) {
      if (!result.ok) { toast(result.error || 'Не удалось загрузить фото', 'error'); return; }
      collectBlocksFromDom();
      if (state.pageBlocks[blockIdx] && state.pageBlocks[blockIdx].images && state.pageBlocks[blockIdx].images[imgIdx]) {
        state.pageBlocks[blockIdx].images[imgIdx].src = result.path;
      }
      renderBlockList();
      toast('Изображение загружено', 'success');
    });
  }

  function openMediaPicker(blockIdx, fieldName) {
    state.mediaPickerCallback = function (path) {
      collectBlocksFromDom();
      if (state.pageBlocks[blockIdx]) state.pageBlocks[blockIdx][fieldName] = path;
      closeMediaPicker();
      renderBlockList();
    };
    loadMediaPicker();
  }

  function openMediaPickerForGrid(blockIdx, imgIdx) {
    state.mediaPickerCallback = function (path) {
      collectBlocksFromDom();
      if (state.pageBlocks[blockIdx] && state.pageBlocks[blockIdx].images && state.pageBlocks[blockIdx].images[imgIdx]) {
        state.pageBlocks[blockIdx].images[imgIdx].src = path;
      }
      closeMediaPicker();
      renderBlockList();
    };
    loadMediaPicker();
  }

  function loadMediaPicker() {
    api('GET', '/api/media').then(function (data) {
      var grid = document.getElementById('media-picker-grid');
      if (!data.length) {
        grid.innerHTML = '<p class="media-picker__empty">Нет загруженных изображений. Сначала добавьте файлы в раздел Медиа.</p>';
      } else {
        grid.innerHTML = data.map(function (file) {
          return '' +
            '<div class="media-picker__item" onclick="app.selectMedia(' + js(file.path) + ')">' +
              '<img src="' + attr(file.url) + '" alt="' + attr(file.original_name) + '">' +
              '<span>' + esc(file.original_name) + '</span>' +
            '</div>';
        }).join('');
      }
      document.getElementById('media-picker').hidden = false;
      document.body.style.overflow = 'hidden';
    });
  }

  function selectMedia(path) {
    if (!state.mediaPickerCallback) return;
    state.mediaPickerCallback(path);
    state.mediaPickerCallback = null;
  }

  function closeMediaPicker() {
    document.getElementById('media-picker').hidden = true;
    state.mediaPickerCallback = null;
    if (!document.getElementById('collection-modal').hidden) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  function loadSettings() {
    api('GET', '/api/settings').then(function (data) {
      state.settings = data;
      renderSettings();
    });
  }

  function renderSettings() {
    var container = document.getElementById('settings-fields');
    var keys = Object.keys(state.settings);

    if (!keys.length) {
      container.innerHTML = '<div class="empty-state">Настройки пока отсутствуют.</div>';
      return;
    }

    var used = {};
    container.innerHTML = SETTINGS_GROUPS.map(function (group) {
      var groupKeys = keys.filter(function (key) {
        if (used[key]) return false;
        if (!group.match(key)) return false;
        used[key] = true;
        return true;
      });

      if (!groupKeys.length) return '';

      return '' +
        '<section class="settings-group">' +
          '<div class="settings-group__header">' +
            '<h3>' + esc(group.title) + '</h3>' +
            '<p>' + esc(group.description) + '</p>' +
          '</div>' +
          '<div class="settings-group__fields">' +
            groupKeys.map(function (key) {
              var item = state.settings[key];
              return '' +
                '<div class="form-group">' +
                  '<label for="setting-' + attr(key) + '">' + esc(item.label || key) + '</label>' +
                  '<input type="text" id="setting-' + attr(key) + '" name="' + attr(key) + '" value="' + attr(item.value || '') + '">' +
                '</div>';
            }).join('') +
          '</div>' +
        '</section>';
    }).join('');
  }

  function handleSettingsSubmit(e) {
    e.preventDefault();
    var updates = {};

    Object.keys(state.settings).forEach(function (key) {
      var input = document.getElementById('setting-' + key);
      if (!input) return;
      updates[key] = {
        value: input.value,
        label: state.settings[key].label
      };
    });

    api('PUT', '/api/settings', updates).then(function (data) {
      if (data.ok) toast('Настройки сохранены', 'success');
    }).catch(function (err) {
      toast('Ошибка: ' + err.message, 'error');
    });
  }

  function loadMedia() {
    api('GET', '/api/media').then(function (data) {
      state.media = data;
      renderMedia();
    });
  }

  function getFilteredMedia() {
    var search = (document.getElementById('media-search').value || '').trim().toLowerCase();
    if (!search) return state.media.slice();

    return state.media.filter(function (file) {
      return (file.original_name || '').toLowerCase().indexOf(search) !== -1 ||
        (file.path || '').toLowerCase().indexOf(search) !== -1;
    });
  }

  function renderMedia() {
    var grid = document.getElementById('media-grid');
    var summary = document.getElementById('media-summary');
    var filtered = getFilteredMedia();

    summary.innerHTML = [
      renderInlineStat('Всего файлов', state.media.length),
      renderInlineStat('Показано', filtered.length)
    ].join('');

    if (!state.media.length) {
      grid.innerHTML = '<div class="empty-state">Медиатека пуста. Загрузите изображения, чтобы использовать их в блоках.</div>';
      return;
    }

    if (!filtered.length) {
      grid.innerHTML = '<div class="empty-state">Поиск не дал результатов.</div>';
      return;
    }

    grid.innerHTML = filtered.map(function (file) {
      return '' +
        '<article class="media-card" data-id="' + file.id + '">' +
          '<img class="media-card__img" src="' + attr(file.url) + '" alt="' + attr(file.original_name) + '">' +
          '<div class="media-card__info">' +
            '<div class="media-card__name">' + esc(file.original_name) + '</div>' +
            '<div class="media-card__path" title="Нажмите для копирования" onclick="app.copyPath(' + js(file.path) + ')">' + esc(file.path) + '</div>' +
          '</div>' +
          '<button class="media-card__delete" onclick="app.deleteMedia(' + file.id + ')">&times;</button>' +
        '</article>';
    }).join('');
  }

  function deleteMedia(id) {
    if (!confirm('Удалить файл?')) return;
    api('DELETE', '/api/media/' + id).then(function () {
      toast('Файл удален', 'success');
      loadMedia();
    });
  }

  function copyPath(path) {
    navigator.clipboard.writeText(path).then(function () {
      toast('Путь скопирован', 'info');
    });
  }

  function formatDateTime(value) {
    var date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  function roundNumber(value) {
    return Math.round(value * 10) / 10;
  }

  function esc(str) {
    var div = document.createElement('div');
    div.textContent = String(str || '');
    return div.innerHTML;
  }

  function attr(str) {
    return esc(str).replace(/"/g, '&quot;');
  }

  function js(value) {
    return attr(JSON.stringify(value));
  }

  function initAutoSlug() {
    var nameInput = document.getElementById('col-name');
    var slugInput = document.getElementById('col-slug');
    if (!nameInput || !slugInput) return;

    nameInput.addEventListener('input', function () {
      if (state.editingCollectionId) return;

      slugInput.value = nameInput.value
        .toLowerCase()
        .replace(/[^a-z0-9а-яё\s-]/gi, '')
        .replace(/\s+/g, '-')
        .replace(/[а-яё]/g, function (char) {
          var map = {
            'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
            'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
            'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
            'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
            'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
          };
          return map[char] || char;
        });
    });
  }

  function initEvents() {
    document.getElementById('login-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var username = document.getElementById('login-user').value;
      var password = document.getElementById('login-pass').value;
      var errorEl = document.getElementById('login-error');

      api('POST', '/api/auth/login', { username: username, password: password })
        .then(function (data) {
          if (!data.ok) return;
          errorEl.hidden = true;
          showAdmin(data.username);
        })
        .catch(function () {
          errorEl.textContent = 'Неверный логин или пароль';
          errorEl.hidden = false;
        });
    });

    document.getElementById('logout-btn').addEventListener('click', function () {
      api('POST', '/api/auth/logout').then(function () {
        showLogin();
      });
    });

    document.querySelectorAll('.sidebar__link').forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        showSection(link.getAttribute('data-section'));
      });
    });

    document.getElementById('btn-add-collection').addEventListener('click', addNewCollection);
    document.getElementById('collection-form').addEventListener('submit', handleCollectionSubmit);
    document.getElementById('settings-form').addEventListener('submit', handleSettingsSubmit);
    document.querySelector('.modal__backdrop').addEventListener('click', closeModal);

    document.getElementById('collections-search').addEventListener('input', renderCollections);
    document.getElementById('collections-filter').addEventListener('change', renderCollections);
    document.getElementById('media-search').addEventListener('input', renderMedia);

    document.getElementById('media-upload').addEventListener('change', function (e) {
      var files = Array.from(e.target.files);
      Promise.all(files.map(uploadFile)).then(function (results) {
        var ok = results.filter(function (result) { return result.ok; });
        if (!ok.length) return;
        toast(ok.length + ' файл(ов) загружено', 'success');
        loadMedia();
      });
      e.target.value = '';
    });

    document.getElementById('col-image-upload').addEventListener('change', function (e) {
      var files = Array.from(e.target.files);
      var id = document.getElementById('col-id').value;

      if (!id && files.length) {
        toast('Сначала сохраните коллекцию, затем загрузите изображения карточки', 'info');
        e.target.value = '';
        return;
      }

      toast('Загружаем...', 'info');
      files.forEach(function (file) {
        uploadFile(file).then(function (result) {
          if (!result.ok) { toast(result.error || 'Не удалось загрузить фото', 'error'); return; }

          api('POST', '/api/collections/' + id + '/images', {
            image_path: result.path,
            image_type: 'card'
          }).then(function (response) {
            var container = document.getElementById('col-images');
            container.innerHTML += '' +
              '<div class="image-list__item">' +
                '<img src="' + attr(result.url) + '" alt="Uploaded">' +
                '<button class="remove-img" data-path="' + attr(result.path) + '" data-id="' + response.id + '" onclick="app.removeCollectionImage(this)">&times;</button>' +
              '</div>';
            toast('Изображение загружено', 'success');
            loadCollections();
          });
        });
      });
      e.target.value = '';
    });

    var dropArea = document.getElementById('image-upload-area');
    if (dropArea) {
      ['dragenter', 'dragover'].forEach(function (eventName) {
        dropArea.addEventListener(eventName, function (e) {
          e.preventDefault();
          dropArea.classList.add('drag-over');
        });
      });

      ['dragleave', 'drop'].forEach(function (eventName) {
        dropArea.addEventListener(eventName, function (e) {
          e.preventDefault();
          dropArea.classList.remove('drag-over');
        });
      });

      dropArea.addEventListener('drop', function (e) {
        var id = document.getElementById('col-id').value;
        if (!id && e.dataTransfer.files.length) {
          toast('Сначала сохраните коллекцию, затем добавляйте изображения карточки', 'info');
          return;
        }

        Array.from(e.dataTransfer.files).forEach(function (file) {
          if (!file.type.startsWith('image/')) return;

          uploadFile(file).then(function (result) {
            if (!result.ok) return;

            api('POST', '/api/collections/' + id + '/images', {
              image_path: result.path,
              image_type: 'card'
            }).then(function (response) {
              var container = document.getElementById('col-images');
              container.innerHTML += '' +
                '<div class="image-list__item">' +
                  '<img src="' + attr(result.url) + '" alt="Uploaded">' +
                  '<button class="remove-img" data-path="' + attr(result.path) + '" data-id="' + response.id + '" onclick="app.removeCollectionImage(this)">&times;</button>' +
                '</div>';
              toast('Изображение загружено', 'success');
              loadCollections();
            });
          });
        });
      });
    }

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (!document.getElementById('media-picker').hidden) closeMediaPicker();
    });
  }

  window.app = {
    showSection: showSection,
    editCollection: editCollection,
    deleteCollection: deleteCollection,
    removeCollectionImage: removeCollectionImage,
    closeEditor: closeEditor,
    closeModal: closeModal,
    switchModalTab: switchModalTab,
    addBlock: addBlock,
    deleteBlock: deleteBlock,
    moveBlock: moveBlock,
    addGridImage: addGridImage,
    removeGridImage: removeGridImage,
    uploadBlockImage: uploadBlockImage,
    uploadGridImage: uploadGridImage,
    openMediaPicker: openMediaPicker,
    openMediaPickerForGrid: openMediaPickerForGrid,
    closeMediaPicker: closeMediaPicker,
    selectMedia: selectMedia,
    deleteMedia: deleteMedia,
    copyPath: copyPath
  };

  initEvents();
  initAutoSlug();
  checkAuth();
})();
