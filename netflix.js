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
    ru: { badge_movie: 'ФИЛЬМ', badge_tv: 'СЕРИАЛ', watch: 'Смотреть', more: 'Подробнее', match: 'совпадений', gf: 'вы подписаны' },
    uk: { badge_movie: 'ФІЛЬМ', badge_tv: 'СЕРІАЛ', watch: 'Дивитись', more: 'Детальніше', match: 'збігів', gf: 'ви підписані' },
    en: { badge_movie: 'MOVIE', badge_tv: 'SERIES', watch: 'Watch', more: 'More Info', match: 'Match', gf: 'you subscribed' }
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
    return (L10N[lang] || L10N.en)[key] !== undefined ? (L10N[lang] || L10N.en)[key] : L10N.en[key];
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

  function source() {
    try { return (Lampa.Storage && Lampa.Storage.field) ? Lampa.Storage.field('source') : 'tmdb'; } catch (e) { return 'tmdb'; }
  }

  /* Відкрити сторінку фільму (кнопка "Більше") */
  function openItem(item) {
    try {
      if (!item || !window.Lampa || !Lampa.Activity) return;
      var type = detectType(item);
      Lampa.Activity.push({ url: '', title: item.title || item.name || '', component: 'full', id: item.id, method: type, source: source(), card: item });
    } catch (e) {}
  }

  /* Відтворити (кнопка Play) — відкриває і тисне "Смотреть" */
  function openAndPlay(item) {
    try {
      if (!item || !window.Lampa || !Lampa.Activity) return;
      var type = detectType(item);
      var title = item.title || item.name || '';
      Lampa.Activity.push({ url: '', title: title, component: 'full', id: item.id, method: type, source: source(), card: item });

      var tries = 0;
      var timer = setInterval(function () {
        tries++;
        var btn = document.querySelector('.full-start .button--play, .full-start-new .button--play, .fullscreen-info .button--play, .full-start-new__button--play, .button--play');
        if (btn && !(btn.classList && btn.classList.contains('hide'))) {
          clearInterval(timer);
          try { if (window.$) { $(btn).trigger('hover:click'); return; } } catch (e2) {}
          try { if (typeof btn.click === 'function') btn.click(); } catch (e2) {}
        } else if (tries > 10) {
          clearInterval(timer);
        }
      }, 500);
    } catch (e) {}
  }

  /* ============================================================
     СТИЛІ
     ============================================================ */
  function injectStyle() {
    try {
      var old = document.getElementById(KEYS.STYLE_ID);
      if (old) old.remove();
      var s = document.createElement('style');
      s.id = KEYS.STYLE_ID;
      var B = 'body.' + KEYS.BODY_CLASS;
      var r = [];

      /* ---------- 1. Загальний фон Netflix ---------- */
      r.push(B + '{background:#141414!important;color:#fff}');
      r.push(B + ' .fullstart{background:#141414!important}');
      r.push(B + ' .scroll{background:#141414!important}');
      r.push(B + 'body, ' + B + ' .activity{background:#141414!important}');

      /* ---------- 2. Шапка: прозора з градієнтом ---------- */
      r.push(B + ' .head{background:linear-gradient(180deg,rgba(0,0,0,.92) 0%,rgba(0,0,0,.55) 70%,transparent 100%)!important;border-bottom:0!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}');
      r.push(B + ' .head__logo svg *{fill:#e50914!important;stroke:#e50914!important}');
      r.push(B + ' .head__menu-icon, ' + B + ' .head .button--back, ' + B + ' .head__action{color:#fff}');
      r.push(B + ' .head__action svg{fill:#fff}');

      /* ---------- 3. Меню (ліворуч, як Netflix) ---------- */
      r.push(B + ' .menu{background:rgba(0,0,0,.96)!important;border-right:1px solid rgba(255,255,255,.06)}');
      r.push(B + ' .menu__item{padding-left:1.4em}');
      r.push(B + ' .menu__item .menu__text{color:#b3b3b3;font-weight:500;font-size:.98em;transition:color .2s}');
      r.push(B + ' .menu__item.focus .menu__text,' + B + ' .menu__item:hover .menu__text{color:#fff;font-weight:600}');
      r.push(B + ' .menu__item.focus:before,' + B + ' .menu__item:hover:before{background:#e50914!important}');
      r.push(B + ' .menu__ico svg{fill:#b3b3b3}');
      r.push(B + ' .menu__item.focus .menu__ico svg,' + B + ' .menu__item:hover .menu__ico svg{fill:#e50914}');

      /* ---------- 4. Заголовки рядів ---------- */
      r.push(B + ' .items-line__title{font-size:1.55em;font-weight:700;color:#fff;margin-bottom:.65em;padding:0 .05em;letter-spacing:.02em;line-height:1.2}');
      r.push(B + ' .scroll__title{color:#fff!important;font-weight:700}');
      r.push(B + ' .scroll__body{padding-bottom:2.5em}');

      /* ---------- 5. Кліті ---------- */
      r.push(B + ' .card{border-radius:.2em!important;overflow:visible!important;box-shadow:none!important;transition:transform .28s ease,box-shadow .28s ease,z-index 0s linear!important;transform-origin:center center}');
      r.push(B + ' .card .card__view{border-radius:.15em;overflow:hidden;transition:transform .28s ease,box-shadow .28s ease;background:#181818}');
      r.push(B + ' .card .card__img,' + B + ' .card .card__poster{transition:transform .4s ease;border-radius:.15em}');
      r.push(B + ' .card .card__img:after,' + B + ' .card .card__poster:after{content:\'\';position:absolute;inset:0;background:linear-gradient(180deg,transparent 40%,rgba(0,0,0,.55) 100%);opacity:0;transition:opacity .25s;pointer-events:none}');

      /* ---------- 6. Кардка: hover як у Netflix ---------- */
      r.push(B + ' .card:hover,' + B + ' .card.focus,' + B + ' .card.traverse{background:transparent!important;border:0!important;outline:0!important;transform:scale(1.14)!important;z-index:14!important;position:relative!important;box-shadow:0 18px 40px rgba(0,0,0,.75)!important}');
      r.push(B + ' .card:hover .card__view,' + B + ' .card.focus .card__view,' + B + ' .card.traverse .card__view{transform:scale(1.02);box-shadow:0 8px 22px rgba(0,0,0,.6)!important}');
      r.push(B + ' .card:hover .card__img,' + B + ' .card.focus .card__img{transform:scale(1.04)!important}');
      r.push(B + ' .card:hover .card__img:after,' + B + ' .card.focus .card__img:after,' + B + ' .card:hover .card__poster:after,' + B + ' .card.focus .card__poster:after{opacity:1}');
      r.push(B + ' .card:hover:before,' + B + ' .card.focus:before{content:\'\';position:absolute;inset:0;border-radius:.2em;box-shadow:inset 0 0 0 1px rgba(255,255,255,.25);z-index:20;pointer-events:none}');
      r.push(B + ' .card.hide .card__view,' + B + ' .card .card__filter{display:none!important}');

      /* ---------- 7. Зовнішня панель інфо у "фокусі" ---------- */
      r.push(B + ' .nfx-card-info{position:absolute;left:0;right:0;top:100%;z-index:22;display:block;opacity:0;visibility:hidden;transform:translateY(-6px) scale(.9);transition:opacity .18s ease .06s,transform .24s ease .04s,visibility 0s linear .3s;background:#181818;border-radius:0 0 .25em .25em;box-shadow:0 22px 44px rgba(0,0,0,.8);padding:.75em .9em .9em;pointer-events:auto;border-top:1px solid rgba(255,255,255,.06)}');
      r.push(B + ' .card:hover .nfx-card-info,' + B + ' .card.focus .nfx-card-info{opacity:1;visibility:visible;transform:translateY(0) scale(1);transition:opacity .2s ease .08s,transform .26s cubic-bezier(.2,.8,.2,1) .04s}');
      r.push(B + ' .nfx-card-info__row{display:flex;align-items:center;justify-content:space-between;margin-bottom:.45em}');
      r.push(B + ' .nfx-card-info__actions{display:flex;align-items:center;gap:.35em}');
      r.push(B + ' .nfx-card-info__btn{width:2em;height:2em;border-radius:50%;border:1px solid rgba(255,255,255,.55);background:transparent;color:#fff;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;transition:.15s;font-size:1em;padding:0}');
      r.push(B + ' .nfx-card-info__btn svg{width:1em;height:1em;fill:currentColor}');
      r.push(B + ' .nfx-card-info__btn--play{background:#fff;border-color:#fff;color:#000}');
      r.push(B + ' .nfx-card-info__btn:hover{background:#fff;color:#000}');
      r.push(B + ' .nfx-card-info__count{font-size:.8em;font-weight:600;color:#fff;letter-spacing:.02em}');
      r.push(B + ' .nfx-card-info__match{color:#46d369;font-weight:800}');
      r.push(B + ' .nfx-card-info__title{font-size:1.02em;font-weight:800;color:#fff;line-height:1.2;margin-bottom:.5em;white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}');
      r.push(B + ' .nfx-card-info__meta{display:flex;align-items:center;flex-wrap:wrap;gap:.4em;font-size:.78em;font-weight:600;color:rgba(255,255,255,.75);margin-bottom:.5em}');
      r.push(B + ' .nfx-card-info__year{color:#fff;font-weight:700}');
      r.push(B + ' .nfx-card-info__descr{font-size:.74em;line-height:1.35;color:rgba(255,255,255,.68);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}');
      r.push(B + ' .nfx-card-info__badge{font-size:.72em!important;letter-spacing:.12em}');
      r.push(B + ' .items-line{overflow:visible!important;padding-bottom:1.2em}');
      r.push(B + ' .items-line .card{margin-bottom:1.2em}');
      r.push(B + ' .scroll__body{overflow-x:visible!important}');

      /* ---------- 8. Мітка типу НА КАРТКІ ---------- */
      r.push(B + ' .nfx-badge{position:absolute;top:.5em;left:.5em;z-index:8;display:inline-flex;align-items:center;justify-content:center;padding:.2em .65em;border-radius:.5em;font-size:.66em;font-weight:800;letter-spacing:.12em;color:#fff;background:rgba(0,0,0,.6);border:1px solid rgba(255,255,255,.2);pointer-events:none;text-transform:uppercase}');
      r.push(B + ' .nfx-badge--tv{background:rgba(229,9,20,.9);border-color:transparent}');

      /* ---------- 9. Рейтинг на картці ---------- */
      r.push(B + ' .nfx-rate{position:absolute;bottom:.55em;left:.55em;z-index:8;display:inline-flex;align-items:center;gap:.22em;font-size:.82em;font-weight:800;color:#fff;text-shadow:0 1px 5px rgba(0,0,0,.95);pointer-events:none;letter-spacing:.01em}');
      r.push(B + ' .nfx-rate svg{width:.9em;height:.9em;fill:#e50914}');

      /* ---------- 10. Billboard (hero) ---------- */
      r.push(B + ' .nfx-hero{position:relative;width:100%;margin:0 0 .6em;overflow:hidden;background:#000;cursor:pointer}');
      r.push(B + ' .nfx-hero__bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 20%;opacity:0;transition:opacity .5s ease;will-change:opacity}');
      r.push(B + ' .nfx-hero__bg--on{opacity:1}');
      r.push(B + ' .nfx-hero__track{position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,0,0,.9) 0%,rgba(0,0,0,.55) 30%,rgba(0,0,0,.05) 65%),linear-gradient(0deg,rgba(0,0,0,.96) 0%,rgba(0,0,0,.4) 45%,transparent 75%)}');
      r.push(B + ' .nfx-hero__body{position:relative;z-index:3;display:flex;flex-direction:column;align-items:flex-start;justify-content:flex-end;min-height:24.5em;padding:0 3.2em 2.6em 3em;max-width:58%;box-sizing:border-box}');
      r.push(B + ' .nfx-hero__title{font-size:3em;font-weight:900;line-height:1.02;color:#fff;letter-spacing:.01em;margin:0 0 .2em;text-shadow:0 4px 24px rgba(0,0,0,.8)}');
      r.push(B + ' .nfx-hero__meta{display:flex;align-items:center;gap:.75em;flex-wrap:wrap;font-size:.98em;font-weight:600;color:#fff;text-shadow:0 1px 6px rgba(0,0,0,.8);margin-bottom:.35em}');
      r.push(B + ' .nfx-hero__match{color:#46d369;font-weight:800}');
      r.push(B + ' .nfx-hero__year{opacity:.95}');
      r.push(B + ' .nfx-hero__age{color:#fff;border:1px solid rgba(255,255,255,.4);border-radius:.25em;padding:0 .5em;font-size:.8em;line-height:1.4;font-weight:600}');
      r.push(B + ' .nfx-hero__hd{color:#fff;border:1px solid rgba(255,255,255,.4);border-radius:.15em;padding:0 .35em;font-size:.72em;line-height:1.3;font-weight:700;letter-spacing:.04em}');
      r.push(B + ' .nfx-hero__desc{font-size:1em;line-height:1.5;color:rgba(255,255,255,.92);margin:.25em 0 1.1em;max-width:52ch;text-shadow:0 1px 8px rgba(0,0,0,.85);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}');
      r.push(B + ' .nfx-hero__actions{display:flex;align-items:center;gap:.9em;flex-wrap:wrap}');
      r.push(B + ' .nfx-hero__btn{display:inline-flex;align-items:center;gap:.6em;height:2.7em;padding:0 1.8em;border-radius:2em;border:0;font-size:1em;font-weight:700;cursor:pointer;transition:background .18s,transform .12s,opacity .18s;outline:0;white-space:nowrap;background:#fff;color:#000}');
      r.push(B + ' .nfx-hero__btn svg{width:1.15em;height:1.15em;fill:currentColor}');
      r.push(B + ' .nfx-hero__btn--play:hover,' + B + ' .nfx-hero__btn--play.focus{background:rgba(255,255,255,.85);transform:scale(1.04)}');
      r.push(B + ' .nfx-hero__btn--more{background:rgba(55,55,58,.7);color:#fff}');
      r.push(B + ' .nfx-hero__btn--more:hover,' + B + ' .nfx-hero__btn--more.focus{background:rgba(70,70,74,.8);transform:scale(1.04)}');
      r.push(B + ' .nfx-hero__dots{position:absolute;right:2.2em;bottom:2.4em;z-index:4;display:flex;align-items:center;gap:.35em}');
      r.push(B + ' .nfx-hero__dot{width:11px;height:3px;border:0;padding:0;border-radius:2px;background:rgba(255,255,255,.45);cursor:pointer;transition:background .2s,width .2s;overflow:hidden}');
      r.push(B + ' .nfx-hero__dot--on{width:22px;background:#fff;background-image:linear-gradient(90deg,#e50914 0%,#e50914 100%)}');

      /* ---------- 11. Плеєр ---------- */
      r.push(B + ' .player .player-panel__position>div{background:#e50914!important}');
      r.push(B + ' .player .player-panel__position:after{background:#e50914!important}');
      r.push(B + ' .player .player-panel__quality{background:rgba(229,9,20,.9)!important;color:#fff!important;border-radius:3px!important}');
      r.push(B + ' .player .player-panel__box-buttons{background:rgba(255,255,255,.08)!important}');

      /* ---------- 12. Скролбари ---------- */
      r.push(B + ' ::-webkit-scrollbar{width:8px;height:9px}');
      r.push(B + ' ::-webkit-scrollbar-track{background:#0d0d0d}');
      r.push(B + ' ::-webkit-scrollbar-thumb{background:#333;border-radius:4px}');
      r.push(B + ' ::-webkit-scrollbar-thumb:hover{background:#454545}');

      /* ---------- 13. Розмір карток ---------- */
      r.push(B + '[' + KEYS.CARD_SIZE_ATTR + '="sm"] .items-line .card{width:12.5em!important}');
      r.push(B + '[' + KEYS.CARD_SIZE_ATTR + '="md"] .items-line .card{width:15.5em!important}');
      r.push(B + '[' + KEYS.CARD_SIZE_ATTR + '="lg"] .items-line .card{width:18.5em!important}');

      /* ---------- 14. Адаптив ---------- */
      if (matchesMedia('(max-width:767px)')) {
        r.push(B + ' .nfx-hero__body{min-height:19em;max-width:94%;padding:0 1.1em 1.2em}');
        r.push(B + ' .nfx-hero__title{font-size:1.8em}');
        r.push(B + ' .nfx-hero__desc{margin:.2em 0 .8em}');
        r.push(B + ' .nfx-hero__btn{height:2.2em;padding:0 1.2em;font-size:.92em}');
        r.push(B + ' .nfx-hero__dots{right:1.1em;bottom:1.2em}');
        r.push(B + ' .items-line__title{font-size:1.2em}');
        r.push(B + '[' + KEYS.CARD_SIZE_ATTR + '="sm"] .items-line .card{width:9em!important}');
        r.push(B + '[' + KEYS.CARD_SIZE_ATTR + '="md"] .items-line .card{width:11em!important}');
        r.push(B + '[' + KEYS.CARD_SIZE_ATTR + '="lg"] .items-line .card{width:13em!important}');
      } else if (matchesMedia('(min-width:1920px)')) {
        r.push(B + ' .nfx-hero__body{min-height:46em}');
        r.push(B + ' .nfx-hero__title{font-size:4em}');
      }

      s.textContent = r.join('\n');
      (document.head || document.body || document.documentElement).appendChild(s);
    } catch (e) {}
  }

  /* ============================================================
     HERO / БІЛБОРД
     ============================================================ */
  var heroTimer = null;
  var heroIndex = 0;
  var heroItems = [];

  function ageOf(item) {
    var a = item.PG || item.pg || item.adult || null;
    if (a) return String(a).replace(/\D/g, '') + '+';
    return null;
  }

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
      var hdEl = document.createElement('span');
      hdEl.className = 'nfx-hero__hd';
      hdEl.textContent = 'HD';
      var ageEl = document.createElement('span');
      ageEl.className = 'nfx-hero__age';

      meta.appendChild(matchEl);
      meta.appendChild(yearEl);
      meta.appendChild(ageEl);
      meta.appendChild(hdEl);

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
      moreBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.7"/><path d="M12 8h.01M12 11v5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg><span></span>';

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
        var v = parseFloat(item.vote_average || 0);
        matchEl.textContent = Math.round(v * 10) + '% ' + t('match');
        var y = item.release_date || item.first_air_date || item.air_date || '';
        yearEl.textContent = y ? String(y).slice(0, 4) : '';
        var a = ageOf(item);
        ageEl.style.display = a ? '' : 'none';
        if (a) ageEl.textContent = a;
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
        heroTimer = setInterval(function () { render((heroIndex + 1) % heroItems.length); }, 9000);
      }

      playBtn.addEventListener('click', function (e) { e.stopPropagation(); openAndPlay(heroItems[heroIndex]); });
      moreBtn.addEventListener('click', function (e) { e.stopPropagation(); openItem(heroItems[heroIndex]); });
      bg.addEventListener('click', function () { openItem(heroItems[heroIndex]); });

      render(0);
      resetTimer();
    } catch (e) {}
  }

  /* ============================================================
     КАРТКИ
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

      /* Бейдж ФИЛЬМ/СЕРИАЛ */
      if (getBool(KEYS.BADGE_KEY, true)) {
        if (!view.querySelector('.nfx-badge')) {
          var b = document.createElement('span');
          b.className = 'nfx-badge' + (detectType(d) === 'tv' ? ' nfx-badge--tv' : '');
          b.textContent = detectType(d) === 'tv' ? t('badge_tv') : t('badge_movie');
          view.appendChild(b);
        }
      }

      /* Рейтинг */
      if (getBool(KEYS.RATING_KEY, true) && d.vote_average) {
        if (!view.querySelector('.nfx-rate')) {
          var st = document.createElement('span');
          st.className = 'nfx-rate';
          st.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 2l2.9 6.3 6.9.8-5.1 4.8 1.4 6.8L12 17.6 5.9 20.7l1.4-6.8L2.2 9.1l6.9-.8z"/></svg>' + Math.round(parseFloat(d.vote_average) * 10) + '%';
          view.appendChild(st);
        }
      }

      /* Панель у hover (як Billboard у Netflix) */
      if (!card.querySelector('.nfx-card-info')) {
        var panel = document.createElement('div');
        panel.className = 'nfx-card-info';

        var v = Math.round(parseFloat(d.vote_average || 0) * 10);
        var y = d.release_date || d.first_air_date || '';
        var pg = ageOf(d);

        var row = document.createElement('div');
        row.className = 'nfx-card-info__row';

        var actions = document.createElement('div');
        actions.className = 'nfx-card-info__actions';
        actions.innerHTML =
          '<button class="nfx-card-info__btn nfx-card-info__btn--play selector"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></button>' +
          '<button class="nfx-card-info__btn selector"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></button>' +
          '<button class="nfx-card-info__btn selector"><svg viewBox="0 0 24 24"><path d="M12 21s-7-4.6-9.5-9C.8 8.6 2.5 5 6 5c2 0 3.2 1 4 2.2C10.8 6 12 5 14 5c3.5 0 5.2 3.6 3.5 7-2.5 4.4-9.5 9-9.5 9z"/></svg></button>';

        var count = document.createElement('span');
        count.className = 'nfx-card-info__count';
        count.textContent = '';

        row.appendChild(actions);
        row.appendChild(count);

        var title = document.createElement('div');
        title.className = 'nfx-card-info__title';
        title.textContent = d.title || d.name || '';

        var meta = document.createElement('div');
        meta.className = 'nfx-card-info__meta';
        meta.innerHTML = '<span class="nfx-card-info__match">' + (v || '') + '% ' + t('match') + '</span>' +
          (y ? '<span class="nfx-card-info__year">' + String(y).slice(0, 4) + '</span>' : '') +
          (pg ? '<span class="nfx-card-info__badge nfx-badge" style="position:static">' + pg + '</span>' : '') +
          '<span class="nfx-card-info__badge nfx-badge" style="position:static;background:rgba(0,0,0,.6)">HD</span>';

        var desc = document.createElement('div');
        desc.className = 'nfx-card-info__descr';
        desc.textContent = d.overview || '';

        panel.appendChild(row);
        panel.appendChild(title);
        panel.appendChild(meta);
        panel.appendChild(desc);

        card.appendChild(panel);

        /* Кліки в панель */
        var playBtn = panel.querySelector('.nfx-card-info__btn--play');
        if (playBtn) playBtn.addEventListener('click', function (e) { e.stopPropagation(); openAndPlay(d); });
        var otherBtns = panel.querySelectorAll('.nfx-card-info__btn:not(.nfx-card-info__btn--play)');
        for (var x = 0; x < otherBtns.length; x++) {
          (function (btn) {
            btn.addEventListener('click', function (e) { e.stopPropagation(); openItem(d); });
          })(otherBtns[x]);
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
        icon: '<svg width="34" height="28" viewBox="0 0 36 28"><text x="18" y="20" text-anchor="middle" font-size="12" font-weight="900" fill="#e50914" font-style="italic" font-family="Arial">N</text></svg>',
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

  function syncBodyAttrs() {
    try {
      document.body.classList.add(KEYS.BODY_CLASS);
      var size = getPref(KEYS.CARD_SIZE_KEY, 'md');
      if (size !== 'sm' && size !== 'md' && size !== 'lg') size = 'md';
      document.body.setAttribute(KEYS.CARD_SIZE_ATTR, size);
    } catch (e) {}
  }

  /* ============================================================
     СТАРТ
     ============================================================ */
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