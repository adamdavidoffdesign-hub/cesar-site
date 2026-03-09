/* ===== Cesar Studio Admin Panel ===== */
(function () {
  'use strict';

  var state = {
    collections: [],
    settings: {},
    media: [],
    editingCollectionId: null,
    pageBlocks: [],
    mediaPickerCallback: null
  };

  // ===== API helpers =====
  function api(method, url, body) {
    var opts = {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin'
    };
    if (body) opts.body = JSON.stringify(body);
    return fetch(url, opts).then(function (res) {
      if (res.status === 401) { showLogin(); throw new Error('Unauthorized'); }
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
    }).then(function (res) { return res.json(); });
  }

  // ===== Toast =====
  function toast(message, type) {
    var container = document.getElementById('toast-container');
    var el = document.createElement('div');
    el.className = 'toast toast--' + (type || 'info');
    el.textContent = message;
    container.appendChild(el);
    setTimeout(function () { el.remove(); }, 3000);
  }

  // ===== Auth =====
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
    loadDashboard();
  }

  document.getElementById('login-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var username = document.getElementById('login-user').value;
    var password = document.getElementById('login-pass').value;
    var errorEl = document.getElementById('login-error');
    api('POST', '/api/auth/login', { username: username, password: password })
      .then(function (data) {
        if (data.ok) { errorEl.hidden = true; showAdmin(data.username); }
      })
      .catch(function () {
        errorEl.textContent = 'Неверный логин или пароль';
        errorEl.hidden = false;
      });
  });

  document.getElementById('logout-btn').addEventListener('click', function () {
    api('POST', '/api/auth/logout').then(function () { showLogin(); });
  });

  // ===== Navigation =====
  function showSection(name) {
    document.querySelectorAll('.admin-section').forEach(function (s) {
      s.classList.toggle('active', s.id === 'section-' + name);
    });
    document.querySelectorAll('.sidebar__link').forEach(function (l) {
      l.classList.toggle('active', l.getAttribute('data-section') === name);
    });
    if (name === 'dashboard') loadDashboard();
    if (name === 'collections') loadCollections();
    if (name === 'settings') loadSettings();
    if (name === 'media') loadMedia();
  }

  document.querySelectorAll('.sidebar__link').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      showSection(link.getAttribute('data-section'));
    });
  });

  // ===== Dashboard =====
  function loadDashboard() {
    api('GET', '/api/collections').then(function (data) {
      document.getElementById('dash-collections').textContent = data.length;
    }).catch(function () {});
    api('GET', '/api/media').then(function (data) {
      document.getElementById('dash-media').textContent = data.length;
    }).catch(function () {});
  }

  // ===== Collections =====
  function loadCollections() {
    api('GET', '/api/collections').then(function (data) {
      state.collections = data;
      renderCollections();
    });
  }

  function renderCollections() {
    var list = document.getElementById('collections-list');
    if (!state.collections.length) {
      list.innerHTML = '<p style="color:var(--c-gray)">Нет коллекций</p>';
      return;
    }
    list.innerHTML = state.collections.map(function (c) {
      var thumb = c.images && c.images[0] ? '/' + c.images[0] : '';
      var badge = c.is_published
        ? '<span class="badge badge--published">Опубликовано</span>'
        : '<span class="badge badge--draft">Черновик</span>';
      return '<div class="collection-card" data-id="' + c.id + '">' +
        (thumb
          ? '<img class="collection-card__thumb" src="' + thumb + '" alt="' + esc(c.name) + '">'
          : '<div class="collection-card__thumb"></div>') +
        '<div class="collection-card__info">' +
          '<h3>' + esc(c.name) + '</h3>' +
          '<p>' + esc(c.designer || '') + '</p>' +
          badge +
        '</div>' +
        '<div class="collection-card__actions">' +
          '<button class="btn btn--small" onclick="app.editCollection(' + c.id + ')">Изменить</button>' +
          '<button class="btn btn--small btn--danger" onclick="app.deleteCollection(' + c.id + ')">Удалить</button>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function editCollection(id) {
    var collection = state.collections.find(function (c) { return c.id === id; });
    if (!collection) return;

    state.editingCollectionId = id;
    document.getElementById('modal-title').textContent = 'Редактирование: ' + collection.name;
    document.getElementById('col-id').value = id;
    document.getElementById('col-name').value = collection.name;
    document.getElementById('col-slug').value = collection.slug;
    document.getElementById('col-designer').value = collection.designer || '';
    document.getElementById('col-desc').value = (collection.description || []).join('\n');
    document.getElementById('col-order').value = collection.sort_order || 0;
    document.getElementById('col-published').checked = !!collection.is_published;

    renderCollectionImages(collection.images || []);

    // Load page blocks
    state.pageBlocks = Array.isArray(collection.page_content) ? collection.page_content : [];
    renderBlockList();

    // Reset to first tab
    switchModalTab('basic');
    openModal();
  }

  function renderCollectionImages(images) {
    var container = document.getElementById('col-images');
    container.innerHTML = images.map(function (img, idx) {
      return '<div class="image-list__item">' +
        '<img src="/' + img + '" alt="Image ' + (idx + 1) + '">' +
        '<button class="remove-img" data-path="' + img + '" onclick="app.removeCollectionImage(this)">&times;</button>' +
      '</div>';
    }).join('');
  }

  function addNewCollection() {
    state.editingCollectionId = null;
    state.pageBlocks = [];
    document.getElementById('modal-title').textContent = 'Новая коллекция';
    document.getElementById('col-id').value = '';
    document.getElementById('col-name').value = '';
    document.getElementById('col-slug').value = '';
    document.getElementById('col-designer').value = '';
    document.getElementById('col-desc').value = '';
    document.getElementById('col-order').value = state.collections.length;
    document.getElementById('col-published').checked = true;
    document.getElementById('col-images').innerHTML = '';
    renderBlockList();
    switchModalTab('basic');
    openModal();
  }

  document.getElementById('btn-add-collection').addEventListener('click', addNewCollection);

  document.getElementById('collection-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var descText = document.getElementById('col-desc').value;
    var description = descText.split('\n').filter(function (line) { return line.trim(); });

    // Collect current block state from DOM before saving
    collectBlocksFromDom();

    var payload = {
      name: document.getElementById('col-name').value,
      slug: document.getElementById('col-slug').value,
      designer: document.getElementById('col-designer').value,
      description: description,
      page_content: state.pageBlocks,
      sort_order: parseInt(document.getElementById('col-order').value) || 0,
      is_published: document.getElementById('col-published').checked ? 1 : 0
    };

    var id = document.getElementById('col-id').value;
    var method = id ? 'PUT' : 'POST';
    var url = id ? '/api/collections/' + id : '/api/collections';

    api(method, url, payload).then(function (data) {
      if (data.ok) {
        toast('Коллекция сохранена', 'success');
        closeModal();
        loadCollections();
      } else {
        toast(data.error || 'Ошибка сохранения', 'error');
      }
    }).catch(function (err) {
      toast('Ошибка: ' + err.message, 'error');
    });
  });

  function deleteCollection(id) {
    var collection = state.collections.find(function (c) { return c.id === id; });
    if (!collection) return;
    if (!confirm('Удалить коллекцию "' + collection.name + '"?')) return;
    api('DELETE', '/api/collections/' + id).then(function () {
      toast('Коллекция удалена', 'success');
      loadCollections();
    });
  }

  function removeCollectionImage(btn) {
    btn.closest('.image-list__item').remove();
  }

  // Image upload for collection card
  document.getElementById('col-image-upload').addEventListener('change', function (e) {
    var files = Array.from(e.target.files);
    files.forEach(function (file) {
      uploadFile(file).then(function (result) {
        if (result.ok) {
          var id = document.getElementById('col-id').value;
          if (id) {
            api('POST', '/api/collections/' + id + '/images', {
              image_path: result.path,
              image_type: 'card'
            }).then(function () {
              var container = document.getElementById('col-images');
              container.innerHTML += '<div class="image-list__item">' +
                '<img src="' + result.url + '" alt="Uploaded">' +
                '<button class="remove-img" data-path="' + result.path + '" onclick="app.removeCollectionImage(this)">&times;</button>' +
              '</div>';
              toast('Изображение загружено', 'success');
            });
          }
        }
      });
    });
    e.target.value = '';
  });

  // Drag & drop for card images
  var dropArea = document.getElementById('image-upload-area');
  if (dropArea) {
    ['dragenter', 'dragover'].forEach(function (evt) {
      dropArea.addEventListener(evt, function (e) { e.preventDefault(); dropArea.classList.add('drag-over'); });
    });
    ['dragleave', 'drop'].forEach(function (evt) {
      dropArea.addEventListener(evt, function (e) { e.preventDefault(); dropArea.classList.remove('drag-over'); });
    });
    dropArea.addEventListener('drop', function (e) {
      Array.from(e.dataTransfer.files).forEach(function (file) {
        if (!file.type.startsWith('image/')) return;
        uploadFile(file).then(function (result) {
          if (result.ok) {
            var id = document.getElementById('col-id').value;
            if (id) {
              api('POST', '/api/collections/' + id + '/images', {
                image_path: result.path, image_type: 'card'
              }).then(function () {
                var container = document.getElementById('col-images');
                container.innerHTML += '<div class="image-list__item">' +
                  '<img src="' + result.url + '" alt="Uploaded">' +
                  '<button class="remove-img" data-path="' + result.path + '" onclick="app.removeCollectionImage(this)">&times;</button>' +
                '</div>';
                toast('Изображение загружено', 'success');
              });
            }
          }
        });
      });
    });
  }

  // ===== Modal =====
  function openModal() {
    document.getElementById('collection-modal').hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    document.getElementById('collection-modal').hidden = true;
    document.body.style.overflow = '';
    closeMediaPicker();
  }

  document.querySelector('.modal__backdrop').addEventListener('click', closeModal);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (!document.getElementById('media-picker').hidden) closeMediaPicker();
      else closeModal();
    }
  });

  // ===== Modal Tabs =====
  function switchModalTab(tabName) {
    document.querySelectorAll('.modal-tab').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
    });
    document.querySelectorAll('.tab-panel').forEach(function (panel) {
      panel.classList.toggle('active', panel.id === 'tab-' + tabName);
    });
  }

  // ===== Block Editor =====

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

  function addBlock(type, layout) {
    // Sync current DOM state first
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

    // Scroll to newly added block
    var list = document.getElementById('block-list');
    if (list) list.lastElementChild && list.lastElementChild.scrollIntoView({ behavior: 'smooth' });
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
    var tmp = state.pageBlocks[idx];
    state.pageBlocks[idx] = state.pageBlocks[newIdx];
    state.pageBlocks[newIdx] = tmp;
    renderBlockList();
  }

  function renderBlockList() {
    var list = document.getElementById('block-list');
    if (!list) return;
    if (!state.pageBlocks.length) {
      list.innerHTML = '<p class="block-list-empty">Нет блоков. Добавьте блок с помощью кнопок выше.</p>';
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
      label += ' — ' + (GRID_LAYOUT_LABELS[block.layout] || block.layout);
    }

    var html = '<div class="block-editor" data-idx="' + idx + '" data-type="' + esc(block.type) + '">';
    html += '<div class="block-editor__header">';
    html += '<span class="block-editor__label">' + esc(label) + '</span>';
    html += '<div class="block-editor__controls">';
    if (!isFirst) html += '<button type="button" class="btn btn--icon" title="Вверх" onclick="app.moveBlock(' + idx + ', -1)">↑</button>';
    if (!isLast) html += '<button type="button" class="btn btn--icon" title="Вниз" onclick="app.moveBlock(' + idx + ', 1)">↓</button>';
    html += '<button type="button" class="btn btn--icon btn--danger" title="Удалить блок" onclick="app.deleteBlock(' + idx + ')">✕</button>';
    html += '</div></div>';
    html += '<div class="block-editor__fields">';

    if (block.type === 'hero') {
      html += renderImageField('image', block.image, 'Изображение', idx);
      html += renderTextField('alt', block.alt, 'Альтернативный текст (alt)', idx);
    }

    if (block.type === 'rich_block') {
      html += renderImageField('image', block.image, 'Фотография (слева)', idx);
      html += renderTextField('alt', block.alt, 'Альтернативный текст', idx);
      html += renderTextareaField('text', block.text, 'Текст', idx, 6);
    }

    if (block.type === 'text_image') {
      html += renderTextField('title', block.title, 'Заголовок', idx);
      html += renderTextareaField('paragraphs', (block.paragraphs || []).join('\n'), 'Абзацы (каждый с новой строки)', idx, 4);
      html += renderImageField('image', block.image, 'Фотография (справа)', idx);
      html += renderTextField('alt', block.alt, 'Альтернативный текст', idx);
    }

    if (block.type === 'img_grid') {
      html += '<div class="form-group">';
      html += '<label>Расположение</label>';
      html += '<select class="block-field-select" data-idx="' + idx + '" data-field="layout">';
      ['3-left', '3-right', '2-col'].forEach(function (layout) {
        html += '<option value="' + layout + '"' + (block.layout === layout ? ' selected' : '') + '>' +
          (GRID_LAYOUT_LABELS[layout] || layout) + '</option>';
      });
      html += '</select></div>';

      html += '<div class="img-grid-images" data-idx="' + idx + '">';
      (block.images || []).forEach(function (img, imgIdx) {
        html += renderGridImageItem(img, idx, imgIdx, (block.images || []).length);
      });
      html += '</div>';
      html += '<button type="button" class="btn btn--small" onclick="app.addGridImage(' + idx + ')">+ Добавить изображение</button>';
    }

    html += '</div></div>';
    return html;
  }

  function renderImageField(fieldName, value, label, blockIdx) {
    var hasImage = value && value.trim();
    return '<div class="form-group block-img-field">' +
      '<label>' + esc(label) + '</label>' +
      '<div class="block-img-row">' +
        (hasImage ? '<img class="block-img-thumb" src="/' + esc(value) + '" alt="">' : '') +
        '<div class="block-img-controls">' +
          '<input type="text" class="block-field-text block-img-path" data-idx="' + blockIdx + '" data-field="' + fieldName + '" value="' + esc(value || '') + '" placeholder="images/collection/file.jpg">' +
          '<button type="button" class="btn btn--small" onclick="app.openMediaPicker(' + blockIdx + ', \'' + fieldName + '\')">Медиатека</button>' +
          '<label class="btn btn--small btn--upload">Загрузить<input type="file" accept="image/*" hidden onchange="app.uploadBlockImage(this, ' + blockIdx + ', \'' + fieldName + '\')"></label>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function renderTextField(fieldName, value, label, blockIdx) {
    return '<div class="form-group">' +
      '<label>' + esc(label) + '</label>' +
      '<input type="text" class="block-field-text" data-idx="' + blockIdx + '" data-field="' + fieldName + '" value="' + esc(value || '') + '">' +
    '</div>';
  }

  function renderTextareaField(fieldName, value, label, blockIdx, rows) {
    return '<div class="form-group">' +
      '<label>' + esc(label) + '</label>' +
      '<textarea class="block-field-text" data-idx="' + blockIdx + '" data-field="' + fieldName + '" rows="' + (rows || 4) + '">' + esc(value || '') + '</textarea>' +
    '</div>';
  }

  function renderGridImageItem(img, blockIdx, imgIdx, total) {
    var isLast = imgIdx === total - 1;
    return '<div class="img-grid-item" data-img-idx="' + imgIdx + '">' +
      (img.src ? '<img class="block-img-thumb" src="/' + esc(img.src) + '" alt="">' : '') +
      '<div class="img-grid-item__fields">' +
        '<input type="text" class="block-grid-src" data-idx="' + blockIdx + '" data-img-idx="' + imgIdx + '" value="' + esc(img.src || '') + '" placeholder="images/...">' +
        '<input type="text" class="block-grid-alt" data-idx="' + blockIdx + '" data-img-idx="' + imgIdx + '" value="' + esc(img.alt || '') + '" placeholder="Alt текст">' +
      '</div>' +
      '<div class="img-grid-item__actions">' +
        '<button type="button" class="btn btn--small" onclick="app.openMediaPickerForGrid(' + blockIdx + ', ' + imgIdx + ')">Медиатека</button>' +
        '<label class="btn btn--small btn--upload">Загрузить<input type="file" accept="image/*" hidden onchange="app.uploadGridImage(this, ' + blockIdx + ', ' + imgIdx + ')"></label>' +
        '<button type="button" class="btn btn--icon btn--danger" onclick="app.removeGridImage(' + blockIdx + ', ' + imgIdx + ')">✕</button>' +
      '</div>' +
    '</div>';
  }

  // Collect current DOM state back into state.pageBlocks
  function collectBlocksFromDom() {
    // Text/textarea fields
    document.querySelectorAll('.block-field-text').forEach(function (el) {
      var idx = parseInt(el.getAttribute('data-idx'));
      var field = el.getAttribute('data-field');
      if (!state.pageBlocks[idx]) return;
      var val = el.value;
      if (field === 'paragraphs') {
        state.pageBlocks[idx].paragraphs = val.split('\n').filter(function (l) { return l.trim(); });
      } else {
        state.pageBlocks[idx][field] = val;
      }
    });

    // Select fields
    document.querySelectorAll('.block-field-select').forEach(function (el) {
      var idx = parseInt(el.getAttribute('data-idx'));
      var field = el.getAttribute('data-field');
      if (!state.pageBlocks[idx]) return;
      state.pageBlocks[idx][field] = el.value;
    });

    // Grid image src/alt fields
    document.querySelectorAll('.block-grid-src').forEach(function (el) {
      var blockIdx = parseInt(el.getAttribute('data-idx'));
      var imgIdx = parseInt(el.getAttribute('data-img-idx'));
      if (!state.pageBlocks[blockIdx] || !state.pageBlocks[blockIdx].images) return;
      if (!state.pageBlocks[blockIdx].images[imgIdx]) return;
      state.pageBlocks[blockIdx].images[imgIdx].src = el.value;
    });
    document.querySelectorAll('.block-grid-alt').forEach(function (el) {
      var blockIdx = parseInt(el.getAttribute('data-idx'));
      var imgIdx = parseInt(el.getAttribute('data-img-idx'));
      if (!state.pageBlocks[blockIdx] || !state.pageBlocks[blockIdx].images) return;
      if (!state.pageBlocks[blockIdx].images[imgIdx]) return;
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
    uploadFile(file).then(function (result) {
      if (result.ok) {
        collectBlocksFromDom();
        if (state.pageBlocks[blockIdx]) {
          state.pageBlocks[blockIdx][fieldName] = result.path;
        }
        renderBlockList();
        toast('Изображение загружено', 'success');
      }
    });
  }

  function uploadGridImage(input, blockIdx, imgIdx) {
    var file = input.files[0];
    if (!file) return;
    uploadFile(file).then(function (result) {
      if (result.ok) {
        collectBlocksFromDom();
        if (state.pageBlocks[blockIdx] && state.pageBlocks[blockIdx].images && state.pageBlocks[blockIdx].images[imgIdx]) {
          state.pageBlocks[blockIdx].images[imgIdx].src = result.path;
        }
        renderBlockList();
        toast('Изображение загружено', 'success');
      }
    });
  }

  // ===== Media Picker =====
  function openMediaPicker(blockIdx, fieldName) {
    state.mediaPickerCallback = function (path) {
      collectBlocksFromDom();
      if (state.pageBlocks[blockIdx]) {
        state.pageBlocks[blockIdx][fieldName] = path;
      }
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
        grid.innerHTML = '<p class="media-picker__empty">Нет загруженных изображений. Загрузите их в разделе Медиа.</p>';
      } else {
        grid.innerHTML = data.map(function (file) {
          return '<div class="media-picker__item" onclick="app.selectMedia(\'' + esc(file.path) + '\')">' +
            '<img src="' + esc(file.url) + '" alt="' + esc(file.original_name) + '">' +
            '<span>' + esc(file.original_name) + '</span>' +
          '</div>';
        }).join('');
      }
      document.getElementById('media-picker').hidden = false;
      document.body.style.overflow = 'hidden';
    });
  }

  function selectMedia(path) {
    if (state.mediaPickerCallback) {
      state.mediaPickerCallback(path);
      state.mediaPickerCallback = null;
    }
  }

  function closeMediaPicker() {
    document.getElementById('media-picker').hidden = true;
    state.mediaPickerCallback = null;
    if (!document.getElementById('collection-modal').hidden) {
      document.body.style.overflow = 'hidden'; // modal still open
    } else {
      document.body.style.overflow = '';
    }
  }

  // ===== Settings =====
  function loadSettings() {
    api('GET', '/api/settings').then(function (data) {
      state.settings = data;
      renderSettings();
    });
  }

  function renderSettings() {
    var container = document.getElementById('settings-fields');
    var keys = Object.keys(state.settings);
    container.innerHTML = keys.map(function (key) {
      var item = state.settings[key];
      return '<div class="form-group">' +
        '<label for="setting-' + key + '">' + esc(item.label || key) + '</label>' +
        '<input type="text" id="setting-' + key + '" name="' + key + '" value="' + esc(item.value) + '">' +
      '</div>';
    }).join('');
  }

  document.getElementById('settings-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var updates = {};
    Object.keys(state.settings).forEach(function (key) {
      var input = document.getElementById('setting-' + key);
      if (input) updates[key] = { value: input.value, label: state.settings[key].label };
    });
    api('PUT', '/api/settings', updates).then(function (data) {
      if (data.ok) toast('Настройки сохранены', 'success');
    }).catch(function (err) { toast('Ошибка: ' + err.message, 'error'); });
  });

  // ===== Media =====
  function loadMedia() {
    api('GET', '/api/media').then(function (data) {
      state.media = data;
      renderMedia();
    });
  }

  function renderMedia() {
    var grid = document.getElementById('media-grid');
    if (!state.media.length) {
      grid.innerHTML = '<p style="color:var(--c-gray)">Нет загруженных файлов</p>';
      return;
    }
    grid.innerHTML = state.media.map(function (file) {
      return '<div class="media-card" data-id="' + file.id + '">' +
        '<img class="media-card__img" src="' + file.url + '" alt="' + esc(file.original_name) + '">' +
        '<div class="media-card__info">' +
          '<div class="media-card__name">' + esc(file.original_name) + '</div>' +
          '<div class="media-card__path" title="Нажмите для копирования" onclick="app.copyPath(\'' + esc(file.path) + '\')">' + esc(file.path) + '</div>' +
        '</div>' +
        '<button class="media-card__delete" onclick="app.deleteMedia(' + file.id + ')">&times;</button>' +
      '</div>';
    }).join('');
  }

  document.getElementById('media-upload').addEventListener('change', function (e) {
    var files = Array.from(e.target.files);
    Promise.all(files.map(uploadFile)).then(function (results) {
      var ok = results.filter(function (r) { return r.ok; });
      if (ok.length) { toast(ok.length + ' файл(ов) загружено', 'success'); loadMedia(); }
    });
    e.target.value = '';
  });

  function deleteMedia(id) {
    if (!confirm('Удалить файл?')) return;
    api('DELETE', '/api/media/' + id).then(function () {
      toast('Файл удалён', 'success');
      loadMedia();
    });
  }

  function copyPath(path) {
    navigator.clipboard.writeText(path).then(function () { toast('Путь скопирован', 'info'); });
  }

  // ===== Utils =====
  function esc(str) {
    var div = document.createElement('div');
    div.textContent = String(str || '');
    return div.innerHTML;
  }

  // ===== Auto-slug =====
  var nameInput = document.getElementById('col-name');
  var slugInput = document.getElementById('col-slug');
  if (nameInput && slugInput) {
    nameInput.addEventListener('input', function () {
      if (!state.editingCollectionId) {
        slugInput.value = nameInput.value
          .toLowerCase()
          .replace(/[^a-z0-9а-яё\s-]/gi, '')
          .replace(/\s+/g, '-')
          .replace(/[а-яё]/g, function (c) {
            var map = { 'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo',
              'ж':'zh','з':'z','и':'i','й':'y','к':'k','л':'l','м':'m','н':'n',
              'о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'h',
              'ц':'ts','ч':'ch','ш':'sh','щ':'sch','ъ':'','ы':'y','ь':'','э':'e',
              'ю':'yu','я':'ya' };
            return map[c] || c;
          });
      }
    });
  }

  // ===== Public API (for onclick handlers) =====
  window.app = {
    showSection: showSection,
    editCollection: editCollection,
    deleteCollection: deleteCollection,
    removeCollectionImage: removeCollectionImage,
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

  // ===== Init =====
  checkAuth();
})();
