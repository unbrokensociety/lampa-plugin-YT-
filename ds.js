/**
 * Lampa Monitor v3.0
 * Простой и надежный монитор для Lampa
 * Работает через DOM - не зависит от API
 */

(function() {
    'use strict';

    // Проверяем что мы в Lampa
    if (window.location.hostname.indexOf('lampa') === -1 && 
        window.location.hostname.indexOf('cub') === -1) {
        console.log('[Monitor] Не Lampa, выходим');
        return;
    }

    // Переменные
    var startTime = Date.now();
    var panel = null;
    var timerEl = null;
    var movieEl = null;
    var posterEl = null;
    var lastMovie = '';

    // ===== СТИЛИ =====
    var css = `
        #lampamonitor {
            position: fixed;
            top: 15px;
            right: 15px;
            z-index: 100000;
            background: rgba(10,10,20,0.95);
            border: 1px solid rgba(79,195,247,0.4);
            border-radius: 12px;
            padding: 15px;
            width: 280px;
            color: #fff;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            box-shadow: 0 4px 20px rgba(0,0,0,0.7);
            backdrop-filter: blur(10px);
        }
        #lampamonitor .lm-head {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
            padding-bottom: 10px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        #lampamonitor .lm-title {
            font-size: 13px;
            font-weight: 600;
            color: #4fc3f7;
        }
        #lampamonitor .lm-close {
            background: none;
            border: none;
            color: rgba(255,255,255,0.5);
            font-size: 20px;
            cursor: pointer;
            padding: 0 5px;
        }
        #lampamonitor .lm-close:hover {
            color: #fff;
        }
        #lampamonitor .lm-time {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
            padding: 10px;
            background: rgba(79,195,247,0.15);
            border-radius: 8px;
        }
        #lampamonitor .lm-time-label {
            font-size: 12px;
            color: rgba(255,255,255,0.7);
        }
        #lampamonitor .lm-time-val {
            font-family: 'Courier New', monospace;
            font-size: 18px;
            font-weight: bold;
            color: #4fc3f7;
        }
        #lampamonitor .lm-movie {
            display: flex;
            gap: 12px;
            align-items: flex-start;
        }
        #lampamonitor .lm-poster {
            width: 70px;
            height: 105px;
            border-radius: 8px;
            background: rgba(255,255,255,0.1);
            background-size: cover;
            background-position: center;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
        }
        #lampamonitor .lm-info {
            flex: 1;
            min-width: 0;
        }
        #lampamonitor .lm-movie-title {
            font-size: 14px;
            font-weight: 500;
            line-height: 1.3;
            margin-bottom: 5px;
            overflow: hidden;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
        }
        #lampamonitor .lm-movie-meta {
            font-size: 11px;
            color: rgba(255,255,255,0.5);
        }
        #lampamonitor .lm-status {
            display: flex;
            align-items: center;
            gap: 6px;
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px solid rgba(255,255,255,0.05);
            font-size: 10px;
            color: rgba(255,255,255,0.3);
        }
        #lampamonitor .lm-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #4caf50;
        }
    `;

    // ===== СОЗДАНИЕ ПАНЕЛИ =====
    function createPanel() {
        // Добавляем стили
        var style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);

        // Создаем панель
        panel = document.createElement('div');
        panel.id = 'lampamonitor';
        panel.innerHTML = `
            <div class="lm-head">
                <div class="lm-title">🎬 Монитор</div>
                <button class="lm-close" id="lm-close">×</button>
            </div>
            <div class="lm-time">
                <span class="lm-time-label">Время:</span>
                <span class="lm-time-val" id="lm-timer">00:00:00</span>
            </div>
            <div class="lm-movie">
                <div class="lm-poster" id="lm-poster">🎬</div>
                <div class="lm-info">
                    <div class="lm-movie-title" id="lm-movie">Определение...</div>
                    <div class="lm-movie-meta" id="lm-meta">Поиск фильма</div>
                </div>
            </div>
            <div class="lm-status">
                <div class="lm-dot"></div>
                <span>Активен</span>
            </div>
        `;

        document.body.appendChild(panel);

        // Элементы
        timerEl = document.getElementById('lm-timer');
        movieEl = document.getElementById('lm-movie');
        posterEl = document.getElementById('lm-poster');

        // Закрытие
        document.getElementById('lm-close').addEventListener('click', function() {
            panel.style.display = 'none';
            clearInterval(updateInterval);
        });
    }

    // ===== ПОИСК ФИЛЬМА =====
    function findMovie() {
        try {
            // Метод 1: Заголовок из URL
            var url = new URL(window.location.href);
            var urlTitle = url.searchParams.get('title');
            if (urlTitle && urlTitle !== 'Главная' && urlTitle.length > 2) {
                return {
                    title: urlTitle,
                    meta: 'Из URL'
                };
            }

            // Метод 2: Полная страница фильма
            var selectors = [
                '.full-start__title',
                '.full-start .title',
                '.full-start h1',
                '.full-start .name',
                '.card__title',
                '.card__name'
            ];

            for (var i = 0; i < selectors.length; i++) {
                var el = document.querySelector(selectors[i]);
                if (el && el.textContent.trim().length > 2) {
                    return {
                        title: el.textContent.trim(),
                        meta: 'Из DOM'
                    };
                }
            }

            // Метод 3: Первый заголовок h1
            var h1 = document.querySelector('h1');
            if (h1 && h1.textContent.trim().length > 2 && 
                h1.textContent !== 'Главная') {
                return {
                    title: h1.textContent.trim(),
                    meta: 'Из H1'
                };
            }

            return null;
        } catch (e) {
            return null;
        }
    }

    // ===== ПОИСК ПОСТЕРА =====
    function findPoster() {
        try {
            // Ищем TMDB постер
            var imgs = document.querySelectorAll('img');
            for (var i = 0; i < imgs.length; i++) {
                var img = imgs[i];
                var src = img.src || img.getAttribute('data-src') || '';
                if (src.indexOf('image.tmdb.org') !== -1) {
                    return src;
                }
            }

            // Ищем по классу poster
            var posterImgs = document.querySelectorAll('.card__img img, .full-start__poster img, img[class*="poster"]');
            if (posterImgs.length > 0 && posterImgs[0].src) {
                return posterImgs[0].src;
            }

            return null;
        } catch (e) {
            return null;
        }
    }

    // ===== ОБНОВЛЕНИЕ ВРЕМЕНИ =====
    function updateTime() {
        try {
            var elapsed = Date.now() - startTime;
            var h = Math.floor(elapsed / 3600000);
            var m = Math.floor((elapsed % 3600000) / 60000);
            var s = Math.floor((elapsed % 60000) / 1000);

            var timeStr = 
                (h < 10 ? '0' + h : h) + ':' +
                (m < 10 ? '0' + m : m) + ':' +
                (s < 10 ? '0' + s : s);

            if (timerEl) timerEl.textContent = timeStr;
        } catch (e) {}
    }

    // ===== ОБНОВЛЕНИЕ ФИЛЬМА =====
    function updateMovie() {
        try {
            var movie = findMovie();
            if (movie && movie.title !== lastMovie) {
                lastMovie = movie.title;

                if (movieEl) {
                    movieEl.textContent = movie.title;
                }

                // Ищем постер
                var poster = findPoster();
                if (poster && posterEl) {
                    posterEl.style.backgroundImage = 'url("' + poster + '")';
                    posterEl.textContent = '';
                }
            }
        } catch (e) {}
    }

    // ===== ГЛАВНЫЙ ЦИКЛ =====
    function start() {
        createPanel();

        // Обновление каждую секунду
        var updateInterval = setInterval(function() {
            updateTime();
        }, 1000);

        // Обновление фильма каждые 2 секунды
        setInterval(function() {
            updateMovie();
        }, 2000);

        console.log('[Lampa Monitor] Запущен!');
    }

    // ===== ЗАПУСК =====
    // Ждем загрузки DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(start, 2000);
        });
    } else {
        setTimeout(start, 2000);
    }

})();
