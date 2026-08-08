(function () {
  'use strict';

  var PK = '__NETFLIX_STYLE_V1__';
  if (window[PK]) return;
  window[PK] = true;

  var KEYS = {
    STYLE_ID: 'netflix-style-inject',
    BODY_CLASS: 'nfx-ui',
    ENABLE_KEY: 'netflix_style_enabled',
    HERO_KEY: 'netflix_style_hero',
    CARD_SIZE_KEY: 'netflix_style_cardsize',
    RATING_KEY: 'netflix_style_rating',
    BADGE_KEY: 'netflix_style_badge',
    UI_LANG_KEY: 'netflix_style_uilang',
    CARD_SIZE_ATTR: 'data-nfx-card-size'
  };

  var IMG_BASE = 'https://image.tmdb.org/t/p/';

  var L10N = {
    ru: { badge_movie: 'ФИЛЬМ', badge_tv: 'СЕРИАЛ', watch: 'Смотреть', more: 'Подробнее', match: 'совпадений' },
    uk: { badge_movie: 'ФІЛЬМ', badge_tv: 'СЕРІАЛ', watch: 'Дивитись', more: 'Детальніше', match: 'збігів' },
    en: { badge_movie: 'MOVIE', badge_tv: 'SERIES', watch: 'Watch now', more: 'More info', match: 'match' }
  };

  function uiLang() {
    try {
      var s = Lampa.Storage.field(KEYS.UI_LANG_KEY) || Lampa.Storage.field('language') || 'en';
      if (L10N[s]) return s;
      if (s && s.indexOf('ru') === 0) return 'ru';
      if (s && (s.indexOf('uk') === 0 || s.indexOf('ua') === 0)) return 'uk';
      return 'en';
    } catch (e) { return 'en'; }
  }

  function t(key) {
    var lang = uiLang();
    return (L10N[lang] || L10N.en)[key] || L10N.en[key];
  }

  function getPref(name, dflt) {
    try {
      var v = Lampa.Storage.get(name, '');
      if (v === '' || v === null || v === undefined) return dflt;
      return v;
    } catch (e) { return dflt; }
  }

  function getBool(name, dflt) {
    var v = getPref(name, dflt ? '1' : '0');
    return v === '1' || v === 1 || v === true;
  }

  function matchesMedia(m) {
    try { return window.matchMedia && window.matchMedia(m).matches; } catch (e) { return false; }
  }

  /* ============================================================
     ДАНІ З КАРТКИ
     ============================================================ */
  function extractCardData(card) {
    try { if (card.card_data) return card.card_data; } catch (e) {}
    try {
      if (window.$) {
        var d = $(card).data('card') || $(card).data('json');
        if (d) return d;
      }
    } catch (e) {}
    return null;
  }

  function detectType(item) {
    if (!item) return 'movie';
    if (item.media_type) return item.media_type;
    if (item.type) return item.type;
    return item.title ? 'movie' : 'tv';
  }

  function imgUrl(item, size, wantBackdrop) {
    var p = wantBackdrop ? (item.backdrop_path || item.poster_path) : (item.poster_path || item.backdrop_path);
    if (!p && item._heroFallbackImg) return item._heroFallbackImg;
    if (!p) return '';
    return IMG_BASE + size + p;
  }

  function isTmd(s) { return !!s && s.indexOf('tmdb') !== -1; }

  function openItem(item) {
    try {
      if (!item || !window.Lampa || !Lampa.Activity) return;
      var type = detectType(item);
      var src = (Lampa.Storage && Lampa.Storage.field) ? Lampa.Storage.field('source') : 'tmdb';
      Lampa.Activity.push({ url: '', title: item.title || item.name || '', component: 'full', id: item.id, method: type, source: src, card: item });
    } catch (e) {}
  }

  /* ============================================================
     СТИЛІ
     ============================================================ */
  function injectStyle() {
    try {
      var existed = document.getElementById(KEYS.STYLE_ID);
      if (existed) existed.remove();

      var s = document.createElement('style');
      s.id = KEYS.STYLE_ID;
      var B = 'body.' + KEYS.BODY_CLASS;
      var r = [];

      /* --- Загальний фон --- */
      r.push(B + '{background:#141414 !important;color:#e5e5e5}');
      r.push(B + ' .fullstart{background:#141414!important}');
      r.push(B + ' .menu{background:rgba(10,10,10,.94)!important;border-right:1px solid rgba(255,255,255,.05)}');

      /* --- Шапка --- */
      r.push(B + ' .head{border-bottom:1px solid rgba(255,255,255,.06);background:rgba(16,16,16,.88)!important;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}');
      r.push(B + ' .head__logo svg *{fill:#e50914 !important;stroke:#e50914 !important}');
      r.push(B + ' .head__menu-icon, ' + B + ' .head .button--back, ' + B + ' .head__action{color:#fff}');

      /* --- Меню --- */
      r.push(B + ' .menu__item .menu__text{color:#e5e5e5;font-weight:500;transition:color .15s}');
      r.push(B + ' .menu__item.focus .menu__text, ' + B + ' .menu__item:hover .menu__text{color:#fff;font-weight:700}');
      r.push(B + ' .menu__item.focus:before, ' + B + ' .menu__item:hover:before{background:#e50914!important}');
      r.push(B + ' .menu__ico svg{fill:#e5e5e5}');
      r.push(B + ' .menu__item.focus .menu__ico svg, ' + B + ' .menu__item:hover .menu__ico svg{fill:#e50914}');

      /* --- Заголовки стрічок --- */
      r.push(B + ' .items-line__title{font-size:1.5em;font-weight:700;color:#fff;margin-bottom:.6em;padding:0 .1em;letter-spacing:-.01em}');
      r.push(B + ' .scroll__title{color:#fff!important;font-weight:700}');

      /* --- Картки --- */
      r.push(B + ' .card{border-radius:.4em;overflow:visible!important;transition:transform .22s ease,box-shadow .22s ease;transform-origin:center center}');
      r.push(B + ' .card .card__view{border-radius:.35em;overflow:hidden;transition:transform .22s ease,box-shadow .22s ease}');
      r.push(B + ' .card .card__img, ' + B + ' .card .card__poster{transition:transform .3s ease}');
      r.push(B + ' .card:hover,' + B + ' .card.focus{transform:scale(1.07)!important;z-index:12!important;position:relative!important;box-shadow:0 14px 34px rgba(0,0,0,.7)!important}');
      r.push(B + ' .card:hover .card__view,' + B + ' .card.focus .card__view{box-shadow:inset 0 0 0 1px rgba(255,255,255,.1)!important}');
      r.push(B + ' .card:hover .card__img,' + B + ' .card.focus .card__img{transform:scale(1.04)!important}');
      r.push(B + ' .card:hover .card__poster,' + B + ' .card.focus .card__poster{transform:scale(1.04)!important}');
      r.push(B + ' .card.focus ~ .card,' + B + ' .card:hover ~ .card{transform:translateX(2px)!important}');

      /* --- Бейдж NETFLIX --- */
      r.push(B + ' .nfx-badge{position:absolute;top:.55em;left:.55em;z-index:6;display:inline-flex;align-items:center;justify-content:center;padding:.22em .72em;border-radius:.55em;font-size:.7em;font-weight:800;letter-spacing:.14em;color:#fff;background:rgba(10,10,10,.65);border:1px solid rgba(255,255,255,.22);pointer-events:none;text-transform:uppercase}');
      r.push(B + ' .nfx-badge--tv{background:rgba(229,9,20,.92);border-color:transparent}');

      /* --- Рейтинг на картці --- */
      r.push(B + ' .nfx-rate{position:absolute;bottom:.5em;left:.55em;z-index:6;display:inline-flex;align-items:center;gap:.25em;font-size:.82em;font-weight:800;color:#46d369;text-shadow:0 1px 4px rgba(0,0,0,.9);pointer-events:none}');
      r.push(B + ' .nfx-rate svg{width:.85em;height:.85em;fill:#46d369}');

      /* --- Hero --- */
      r.push(B + ' .nfx-hero{position:relative;width:calc(100% - 1.4em);margin:0 .7em 1.6em;overflow:hidden;border-radius:.5em;background:#0b0b0b;cursor:pointer}');
      r.push(B + ' .nfx-hero__bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 25%;opacity:0;transition:opacity .4s ease,transform .4s ease}');
      r.push(B + ' .nfx-hero__bg--on{opacity:1}');
      r.push(B + ' .nfx-hero__track{position:absolute;inset:0;background:linear-gradient(90deg,rgba(10,10,10,.92) 4%,rgba(10,10,10,.62) 38%,rgba(10,10,10,.08) 72%),linear-gradient(0deg,rgba(10,10,10,.9) 0%,transparent 42%)}');
      r.push(B + ' .nfx-hero__body{position:relative;z-index:3;display:flex;flex-direction:column;align-items:flex-start;justify-content:flex-end;min-height:25em;padding:1.4em 1.8em 1.9em;max-width:60%;box-sizing:border-box}');
      r.push(B + ' .nfx-hero__title{font-size:2.7em;font-weight:900;line-height:1.05;color:#fff;letter-spacing:.01em;text-shadow:0 2px 18px rgba(0,0,0,.9);margin:0 0 .35em}');
      r.push(B + ' .nfx-hero__meta{display:flex;align-items:center;gap:.8em;flex-wrap:wrap;font-weight:600;color:#fff;text-shadow:0 1px 6px rgba(0,0,0,.85);font-size:.92em}');
      r.push(B + ' .nfx-hero__match{color:#46d369;font-weight:800}');
      r.push(B + ' .nfx-hero__year{opacity:.9}');
      r.push(B + ' .nfx-hero__desc{font-size:.98em;line-height:1.5;color:rgba(255,255,255,.9);margin:.6em 0 1em;text-shadow:0 1px 6px rgba(0,0,0,.9);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;max-width:56ch}');
      r.push(B + ' .nfx-hero__dots{position:absolute;z-index:3;display:flex;align-items:center;gap:.5em;right:1.6em;bottom:1.7em}');
      r.push(B + ' .nfx-hero__dot{width:.55em;height:.55em;border:0;padding:0;border-radius:50%;background:rgba(255,255,255,.35);cursor:pointer;transition:.18s}');
      r.push(B + ' .nfx-hero__dot--on{background:#e50914;transform:scale(1.4)}');
      r.push(B + ' .nfx-hero__actions{display:flex;align-items:center;gap:.8em;flex-wrap:wrap}');
      r.push(B + ' .nfx-hero__btn{display:inline-flex;align-items:center;gap:.55em;padding:.7em 1.55em;border-radius:999px;border:0;font-size:.98em;font-weight:700;cursor:pointer;transition:transform .12s ease,background .18s ease,opacity .18s;outline:0;white-space:nowrap}');
      r.push(B + ' .nfx-hero__btn svg{width:1.05em;height:1.05em;fill:currentColor}');
      r.push(B + ' .nfx-hero__btn--play{background:#fff;color:#000}');
      r.push(B + ' .nfx-hero__btn--play:hover,' + B + ' .nfx-hero__btn--play.focus{background:rgba(255,255,255,.82);transform:scale(1.05)}');
      r.push(B + ' .nfx-hero__btn--more{background:rgba(109,109,110,.6);color:#fff}');
      r.push(B + ' .nfx-hero__btn--more:hover,' + B + ' .nfx-hero__btn--more.focus{background:rgba(109,109,110,.78);transform:scale(1.05)}');

      /* --- Плеєр: червоний прогрес --- */
      r.push(B + ' .player .player-panel__position>div{background:#e50914!important}');
      r.push(B + ' .player .player-panel__position:after{background:#e50914!important}');
      r.push(B + ' .player .player-panel__box-buttons{background:rgba(255,255,255,.08)!important}');
      r.push(B + ' .player .player-panel__quality{background:rgba(229,9,20,.85)!important;color:#fff!important;border-radius:4px!important}');

      /* --- Скролбари --- */
      r.push(B + ' ::-webkit-scrollbar{width:10px;height:10px}');
      r.push(B + ' ::-webkit-scrollbar-track{background:#0d0d0d}');
      r.push(B + ' ::-webkit-scrollbar-thumb{background:#333;border-radius:5px}');
      r.push(B + ' ::-webkit-scrollbar-thumb:hover{background:#444}');

      /* --- Розміри карток --- */
      r.push(B + '[' + KEYS.CARD_SIZE_ATTR + '="xs"] .items-line .card{width:11em!important}');
      r.push(B + '[' + KEYS.CARD_SIZE_ATTR + '="sm"] .items-line .card{width:13em!important}');
      r.push(B + '[' + KEYS.CARD_SIZE_ATTR + '="md"] .items-line .card{width:16em!important}');
      r.push(B + '[' + KEYS.CARD_SIZE_ATTR + '="lg"] .items-line .card{width:19em!important}');

      /* --- Адаптив --- */
      if (matchesMedia('(max-width:767px)')) {
        r.push(B + ' .nfx-hero__body{min-height:15em;max-width:100%;padding:1em 1em 2em}');
        r.push(B + ' .nfx-hero__title{font-size:1.5em}');
        r.push(B + ' .nfx-hero__desc{display:none}');
        r.push(B + ' .nfx-hero__actions .nfx-hero__btn{padding:.55em 1em;font-size:.85em}');
      } else if (matchesMedia('(min-width:1920px)')) {
        r.push(B + ' .nfx-hero__body{min-height:34em}');
        r.push(B + ' .nfx-hero__title{font-size:3.4em}');
      }

      s.textContent = r.join('\n');
      (document.head || document.body || document.documentElement).appendChild(s);
    } catch (e) {}
  }

  /* ============================================================
     HERO
     ============================================================ */
  var heroTimer = null;
  var heroIndex = 0;
  var heroItems = [];

  function buildHero() {
    try {
      if (!getBool(KEYS.HERO_KEY, true)) return;
      if (document.querySelector('.nfx-hero')) return;
      if (document.querySelector('.full-start, .info-start, .player__maket, .torrent-view')) return;

      var scroll = document.querySelector('.activity--active .scroll__content') || document.querySelector('.scroll__content');
      if (!scroll) return;
      var lines = scroll.querySelectorAll('.items-line');
      if (lines.length < 2) return;
      var firstLine = lines[0];
      if (!firstLine) return;

      var cards = firstLine.querySelectorAll('.card');
      heroItems = [];
      for (var i = 0; i < cards.length && heroItems.length < 5; i++) {
        var d = extractCardData(cards[i]);
        if (!d || !d.id) continue;
        if (d.backdrop_path || d.poster_path) {
          heroItems.push(d);
        } else {
          var img = cards[i].querySelector('.card__img, .card__image');
          var src = (img && img.tagName === 'IMG' && (img.src || img.getAttribute('data-src') || '')) || '';
          if (isTmd(src)) { d._heroFallbackImg = src; heroItems.push(d); }
        }
      }
      if (!heroItems.length) return;

      var hero = document.createElement('div');
      hero.className = 'nfx-hero';

      var bg = document.createElement('img');
      bg.className = 'nfx-hero__bg';
      bg.alt = '';
      bg.addEventListener('error', function () { bg.classList.remove('nfx-hero__bg--on'); });

      var track = document.createElement('div');
      track.className = 'nfx-hero__track';

      var body = document.createElement('div');
      body.className = 'nfx-hero__body';

      var title = document.createElement('div');
      title.className = 'nfx-hero__title';

      var meta = document.createElement('div');
      meta.className = 'nfx-hero__meta';

      var matchEl = document.createElement('span');
      matchEl.className = 'nfx-hero__match';
      var yearEl = document.createElement('span');
      yearEl.className = 'nfx-hero__year';
      meta.appendChild(matchEl);
      meta.appendChild(yearEl);

      var desc = document.createElement('div');
      desc.className = 'nfx-hero__desc';

      var actions = document.createElement('div');
      actions.className = 'nfx-hero__actions';

      var playBtn = document.createElement('button');
      playBtn.className = 'nfx-hero__btn nfx-hero__btn--play selector';
      playBtn.setAttribute('tabindex', '0');
      playBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg><span></span>';

      var moreBtn = document.createElement('button');
      moreBtn.className = 'nfx-hero__btn nfx-hero__btn--more selector';
      moreBtn.setAttribute('tabindex', '0');
      moreBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.8"/><path d="M12 8h.01M12 11v5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg><span></span>';

      playBtn.querySelector('span').textContent = t('watch');
      moreBtn.querySelector('span').textContent = t('more');

      actions.appendChild(playBtn);
      actions.appendChild(moreBtn);

      body.appendChild(title);
      body.appendChild(meta);
      body.appendChild(desc);
      body.appendChild(actions);

      var dots = document.createElement('div');
      dots.className = 'nfx-hero__dots';

      hero.appendChild(bg);
      hero.appendChild(track);
      hero.appendChild(body);
      hero.appendChild(dots);

      try { firstLine.parentNode.insertBefore(hero, firstLine); }
      catch (e) { scroll.insertBefore(hero, scroll.firstChild); }

      function render(i) {
        heroIndex = i;
        var item = heroItems[i];
        if (!item) return;
        var src = imgUrl(item, 'w1280', true);
        if (src && bg.src !== src) { bg.src = src; bg.classList.add('nfx-hero__bg--on'); }
        title.textContent = item.title || item.name || '';
        var v = parseFloat(item.vote_average) || 0;
        matchEl.textContent = Math.round(v * 10) + '% ' + t('match');
        var y = item.release_date || item.first_air_date || item.air_date || '';
        yearEl.textContent = y ? String(y).slice(0, 4) : '';
        desc.textContent = item.overview || '';
        var di = dots.children;
        for (var k = 0; k < di.length; k++) di[k].classList.toggle('nfx-hero__dot--on', k === i);
      }

      for (var j = 0; j < heroItems.length; j++) {
        (function (idx) {
          var dot = document.createElement('button');
          dot.className = 'nfx-hero__dot' + (idx === 0 ? ' nfx-hero__dot--on' : '');
          dot.addEventListener('click', function (e) { e.stopPropagation(); resetTimer(); render(idx); });
          dots.appendChild(dot);
        })(j);
      }

      function stopTimer() { if (heroTimer) { clearInterval(heroTimer); heroTimer = null; } }
      function resetTimer() {
        stopTimer();
        heroTimer = setInterval(function () { render((heroIndex + 1) % heroItems.length); }, 8000);
      }
      function openCurrent() { openItem(heroItems[heroIndex]); }

      playBtn.addEventListener('click', function (e) { e.stopPropagation(); openCurrent(); });
      moreBtn.addEventListener('click', function (e) { e.stopPropagation(); openCurrent(); });
      bg.addEventListener('click', openCurrent);

      render(0);
      resetTimer();
    } catch (e) {}
  }

  /* ============================================================
     КАРТКИ: бейдж + рейтинг
     ============================================================ */
  function decorateAll(scope) {
    if (!scope || scope.nodeType !== 1) return;
    var q = scope.querySelectorAll ? scope.querySelectorAll('.card') : [];
    for (var i = 0; i < q.length; i++) decorateCard(q[i]);
  }

  function decorateCard(card) {
    try {
      if (card.__nfx) return;
      var d = extractCardData(card);
      if (!d || !d.id) return;
      var view = card.querySelector('.card__view, .card__poster, .full--poster');
      if (!view) return;
      card.__nfx = true;

      if (getBool(KEYS.BADGE_KEY, true)) {
        if (!view.querySelector('.nfx-badge')) {
          var b = document.createElement('span');
          b.className = 'nfx-badge' + (detectType(d) === 'tv' ? ' nfx-badge--tv' : '');
          b.textContent = detectType(d) === 'tv' ? t('badge_tv') : t('badge_movie');
          view.appendChild(b);
        }
      }

      if (getBool(KEYS.RATING_KEY, true) && d.vote_average) {
        if (!view.querySelector('.nfx-rate')) {
          var st = document.createElement('span');
          st.className = 'nfx-rate';
          st.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 2l2.9 6.3 6.9.8-5.1 4.8 1.4 6.8L12 17.6 5.9 20.7l1.4-6.8L2.2 9.1l6.9-.8z"/></svg>' + Math.round(parseFloat(d.vote_average) * 10) + '%';
          view.appendChild(st);
        }
      }
    } catch (e) {}
  }

  /* ============================================================
     СПОСТЕРІГАЧ DOM
     ============================================================ */
  var cardObserver = null;
  function watchDom() {
    try {
      if (cardObserver || !window.MutationObserver) return;
      cardObserver = new MutationObserver(function (muts) {
        try {
          for (var i = 0; i < muts.length; i++) {
            var nodes = muts[i].addedNodes;
            for (var j = 0; j < nodes.length; j++) {
              var n = nodes[j];
              if (!n || n.nodeType !== 1) continue;
              if (n.classList && n.classList.contains('card')) decorateCard(n);
              else if (n.querySelectorAll) {
                decorateAll(n);
                var sc = n.querySelector('.scroll__content, .activity');
                if (sc) decorateAll(sc);
              }
            }
          }
          if (!document.querySelector('.nfx-hero')) setTimeout(buildHero, 250);
        } catch (e) {}
      });
      cardObserver.observe(document.body, { childList: true, subtree: true });
    } catch (e) {}
  }

  /* ============================================================
     НАЛАШТУВАННЯ
     ============================================================ */
  var settingsRegistered = false;
  function registerSettings() {
    try {
      if (settingsRegistered || !window.Lampa || !Lampa.SettingsApi) return;
      settingsRegistered = true;

      Lampa.SettingsApi.addComponent({
        component: 'netflix_style',
        icon: '<svg width="34" height="28" viewBox="0 0 36 28"><text x="18" y="20" text-anchor="middle" font-size="13" font-weight="900" fill="#e50914" font-style="italic">N</text></svg>',
        name: 'Netflix'
      });

      Lampa.SettingsApi.addParam({
        component: 'netflix_style',
        param: { name: KEYS.ENABLE_KEY, type: 'select', default: true, values: [{ id: 1, name: 'Включено' }, { id: 0, name: 'Выключено' }] },
        field: { name: 'Тема Netflix' }
      });
      Lampa.SettingsApi.addParam({
        component: 'netflix_style',
        param: { name: KEYS.HERO_KEY, type: 'select', default: true, values: [{ id: 1, name: 'Да' }, { id: 0, name: 'Нет' }] },
        field: { name: 'Большой баннер' }
      });
      Lampa.SettingsApi.addParam({
        component: 'netflix_style',
        param: { name: KEYS.CARD_SIZE_KEY, type: 'select', default: 'md', values: [{ id: 'sm', name: 'Компактный' }, { id: 'md', name: 'Средний' }, { id: 'lg', name: 'Большой' }] },
        field: { name: 'Размер карточек' }
      });
      Lampa.SettingsApi.addParam({
        component: 'netflix_style',
        param: { name: KEYS.RATING_KEY, type: 'select', default: true, values: [{ id: 1, name: 'Да' }, { id: 0, name: 'Нет' }] },
        field: { name: 'Рейтинг на карточках' }
      });
      Lampa.SettingsApi.addParam({
        component: 'netflix_style',
        param: { name: KEYS.BADGE_KEY, type: 'select', default: true, values: [{ id: 1, name: 'Да' }, { id: 0, name: 'Нет' }] },
        field: { name: 'Метка ФИЛЬМ/СЕРИАЛ' }
      });
      Lampa.SettingsApi.addParam({
        component: 'netflix_style',
        param: { name: KEYS.UI_LANG_KEY, type: 'select', default: 'en', values: [{ id: 'ru', name: 'Русский' }, { id: 'uk', name: 'Українська' }, { id: 'en', name: 'English' }] },
        field: { name: 'Язык интерфейса' }
      });
    } catch (e) {}
  }

  /* ============================================================
     ЗАПУСК
     ============================================================ */
  function syncBodyAttrs() {
    try {
      document.body.classList.add(KEYS.BODY_CLASS);
      var size = getPref(KEYS.CARD_SIZE_KEY, 'md');
      if (size !== 'sm' && size !== 'md' && size !== 'lg') size = 'md';
      document.body.setAttribute(KEYS.CARD_SIZE_ATTR, size);
    } catch (e) {}
  }

  function boot() {
    try {
      if (!window.Lampa) return;
      registerSettings();
      if (!getBool(KEYS.ENABLE_KEY, true)) return;

      syncBodyAttrs();
      injectStyle();

      decorateAll(document.body);
      setTimeout(function () { decorateAll(document.body); }, 300);
      setTimeout(function () { decorateAll(document.body); }, 900);

      watchDom();
      buildHero();
      setTimeout(buildHero, 600);
      setTimeout(buildHero, 1500);

      var tries = 0;
      var poll = setInterval(function () {
        tries++;
        if (document.querySelector('.nfx-hero') || tries > 30) { clearInterval(poll); return; }
        buildHero();
      }, 1000);

      try {
        if (Lampa.Listener) {
          Lampa.Listener.follow('activity', function () {
            setTimeout(buildHero, 200);
            setTimeout(function () { decorateAll(document.body); }, 120);
          });
        }
        if (Lampa.Activity && Lampa.Activity.listener) {
          Lampa.Activity.listener.follow('activity', function () {
            setTimeout(buildHero, 200);
          });
        }
      } catch (e) {}
    } catch (e) {}
  }

  function init() {
    try {
      if (window.appready) { boot(); return; }
      if (window.Lampa && Lampa.Listener) {
        Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') boot(); });
        setTimeout(boot, 2500);
      } else {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(boot, 400); });
        else setTimeout(boot, 600);
      }
    } catch (e) { setTimeout(boot, 1000); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
