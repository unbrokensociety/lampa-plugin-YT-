/**
 * Lampa Monitor v4.0
 * Простой монитор для Lampa
 */

(function() {
    'use strict';

    // Не запускаем повторно
    if (window.lampaMonitorActive) return;
    window.lampaMonitorActive = true;

    console.log('[Monitor] Загрузка плагина...');

    // Ждем загрузки Lampa
    var checkInterval = setInterval(function() {
        // Проверяем что приложение загрузилось
        var appLoaded = document.querySelector('.head') || 
                       document.querySelector('.card') ||
                       document.querySelector('.menu') ||
                       document.body.children.length > 3;

        if (appLoaded) {
            clearInterval(checkInterval);
            console.log('[Monitor] Lampa загружена, запускаю монитор');
            setTimeout(startMonitor, 1000);
        }
    }, 500);

    // Если через 15 сек не загрузилось - запускаем всё равно
    setTimeout(function() {
        if (!window.lampaMonitorStarted) {
            startMonitor();
        }
    }, 15000);

    function startMonitor() {
        window.lampaMonitorStarted = true;

        // ===== ПЕРЕМЕННЫЕ =====
        var startTime = Date.now();
        var panel, timeEl, titleEl, posterEl, metaEl;
        var lastTitle = '';

        // ===== СОЗДАНИЕ ПАНЕЛИ =====
        function createUI() {
            // Стили
            var style = document.createElement('style');
            style.textContent = `
                #lampa-mon {
                    position: fixed;
                    top: 10px;
                    right: 10px;
                    z-index: 999999;
                    background: rgba(0,0,0,0.9);
                    border: 1px solid #4fc3f7;
                    border-radius: 10px;
                    padding: 12px;
                    width: 250px;
                    color: #fff;
                    font-family: sans-serif;
                    font-size: 12px;
                }
                #lampa-mon .mon-head {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 8px;
                    padding-bottom: 8px;
                    border-bottom: 1px solid #333;
                }
                #lampa-mon .mon-title {
                    color: #4fc3f7;
                    font-weight: bold;
                }
                #lampa-mon .mon-close {
                    background: none;
                    border: none;
                    color: #888;
                    font-size: 16px;
                    cursor: pointer;
                }
                #lampa-mon .mon-time {
                    background: rgba(79,195,247,0.1);
                    padding: 8px;
                    border-radius: 5px;
                    margin-bottom: 8px;
                    display: flex;
                    justify-content: space-between;
                }
                #lampa-mon .mon-timer {
                    color: #4fc3f7;
                    font-weight: bold;
                    font-family: monospace;
                    font-size: 16px;
                }
                #lampa-mon .mon-movie {
                    display: flex;
                    gap: 10px;
                }
                #lampa-mon .mon-poster {
                    width: 60px;
                    height: 90px;
                    background: #222;
                    border-radius: 5px;
                    background-size: cover;
                    background-position: center;
                    flex-shrink: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                #lampa-mon .mon-info {
                    flex: 1;
                    min-width: 0;
                }
                #lampa-mon .mon-name {
                    font-size: 13px;
                    font-weight: bold;
                    margin-bottom: 4px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                #lampa-mon .mon-meta {
                    font-size: 10px;
                    color: #888;
                }
            `;
            document.head.appendChild(style);

            // Панель
            panel = document.createElement('div');
            panel.id = 'lampa-mon';
            panel.innerHTML = `
                <div class="mon-head">
                    <span class="mon-title">📊 Монитор</span>
                    <button class="mon-close" onclick="this.parentElement.parentElement.remove()">×</button>
                </div>
                <div class="mon-time">
                    <span>⏱ Время:</span>
                    <span class="mon-timer" id="mon-timer">00:00:00</span>
                </div>
                <div class="mon-movie">
                    <div class="mon-poster" id="mon-poster">🎬</div>
                    <div class="mon-info">
                        <div class="mon-name" id="mon-name">Ожидание...</div>
                        <div class="mon-meta" id="mon-meta">Поиск фильма</div>
                    </div>
                </div>
            `;

            document.body.appendChild(panel);

            timeEl = document.getElementById('mon-timer');
            titleEl = document.getElementById('mon-name');
            posterEl = document.getElementById('mon-poster');
            metaEl = document.getElementById('mon-meta');
        }

        // ===== ОБНОВЛЕНИЕ ВРЕМЕНИ =====
        function updateTime() {
            var now = Date.now();
            var diff = now - startTime;
            var h = Math.floor(diff / 3600000);
            var m = Math.floor((diff % 3600000) / 60000);
            var s = Math.floor((diff % 60000) / 1000);
            var timeStr = (h<10?'0':'')+h+':'+(m<10?'0':'')+m+':'+(s<10?'0':'')+s;
            if (timeEl) timeEl.textContent = timeStr;
        }

        // ===== ПОИСК ФИЛЬМА =====
        function findMovie() {
            try {
                // Из URL
                var url = window.location.href;
                var titleMatch = url.match(/title=([^&]+)/);
                if (titleMatch) {
                    var title = decodeURIComponent(titleMatch[1]).replace(/\+/g, ' ');
                    if (title && title !== 'Главная' && title.length > 2) {
                        return { title: title, meta: 'Из URL' };
                    }
                }

                // Из DOM - заголовок фильма
                var selectors = [
                    '.full-start__title',
                    '.card__title',
                    '.full-start .title',
                    'h1',
                    '.title'
                ];

                for (var i = 0; i < selectors.length; i++) {
                    var el = document.querySelector(selectors[i]);
                    if (el && el.textContent.trim().length > 2) {
                        var text = el.textContent.trim();
                        if (text !== 'Главная' && text !== 'Lampa') {
                            return { title: text, meta: 'Из DOM' };
                        }
                    }
                }

                return null;
            } catch(e) {
                return null;
            }
        }

        // ===== ПОИСК ПОСТЕРА =====
        function findPoster() {
            try {
                // Ищем TMDB постер
                var imgs = document.querySelectorAll('img');
                for (var i = 0; i < imgs.length; i++) {
                    var src = imgs[i].src || imgs[i].getAttribute('data-src') || '';
                    if (src.indexOf('image.tmdb.org') !== -1) {
                        return src;
                    }
                }
                // Фолбэк - любой постер
                var posterImg = document.querySelector('.card__img img, img[class*="poster"]');
                if (posterImg && posterImg.src) return posterImg.src;
                return null;
            } catch(e) {
                return null;
            }
        }

        // ===== ОБНОВЛЕНИЕ ФИЛЬМА =====
        function updateMovie() {
            try {
                var movie = findMovie();
                if (movie && movie.title !== lastTitle) {
                    lastTitle = movie.title;
                    if (titleEl) titleEl.textContent = movie.title;
                    if (metaEl) metaEl.textContent = movie.meta;

                    var poster = findPoster();
                    if (poster && posterEl) {
                        posterEl.style.backgroundImage = 'url("' + poster + '")';
                        posterEl.textContent = '';
                    }
                }
            } catch(e) {}
        }

        // ===== ЗАПУСК =====
        createUI();
        updateTime();
        updateMovie();

        // Обновление времени каждую секунду
        setInterval(updateTime, 1000);

        // Обновление фильма каждые 3 секунды
        setInterval(updateMovie, 3000);

        console.log('[Monitor] Монитор запущен!');
    }

})();
