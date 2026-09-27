// ds.js - Lampa Monitor
// Никакого Lampa API - только DOM

(function() {
    'use strict';

    // Проверка что не запускались
    if (window.__dsMonitor) return;
    window.__dsMonitor = true;

    console.log('[Monitor] ds.js загружен');

    var panel;
    var timeEl;
    var titleEl;
    var posterEl;
    var metaEl;
    var startTime = Date.now();
    var lastTitle = '';

    // Стили
    var style = document.createElement('style');
    style.textContent = [
        '#dsmon {',
        'position: fixed;',
        'top: 10px;',
        'right: 10px;',
        'z-index: 999999;',
        'background: rgba(10,10,20,0.95);',
        'border: 1px solid rgba(79,195,247,0.5);',
        'border-radius: 12px;',
        'padding: 15px;',
        'width: 280px;',
        'color: #fff;',
        'font-family: -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;',
        'font-size: 12px;',
        'box-shadow: 0 4px 20px rgba(0,0,0,0.6);',
        '}',
        '#dsmon .dsm-head {',
        'display: flex;',
        'justify-content: space-between;',
        'align-items: center;',
        'margin-bottom: 10px;',
        'padding-bottom: 10px;',
        'border-bottom: 1px solid rgba(255,255,255,0.1);',
        '}',
        '#dsmon .dsm-title {',
        'color: #4fc3f7;',
        'font-weight: bold;',
        'font-size: 13px;',
        '}',
        '#dsmon .dsm-close {',
        'background: none;',
        'border: none;',
        'color: #888;',
        'font-size: 20px;',
        'cursor: pointer;',
        'padding: 0 5px;',
        '}',
        '#dsmon .dsm-close:hover {',
        'color: #fff;',
        '}',
        '#dsmon .dsm-time {',
        'background: rgba(79,195,247,0.15);',
        'padding: 10px;',
        'border-radius: 8px;',
        'margin-bottom: 10px;',
        'display: flex;',
        'justify-content: space-between;',
        'align-items: center;',
        '}',
        '#dsmon .dsm-timer {',
        'color: #4fc3f7;',
        'font-weight: bold;',
        'font-family: monospace;',
        'font-size: 18px;',
        '}',
        '#dsmon .dsm-movie {',
        'display: flex;',
        'gap: 10px;',
        '}',
        '#dsmon .dsm-poster {',
        'width: 65px;',
        'height: 95px;',
        'background: #1a1a2e;',
        'border-radius: 8px;',
        'background-size: cover;',
        'background-position: center;',
        'flex-shrink: 0;',
        'display: flex;',
        'align-items: center;',
        'justify-content: center;',
        'font-size: 20px;',
        'border: 1px solid rgba(255,255,255,0.1);',
        '}',
        '#dsmon .dsm-info {',
        'flex: 1;',
        'min-width: 0;',
        '}',
        '#dsmon .dsm-name {',
        'font-size: 13px;',
        'font-weight: 600;',
        'margin-bottom: 4px;',
        'overflow: hidden;',
        'text-overflow: ellipsis;',
        'display: -webkit-box;',
        '-webkit-line-clamp: 3;',
        '-webkit-box-orient: vertical;',
        '}',
        '#dsmon .dsm-meta {',
        'font-size: 10px;',
        'color: rgba(255,255,255,0.5);',
        '}',
        '#dsmon .dsm-status {',
        'display: flex;',
        'align-items: center;',
        'gap: 6px;',
        'margin-top: 10px;',
        'padding-top: 10px;',
        'border-top: 1px solid rgba(255,255,255,0.05);',
        'font-size: 10px;',
        'color: rgba(255,255,255,0.3);',
        '}',
        '#dsmon .dsm-dot {',
        'width: 6px;',
        'height: 6px;',
        'border-radius: 50%;',
        'background: #4caf50;',
        'animation: dsmpulse 2s infinite;',
        '}',
        '@keyframes dsmpulse {',
        '0%,100% {opacity:1;}',
        '50% {opacity:0.3;}',
        '}'
    ].join('');
    document.head.appendChild(style);

    // Создание панели
    function createPanel() {
        if (panel) return;

        panel = document.createElement('div');
        panel.id = 'dsmon';
        panel.innerHTML = [
            '<div class="dsm-head">',
            '<span class="dsm-title">📊 Монитор</span>',
            '<button class="dsm-close" id="dsm-close">×</button>',
            '</div>',
            '<div class="dsm-time">',
            '<span>⏱ Время:</span>',
            '<span class="dsm-timer" id="dsm-timer">00:00:00</span>',
            '</div>',
            '<div class="dsm-movie">',
            '<div class="dsm-poster" id="dsm-poster">🎬</div>',
            '<div class="dsm-info">',
            '<div class="dsm-name" id="dsm-name">Определение...</div>',
            '<div class="dsm-meta" id="dsm-meta">Поиск фильма</div>',
            '</div>',
            '</div>',
            '<div class="dsm-status">',
            '<div class="dsm-dot"></div>',
            '<span>Активен</span>',
            '</div>'
        ].join('');

        document.body.appendChild(panel);

        timeEl = document.getElementById('dsm-timer');
        titleEl = document.getElementById('dsm-name');
        posterEl = document.getElementById('dsm-poster');
        metaEl = document.getElementById('dsm-meta');

        document.getElementById('dsm-close').addEventListener('click', function() {
            panel.remove();
            window.__dsMonitor = false;
        });
    }

    // Обновление времени
    function updateTime() {
        if (!timeEl) return;
        var elapsed = Date.now() - startTime;
        var h = Math.floor(elapsed / 3600000);
        var m = Math.floor((elapsed % 3600000) / 60000);
        var s = Math.floor((elapsed % 60000) / 1000);
        var str = (h<10?'0':'')+h+':'+(m<10?'0':'')+m+':'+(s<10?'0':'')+s;
        timeEl.textContent = str;
    }

    // Поиск фильма
    function findMovie() {
        try {
            // Метод 1: URL параметр
            var urlParams = window.location.search;
            var titleMatch = urlParams.match(/[?&]title=([^&]*)/);
            if (titleMatch && titleMatch[1]) {
                var t = decodeURIComponent(titleMatch[1]);
                if (t && t !== 'Главная' && t.length > 2 && t !== 'undefined') {
                    return { title: t, source: 'URL' };
                }
            }

            // Метод 2: DOM селекторы
            var selectors = [
                '.full-start__title',
                '.full-start .title',
                '.full-start h1',
                '.full-start .name',
                '.full-start__name',
                '.card__title',
                '.card__name',
                '.video-player__title',
                '.player__title',
                'h1',
                '.title'
            ];

            for (var i = 0; i < selectors.length; i++) {
                try {
                    var el = document.querySelector(selectors[i]);
                    if (el && el.textContent) {
                        var text = el.textContent.trim();
                        if (text && text.length > 2 && 
                            text !== 'Главная' && 
                            text !== 'Lampa' &&
                            text !== 'undefined' &&
                            text !== 'TMDB') {
                            return { title: text, source: selectors[i] };
                        }
                    }
                } catch(e) {
                    // Продолжаем
                }
            }

            return null;
        } catch(e) {
            return null;
        }
    }

    // Поиск постера
    function findPoster() {
        try {
            // Ищем TMDB постер
            var imgs = document.querySelectorAll('img');
            for (var i = 0; i < imgs.length; i++) {
                var img = imgs[i];
                var src = img.src || img.getAttribute('data-src') || '';
                if (src && src.indexOf('image.tmdb.org') !== -1) {
                    return src;
                }
            }

            // Фолбэк
            var posterSelectors = [
                '.full-start__poster img',
                '.card__img img',
                '.card__poster img',
                'img[class*="poster"]',
                'img[src*="poster"]'
            ];

            for (var j = 0; j < posterSelectors.length; j++) {
                var el = document.querySelector(posterSelectors[j]);
                if (el && el.src) {
                    return el.src;
                }
            }

            return null;
        } catch(e) {
            return null;
        }
    }

    // Обновление фильма
    function updateMovie() {
        try {
            var movie = findMovie();
            if (movie && movie.title && movie.title !== lastTitle) {
                lastTitle = movie.title;

                if (titleEl) titleEl.textContent = movie.title;
                if (metaEl) metaEl.textContent = 'Источник: ' + movie.source;

                var poster = findPoster();
                if (poster && posterEl) {
                    posterEl.style.backgroundImage = 'url("' + poster + '")';
                    posterEl.textContent = '';
                    posterEl.style.fontSize = '0';
                } else if (posterEl) {
                    posterEl.style.backgroundImage = 'none';
                    posterEl.textContent = '🎬';
                    posterEl.style.fontSize = '20px';
                }
            }
        } catch(e) {
            // Игнорируем
        }
    }

    // Запуск
    function start() {
        createPanel();

        // Время каждую секунду
        setInterval(updateTime, 1000);

        // Фильм каждые 2 секунды
        setInterval(updateMovie, 2000);

        // Сразу обновить
        updateTime();
        updateMovie();

        console.log('[Monitor] Запущен');
    }

    // Ожидание DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(start, 1000);
        });
    } else {
        setTimeout(start, 1000);
    }

})();
