// lampa-plugin-YT-@main/youtube.js
(function () {
    'use strict';

    if (!window.Lampa) return console.log('Lampa YouTube Plugin: Lampa not found');

    // ==========================================
    // 1. СТИЛИ (Чистый YouTube без рамок Lampa)
    // ==========================================
    const style = document.createElement('style');
    style.id = 'youtube-custom-theme';
    style.textContent = `
        /* Чистый фон как в YT */
        body.body--full, 
        .layer--wheight, 
        .startpage,
        .anybar--hide {
            background-color: #0f0f0f !important;
        }

        /* Верхний бар */
        .head {
            background-color: #0f0f0f !important;
            border-bottom: 1px solid #272727 !important;
            box-shadow: none !important;
            height: 56px !important;
        }

        /* Контент на всю ширину */
        .content {
            padding: 0 !important;
            margin: 0 !important;
        }
        
        .layer-content {
            padding-top: 16px !important;
        }

        /* Уникальная сетка YT */
        .yt-grid {
            display: grid !important;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)) !important;
            gap: 40px 16px !important;
            padding: 16px 24px !important;
            width: 100% !important;
            box-sizing: border-box !important;
        }

        @media (max-width: 900px) {
            .yt-grid {
                grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)) !important;
                gap: 24px 12px !important;
                padding: 12px 16px !important;
            }
        }

        /* Карточка (без сторонних рамок Lampa) */
        .yt-card {
            background: transparent !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            cursor: pointer;
            outline: none !important;
        }

        /* Эффект фокуса для TV и ПК */
        .yt-card.is-focus .yt-card__img {
            transform: scale(1.02);
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
            transition: transform 0.2s ease;
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
        }

        /* Текст под видео */
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
            padding: 0 !important;
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
    // 2. КОМПОНЕНТ ГЛАВНОЙ СТРАНИЦЫ YT
    // ==========================================
    function YoutubeMain(component) {
        let html = $('<div class="youtube-plugin-container"><div class="yt-grid"></div></div>');
        let network = new Lampa.Reguest();
        
        // Форматирование просмотров
        function formatCount(num) {
            if (!num) return '';
            if (num >= 1000000) return (num / 1000000).toFixed(1) + ' млн просмотров';
            if (num >= 1000) return (num / 1000).toFixed(0) + ' тыс. просмотров';
            return num + ' просмотров';
        }

        // Создание карточки
        function buildCard(item) {
            let card = $(`
                <div class="yt-card">
                    <div class="yt-card__img">
                        <img src="${item.img || ''}" alt="">
                        ${item.duration ? `<span class="yt-card__time">${item.duration}</span>` : ''}
                    </div>
                    <div class="yt-card__body">
                        <div class="yt-card__info">
                            <div class="yt-card__title">${item.title || 'Без названия'}</div>
                            <div class="yt-card__text">${item.channel || 'YouTube'}</div>
                            <div class="yt-card__text">${item.views ? formatCount(item.views) : ''} ${item.time ? ' • ' + item.time : ''}</div>
                        </div>
                    </div>
                </div>
            `);

            // Обработка клика/нажатия OK на пульте
            card.on('hover:enter', function () {
                Lampa.Activity.push({
                    url: item.url || item.id,
                    title: item.title,
                    component: 'youtube_player',
                    movie: item, // Передаем данные о видео в плеер
                    page: 1
                });
            });

            return card;
        }

        this.create = function () {
            return this.render();
        };

        this.render = function () {
            // Заглушка для демонстрации (замени на свой API)
            for(let i=0; i<12; i++) {
                html.find('.yt-grid').append(buildCard({
                    title: 'Как сделать плагин для Lampa - Часть ' + (i+1),
                    channel: 'Твой Канал',
                    img: 'https://picsum.photos/640/360?random='+i,
                    duration: Math.floor(Math.random()*20)+1 + ':' + String(Math.floor(Math.random()*60)).padStart(2,'0'),
                    views: Math.floor(Math.random()*1000000),
                    time: '2 дня назад',
                    url: 'https://r6---sn-googleqa...video_id=' + i // Заменить на реальный URL потока
                }));
            }
            return html;
        };

        this.destroy = function () {
            html.remove();
        };
    }

    // ==========================================
    // 3. КОМПОНЕНТ ПЛЕЕРА (С нормальным выбором звука)
    // ==========================================
    function YoutubePlayer(component) {
        let video_data = component.movie; // Получаем данные, переданные из карточки
        let html = $('<div style="width:100%; height:100%;"></div>');

        this.create = function () {
            return this.render();
        };

        this.render = function () {
            // ИСПОЛЬЗУЕМ ШТАТНЫЙ ПЛЕЕР LAMPA
            // Он уже содержит меню выбора качества, звуковых дорожек и субтитров
            
            let playlist = [{
                title: video_data.title,
                url: video_data.url, // Здесь должен быть прямой URL до потока (mp4, m3u8 и тд)
                quality: '1080p', // Можно передать массив доступных качеств, если нужно
                // tracks: [{...}] // Если есть аудио дорожки (переводы), передаем их тут
            }];

            Lampa.Player.play(playlist);
            Lampa.Player.playlist(playlist);

            // Так как плеер Lampa запускается поверх всего, этот компонент просто пустышка-обертка
            return html;
        };

        this.destroy = function () {
            html.remove();
        };
    }

    // ==========================================
    // 4. РЕГИСТРАЦИЯ В LAMPA
    // ==========================================
    
    // Регистрируем компоненты
    Lampa.Component.add('youtube_main', YoutubeMain);
    Lampa.Component.add('youtube_player', YoutubePlayer);

    // Добавляем кнопку в главное меню
    function addToMenu() {
        if (Lampa.Manifest && Lampa.Manifest.plugins) {
            // Стандартный путь для новых версий Lampa
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
    }

    // Ждем загрузку приложения
    if (Lampa.MainMenu) {
        addToMenu();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') addToMenu();
        });
    }

})();
