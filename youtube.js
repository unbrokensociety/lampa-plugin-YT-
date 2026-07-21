/*
 * ============================================================
 * YouTube Style Player UI — Lampa Plugin (v3.0 Safe)
 * ------------------------------------------------------------
 * Версия 3.0: Полностью отказались от перемещения DOM-элементов.
 * Вся группировка и визуал делаются через CSS, чтобы не ломать
 * внутренние скрипты Lampa. JS используется только для текста.
 * ============================================================
 */
(function () {
    'use strict';

    if (window.__youtube_style_player_inited) return;
    window.__youtube_style_player_inited = true;

    var Platform = {
        isTV: function () {
            try { return Lampa.Platform.screen('tv'); } catch (e) { return false; }
        },
        isMobile: function () {
            try { return Lampa.Platform.screen('mobile'); } catch (e) {
                return /Mobi|Android|iPhone|iPod/i.test(navigator.userAgent || '');
            }
        },
        isTablet: function () {
            try { return Lampa.Platform.screen('tablet'); } catch (e) {
                return /iPad|Tablet/i.test(navigator.userAgent || '');
            }
        },
        isDesktop: function () {
            return !this.isTV() && !this.isMobile() && !this.isTablet();
        },
        isPortrait: function () {
            return window.innerHeight > window.innerWidth;
        },
        name: function () {
            if (this.isTV()) return 'tv';
            if (this.isTablet()) return 'tablet';
            if (this.isMobile()) return 'mobile';
            return 'desktop';
        }
    };

    var CSS = '';
    
    /* Базовые стили (без перемещения DOM) */
    CSS += [
        '.yt-style-root{',
        '  --yt-bg:#0f0f0f; --yt-bg-2:rgba(255,255,255,.1); --yt-bg-3:rgba(255,255,255,.2);',
        '  --yt-text:#fff; --yt-text-2:#aaa; --yt-accent:#ff0000;',
        '  --yt-radius:12px;',
        '  font-family:"Roboto","Segoe UI",system-ui,-apple-system,sans-serif;',
        '}',
        '.yt-style-root .player-video__display{background:#000!important}',
        '.yt-style-root .player-panel,.yt-style-root .player-info{background:var(--yt-bg)!important}',
        
        /* Раскладка плеера как в YouTube */
        '.yt-style-root .player-panel__center{display:flex!important;justify-content:space-between!important;align-items:center!important;flex-wrap:wrap!important;gap:10px;padding:10px 24px 16px!important;}',
        '.yt-style-root .player-panel__line-one{width:100%!important;margin-bottom:8px!important;order:-1!important;}',
        '.yt-style-root .player-panel__left{display:flex;flex-direction:column;justify-content:center;flex:1;min-width:0;}',
        '.yt-style-root .player-panel__right{display:flex;align-items:center;gap:4px;flex-wrap:wrap;justify-content:flex-end;}',
        
        /* Таймлайн */
        '.yt-style-root .player-panel__line{background:var(--yt-bg-2)!important;height:4px!important;border-radius:2px!important;}',
        '.yt-style-root .player-panel__line .time-line__load{background:var(--yt-bg-3)!important;}',
        '.yt-style-root .player-panel__line .time-line__line{background:var(--yt-accent)!important;}',
        '.yt-style-root .player-panel__line .time-line__body{background:var(--yt-accent)!important;box-shadow:0 0 0 4px rgba(255,0,0,.25)!important;}',
        
        /* Кнопки */
        '.yt-style-root .player-panel .button{background:transparent!important;color:var(--yt-text)!important;border-radius:50%!important;transition:background .15s,color .15s,transform .1s!important;}',
        '.yt-style-root .player-panel .button:hover{background:var(--yt-bg-2)!important;}',
        '.yt-style-root .player-panel .button:active{transform:scale(.94)}',
        '.yt-style-root .player-panel .player-panel__playpause{background:var(--yt-text)!important;color:#000!important;}',
        '.yt-style-root .player-panel .player-panel__playpause:hover{background:#fff!important;}',
        
        /* Группировка (эффект плашек) через CSS без изменения DOM */
        '.yt-style-root .player-panel__quality,',
        '.yt-style-root .player-panel__flow,',
        '.yt-style-root .player-panel__tracks,',
        '.yt-style-root .player-panel__subs{background:var(--yt-bg-2);border-radius:var(--yt-radius)!important;padding:0 8px;margin:0 2px;}',
        '.yt-style-root .player-panel__quality .selectbox__value,',
        '.yt-style-root .player-panel__flow .selectbox__value,',
        '.yt-style-root .player-panel__tracks .selectbox__value,',
        '.yt-style-root .player-panel__subs .selectbox__value{color:var(--yt-text)!important;background:transparent!important;height:40px;display:flex;align-items:center;}',
        
        /* Текст (Название и доп. инфа) */
        '.yt-style-root .yt-title{font-size:1.15em;font-weight:600;color:var(--yt-text);line-height:1.3;margin:0 0 2px;padding:0;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
        '.yt-style-root .yt-value{font-size:.85em;color:var(--yt-text-2);margin:0;padding:0;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
        '.yt-style-root .yt-title.hide,.yt-style-root .yt-value.hide{display:none!important}',
        ''
    ].join('\n');

    /* TV (10-foot UI) */
    CSS += [
        'body.yt-platform-tv .yt-style-root{--yt-radius:16px}',
        'body.yt-platform-tv .yt-style-root .player-panel__center{padding:18px 48px 28px!important;gap:12px}',
        'body.yt-platform-tv .yt-style-root .player-panel__line .time-line__body{height:16px!important;width:16px!important;}',
        'body.yt-platform-tv .yt-style-root .player-panel__line{height:6px!important;}',
        'body.yt-platform-tv .yt-style-root .yt-title{font-size:1.6em;}',
        'body.yt-platform-tv .yt-style-root .yt-value{font-size:1.05em;}',
        'body.yt-platform-tv .yt-style-root .player-panel .button{width:64px!important;height:64px!important;font-size:1.4em!important;}',
        'body.yt-platform-tv .yt-style-root .player-panel .player-panel__playpause{width:72px!important;height:72px!important;}',
        'body.yt-platform-tv .yt-style-root .player-panel__quality,',
        'body.yt-platform-tv .yt-style-root .player-panel__flow,',
        'body.yt-platform-tv .yt-style-root .player-panel__tracks,',
        'body.yt-platform-tv .yt-style-root .player-panel__subs{padding:0 14px;margin:0 4px;}',
        'body.yt-platform-tv .yt-style-root .player-panel__quality .selectbox__value,',
        'body.yt-platform-tv .yt-style-root .player-panel__flow .selectbox__value{height:64px;}',
        'body.yt-platform-tv .yt-style-root .player-panel .button.focus,',
        'body.yt-platform-tv .yt-style-root .player-panel .button.focused{background:var(--yt-bg-3)!important;outline:2px solid var(--yt-accent)!important;outline-offset:2px}',
        ''
    ].join('\n');

    /* Desktop (ПК/ноутбук) */
    CSS += [
        'body.yt-platform-desktop .yt-style-root{--yt-radius:10px}',
        'body.yt-platform-desktop .yt-style-root .player-panel__center{padding:10px 24px 16px!important;gap:8px}',
        'body.yt-platform-desktop .yt-style-root .player-panel__line:hover .time-line__body{height:12px!important;width:12px!important;}',
        'body.yt-platform-desktop .yt-style-root .player-panel__line:hover{height:6px!important;}',
        'body.yt-platform-desktop .yt-style-root .yt-title{font-size:1.1em}',
        'body.yt-platform-desktop .yt-style-root .yt-value{font-size:.8em}',
        'body.yt-platform-desktop .yt-style-root .player-panel .button{width:40px!important;height:40px!important;font-size:1.05em!important;}',
        'body.yt-platform-desktop .yt-style-root .player-panel .player-panel__playpause{width:46px!important;height:46px!important;}',
        'body.yt-platform-desktop .yt-style-root .player-panel__quality .selectbox__value,',
        'body.yt-platform-desktop .yt-style-root .player-panel__flow .selectbox__value{height:40px;}',
        ''
    ].join('\n');

    /* Mobile / Tablet (ландшафт) */
    CSS += [
        'body.yt-platform-mobile .yt-style-root,',
        'body.yt-platform-tablet .yt-style-root{--yt-radius:18px}',
        'body.yt-platform-mobile .yt-style-root .player-panel__center,',
        'body.yt-platform-tablet .yt-style-root .player-panel__center{padding:8px 12px 18px!important;gap:6px}',
        'body.yt-platform-mobile .yt-style-root .yt-title{font-size:1em;}',
        'body.yt-platform-mobile .yt-style-root .yt-value{font-size:.75em;}',
        'body.yt-platform-tablet .yt-style-root .yt-title{font-size:1.15em;}',
        'body.yt-platform-mobile .yt-style-root .player-panel .button,',
        'body.yt-platform-tablet .yt-style-root .player-panel .button{width:44px!important;height:44px!important;font-size:1.15em!important;}',
        'body.yt-platform-mobile .yt-style-root .player-panel .player-panel__playpause,',
        'body.yt-platform-tablet .yt-style-root .player-panel .player-panel__playpause{width:50px!important;height:50px!important;}',
        'body.yt-platform-mobile .yt-style-root .player-panel__quality .selectbox__value,',
        'body.yt-platform-tablet .yt-style-root .player-panel__quality .selectbox__value{height:44px;}',
        ''
    ].join('\n');

    /* Mobile PORTRAIT */
    CSS += [
        'body.yt-platform-mobile.yt-portrait .yt-style-root .player-panel__center{flex-direction:column;align-items:stretch;gap:8px}',
        'body.yt-platform-mobile.yt-portrait .yt-style-root .player-panel__left,',
        'body.yt-platform-mobile.yt-portrait .yt-style-root .player-panel__right{width:100%;justify-content:center;align-items:center;}',
        'body.yt-platform-mobile.yt-portrait .yt-style-root .yt-title{text-align:center;}',
        'body.yt-platform-mobile.yt-portrait .yt-style-root .yt-value{text-align:center;}',
        ''
    ].join('\n');

    /* Tablet PORTRAIT */
    CSS += [
        'body.yt-platform-tablet.yt-portrait .yt-style-root .player-panel__center{flex-direction:column;align-items:stretch;gap:10px}',
        'body.yt-platform-tablet.yt-portrait .yt-style-root .player-panel__left,',
        'body.yt-platform-tablet.yt-portrait .yt-style-root .player-panel__right{width:100%;justify-content:center;align-items:center;}',
        'body.yt-platform-tablet.yt-portrait .yt-style-root .yt-title{text-align:center;font-size:1.3em;}',
        'body.yt-platform-tablet.yt-portrait .yt-style-root .yt-value{text-align:center;}',
        ''
    ].join('\n');

    function injectCSS() {
        if (document.getElementById('yt-style-player-css')) return;
        var s = document.createElement('style');
        s.id = 'yt-style-player-css';
        s.textContent = CSS;
        document.head.appendChild(s);
    }

    function applyPlatformClass() {
        var b = document.body;
        ['yt-platform-tv', 'yt-platform-desktop', 'yt-platform-mobile', 'yt-platform-tablet'].forEach(function (c) {
            b.classList.remove(c);
        });
        b.classList.add('yt-platform-' + Platform.name());
        updateOrientation();
    }

    function updateOrientation() {
        var b = document.body;
        b.classList.toggle('yt-portrait', Platform.isPortrait());
        b.classList.toggle('yt-landscape', !Platform.isPortrait());
    }

    /* Безопасная работа с DOM. Добавляем только текстовые блоки */
    function setupPlayerEvents() {
        try {
            // Событие start срабатывает каждый раз при открытии нового видео
            Lampa.Player.listener.follow('start', function (data) {
                var render = Lampa.Player.render();
                if (!render || !render.length) return;

                // Добавляем класс стилизации
                render.addClass('yt-style-root');

                // Ищем левую панель. Если её нет — выходим.
                var leftPanel = render.find('.player-panel__left');
                if (!leftPanel.length) return;

                // Удаляем старые заголовки, если они остались от предыдущего видео
                render.find('.yt-title, .yt-value').remove();

                // Формируем тексты
                var name = data.title || '';
                var head = '';
                
                if (!data.iptv) {
                    if (data.card) head = data.card.title || data.card.name || '';
                    else {
                        var active = Lampa.Activity.active();
                        if (active && active.movie) {
                            head = active.movie.title || active.movie.name || '';
                        }
                    }
                }
                if (!head) head = name;

                // Создаем элементы
                var titleEl = $('<div class="yt-title"></div>').text(head);
                var valueEl = $('<div class="yt-value"></div>').text(name);

                // Вставляем их в начало левой панели
                leftPanel.prepend(valueEl);
                leftPanel.prepend(titleEl);

                // Скрываем родное название Lampa, чтобы не дублировалось
                var playerName = render.find('.player-info__name');
                if (playerName.length) {
                    playerName.addClass('hide');
                }
                
                // Логика скрытия
                if (!!data.iptv) titleEl.addClass('hide');
                if (name === head || !name) valueEl.addClass('hide');
            });
        } catch (e) {
            console.error('YT Style Player Error:', e);
        }
    }

    function startPlugin() {
        injectCSS();
        applyPlatformClass();

        var rt;
        window.addEventListener('resize', function () {
            clearTimeout(rt);
            rt = setTimeout(updateOrientation, 150);
        });
        window.addEventListener('orientationchange', function () {
            setTimeout(updateOrientation, 200);
        });

        setupPlayerEvents();
    }

    if (window.appready) {
        startPlugin();
    } else {
        try {
            Lampa.Listener.follow('app', function (e) {
                if (e.type === 'ready') startPlugin();
            });
        } catch (e) {
            if (document.readyState === 'complete') startPlugin();
            else window.addEventListener('load', startPlugin);
        }
    }
})();
