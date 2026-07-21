/*
 * ============================================================
 * YouTube Style Player UI — Lampa Plugin (v5.0 Ultimate Fix)
 * ------------------------------------------------------------
 *  • 100% защита от дублирования (троения) элементов.
 *  • Нулевое вмешательство в родную структуру Lampa.
 *  • Чистый CSS для визуала (плашки, красный прогресс-бар).
 * ============================================================
 */
(function () {
    'use strict';

    if (window.__youtube_style_player_v5) return;
    window.__youtube_style_player_v5 = true;

    /* 1. Утилиты определения платформы */
    var Platform = {
        isTV: function () {
            try {
                if (typeof Lampa.Platform.tv === 'function') return Lampa.Platform.tv();
                if (typeof Lampa.Platform.screen === 'function') return Lampa.Platform.screen('tv');
            } catch (e) {}
            return false;
        },
        isMobile: function () {
            try {
                if (typeof Lampa.Platform.mobile === 'function') return Lampa.Platform.mobile();
                if (typeof Lampa.Platform.screen === 'function') return Lampa.Platform.screen('mobile');
            } catch (e) {}
            return /Mobi|Android|iPhone|iPod/i.test(navigator.userAgent || '');
        },
        isTablet: function () {
            try {
                if (typeof Lampa.Platform.tablet === 'function') return Lampa.Platform.tablet();
                if (typeof Lampa.Platform.screen === 'function') return Lampa.Platform.screen('tablet');
            } catch (e) {}
            return /iPad|Tablet/i.test(navigator.userAgent || '');
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

    /* 2. CSS Стили */
    var CSS = `
        body.yt-player-active {
            --yt-bg: #0f0f0f;
            --yt-bg-2: rgba(255,255,255,.1);
            --yt-bg-3: rgba(255,255,255,.2);
            --yt-text: #fff;
            --yt-text-2: #aaa;
            --yt-accent: #ff0000;
            --yt-radius: 12px;
        }
        
        /* Базовая раскладка */
        body.yt-player-active .player-video__display { background: #000 !important; }
        body.yt-player-active .player-panel,
        body.yt-player-active .player-info { background: var(--yt-bg) !important; }
        
        body.yt-player-active .player-panel__center {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            flex-wrap: wrap !important;
            gap: 10px;
            padding: 10px 24px 16px !important;
        }
        body.yt-player-active .player-panel__line-one {
            width: 100% !important;
            margin-bottom: 8px !important;
            order: -1 !important;
        }
        body.yt-player-active .player-panel__left {
            display: flex;
            flex-direction: column;
            justify-content: center;
            flex: 1;
            min-width: 0;
            padding-right: 15px;
        }
        body.yt-player-active .player-panel__right {
            display: flex;
            align-items: center;
            gap: 4px;
            flex-wrap: wrap;
            justify-content: flex-end;
        }
        
        /* Таймлайн (красный) */
        body.yt-player-active .player-panel__line {
            background: var(--yt-bg-2) !important;
            height: 4px !important;
            border-radius: 2px !important;
            cursor: pointer;
        }
        body.yt-player-active .player-panel__line .time-line__load { background: var(--yt-bg-3) !important; }
        body.yt-player-active .player-panel__line .time-line__line { background: var(--yt-accent) !important; }
        body.yt-player-active .player-panel__line .time-line__body {
            background: var(--yt-accent) !important;
            box-shadow: 0 0 0 4px rgba(255,0,0,.25) !important;
        }
        
        /* Кнопки (круглые) */
        body.yt-player-active .player-panel .button {
            background: transparent !important;
            color: var(--yt-text) !important;
            border-radius: 50% !important;
            transition: background .15s, color .15s, transform .1s !important;
        }
        body.yt-player-active .player-panel .button:hover { background: var(--yt-bg-2) !important; }
        body.yt-player-active .player-panel .button:active { transform: scale(.94); }
        body.yt-player-active .player-panel .player-panel__playpause {
            background: var(--yt-text) !important;
            color: #000 !important;
        }
        body.yt-player-active .player-panel .player-panel__playpause:hover { background: #fff !important; }
        
        /* Эффект плашек для настроек */
        body.yt-player-active .player-panel__quality,
        body.yt-player-active .player-panel__flow,
        body.yt-player-active .player-panel__tracks,
        body.yt-player-active .player-panel__subs {
            background: var(--yt-bg-2);
            border-radius: var(--yt-radius) !important;
            padding: 0 8px;
            margin: 0 2px;
        }
        body.yt-player-active .player-panel__quality .selectbox__value,
        body.yt-player-active .player-panel__flow .selectbox__value,
        body.yt-player-active .player-panel__tracks .selectbox__value,
        body.yt-player-active .player-panel__subs .selectbox__value {
            color: var(--yt-text) !important;
            background: transparent !important;
            height: 40px;
            display: flex;
            align-items: center;
        }
        
        /* Наши текстовые элементы */
        body.yt-player-active .yt-title {
            font-size: 1.15em;
            font-weight: 600;
            color: var(--yt-text);
            line-height: 1.3;
            margin: 0 0 4px;
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        body.yt-player-active .yt-value {
            font-size: .85em;
            color: var(--yt-text-2);
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        body.yt-player-active .yt-title.hide,
        body.yt-player-active .yt-value.hide { display: none !important; }

        /* TV Стили */
        body.yt-platform-tv .yt-player-active .player-panel__center { padding: 18px 48px 28px !important; gap: 12px; }
        body.yt-platform-tv .yt-player-active .player-panel__line { height: 6px !important; }
        body.yt-platform-tv .yt-player-active .player-panel .button { width: 64px !important; height: 64px !important; font-size: 1.4em !important; }
        body.yt-platform-tv .yt-player-active .player-panel__playpause { width: 72px !important; height: 72px !important; }
        body.yt-platform-tv .yt-player-active .player-panel__quality .selectbox__value,
        body.yt-platform-tv .yt-player-active .player-panel__flow .selectbox__value { height: 64px; }
        body.yt-platform-tv .yt-player-active .yt-title { font-size: 1.6em; }
        body.yt-platform-tv .yt-player-active .yt-value { font-size: 1.05em; }
        body.yt-platform-tv .yt-player-active .player-panel .button.focus,
        body.yt-platform-tv .yt-player-active .player-panel .button.focused {
            background: var(--yt-bg-3) !important;
            outline: 2px solid var(--yt-accent) !important;
            outline-offset: 2px;
        }

        /* Mobile Portrait */
        body.yt-platform-mobile.yt-portrait .yt-player-active .player-panel__center,
        body.yt-platform-tablet.yt-portrait .yt-player-active .player-panel__center {
            flex-direction: column;
            align-items: stretch;
        }
        body.yt-platform-mobile.yt-portrait .yt-player-active .player-panel__left,
        body.yt-platform-mobile.yt-portrait .yt-player-active .player-panel__right {
            width: 100%;
            justify-content: center;
            align-items: center;
            text-align: center;
        }
    `;

    /* 3. Внедрение CSS */
    function injectCSS() {
        if (document.getElementById('yt-style-player-css-v5')) return;
        var s = document.createElement('style');
        s.id = 'yt-style-player-css-v5';
        s.textContent = CSS;
        document.head.appendChild(s);
    }

    /* 4. Определение платформы */
    function applyPlatformClass() {
        var b = document.body;
        ['yt-platform-tv', 'yt-platform-desktop', 'yt-platform-mobile', 'yt-platform-tablet'].forEach(function (c) {
            b.classList.remove(c);
        });
        b.classList.add('yt-platform-' + Platform.name());
        b.classList.toggle('yt-portrait', Platform.isPortrait());
        b.classList.toggle('yt-landscape', !Platform.isPortrait());
    }

    /* 5. Обработка событий плеера */
    function setupPlayerEvents() {
        try {
            Lampa.Player.listener.follow('start', function (data) {
                var render = Lampa.Player.render();
                if (!render || !render.length) return;

                // Добавляем классы на корень плеера и body
                render.addClass('yt-style-active');
                document.body.classList.add('yt-player-active');

                var leftPanel = render.find('.player-panel__left');
                if (!leftPanel.length) return;

                // ЗАЩИТА ОТ ДУБЛИРОВАНИЯ: Ищем существующие элементы, если их нет - создаем
                var titleEl = leftPanel.find('.yt-title');
                var valueEl = leftPanel.find('.yt-value');

                if (!titleEl.length) {
                    titleEl = $('<div class="yt-title hide"></div>');
                    valueEl = $('<div class="yt-value hide"></div>');
                    leftPanel.prepend(valueEl);
                    leftPanel.prepend(titleEl);
                }

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

                // Обновляем текст (без дублирования)
                titleEl.text(head).toggleClass('hide', !!data.iptv);
                valueEl.text(name).toggleClass('hide', name === head || !name);

                // Скрываем родное название Lampa, чтобы не было двойного текста
                var playerName = render.find('.player-info__name');
                if (playerName.length) {
                    playerName.addClass('hide');
                }
            });

            // Снимаем классы при закрытии плеера
            Lampa.Player.listener.follow('destroy', function () {
                document.body.classList.remove('yt-player-active');
            });
        } catch (e) {
            console.error('YT Style Player Error:', e);
        }
    }

    /* 6. Запуск */
    function startPlugin() {
        injectCSS();
        applyPlatformClass();

        var rt;
        window.addEventListener('resize', function () {
            clearTimeout(rt);
            rt = setTimeout(applyPlatformClass, 150);
        });
        window.addEventListener('orientationchange', function () {
            setTimeout(applyPlatformClass, 200);
        });

        setupPlayerEvents();
    }

    /* 7. Точка входа */
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
