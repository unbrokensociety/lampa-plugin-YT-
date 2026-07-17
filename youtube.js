(function () {
    'use strict';

    function startPlugin() {
        window.youtube_player_plugin = true;

        // ===================== СТИЛИ =====================
        var style = `
        <style id="youtube-player-style">

        .player:not(.iptv) .player-panel,
        .player:not(.iptv) .player-info,
        .player:not(.iptv) .player-footer {
            background: transparent !important;
            -webkit-backdrop-filter: none !important;
            backdrop-filter: none !important;
        }
        .player:not(.iptv) .head-backward { display: none !important; }

        /* Градиенты сверху и снизу */
        .player-video__overlay {
            display: none;
            position: absolute;
            top: 0; left: 0;
            width: 100%; height: 100%;
            pointer-events: none;
            z-index: 1;
        }
        .player-video__overlay::before {
            content: '';
            position: absolute; top: 0; left: 0; right: 0;
            height: 30%;
            background: linear-gradient(to bottom, rgba(0,0,0,0.7), rgba(0,0,0,0));
        }
        .player-video__overlay::after {
            content: '';
            position: absolute; bottom: 0; left: 0; right: 0;
            height: 45%;
            background: linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0));
        }
        .player:not(.iptv).player--panel-visible .player-video__overlay {
            display: block;
            animation: animation-opacity .25s;
        }

        /* Инфо сверху (название) */
        .player:not(.iptv) .player-info__body { position: relative; }
        .player:not(.iptv) .player-info__title {
            font-size: 2em;
            font-weight: 500;
            line-height: 1.3;
            width: 70%;
            text-shadow: 0 0 .3em rgba(0,0,0,0.7);
            overflow: hidden;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
        }
        .player:not(.iptv) .player-info__name,
        .player:not(.iptv) .player-info__values {
            text-shadow: 0 0 .3em rgba(0,0,0,0.7);
            opacity: 0.9;
        }

        /* Красный таймлайн YouTube */
        .player:not(.iptv) .player-panel__timeline {
            height: 3px;
            margin-bottom: 1.2em;
            border-radius: 4px;
            background: rgba(255,255,255,0.3) !important;
            transition: height .12s ease;
            position: relative;
            z-index: 2;
        }
        .player:not(.iptv) .player-panel__timeline .player-panel__buffer {
            background: rgba(255,255,255,0.5) !important;
        }
        .player:not(.iptv) .player-panel__position {
            background: #ff0000 !important;
            border-radius: 4px;
        }
        .player:not(.iptv) .player-panel__position::after {
            content: '';
            position: absolute;
            right: -7px; top: 50%;
            width: 14px; height: 14px;
            background: #ff0000;
            border-radius: 50%;
            transform: translateY(-50%) scale(0);
            transition: transform .12s ease;
        }
        .player:not(.iptv) .player-panel__timeline.focus,
        .player:not(.iptv) .player-panel__timeline:hover {
            height: 5px;
        }
        .player:not(.iptv) .player-panel__timeline.focus .player-panel__position::after,
        .player:not(.iptv) .player-panel__timeline:hover .player-panel__position::after {
            transform: translateY(-50%) scale(1);
        }

        /* Строка со временем */
        .player:not(.iptv) .player-panel__line-one {
            margin-bottom: .5em;
            position: relative; z-index: 2;
            text-shadow: 0 0 .3em rgba(0,0,0,0.7);
        }

        /* Плоские круглые кнопки */
        .player:not(.iptv) .player-panel .button {
            width: 2.6em; height: 2.6em;
            padding: .7em;
            background: transparent !important;
            border-radius: 50% !important;
            transition: background .12s ease, transform .12s ease;
        }
        .player:not(.iptv) .player-panel .button.focus,
        .player:not(.iptv) .player-panel .button:hover {
            background: rgba(255,255,255,0.2) !important;
        }
        .player:not(.iptv) .player-panel .button.focus { transform: scale(1.08); }

        .player:not(.iptv) .player-panel__playpause > svg { width: 1.4em; height: 1.4em; }

        /* Кнопка качества — прямоугольная */
        .player:not(.iptv) .player-panel__quality {
            width: auto !important;
            border-radius: 5px !important;
            padding: 0 .8em !important;
            height: 2.6em;
            font-size: .85em;
            font-weight: 500;
            display: flex;
            align-items: center;
        }

        .player-video__paused,
        .player-video__loader {
            background-color: rgba(0,0,0,0.5);
            -webkit-backdrop-filter: blur(.3em);
            backdrop-filter: blur(.3em);
        }

        </style>
        `;

        // Медиа-запрос отдельным тегом — чтобы не ломать основной блок
        var styleMobile = `
        <style id="youtube-player-mobile">
        @media screen and (max-width: 767px) {
            .player:not(.iptv) .player-info__title {
                font-size: 1.4em !important;
                width: 85% !important;
            }
            .player:not(.iptv) .player-panel .button {
                width: 2.4em !important;
                height: 2.4em !important;
                padding: .6em !important;
            }
        }
        </style>
        `;

        $('#youtube-player-style, #youtube-player-mobile').remove();
        $('body').append(style);
        $('body').append(styleMobile);

        // ===================== DOM =====================
        function build() {
            var render = Lampa.Player.render();
            if (!render || !render.length) return;

            // Оверлей-градиент
            if (!render.find('.player-video__overlay').length) {
                render.find('.player-video__display').after('<div class="player-video__overlay"></div>');
            }

            // Строку времени переносим над таймлайном
            var lineOne = render.find('.player-panel__line-one');
            var timeline = render.find('.player-panel__timeline');
            if (lineOne.length && timeline.length && !lineOne.data('yt-moved')) {
                timeline.before(lineOne);
                lineOne.data('yt-moved', true);
            }

            // Название сверху
            if (!render.find('.player-info__title').length) {
                render.find('.player-info__body').prepend('<div class="player-info__title"></div>');
            }
        }

        Lampa.Player.listener.follow('start', function (data) {
            build();

            var render = Lampa.Player.render();
            var title  = render.find('.player-info__title');
            var head   = '';

            if (!data.iptv) {
                if (data.card) head = data.card.title || data.card.name;
                else if (Lampa.Activity.active() && Lampa.Activity.active().movie) {
                    head = Lampa.Activity.active().movie.title || Lampa.Activity.active().movie.name;
                }
            }
            if (!head) head = data.title || '';

            title.text(head).toggleClass('hide', Boolean(data.iptv));
        });

        // Первичная сборка, если плеер уже отрисован
        build();
    }

    if (!window.youtube_player_plugin) {
        if (window.appready) startPlugin();
        else {
            Lampa.Listener.follow('app', function (e) {
                if (e.type === 'ready') startPlugin();
            });
        }
    }
})();
