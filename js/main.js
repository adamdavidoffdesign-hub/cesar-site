// ===== данные систем (компоненты секции Systems) =====
var SYSTEMS_DATA = [
  {
    name: 'Tangram',
    designer: 'Design by Garcia Cumini',
    desc: [
      'Модульная система со свободной геометрией.',
      'Позволяет создавать острова и композиции сложной формы, подстраиваясь под архитектуру пространства.',
      'Акцент на пластичность и игру света.'
    ],
    images: ['images/tangram/tangram_1.png', 'images/tangram/tangram_2.png', 'images/tangram/tangram_3.png'],
    link: 'collections/tangram.html'
  },
  {
    name: 'Maxima 2.2',
    designer: 'Design by R&D Cesar',
    desc: [
      'Строгая и универсальная архитектурная система.',
      'Подходит для индивидуальных проектов и сложных планировок.',
      'Чёткая геометрия и контроль каждой детали.'
    ],
    images: ['images/maxima/maxima_1.png', 'images/maxima/maxima_2.png', 'images/maxima/maxima_3.png'],
    link: 'collections/maxima.html'
  },
  {
    name: 'Unit',
    designer: 'Design by Garcia Cumini',
    desc: [
      'Гибкая система для современного образа жизни.',
      'Кухня как центр дома, открытая к изменениям и новым сценариям.',
      'Функциональность, технологичность и свобода компоновки.'
    ],
    images: ['images/unit/unit_1.png', 'images/unit/unit_2.png', 'images/unit/unit_3.png'],
    link: 'collections/unit.html'
  },
  {
    name: 'N_Elle',
    designer: 'Design by R&D Cesar',
    desc: [
      'Кухня о тишине и балансе.',
      'Минималистичная система, где форма, материал и пространство работают вместе.',
      'Для сдержанных интерьеров и спокойного ритма жизни.'
    ],
    images: ['images/n-elle/n-elle_1.png', 'images/n-elle/n-elle_2.png', 'images/n-elle/n-elle_3.png'],
    link: 'collections/n-elle.html'
  },
  {
    name: 'Intarsio',
    designer: 'Design by Garcia Cumini',
    desc: [
      'Архитектурная система, основанная на работе с плоскостью и материалом. Игра пропорций и текстур формирует выразительный, но сдержанный образ. Для интерьеров, где кухня становится частью общей архитектуры.'
    ],
    images: ['images/intarsio/intarsio_1.png', 'images/intarsio/intarsio_2.png', 'images/intarsio/intarsio_3.png'],
    link: 'collections/intarsio.html'
  }
];

function createRafScheduler(callback) {
  var rafId = 0;

  return function schedule() {
    if (rafId) return;

    rafId = window.requestAnimationFrame(function () {
      rafId = 0;
      callback();
    });
  };
}

function initSystems() {
  var list = document.querySelector('.systems__list');
  var template = document.getElementById('system-card-template');
  if (!list || !template || !template.content || !SYSTEMS_DATA.length) return Promise.resolve();

  SYSTEMS_DATA.forEach(function (item) {
    var card = template.content.cloneNode(true);
    card.querySelector('.system__name').textContent = item.name;
    card.querySelector('.system__designer').textContent = item.designer;

    var descEl = card.querySelector('.system__desc');
    descEl.innerHTML = '';
    item.desc.forEach(function (p) {
      var para = document.createElement('p');
      para.textContent = p;
      descEl.appendChild(para);
    });

    var photosEl = card.querySelector('.system__photos');
    photosEl.innerHTML = '';
    item.images.forEach(function (src) {
      var div = document.createElement('div');
      div.className = 'system__photo';
      var img = document.createElement('img');
      img.src = src;
      img.alt = item.name;
      div.appendChild(img);
      photosEl.appendChild(div);
    });

    var link = card.querySelector('.system__link');
    link.href = item.link;

    list.appendChild(card);
  });

  return Promise.resolve();
}

function initSystemsBar() {
  var bar = document.querySelector('.systems__bar');
  if (!bar) return;

  function syncSystemsBarState() {
    if (window.innerWidth <= 768) {
      bar.classList.remove('is-condensed');
      return;
    }

    var rect = bar.getBoundingClientRect();
    var stickyTop = 100;
    bar.classList.toggle('is-condensed', rect.top <= stickyTop + 1);
  }

  var requestSyncSystemsBarState = createRafScheduler(syncSystemsBarState);

  window.addEventListener('scroll', requestSyncSystemsBarState, { passive: true });
  window.addEventListener('resize', requestSyncSystemsBarState);
  syncSystemsBarState();
}

// ===== загрузка partials (header, footer) =====

function initHeader() {
  var header = document.getElementById('header');
  if (!header) return;
  var heroSection = document.getElementById('hero');
  var mobileMenu = document.getElementById('mobile-menu');

  // ===== header state + hide on scroll down / show on scroll up =====
  var lastScrollY = window.scrollY;
  var scrollDelta = 10;
  var hideOffset = 140;

  function setHeaderTheme(theme) {
    header.classList.toggle('header--light', theme === 'light');
    header.classList.toggle('header--dark', theme === 'dark');
  }

  function syncHeaderTheme() {
    var currentScrollY = window.scrollY;
    var headerHeight = header.offsetHeight || 0;
    var isMobileMenuOpen = mobileMenu && mobileMenu.classList.contains('open');

    if (isMobileMenuOpen) {
      setHeaderTheme('light');
      return;
    }

    if (!heroSection) {
      setHeaderTheme('dark');
      return;
    }

    var heroBottom = heroSection.offsetTop + heroSection.offsetHeight;
    var headerBottom = currentScrollY + headerHeight;

    if (headerBottom < heroBottom) {
      setHeaderTheme('light');
    } else {
      setHeaderTheme('dark');
    }
  }

  function syncHeaderScrollState() {
    var currentScrollY = window.scrollY;
    var isMobileMenuOpen = mobileMenu && mobileMenu.classList.contains('open');
    syncHeaderTheme();

    if (isMobileMenuOpen || currentScrollY <= 20) {
      header.classList.remove('is-hidden');
      lastScrollY = currentScrollY;
      return;
    }

    if (Math.abs(currentScrollY - lastScrollY) < scrollDelta) {
      return;
    }

    if (currentScrollY > lastScrollY && currentScrollY > hideOffset) {
      header.classList.add('is-hidden');
    } else if (currentScrollY < lastScrollY) {
      header.classList.remove('is-hidden');
    }

    lastScrollY = currentScrollY;
  }

  var requestSyncHeaderScrollState = createRafScheduler(syncHeaderScrollState);

  window.addEventListener('scroll', requestSyncHeaderScrollState, { passive: true });
  window.addEventListener('resize', requestSyncHeaderScrollState);
  syncHeaderScrollState();

  // ===== бургер меню =====
  var burger = document.getElementById('burger');

  function setMobileMenuState(isOpen) {
    if (!burger || !mobileMenu) return;
    burger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    burger.setAttribute('aria-label', isOpen ? 'Закрыть меню' : 'Открыть меню');
    mobileMenu.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    header.classList.toggle('menu-open', isOpen);
    if (isOpen) {
      mobileMenu.classList.add('open');
      header.classList.remove('is-hidden');
      document.body.style.overflow = 'hidden';
    } else {
      mobileMenu.classList.remove('open');
      document.body.style.overflow = '';
    }

    syncHeaderTheme();
  }

  if (burger && mobileMenu) {
    // на всякий случай синхронизируем состояние при инициализации
    setMobileMenuState(mobileMenu.classList.contains('open'));

    burger.addEventListener('click', function () {
      var isOpen = mobileMenu.classList.contains('open');
      setMobileMenuState(!isOpen);
    });

    mobileMenu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        setMobileMenuState(false);
      });
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      setMobileMenuState(false);
    }
  });
}

function initAboutGallery() {
  var gallery = document.querySelector('.about__gallery');
  if (!gallery) return;

  var previewFrame = gallery.querySelector('.about__preview');
  var previewImage = gallery.querySelector('.about__preview img');
  var thumbs = gallery.querySelectorAll('.about__thumb');
  if (!previewFrame || !previewImage || !thumbs.length) return;

  previewFrame.classList.add('about__preview--enhanced');
  previewImage.classList.add('about__preview-image', 'about__preview-image--current', 'is-visible');

  var nextPreviewImage = previewImage.cloneNode(false);
  nextPreviewImage.className = 'about__preview-image about__preview-image--next';
  nextPreviewImage.alt = previewImage.alt || '';
  nextPreviewImage.setAttribute('aria-hidden', 'true');
  previewFrame.appendChild(nextPreviewImage);

  var activePreviewImage = previewImage;
  var inactivePreviewImage = nextPreviewImage;
  var previewResetTimer = null;
  var previewTransitionId = 0;

  function updatePreviewImage(nextSrc) {
    if (!nextSrc || activePreviewImage.getAttribute('src') === nextSrc) return;

    var transitionId = ++previewTransitionId;
    var preloader = new Image();

    if (previewResetTimer) {
      window.clearTimeout(previewResetTimer);
      previewResetTimer = null;
    }

    previewFrame.classList.add('is-updating');

    function commitPreviewTransition() {
      if (transitionId !== previewTransitionId) return;

      inactivePreviewImage.src = nextSrc;
      inactivePreviewImage.classList.add('is-visible');
      activePreviewImage.classList.remove('is-visible');

      previewResetTimer = window.setTimeout(function () {
        if (transitionId !== previewTransitionId) return;

        var previousActiveImage = activePreviewImage;
        activePreviewImage = inactivePreviewImage;
        inactivePreviewImage = previousActiveImage;
        inactivePreviewImage.classList.remove('is-visible');
        previewFrame.classList.remove('is-updating');
        previewResetTimer = null;
      }, 420);
    }

    preloader.addEventListener('load', commitPreviewTransition, { once: true });
    preloader.addEventListener('error', commitPreviewTransition, { once: true });
    preloader.src = nextSrc;
  }

  function setActiveThumb(activeThumb) {
    thumbs.forEach(function (thumb) {
      var isActive = thumb === activeThumb;
      thumb.classList.toggle('about__thumb--active', isActive);
      thumb.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    var largeImage = activeThumb.getAttribute('data-large');
    if (largeImage) {
      updatePreviewImage(largeImage);
    }
  }

  thumbs.forEach(function (thumb) {
    thumb.addEventListener('click', function () {
      setActiveThumb(thumb);
    });
  });
}

function initRevealAnimations() {
  var sections = [
    { selector: '.hero__content', className: 'reveal reveal--soft' },
    { selector: '.about__main', className: 'reveal reveal--soft' },
    { selector: '.about__gallery', className: 'reveal reveal--soft' },
    { selector: '.systems__inner', className: 'reveal reveal--soft' },
    { selector: '.service__inner', className: 'reveal reveal--soft' },
    { selector: '.contact-cta__inner', className: 'reveal reveal--soft' },
    { selector: '.footer__inner', className: 'reveal reveal--soft' }
  ];

  sections.forEach(function (item) {
    var element = document.querySelector(item.selector);
    if (element) {
      item.className.split(' ').forEach(function (className) {
        element.classList.add(className);
      });
    }
  });

  var staggerGroups = [
    { parent: '.header__nav, .menu-nav-bar__desktop', children: 'a', baseDelay: 0, step: 45, childClass: 'reveal reveal--none' }
  ];

  staggerGroups.forEach(function (group) {
    var parent = document.querySelector(group.parent);
    if (!parent) return;

    parent.querySelectorAll(group.children).forEach(function (child, index) {
      group.childClass.split(' ').forEach(function (className) {
        child.classList.add(className);
      });
      child.style.setProperty('--reveal-delay', group.baseDelay + index * group.step + 'ms');
    });
  });

  var revealItems = document.querySelectorAll('.reveal');
  if (!revealItems.length) return;

  if (!('IntersectionObserver' in window)) {
    revealItems.forEach(function (item) {
      item.classList.add('is-visible');
    });
    return;
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -8% 0px'
  });

  revealItems.forEach(function (item) {
    observer.observe(item);
  });
}

function loadPartials() {
  var headerEl = document.getElementById('header');
  var footerEl = document.getElementById('footer');

  function getPartialCandidates(filename) {
    var pathname = window.location.pathname || '/';
    var inCollections = pathname.indexOf('/collections/') !== -1;
    var candidates = [
      '/partials/' + filename,
      './partials/' + filename
    ];

    if (inCollections) {
      candidates.push('../partials/' + filename);
    }

    return candidates;
  }

  function fetchPartial(candidates, label) {
    var queue = candidates.slice();

    function tryNext() {
      var url = queue.shift();
      if (!url) {
        return Promise.reject(new Error(label + ' load failed'));
      }

      return fetch(url).then(function (response) {
        if (!response.ok) {
          throw new Error(label + ' load failed: ' + response.status);
        }

        return response.text();
      }).catch(function () {
        return tryNext();
      });
    }

    return tryNext();
  }

  var headerPromise = headerEl
    ? fetchPartial(getPartialCandidates('header.html?v=2'), 'Header')
        .then(function (html) {
          headerEl.innerHTML = html;
          initHeader();
        })
        .catch(function (error) {
          console.error(error);
        })
    : Promise.resolve();

  var footerPromise = footerEl
    ? fetchPartial(getPartialCandidates('footer.html?v=2'), 'Footer')
        .then(function (html) {
          footerEl.innerHTML = html;
        })
        .catch(function (error) {
          console.error(error);
        })
    : Promise.resolve();

  return Promise.all([headerPromise, footerPromise]);
}

// ===== hero title word reveal =====
function initHeroWordReveal() {
  var title = document.querySelector('.hero__title');
  if (!title) return;

  var nodes = Array.from(title.childNodes);
  title.innerHTML = '';
  var delay = 0;

  nodes.forEach(function (node) {
    if (node.nodeType === 1 && node.tagName === 'BR') {
      title.appendChild(document.createElement('br'));
      return;
    }
    if (node.nodeType !== 3) return;

    var words = node.textContent.trim().split(/\s+/);
    words.forEach(function (word, i) {
      if (i > 0) {
        title.appendChild(document.createTextNode('\u00A0'));
      }
      var wrap = document.createElement('span');
      wrap.className = 'word-wrap';
      var inner = document.createElement('span');
      inner.className = 'word';
      inner.style.setProperty('--word-delay', delay + 'ms');
      inner.textContent = word;
      wrap.appendChild(inner);
      title.appendChild(wrap);
      delay += 110;
    });
  });
}

initHeroWordReveal();
initAboutGallery();
initSystems(); /* карточки систем — сразу, не ждём загрузки header/footer */
initSystemsBar();
loadPartials().then(function () {
  initRevealAnimations();
});
