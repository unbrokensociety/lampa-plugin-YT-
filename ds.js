/**
 * Lampa Monitor - Плагин для отображения времени работы и текущего фильма
 * Версия: 2.1.0
 * Не использует API Lampa - работает через DOM
 */

(function() {
    'use strict';

    // Защита от повторного запуска
    if (window.__lampaMonitorRunning) {
        console.log('[Lampa Monitor] Уже запущен');
        return;
    }
    window.__lampaMonitorRunning = true;

    // Переменные
    let panel = null;
    let timeEl = null;
    let titleEl = null;
    let posterEl = null;
    let metaEl = null;
    let startTime = Date.now();
    let updateTimer = null;
    let domObserver = null;
    let lastTitle = '';
    let lastPoster = '';
    let isPanelVisible = true;

    /**
     * Ожидание инициализации Lampa
     */
    function waitForLampa() {
        console.log('[Lampa Monitor] Ожидание инициализации Lampa...');

        // Проверяем наличие элементов, которые появляются после инициализации
        const checkInterval = setInterval(function() {
            // Проверяем наличие контейнера приложения или карточек
            const hasApp = document.querySelector('.app, .lampa, #app, .scroll__body, .card, .full-start');

            if (hasApp || document.readyState === 'complete') {
                clearInterval(checkInterval);
                console.log('[Lampa Monitor] Lampa инициализирована');

                // Дополнительная задержка для полного рендера
                setTimeout(function() {
                    initMonitor();
                }, 1000);
            }
        }, 500);

        // Максимальное время ожидания - 30 секунд
        setTimeout(function() {
            clearInterval(checkInterval);
            if (!panel) {
                console.log('[Lampa Monitor] Таймаут - запускаю принудительно');
                initMonitor();
            }
        }, 30000);
    }

    /**
     * Инициализация монитора
     */
    function initMonitor() {
        createPanel();
        startMonitoring();
        console.log('[Lampa Monitor] Запущен успешно');
    }

    /**
     * Создание панели интерфейса
     */
    function createPanel() {
        if (panel) return;

        // Удаляем старые стили, если есть
        const oldStyle = document.getElementById('lampa-monitor-styles');
        if (oldStyle) oldStyle.remove();

        // Стили
        const style = document.createElement('style');
        style.id = 'lampa-monitor-styles';
        style.textContent = `
            #lampa-monitor-panel {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 999999;
                background: linear-gradient(135deg, rgba(15, 15, 25, 0.97), rgba(30, 30, 45, 0.95));
                border: 1px solid rgba(79, 195, 247, 0.3);
                border-radius: 15px;
                padding: 18px;
                min-width: 300px;
                max-width: 400px;
                color: #fff;
                font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(79, 195, 247, 0.1);
                backdrop-filter: blur(15px);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                user-select: none;
                animation: lampaMonitorSlideIn 0.5s ease-out;
            }

            @keyframes lampaMonitorSlideIn {
                from {
                    opacity: 0;
                    transform: translateX(50px);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }

            #lampa-monitor-panel:hover {
                transform: translateY(-2px);
                box-shadow: 0 12px 40px rgba(0, 0, 0, 0.9), 0 0 20px rgba(79, 195, 247, 0.2);
                border-color: rgba(79, 195, 247, 0.6);
            }

            #lampa-monitor-panel .lm-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
                padding-bottom: 12px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }

            #lampa-monitor-panel .lm-title {
                font-size: 14px;
                font-weight: 600;
                color: #4fc3f7;
                display: flex;
                align-items: center;
                gap: 8px;
                letter-spacing: 0.5px;
            }

            #lampa-monitor-panel .lm-close {
                background: none;
                border: none;
                color: rgba(255, 255, 255, 0.4);
                font-size: 24px;
                cursor: pointer;
                padding: 0;
                width: 28px;
                height: 28px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: all 0.2s;
                line-height: 1;
            }

            #lampa-monitor-panel .lm-close:hover {
                color: #fff;
                background: rgba(255, 255, 255, 0.1);
                transform: rotate(90deg);
            }

            #lampa-monitor-panel .lm-time-section {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
                padding: 12px;
                background: rgba(79, 195, 247, 0.1);
                border-radius: 10px;
                border: 1px solid rgba(79, 195, 247, 0.2);
            }

            #lampa-monitor-panel .lm-time-label {
                font-size: 13px;
                color: rgba(255, 255, 255, 0.7);
                font-weight: 500;
            }

            #lampa-monitor-panel .lm-time-value {
                font-family: 'Courier New', monospace;
                font-size: 22px;
                font-weight: 700;
                color: #4fc3f7;
                text-shadow: 0 0 15px rgba(79, 195, 247, 0.5);
                letter-spacing: 1px;
            }

            #lampa-monitor-panel .lm-movie-section {
                display: flex;
                gap: 15px;
                margin-bottom: 15px;
            }

            #lampa-monitor-panel .lm-poster {
                width: 80px;
                height: 120px;
                border-radius: 10px;
                background: linear-gradient(135deg, #1a1a2e, #16213e);
                background-size: cover;
                background-position: center;
                flex-shrink: 0;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
                border: 1px solid rgba(255, 255, 255, 0.1);
                transition: all 0.3s;
                position: relative;
                overflow: hidden;
            }

            #lampa-monitor-panel .lm-poster:hover {
                transform: scale(1.05);
                border-color: rgba(79, 195, 247, 0.5);
            }

            #lampa-monitor-panel .lm-poster .lm-poster-placeholder {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 30px;
                opacity: 0.3;
            }

            #lampa-monitor-panel .lm-info {
                    flex: 1;
                    min-width: 0;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    gap: 8px;
                }

            #lampa-monitor-panel .lm-movie-title {
                font-size: 15px;
                font-weight: 600;
                color: #fff;
                line-height: 1.4;
                display: -webkit-box;
                -webkit-line-clamp: 3;
                -webkit-box-orient: vertical;
                overflow: hidden;
                text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
            }

            #lampa-monitor-panel .lm-movie-meta {
                font-size: 12px;
                color: rgba(255, 255, 255, 0.5);
                line-height: 1.4;
            }

            #lampa-monitor-panel .lm-status {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 11px;
                color: rgba(255, 255, 255, 0.4);
                padding-top: 12px;
                border-top: 1px solid rgba(255, 255, 255, 0.05);
            }

            #lampa-monitor-panel .lm-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #4caf50;
                box-shadow: 0 0 8px #4caf50;
                animation: lampaMonitorBlink 2s infinite;
            }

            @keyframes lampaMonitorBlink {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.3; }
            }

            #lampa-monitor-panel .lm-minimized {
                min-width: auto;
                padding: 12px 18px;
            }

            #lampa-monitor-panel .lm-minimized .lm-movie-section,
            #lampa-monitor-panel .lm-minimized .lm-status {
                display: none;
            }

            #lampa-monitor-panel .lm-toggle {
                position: absolute;
                top: 50%;
                left: -30px;
                transform: translateY(-50%);
                background: rgba(79, 195, 247, 0.8);
                color: white;
                border: none;
                border-radius: 5px 0 0 5px;
                padding: 8px 4px;
                cursor: pointer;
                font-size: 10px;
                writing-mode: vertical-rl;
                text-orientation: mixed;
                transition: all 0.3s;
            }

            #lampa-monitor-panel .lm-toggle:hover {
                background: rgba(79, 195, 247, 1);
                padding-left: 8px;
            }
        `;
        document.head.appendChild(style);

        // Создаем панель
        panel = document.createElement('div');
        panel.id = 'lampa-monitor-panel';
        panel.innerHTML = `
            <button class="lm-toggle" id="lm-toggle-btn">СВЕРНУТЬ</button>
            <div class="lm-header">
                <div class="lm-title">
                    <span>🎬</span>
                    <span>LAMPA MONITOR</span>
                </div>
                <button class="lm-close" id="lm-close-btn">×</button>
            </div>
            <div class="lm-time-section">
                <span class="lm-time-label">Время работы:</span>
                <span class="lm-time-value" id="lm-time">00:00:00</span>
            </div>
            <div class="lm-movie-section">
                <div class="lm-poster" id="lm-poster">
                    <div class="lm-poster-placeholder">🎬</div>
                </div>
                <div class="lm-info">
                    <div class="lm-movie-title" id="lm-title">Определение фильма...</div>
                    <div class="lm-movie-meta" id="lm-meta">Идет поиск данных</div>
                </div>
            </div>
            <div class="lm-status">
                <div class="lm-dot"></div>
                <span>Мониторинг активен</span>
            </div>
        `;

        // Добавляем в DOM
        document.body.appendChild(panel);

        // Получаем элементы
        timeEl = document.getElementById('lm-time');
        titleEl = document.getElementById('lm-title');
        posterEl = document.getElementById('lm-poster');
        metaEl = document.getElementById('lm-meta');

        // Обработчики
        document.getElementById('lm-close-btn').addEventListener('click', function() {
            stopMonitoring();
            panel.style.display = 'none';
        });

        document.getElementById('lm-toggle-btn').addEventListener('click', function() {
            panel.classList.toggle('lm-minimized');
            this.textContent = panel.classList.contains('lm-minimized') ? 'РАЗВЕРНУТЬ' : 'СВЕРНУТЬ';
        });

        console.log('[Lampa Monitor] Панель создана');
    }

    /**
     * Запуск мониторинга
     */
    function startMonitoring() {
        if (updateTimer) return;

        // Обновление времени каждую секунду
        updateTimer = setInterval(updateTime, 1000);

        // Настройка наблюдателя за изменениями DOM
        setupDomObserver();

        // Первое обновление
        updateTime();
        updateMovieInfo();

        console.log('[Lampa Monitor] Мониторинг запущен');
    }

    /**
     * Остановка мониторинга
     */
    function stopMonitoring() {
        if (updateTimer) {
            clearInterval(updateTimer);
            updateTimer = null;
        }

        if (domObserver) {
            domObserver.disconnect();
            domObserver = null;
        }

        console.log('[Lampa Monitor] Мониторинг остановлен');
    }

    /**
     * Обновление времени
     */
    function updateTime() {
        try {
            const elapsed = Date.now() - startTime;
            const hours = Math.floor(elapsed / 3600000);
            const minutes = Math.floor((elapsed % 3600000) / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);

            const timeStr =
                String(hours).padStart(2, '0') + ':' +
                String(minutes).padStart(2, '0') + ':' +
                String(seconds).padStart(2, '0');

            if (timeEl) timeEl.textContent = timeStr;
        } catch (e) {
            console.error('[Lampa Monitor] Ошибка обновления времени:', e);
        }
    }

    /**
     * Обновление информации о фильме
     */
    function updateMovieInfo() {
        try {
            const movieInfo = findCurrentMovie();

            if (movieInfo && movieInfo.title && movieInfo.title !== lastTitle) {
                lastTitle = movieInfo.title;

                if (titleEl) {
                    titleEl.textContent = movieInfo.title;
                    titleEl.title = movieInfo.title;
                }

                if (metaEl) {
                    metaEl.textContent = movieInfo.meta || 'Фильм определен';
                }

                if (movieInfo.poster && movieInfo.poster !== lastPoster) {
                    lastPoster = movieInfo.poster;
                    if (posterEl) {
                        posterEl.style.backgroundImage = `url('${movieInfo.poster}')`;
                        posterEl.innerHTML = '';
                    }
                }

                console.log('[Lampa Monitor] Фильм:', movieInfo.title);
            }
        } catch (e) {
            console.error('[Lampa Monitor] Ошибка обновления фильма:', e);
        }
    }

    /**
     * Поиск текущего фильма
     */
    function findCurrentMovie() {
        // Метод 1: Из URL
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const urlTitle = urlParams.get('title');

            if (urlTitle && urlTitle !== 'Главная - TMDB' && urlTitle.length > 2 && urlTitle !== 'Главная') {
                return {
                    title: urlTitle,
                    poster: findPosterFromDom(),
                    meta: 'Из URL'
                };
            }
        } catch (e) {}

        // Метод 2: Из DOM - полная страница фильма
        const fullStartSelectors = [
            '.full-start__title',
            '.full-start .title',
            '.full-start h1',
            '.full-start .name'
        ];

        for (const selector of fullStartSelectors) {
            const el = document.querySelector(selector);
            if (el && el.textContent.trim().length > 2) {
                return {
                    title: el.textContent.trim(),
                    poster: findPosterFromDom(),
                    meta: 'Страница фильма'
                };
            }
        }

        // Метод 3: Из DOM - заголовок плеера
        const playerSelectors = [
            '.video-player__title',
            '.player__title',
            '.player-title',
            '.video-title'
        ];

        for (const selector of playerSelectors) {
            const el = document.querySelector(selector);
            if (el && el.textContent.trim().length > 2) {
                return {
                    title: el.textContent.trim(),
                    poster: findPosterFromDom(),
                    meta: 'Из плеера'
                };
            }
        }

        // Метод 4: Из DOM - активная карточка
        const activeCardSelectors = [
            '.card.focus .card__title',
            '.card.active .card__title',
            '.card.focus .card__name',
            '.card.active .card__name'
        ];

        for (const selector of activeCardSelectors) {
            const el = document.querySelector(selector);
            if (el && el.textContent.trim().length > 2) {
                return {
                    title: el.textContent.trim(),
                    poster: findPosterFromDom(),
                    meta: 'Активная карточка'
                };
            }
        }

        // Метод 5: Первый h1 или .title
        const generalSelectors = ['h1', '.title', '.movie-title'];

        for (const selector of generalSelectors) {
            const el = document.querySelector(selector);
            if (el && el.textContent.trim().length > 2 &&
                !el.textContent.includes('Главная') &&
                !el.textContent.includes('Lampa')) {
                return {
                    title: el.textContent.trim(),
                    poster: findPosterFromDom(),
                    meta: 'Общий поиск'
                };
            }
        }

        return null;
    }

    /**
     * Поиск постера в DOM
     */
    function findPosterFromDom() {
        // Ищем TMDB изображения
        const tmdbSelectors = [
            'img[src*="image.tmdb.org"]',
            'img[src*="themoviedb"]',
            'img[data-src*="image.tmdb.org"]',
            'img[srcset*="image.tmdb.org"]'
        ];

        for (const selector of tmdbSelectors) {
            const img = document.querySelector(selector);
            if (img) {
                return img.src || img.getAttribute('data-src');
            }
        }

        // Ищем по классу poster
        const posterSelectors = [
            '.full-start__poster img',
            '.full-start img',
            '.card__img img',
            '.card__poster img',
            'img[class*="poster"]',
            'img[class*="backdrop"]'
        ];

        for (const selector of posterSelectors) {
            const img = document.querySelector(selector);
            if (img && img.src && img.src.startsWith('http')) {
                return img.src;
            }
        }

        // Ищем фоновые изображения
        const bgElements = document.querySelectorAll('[style*="background-image"]');
        for (const el of bgElements) {
            const style = el.getAttribute('style') || '';
            const match = style.match(/url\(['"]?([^'")]+)['"]?\)/);
            if (match && match[1] && (match[1].includes('tmdb') || match[1].includes('image'))) {
                return match[1];
            }
        }

        return null;
    }

    /**
     * Настройка наблюдателя за DOM
     */
    function setupDomObserver() {
        if (domObserver) return;

        try {
            domObserver = new MutationObserver(function(mutations) {
                let shouldUpdate = false;

                for (const mutation of mutations) {
                    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                        for (const node of mutation.addedNodes) {
                            if (node.nodeType === 1) {
                                // Проверяем, добавлены ли релевантные элементы
                                if (node.matches('h1, h2, .title, .card, .full-start, .video-player, [class*="title"], [class*="movie"], [class*="card"]')) {
                                    shouldUpdate = true;
                                    break;
                                }
                            }
                        }
                    }

                    if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
                        const target = mutation.target;
                        if (target.tagName === 'IMG' && target.src && target.src.includes('tmdb')) {
                            shouldUpdate = true;
                        }
                    }

                    if (shouldUpdate) break;
                }

                if (shouldUpdate) {
                    // Дебаунс - обновляем не чаще чем раз в 500мс
                    clearTimeout(setupDomObserver._timeout);
                    setupDomObserver._timeout = setTimeout(updateMovieInfo, 500);
                }
            });

            // Наблюдаем за изменениями
            domObserver.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['src', 'class', 'style']
            });

            console.log('[Lampa Monitor] DOM Observer настроен');
        } catch (e) {
            console.error('[Lampa Monitor] Ошибка настройки DOM Observer:', e);
            // Fallback - обновление каждые 3 секунды
            setInterval(updateMovieInfo, 3000);
        }
    }

    /**
     * Обработка URL изменений
     */
    function setupUrlObserver() {
        let lastUrl = window.location.href;

        // Проверяем URL каждые 2 секунды
        setInterval(function() {
            if (window.location.href !== lastUrl) {
                lastUrl = window.location.href;
                console.log('[Lampa Monitor] URL изменен:', window.location.href);
                setTimeout(updateMovieInfo, 1000);
            }
        }, 2000);
    }

    // Запускаем
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', waitForLampa);
    } else {
        waitForLampa();
    }

    // Обработка ошибок
    window.addEventListener('error', function(e) {
        if (e.filename && e.filename.includes('lampa-monitor')) {
            console.error('[Lampa Monitor] Ошибка:', e.message);
        }
    });

    // Экспорт для отладки
    window.lampaMonitor = {
        stop: stopMonitoring,
        start: startMonitoring,
        update: updateMovieInfo,
        getPanel: function() { return panel; }
    };

})();
