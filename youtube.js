// lampa-plugin-YT-@main/youtube.js
(function () {
    'use strict';

    if (!window.Lampa) return console.log('Lampa YouTube Plugin: Lampa not found');

    // ==========================================
    // 1. АГРЕССИВНЫЕ СТИЛИ (УБИРАЕМ РАМКИ LAMPA)
    // ==========================================
    const style = document.createElement('style');
    style.id = 'youtube-custom-theme';
    style.textContent = `
        /* Убиваем все рамки, отступы и серые фоны Lampa на этой странице */
        .layer--render,
        .layer__slice,
        .wrap,
        .wrap__content,
        .scroll,
        .content,
        .youtube-plugin-container {
            background-color: #0f0f0f !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            border: none !important;
            max-width: 100% !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
        }

        .head {
            background-color: #0f0f0f !important;
            border-bottom: 1px solid #272727 !important;
            box-shadow: none !important;
        }

        /* Контейнер сетки */
        .yt-grid {
            display: grid !important;
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)) !important;
            gap: 40px 16px !important;
            padding: 24px !important;
            box-sizing: border-box !important;
        }

        @media (max-width: 900px) {
            .yt-grid {
                grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)) !important;
                padding: 16px !important;
            }
        }

        /* Карточка */
        .yt-card {
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            cursor: pointer;
            outline: none !important;
        }

        /* Фокус для ТВ и ПК */
        .yt-card.is-focus .yt-card__img {
            transform: scale(1.03);
            border-radius: 0 !important;
        }
        .yt-card.is-focus .yt-card__img img {
            border-radius: 0 !important;
        }

        /* Миниатюра 16:9 */
        .yt-card__img {
            border-radius: 12px !important;
            width: 100% !important;
            aspect-ratio: 16 / 9 !important;
            overflow: hidden !important;
            background-color: #272727 !important;
            position: relative !important;
            margin-bottom: 12px !important;
            transition: transform 0.2s ease, border-radius 0.2s ease;
        }

        .yt-card__img img {
            width: 100% !important;
            height: 100% !important;
            object-fit: cover !important;
            border-radius: 12px !important;
            transition: border-radius 0.2s ease, transform 0.2s ease;
        }

        /* Время видео */
        .yt-card__time {
            background: rgba(0, 0, 0, 0.8) !important;
            color: #fff !important;
            font-size: 12px !important;
            font-weight: 500 !important;
            padding: 2px 4px !important;
            border-radius: 4px !important;
            right: 8px !important;
            bottom: 8px !important;
            position: absolute !important;
            z-index: 2;
        }

        /* Текст */
        .yt-card__body {
            display: flex !important;
            gap: 12px !important;
            padding: 0 4px;
        }

        .yt-card__info {
            display: flex !important;
            flex-direction: column !important;
            gap: 4px !important;
            width: 100% !important;
        }

        .yt-card__title {
            color: #f1f1f1 !important;
            font-family: Roboto, Arial, sans-serif !important;
            font-size: 14px !important;
            font-weight: 500 !important;
            line-height: 20px !important;
            max-height: 40px !important;
            overflow: hidden !important;
            display: -webkit-box !important;
            -webkit-line-clamp: 2 !important;
            -webkit-box-orient: vertical !important;
            text-overflow: ellipsis !important;
            margin: 0 !important;
        }

        .yt-card__text {
            color: #aaaaaa !important;
            font-family: Roboto, Arial, sans-serif !important;
            font-size: 12px !important;
            font-weight: 400 !important;
            line-height: 18px !important;
            margin: 0 !important;
        }

        /* Скроллбар */
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #717171; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #909090; }
    `;
    document.head.appendChild(style);

    // ==========================================
    // 2. ГЛАВНАЯ СТРАНИЦА (ЗАГРУЗКА ДАННЫХ ИЗ API)
    // ==========================================
    function YoutubeMain(component) {
        let network = new Lampa.Reguest();
        let html = $('<div class="scroll"><div class="youtube-plugin-container"><div class="yt-grid"></div></div></div>');
        
        // Показываем загрузку
        html.find('.yt-grid').html('<div style="text-align:center; padding:40px; color:#aaa; grid-column: 1/-1;">Загрузка видео...</div>');

        // Форматирование просмотров
        function formatCount(num) {
            if (!num) return '';
            if (num >= 1000000) return (num / 1000000).toFixed(1) + ' млн просмотров';
            if (num >= 1000) return (num / 1000).toFixed(0) + ' тыс. просмотров';
            return num + ' просмотров';
        }

        // Создание карточки
        function buildCard(item) {
            let video_id = item.url.split('=')[1]; // Извлекаем ID из "/watch?v=..."

            let card = $(`
                <div class="yt-card">
                    <div class="yt-card__img">
                        <img src="${item.thumbnail}" alt="">
                        ${item.duration ? `<span class="yt-card__time">${Math.floor(item.duration/60)}:${String(item.duration%60).padStart(2,'0')}</span>` : ''}
                    </div>
                    <div class="yt-card__body">
                        <div class="yt-card__info">
                            <div class="yt-card__title">${item.title}</div>
                            <div class="yt-card__text">${item.uploaderName}</div>
                            <div class="yt-card__text">${formatCount(item.views)} • ${new Date(item.uploaded * 1000).toLocaleDateString()}</div>
                        </div>
                    </div>
                </div>
            `);

            // Клик/нажатие OK
            card.on('hover:enter', function () {
                // Показываем загрузчик пока тянем прямую ссылку
                Lampa.Controller.toggle('content', false);
                let loader = $('<div class="broadcast__scan" style="position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); z-index:1000;"></div>');
                $('body').append(loader);

                // Запрашиваем прямые ссылки на потоки
                network.silent('https://pipedapi.kavin.rocks/streams/' + video_id, (stream_data) => {
                    loader.remove();
                    
                    // Ищем MP4 поток, где звук уже встроен (не videoOnly)
                    let video_stream = stream_data.videoStreams.find(s => s.mimeType.includes('mp4') && !s.videoOnly);
                    
                    // Если нет совмещенного, берем любой mp4
                    if(!video_stream) video_stream = stream_data.videoStreams.find(s => s.mimeType.includes('mp4'));

                    if(video_stream) {
                        // ЗАПУСКАЕМ ШТАТНЫЙ ПЛЕЕР LAMPA
                        let playlist = [{
                            title: item.title,
                            url: video_stream.url
                        }];
                        
                        Lampa.Player.play(playlist);
                        Lampa.Player.playlist(playlist);
                    } else {
                        Lampa.Noty.show('Не удалось получить ссылку на видео');
                        Lampa.Controller.toggle('content', true);
                    }
                }, (err) => {
                    loader.remove();
                    Lampa.Noty.show('Ошибка загрузки потока');
                    Lampa.Controller.toggle('content', true);
                });
            });

            return card;
        }

        this.create = function () {
            return this.render();
        };

        this.render = function () {
            // Запрос трендовых видео (можно заменить на плейлист или поиск)
            let api_url = "https://pipedapi.kavin.rocks/trending?region=US"; // Регион можно сменить на RU, UA и т.д.
            
            network.silent(api_url, (data) => {
                html.find('.yt-grid').empty(); // Очищаем "Загрузка..."
                data.forEach(item => {
                    html.find('.yt-grid').append(buildCard(item));
                });
                // Обновляем скролл и фокус Lampa
                Lampa.Controller.toggle('content', true);
            }, (err) => {
                html.find('.yt-grid').html('<div style="text-align:center; padding:40px; color:#ff5252; grid-column: 1/-1;">Ошибка загрузки. Проверьте интернет или API.</div>');
            });

            return html;
        };

        this.destroy = function () {
            network.clear();
            html.remove();
        };
    }

    // ==========================================
    // 3. РЕГИСТРАЦИЯ В LAMPA
    // ==========================================
    Lampa.Component.add('youtube_main', YoutubeMain);

    function addToMenu() {
        Lampa.MainMenu.add({
            name: 'YouTube',
            icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83-.25.9-.83 1.48-1.73 1.73-.47.13-1.33.22-2.65.28-1.3.07-2.49.1-3.59.1L12 19c-4.19 0-6.8-.16-7.83-.44-.9-.25-1.48-.83-1.73-1.73-.13-.47-.22-1.1-.28-1.9-.07-.8-.1-1.49-.1-2.09L2 12c0-2.19.16-3.8.44-4.83.25-.9.83-1.48 1.73-1.73.47-.13 1.33-.22 2.65-.28 1.3-.07 2.49-.1 3.59-.1L12 5c4.19 0 6.8.16 7.83.44.9.25 1.48.83 1.73 1.73z"/></svg>',
            onSelect: function () {
                Lampa.Activity.push({
                    url: '',
                    title: 'YouTube',
                    component: 'youtube_main',
                    page: 1
                });
            }
        });
    }

    if (Lampa.MainMenu) {
        addToMenu();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') addToMenu();
        });
    }

})();
