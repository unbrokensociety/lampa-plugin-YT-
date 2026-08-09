(function () {
  'use strict';

  var PK = '__NETFLIX_STYLE_V2__';
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
    PANEL_KEY: 'netflix_style_panel',
    UI_LANG_KEY: 'netflix_style_uilang',
    CARD_SIZE_ATTR: 'data-nfx-card-size',
    PANEL_ATTR: 'data-nfx-panel'
  };

  var IMG_BASE = 'https://image.tmdb.org/t/p/';

  var L10N = {
    ru: { badge_movie: 'ФИЛЬМ', badge_tv: 'СЕРИАЛ', watch: 'Смотреть', more: 'Подробнее', match: 'совпадение', panel: 'Панель при фокусе' },
    uk: { badge_movie: 'ФІЛЬМ', badge_tv: 'СЕРІАЛ', watch: 'Дивитись', more: 'Детальніше', match: 'збіг', panel: 'Панель при фокусі' },
    en: { badge_movie: 'MOVIE', badge_tv: 'SERIES', watch: 'Watch now', more: 'More Info', match: 'Match', panel: 'Focus panel' }
  };

  var LANG_KEYS = {
    nfx_enabled: { ru: 'Тема Netflix', uk: 'Тема Netflix', en: 'Netflix theme' },
    nfx_hero: { ru: 'Большой баннер', uk: 'Великий банер', en: 'Big banner' },
    nfx_cardsize: { ru: 'Размер карточек', uk: 'Розмір карток', en: 'Card size' },
    nfx_rating: { ru: 'Рейтинг на карточках', uk: 'Рейтинг на картках', en: 'Rating on cards' },
    nfx_badge: { ru: 'Метка ФИЛЬМ/СЕРИАЛ', uk: 'Мітка ФІЛЬМ/СЕРІАЛ', en: 'MOVIE/SERIES label' },
    nfx_panel: { ru: 'Панель при фокусе', uk: 'Панель при фокусі', en: 'Focus panel' },
    nfx_uilang: { ru: 'Язык интерфейса', uk: 'Мова інтерфейсу', en: 'Interface language' },
    on: { ru: 'Включено', uk: 'Увімкнено', en: 'On' },
    off: { ru: 'Выключено', uk: 'Вимкнено', en: 'Off' },
    yes: { ru: 'Да', uk: 'Так', en: 'Yes' },
    no: { ru: 'Нет', uk: 'Ні', en: 'No' },
    sm: { ru: 'Компактный', uk: 'Компактний', en: 'Compact' },
    md: { ru: 'Средний', uk: 'Середній', en: 'Medium' },
    lg: { ru: 'Большой', uk: 'Великий', en: 'Large' },
    ru: { ru: 'Русский', uk: 'Русский', en: 'Russian' },
    uk: { ru: 'Українська', uk: 'Українська', en: 'Ukrainian' },
    en: { ru: 'English', uk: 'English', en: 'English' }
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

  function lt(key) {
    var lang = uiLang();
    var m = LANG_KEYS[key];
    if (!m) return key;
    return m[lang] !== undefined ? m[lang] : m.en;
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

  function isTv() {
    try { return !!(Lampa.Platform && Lampa.Platform.screen && Lampa.Platform.screen('tv')); } catch (e) { return false; }
  }

  function isMobile() {
    try {
      if (Lampa.Platform && Lampa.Platform.isMobile) return !!Lampa.Platform.isMobile();
      if (Lampa.Platform && Lampa.Platform.isTouch) return !!Lampa.Platform.isTouch();
    } catch (e) {}
    return false;
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

  function ageOf(item) {
    var a = item.PG || item.pg || (item.adult ? 18 : null);
    if (!a) return null;
    return String(a).replace(/\D/g, '') + '+';
  }

  function yearOf(item) {
    var y = item.release_date || item.first_air_date || item.air_date || '';
    return y ? String(y).slice(0, 4) : '';
  }

  function source() {
    try { return (Lampa.Storage && Lampa.Storage.field) ? Lampa.Storage.field('source') : 'tmdb'; } catch (e) { return 'tmdb'; }
  }

  /* Кнопка "Подробнее" — сторінка фільму */
  function openItem(item) {
    try {
      if (!item || !window.Lampa || !Lampa.Activity) return;
      var type = detectType(item);
      Lampa.Activity.push({ url: '', title: item.title || item.name || '', component: 'full', id: item.id, method: type, source: source(), card: item });
    } catch (e) {}
  }

  /* Кнопка "Воспроизвести" — сторінка + авто-клік Play */
  function openAndPlay(item) {
    try {
      if (!item || !window.Lampa || !Lampa.Activity) return;
      var type = detectType(item);
      var title = item.title || item.name || '';
      Lampa.Activity.push({ url: '', title: title, component: 'full', id: item.id, method: type, source: source(), card: item });

      var tries = 0;
      var timer = setInterval(function () {
        tries++;
        var sel = '.button--play:not(.hide), .full-start .button--play, .full-start-new .button--play, .fullstart .button--play';
        var btn = document.querySelector(sel);
        if (btn) {
          clearInterval(timer);
          try {
            if (window.$) { $(btn).trigger('hover:click'); return; }
          } catch (e2) {}
          try { if (typeof btn.click === 'function') btn.click(); } catch (e2) {}
        } else if (tries > 12) {
          clearInterval(timer);
        }
      }, 500);
    } catch (e) {}
  }

  /* ============================================================
     СТИЛІ — дизайн-система Netflix
     ============================================================ */
  function injectStyle() {
    try {
      var old = document.getElementById(KEYS.STYLE_ID);
      if (old) old.remove();
      var s = document.createElement('style');
      s.id = KEYS.STYLE_ID;
      var B = 'body.' + KEYS.BODY_CLASS;
      var r = [];

      /* ---------- 1. База ---------- */
      r.push(B + '{--nfx-red:#e50914;--nfx-bg:#141414;--nfx-card:#181818;--nfx-gray:#b3b3b3;--nfx-green:#46d369;background:#141414!important;color:#fff}');
      r.push(B + ' .fullstart, ' + B + ' .scroll, ' + B + ' .activity, ' + B + ' .full-start, ' + B + ' .full-start-new{background:#141414!important}');
      r.push(B + ' ::-webkit-scrollbar{width:8px;height:9px}');
      r.push(B + ' ::-webkit-scrollbar-track{background:#0d0d0d}');
      r.push(B + ' ::-webkit-scrollbar-thumb{background:#333;border-radius:4px}');
      r.push(B + ' ::-webkit-scrollbar-thumb:hover{background:#454545}');

      /* ---------- 2. Шапка Netflix ---------- */
      r.push(B + ' .head{position:fixed;top:0;left:0;right:0;z-index:40;height:4em;display:flex;align-items:center;background:linear-gradient(180deg,rgba(0,0,0,.95) 0%,rgba(0,0,0,.6) 60%,transparent 100%)!important;border-bottom:0!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;transition:background .3s ease,box-shadow .3s ease}');
      r.push(B + '.nfx-scrolled .head{background:rgba(20,20,20,.98)!important;box-shadow:0 2px 10px rgba(0,0,0,.6)}');
      r.push(B + ' .head__body{display:flex;align-items:center;width:100%;padding:0 1.2em;height:100%}');
      r.push(B + ' .head__logo svg{display:none!important}');
      r.push(B + ' .nfx-brand{font-size:2.4em;font-weight:900;line-height:1;color:#e50914;margin-right:.9em;letter-spacing:-.02em;font-family:"Netflix Sans","Helvetica Neue",Arial,sans-serif;text-shadow:0 0 14px rgba(229,9,20,.35);cursor:pointer;user-select:none}');
      r.push(B + ' .head__menu-icon,' + B + ' .head .button--back,' + B + ' .head__action{color:#fff}');
      r.push(B + ' .head__action svg{fill:#fff}');

      /* ---------- 3. Меню / навігація ---------- */
      r.push(B + ' .menu{background:rgba(0,0,0,.97)!important;border-right:1px solid rgba(255,255,255,.06);min-width:15em}');
      r.push(B + ' .menu__list .menu__item .menu__text{color:#b3b3b3;font-weight:500;font-size:.95em;transition:color .18s,font-weight .18s}');
      r.push(B + ' .menu__list .menu__item.focus .menu__text,' + B + ' .menu__list .menu__item:hover .menu__text{color:#fff;font-weight:700}');
      r.push(B + ' .menu__list .menu__item.focus:before,' + B + ' .menu__list .menu__item:hover:before{background:#e50914!important}');
      r.push(B + ' .menu__ico svg{fill:#b3b3b3;transition:fill .18s}');
      r.push(B + ' .menu__list .menu__item.focus .menu__ico svg,' + B + ' .menu__list .menu__item:hover .menu__ico svg{fill:#e50914}');

      /* ---------- 4. Заголовки рядів ---------- */
      r.push(B + ' .items-line__title{font-size:1.4em;font-weight:700;letter-spacing:.02em;color:#fff;margin-bottom:.65em;padding:0 .1em}');
      r.push(B + ' .scroll__title{color:#fff!important;font-weight:700}');
      r.push(B + ' .scroll__body{padding-bottom:3em}');

      /* ---------- 5. Ряди: простір для hover ---------- */
      r.push(B + ' .items-line{overflow-x:auto!important;overflow-y:visible!important;padding:1em 0 15em;scrollbar-width:thin}');
      r.push(B + ' .items-line .card{flex:0 0 auto;margin:0 .3em}');

      /* ---------- 6. Картка Netflix ---------- */
      r.push(B + ' .card{border-radius:.3em!important;overflow:visible!important;box-shadow:none!important;transition:transform .28s cubic-bezier(.2,.8,.2,1),box-shadow .28s ease,z-index 0s!important;transform-origin:center bottom}');
      r.push(B + ' .card .card__view{border-radius:.3em;overflow:hidden;background:#181818;transition:transform .28s ease,box-shadow .28s ease}');
      r.push(B + ' .card .card__img,' + B + ' .card .card__poster{transition:transform .35s ease;border-radius:.3em}');
      r.push(B + ' .card:hover,' + B + ' .card.focus,' + B + ' .card.traverse{background:transparent!important;border:0!important;outline:0!important;transform:scale(1.12) translateY(-.4em)!important;z-index:60!important;position:relative!important;box-shadow:0 16px 38px rgba(0,0,0,.75)!important}');
      r.push(B + ' .card:hover .card__view,' + B + ' .card.focus .card__view,' + B + ' .card.traverse .card__view{transform:scale(1.03);box-shadow:inset 0 0 0 1px rgba(255,255,255,.14),0 10px 26px rgba(0,0,0,.55)!important}');
      r.push(B + ' .card:hover .card__img,' + B + ' .card.focus .card__img{transform:scale(1.05)!important}');
      r.push(B + ' .card:hover .card__poster,' + B + ' .card.focus .card__poster{transform:scale(1.05)!important}');

      /* ---------- 7. Панель всередині картки при фокусі ---------- */
      r.push(B + '[' + KEYS.PANEL_ATTR + '="on"] .nfx-card-panel{position:absolute;left:0;right:0;bottom:0;z-index:9;box-sizing:border-box;padding:.85em .8em .8em;background:linear-gradient(0deg,rgba(24,24,24,.99) 0%,rgba(24,24,24,.92) 55%,transparent 100%);border-radius:0 0 .3em .3em;opacity:0;visibility:hidden;transform:translateY(.45em);transition:opacity .2s ease,transform .28s cubic-bezier(.2,.8,.2,1),visibility 0s linear .25s;pointer-events:none}');
      r.push(B + '[' + KEYS.PANEL_ATTR + '="on"] .card:hover .nfx-card-panel,' + B + '[' + KEYS.PANEL_ATTR + '="on"] .card.focus .nfx-card-panel,' + B + '[' + KEYS.PANEL_ATTR + '="on"] .card.traverse .nfx-card-panel{opacity:1;visibility:visible;transform:translateY(0);transition:opacity .22s ease .06s,transform .3s cubic-bezier(.2,.8,.2,1);pointer-events:auto}');
      r.push(B + ' .nfx-card-panel__row{display:flex;align-items:center;justify-content:space-between;margin-bottom:.4em}');
      r.push(B + ' .nfx-card-panel__actions{display:flex;align-items:center;gap:.35em}');
      r.push(B + ' .nfx-card-panel__btn{width:1.9em;height:1.9em;border-radius:50%;border:1px solid rgba(255,255,255,.55);background:transparent;color:#fff;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;transition:background .15s,border-color .15s,transform .1s;padding:0;font-size:1em;line-height:1}');
      r.push(B + ' .nfx-card-panel__btn svg{width:.95em;height:.95em;fill:currentColor}');
      r.push(B + ' .nfx-card-panel__btn--play{background:#fff;border-color:#fff;color:#000}');
      r.push(B + ' .nfx-card-panel__btn:hover{background:#fff;color:#000;border-color:#fff;transform:scale(1.06)}');
      r.push(B + ' .nfx-card-panel__match{font-size:.8em;font-weight:800;color:#46d369}');
      r.push(B + ' .nfx-card-panel__title{font-size:1em;font-weight:800;color:#fff;line-height:1.2;margin-bottom:.3em;white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}');
      r.push(B + ' .nfx-card-panel__meta{display:flex;align-items:center;flex-wrap:wrap;gap:.4em;font-size:.72em;font-weight:600;color:rgba(255,255,255,.85);margin-bottom:.35em}');
      r.push(B + ' .nfx-card-panel__year{color:#fff;font-weight:700}');
      r.push(B + ' .nfx-card-panel__age{border:1px solid rgba(255,255,255,.35);border-radius:.2em;padding:0 .4em;line-height:1.4}');
      r.push(B + ' .nfx-card-panel__hd{border:1px solid rgba(255,255,255,.35);border-radius:.15em;padding:0 .3em;font-size:.92em;line-height:1.35;font-weight:700}');
      r.push(B + ' .nfx-card-panel__descr{font-size:.72em;line-height:1.35;color:rgba(255,255,255,.65);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}');

      /* ---------- 8. Мітка ФИЛЬМ/СЕРИАЛ ---------- */
      r.push(B + ' .nfx-badge{position:absolute;top:.5em;left:.5em;z-index:8;display:inline-flex;align-items:center;justify-content:center;padding:.2em .65em;border-radius:.45em;font-size:.62em;font-weight:800;letter-spacing:.12em;color:#fff;background:rgba(0,0,0,.62);border:1px solid rgba(255,255,255,.22);pointer-events:none;text-transform:uppercase}');
      r.push(B + ' .nfx-badge--tv{background:rgba(229,9,20,.92);border-color:transparent}');

      /* ---------- 9. Рейтинг на картці ---------- */
      r.push(B + ' .nfx-rate{position:absolute;bottom:.5em;left:.55em;z-index:8;display:inline-flex;align-items:center;gap:.22em;font-size:.8em;font-weight:800;color:#fff;text-shadow:0 1px 5px rgba(0,0,0,.95);pointer-events:none;letter-spacing:.01em}');
      r.push(B + ' .nfx-rate svg{width:.9em;height:.9em;fill:#e50914}');

      /* ---------- 10. Billboard (hero) ---------- */
      r.push(B + ' .nfx-hero{position:relative;width:100%;height:auto;min-height:32em;margin:4em 0 .4em;overflow:hidden;background:#000}');
      r.push(B + ' .nfx-hero__bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 18%;opacity:0;transition:opacity .55s ease;will-change:opacity}');
      r.push(B + ' .nfx-hero__bg--on{opacity:1}');
      r.push(B + ' .nfx-hero__track{position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,0,0,.92) 0%,rgba(0,0,0,.55) 32%,rgba(0,0,0,.05) 70%),linear-gradient(0deg,rgba(20,20,20,.98) 0%,rgba(20,20,20,.85) 14%,rgba(0,0,0,.35) 45%,transparent 75%)}');
      r.push(B + ' .nfx-hero__content{position:absolute;left:0;bottom:0;z-index:5;box-sizing:border-box;width:52%;max-width:52%;padding:0 3.2em 2.8em;display:flex;flex-direction:column;align-items:flex-start}');
      r.push(B + ' .nfx-hero__title{font-size:2.9em;font-weight:900;line-height:1.02;color:#fff;letter-spacing:.01em;margin:0 0 .18em;text-shadow:0 4px 24px rgba(0,0,0,.8);font-family:"Netflix Sans","Helvetica Neue",Arial,sans-serif}');
      r.push(B + ' .nfx-hero__meta{display:flex;align-items:center;gap:.7em;flex-wrap:wrap;font-size:.95em;font-weight:600;color:#fff;text-shadow:0 1px 6px rgba(0,0,0,.8);margin-bottom:.4em}');
      r.push(B + ' .nfx-hero__match{color:#46d369;font-weight:800}');
      r.push(B + ' .nfx-hero__year{opacity:.95}');
      r.push(B + ' .nfx-hero__age{border:1px solid rgba(255,255,255,.4);border-radius:.25em;padding:0 .45em;font-size:.8em;line-height:1.45;font-weight:600}');
      r.push(B + ' .nfx-hero__hd{border:1px solid rgba(255,255,255,.4);border-radius:.15em;padding:0 .3em;font-size:.72em;line-height:1.35;font-weight:700;letter-spacing:.05em}');
      r.push(B + ' .nfx-hero__desc{font-size:.96em;line-height:1.45;color:rgba(255,255,255,.92);margin:.2em 0 1em;max-width:46ch;text-shadow:0 1px 8px rgba(0,0,0,.85);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}');
      r.push(B + ' .nfx-hero__buttons{display:flex;align-items:center;gap:.85em;flex-wrap:wrap}');
      r.push(B + ' .nfx-hero__btn{display:inline-flex;align-items:center;gap:.55em;height:2.65em;padding:0 1.7em;border-radius:2em;border:0;font-size:1em;font-weight:700;cursor:pointer;transition:background .18s,transform .12s,opacity .18s;outline:0;white-space:nowrap}');
      r.push(B + ' .nfx-hero__btn svg{width:1.1em;height:1.1em;fill:currentColor}');
      r.push(B + ' .nfx-hero__btn--play{background:#fff;color:#000}');
      r.push(B + ' .nfx-hero__btn--play:hover,' + B + ' .nfx-hero__btn--play.focus{background:rgba(255,255,255,.82);transform:scale(1.05)}');
      r.push(B + ' .nfx-hero__btn--more{background:rgba(109,109,110,.55);color:#fff}');
      r.push(B + ' .nfx-hero__btn--more:hover,' + B + ' .nfx-hero__btn--more.focus{background:rgba(90,90,94,.65);transform:scale(1.05)}');
      r.push(B + ' .nfx-hero__dots{position:absolute;right:2.4em;bottom:2em;z-index:6;display:flex;align-items:center;gap:.4em}');
      r.push(B + ' .nfx-hero__dot{width:11px;height:3px;border:0;padding:0;border-radius:2px;background:rgba(255,255,255,.45);cursor:pointer;transition:background .2s,width .2s,transform .2s}');
      r.push(B + ' .nfx-hero__dot--on{width:24px;background:#e50914}');

      /* ---------- 11. Плеєр ---------- */
      r.push(B + ' .player .player-panel__position>div{background:#e50914!important}');
      r.push(B + ' .player .player-panel__position:after{background:#e50914!important}');
      r.push(B + ' .player .player-panel__quality{background:rgba(229,9,20,.9)!important;color:#fff!important;border-radius:3px!important}');
      r.push(B + ' .player .player-panel__box-buttons{background:rgba(255,255,255,.08)!important}');

      /* ---------- 12. Розміри карток ---------- */
      r.push(B + '[' + KEYS.CARD_SIZE_ATTR + '="sm"] .items-line .card{width:12.5em!important}');
      r.push(B + '[' + KEYS.CARD_SIZE_ATTR + '="md"] .items-line .card{width:15.5em!important}');
      r.push(B + '[' + KEYS.CARD_SIZE_ATTR + '="lg"] .items-line .card{width:18.5em!important}');

      /* ---------- 13. ТВ ---------- */
      if (isTv()) {
        r.push(B + '.nfx-tv .head{height:5em}');
        r.push(B + '.nfx-tv .nfx-brand{font-size:3.2em}');
        r.push(B + '.nfx-tv .nfx-hero{min-height:44em}');
        r.push(B + '.nfx-tv .nfx-hero__title{font-size:4em}');
        r.push(B + '.nfx-tv .nfx-hero__content{padding-bottom:3.6em}');
        r.push(B + '.nfx-tv .nfx-hero__desc{font-size:1.05em;max-width:52ch}');
        r.push(B + '.nfx-tv .card:hover,' + B + '.nfx-tv .card.focus{transform:scale(1.18) translateY(-.5em)!important}');
        r.push(B + '.nfx-tv[' + KEYS.CARD_SIZE_ATTR + '="sm"] .items-line .card{width:15em!important}');
        r.push(B + '.nfx-tv[' + KEYS.CARD_SIZE_ATTR + '="md"] .items-line .card{width:18em!important}');
        r.push(B + '.nfx-tv[' + KEYS.CARD_SIZE_ATTR + '="lg"] .items-line .card{width:22em!important}');
        r.push(B + '.nfx-tv .nfx-card-panel__btn{width:2.4em;height:2.4em}');
        r.push(B + '.nfx-tv .nfx-card-panel__btn svg{width:1.2em;height:1.2em}');
        r.push(B + '.nfx-tv .nfx-card-panel__title{font-size:1.15em}');
        r.push(B + '.nfx-tv .items-line__title{font-size:1.7em}');
      }

      /* ---------- 14. Телефон ---------- */
      if (isMobile() || matchesMedia('(max-width:767px)')) {
        r.push(B + '.nfx-mobile .head{height:3.2em}');
        r.push(B + '.nfx-mobile .nfx-brand{font-size:1.8em;margin-right:.6em}');
        r.push(B + '.nfx-mobile .nfx-hero{min-height:24em;margin-top:3.2em}');
        r.push(B + '.nfx-mobile .nfx-hero__content{width:100%;max-width:100%;padding:0 1.1em 1.4em}');
        r.push(B + '.nfx-mobile .nfx-hero__title{font-size:1.7em}');
        r.push(B + '.nfx-mobile .nfx-hero__desc{font-size:.85em;margin-bottom:.8em}');
        r.push(B + '.nfx-mobile .nfx-hero__btn{height:2.25em;padding:0 1.2em;font-size:.92em}');
        r.push(B + '.nfx-mobile .nfx-hero__dots{right:1.1em;bottom:1.2em}');
        r.push(B + '.nfx-mobile .items-line__title{font-size:1.15em}');
        r.push(B + '.nfx-mobile .card:hover,' + B + '.nfx-mobile .card.focus{transform:scale(1.04)!important;box-shadow:none!important}');
        r.push(B + '.nfx-mobile[' + KEYS.PANEL_ATTR + '="on"] .nfx-card-panel{display:none}');
        r.push(B + '.nfx-mobile[' + KEYS.CARD_SIZE_ATTR + '="sm"] .items-line .card{width:9em!important}');
        r.push(B + '.nfx-mobile[' + KEYS.CARD_SIZE_ATTR + '="md"] .items-line .card{width:11em!important}');
        r.push(B + '.nfx-mobile[' + KEYS.CARD_SIZE_ATTR + '="lg"] .items-line .card{width:13em!important}');
        r.push(B + '.nfx-mobile .items-line{padding-bottom:3em}');
      }

      s.textContent = r.join('\n');
      (document.head || document.body || document.documentElement).appendChild(s);
    } catch (e) {}
  }

  /* ============================================================
     БРЕНД "N" + скрол-стан шапки
     ============================================================ */
  function injectBrand() {
    try {
      if (document.querySelector('.nfx-brand')) return;
      var head = document.querySelector('.head') || document.querySelector('.head__body');
      if (!head) return;
      var brand = document.createElement('div');
      brand.className = 'nfx-brand';
      brand.textContent = 'N';
      brand.setAttribute('tabindex', '0');
      var logo = document.querySelector('.head__logo');
      if (logo && logo.parentNode) {
        logo.parentNode.insertBefore(brand, logo);
      } else if (head.firstChild) {
        head.insertBefore(brand, head.firstChild);
      } else {
        head.appendChild(brand);
      }
      brand.addEventListener('click', function () {
        try { if (window.Lampa && Lampa.Activity && Lampa.Activity.backward) Lampa.Activity.backward(); } catch (e) {}
      });
    } catch (e) {}
  }

  function bindScrollState() {
    try {
      var scroller = document.querySelector('.scroll__body') || document.querySelector('.scroll') || window;
      var onScroll = function () {
        var top = 0;
        try { top = (scroller === window) ? (window.pageYOffset || document.documentElement.scrollTop) : scroller.scrollTop; } catch (e) {}
        try { document.body.classList.toggle('nfx-scrolled', top > 40); } catch (e) {}
      };
      if (scroller && scroller.addEventListener) scroller.addEventListener('scroll', onScroll, { passive: true });
      if (scroller !== window && window.addEventListener) window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    } catch (e) {}
  }

  /* ============================================================
     HERO / BILLBOARD
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

      var content = document.createElement('div');
      content.className = 'nfx-hero__content';

      var title = document.createElement('div');
      title.className = 'nfx-hero__title';

      var meta = document.createElement('div');
      meta.className = 'nfx-hero__meta';

      var matchEl = document.createElement('span');
      matchEl.className = 'nfx-hero__match';
      var yearEl = document.createElement('span');
      yearEl.className = 'nfx-hero__year';
      var ageEl = document.createElement('span');
      ageEl.className = 'nfx-hero__age';
      var hdEl = document.createElement('span');
      hdEl.className = 'nfx-hero__hd';
      hdEl.textContent = 'HD';

      meta.appendChild(matchEl);
      meta.appendChild(yearEl);
      meta.appendChild(ageEl);
      meta.appendChild(hdEl);

      var desc = document.createElement('div');
      desc.className = 'nfx-hero__desc';

      var buttons = document.createElement('div');
      buttons.className = 'nfx-hero__buttons';

      var playBtn = document.createElement('button');
      playBtn.className = 'nfx-hero__btn nfx-hero__btn--play selector';
      playBtn.setAttribute('tabindex', '0');
      playBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
      var playLabel = document.createElement('span');
      playLabel.textContent = t('watch');
      playBtn.appendChild(playLabel);

      var moreBtn = document.createElement('button');
      moreBtn.className = 'nfx-hero__btn nfx-hero__btn--more selector';
      moreBtn.setAttribute('tabindex', '0');
      moreBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.7"/><path d="M12 8h.01M12 11v5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
      var moreLabel = document.createElement('span');
      moreLabel.textContent = t('more');
      moreBtn.appendChild(moreLabel);

      buttons.appendChild(playBtn);
      buttons.appendChild(moreBtn);

      content.appendChild(title);
      content.appendChild(meta);
      content.appendChild(desc);
      content.appendChild(buttons);

      var dots = document.createElement('div');
      dots.className = 'nfx-hero__dots';

      hero.appendChild(bg);
      hero.appendChild(track);
      hero.appendChild(content);
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
        yearEl.textContent = yearOf(item);
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
          dot.setAttribute('aria-label', 'slide');
          dot.addEventListener('click', function (e) { e.stopPropagation(); resetTimer(); render(idx); });
          dots.appendChild(dot);
        })(j);
      }

      function stopTimer() { if (heroTimer) { clearInterval(heroTimer); heroTimer = null; } }
      function resetTimer() {
        stopTimer();
        heroTimer = setInterval(function () { render((heroIndex + 1) % heroItems.length); }, 9000);
      }

      /* Різні дії: Play → відтворення, More → сторінка */
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

      /* Мітка ФИЛЬМ/СЕРИАЛ */
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

      /* Панель при фокусі */
      if (getBool(KEYS.PANEL_KEY, true)) {
        if (!card.querySelector('.nfx-card-panel')) {
          var panel = document.createElement('div');
          panel.className = 'nfx-card-panel';

          var v = Math.round(parseFloat(d.vote_average || 0) * 10);
          var y = yearOf(d);
          var pg = ageOf(d);

          var row = document.createElement('div');
          row.className = 'nfx-card-panel__row';

          var actions = document.createElement('div');
          actions.className = 'nfx-card-panel__actions';
          actions.innerHTML =
            '<button class="nfx-card-panel__btn nfx-card-panel__btn--play selector"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></button>' +
            '<button class="nfx-card-panel__btn selector"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></button>' +
            '<button class="nfx-card-panel__btn selector"><svg viewBox="0 0 24 24"><path d="M12 21s-7-4.6-9.5-9C.8 8.6 2.5 5 6 5c2 0 3.2 1 4 2.2C10.8 6 12 5 14 5c3.5 0 5.2 3.6 3.5 7-2.5 4.4-9.5 9-9.5 9z"/></svg></button>';

          row.appendChild(actions);

          var match = document.createElement('span');
          match.className = 'nfx-card-panel__match';
          match.textContent = (v || '') + '% ' + t('match');
          row.appendChild(match);

          var title = document.createElement('div');
          title.className = 'nfx-card-panel__title';
          title.textContent = d.title || d.name || '';

          var meta = document.createElement('div');
          meta.className = 'nfx-card-panel__meta';
          meta.innerHTML = (y ? '<span class="nfx-card-panel__year">' + y + '</span>' : '') +
            (pg ? '<span class="nfx-card-panel__age">' + pg + '</span>' : '') +
            '<span class="nfx-card-panel__hd">HD</span>';

          var desc = document.createElement('div');
          desc.className = 'nfx-card-panel__descr';
          desc.textContent = d.overview || '';

          panel.appendChild(row);
          panel.appendChild(title);
          panel.appendChild(meta);
          panel.appendChild(desc);

          card.appendChild(panel);

          var playBtn = panel.querySelector('.nfx-card-panel__btn--play');
          if (playBtn) playBtn.addEventListener('click', function (e) { e.stopPropagation(); openAndPlay(d); });
          var otherBtns = panel.querySelectorAll('.nfx-card-panel__btn:not(.nfx-card-panel__btn--play)');
          for (var x = 0; x < otherBtns.length; x++) {
            (function (btn) {
              btn.addEventListener('click', function (e) { e.stopPropagation(); openItem(d); });
            })(otherBtns[x]);
          }
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

      try {
        Lampa.Lang.add({
          nfx_enabled: LANG_KEYS.nfx_enabled, nfx_hero: LANG_KEYS.nfx_hero,
          nfx_cardsize: LANG_KEYS.nfx_cardsize, nfx_rating: LANG_KEYS.nfx_rating,
          nfx_badge: LANG_KEYS.nfx_badge, nfx_panel: LANG_KEYS.nfx_panel,
          nfx_uilang: LANG_KEYS.nfx_uilang,
          nfx_on: LANG_KEYS.on, nfx_off: LANG_KEYS.off, nfx_yes: LANG_KEYS.yes, nfx_no: LANG_KEYS.no,
          nfx_sm: LANG_KEYS.sm, nfx_md: LANG_KEYS.md, nfx_lg: LANG_KEYS.lg,
          nfx_lang_ru: LANG_KEYS.ru, nfx_lang_uk: LANG_KEYS.uk, nfx_lang_en: LANG_KEYS.en
        });
      } catch (e) {}

      Lampa.SettingsApi.addComponent({
        component: 'netflix_style',
        icon: '<svg width="34" height="28" viewBox="0 0 36 28"><text x="18" y="20" text-anchor="middle" font-size="12" font-weight="900" fill="#e50914" font-style="italic" font-family="Arial">N</text></svg>',
        name: 'Netflix'
      });

      Lampa.SettingsApi.addParam({
        component: 'netflix_style',
        param: { name: KEYS.ENABLE_KEY, type: 'select', default: true, values: [{ id: 1, name: lt('on') }, { id: 0, name: lt('off') }] },
        field: { name: lt('nfx_enabled') }
      });
      Lampa.SettingsApi.addParam({
        component: 'netflix_style',
        param: { name: KEYS.HERO_KEY, type: 'select', default: true, values: [{ id: 1, name: lt('yes') }, { id: 0, name: lt('no') }] },
        field: { name: lt('nfx_hero') }
      });
      Lampa.SettingsApi.addParam({
        component: 'netflix_style',
        param: { name: KEYS.CARD_SIZE_KEY, type: 'select', default: 'md', values: [{ id: 'sm', name: lt('sm') }, { id: 'md', name: lt('md') }, { id: 'lg', name: lt('lg') }] },
        field: { name: lt('nfx_cardsize') }
      });
      Lampa.SettingsApi.addParam({
        component: 'netflix_style',
        param: { name: KEYS.RATING_KEY, type: 'select', default: true, values: [{ id: 1, name: lt('yes') }, { id: 0, name: lt('no') }] },
        field: { name: lt('nfx_rating') }
      });
      Lampa.SettingsApi.addParam({
        component: 'netflix_style',
        param: { name: KEYS.BADGE_KEY, type: 'select', default: true, values: [{ id: 1, name: lt('yes') }, { id: 0, name: lt('no') }] },
        field: { name: lt('nfx_badge') }
      });
      Lampa.SettingsApi.addParam({
        component: 'netflix_style',
        param: { name: KEYS.PANEL_KEY, type: 'select', default: true, values: [{ id: 1, name: lt('yes') }, { id: 0, name: lt('no') }] },
        field: { name: lt('nfx_panel') }
      });
      Lampa.SettingsApi.addParam({
        component: 'netflix_style',
        param: { name: KEYS.UI_LANG_KEY, type: 'select', default: 'en', values: [{ id: 'ru', name: lt('ru') }, { id: 'uk', name: lt('uk') }, { id: 'en', name: lt('en') }] },
        field: { name: lt('nfx_uilang') }
      });
    } catch (e) {}
  }

  function syncBodyAttrs() {
    try {
      document.body.classList.add(KEYS.BODY_CLASS);

      var size = getPref(KEYS.CARD_SIZE_KEY, 'md');
      if (size !== 'sm' && size !== 'md' && size !== 'lg') size = 'md';
      document.body.setAttribute(KEYS.CARD_SIZE_ATTR, size);

      document.body.setAttribute(KEYS.PANEL_ATTR, getBool(KEYS.PANEL_KEY, true) ? 'on' : 'off');

      var tv = isTv();
      var mob = isMobile() || matchesMedia('(max-width:767px)');
      if (tv) document.body.classList.add('nfx-tv'); else document.body.classList.remove('nfx-tv');
      if (mob && !tv) document.body.classList.add('nfx-mobile'); else document.body.classList.remove('nfx-mobile');
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
      injectBrand();
      bindScrollState();

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