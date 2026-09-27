/**
 * Lampa Monitor v8.0
 * Работает через Lampa.Listener.follow() — это правильное API
 * НЕ использует Lampa.Plugin.add() (которого нет в Lampa)
 */

(function() {
    'use strict';

    console.log('[Monitor] Загрузка v8.0...');

    // ===== ПЕРЕМЕННЫЕ =====
    var startTime = Date.now();
    var panel;
    var timeEl, titleEl, posterEl, metaEl, countEl;
    var lastMovie = '';
    var movieCount = 0;

    // ===== СОЗДАНИЕ UI =====
    function createUI() {
        // Стили
        var style = document.createElement('style');
        style.textContent = `
            #lampa-monitor-v8 {
                position: fixed;
                top: 15px;
                right: 15px;
                z-index: 999999;
                background: linear-gradient(135deg, rgba(15,15,25,0.98), rgba(25,25,40,0.95));
                border: 1px solid rgba(79,195,247,0.4);
                border-radius: 15px;
                padding: 18px;
                width: 300px;
                color: #fff;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 13px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.7);
                backdrop-filter: blur(15px);
                transition: all 0.3s ease;
            }

            #lampa-monitor-v8 .mon-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
                padding-bottom: 12px;
                border-bottom: 1px solid rgba(255,255,255,0.1);
            }

            #lampa-monitor-v8 .mon-title {
                font-size: 15px;
                font-weight: 700;
                color: #4fc3f7;
                letter-spacing: 1px;
            }

            #lampa-monitor-v8 .mon-close {
                background: rgba(255,255,255,0.05);
                border: none;
                color: rgba(255,255,255,0.5);
                font-size: 20px;
                cursor: pointer;
                padding: 5px;
                width: 28px;
                height: 28px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
            }

            #lampa-monitor-v8 .mon-close:hover {
                background: rgba(255,0,0,0.2);
                color: #ff4444;
            }

            #lampa-monitor-v8 .mon-time-section {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
                padding: 12px 15px;
                background: rgba(79,195,247,0.15);
                border-radius: 10px;
                border: 1px solid rgba(79,195,247,0.2);
            }

            #lampa-monitor-v8 .mon-time-label {
                color: rgba(255,255,255,0.6);
                font-size: 12px;
            }

            #lampa-monitor-v8 .mon-time-value {
                font-family: 'Courier New', monospace;
                font-size: 24px;
                font-weight: 700;
                color: #4fc3f7;
                text-shadow: 0 0 20px rgba(79,195,247,0.4);
            }

            #lampa-monitor-v8 .mon-movie-section {
                display: flex;
                gap: 15px;
                margin-bottom: 15px;
                min-height: 110px;
            }

            #lampa-monitor-v8 .mon-poster {
                width: 75px;
                height: 110px;
                border-radius: 10px;
                background: linear-gradient(135deg, #1a1a2e, #16213e);
                background-size: cover;
                background-position: center;
                flex-shrink: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 15px rgba(0,0,0,0.5);
                border: 1px solid rgba(255,255,255,0.1);
                transition: all 0.3s;
                overflow: hidden;
            }

            #lampa-monitor-v8 .mon-poster:hover {
                transform: scale(1.05);
                border-color: rgba(79,195,247,0.5);
            }

            #lampa-monitor-v8 .mon-poster-placeholder {
                font-size: 28px;
                opacity: 0.3;
            }

            #lampa-monitor-v8 .mon-info {
                flex: 1;
                min-width: 0;
                display: flex;
                flex-direction: column;
                justify-content: center;
                gap: 8px;
            }

            #lampa-monitor-v8 .mon-movie-title {
                font-size: 15px;
                font-weight: 600;
                color: #fff;
                line-height: 1.4;
                display: -webkit-box;
                -webkit-line-clamp: 3;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }

            #lampa-monitor-v8 .mon-movie-meta {
                font-size: 11px;
                color: rgba(255,255,255,0.4);
                line-height: 1.3;
            }

            #lampa-monitor-v8 .mon-stats {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-top: 12px;
                padding-top: 12px;
                border-top: 1px solid rgba(255,255,255,0.05);
            }

            #lampa-monitor-v8 .mon-stat {
                font-size: 10px;
                color: rgba(255,255,255,0.3);
            }

            #lampa-monitor-v8 .mon-status {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 10px;
                color: #4caf50;
            }

            #lampa-monitor-v8 .mon-dot {
                width: 6px;
                height: 6px;
                border-radius: 50%;
                background: #4caf50;
                box-shadow: 0 0 8px #4caf50;
                animation: monitorPulse 2s infinite;
            }

            @keyframes monitorPulse {
                0%, 100% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.5; transform: scale(0.8); }
            }

            #lampa-monitor-v8 .mon-count {
                color: #4fc3f7;
                font-weight: 600;
            }

            #lampa-monitor-v8.hidden {
                transform: translateX(120%);
                opacity: 0;
                pointer-events: none;
            }

            #lampa-monitor-show-btn {
                position: fixed;
                top: 15px;
                right: 15px;
                z-index: 999998;
                background: rgba(15,15,25,0.95);
                border: 1px solid rgba(79,195,247,0.5);
                border-radius: 50%;
                width: 40px;
                height: 40px;
                display: none;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                font-size: 18px;
                color: #4fc3f7;
                transition: all 0.3s;
            }

            #lampa-monitor-show-btn:hover {
                transform: scale(1.1);
                box-shadow: 0 0 20px rgba(79,195,247,0.5);
            }
        `;
        document.head.appendChild(style);

        // Панель
        panel = document.createElement('div');
        panel.id = 'lampa-monitor-v8';
        panel.innerHTML = `
            <div class="mon-header">
                <div class="mon-title">🎬 LAMPA MONITOR</div>
                <button class="mon-close" id="monitor-close-btn">×</button>
            </div>
            <div class="mon-time-section">
                <span class="mon-time-label">Время работы:</span>
                <span class="mon-time-value" id="monitor-time">00:00:00</span>
            </div>
            <div class="mon-movie-section">
                <div class="mon-poster" id="monitor-poster">
                    <div class="mon-poster-placeholder">🎬</div>
                </div>
                <div class="mon-info">
                    <div class="mon-movie-title" id="monitor-title">Ожидание...</div>
                    <div class="mon-movie-meta" id="monitor-meta">Поиск фильма</div>
                </div>
            </div>
            <div class="mon-stats">
                <div class="mon-stat">
                    Просмотрено: <span class="mon-count" id="monitor-count">0</span>
                </div>
                <div class="mon-status">
                    <div class="mon-dot"></div>
                    <span>Активен</span>
                </div>
            </div>
        `;

        document.body.appendChild(panel);

        // Кнопка показать (когда панель скрыта)
        var showBtn = document.createElement('div');
        showBtn.id = 'lampa-monitor-show-btn';
        showBtn.innerHTML = '📊';
        showBtn.title = 'Показать монитор';
        document.body.appendChild(showBtn);

        // Элементы
        timeEl = document.getElementById('monitor-time');
        titleEl = document.getElementById('monitor-title');
        posterEl = document.getElementById('monitor-poster');
        metaEl = document.getElementById('monitor-meta');
        countEl = document.getElementById('monitor-count');

        // Обработчики
        document.getElementById('monitor-close-btn').addEventListener('click', function() {
            panel.classList.add('hidden');
            setTimeout(function() {
                panel.style.display = 'none';
                showBtn.style.display = 'flex';
            }, 300);
        });

        showBtn.addEventListener('click', function() {
            showBtn.style.display = 'none';
            panel.style.display = 'block';
            setTimeout(function() {
                panel.classList.remove('hidden');
            }, 10);
        });

        console.log('[Monitor] UI создан');
    }

    // ===== ПОДПИСКА НА СОБЫТИЯ LAMPA =====
    function setupLampaEvents() {
        try {
            // Проверяем что Lampa.Listener существует
            if (typeof Lampa !== 'undefined' && Lampa.Listener && typeof Lampa.Listener.follow === 'function') {
                console.log('[Monitor] Lampa.Listener доступен, подписываюсь на события...');

                // События для отслеживания фильмов
                var events = [
                    'full_content',      // Открытие полной информации
                    'card',              // Открытие карточки
                    'online',            // Онлайн просмотр
                    'torrent',           // Торрент
                    'video'              // Видео
                ];

                events.forEach(function(eventName) {
                    try {
                        Lampa.Listener.follow(eventName, function(data) {
                            console.log('[Monitor] Событие:', eventName, data);

                            // Извлекаем название фильма из события
                            if (data && (data.movie || data.card || data.title)) {
                                var movieData = data.movie || data.card || {};
                                var title = movieData.title ||
                                           movieData.name ||
                                           movieData.original_title ||
                                           data.title;

                                if (title) {
                                    updateMovie(title, 'Lampa event: ' + eventName);
                                }
                            }
                        });
                    } catch (e) {
                        console.warn('[Monitor] Ошибка подписки на ' + eventName + ':', e);
                    }
                });

                console.log('[Monitor] Подписки на события установлены');
            } else {
                console.warn('[Monitor] Lampa.Listener недоступен, использую только DOM');
            }
        } catch (e) {
            console.warn('[Monitor] Ошибка настройки событий:', e);
        }
    }

    // ===== ПОИСК ФИЛЬМА =====
    function findCurrentMovie() {
        var movie = null;

        // Метод 1: Из URL
        try {
            var params = new URLSearchParams(window.location.search);
            var urlTitle = params.get('title');

            if (urlTitle && urlTitle.length > 2 && urlTitle !== 'Главная') {
                var cleanTitle = urlTitle.replace(/\s*-\s*TMDB.*$/i, '').trim();
                if (cleanTitle && cleanTitle.length > 2) {
                    movie = {
                        title: cleanTitle,
                        source: 'URL'
                    };
                }
            }
        } catch (e) {}

        // Метод 2: Из DOM
        if (!movie) {
            var selectors = [
                '.full-start__title',
                '.full-start .title',
                '.full-start .name',
                '.card.focus .card__title',
                '.card.focus .card__name',
                '.card.active .card__title',
                '.card.active .card__name',
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
                        if (text.length > 2 &&
                            text !== 'Главная' &&
                            text !== 'Lampa' &&
                            text !== 'TMDB' &&
                            text !== 'undefined') {
                            movie = {
                                title: text,
                                source: selectors[i]
                            };
                            break;
                        }
                    }
                } catch (e) {}
            }
        }

        // Метод 3: document.title
        if (!movie) {
            var docTitle = document.title.replace(/\s*[-–—]\s*Lampa.*$/i, '').trim();
            if (docTitle && docTitle.length > 2 && docTitle !== 'Lampa') {
                movie = {
                    title: docTitle,
                    source: 'document.title'
                };
            }
        }

        return movie;
    }

    // ===== ПОИСК ПОСТЕРА =====
    function findPoster() {
        try {
            // Ищем TMDB постер
            var tmdbSelectors = [
                'img[src*="image.tmdb.org"]',
                'img[data-src*="image.tmdb.org"]',
                '.full-start__poster img',
                '.full-start img',
                '.card__img img',
                '.card__poster img',
                'img[class*="poster"]'
            ];

            for (var i = 0; i < tmdbSelectors.length; i++) {
                var img = document.querySelector(tmdbSelectors[i]);
                if (img) {
                    var src = img.src || img.getAttribute('data-src') || '';
                    if (src && src.indexOf('http') === 0) {
                        return src;
                    }
                }
            }

            // Фоновые изображения
            var bgElements = document.querySelectorAll('[style*="background-image"]');
            for (var j = 0; j < bgElements.length; j++) {
                var style = bgElements[j].getAttribute('style') || '';
                var match = style.match(/url\(['"]?([^'")\s]+)['"]?\)/);
                if (match && match[1] && match[1].indexOf('http') === 0) {
                    return match[1];
                }
            }

            return null;
        } catch (e) {
            return null;
        }
    }

    // ===== ОБНОВЛЕНИЕ ВРЕМЕНИ =====
    function updateTime() {
        if (!timeEl) return;

        var elapsed = Date.now() - startTime;
        var h = Math.floor(elapsed / 3600000);
        var m = Math.floor((elapsed % 3600000) / 60000);
        var s = Math.floor((elapsed % 60000) / 1000);

        timeEl.textContent =
            (h < 10 ? '0' : '') + h + ':' +
            (m < 10 ? '0' : '') + m + ':' +
            (s < 10 ? '0' : '') + s;
    }

    // ===== ОБНОВЛЕНИЕ ФИЛЬМА =====
    function updateMovieInfo() {
        var movie = findCurrentMovie();

        if (movie && movie.title && movie.title !== lastMovie) {
            lastMovie = movie.title;
            movieCount++;

            if (countEl) countEl.textContent = movieCount;
            if (titleEl) titleEl.textContent = movie.title;
            if (metaEl) metaEl.textContent = 'Источник: ' + movie.source;

            var poster = findPoster();
            if (poster && posterEl) {
                posterEl.style.backgroundImage = 'url("' + poster + '")';
                posterEl.style.backgroundSize = 'cover';
                posterEl.style.backgroundPosition = 'center';
                posterEl.innerHTML = '';
            }

            console.log('[Monitor] Фильм обновлён:', movie.title);
        }
    }

    // ===== ОБНОВЛЕНИЕ ФИЛЬМА (из события) =====
    function updateMovie(title, source) {
        if (title && title !== lastMovie) {
            lastMovie = title;
            movieCount++;

            if (countEl) countEl.textContent = movieCount;
            if (titleEl) titleEl.textContent = title;
            if (metaEl) metaEl.textContent = 'Источник: ' + (source || 'Lampa');

            console.log('[Monitor] Фильм (событие):', title);
        }
    }

    // ===== НАБЛЮДАТЕЛЬ DOM =====
    function setupObserver() {
        try {
            var observer = new MutationObserver(function(mutations) {
                var shouldUpdate = false;

                for (var i = 0; i < mutations.length; i++) {
                    var mutation = mutations[i];

                    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                        for (var j = 0; j < mutation.addedNodes.length; j++) {
                            var node = mutation.addedNodes[j];
                            if (node.nodeType === 1) {
                                if (node.matches('h1, h2, .title, .card, .full-start, .video-player, [class*="title"]')) {
                                    shouldUpdate = true;
                                    break;
                                }
                            }
                        }
                    }

                    if (shouldUpdate) break;
                }

                if (shouldUpdate) {
                    clearTimeout(setupObserver._timeout);
                    setupObserver._timeout = setTimeout(updateMovieInfo, 300);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['src', 'class']
            });

            console.log('[Monitor] DOM Observer настроен');
        } catch (e) {
            console.warn('[Monitor] Ошибка Observer:', e);
        }
    }

    // ===== ГЛАВНАЯ ФУНКЦИЯ =====
    function start() {
        console.log('[Monitor] Запуск...');

        createUI();
        setupLampaEvents();
        setupObserver();

        // Таймер
        setInterval(updateTime, 1000);

        // Обновление фильма
        setInterval(updateMovieInfo, 2000);

        // Первое обновление
        updateTime();
        updateMovieInfo();

        console.log('[Monitor] ✅ Запущен успешно!');
    }

    // ===== ИНИЦИАЛИЗАЦИЯ =====
    // Запускаем сразу если DOM готов
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(start, 1000);
        });
    } else {
        setTimeout(start, 1000);
    }

    // Экспорт для отладки
    window.LampaMonitor = {
        version: '8.0',
        update: updateMovieInfo,
        show: function() {
            if (panel) {
                panel.style.display = 'block';
                panel.classList.remove('hidden');
            }
        },
        hide: function() {
            if (panel) {
                panel.classList.add('hidden');
            }
        }
    };

})();
