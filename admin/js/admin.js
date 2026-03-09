/* ===== Cesar Studio Admin Panel ===== */
(function () {
  'use strict';

  var state = {
    collections: [],
    settings: {},
    media: [],
    editingCollectionId: null
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
      if (data.ok) {
        showAdmin(data.username);
      } else {
        showLogin();
      }
    }).catch(function () {
      showLogin();
    });
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
        if (data.ok) {
          errorEl.hidden = true;
          showAdmin(data.username);
        }
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
          ? '<img class="collection-card__thumb" src="' + thumb + '" alt="' + c.name + '">'
          : '<div class="collection-card__thumb"></div>') +
        '<div class="collection-card__info">' +
          '<h3>' + escapeHtml(c.name) + '</h3>' +
          '<p>' + escapeHtml(c.designer || '') + '</p>' +
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
    document.getElementById('modal-title').textContent = 'Новая коллекция';
    document.getElementById('col-id').value = '';
    document.getElementById('col-name').value = '';
    document.getElementById('col-slug').value = '';
    document.getElementById('col-designer').value = '';
    document.getElementById('col-desc').value = '';
    document.getElementById('col-order').value = state.collections.length;
    document.getElementById('col-published').checked = true;
    document.getElementById('col-images').innerHTML = '';
    openModal();
  }

  document.getElementById('btn-add-collection').addEventListener('click', addNewCollection);

  document.getElementById('collection-form').addEventListener('submit', function (e) {
    e.preventDefault();

    var descText = document.getElementById('col-desc').value;
    var description = descText.split('\n').filter(function (line) { return line.trim(); });

    var payload = {
      name: document.getElementById('col-name').value,
      slug: document.getElementById('col-slug').value,
      designer: document.getElementById('col-designer').value,
      description: description,
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
    var path = btn.getAttribute('data-path');
    btn.closest('.image-list__item').remove();
    // Note: actual deletion from DB happens on save
  }

  // Image upload for collections
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

  // Drag & drop
  var dropArea = document.getElementById('image-upload-area');
  if (dropArea) {
    ['dragenter', 'dragover'].forEach(function (evt) {
      dropArea.addEventListener(evt, function (e) {
        e.preventDefault();
        dropArea.classList.add('drag-over');
      });
    });
    ['dragleave', 'drop'].forEach(function (evt) {
      dropArea.addEventListener(evt, function (e) {
        e.preventDefault();
        dropArea.classList.remove('drag-over');
      });
    });
    dropArea.addEventListener('drop', function (e) {
      var files = Array.from(e.dataTransfer.files);
      files.forEach(function (file) {
        if (!file.type.startsWith('image/')) return;
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
    });
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
        '<label for="setting-' + key + '">' + escapeHtml(item.label || key) + '</label>' +
        '<input type="text" id="setting-' + key + '" name="' + key + '" value="' + escapeHtml(item.value) + '">' +
      '</div>';
    }).join('');
  }

  document.getElementById('settings-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var updates = {};
    Object.keys(state.settings).forEach(function (key) {
      var input = document.getElementById('setting-' + key);
      if (input) {
        updates[key] = { value: input.value, label: state.settings[key].label };
      }
    });

    api('PUT', '/api/settings', updates).then(function (data) {
      if (data.ok) {
        toast('Настройки сохранены', 'success');
      }
    }).catch(function (err) {
      toast('Ошибка: ' + err.message, 'error');
    });
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
        '<img class="media-card__img" src="' + file.url + '" alt="' + escapeHtml(file.original_name) + '">' +
        '<div class="media-card__info">' +
          '<div class="media-card__name">' + escapeHtml(file.original_name) + '</div>' +
          '<div class="media-card__path" title="Нажмите для копирования" onclick="app.copyPath(\'' + file.path + '\')">' + file.path + '</div>' +
        '</div>' +
        '<button class="media-card__delete" onclick="app.deleteMedia(' + file.id + ')">&times;</button>' +
      '</div>';
    }).join('');
  }

  document.getElementById('media-upload').addEventListener('change', function (e) {
    var files = Array.from(e.target.files);
    var promises = files.map(uploadFile);
    Promise.all(promises).then(function (results) {
      var ok = results.filter(function (r) { return r.ok; });
      if (ok.length) {
        toast(ok.length + ' файл(ов) загружено', 'success');
        loadMedia();
      }
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
    navigator.clipboard.writeText(path).then(function () {
      toast('Путь скопирован', 'info');
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
  }

  document.querySelector('.modal__backdrop').addEventListener('click', closeModal);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeModal();
  });

  // ===== Utils =====
  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str || '';
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
            var map = {
              'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo',
              'ж':'zh','з':'z','и':'i','й':'y','к':'k','л':'l','м':'m',
              'н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u',
              'ф':'f','х':'h','ц':'ts','ч':'ch','ш':'sh','щ':'sch',
              'ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya'
            };
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
    deleteMedia: deleteMedia,
    copyPath: copyPath
  };

  // ===== Init =====
  checkAuth();
})();
