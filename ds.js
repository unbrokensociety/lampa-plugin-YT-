// lampa-monitor.js
// Плагин для отображения времени работы и текущего фильма в Lampa

(function() {
    'use strict';

    // Защита от повторного запуска
    if (window.__lampaMonitorLoaded) {
        console.log('Lampa Monitor уже загружен');
        return;
    }
    window.__lampaMonitorLoaded = true;

    // Переменные
    let startTime = Date.now();
    let updateInterval = null;
    let panel = null;
    let timeEl = null;
    let titleEl = null;
    let posterEl = null;
    let metaEl = null;
    let lastTitle = '';

    // Функция создания панели
    function createPanel() {
        if (panel) return;

        // Стили
        const style = document.createElement('style');
        style.id = 'lampa-monitor-style';
        style.textContent = `
            #lampa-monitor {
                position: fixed;
                top: 15px;
                right: 15px;
                z-index: 999999;
                background: linear-gradient(145deg, rgba(20, 20, 30, 0.95), rgba(40, 40, 55, 0.9));
                border: 1px solid rgba(255, 255, 255, 0.15);
                border-radius: 12px;
                padding: 15px;
                min-width: 280px;
                max-width: 380px;
                color: #fff;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
                backdrop-filter: blur(12px);
                transition: all 0.3s ease;
                user-select: none;
                pointer-events: auto;
            }
            #lampa-monitor:hover {
                transform: translateY(-2px);
                box-shadow: 0 12px 40px rgba(0, 0, 0, 0.8);
            }
            #lampa-monitor .lm-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
                padding-bottom: 10px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }
            #lampa-monitor .lm-title {
                font-size: 14px;
                font-weight: 600;
                color: #4fc3f7;
            }
            #lampa-monitor .lm-close {
                background: none;
                border: none;
                color: rgba(255, 255, 255, 0.5);
                font-size: 22px;
                cursor: pointer;
                padding: 0;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            #lampa-monitor .lm-close:hover {
                color: #fff;
            }
            #lampa-monitor .lm-time {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 12px;
                font-size: 13px;
                color: #ccc;
            }
            #lampa-monitor .lm-time-value {
                font-family: 'SF Mono', Menlo, Consolas, monospace;
                font-size: 20px;
                font-weight: 700;
                color: #4fc3f7;
                text-shadow: 0 0 10px rgba(79, 195, 247, 0.3);
            }
            #lampa-monitor .lm-movie {
                display: flex;
                gap: 12px;
                align-items: flex-start;
            }
            #lampa-monitor .lm-poster {
                width: 72px;
                height: 108px;
                border-radius: 8px;
                background: linear-gradient(45deg, #2a2a3a, #3a3a4a);
                background-size: cover;
                background-position: center;
                flex-shrink: 0;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
                transition: transform 0.3s ease;
            }
            #lampa-monitor .lm-poster:hover {
                transform: scale(1.05);
            }
            #lampa-monitor .lm-poster:empty::after {
                content: '🎬';
                font-size: 24px;
                color: rgba(255, 255, 255, 0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100%;
            }
            #lampa-monitor .lm-info {
                    flex: 1;
                    min-width: 0;
                }
            #lampa-monitor .lm-movie-title {
                font-size: 14px;
                font-weight: 600;
                color: #fff;
                margin-bottom: 6px;
                line-height: 1.3;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }
            #lampa-monitor .lm-movie-meta {
                font-size: 11px;
                color: rgba(255, 255, 255, 0.6);
                line-height: 1.4;
            }
            #lampa-monitor .lm-stats {
                display: flex;
                justify-content: space-between;
                margin-top: 12px;
                padding-top: 10px;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
                font-size: 11px;
                color: rgba(255, 255, 255, 0.4);
            }
            #lampa-monitor .lm-status {
                display: flex;
                align-items: center;
                gap: 6px;
                margin-top: 8px;
                font-size: 11px;
                color: #4caf50;
            }
            #lampa-monitor .lm-dot {
                width: 6px;
                height: 6px;
                border-radius: 50%;
                background: #4caf50;
                animation: lmPulse 2s infinite;
            }
            @keyframes lmPulse {
                0%, 100% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.6; transform: scale(0.8); }
            }
            #lampa-monitor.lm-minimized {
                min-width: auto;
                padding: 10px 15px;
            }
            #lampa-monitor.lm-minimized .lm-movie,
            #lampa-monitor.lm-minimized .lm-stats {
                display: none;
            }
        `;
        document.head.appendChild(style);

        // Панель
        panel = document.createElement('div');
        panel.id = 'lampa-monitor';
        panel.innerHTML = `
            <div class="lm-header">
                <div class="lm-title">🎬 Lampa Monitor</div>
                <button class="lm-close" id="lm-close">×</button>
            </div>
            <div class="lm-time">
                <span>⏱</span>
                <span class="lm-time-value" id="lm-time">00:00:00</span>
            </div>
            <div class="lm-movie">
                <div class="lm-poster" id="lm-poster"></div>
                <div class="lm-info">
                    <div class="lm-movie-title" id="lm-title">Ожидание данных...</div>
                    <div class="lm-movie-meta" id="lm-meta">Ищу текущий фильм</div>
                </div>
            </div>
            <div class="lm-status">
                <div class="lm-dot"></div>
                <span>Мониторинг активен</span>
            </div>
            <div class="lm-stats">
                <span>Версия: 1.0.0</span>
            </div>
        `;

        document.body.appendChild(panel);

        // Элементы
        timeEl = panel.querySelector('#lm-time');
        titleEl = panel.querySelector('#lm-title');
        posterEl = panel.querySelector('#lm-poster');
        metaEl = panel.querySelector('#lm-meta');

        // Закрытие
        panel.querySelector('#lm-close').addEventListener('click', function() {
            panel.style.display = 'none';
            stopMonitoring();
        });

        console.log('[Lampa Monitor] Панель создана');
    }

    // Функция поиска текущего фильма
    function findCurrentMovie() {
        try {
            // Селекторы для поиска названия фильма (приоритет от наиболее специфичных)
            const titleSelectors = [
                // Приоритетные селекторы Lampa
                '.full-start__title',
                '.card__title',
                '.video-player__title',
                '.player__title',
                '.card__name',
                '.card__poster-title',
                
                // Общие селекторы
                'h1.title',
                'h2.title',
                '.movie-title',
                '.film-title',
                '[data-title]',
                
                // Fallback селекторы
                'h1',
                'h2',
                '[class*="title"]'
            ];

            let foundTitle = null;
            let foundElement = null;

            for (const selector of titleSelectors) {
                const elements = document.querySelectorAll(selector);
                for (const el of elements) {
                    const text = el.textContent || el.innerText || el.getAttribute('data-title') || '';
                    const cleanText = text.trim();
                    
                    if (cleanText && cleanText.length > 2 && cleanText !== 'Lampa') {
                        foundTitle = cleanText;
                        foundElement = el;
                        break;
                    }
                }
                if (foundTitle) break;
            }

            if (!foundTitle) return null;

            // Поиск постера
            let posterUrl = findPoster(foundElement);

            // Поиск дополнительной информации
            let meta = findMeta(foundElement);

            return {
                title: foundTitle,
                poster: posterUrl,
                meta: meta
            };
        } catch (e) {
            console.warn('[Lampa Monitor] Ошибка поиска фильма:', e);
            return null;
        }
    }

    // Функция поиска постера
    function findPoster(titleElement) {
        try {
            // Если есть элемент заголовка, ищем постер рядом
            if (titleElement) {
                // Селекторы для постера
                const posterSelectors = [
                    '.full-start__poster img',
                    '.card__img img',
                    '.card__poster img',
                    '.player__poster img',
                    '.video-player__poster img',
                    '[class*="poster"] img',
                    'img[class*="poster"]',
                    'img[src*="poster"]',
                    'img[src*="image.tmdb"]'
                ];

                for (const selector of posterSelectors) {
                    const img = document.querySelector(selector);
                    if (img && img.src && img.src.startsWith('http')) {
                        return img.src;
                    }
                }

                // Поиск в родительском элементе
                let parent = titleElement.parentElement;
                for (let i = 0; i < 3 && parent; i++) {
                    const img = parent.querySelector('img');
                    if (img && img.src && img.src.startsWith('http')) {
                        return img.src;
                    }
                    parent = parent.parentElement;
                }
            }

            // Поиск фонового изображения
            const bgElements = document.querySelectorAll('[style*="background-image"]');
            for (const el of bgElements) {
                const style = el.getAttribute('style') || '';
                const match = style.match(/url\(['"]?([^'")]+)['"]?\)/);
                if (match && match[1] && (match[1].includes('tmdb') || match[1].includes('poster') || match[1].includes('image'))) {
                    return match[1];
                }
            }

            return null;
        } catch (e) {
            console.warn('[Lampa Monitor] Ошибка поиска постера:', e);
            return null;
        }
    }

    // Функция поиска метаданных
    function findMeta(titleElement) {
        try {
            const metaSelectors = [
                '.full-start__details',
                '.card__details',
                '.card__year',
                '.card__genre',
                '[class*="year"]',
                '[class*="genre"]',
                '[class*="details"]'
            ];

            for (const selector of metaSelectors) {
                const el = document.querySelector(selector);
                if (el && el.textContent.trim()) {
                    return el.textContent.trim();
                }
            }

            return null;
        } catch (e) {
            return null;
        }
    }

    // Функция обновления времени
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
            console.warn('[Lampa Monitor] Ошибка обновления времени:', e);
        }
    }

    // Функция обновления информации о фильме
    function updateMovieInfo() {
        try {
            const movieInfo = findCurrentMovie();

            if (movieInfo && movieInfo.title !== lastTitle) {
                lastTitle = movieInfo.title;
                
                if (titleEl) {
                    titleEl.textContent = movieInfo.title;
                    titleEl.title = movieInfo.title; // Tooltip с полным названием
                }
                
                if (metaEl) {
                    metaEl.textContent = movieInfo.meta || 'Фильм определен';
                }
                
                if (posterEl) {
                    if (movieInfo.poster) {
                        posterEl.style.backgroundImage = `url('${movieInfo.poster}')`;
                        posterEl.title = 'Постер: ' + movieInfo.title;
                    } else {
                        posterEl.style.backgroundImage = 'none';
                        posterEl.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:24px;opacity:0.3;">🎬</div>';
                    }
                }

                console.log('[Lampa Monitor] Фильм обновлен:', movieInfo.title);
            }
        } catch (e) {
            console.warn('[Lampa Monitor] Ошибка обновления фильма:', e);
        }
    }

    // Наблюдатель за изменениями DOM
    function setupMutationObserver() {
        try {
            const observer = new MutationObserver(function(mutations) {
                let shouldUpdate = false;
                
                for (const mutation of mutations) {
                    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                        // Проверяем, добавлены ли элементы с заголовками
                        for (const node of mutation.addedNodes) {
                            if (node.nodeType === 1) { // Element
                                if (node.matches('h1, h2, .title, [class*="title"], .card, .full-start')) {
                                    shouldUpdate = true;
                                    break;
                                }
                            }
                        }
                    }
                    if (shouldUpdate) break;
                }

                if (shouldUpdate) {
                    // Небольшая задержка для завершения DOM изменений
                    setTimeout(updateMovieInfo, 100);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            console.log('[Lampa Monitor] MutationObserver настроен');
        } catch (e) {
            console.warn('[Lampa Monitor] Ошибка настройки MutationObserver:', e);
        }
    }

    // Запуск мониторинга
    function startMonitoring() {
        if (updateInterval) return;

        // Обновление времени каждую секунду
        updateInterval = setInterval(updateTime, 1000);
        
        // Первое обновление
        updateTime();
        updateMovieInfo();

        // Настройка наблюдателя за изменениями DOM
        setupMutationObserver();

        console.log('[Lampa Monitor] Мониторинг запущен');
    }

    // Остановка мониторинга
    function stopMonitoring() {
        if (updateInterval) {
            clearInterval(updateInterval);
            updateInterval = null;
        }
        console.log('[Lampa Monitor] Мониторинг остановлен');
    }

    // Инициализация
    function init() {
        try {
            console.log('[Lampa Monitor] Инициализация...');

            // Ждем загрузки DOM
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', function() {
                    createPanel();
                    startMonitoring();
                });
            } else {
                createPanel();
                startMonitoring();
            }

            // Обработка ошибок
            window.addEventListener('error', function(e) {
                if (e.filename && e.filename.includes('lampa-monitor')) {
                    console.error('[Lampa Monitor] Ошибка:', e.message);
                }
            });

            console.log('[Lampa Monitor] Плагин загружен успешно!');
        } catch (e) {
            console.error('[Lampa Monitor] Критическая ошибка инициализации:', e);
        }
    }

    // Запуск
    init();

})();
