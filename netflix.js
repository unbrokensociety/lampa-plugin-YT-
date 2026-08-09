(function () {
    'use strict';

    /* ============================================================
       NETFLIX STYLE FOR LAMPA — продакшн-версія
       Селектори взяті з реального DOM Lampa (перевірено на AppleTV плагіні)
       ============================================================ */

    var PK = '__NETFLIX_STYLE_V3__';
    if (window[PK]) return;
    window[PK] = true;

    var KEYS = {
        STYLE_ID: 'netflix-style-css',
        BODY_CLASS: 'nfx',
        ENABLE: 'netflix_style_enabled',
        HERO: 'netflix_style_hero',
        CARD_SIZE: 'netflix_style_card_size',
        RATING: 'netflix_style_rating',
        BADGE: 'netflix_style_badge',
        UI_LANG: 'netflix_style_ui_lang',
        PANEL: 'netflix_style_panel'
    };

    var IMG = 'https://image.tmdb.org/t/p/';

    var L10N = {
        ru: { movie: 'ФИЛЬМ', tv: 'СЕРИАЛ', play: 'Смотреть', more: 'Подробнее', match: 'совпадение' },
        uk: { movie: 'ФІЛЬМ', tv: 'СЕРІАЛ', play: 'Дивитись', more: 'Детальніше', match: 'збіг' },
        en: { movie: 'MOVIE', tv: 'SERIES', play: 'Watch now', more: 'More Info', match: 'Match' }
    };

    function uiLang() {
        try {
            var s = Lampa.Storage.field(KEYS.UI_LANG) || Lampa.Storage.field('language') || 'en';
            if (L10N[s]) return s;
            if (s.indexOf('ru') === 0) return 'ru';
            if (s.indexOf('uk') === 0 || s.indexOf('ua') === 0) return 'uk';
            return 'en';
        } catch (e) { return 'en'; }
    }

    function t(key) {
        var l = uiLang();
        return (L10N[l] || L10N.en)[key];
    }

    function getPref(name, dflt) {
        try {
            var v = Lampa.Storage.get(name, '');
            return (v === '' || v === null || v === undefined) ? dflt : v;
        } catch (e) { return dflt; }
    }

    function getBool(name, dflt) {
        var v = getPref(name, dflt ? '1' : '0');
        return v === '1' || v === 1 || v === true;
    }

    function isTv() {
        try { return Lampa.Platform && Lampa.Platform.screen && Lampa.Platform.screen('tv'); } catch (e) { return false; }
    }

    function isMobile() {
        try {
            if (Lampa.Platform && Lampa.Platform.isMobile) return Lampa.Platform.isMobile();
            if (Lampa.Platform && Lampa.Platform.isTouch) return Lampa.Platform.isTouch();
        } catch (e) {}
        return false;
    }

    /* ---------- дані картки ---------- */
    function cardData(card) {
        try { if (card.card_data) return card.card_data; } catch (e) {}
        try {
            if (window.$) {
                var d = $(card).data('card') || $(card).data('json');
                if (d) return d;
            }
        } catch (e) {}
        return null;
    }

    function typeOf(item) {
        if (!item) return 'movie';
        if (item.media_type) return item.media_type;
        if (item.type) return item.type;
        return item.title ? 'movie' : 'tv';
    }

    function imgUrl(item, size, backdrop) {
        var p = backdrop ? (item.backdrop_path || item.poster_path) : (item.poster_path || item.backdrop_path);
        if (!p && item._heroImg) return item._heroImg;
        return p ? IMG + size + p : '';
    }

    function yearOf(item) {
        var y = item.release_date || item.first_air_date || item.air_date || '';
        return y ? String(y).slice(0, 4) : '';
    }

    function ageOf(item) {
        var a = item.PG || item.pg || (item.adult ? 18 : 0);
        return a ? String(a).replace(/\D/g, '') + '+' : '';
    }

    function source() {
        try { return Lampa.Storage.field('source') || 'tmdb'; } catch (e) { return 'tmdb'; }
    }

    function openFull(item) {
        try {
            if (!item || !Lampa.Activity) return;
            Lampa.Activity.push({
                url: '', title: item.title || item.name || '', component: 'full',
                id: item.id, method: typeOf(item), source: source(), card: item
            });
        } catch (e) {}
    }

    function openAndPlay(item) {
        try {
            if (!item || !Lampa.Activity) return;
            Lampa.Activity.push({
                url: '', title: item.title || item.name || '', component: 'full',
                id: item.id, method: typeOf(item), source: source(), card: item
            });
            var tries = 0;
            var tmr = setInterval(function () {
                tries++;
                var btn = document.querySelector('.full-start .button--play, .full-start-new .button--play, .fullstart .button--play, .button--play:not(.hide)');
                if (btn) {
                    clearInterval(tmr);
                    try { if (window.$) { $(btn).trigger('hover:click'); return; } } catch (e2) {}
                    try { btn.click(); } catch (e2) {}
                } else if (tries > 10) clearInterval(tmr);
            }, 500);
        } catch (e) {}
    }

    /* ============================================================
       СТИЛІ — агресивний !important, селектори Lampa
       ============================================================ */
    function injectStyle() {
        try {
            var old = document.getElementById(KEYS.STYLE_ID);
            if (old) old.remove();
            var st = document.createElement('style');
            st.id = KEYS.STYLE_ID;
            var B = 'body.' + KEYS.BODY_CLASS;
            var r = [];

            /* ---------- ФОН ---------- */
            r.push(B + ', ' + B + ' .activity, ' + B + ' .fullstart, ' + B + ' .full-start, ' + B + ' .full-start-new { background: #141414 !important; }');

            /* ---------- ШАПКА ---------- */
            r.push(B + ' .head { background: linear-gradient(180deg, rgba(0,0,0,.95) 0%, rgba(0,0,0,.6) 55%, rgba(0,0,0,0) 100%) !important; border-bottom: 0 !important; box-shadow: none !important; backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }');
            r.push(B + ' .head__body { position: relative !important; z-index: 12 !important; }');
            r.push(B + ' .head__logo svg * { fill: #e50914 !important; stroke: #e50914 !important; }');
            r.push(B + ' .head__menu-icon, ' + B + ' .head__action, ' + B + ' .head .button--back { color: #fff !important; }');
            r.push(B + ' .head__action svg, ' + B + ' .head__menu-icon svg { fill: #fff !important; }');
            r.push(B + ' .nfx-logo { font-size: 1.9em; font-weight: 900; color: #e50914; margin-right: 1em; line-height: 1; letter-spacing: -0.02em; cursor: pointer; }');

            /* ---------- МЕНЮ ---------- */
            r.push(B + ' .menu { background: rgba(0,0,0,.97) !important; border-right: 1px solid rgba(255,255,255,.06) !important; }');
            r.push(B + ' .menu__list .menu__item .menu__text { color: #b3b3b3 !important; font-weight: 500 !important; transition: color .2s !important; }');
            r.push(B + ' .menu__list .menu__item.focus .menu__text, ' + B + ' .menu__list .menu__item.hover .menu__text { color: #fff !important; font-weight: 700 !important; }');
            r.push(B + ' .menu__list .menu__item.focus:before, ' + B + ' .menu__list .menu__item.hover:before { background: #e50914 !important; }');
            r.push(B + ' .menu__ico svg { fill: #b3b3b3 !important; }');
            r.push(B + ' .menu__list .menu__item.focus .menu__ico svg, ' + B + ' .menu__list .menu__item.hover .menu__ico svg { fill: #e50914 !important; }');

            /* ---------- ЗАГОЛОВКИ РЯДІВ ---------- */
            r.push(B + ' .items-line__title { font-size: 1.4em !important; font-weight: 700 !important; color: #fff !important; letter-spacing: .02em !important; margin-bottom: .6em !important; }');
            r.push(B + ' .scroll__title { color: #fff !important; font-weight: 700 !important; }');

            /* ---------- КАРТКИ ---------- */
            r.push(B + ' .card { border-radius: .3em !important; overflow: visible !important; transition: transform .25s ease, box-shadow .25s ease !important; transform-origin: center center !important; }');
            r.push(B + ' .card .card__view { border-radius: .3em !important; overflow: hidden !important; background: #181818 !important; }');
            r.push(B + ' .card .card__img, ' + B + ' .card .card__poster { border-radius: .3em !important; transition: transform .3s ease !important; }');
            r.push(B + ' .card.focus, ' + B + ' .card.hover, ' + B + ' .card.traverse { transform: scale(1.1) translateY(-.3em) !important; z-index: 30 !important; position: relative !important; box-shadow: 0 16px 40px rgba(0,0,0,.8) !important; }');
            r.push(B + ' .card.focus .card__view, ' + B + ' .card.hover .card__view { box-shadow: inset 0 0 0 1px rgba(255,255,255,.15), 0 10px 28px rgba(0,0,0,.6) !important; }');
            r.push(B + ' .card.focus .card__img, ' + B + ' .card.hover .card__img, ' + B + ' .card.focus .card__poster, ' + B + ' .card.hover .card__poster { transform: scale(1.04) !important; }');

            /* ---------- БЕЙДЖ ---------- */
            r.push(B + ' .nfx-badge { position: absolute !important; top: .45em !important; left: .45em !important; z-index: 8 !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; padding: .2em .65em !important; border-radius: .45em !important; font-size: .6em !important; font-weight: 800 !important; letter-spacing: .12em !important; color: #fff !important; background: rgba(0,0,0,.65) !important; border: 1px solid rgba(255,255,255,.22) !important; pointer-events: none !important; text-transform: uppercase !important; }');
            r.push(B + ' .nfx-badge--tv { background: rgba(229,9,20,.9) !important; border-color: transparent !important; }');

            /* ---------- РЕЙТИНГ ---------- */
            r.push(B + ' .nfx-rate { position: absolute !important; bottom: .45em !important; left: .5em !important; z-index: 8 !important; display: inline-flex !important; align-items: center !important; gap: .2em !important; font-size: .78em !important; font-weight: 800 !important; color: #fff !important; text-shadow: 0 1px 5px rgba(0,0,0,.95) !important; pointer-events: none !important; }');
            r.push(B + ' .nfx-rate svg { width: .85em !important; height: .85em !important; fill: #e50914 !important; }');

            /* ---------- ПАНЕЛЬ ПРИ ФОКУСІ (як Netflix) ---------- */
            r.push(B + ' .nfx-panel { position: absolute !important; left: 0 !important; right: 0 !important; bottom: 0 !important; z-index: 9 !important; box-sizing: border-box !important; padding: .8em .75em .75em !important; background: linear-gradient(0deg, rgba(20,20,20,.98) 0%, rgba(20,20,20,.9) 55%, rgba(20,20,20,0) 100%) !important; border-radius: 0 0 .3em .3em !important; opacity: 0 !important; visibility: hidden !important; transform: translateY(.4em) !important; transition: opacity .2s ease, transform .25s ease, visibility 0s linear .25s !important; pointer-events: none !important; }');
            r.push(B + ' .card.focus .nfx-panel, ' + B + ' .card.hover .nfx-panel, ' + B + ' .card.traverse .nfx-panel { opacity: 1 !important; visibility: visible !important; transform: translateY(0) !important; transition: opacity .2s ease .05s, transform .25s ease !important; pointer-events: auto !important; }');
            r.push(B + ' .nfx-panel__row { display: flex !important; align-items: center !important; justify-content: space-between !important; margin-bottom: .35em !important; }');
            r.push(B + ' .nfx-panel__actions { display: flex !important; align-items: center !important; gap: .3em !important; }');
            r.push(B + ' .nfx-panel__btn { width: 1.8em !important; height: 1.8em !important; border-radius: 50% !important; border: 1px solid rgba(255,255,255,.55) !important; background: transparent !important; color: #fff !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; cursor: pointer !important; padding: 0 !important; transition: background .15s, transform .1s !important; }');
            r.push(B + ' .nfx-panel__btn svg { width: .9em !important; height: .9em !important; fill: currentColor !important; }');
            r.push(B + ' .nfx-panel__btn--play { background: #fff !important; border-color: #fff !important; color: #000 !important; }');
            r.push(B + ' .nfx-panel__btn:hover { background: #fff !important; color: #000 !important; transform: scale(1.08) !important; }');
            r.push(B + ' .nfx-panel__match { font-size: .78em !important; font-weight: 800 !important; color: #46d369 !important; }');
            r.push(B + ' .nfx-panel__title { font-size: .98em !important; font-weight: 800 !important; color: #fff !important; line-height: 1.2 !important; margin-bottom: .3em !important; display: -webkit-box !important; -webkit-line-clamp: 2 !important; -webkit-box-orient: vertical !important; overflow: hidden !important; }');
            r.push(B + ' .nfx-panel__meta { display: flex !important; align-items: center !important; flex-wrap: wrap !important; gap: .35em !important; font-size: .7em !important; font-weight: 600 !important; color: rgba(255,255,255,.85) !important; margin-bottom: .3em !important; }');
            r.push(B + ' .nfx-panel__year { color: #fff !important; font-weight: 700 !important; }');
            r.push(B + ' .nfx-panel__age { border: 1px solid rgba(255,255,255,.35) !important; border-radius: .2em !important; padding: 0 .4em !important; line-height: 1.4 !important; }');
            r.push(B + ' .nfx-panel__hd { border: 1px solid rgba(255,255,255,.35) !important; border-radius: .15em !important; padding: 0 .3em !important; font-size: .92em !important; font-weight: 700 !important; line-height: 1.35 !important; }');
            r.push(B + ' .nfx-panel__desc { font-size: .7em !important; line-height: 1.35 !important; color: rgba(255,255,255,.65) !important; display: -webkit-box !important; -webkit-line-clamp: 2 !important; -webkit-box-orient: vertical !important; overflow: hidden !important; }');

            /* ---------- HERO / BILLBOARD ---------- */
            r.push(B + ' .nfx-hero { position: relative !important; width: 100% !important; min-height: 30em !important; margin: 0 0 1.5em !important; overflow: hidden !important; background: #000 !important; }');
            r.push(B + ' .nfx-hero__bg { position: absolute !important; inset: 0 !important; width: 100% !important; height: 100% !important; object-fit: cover !important; object-position: center 20% !important; opacity: 0 !important; transition: opacity .5s ease !important; }');
            r.push(B + ' .nfx-hero__bg--on { opacity: 1 !important; }');
            r.push(B + ' .nfx-hero__shade { position: absolute !important; inset: 0 !important; background: linear-gradient(90deg, rgba(0,0,0,.92) 0%, rgba(0,0,0,.55) 32%, rgba(0,0,0,.05) 70%), linear-gradient(0deg, #141414 0%, rgba(20,20,20,.9) 12%, rgba(0,0,0,.3) 45%, transparent 75%) !important; }');
            r.push(B + ' .nfx-hero__content { position: absolute !important; left: 0 !important; bottom: 0 !important; z-index: 5 !important; box-sizing: border-box !important; width: 52% !important; max-width: 52% !important; padding: 0 3em 2.6em !important; display: flex !important; flex-direction: column !important; align-items: flex-start !important; }');
            r.push(B + ' .nfx-hero__title { font-size: 2.8em !important; font-weight: 900 !important; line-height: 1.02 !important; color: #fff !important; margin: 0 0 .15em !important; text-shadow: 0 4px 24px rgba(0,0,0,.8) !important; }');
            r.push(B + ' .nfx-hero__meta { display: flex !important; align-items: center !important; gap: .7em !important; flex-wrap: wrap !important; font-size: .95em !important; font-weight: 600 !important; color: #fff !important; text-shadow: 0 1px 6px rgba(0,0,0,.8) !important; margin-bottom: .35em !important; }');
            r.push(B + ' .nfx-hero__match { color: #46d369 !important; font-weight: 800 !important; }');
            r.push(B + ' .nfx-hero__year { opacity: .95 !important; }');
            r.push(B + ' .nfx-hero__age { border: 1px solid rgba(255,255,255,.4) !important; border-radius: .25em !important; padding: 0 .45em !important; font-size: .8em !important; line-height: 1.45 !important; }');
            r.push(B + ' .nfx-hero__hd { border: 1px solid rgba(255,255,255,.4) !important; border-radius: .15em !important; padding: 0 .3em !important; font-size: .72em !important; font-weight: 700 !important; line-height: 1.35 !important; }');
            r.push(B + ' .nfx-hero__desc { font-size: .95em !important; line-height: 1.45 !important; color: rgba(255,255,255,.92) !important; margin: .2em 0 1em !important; max-width: 46ch !important; text-shadow: 0 1px 8px rgba(0,0,0,.85) !important; display: -webkit-box !important; -webkit-line-clamp: 2 !important; -webkit-box-orient: vertical !important; overflow: hidden !important; }');
            r.push(B + ' .nfx-hero__buttons { display: flex !important; align-items: center !important; gap: .8em !important; flex-wrap: wrap !important; }');
            r.push(B + ' .nfx-hero__btn { display: inline-flex !important; align-items: center !important; gap: .5em !important; height: 2.6em !important; padding: 0 1.6em !important; border-radius: 2em !important; border: 0 !important; font-size: 1em !important; font-weight: 700 !important; cursor: pointer !important; transition: background .18s, transform .12s !important; outline: 0 !important; white-space: nowrap !important; }');
            r.push(B + ' .nfx-hero__btn svg { width: 1.1em !important; height: 1.1em !important; fill: currentColor !important; }');
            r.push(B + ' .nfx-hero__btn--play { background: #fff !important; color: #000 !important; }');
            r.push(B + ' .nfx-hero__btn--play.focus, ' + B + ' .nfx-hero__btn--play.hover { background: rgba(255,255,255,.82) !important; transform: scale(1.05) !important; }');
            r.push(B + ' .nfx-hero__btn--more { background: rgba(109,109,110,.55) !important; color: #fff !important; }');
            r.push(B + ' .nfx-hero__btn--more.focus, ' + B + ' .nfx-hero__btn--more.hover { background: rgba(90,90,94,.7) !important; transform: scale(1.05) !important; }');
            r.push(B + ' .nfx-hero__dots { position: absolute !important; right: 2.2em !important; bottom: 2em !important; z-index: 6 !important; display: flex !important; align-items: center !important; gap: .35em !important; }');
            r.push(B + ' .nfx-hero__dot { width: 10px !important; height: 3px !important; border: 0 !important; padding: 0 !important; border-radius: 2px !important; background: rgba(255,255,255,.45) !important; cursor: pointer !important; transition: background .2s, width .2s !important; }');
            r.push(B + ' .nfx-hero__dot--on { width: 22px !important; background: #e50914 !important; }');

            /* ---------- ПЛЕЄР ---------- */
            r.push(B + ' .player .player-panel__position > div { background: #e50914 !important; }');
            r.push(B + ' .player .player-panel__quality { background: rgba(229,9,20,.9) !important; color: #fff !important; border-radius: 3px !important; }');
            r.push(B + ' .player .player-panel__box-buttons { background: rgba(255,255,255,.08) !important; }');

            /* ---------- СКРОЛ ---------- */
            r.push(B + ' ::-webkit-scrollbar { width: 8px !important; height: 9px !important; }');
            r.push(B + ' ::-webkit-scrollbar-track { background: #0d0d0d !important; }');
            r.push(B + ' ::-webkit-scrollbar-thumb { background: #333 !important; border-radius: 4px !important; }');

            /* ---------- РОЗМІРИ КАРТОК ---------- */
            r.push(B + '[' + KEYS.CARD_SIZE + '="sm"] .items-line .card { width: 12.5em !important; }');
            r.push(B + '[' + KEYS.CARD_SIZE + '="md"] .items-line .card { width: 15.5em !important; }');
            r.push(B + '[' + KEYS.CARD_SIZE + '="lg"] .items-line .card { width: 18.5em !important; }');

            /* ---------- ТВ ---------- */
            if (isTv()) {
                r.push(B + '.nfx-tv .head { min-height: 4.6em !important; }');
                r.push(B + '.nfx-tv .nfx-hero { min-height: 42em !important; }');
                r.push(B + '.nfx-tv .nfx-hero__title { font-size: 3.8em !important; }');
                r.push(B + '.nfx-tv .nfx-hero__content { padding-bottom: 3.4em !important; }');
                r.push(B + '.nfx-tv .card.focus, ' + B + '.nfx-tv .card.hover { transform: scale(1.16) translateY(-.4em) !important; }');
                r.push(B + '.nfx-tv[' + KEYS.CARD_SIZE + '="sm"] .items-line .card { width: 15em !important; }');
                r.push(B + '.nfx-tv[' + KEYS.CARD_SIZE + '="md"] .items-line .card { width: 18em !important; }');
                r.push(B + '.nfx-tv[' + KEYS.CARD_SIZE + '="lg"] .items-line .card { width: 21em !important; }');
                r.push(B + '.nfx-tv .nfx-panel__btn { width: 2.3em !important; height: 2.3em !important; }');
                r.push(B + '.nfx-tv .nfx-panel__btn svg { width: 1.15em !important; height: 1.15em !important; }');
                r.push(B + '.nfx-tv .nfx-panel__title { font-size: 1.15em !important; }');
                r.push(B + '.nfx-tv .items-line__title { font-size: 1.6em !important; }');
            }

            /* ---------- ТЕЛЕФОН ---------- */
            if (isMobile()) {
                r.push(B + '.nfx-mobile .head { min-height: 3.2em !important; }');
                r.push(B + '.nfx-mobile .nfx-logo { font-size: 1.5em !important; }');
                r.push(B + '.nfx-mobile .nfx-hero { min-height: 22em !important; }');
                r.push(B + '.nfx-mobile .nfx-hero__content { width: 100% !important; max-width: 100% !important; padding: 0 1em 1.3em !important; }');
                r.push(B + '.nfx-mobile .nfx-hero__title { font-size: 1.6em !important; }');
                r.push(B + '.nfx-mobile .nfx-hero__desc { font-size: .85em !important; }');
                r.push(B + '.nfx-mobile .nfx-hero__btn { height: 2.2em !important; padding: 0 1.1em !important; font-size: .92em !important; }');
                r.push(B + '.nfx-mobile .nfx-hero__dots { right: 1em !important; bottom: 1.1em !important; }');
                r.push(B + '.nfx-mobile .items-line__title { font-size: 1.1em !important; }');
                r.push(B + '.nfx-mobile .card.focus, ' + B + '.nfx-mobile .card.hover { transform: scale(1.03) !important; box-shadow: none !important; }');
                r.push(B + '.nfx-mobile .nfx-panel { display: none !important; }');
                r.push(B + '.nfx-mobile[' + KEYS.CARD_SIZE + '="sm"] .items-line .card { width: 9em !important; }');
                r.push(B + '.nfx-mobile[' + KEYS.CARD_SIZE + '="md"] .items-line .card { width: 11em !important; }');
                r.push(B + '.nfx-mobile[' + KEYS.CARD_SIZE + '="lg"] .items-line .card { width: 13em !important; }');
            }

            st.textContent = r.join('\n');
            (document.head || document.body || document.documentElement).appendChild(st);
        } catch (e) {}
    }

    /* ---------- ЛОГО N ---------- */
    function injectLogo() {
        try {
            if (document.querySelector('.nfx-logo')) return;
            var headBody = document.querySelector('.head__body') || document.querySelector('.head');
            if (!headBody) return;
            var logo = document.createElement('div');
            logo.className = 'nfx-logo';
            logo.textContent = 'N';
            logo.addEventListener('click', function () {
                try { if (Lampa.Activity && Lampa.Activity.backward) Lampa.Activity.backward(); } catch (e) {}
            });
            headBody.insertBefore(logo, headBody.firstChild);
        } catch (e) {}
    }

    /* ---------- HERO ---------- */
    var heroTimer = null;
    var heroIndex = 0;
    var heroItems = [];

    function buildHero() {
        try {
            if (!getBool(KEYS.HERO, true)) return;
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
                var d = cardData(cards[i]);
                if (!d || !d.id) continue;
                if (d.backdrop_path || d.poster_path) {
                    heroItems.push(d);
                } else {
                    var img = cards[i].querySelector('.card__img, .card__image');
                    var src = (img && img.tagName === 'IMG' && (img.src || img.getAttribute('src') || '')) || '';
                    if (src.indexOf('tmdb') !== -1) { d._heroImg = src; heroItems.push(d); }
                }
            }
            if (!heroItems.length) return;

            var hero = document.createElement('div');
            hero.className = 'nfx-hero';

            var bg = document.createElement('img');
            bg.className = 'nfx-hero__bg';
            bg.alt = '';
            bg.addEventListener('error', function () { bg.classList.remove('nfx-hero__bg--on'); });

            var shade = document.createElement('div');
            shade.className = 'nfx-hero__shade';

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
            playBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg><span></span>';

            var moreBtn = document.createElement('button');
            moreBtn.className = 'nfx-hero__btn nfx-hero__btn--more selector';
            moreBtn.setAttribute('tabindex', '0');
            moreBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.7"/><path d="M12 8h.01M12 11v5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg><span></span>';

            playBtn.querySelector('span').textContent = t('play');
            moreBtn.querySelector('span').textContent = t('more');

            buttons.appendChild(playBtn);
            buttons.appendChild(moreBtn);

            content.appendChild(title);
            content.appendChild(meta);
            content.appendChild(desc);
            content.appendChild(buttons);

            var dots = document.createElement('div');
            dots.className = 'nfx-hero__dots';

            hero.appendChild(bg);
            hero.appendChild(shade);
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
                var v = Math.round(parseFloat(item.vote_average || 0) * 10);
                matchEl.textContent = v + '% ' + t('match');
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
            moreBtn.addEventListener('click', function (e) { e.stopPropagation(); openFull(heroItems[heroIndex]); });
            bg.addEventListener('click', function () { openFull(heroItems[heroIndex]); });

            render(0);
            resetTimer();
        } catch (e) {}
    }

    /* ---------- КАРТКИ ---------- */
    function decorateAll(scope) {
        if (!scope || scope.nodeType !== 1) return;
        var q = scope.querySelectorAll ? scope.querySelectorAll('.card') : [];
        for (var i = 0; i < q.length; i++) decorateCard(q[i]);
    }

    function decorateCard(card) {
        try {
            if (card.__nfx) return;
            var d = cardData(card);
            if (!d || !d.id) return;
            var view = card.querySelector('.card__view, .card__poster, .full--poster');
            if (!view) return;
            card.__nfx = true;

            /* Бейдж */
            if (getBool(KEYS.BADGE, true)) {
                if (!view.querySelector('.nfx-badge')) {
                    var b = document.createElement('span');
                    b.className = 'nfx-badge' + (typeOf(d) === 'tv' ? ' nfx-badge--tv' : '');
                    b.textContent = typeOf(d) === 'tv' ? t('tv') : t('movie');
                    view.appendChild(b);
                }
            }

            /* Рейтинг */
            if (getBool(KEYS.RATING, true) && d.vote_average) {
                if (!view.querySelector('.nfx-rate')) {
                    var st = document.createElement('span');
                    st.className = 'nfx-rate';
                    st.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 2l2.9 6.3 6.9.8-5.1 4.8 1.4 6.8L12 17.6 5.9 20.7l1.4-6.8L2.2 9.1l6.9-.8z"/></svg>' + Math.round(parseFloat(d.vote_average) * 10) + '%';
                    view.appendChild(st);
                }
            }

            /* Панель */
            if (getBool(KEYS.PANEL, true)) {
                if (!card.querySelector('.nfx-panel')) {
                    var panel = document.createElement('div');
                    panel.className = 'nfx-panel';

                    var v = Math.round(parseFloat(d.vote_average || 0) * 10);
                    var y = yearOf(d);
                    var pg = ageOf(d);

                    var row = document.createElement('div');
                    row.className = 'nfx-panel__row';

                    var actions = document.createElement('div');
                    actions.className = 'nfx-panel__actions';
                    actions.innerHTML =
                        '<button class="nfx-panel__btn nfx-panel__btn--play selector"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></button>' +
                        '<button class="nfx-panel__btn selector"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></button>' +
                        '<button class="nfx-panel__btn selector"><svg viewBox="0 0 24 24"><path d="M12 21s-7-4.6-9.5-9C.8 8.6 2.5 5 6 5c2 0 3.2 1 4 2.2C10.8 6 12 5 14 5c3.5 0 5.2 3.6 3.5 7-2.5 4.4-9.5 9-9.5 9z"/></svg></button>';
                    row.appendChild(actions);

                    var match = document.createElement('span');
                    match.className = 'nfx-panel__match';
                    match.textContent = (v || '') + '% ' + t('match');
                    row.appendChild(match);

                    var title = document.createElement('div');
                    title.className = 'nfx-panel__title';
                    title.textContent = d.title || d.name || '';

                    var meta = document.createElement('div');
                    meta.className = 'nfx-panel__meta';
                    meta.innerHTML = (y ? '<span class="nfx-panel__year">' + y + '</span>' : '') +
                        (pg ? '<span class="nfx-panel__age">' + pg + '</span>' : '') +
                        '<span class="nfx-panel__hd">HD</span>';

                    var desc = document.createElement('div');
                    desc.className = 'nfx-panel__desc';
                    desc.textContent = d.overview || '';

                    panel.appendChild(row);
                    panel.appendChild(title);
                    panel.appendChild(meta);
                    panel.appendChild(desc);

                    card.appendChild(panel);

                    var playBtn = panel.querySelector('.nfx-panel__btn--play');
                    if (playBtn) playBtn.addEventListener('click', function (e) { e.stopPropagation(); openAndPlay(d); });
                    var otherBtns = panel.querySelectorAll('.nfx-panel__btn:not(.nfx-panel__btn--play)');
                    for (var x = 0; x < otherBtns.length; x++) {
                        (function (btn) {
                            btn.addEventListener('click', function (e) { e.stopPropagation(); openFull(d); });
                        })(otherBtns[x]);
                    }
                }
            }
        } catch (e) {}
    }

    /* ---------- СПОСТЕРІГАЧ ---------- */
    var cardObserver = null;
    function observeCards() {
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
                            else if (n.querySelectorAll) decorateAll(n);
                        }
                    }
                    if (!document.querySelector('.nfx-hero')) setTimeout(buildHero, 250);
                } catch (e) {}
            });
            cardObserver.observe(document.body, { childList: true, subtree: true });
        } catch (e) {}
    }

    /* ---------- НАЛАШТУВАННЯ ---------- */
    var settingsInited = false;
    function registerSettings() {
        try {
            if (settingsInited || !Lampa.SettingsApi) return;
            settingsInited = true;

            Lampa.SettingsApi.addComponent({
                component: 'netflix_style',
                icon: '<svg width="34" height="28" viewBox="0 0 36 28"><text x="18" y="20" text-anchor="middle" font-size="12" font-weight="900" fill="#e50914" font-style="italic">N</text></svg>',
                name: 'Netflix'
            });

            Lampa.SettingsApi.addParam({
                component: 'netflix_style',
                param: { name: KEYS.ENABLE, type: 'select', default: true, values: [{ id: 1, name: 'Вкл' }, { id: 0, name: 'Выкл' }] },
                field: { name: 'Тема Netflix' }
            });
            Lampa.SettingsApi.addParam({
                component: 'netflix_style',
                param: { name: KEYS.HERO, type: 'select', default: true, values: [{ id: 1, name: 'Да' }, { id: 0, name: 'Нет' }] },
                field: { name: 'Большой баннер' }
            });
            Lampa.SettingsApi.addParam({
                component: 'netflix_style',
                param: { name: KEYS.CARD_SIZE, type: 'select', default: 'md', values: [{ id: 'sm', name: 'Малый' }, { id: 'md', name: 'Средний' }, { id: 'lg', name: 'Большой' }] },
                field: { name: 'Размер карточек' }
            });
            Lampa.SettingsApi.addParam({
                component: 'netflix_style',
                param: { name: KEYS.RATING, type: 'select', default: true, values: [{ id: 1, name: 'Да' }, { id: 0, name: 'Нет' }] },
                field: { name: 'Рейтинг' }
            });
            Lampa.SettingsApi.addParam({
                component: 'netflix_style',
                param: { name: KEYS.BADGE, type: 'select', default: true, values: [{ id: 1, name: 'Да' }, { id: 0, name: 'Нет' }] },
                field: { name: 'Метка ФИЛЬМ/СЕРИАЛ' }
            });
            Lampa.SettingsApi.addParam({
                component: 'netflix_style',
                param: { name: KEYS.PANEL, type: 'select', default: true, values: [{ id: 1, name: 'Да' }, { id: 0, name: 'Нет' }] },
                field: { name: 'Панель при фокусе' }
            });
            Lampa.SettingsApi.addParam({
                component: 'netflix_style',
                param: { name: KEYS.UI_LANG, type: 'select', default: 'en', values: [{ id: 'ru', name: 'Рус' }, { id: 'uk', name: 'Укр' }, { id: 'en', name: 'Eng' }] },
                field: { name: 'Язык' }
            });
        } catch (e) {}
    }

    function syncBody() {
        try {
            document.body.classList.add(KEYS.BODY_CLASS);
            var size = getPref(KEYS.CARD_SIZE, 'md');
            if (['sm', 'md', 'lg'].indexOf(size) === -1) size = 'md';
            document.body.setAttribute(KEYS.CARD_SIZE, size);

            if (isTv()) document.body.classList.add('nfx-tv');
            if (isMobile()) document.body.classList.add('nfx-mobile');
        } catch (e) {}
    }

    /* ---------- СТАРТ ---------- */
    function boot() {
        try {
            if (!window.Lampa) return;
            registerSettings();
            if (!getBool(KEYS.ENABLE, true)) return;

            syncBody();
            injectStyle();
            injectLogo();

            decorateAll(document.body);
            setTimeout(function () { decorateAll(document.body); }, 300);
            setTimeout(function () { decorateAll(document.body); }, 900);

            observeCards();
            buildHero();
            setTimeout(buildHero, 600);
            setTimeout(buildHero, 1500);

            var tries = 0;
            var poll = setInterval(function () {
                tries++;
                if (document.querySelector('.nfx-hero') || tries > 30) { clearInterval(poll); return; }
                buildHero();
            }, 1000);

            if (Lampa.Listener) {
                Lampa.Listener.follow('activity', function () {
                    setTimeout(buildHero, 200);
                    setTimeout(function () { decorateAll(document.body); }, 120);
                });
            }
            if (Lampa.Activity && Lampa.Activity.listener) {
                Lampa.Activity.listener.follow('activity', function () { setTimeout(buildHero, 200); });
            }
        } catch (e) {}
    }

    function init() {
        try {
            if (window.appready) { boot(); return; }
            if (Lampa.Listener) {
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