/**
 * Lampa Monitor v6.0 - Рабочая версия
 * Основано на анализе рабочих плагинов
 */

(function() {
    'use strict';

    console.log('[Monitor] Загрузка v6.0...');

    // ===== ОСНОВНОЙ КОД ПЛАГИНА =====
    function initMonitor() {
        console.log('[Monitor] Инициализация...');

        // Переменные
        let startTime = Date.now();
        let panel;
        let timeEl, titleEl, posterEl, metaEl;
        let lastMovie = '';
        let movieCount = 0;

        // ===== СОЗДАНИЕ UI =====
        function createUI() {
            // Удаляем старый если есть
            const old = document.getElementById('lampa-monitor-v6');
            if (old) old.remove();

            // Стили
            const style = document.createElement('style');
            style.textContent = `
                #lampa-monitor-v6 {
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

                #lampa-monitor-v6:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 15px 50px rgba(0,0,0,0.9), 0 0 30px rgba(79,195,247,0.2);
                    border-color: rgba(79,195,247,0.7);
                }

                #lampa-monitor-v6 .mon-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 15px;
                    padding-bottom: 12px;
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                }

                #lampa-monitor-v6 .mon-title {
                    font-size: 15px;
                    font-weight: 700;
                    color: #4fc3f7;
                    letter-spacing: 1px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                #lampa-monitor-v6 .mon-title::before {
                    content: '🎬';
                    font-size: 16px;
                }

                #lampa-monitor-v6 .mon-close {
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

                #lampa-monitor-v6 .mon-close:hover {
                    background: rgba(255,0,0,0.2);
                    color: #ff4444;
                    transform: rotate(90deg);
                }

                #lampa-monitor-v6 .mon-time-section {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 15px;
                    padding: 12px 15px;
                    background: linear-gradient(135deg, rgba(79,195,247,0.15), rgba(79,195,247,0.05));
                    border-radius: 10px;
                    border: 1px solid rgba(79,195,247,0.2);
                }

                #lampa-monitor-v6 .mon-time-label {
                    color: rgba(255,255,255,0.6);
                    font-size: 12px;
                    font-weight: 500;
                }

                #lampa-monitor-v6 .mon-time-value {
                    font-family: 'Courier New', monospace;
                    font-size: 24px;
                    font-weight: 700;
                    color: #4fc3f7;
                    text-shadow: 0 0 20px rgba(79,195,247,0.4);
                    letter-spacing: 2px;
                }

                #lampa-monitor-v6 .mon-movie-section {
                    display: flex;
                    gap: 15px;
                    margin-bottom: 15px;
                    min-height: 110px;
                }

                #lampa-monitor-v6 .mon-poster {
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

                #lampa-monitor-v6 .mon-poster:hover {
                    transform: scale(1.05);
                    border-color: rgba(79,195,247,0.5);
                }

                #lampa-monitor-v6 .mon-poster-placeholder {
                    font-size: 28px;
                    opacity: 0.3;
                }

                #lampa-monitor-v6 .mon-info {
                    flex: 1;
                    min-width: 0;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    gap: 8px;
                }

                #lampa-monitor-v6 .mon-movie-title {
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

                #lampa-monitor-v6 .mon-movie-meta {
                    font-size: 11px;
                    color: rgba(255,255,255,0.4);
                    line-height: 1.3;
                    display: flex;
                    flex-direction: column;
                    gap: 3px;
                }

                #lampa-monitor-v6 .mon-stats {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-top: 12px;
                    padding-top: 12px;
                    border-top: 1px solid rgba(255,255,255,0.05);
                }

                #lampa-monitor-v6 .mon-stat {
                    font-size: 10px;
                    color: rgba(255,255,255,0.3);
                    display: flex;
                    align-items: center;
                    gap: 5px;
                }

                #lampa-monitor-v6 .mon-status {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 10px;
                    color: #4caf50;
                }

                #lampa-monitor-v6 .mon-dot {
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

                #lampa-monitor-v6 .mon-count {
                    color: #4fc3f7;
                    font-weight: 600;
                }

                /* Мобильная адаптация */
                @media (max-width: 480px) {
                    #lampa-monitor-v6 {
                        min-width: 250px;
                        max-width: 280px;
                        padding: 12px;
                        font-size: 11px;
                    }

                    #lampa-monitor-v6 .mon-time-value {
                        font-size: 18px;
                    }

                    #lampa-monitor-v6 .mon-poster {
                        width: 60px;
                        height: 85px;
                    }

                    #lampa-monitor-v6 .mon-movie-title {
                        font-size: 13px;
                    }
                }

                /* Скрытие панели */
                #lampa-monitor-v6.hidden {
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
            panel = document.createElement('div');
            panel.id = 'lampa-monitor-v6';
            panel.innerHTML = `
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

            document.body.appendChild(panel);

            // Кнопка показать (когда панель скрыта)
            const showBtn = document.createElement('div');
            showBtn.id = 'lampa-monitor-show';
            showBtn.innerHTML = '📊';
            showBtn.style.display = 'none';
            showBtn.title = 'Показать монитор';
            document.body.appendChild(showBtn);

            // Получаем элементы
            timeEl = document.getElementById('monitor-time');
            titleEl = document.getElementById('monitor-title');
            posterEl = document.getElementById('monitor-poster');
            metaEl = document.getElementById('monitor-meta');
            const countEl = document.getElementById('monitor-count');

            // Обработчики
            document.getElementById('monitor-close').addEventListener('click', function() {
                panel.classList.add('hidden');
                showBtn.style.display = 'flex';

                setTimeout(function() {
                    panel.style.display = 'none';
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

        // ===== ПОИСК ФИЛЬМА =====
        function findCurrentMovie() {
            let movie = null;

            // Метод 1: URL параметры (как в рабочих плагинах)
            try {
                const urlParams = new URLSearchParams(window.location.search);
                const urlTitle = urlParams.get('title');

                if (urlTitle && urlTitle.length > 2 && urlTitle !== 'Главная') {
                    // Очищаем от "- TMDB"
                    const cleanTitle = urlTitle.replace(/\s*-\s*TMDB.*$/i, '').trim();
                    if (cleanTitle && cleanTitle.length > 2) {
                        movie = {
                            title: cleanTitle,
                            source: 'URL'
                        };
                    }
                }
            } catch (e) {
                console.warn('[Monitor] URL parse error:', e);
            }

            // Метод 2: DOM селекторы (из рабочих плагинов)
            if (!movie) {
                const selectors = [
                    // Страница фильма (как в cardify-free.js)
                    '.full-start__title',
                    '.full-start .title',
                    '.full-start h1',
                    '.full-start .name',

                    // Карточка (как в nova_skin.js)
                    '.card.focus .card__title',
                    '.card.focus .card__name',
                    '.card.active .card__title',
                    '.card.active .card__name',

                    // Плеер
                    '.video-player__title',
                    '.player__title',

                    // Общие
                    'h1',
                    '.title',
                    '.movie-title'
                ];

                for (let i = 0; i < selectors.length; i++) {
                    try {
                        const el = document.querySelector(selectors[i]);
                        if (el && el.textContent) {
                            const text = el.textContent.trim();

                            // Фильтры
                            if (text.length > 2 &&
                                text !== 'Главная' &&
                                text !== 'Lampa' &&
                                text !== 'TMDB' &&
                                text !== 'undefined' &&
                                !text.match(/^(Settings|Настройки)$/i)) {

                                movie = {
                                    title: text,
                                    source: selectors[i]
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
                const docTitle = document.title.replace(/\s*[-–—]\s*Lampa.*$/i, '').trim();
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
                // Ищем TMDB постер в DOM (как в рабочих плагинах)
                const tmdbSelectors = [
                    'img[src*="image.tmdb.org"]',
                    'img[data-src*="image.tmdb.org"]',
                    '.full-start__poster img',
                    '.full-start img[src*="tmdb"]',
                    '.card__img img',
                    '.card__poster img',
                    'img[class*="poster"]'
                ];

                for (let i = 0; i < tmdbSelectors.length; i++) {
                    const img = document.querySelector(tmdbSelectors[i]);
                    if (img) {
                        const src = img.src ||
                                   img.getAttribute('data-src') ||
                                   img.getAttribute('srcset') ||
                                   '';

                        if (src && src.indexOf('http') === 0) {
                            // Увеличиваем размер если TMDB
                            if (src.indexOf('image.tmdb.org') !== -1) {
                                return src.replace(/\/w\d+\//, '/w200/');
                            }
                            return src;
                        }
                    }
                }

                // Фоновые изображения
                const bgElements = document.querySelectorAll('[style*="background-image"]');
                for (let j = 0; j < bgElements.length; j++) {
                    const style = bgElements[j].getAttribute('style') || '';
                    const match = style.match(/url\(['"]?([^'")\s]+)['"]?\)/);

                    if (match && match[1]) {
                        const url = match[1];
                        if (url.indexOf('image.tmdb.org') !== -1 ||
                            url.indexOf('poster') !== -1) {
                            return url;
                        }
                    }
                }

                return null;

            } catch (e) {
                console.warn('[Monitor] Poster search error:', e);
                return null;
            }
        }

        // ===== ОБНОВЛЕНИЕ ВРЕМЕНИ =====
        function updateTime() {
            if (!timeEl) return;

            try {
                const elapsed = Date.now() - startTime;
                const hours = Math.floor(elapsed / 3600000);
                const minutes = Math.floor((elapsed % 3600000) / 60000);
                const seconds = Math.floor((elapsed % 60000) / 1000);

                const timeString =
                    String(hours).padStart(2, '0') + ':' +
                    String(minutes).padStart(2, '0') + ':' +
                    String(seconds).padStart(2, '0');

                timeEl.textContent = timeString;
            } catch (e) {
                console.warn('[Monitor] Time update error:', e);
            }
        }

        // ===== ОБНОВЛЕНИЕ ИНФОРМАЦИИ О ФИЛЬМЕ =====
        function updateMovieInfo() {
            if (!titleEl || !metaEl) return;

            try {
                const movie = findCurrentMovie();

                if (movie && movie.title) {
                    // Проверяем что фильм изменился
                    if (movie.title !== lastMovie) {
                        movieCount++;
                        const countEl = document.getElementById('monitor-count');
                        if (countEl) countEl.textContent = movieCount;

                        lastMovie = movie.title;

                        // Обновляем заголовок
                        titleEl.textContent = movie.title;
                        titleEl.title = movie.title;

                        // Обновляем метаданные
                        const metaParts = [];

                        if (movie.source) {
                            metaParts.push('🔍 Источник: ' + movie.source);
                        }

                        metaParts.push('🎬 Фильм #' + movieCount);

                        metaEl.innerHTML = metaParts.map(part => `<span>${part}</span>`).join('');

                        // Обновляем постер
                        const poster = findPoster();
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
            if (!posterEl) return;

            try {
                // Проверяем CORS
                if (url.indexOf('image.tmdb.org') !== -1) {
                    // Для TMDB используем прокси для избежания CORS
                    const img = new Image();
                    img.crossOrigin = 'anonymous';

                    img.onload = function() {
                        posterEl.innerHTML = '';
                        posterEl.style.backgroundImage = `url("${url}")`;
                        posterEl.style.backgroundSize = 'cover';
                        posterEl.style.backgroundPosition = 'center';
                    };

                    img.onerror = function() {
                        // Если CORS ошибка — пробуем через прокси
                        const proxyUrl = 'https://images.weserv.nl/?url=' + encodeURIComponent(url);
                        posterEl.innerHTML = '';
                        posterEl.style.backgroundImage = `url("${proxyUrl}")`;
                        posterEl.style.backgroundSize = 'cover';
                        posterEl.style.backgroundPosition = 'center';
                    };

                    img.src = url;
                } else {
                    // Обычное изображение
                    posterEl.innerHTML = '';
                    posterEl.style.backgroundImage = `url("${url}")`;
                    posterEl.style.backgroundSize = 'cover';
                    posterEl.style.backgroundPosition = 'center';
                }
            } catch (e) {
                console.warn('[Monitor] Poster update error:', e);
                resetPoster();
            }
        }

        // ===== СБРОС ПОСТЕРА =====
        function resetPoster() {
            if (!posterEl) return;

            posterEl.style.backgroundImage = 'none';
            posterEl.innerHTML = '<div class="mon-poster-placeholder">🎬</div>';
        }

        // ===== НАБЛЮДАТЕЛЬ ЗА ИЗМЕНЕНИЯМИ =====
        function setupObserver() {
            try {
                const observer = new MutationObserver(function(mutations) {
                    let shouldUpdate = false;

                    for (let i = 0; i < mutations.length; i++) {
                        const mutation = mutations[i];

                        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                            for (let j = 0; j < mutation.addedNodes.length; j++) {
                                const node = mutation.addedNodes[j];
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

        // ===== ЗАПУСК =====
        function start() {
            console.log('[Monitor] Запуск...');

            // Создаем UI
            createUI();

            // Запускаем обновление времени
            setInterval(updateTime, 1000);

            // Запускаем обновление фильма
            setInterval(updateMovieInfo, 2000);

            // Настраиваем наблюдателей
            setupObserver();

            // Первое обновление
            updateTime();
            updateMovieInfo();

            console.log('[Monitor] Запущен успешно!');
            console.log('[Monitor] Время работы:', new Date(startTime).toLocaleTimeString());
        }

        // ===== ИНИЦИАЛИЗАЦИЯ =====
        // Ждем полной загрузки Lampa
        function waitForLampa() {
            console.log('[Monitor] Ожидание Lampa...');

            let attempts = 0;
            const maxAttempts = 60; // 30 секунд максимум

            const checkInterval = setInterval(function() {
                attempts++;

                // Проверяем что приложение полностью загружено
                const indicators = [
                    '.head',           // Шапка приложения
                    '.menu',           // Меню
                    '.card',           // Карточки фильмов
                    '.scroll__body',   // Скролл
                    'body > div'      // Любые div'ы
                ];

                let isLoaded = false;
                for (let i = 0; i < indicators.length; i++) {
                    if (document.querySelector(indicators[i])) {
                        isLoaded = true;
                        break;
                    }
                }

                // Проверяем через Lampa API если доступно
                if (typeof Lampa !== 'undefined' && Lampa.Listener) {
                    isLoaded = true;
                }

                if (isLoaded || attempts >= maxAttempts) {
                    clearInterval(checkInterval);
                    console.log('[Monitor] Lampa загружена (попытка ' + attempts + ')');
                    setTimeout(start, 1000);
                }

            }, 500);
        }

        // Запускаем ожидание Lampa
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', waitForLampa);
        } else {
            waitForLampa();
        }

        // Экспорт для отладки
        window.LampaMonitor = {
            version: '6.0',
            update: updateMovieInfo,
            show: function() {
                if (panel) panel.style.display = 'block';
            },
            hide: function() {
                if (panel) panel.style.display = 'none';
            }
        };
    }

    // ===== ПРОВЕРКА И ЗАПУСК =====
    // Проверяем что мы в Lampa
    if (window.location.hostname.indexOf('lampa') !== -1 ||
        window.location.hostname.indexOf('cub') !== -1) {
        initMonitor();
    } else {
        console.log('[Monitor] Не Lampa, плагин не запущен');
    }

})();
