/**
 * Lampa Monitor Plugin
 * Отображает время работы и текущий фильм с постером
 * Версия: 2.0.0
 */

(function() {
    'use strict';

    // Проверяем наличие Lampa API
    if (typeof Lampa === 'undefined') {
        console.error('[Lampa Monitor] Ошибка: Lampa API не найден');
        return;
    }

    // Класс для мониторинга
    class LampaMonitor {
        constructor() {
            this.startTime = Date.now();
            this.currentMovie = null;
            this.currentPoster = null;
            this.isVisible = true;
            this.stats = this.loadStats();
            
            this.init();
        }

        // Загрузка статистики из localStorage
        loadStats() {
            try {
                const saved = localStorage.getItem('lampa_monitor_stats');
                return saved ? JSON.parse(saved) : {
                    totalWatchTime: 0,
                    moviesWatched: 0,
                    lastSession: null
                };
            } catch (e) {
                return {
                    totalWatchTime: 0,
                    moviesWatched: 0,
                    lastSession: null
                };
            }
        }

        // Сохранение статистики
        saveStats() {
            try {
                localStorage.setItem('lampa_monitor_stats', JSON.stringify(this.stats));
            } catch (e) {
                console.warn('[Lampa Monitor] Не удалось сохранить статистику');
            }
        }

        // Инициализация плагина
        init() {
            this.createUI();
            this.startTracking();
            this.bindEvents();
            console.log('[Lampa Monitor] Плагин загружен успешно');
        }

        // Создание интерфейса
        createUI() {
            // Стили для панели
            const style = document.createElement('style');
            style.textContent = `
                @keyframes lampaMonitorFadeIn {
                    from { opacity: 0; transform: translateY(-20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                @keyframes lampaMonitorPulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.7; }
                }
                
                #lampa-monitor-panel {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 99999;
                    background: linear-gradient(135deg, rgba(30, 30, 40, 0.95), rgba(50, 50, 60, 0.9));
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 15px;
                    padding: 15px;
                    min-width: 280px;
                    max-width: 350px;
                    color: #fff;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
                    backdrop-filter: blur(10px);
                    animation: lampaMonitorFadeIn 0.5s ease;
                    transition: all 0.3s ease;
                }
                
                #lampa-monitor-panel:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 15px 40px rgba(0, 0, 0, 0.7);
                }
                
                #lampa-monitor-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 10px;
                    padding-bottom: 10px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }
                
                #lampa-monitor-title {
                    font-size: 16px;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                #lampa-monitor-close {
                    background: none;
                    border: none;
                    color: rgba(255, 255, 255, 0.6);
                    font-size: 20px;
                    cursor: pointer;
                    padding: 0 5px;
                    transition: color 0.2s;
                }
                
                #lampa-monitor-close:hover {
                    color: #fff;
                }
                
                #lampa-monitor-content {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }
                
                #lampa-monitor-time {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-size: 14px;
                    color: #e0e0e0;
                }
                
                #lampa-monitor-time-value {
                    font-family: 'SF Mono', 'Fira Code', 'Fira Mono', Menlo, Consolas, monospace;
                    font-size: 18px;
                    font-weight: 600;
                    color: #4fc3f7;
                }
                
                #lampa-monitor-movie {
                    display: flex;
                    gap: 12px;
                    align-items: flex-start;
                }
                
                #lampa-monitor-poster {
                    width: 80px;
                    height: 120px;
                    border-radius: 8px;
                    background: linear-gradient(45deg, #333, #444);
                    background-size: cover;
                    background-position: center;
                    flex-shrink: 0;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                    transition: all 0.3s ease;
                }
                
                #lampa-monitor-poster.has-image {
                    border: 1px solid rgba(255, 255, 255, 0.2);
                }
                
                #lampa-monitor-poster:hover {
                    transform: scale(1.05);
                }
                
                #lampa-monitor-movie-info {
                    flex-grow: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                }
                
                #lampa-monitor-movie-title {
                    font-size: 14px;
                    font-weight: 500;
                    color: #fff;
                    line-height: 1.3;
                }
                
                #lampa-monitor-movie-meta {
                    font-size: 12px;
                    color: rgba(255, 255, 255, 0.7);
                }
                
                #lampa-monitor-status {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 12px;
                    color: rgba(255, 255, 255, 0.6);
                }
                
                #lampa-monitor-status-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: #4caf50;
                    animation: lampaMonitorPulse 2s infinite;
                }
                
                #lampa-monitor-stats {
                    display: flex;
                    justify-content: space-between;
                    margin-top: 10px;
                    padding-top: 10px;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                    font-size: 11px;
                    color: rgba(255, 255, 255, 0.5);
                }
                
                .lampa-monitor-hidden {
                    display: none !important;
                }
            `;
            document.head.appendChild(style);

            // Создаем основную панель
            this.panel = document.createElement('div');
            this.panel.id = 'lampa-monitor-panel';
            this.panel.innerHTML = `
                <div id="lampa-monitor-header">
                    <div id="lampa-monitor-title">
                        <span>🎬</span>
                        <span>Lampa Monitor</span>
                    </div>
                    <button id="lampa-monitor-close">×</button>
                </div>
                <div id="lampa-monitor-content">
                    <div id="lampa-monitor-time">
                        <span>⏱ Время работы:</span>
                        <span id="lampa-monitor-time-value">00:00:00</span>
                    </div>
                    <div id="lampa-monitor-movie">
                        <div id="lampa-monitor-poster"></div>
                        <div id="lampa-monitor-movie-info">
                            <div id="lampa-monitor-movie-title">Фильм не определен</div>
                            <div id="lampa-monitor-movie-meta">Ожидание данных...</div>
                        </div>
                    </div>
                    <div id="lampa-monitor-status">
                        <div id="lampa-monitor-status-dot"></div>
                        <span id="lampa-monitor-status-text">Мониторинг активен</span>
                    </div>
                </div>
                <div id="lampa-monitor-stats">
                    <span>📊 Всего: <span id="lampa-monitor-total-time">0ч 0м</span></span>
                    <span>🎥 Фильмов: <span id="lampa-monitor-movies-count">0</span></span>
                </div>
            `;

            // Добавляем панель в DOM
            document.body.appendChild(this.panel);

            // Обработчик закрытия
            document.getElementById('lampa-monitor-close').addEventListener('click', () => {
                this.toggleVisibility();
            });

            // Сохраняем ссылки на элементы
            this.timeValue = document.getElementById('lampa-monitor-time-value');
            this.movieTitle = document.getElementById('lampa-monitor-movie-title');
            this.movieMeta = document.getElementById('lampa-monitor-movie-meta');
            this.posterElement = document.getElementById('lampa-monitor-poster');
            this.statusText = document.getElementById('lampa-monitor-status-text');
            this.totalTimeElement = document.getElementById('lampa-monitor-total-time');
            this.moviesCountElement = document.getElementById('lampa-monitor-movies-count');
        }

        // Переключение видимости панели
        toggleVisibility() {
            this.isVisible = !this.isVisible;
            this.panel.classList.toggle('lampa-monitor-hidden');
        }

        // Запуск отслеживания
        startTracking() {
            // Обновление времени каждую секунду
            this.timeInterval = setInterval(() => {
                this.updateTime();
            }, 1000);

            // Обновление информации о фильме каждые 2 секунды
            this.movieInterval = setInterval(() => {
                this.updateMovieInfo();
            }, 2000);

            // Сохранение статистики каждые 30 секунд
            this.statsInterval = setInterval(() => {
                this.saveStats();
            }, 30000);
        }

        // Обновление времени
        updateTime() {
            const elapsed = Date.now() - this.startTime;
            const hours = Math.floor(elapsed / 3600000);
            const minutes = Math.floor((elapsed % 3600000) / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);

            const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            this.timeValue.textContent = timeString;

            // Обновляем общее время
            this.stats.totalWatchTime += 1;
            const totalHours = Math.floor(this.stats.totalWatchTime / 3600);
            const totalMinutes = Math.floor((this.stats.totalWatchTime % 3600) / 60);
            this.totalTimeElement.textContent = `${totalHours}ч ${totalMinutes}м`;
        }

        // Обновление информации о фильме
        updateMovieInfo() {
            // Пытаемся найти текущий фильм разными способами
            const movieInfo = this.findCurrentMovie();
            
            if (movieInfo && movieInfo.title !== this.currentMovie) {
                this.currentMovie = movieInfo.title;
                this.currentPoster = movieInfo.poster;
                
                // Обновляем UI
                this.movieTitle.textContent = movieInfo.title;
                this.movieMeta.textContent = movieInfo.meta || 'Данные получены';
                
                if (movieInfo.poster) {
                    this.posterElement.style.backgroundImage = `url(${movieInfo.poster})`;
                    this.posterElement.classList.add('has-image');
                }
                
                // Увеличиваем счетчик фильмов
                this.stats.moviesWatched += 1;
                this.moviesCountElement.textContent = this.stats.moviesWatched;
            }
        }

        // Поиск текущего фильма в DOM
        findCurrentMovie() {
            // Метод 1: Поиск по стандартным селекторам Lampa
            const selectors = [
                '.card__title',
                '.full-start__title',
                '.video-player__title',
                '.player__title',
                '[class*="movie-title"]',
                '[class*="film-title"]',
                '.title',
                'h1',
                'h2'
            ];

            for (const selector of selectors) {
                const element = document.querySelector(selector);
                if (element && element.textContent.trim()) {
                    const title = element.textContent.trim();
                    const poster = this.findPoster(title);
                    return {
                        title: title,
                        poster: poster,
                        meta: 'Найдено в DOM'
                    };
                }
            }

            // Метод 2: Поиск по атрибутам
            const titleElements = document.querySelectorAll('[data-title], [title]');
            for (const el of titleElements) {
                const title = el.getAttribute('data-title') || el.getAttribute('title');
                if (title && title.length > 3) {
                    const poster = this.findPoster(title);
                    return {
                        title: title,
                        poster: poster,
                        meta: 'Найдено по атрибутам'
                    };
                }
            }

            // Метод 3: Поиск в iframe (если плеер в iframe)
            try {
                const iframes = document.querySelectorAll('iframe');
                for (const iframe of iframes) {
                    if (iframe.contentDocument) {
                        const titleEl = iframe.contentDocument.querySelector('title');
                        if (titleEl && titleEl.textContent.trim()) {
                            const title = titleEl.textContent.trim();
                            const poster = this.findPoster(title);
                            return {
                                title: title,
                                poster: poster,
                                meta: 'Найдено в iframe'
                            };
                        }
                    }
                }
            } catch (e) {
                // Игнорируем ошибки доступа к iframe
            }

            return null;
        }

        // Поиск постера фильма
        findPoster(title) {
            // Метод 1: Поиск изображения в DOM рядом с заголовком
            const posterSelectors = [
                '.card__img img',
                '.full-start__img img',
                '.video-player__poster img',
                '.player__poster img',
                '[class*="poster"] img',
                'img[class*="poster"]',
                'img[src*="poster"]',
                'img[src*="thumb"]',
                'img[src*="image"]'
            ];

            for (const selector of posterSelectors) {
                const img = document.querySelector(selector);
                if (img && img.src) {
                    return img.src;
                }
            }

            // Метод 2: Поиск фонового изображения
            const elementsWithBg = document.querySelectorAll('[style*="background-image"]');
            for (const el of elementsWithBg) {
                const style = el.getAttribute('style');
                if (style && style.includes('url(')) {
                    const match = style.match(/url\(['"]?([^'")\s]+)['"]?\)/);
                    if (match && match[1]) {
                        return match[1];
                    }
                }
            }

            // Метод 3: Генерация постера из TMDB (если доступен ключ)
            // ВНИМАНИЕ: Требует TMDB API ключ
            // const apiKey = 'ВАШ_TMDB_КЛЮЧ';
            // if (apiKey) {
            //     return `https://image.tmdb.org/t/p/w500${title.replace(/\s+/g, '_')}.jpg`;
            // }

            return null;
        }

        // Привязка событий
        bindEvents() {
            // Событие при закрытии страницы
            window.addEventListener('beforeunload', () => {
                this.saveStats();
            });

            // Обработка ошибок
            window.addEventListener('error', (e) => {
                if (e.message.includes('lampa-monitor')) {
                    console.error('[Lampa Monitor] Ошибка:', e.message);
                }
            });
        }

        // Уничтожение плагина
        destroy() {
            clearInterval(this.timeInterval);
            clearInterval(this.movieInterval);
            clearInterval(this.statsInterval);
            this.saveStats();
            
            if (this.panel && this.panel.parentNode) {
                this.panel.parentNode.removeChild(this.panel);
            }
        }
    }

    // Регистрируем плагин в Lampa
    Lampa.Plugin.add({
        title: 'Lampa Monitor',
        description: 'Отображает время работы и текущий фильм с постером',
        version: '2.0.0',
        author: 'Assistant',
        icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5LjI3TDE0LjE0IDE0LjE0TDE1LjE4IDIxLjAwTDEyIDE3Ljc3TDguODIgMjEuMDBMOS44NiAxNC4xNEw0IDkuMjdMMTAuOTEgOC4yNkwxMiAyWiIgZmlsbD0iIzRmYzNmNyIvPgo8L3N2Zz4K',
        
        onInit: function() {
            // Создаем экземпляр монитора
            this.monitor = new LampaMonitor();
            
            // Сохраняем ссылку для доступа извне
            window.lampaMonitor = this.monitor;
        },
        
        onDestroy: function() {
            if (this.monitor) {
                this.monitor.destroy();
            }
        }
    });

    // Автоматическая инициализация, если DOM уже загружен
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.lampaMonitor = new LampaMonitor();
        });
    } else {
        window.lampaMonitor = new LampaMonitor();
    }

})();
