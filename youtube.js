(function () {
    'use strict';

    function initYouTubeStyle() {
        if (window.youtube_player_plugin_ready) return;
        window.youtube_player_plugin_ready = true;

        var css = `
        <style id="yt-player-style">
        /* Убираем стандартные фоны панелей */
        .player:not(.iptv) .player-panel,
        .player:not(.iptv) .player-info,
        .player:not(.iptv) .player-footer {
            background: transparent !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
        }

        /* Градиенты как в YouTube (сверху и снизу) */
        .player:not(.iptv) .player-info {
            background: linear-gradient(to bottom, rgba(0,0,0,0.8), rgba(0,0,0,0)) !important;
            padding-bottom: 3em;
        }
        .player:not(.iptv) .player-panel {
            background: linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0)) !important;
            padding-bottom: 1em;
        }

        /* Стили текста (название и время) */
        .player:not(.iptv) .player-info__title,
        .player:not(.iptv) .player-info__name,
        .player:not(.iptv) .player-panel__line-one {
            text-shadow: 0 0 4px rgba(0,0,0,0.9);
        }
        .player:not(.iptv) .player-info__title {
            font-size: 1.8em;
            font-weight: 500;
        }

        /* ===== КРАСНАЯ ПОЛОСА ПРОГРЕССА ===== */
        .player:not(.iptv) .player-panel__timeline {
            height: 3px !important;
            border-radius: 4px;
            background: rgba(255,255,255,0.3) !important;
            transition: height .15s ease;
            position: relative;
        }
        .player:not(.iptv) .player-panel__timeline .player-panel__buffer {
            background: rgba(255,255,255,0.5) !important;
            border-radius: 4px;
        }
        .player:not(.iptv) .player-panel__timeline .player-panel__position {
            background: #ff0000 !important;
            border-radius: 4px;
        }
        /* Круглый ползунок */
        .player:not(.iptv) .player-panel__timeline .player-panel__position::after {
            content: '';
            position: absolute;
            right: -6px; top: 50%;
            width: 12px; height: 12px;
            background: #ff0000;
            border-radius: 50%;
            transform: translateY(-50%) scale(0);
            transition: transform .15s ease;
        }
        /* При наведении/фокусе полоса толще и ползунок виден */
        .player:not(.iptv) .player-panel__timeline.focus,
        .player:not(.iptv) .player-panel__timeline:hover {
            height: 5px !important;
        }
        .player:not(.iptv) .player-panel__timeline.focus .player-panel__position::after,
        .player:not(.iptv) .player-panel__timeline:hover .player-panel__position::after {
            transform: translateY(-50%) scale(1);
        }

        /* ===== ПЛОСКИЕ КНОПКИ ===== */
        .player:not(.iptv) .player-panel .button {
            background: transparent !important;
            border-radius: 50% !important;
            transition: background .15s ease, transform .15s ease;
        }
        .player:not(.iptv) .player-panel .button.focus,
        .player:not(.iptv) .player-panel .button:hover {
            background: rgba(255,255,255,0.2) !important;
            transform: scale(1.1);
        }

        /* Прямоугольная кнопка качества (как 1080p) */
        .player:not(.iptv) .player-panel__quality {
            width: auto !important;
            border-radius: 4px !important;
            padding: 0 .8em !important;
            font-weight: 500;
        }

        /* Затемнение при паузе/загрузке */
        .player-video__paused,
        .player-video__loader {
            background-color: rgba(0,0,0,0.5) !important;
            backdrop-filter: blur(3px);
            -webkit-backdrop-filter: blur(3px);
        }

        /* Адаптация для телефона */
        @media screen and (max-width: 480px) {
            .player:not(.iptv) .player-info__title { font-size: 1.3em !important; }
            .player:not(.iptv) .player-panel .button { transform: scale(0.9); }
        }
        </style>
        `;

        // Добавляем стили
        if (!document.getElementById('yt-player-style')) {
            document.body.insertAdjacentHTML('beforeend', css);
        }

        // Слушаем запуск плеера для применения стилей к новому видео
        if (window.Lampa && Lampa.Player) {
            Lampa.Player.listener.follow('start', function () {
                if (!document.getElementById('yt-player-style')) {
                    document.body.insertAdjacentHTML('beforeend', css);
                }
            });
        }
    }

    // Запуск плагина
    if (window.appready) {
        initYouTubeStyle();
    } else {
        if (window.Lampa && Lampa.Listener) {
            Lampa.Listener.follow('app', function (e) {
                if (e.type === 'ready') initYouTubeStyle();
            });
        } else {
            setTimeout(initYouTubeStyle, 2000); // Запасной таймер
        }
    }
})();
