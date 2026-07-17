(function () {
    'use strict';

    /* =======================================================
       YOUTUBE-STYLE PLAYER FOR LAMPA — максимально схожий
       ======================================================= */

    function formatTime(t) {
        if (!t || t < 0) return '0:00';
        var h = Math.floor(t / 3600);
        var m = Math.floor((t % 3600) / 60);
        var s = Math.floor(t % 60);
        if (h > 0) return h + ':' + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
        return m + ':' + (s < 10 ? '0' : '') + s;
    }

    function addStyle() {
        if (document.getElementById('yt-player-style')) return;

        var css = document.createElement('style');
        css.id = 'yt-player-style';
        css.textContent = `

/* ===== 1. СКИДУВАННЯ ПАНЕЛЕЙ ===== */
.player:not(.iptv) .player-panel,
.player:not(.iptv) .player-info,
.player:not(.iptv) .player-footer {
    background: transparent !important;
    -webkit-backdrop-filter: none !important;
    backdrop-filter: none !important;
}
.player:not(.iptv) .player-footer { display: none !important; }
.player:not(.iptv) .head-backward { display: none !important; }
.player:not(.iptv) .player-panel__seek { display: none !important; }
.player:not(.iptv) .player-info__values .value--size { display: none; }

/* ===== 2. ГРАДІЄНТНІ НАКЛАДКИ (як на YouTube) ===== */
.player:not(.iptv) .player-panel {
    background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 50%, transparent 100%) !important;
    padding-bottom: 0;
}
.player:not(.iptv) .player-info {
    background: linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 60%, transparent 100%) !important;
    padding-bottom: 2em;
}

/* ===== 3. ТАЙМЛАЙН — ТОНКА ЧЕРВОНА СМУГА ЯК У YOUTUBE ===== */
.player:not(.iptv) .player-panel__timeline {
    height: 3px !important;
    margin: 0 0 4px !important;
    padding: 0 !important;
    background: rgba(255,255,255,0.2) !important;
    border-radius: 0 !important;
    cursor: pointer;
    position: relative;
    z-index: 25;
    transition: height .12s ease;
    order: 0; /* зверху в панелі */
}
.player:not(.iptv) .player-panel__timeline .player-panel__position {
    height: 3px !important;
    background: #ff0000 !important;
    border-radius: 0 !important;
    overflow: visible;
}
.player:not(.iptv) .player-panel__timeline .player-panel__position > div {
    background: #ff0000 !important;
    border-radius: 0;
    height: 3px !important;
    transition: height .12s ease;
}
.player:not(.iptv) .player-panel__timeline .player-panel__buffer {
    background: rgba(255,255,255,0.3) !important;
    border-radius: 0 !important;
    height: 3px !important;
}
/* Круглий повзунок — з'являється при наведенні */
.player:not(.iptv) .player-panel__timeline .player-panel__position > div::after {
    content: '' !important;
    display: none;
    position: absolute;
    right: -6.5px;
    top: -5px;
    width: 13px;
    height: 13px;
    border-radius: 50%;
    background: #ff0000;
    box-shadow: 0 0 6px rgba(255,0,0,0.3);
}
.player:not(.iptv) .player-panel__timeline.focus { height: 5px !important; }
.player:not(.iptv) .player-panel__timeline.focus .player-panel__position { height: 5px !important; }
.player:not(.iptv) .player-panel__timeline.focus .player-panel__position > div { height: 5px !important; }
.player:not(.iptv) .player-panel__timeline.focus .player-panel__position > div::after { display: block; }

/* ===== 4. РЯДОК З ЧАСОМ ===== */
.player:not(.iptv) .player-panel__line-one {
    margin: 0 0 4px !important;
    padding: 0;
    order: 1;
    position: relative;
    z-index: 20;
    display: flex;
    align-items: center;
    justify-content: flex-end;
}

/* ===== 5. КНОПКИ — ПЛОСКІ, КРУГЛІ ===== */
.player:not(.iptv) .player-panel__body {
    display: flex;
    flex-direction: column;
    padding: 0 12px 8px !important;
}
.player:not(.iptv) .player-panel__center {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 2px;
    order: 2;
}
.player:not(.iptv) .player-panel__left {
    display: flex;
    align-items: center;
    gap: 2px;
    flex: 1;
    order: 0;
}
.player:not(.iptv) .player-panel__right {
    display: flex;
    align-items: center;
    gap: 2px;
    flex: 1;
    order: 2;
    justify-content: flex-end;
}
/* Рядок кнопок: ліворуч — плей/пауза, праворуч — все інше */
.player:not(.iptv) .player-panel__controls-row {
    display: flex;
    align-items: center;
    order: 2;
}

.player:not(.iptv) .player-panel .button {
    width: 36px;
    height: 36px;
    padding: 6px;
    background: transparent !important;
    border-radius: 50% !important;
    opacity: .9;
    border: none;
    transition: background .1s, transform .1s;
    margin: 0 !important;
}
.player:not(.iptv) .player-panel .button.focus,
.player:not(.iptv) .player-panel .button:hover {
    background: rgba(255,255,255,.12) !important;
    transform: scale(1.05);
}
.player:not(.iptv) .player-panel .button.focus {
    background: rgba(255,255,255,.18) !important;
}
.player:not(.iptv) .player-panel .button > svg {
    width: 20px;
    height: 20px;
    fill: #fff;
}
.player:not(.iptv) .player-panel .button + .button {
    margin-left: 0 !important;
}

/* ===== 6. PLAY/PAUSE — більша ===== */
.player:not(.iptv) .player-panel__playpause {
    width: 40px !important;
    height: 40px !important;
    padding: 8px !important;
    margin: 0 4px !important;
}
.player:not(.iptv) .player-panel__playpause > svg {
    width: 24px !important;
    height: 24px !important;
}

/* ===== 7. NEXT / PREV ===== */
.player:not(.iptv) .player-panel__next,
.player:not(.iptv) .player-panel__prev {
    width: 32px !important;
    height: 32px !important;
    padding: 6px !important;
}
.player:not(.iptv) .player-panel__next > svg,
.player:not(.iptv) .player-panel__prev > svg {
    width: 16px;
    height: 16px;
}

/* ===== 8. ЯКІСТЬ — ПІГУЛКА (як 1080p на YouTube) ===== */
.player:not(.iptv) .player-panel__quality {
    width: auto !important;
    border-radius: 3px !important;
    padding: 0 8px !important;
    height: 28px !important;
    font-size: 11px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: .3px;
    background: rgba(255,255,255,.08) !important;
    color: #fff;
    display: inline-flex;
    align-items: center;
}

/* ===== 9. БОКСИ ДЛЯ КНОПОК ===== */
.player:not(.iptv) .player-panel__box-buttons {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    gap: 0;
}
.player:not(.iptv) .player-panel__box-buttons + .player-panel__box-buttons {
    margin-left: 4px;
}

/* ===== 10. ВЕЛИКА КНОПКА PLAY ПО ЦЕНТРУ (як на YouTube) ===== */
.yt-big-play {
    position: absolute;
    top: 50%;
    left: 50%;
    -webkit-transform: translate(-50%, -50%);
    transform: translate(-50%, -50%);
    z-index: 8;
    width: 66px;
    height: 66px;
    border-radius: 50%;
    background: rgba(0,0,0,.55);
    border: none;
    cursor: pointer;
    display: none;
    -webkit-box-align: center;
    -webkit-align-items: center;
    align-items: center;
    -webkit-box-pack: center;
    -webkit-justify-content: center;
    justify-content: center;
    pointer-events: auto;
    padding: 0;
    outline: none;
    transition: background .15s, -webkit-transform .15s, transform .15s;
}
.yt-big-play:hover {
    background: rgba(0,0,0,.75);
    -webkit-transform: translate(-50%, -50%) scale(1.05);
    transform: translate(-50%, -50%) scale(1.05);
}
.yt-big-play svg {
    width: 30px;
    height: 30px;
    fill: #fff;
    margin-left: 4px;
}
.player--paused .yt-big-play {
    display: -webkit-box !important;
    display: -webkit-flex !important;
    display: flex !important;
}

/* ===== 11. НАЗВА ЗВЕРХУ ЗЛІВА ===== */
.player:not(.iptv) .player-info__title {
    font-size: 1.6em;
    font-weight: 500;
    line-height: 1.3;
    text-shadow: 0 1px 4px rgba(0,0,0,.7);
    max-width: 55%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.player:not(.iptv) .player-info__name {
    font-size: 1.1em;
    opacity: .85;
    text-shadow: 0 1px 4px rgba(0,0,0,.7);
}
.player:not(.iptv) .player-info__values {
    opacity: .85;
    text-shadow: 0 1px 4px rgba(0,0,0,.7);
}

/* ===== 12. ВІДОБРАЖЕННЯ ЧАСУ ===== */
.yt-time {
    font-size: 12px;
    color: #fff;
    font-weight: 500;
    letter-spacing: .2px;
    text-shadow: 0 1px 3px rgba(0,0,0,.5);
    -webkit-user-select: none;
    user-select: none;
    white-space: nowrap;
    padding: 0 4px;
    line-height: 36px;
}

/* ===== 13. ПАУЗА — ТЕМНИЙ ОВЕРЛЕЙ ===== */
.player--paused .player-video__paused {
    background-color: rgba(0,0,0,.35) !important;
}
.player--paused .player-video__loader {
    background-color: rgba(0,0,0,.45) !important;
}

/* ===== 14. ВЕЛИКІ ЕКРАНИ (TV) ===== */
@media (min-width: 1920px) {
    .player:not(.iptv) .player-panel .button {
        width: 44px;
        height: 44px;
        padding: 8px;
    }
    .player:not(.iptv) .player-panel .button > svg { width: 24px; height: 24px; }
    .player:not(.iptv) .player-panel__playpause {
        width: 48px !important;
        height: 48px !important;
    }
    .player:not(.iptv) .player-panel__playpause > svg {
        width: 28px !important;
        height: 28px !important;
    }
    .player:not(.iptv) .player-panel__timeline { height: 4px !important; }
    .player:not(.iptv) .player-panel__body { padding: 0 20px 10px !important; }
    .yt-time { font-size: 13px; }
    .yt-big-play { width: 80px; height: 80px; }
    .yt-big-play svg { width: 36px; height: 36px; }
    .player:not(.iptv) .player-info__title { font-size: 1.9em; }
}

/* ===== 15. ТЕЛЕФОНИ ===== */
@media (max-width: 767px) {
    .player:not(.iptv) .player-panel__body { padding: 0 6px 4px !important; }
    .player:not(.iptv) .player-panel .button {
        width: 28px;
        height: 28px;
        padding: 4px;
    }
    .player:not(.iptv) .player-panel .button > svg { width: 16px; height: 16px; }
    .player:not(.iptv) .player-panel__playpause {
        width: 34px !important;
        height: 34px !important;
        padding: 6px !important;
    }
    .player:not(.iptv) .player-panel__playpause > svg {
        width: 20px !important;
        height: 20px !important;
    }
    .player:not(.iptv) .player-panel__next,
    .player:not(.iptv) .player-panel__prev {
        width: 26px !important;
        height: 26px !important;
        padding: 4px !important;
    }
    .player:not(.iptv) .player-panel__timeline { height: 2px !important; }
    .yt-time { font-size: 11px; line-height: 28px; }
    .yt-big-play { width: 54px; height: 54px; }
    .yt-big-play svg { width: 24px; height: 24px; }
    .player:not(.iptv) .player-info__title { font-size: 1.2em; max-width: 75%; }
}

/* ===== 16. ПЛАТФОРМИ ===== */
body.platform--browser .player:not(.iptv) .player-panel .button,
body.platform--nw .player:not(.iptv) .player-panel .button {
    background: transparent !important;
}
body.platform--browser .player:not(.iptv) .player-panel .button:hover,
body.platform--nw .player:not(.iptv) .player-panel .button:hover {
    background: rgba(255,255,255,.12) !important;
}`.trim();

        document.head.appendChild(css);
    }

    function buildDOM() {
        var render = Lampa.Player.render();
        if (!render || !render.length) return;

        // Велика кнопка Play по центру
        if (!render.find('.yt-big-play').length) {
            var bigPlay = $(
                '<button class="yt-big-play">' +
                '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>' +
                '</button>'
            );
            render.find('.player-video__display').after(bigPlay);

            bigPlay.on('click', function (e) {
                e.stopPropagation();
                Lampa.Player.play();
            });
        }

        // Відображення часу
        if (!render.find('.yt-time').length) {
            var timeEl = $('<span class="yt-time">0:00 / 0:00</span>');
            render.find('.player-panel__line-one').append(timeEl);

            // Оновлення часу
            function updateTime() {
                try {
                    var cur = Lampa.Player.getPosition();
                    var dur = Lampa.Player.getDuration();
                    timeEl.text(dur > 0 ? formatTime(cur) + ' / ' + formatTime(dur) : formatTime(cur));
                } catch(e) {}
            }

            if (Lampa.Player.listener) {
                Lampa.Player.listener.follow('timeupdate', updateTime);
                Lampa.Player.listener.follow('start', function() { setTimeout(updateTime, 500); });
            }
        }

        // Показ/схов великої кнопки Play
        var bigPlay = render.find('.yt-big-play');
        if (bigPlay.length && Lampa.Player.listener) {
            Lampa.Player.listener.follow('pause', function(){
                bigPlay.css('display', '-webkit-box');
                bigPlay.css('display', '-webkit-flex');
                bigPlay.css('display', 'flex');
            });
            Lampa.Player.listener.follow('play', function(){ bigPlay.hide(); });
            Lampa.Player.listener.follow('stop', function(){
                bigPlay.css('display', '-webkit-box');
                bigPlay.css('display', '-webkit-flex');
                bigPlay.css('display', 'flex');
            });
        }
    }

    function startPlugin() {
        if (window.yt_player_plugin_final) return;
        window.yt_player_plugin_final = true;

        addStyle();

        try {
            buildDOM();

            // Повторюємо при кожному старті відтворення
            if (window.Lampa && Lampa.Player && Lampa.Player.listener) {
                Lampa.Player.listener.follow('start', function() {
                    buildDOM();
                });
            }
        } catch(e) {
            console.log('YouTube Player init:', e);
        }
    }

    function init() {
        if (window.yt_player_plugin_final) return;

        if (window.appready) {
            startPlugin();
        } else if (window.Lampa && Lampa.Listener) {
            Lampa.Listener.follow('app', function(e) {
                if (e.type === 'ready') startPlugin();
            });
            setTimeout(function() {
                if (!window.yt_player_plugin_final) startPlugin();
            }, 3000);
        } else {
            setTimeout(init, 500);
        }
    }

    init();
})();
