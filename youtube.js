/*
 * ============================================================
 *  YouTube Style Player UI  —  Lampa Plugin (v2.0)
 * ------------------------------------------------------------
 *  Полная переработка плагина cub.red/plugin/youtube-player.
 *
 *  Особенности:
 *   • Работает на ВСЕХ устройствах: TV, ПК/ноутбук, телефон, планшет
 *     (оригинал блокировал мобильные — снято).
 *   • Три отдельных набора стилей:
 *       - YouTube TV      (10-foot UI, фокус-навигация пультом)
 *       - YouTube Desktop (Web/ПК, мышь + клавиатура)
 *       - YouTube Mobile  (тач, портрет/ландшафт)
 *   • Адаптация под ориентацию экрана (portrait / landscape).
 *   • Цветовая палитра YouTube: красный прогресс-бар (#FF0000),
 *     тёмный фон (#0F0F0F), белый текст.
 *   • Группировка контролов как в YouTube:
 *       слева  — заголовок видео + подпись канала/карточки,
 *       справа — quality, audio, subs, tracks, кнопки действий.
 *
 *  Установка: Настройки → Расширения → Добавить плагин → URL файла.
 * ============================================================
 */
(function () {
    'use strict';

    /* 0. Защита от повторного запуска */
    if (window.__youtube_style_player_inited) return;
    window.__youtube_style_player_inited = true;

    /* 1. Утилиты определения платформы и ориентации */
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

    /* 2. CSS — три набора стилей (TV / Desktop / Mobile) */
    var CSS = '';
    /* базовые (общие) */
    CSS += [
        '.yt-style-root{',
        '  --yt-bg:#0f0f0f; --yt-bg-2:rgba(255,255,255,.08); --yt-bg-3:rgba(255,255,255,.14);',
        '  --yt-text:#fff; --yt-text-2:#aaa; --yt-accent:#ff0000;',
        '  --yt-radius:12px;',
        '  font-family:"Roboto","Segoe UI",system-ui,-apple-system,sans-serif;',
        '}',
        '.yt-style-root .player-video__display{background:#000!important}',
        '.yt-style-root .player-panel,.yt-style-root .player-info{background:var(--yt-bg)!important}',
        '.yt-style-root .player-panel__line,.yt-style-root .player-panel__center,',
        '.yt-style-root .player-panel__line-one{background:transparent!important;border:none!important}',
        '.yt-style-root .player-panel__line{background:var(--yt-bg-2)!important}',
        '.yt-style-root .player-panel__line .time-line__load{background:var(--yt-bg-3)!important}',
        '.yt-style-root .player-panel__line .time-line__line{background:var(--yt-accent)!important}',
        '.yt-style-root .player-panel__line .time-line__body{background:var(--yt-accent)!important;box-shadow:0 0 0 4px rgba(255,0,0,.25)!important}',
        '.yt-style-root .player-panel .button{background:transparent!important;color:var(--yt-text)!important;border-radius:50%!important;transition:background .15s,color .15s,transform .1s!important}',
        '.yt-style-root .player-panel .button:hover{background:var(--yt-bg-2)!important}',
        '.yt-style-root .player-panel .button:active{transform:scale(.94)}',
        '.yt-style-root .player-panel .player-panel__playpause{background:var(--yt-text)!important;color:#000!important;border-radius:50%!important}',
        '.yt-style-root .player-panel .player-panel__playpause:hover{background:#fff!important}',
        '.yt-style-root .yt-title{font-size:1.15em;font-weight:600;color:var(--yt-text);line-height:1.3;margin:0 0 2px;padding:0;max-width:75%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
        '.yt-style-root .yt-value{font-size:.85em;color:var(--yt-text-2);margin:0;padding:0;max-width:75%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
        '.yt-style-root .yt-title.hide,.yt-style-root .yt-value.hide{display:none!important}',
        '.yt-style-root .yt-box{display:flex;align-items:center;gap:4px;background:transparent}',
        '.yt-style-root .yt-box--qual,.yt-style-root .yt-box--audio,.yt-style-root .yt-box--main{background:var(--yt-bg-2);border-radius:var(--yt-radius)!important;padding:2px 6px}',
        '.yt-style-root .player-panel__quality .selectbox__value,',
        '.yt-style-root .player-panel__flow .selectbox__value,',
        '.yt-style-root .player-panel__tracks .selectbox__value,',
        '.yt-style-root .player-panel__subs .selectbox__value{color:var(--yt-text)!important;background:transparent!important}',
        ''
    ].join('\n');

    /* TV (10-foot UI) */
    CSS += [
        'body.yt-platform-tv .yt-style-root{--yt-radius:16px}',
        'body.yt-platform-tv .yt-style-root .player-panel__center{padding:18px 48px 28px!important;flex-wrap:wrap;gap:12px}',
        'body.yt-platform-tv .yt-style-root .player-panel__line-one{width:100%;margin-bottom:8px}',
        'body.yt-platform-tv .yt-style-root .player-panel__line .time-line__body{height:6px!important}',
        'body.yt-platform-tv .yt-style-root .yt-title{font-size:1.6em;max-width:90%}',
        'body.yt-platform-tv .yt-style-root .yt-value{font-size:1.05em;max-width:90%}',
        'body.yt-platform-tv .yt-style-root .player-panel .button{width:64px!important;height:64px!important;font-size:1.4em!important}',
        'body.yt-platform-tv .yt-style-root .player-panel .player-panel__playpause{width:72px!important;height:72px!important}',
        'body.yt-platform-tv .yt-style-root .yt-box{gap:8px}',
        'body.yt-platform-tv .yt-style-root .yt-box--qual,body.yt-platform-tv .yt-style-root .yt-box--audio,body.yt-platform-tv .yt-style-root .yt-box--main{padding:6px 14px;gap:10px}',
        'body.yt-platform-tv .yt-style-root .player-panel .button.focus,',
        'body.yt-platform-tv .yt-style-root .player-panel .button.focused{background:var(--yt-bg-3)!important;outline:2px solid var(--yt-accent)!important;outline-offset:2px}',
        ''
    ].join('\n');

    /* Desktop (ПК/ноутбук) */
    CSS += [
        'body.yt-platform-desktop .yt-style-root{--yt-radius:10px}',
        'body.yt-platform-desktop .yt-style-root .player-panel__center{padding:10px 24px 16px!important;gap:8px}',
        'body.yt-platform-desktop .yt-style-root .player-panel__line-one{width:100%;margin-bottom:6px}',
        'body.yt-platform-desktop .yt-style-root .player-panel__line .time-line__body{height:4px!important}',
        'body.yt-platform-desktop .yt-style-root .player-panel__line:hover .time-line__body{height:6px!important}',
        'body.yt-platform-desktop .yt-style-root .yt-title{font-size:1.1em}',
        'body.yt-platform-desktop .yt-style-root .yt-value{font-size:.8em}',
        'body.yt-platform-desktop .yt-style-root .player-panel .button{width:40px!important;height:40px!important;font-size:1.05em!important}',
        'body.yt-platform-desktop .yt-style-root .player-panel .player-panel__playpause{width:46px!important;height:46px!important}',
        'body.yt-platform-desktop .yt-style-root .yt-box--qual,body.yt-platform-desktop .yt-style-root .yt-box--audio,body.yt-platform-desktop .yt-style-root .yt-box--main{padding:2px 8px;gap:4px}',
        ''
    ].join('\n');

    /* Mobile / Tablet — базово (ландшафт) */
    CSS += [
        'body.yt-platform-mobile .yt-style-root,',
        'body.yt-platform-tablet .yt-style-root{--yt-radius:18px}',
        'body.yt-platform-mobile .yt-style-root .player-panel__center,',
        'body.yt-platform-tablet .yt-style-root .player-panel__center{padding:8px 12px 18px!important;gap:6px}',
        'body.yt-platform-mobile .yt-style-root .player-panel__line-one,',
        'body.yt-platform-tablet .yt-style-root .player-panel__line-one{width:100%;margin-bottom:4px}',
        'body.yt-platform-mobile .yt-style-root .player-panel__line .time-line__body,',
        'body.yt-platform-tablet .yt-style-root .player-panel__line .time-line__body{height:4px!important}',
        'body.yt-platform-mobile .yt-style-root .yt-title{font-size:1em;max-width:85%}',
        'body.yt-platform-mobile .yt-style-root .yt-value{font-size:.75em;max-width:85%}',
        'body.yt-platform-tablet .yt-style-root .yt-title{font-size:1.15em}',
        'body.yt-platform-mobile .yt-style-root .player-panel .button,',
        'body.yt-platform-tablet .yt-style-root .player-panel .button{width:44px!important;height:44px!important;font-size:1.15em!important}',
        'body.yt-platform-mobile .yt-style-root .player-panel .player-panel__playpause,',
        'body.yt-platform-tablet .yt-style-root .player-panel .player-panel__playpause{width:50px!important;height:50px!important}',
        'body.yt-platform-mobile .yt-style-root .yt-box--qual,',
        'body.yt-platform-mobile .yt-style-root .yt-box--audio,',
        'body.yt-platform-mobile .yt-style-root .yt-box--main{padding:3px 10px;gap:6px}',
        ''
    ].join('\n');

    /* Mobile PORTRAIT — компактная вертикальная раскладка */
    CSS += [
        'body.yt-platform-mobile.yt-portrait .yt-style-root .player-panel__center{flex-direction:column;align-items:stretch;gap:8px}',
        'body.yt-platform-mobile.yt-portrait .yt-style-root .player-panel__left,',
        'body.yt-platform-mobile.yt-portrait .yt-style-root .player-panel__right{width:100%;justify-content:center}',
        'body.yt-platform-mobile.yt-portrait .yt-style-root .yt-title{max-width:100%;text-align:center}',
        'body.yt-platform-mobile.yt-portrait .yt-style-root .yt-value{max-width:100%;text-align:center}',
        'body.yt-platform-mobile.yt-portrait .yt-style-root .player-panel .button{width:48px!important;height:48px!important}',
        'body.yt-platform-mobile.yt-portrait .yt-style-root .player-panel__playpause{width:56px!important;height:56px!important}',
        ''
    ].join('\n');

    /* Tablet PORTRAIT */
    CSS += [
        'body.yt-platform-tablet.yt-portrait .yt-style-root .player-panel__center{flex-direction:column;align-items:stretch;gap:10px}',
        'body.yt-platform-tablet.yt-portrait .yt-style-root .player-panel__left,',
        'body.yt-platform-tablet.yt-portrait .yt-style-root .player-panel__right{width:100%;justify-content:center}',
        'body.yt-platform-tablet.yt-portrait .yt-style-root .yt-title{max-width:100%;text-align:center;font-size:1.3em}',
        'body.yt-platform-tablet.yt-portrait .yt-style-root .yt-value{max-width:100%;text-align:center}',
        ''
    ].join('\n');

    /* 3. Внедрение CSS */
    function injectCSS() {
        if (document.getElementById('yt-style-player-css')) return;
        var s = document.createElement('style');
        s.id = 'yt-style-player-css';
        s.textContent = CSS;
        document.head.appendChild(s);
    }

    /* 4. Класс платформы на <body> + обновление при повороте */
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

    /* 5. Перестроение UI плеера в стиле YouTube */
    function rebuildPlayer() {
        var render;
        try { render = Lampa.Player.render(); } catch (e) { return; }
        if (!render || !render.length) return;

        render.addClass('yt-style-root');

        var title = $('<div class="yt-title hide"></div>');
        var value = $('<div class="yt-value hide"><span></span></div>');

        render.find('.player-video__display').after($('<div class="yt-style-root"></div>'));

        render.find('.player-panel__center')
              .find('.button:not(.player-panel__playpause)').remove();

        render.find('.player-panel__timeline')
              .before(render.find('.player-panel__line-one'));

        render.find('.player-info .player-info__line').before(title);
        render.find('.value--size').after(value);

        var box        = $('<div class="yt-box"></div>');
        var rightPanel = render.find('.player-panel__right');
        var leftPanel  = render.find('.player-panel__left');

        var rightBoxQuality = box.clone().addClass('yt-box--qual');
        var rightBoxMain    = box.clone().addClass('yt-box--main');
        var rightBoxAudio   = box.clone().addClass('yt-box--audio');
        var leftBoxMain     = box.clone().addClass('yt-box--main');

        rightPanel.append(rightBoxAudio);
        rightPanel.append(rightBoxQuality);
        rightPanel.append(rightBoxMain);

        rightBoxMain.append(rightPanel.find('.button'));
        rightBoxQuality.append(rightPanel.find('.player-panel__quality'));
        rightBoxAudio.append(rightPanel.find('.player-panel__flow'));
        rightBoxAudio.append(rightPanel.find('.player-panel__subs'));
        rightBoxAudio.append(rightPanel.find('.player-panel__tracks'));

        leftPanel.prepend(leftBoxMain);
        leftBoxMain.append(leftPanel.find('.button'));

        try {
            Lampa.Player.listener.follow('start', function (data) {
                var name = data.title || '';
                var head = '';
                if (!data.iptv) {
                    if (data.card) head = data.card.title || data.card.name || '';
                    else if (Lampa.Activity.active().movie) {
                        head = Lampa.Activity.active().movie.title || Lampa.Activity.active().movie.name || '';
                    }
                }
                if (!head) head = name;
                title.text(head).toggleClass('hide', !!data.iptv);
                render.find('.player-info__name')
                      .toggleClass('hide', name === head)
                      .toggleClass('hide', true);
                value.toggleClass('hide', name === head)
                     .find('span').text(name);
            });
        } catch (e) {}
    }

    /* 6. Запуск */
    function startPlugin() {
        injectCSS();
        applyPlatformClass();
        rebuildPlayer();

        var rt;
        window.addEventListener('resize', function () {
            clearTimeout(rt);
            rt = setTimeout(updateOrientation, 150);
        });
        window.addEventListener('orientationchange', function () {
            setTimeout(updateOrientation, 200);
        });
    }

    /* 7. Точка входа — ждём готовности приложения */
    if (window.appready) {
        startPlugin();
    } else {
        try {
            Lampa.Listener.follow('app', function (e) {
                if (e.type === 'ready') startPlugin();
            });
        } catch (e) {
            /* fallback: пробуем по DOMContentLoaded */
            if (document.readyState === 'complete') startPlugin();
            else window.addEventListener('load', startPlugin);
        }
    }
})();
