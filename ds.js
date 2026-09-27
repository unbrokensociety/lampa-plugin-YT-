/**
 * Lampa Monitor v5.0
 * Полностью независимый от Lampa API
 * Работает через DOM + polling
 */

(function() {
    'use strict';

    // ===== АНТИ-ДУБЛЬ =====
    if (window.__lampaMonitorV5) {
        console.log('[Monitor] Уже запущен');
        return;
    }
    window.__lampaMonitorV5 = true;

    console.log('[Monitor] Загрузка v5.0...');

    // ===== КОНФИГ =====
    var config = {
        updateInterval: 2000,      // Обновление фильма (мс)
        timeInterval: 1000,        // Обновление времени (мс)
        posterSize: 'w200'         // Размер постера TMDB
    };

    // ===== ПЕРЕМЕННЫЕ =====
    var state = {
        startTime: Date.now(),
        currentMovie: null,
        currentPoster: null,
        movieCount: 0,
        isPanelVisible: true
    };

    var ui = {
        panel: null,
        timeEl: null,
        titleEl: null,
        posterEl: null,
        metaEl: null,
        statusEl: null,
        countEl: null
    };

    // ===== ОЖИДАНИЕ LAMPA =====
    function waitForLampa() {
        console.log('[Monitor] Ожидание загрузки Lampa...');

        var attempts = 0;
        var maxAttempts = 60; // 30 секунд максимум

        var checkInterval = setInterval(function() {
            attempts++;

            // Проверяем что приложение полностью загружено
            var indicators = [
                '.head',           // Шапка приложения
                '.menu',           // Меню
                '.card',           // Карточки фильмов
                '.scroll__body',   // Скролл
                'body > div'      // Любые div'ы
            ];

            var isLoaded = false;
            for (var i = 0; i < indicators.length; i++) {
                if (document.querySelector(indicators[i])) {
                    isLoaded = true;
                    break;
                }
            }

            // Проверяем через console.log от Lampa
            if (window.console && console.log.toString().indexOf('native') === -1) {
                // Console уже перехвачен - Lampa загружена
            }

            // Проверяем загрузку через app.min.js
            if (document.querySelector('script[src*="app.min.js"]')) {
                // Основной скрипт загружен
                isLoaded = true;
            }

            if (isLoaded || attempts >= maxAttempts) {
                clearInterval(checkInterval);
                console.log('[Monitor] Lampa загружена (попытка ' + attempts + ')');
                setTimeout(startMonitor, 2000);
            }

        }, 500);
    }

    // ===== СОЗДАНИЕ UI =====
    function createUI() {
        console.log('[Monitor] Создание интерфейса...');

        // Удаляем старый если есть
        var old = document.getElementById('lampa-monitor-v5');
        if (old) old.remove();

        // Стили
        var style = document.createElement('style');
        style.id = 'lampa-monitor-styles-v5';
        style.textContent = `
            #lampa-monitor-v5 {
                position: fixed;
                top: 15px;
                right: 15px;
                z-index: 999999;
                background: linear-gradient(135deg, rgba(15,15,25,0.98), rgba(25,25,40,0.95));
                border: 1px solid rgba(79,195,247,0.4);
                border-radius: 15px;
                padding: 18px;
                min-width: 320px;
                max-width: 400px;
                color: #fff;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 13px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.7), 0 0 20px rgba(79,195,247,0.1);
                backdrop-filter: blur(15px);
                transition: all 0.3s ease;
                pointer-events: auto;
            }

            #lampa-monitor-v5:hover {
                transform: translateY(-3px);
                box-shadow: 0 15px 50px rgba(0,0,0,0.9), 0 0 30px rgba(79,195,247,0.2);
                border-color: rgba(79,195,247,0.7);
            }

            #lampa-monitor-v5 .mon-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
                padding-bottom: 12px;
                border-bottom: 1px solid rgba(255,255,255,0.1);
            }

            #lampa-monitor-v5 .mon-title {
                font-size: 15px;
                font-weight: 700;
                color: #4fc3f7;
                letter-spacing: 1px;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            #lampa-monitor-v5 .mon-title::before {
                content: '🎬';
                font-size: 16px;
            }

            #lampa-monitor-v5 .mon-close {
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
                line-height: 1;
            }

            #lampa-monitor-v5 .mon-close:hover {
                background: rgba(255,0,0,0.2);
                color: #ff4444;
                transform: rotate(90deg);
            }

            #lampa-monitor-v5 .mon-time-section {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
                padding: 12px 15px;
                background: linear-gradient(135deg, rgba(79,195,247,0.15), rgba(79,195,247,0.05));
                border-radius: 10px;
                border: 1px solid rgba(79,195,247,0.2);
            }

            #lampa-monitor-v5 .mon-time-label {
                color: rgba(255,255,255,0.6);
                font-size: 12px;
                font-weight: 500;
            }

            #lampa-monitor-v5 .mon-time-value {
                font-family: 'Courier New', monospace;
                font-size: 24px;
                font-weight: 700;
                color: #4fc3f7;
                text-shadow: 0 0 20px rgba(79,195,247,0.4);
                letter-spacing: 2px;
            }

            #lampa-monitor-v5 .mon-movie-section {
                display: flex;
                gap: 15px;
                margin-bottom: 15px;
                min-height: 110px;
            }

            #lampa-monitor-v5 .mon-poster {
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
                position: relative;
                overflow: hidden;
            }

            #lampa-monitor-v5 .mon-poster:hover {
                transform: scale(1.05);
                border-color: rgba(79,195,247,0.5);
            }

            #lampa-monitor-v5 .mon-poster-placeholder {
                font-size: 28px;
                opacity: 0.3;
            }

            #lampa-monitor-v5 .mon-poster img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                border-radius: 9px;
            }

            #lampa-monitor-v5 .mon-info {
                flex: 1;
                min-width: 0;
                display: flex;
                flex-direction: column;
                justify-content: center;
                gap: 8px;
            }

            #lampa-monitor-v5 .mon-movie-title {
                font-size: 15px;
                font-weight: 600;
                color: #fff;
                line-height: 1.4;
                display: -webkit-box;
                -webkit-line-clamp: 3;
                -webkit-box-orient: vertical;
                overflow: hidden;
                text-shadow: 0 1px 3px rgba(0,0,0,0.5);
            }

            #lampa-monitor-v5 .mon-movie-meta {
                font-size: 11px;
                color: rgba(255,255,255,0.4);
                line-height: 1.3;
                display: flex;
                flex-direction: column;
                gap: 3px;
            }

            #lampa-monitor-v5 .mon-movie-meta span {
                display: block;
            }

            #lampa-monitor-v5 .mon-stats {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-top: 12px;
                padding-top: 12px;
                border-top: 1px solid rgba(255,255,255,0.05);
            }

            #lampa-monitor-v5 .mon-stat {
                font-size: 10px;
                color: rgba(255,255,255,0.3);
                display: flex;
                align-items: center;
                gap: 5px;
            }

            #lampa-monitor-v5 .mon-status {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 10px;
                color: #4caf50;
            }

            #lampa-monitor-v5 .mon-dot {
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

            #lampa-monitor-v5 .mon-count {
                color: #4fc3f7;
                font-weight: 600;
            }

            /* Мобильная адаптация */
            @media (max-width: 480px) {
                #lampa-monitor-v5 {
                    min-width: 250px;
                    max-width: 280px;
                    padding: 12px;
                    font-size: 11px;
                }

                #lampa-monitor-v5 .mon-time-value {
                    font-size: 18px;
                }

                #lampa-monitor-v5 .mon-poster {
                    width: 60px;
                    height: 85px;
                }

                #lampa-monitor-v5 .mon-movie-title {
                    font-size: 13px;
                }
            }

            /* Скрытие панели */
            #lampa-monitor-v5.hidden {
                transform: translateX(120%);
                opacity: 0;
                pointer-events: none;
            }

            /* Кнопка показать */
            #lampa-monitor-show {
                position: fixed;
                top: 15px;
                right: 15px;
                z-index: 999998;
                background: rgba(15,15,25,0.95);
                border: 1px solid rgba(79,195,247,0.5);
                border-radius: 50%;
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                font-size: 18px;
                transition: all 0.3s;
                color: #4fc3f7;
            }

            #lampa-monitor-show:hover {
                transform: scale(1.1);
                box-shadow: 0 0 20px rgba(79,195,247,0.5);
            }
        `;
        document.head.appendChild(style);

        // Создаем панель
        ui.panel = document.createElement('div');
        ui.panel.id = 'lampa-monitor-v5';
        ui.panel.innerHTML = `
            <div class="mon-header">
                <div class="mon-title">LAMPA MONITOR</div>
                <button class="mon-close" id="monitor-close" title="Скрыть">×</button>
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
                    <div class="mon-movie-title" id="monitor-title">
                        Ожидание данных...
                    </div>
                    <div class="mon-movie-meta" id="monitor-meta">
                        <span>Идет поиск фильма</span>
                    </div>
                </div>
            </div>

            <div class="mon-stats">
                <div class="mon-stat">
                    <span>Просмотрено:</span>
                    <span class="mon-count" id="monitor-count">0</span>
                </div>
                <div class="mon-status">
                    <div class="mon-dot"></div>
                    <span>Активен</span>
                </div>
            </div>
        `;

        document.body.appendChild(ui.panel);

        // Кнопка показать (когда панель скрыта)
        var showBtn = document.createElement('div');
        showBtn.id = 'lampa-monitor-show';
        showBtn.innerHTML = '📊';
        showBtn.style.display = 'none';
        showBtn.title = 'Показать монитор';
        document.body.appendChild(showBtn);

        // Получаем элементы
        ui.timeEl = document.getElementById('monitor-time');
        ui.titleEl = document.getElementById('monitor-title');
        ui.posterEl = document.getElementById('monitor-poster');
        ui.metaEl = document.getElementById('monitor-meta');
        ui.countEl = document.getElementById('monitor-count');

        // Обработчики
        document.getElementById('monitor-close').addEventListener('click', function() {
            ui.panel.classList.add('hidden');
            showBtn.style.display = 'flex';

            setTimeout(function() {
                ui.panel.style.display = 'none';
            }, 300);
        });

        showBtn.addEventListener('click', function() {
            showBtn.style.display = 'none';
            ui.panel.style.display = 'block';

            setTimeout(function() {
                ui.panel.classList.remove('hidden');
            }, 10);
        });

        console.log('[Monitor] Интерфейс создан');
    }

    // ===== ПОИСК ФИЛЬМА =====
    function findCurrentMovie() {
        var movie = null;

        // Метод 1: URL параметры
        try {
            var urlParams = new URLSearchParams(window.location.search);
            var urlTitle = urlParams.get('title');

            if (urlTitle && urlTitle.length > 2 && urlTitle !== 'Главная') {
                // Очищаем от "- TMDB"
                var cleanTitle = urlTitle.replace(/\s*-\s*TMDB.*$/i, '').trim();
                if (cleanTitle && cleanTitle.length > 2) {
                    movie = {
                        title: cleanTitle,
                        source: 'URL',
                        year: null,
                        poster: null
                    };
                }
            }
        } catch (e) {
            console.warn('[Monitor] URL parse error:', e);
        }

        // Метод 2: DOM — страница фильма
        if (!movie) {
            var selectors = [
                // Страница фильма
                '.full-start__title',
                '.full-start .title',
                '.full-start h1',
                '.full-start .name',

                // Карточка
                '.card.focus .card__title',
                '.card.focus .card__name',
                '.card.active .card__title',
                '.card.active .card__name',

                // Плеер
                '.video-player__title',
                '.player__title',
                '.player-title',

                // Общие
                'h1',
                '.title',
                '.movie-title'
            ];

            for (var i = 0; i < selectors.length; i++) {
                try {
                    var el = document.querySelector(selectors[i]);
                    if (el && el.textContent) {
                        var text = el.textContent.trim();

                        // Фильтры
                        if (text.length > 2 &&
                            text !== 'Главная' &&
                            text !== 'Lampa' &&
                            text !== 'TMDB' &&
                            text !== 'undefined' &&
                            !text.match(/^(Settings|Настройки)$/i)) {

                            movie = {
                                title: text,
                                source: selectors[i],
                                year: extractYear(el),
                                poster: null
                            };
                            break;
                        }
                    }
                } catch (e) {
                    // Продолжаем
                }
            }
        }

        // Метод 3: document.title
        if (!movie) {
            var docTitle = document.title.replace(/\s*[-–—]\s*Lampa.*$/i, '').trim();
            if (docTitle && docTitle.length > 2 && docTitle !== 'Lampa') {
                movie = {
                    title: docTitle,
                    source: 'document.title',
                    year: null,
                    poster: null
                };
            }
        }

        // Метод 4: Ищем в текущем маршруте
        if (!movie) {
            try {
                var hash = window.location.hash;
                var match = hash.match(/movie\/(\d+)/);
                if (match) {
                    movie = {
                        title: 'Фильм ID: ' + match[1],
                        source: 'route',
                        year: null,
                        poster: null
                    };
                }
            } catch (e) {}
        }

        return movie;
    }

    // ===== ИЗВЛЕЧЕНИЕ ГОДА =====
    function extractYear(element) {
        try {
            // Ищем год в тексте
            var text = element.textContent || '';
            var yearMatch = text.match(/\((\d{4})\)/);

            if (yearMatch) {
                return yearMatch[1];
            }

            // Ищем год в атрибутах
            var parent = element.parentElement;
            for (var i = 0; i < 3 && parent; i++) {
                var yearEl = parent.querySelector('[class*="year"], [data-year]');
                if (yearEl) {
                    var yearText = yearEl.textContent || yearEl.getAttribute('data-year') || '';
                    var yearMatch2 = yearText.match(/(\d{4})/);
                    if (yearMatch2) return yearMatch2[1];
                }
                parent = parent.parentElement;
            }

            return null;
        } catch (e) {
            return null;
        }
    }

    // ===== ПОИСК ПОСТЕРА =====
    function findPoster() {
        try {
            // Метод 1: Ищем TMDB постер в DOM
            var tmdbSelectors = [
                'img[src*="image.tmdb.org"]',
                'img[data-src*="image.tmdb.org"]',
                'img[srcset*="image.tmdb.org"]',
                '.full-start__poster img',
                '.full-start img[src*="tmdb"]',
                '.card__img img',
                '.card__poster img',
                'img[class*="poster"]',
                'img[src*="poster"]'
            ];

            for (var i = 0; i < tmdbSelectors.length; i++) {
                var img = document.querySelector(tmdbSelectors[i]);
                if (img) {
                    var src = img.src ||
                             img.getAttribute('data-src') ||
                             img.getAttribute('srcset') ||
                             '';

                    if (src && src.indexOf('http') === 0) {
                        // Увеличиваем размер если TMDB
                        if (src.indexOf('image.tmdb.org') !== -1) {
                            src = src.replace(/\/w\d+\//, '/' + config.posterSize + '/');
                        }
                        return src;
                    }
                }
            }

            // Метод 2: Фоновые изображения
            var bgElements = document.querySelectorAll('[style*="background-image"]');
            for (var j = 0; j < bgElements.length; j++) {
                var style = bgElements[j].getAttribute('style') || '';
                var match = style.match(/url\(['"]?([^'")\s]+)['"]?\)/);

                if (match && match[1]) {
                    var url = match[1];
                    if (url.indexOf('image.tmdb.org') !== -1 ||
                        url.indexOf('poster') !== -1) {
                        return url;
                    }
                }
            }

            // Метод 3: Ищем в data атрибутах
            var dataElements = document.querySelectorAll('[data-poster], [data-image]');
            for (var k = 0; k < dataElements.length; k++) {
                var posterUrl = dataElements[k].getAttribute('data-poster') ||
                               dataElements[k].getAttribute('data-image');
                if (posterUrl && posterUrl.indexOf('http') === 0) {
                    return posterUrl;
                }
            }

            return null;

        } catch (e) {
            console.warn('[Monitor] Poster search error:', e);
            return null;
        }
    }

    // ===== ПОЛУЧЕНИЕ ПОСТЕРА ЧЕРЕЗ TMDB API =====
    function getPosterFromTMDB(title) {
        // Возвращаем null — TMDB API требует ключ и имеет CORS ограничения
        // Мы полагаемся на постеры уже загруженные в Lampa
        return null;
    }

    // ===== ОБНОВЛЕНИЕ ВРЕМЕНИ =====
    function updateTime() {
        if (!ui.timeEl) return;

        try {
            var elapsed = Date.now() - state.startTime;
            var hours = Math.floor(elapsed / 3600000);
            var minutes = Math.floor((elapsed % 3600000) / 60000);
            var seconds = Math.floor((elapsed % 60000) / 1000);

            var timeString =
                String(hours).padStart(2, '0') + ':' +
                String(minutes).padStart(2, '0') + ':' +
                String(seconds).padStart(2, '0');

            ui.timeEl.textContent = timeString;
        } catch (e) {
            console.warn('[Monitor] Time update error:', e);
        }
    }

    // ===== ОБНОВЛЕНИЕ ИНФОРМАЦИИ О ФИЛЬМЕ =====
    function updateMovieInfo() {
        if (!ui.titleEl || !ui.metaEl) return;

        try {
            var movie = findCurrentMovie();

            if (movie && movie.title) {
                // Проверяем что фильм изменился
                if (!state.currentMovie || state.currentMovie.title !== movie.title) {
                    var isFirstDetection = !state.currentMovie;

                    state.currentMovie = movie;
                    state.movieCount++;
                    if (ui.countEl) {
                        ui.countEl.textContent = state.movieCount;
                    }

                    // Обновляем заголовок
                    ui.titleEl.textContent = movie.title;
                    ui.titleEl.title = movie.title;

                    // Обновляем метаданные
                    var metaParts = [];

                    if (movie.year) {
                        metaParts.push('📅 ' + movie.year);
                    }

                    if (movie.source) {
                        metaParts.push('🔍 ' + movie.source);
                    }

                    if (isFirstDetection) {
                        metaParts.push('🎬 Новый фильм');
                    }

                    ui.metaEl.innerHTML = metaParts.map(function(part) {
                        return '<span>' + part + '</span>';
                    }).join('');

                    // Обновляем постер
                    var poster = findPoster();
                    if (poster) {
                        updatePoster(poster);
                    } else {
                        resetPoster();
                    }

                    console.log('[Monitor] Фильм:', movie.title, '(источник:', movie.source + ')');
                }
            }
        } catch (e) {
            console.warn('[Monitor] Movie update error:', e);
        }
    }

    // ===== ОБНОВЛЕНИЕ ПОСТЕРА =====
    function updatePoster(url) {
        if (!ui.posterEl) return;

        try {
            // Проверяем CORS
            if (url.indexOf('image.tmdb.org') !== -1) {
                // Для TMDB используем прокси если есть CORS проблемы
                // Но пока просто пробуем загрузить
                var img = new Image();
                img.crossOrigin = 'anonymous';

                img.onload = function() {
                    ui.posterEl.innerHTML = '';
                    ui.posterEl.style.backgroundImage = 'url("' + url + '")';
                    ui.posterEl.style.backgroundSize = 'cover';
                    ui.posterEl.style.backgroundPosition = 'center';
                };

                img.onerror = function() {
                    // Если CORS ошибка — пробуем через прокси
                    var proxyUrl = 'https://images.weserv.nl/?url=' + encodeURIComponent(url);
                    ui.posterEl.innerHTML = '';
                    ui.posterEl.style.backgroundImage = 'url("' + proxyUrl + '")';
                    ui.posterEl.style.backgroundSize = 'cover';
                    ui.posterEl.style.backgroundPosition = 'center';
                };

                img.src = url;
            } else {
                // Обычное изображение
                ui.posterEl.innerHTML = '';
                ui.posterEl.style.backgroundImage = 'url("' + url + '")';
                ui.posterEl.style.backgroundSize = 'cover';
                ui.posterEl.style.backgroundPosition = 'center';
            }
        } catch (e) {
            console.warn('[Monitor] Poster update error:', e);
            resetPoster();
        }
    }

    // ===== СБРОС ПОСТЕРА =====
    function resetPoster() {
        if (!ui.posterEl) return;

        ui.posterEl.style.backgroundImage = 'none';
        ui.posterEl.innerHTML = '<div class="mon-poster-placeholder">🎬</div>';
    }

    // ===== НАБЛЮДАТЕЛЬ ЗА ИЗМЕНЕНИЯМИ =====
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
                                if (node.matches('h1, h2, .title, .card, .full-start, .video-player, [class*="title"], [class*="movie"]')) {
                                    shouldUpdate = true;
                                    break;
                                }
                            }
                        }
                    }

                    if (mutation.type === 'attributes' &&
                        (mutation.attributeName === 'src' || mutation.attributeName === 'class')) {
                        if (mutation.target.tagName === 'IMG' ||
                            mutation.target.className.indexOf('card') !== -1) {
                            shouldUpdate = true;
                        }
                    }

                    if (shouldUpdate) break;
                }

                if (shouldUpdate) {
                    // Дебаунс
                    clearTimeout(setupObserver._timeout);
                    setupObserver._timeout = setTimeout(updateMovieInfo, 300);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['src', 'class', 'style']
            });

            console.log('[Monitor] DOM Observer настроен');

        } catch (e) {
            console.warn('[Monitor] Observer setup error:', e);
            // Fallback — обновление каждые 3 секунды
            setInterval(updateMovieInfo, 3000);
        }
    }

    // ===== НАБЛЮДАТЕЛЬ ЗА URL =====
    function setupUrlObserver() {
        var lastUrl = window.location.href;

        setInterval(function() {
            if (window.location.href !== lastUrl) {
                lastUrl = window.location.href;
                console.log('[Monitor] URL изменен:', window.location.href);
                setTimeout(updateMovieInfo, 500);
            }
        }, 1000);
    }

    // ===== ЗАПУСК =====
    function startMonitor() {
        console.log('[Monitor] Запуск...');

        // Создаем UI
        createUI();

        // Запускаем обновление времени
        setInterval(updateTime, config.timeInterval);

        // Запускаем обновление фильма
        setInterval(updateMovieInfo, config.updateInterval);

        // Настраиваем наблюдателей
        setupObserver();
        setupUrlObserver();

        // Первое обновление
        updateTime();
        updateMovieInfo();

        console.log('[Monitor] Запущен успешно!');
        console.log('[Monitor] Время работы:', new Date(state.startTime).toLocaleTimeString());
    }

    // ===== ОБРАБОТКА ОШИБОК =====
    window.addEventListener('error', function(e) {
        if (e.filename && e.filename.indexOf('ds.js') !== -1) {
            console.error('[Monitor] Ошибка:', e.message);
        }
    });

    // ===== ЭКСПОРТ ДЛЯ ОТЛАДКИ =====
    window.LampaMonitor = {
        version: '5.0',
        getState: function() { return state; },
        updateMovie: updateMovieInfo,
        updateTime: updateTime,
        show: function() {
            ui.panel.style.display = 'block';
            ui.panel.classList.remove('hidden');
        },
        hide: function() {
            ui.panel.classList.add('hidden');
        }
    };

    // ===== ЗАПУСК =====
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            waitForLampa();
        });
    } else {
        waitForLampa();
    }

})();
