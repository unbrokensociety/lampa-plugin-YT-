// lampa-plugin-YT-@main/youtube.js
(function () {
    'use strict';

    if (!window.Lampa) return console.log('Lampa YouTube Plugin: Lampa not found');

    // ==========================================
    // 1. ГЛОБАЛЬНЫЕ СТИЛИ ПЛАГИНА (Дизайн + Плеер)
    // ==========================================
    const style = document.createElement('style');
    style.id = 'youtube-custom-theme';
    style.textContent = `
        /* --- СЕКЦИЯ 1: Фон и Сетка (Убираем рамки Lampa) --- */
        .layer--render, .layer__slice, .wrap, .wrap__content, .scroll, .content, .youtube-plugin-container {
            background-color: #0f0f0f !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            border: none !important;
            max-width: 100% !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
        }
        .head { background-color: #0f0f0f !important; border-bottom: 1px solid #272727 !important; box-shadow: none !important; }
        .yt-grid {
            display: grid !important;
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)) !important;
            gap: 40px 16px !important;
            padding: 24px !important;
            box-sizing: border-box !important;
        }
        .yt-card { background: transparent !important; padding: 0 !important; margin: 0 !important; width: 100% !important; cursor: pointer; outline: none !important; }
        .yt-card.is-focus .yt-card__img { transform: scale(1.03); border-radius: 0 !important; }
        .yt-card.is-focus .yt-card__img img { border-radius: 0 !important; }
        .yt-card__img { border-radius: 12px !important; width: 100% !important; aspect-ratio: 16 / 9 !important; overflow: hidden !important; background-color: #272727 !important; position: relative !important; margin-bottom: 12px !important; transition: transform 0.2s ease, border-radius 0.2s ease; }
        .yt-card__img img { width: 100% !important; height: 100% !important; object-fit: cover !important; border-radius: 12px !important; transition: border-radius 0.2s ease, transform 0.2s ease; }
        .yt-card__time { background: rgba(0, 0, 0, 0.8) !important; color: #fff !important; font-size: 12px !important; font-weight: 500 !important; padding: 2px 4px !important; border-radius: 4px !important; right: 8px !important; bottom: 8px !important; position: absolute !important; z-index: 2; }
        .yt-card__body { display: flex !important; gap: 12px !important; padding: 0 4px; }
        .yt-card__info { display: flex !important; flex-direction: column !important; gap: 4px !important; width: 100% !important; }
        .yt-card__title { color: #f1f1f1 !important; font-family: Roboto, Arial, sans-serif !important; font-size: 14px !important; font-weight: 500 !important; line-height: 20px !important; max-height: 40px !important; overflow: hidden !important; display: -webkit-box !important; -webkit-line-clamp: 2 !important; -webkit-box-orient: vertical !important; text-overflow: ellipsis !important; margin: 0 !important; }
        .yt-card__text { color: #aaaaaa !important; font-family: Roboto, Arial, sans-serif !important; font-size: 12px !important; font-weight: 400 !important; line-height: 18px !important; margin: 0 !important; }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #717171; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #909090; }

        /* --- СЕКЦИЯ 2: ДИЗАЙН ПЛЕЕРА LAMPA (Красивый и удобный) --- */
        
        /* Глубокий градиентный фон панели плеера */
        .player__footer {
            background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.7) 50%, transparent 100%) !important;
            padding: 20px 40px 30px 40px !important;
            box-sizing: border-box !important;
        }

        /* Контейнер прогресс-бара */
        .player__progress {
            height: 16px !important; /* Увеличенная зона для тапа/клика на мобилках */
            display: flex !important;
            align-items: center !important;
            margin-bottom: 10px !important;
            cursor: pointer !important;
        }

        /* Сама линия прогресс-бара (тонкая, как на YT) */
        .player__progress__load,
        .player__progress__played {
            height: 4px !important;
            border-radius: 4px !important;
            background-color: rgba(255, 255, 255, 0.3) !important;
            transition: height 0.2s ease !important;
        }

        /* Просмотренная часть (Красная) */
        .player__progress__played {
            background-color: #ff0000 !important;
        }

        /* Ползунок (Кружочек) */
        .player__progress__thumb {
            width: 14px !important;
            height: 14px !important;
            background-color: #ff0000 !important;
            border-radius: 50% !important;
            box-shadow: 0 0 10px rgba(0,0,0,0.5) !important;
            top: 50% !important;
            transform: translate(-50%, -50%) scale(0) !important; /* Скрыт по умолчанию */
            transition: transform 0.2s ease !important;
        }

        /* Эффект при наведении мыши (ПК) и фокусе (ТВ) */
        .player__footer:hover .player__progress__load,
        .player__footer:hover .player__progress__played,
        .player.active .player__progress__load,
        .player.active .player__progress__played {
            height: 6px !important; /* Утолщается при взаимодействии */
        }
        .player__footer:hover .player__progress__thumb,
        .player.active .player__progress__thumb {
            transform: translate(-50%, -50%) scale(1) !important; /* Появляется ползунок */
        }

        /* Ряд кнопок управления */
        .player__footer__line {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            gap: 15px !important;
        }

        /* Группы кнопок */
        .player__footer__left,
        .player__footer__right {
            display: flex !important;
            align-items: center !important;
            gap: 25px !important;
        }

        /* Сами кнопки (Play, Pause, перемотка) */
        .player__button {
            width: 40px !important;
            height: 40px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            border-radius: 50% !important;
            background: transparent !important;
            color: #fff !important;
            transition: background 0.2s, transform 0.1s !important;
        }

        /* Иконки внутри кнопок (увеличены для удобства) */
        .player__button svg {
            width: 26px !important;
            height: 26px !important;
        }

        /* Подсветка фокуса для ТВ (outline) и Hover для ПК */
        .player__button.is-focus,
        .player__button:hover {
            background: rgba(255, 255, 255, 0.15) !important;
            transform: scale(1.1) !important;
        }
        .player__button.is-focus {
            outline: 2px solid rgba(255, 255, 255, 0.5) !important;
            outline-offset: -2px !important;
        }

        /* --- РЕГУЛИРОВКА ЗВУКА --- */
        .player__volume {
            display: flex !important;
            align-items: center !important;
            gap: 10px !important;
            margin-left: -10px !important;
        }
        
        /* Иконка динамика */
        .player__volume__icon {
            width: 40px !important;
            height: 40px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            border-radius: 50% !important;
            transition: background 0.2s !important;
        }
        .player__volume__icon:hover { background: rgba(255, 255, 255, 0.15) !important; }
        .player__volume__icon svg { width: 22px !important; height: 22px !important; }

        /* Дорожка громкости */
        .player__volume__track {
            width: 100px !important;
            height: 16px !important; /* Зона клика */
            display: flex !important;
            align-items: center !important;
            position: relative !important;
            cursor: pointer !important;
        }
        .player__volume__line {
            width: 100% !important;
            height: 4px !important;
            background: rgba(255, 255, 255, 0.3) !important;
            border-radius: 4px !important;
            position: relative !important;
            transition: height 0.2s ease !important;
        }
        .player__volume__played {
            height: 100% !important;
            background: #fff !important;
            border-radius: 4px !important;
        }
        .player__volume__thumb {
            width: 12px !important;
            height: 12px !important;
            background: #fff !important;
            border-radius: 50% !important;
            position: absolute !important;
            right: 0 !important;
            top: 50% !important;
            transform: translate(50%, -50%) scale(0) !important;
            transition: transform 0.2s ease !important;
        }

        /* При фокусе/наведении на блок звука */
        .player__volume:hover .player__volume__line,
        .player__volume.is-focus .player__volume__line {
            height: 6px !important;
        }
        .player__volume:hover .player__volume__thumb,
        .player__volume.is-focus .player__volume__thumb {
            transform: translate(50%, -50%) scale(1) !important;
        }

        /* Время видео */
        .player__time {
            font-family: Roboto, Arial, sans-serif !important;
            font-size: 14px !important;
            color: #fff !important;
            margin-left: 10px !important;
            font-weight: 400 !important;
        }

        /* Заголовок видео сверху по центру */
        .player__header__title {
            text-align: center !important;
            font-size: 18px !important;
            font-weight: 500 !important;
            color: #fff !important;
            text-shadow: 0 2px 4px rgba(0,0,0,0.8) !important;
            padding: 0 20px !important;
        }
    `;
    document.head.appendChild(style);

    // ==========================================
    // 2. ЛОГИКА ЗАГРУЗКИ И ЗАПУСКА ВИДЕО
    // ==========================================
    function YoutubeMain(component) {
        let network = new Lampa.Reguest();
        let html = $('<div class="scroll"><div class="youtube-plugin-container"><div class="yt-grid"></div></div></div>');
        
        html.find('.yt-grid').html('<div style="text-align:center; padding:40px; color:#aaa; grid-column: 1/-1;">Загрузка видео...</div>');

        function formatCount(num) {
            if (!num) return '';
            if (num >= 1000000) return (num / 1000000).toFixed(1) + ' млн просмотров';
            if (num >= 1000) return (num / 1000).toFixed(0) + ' тыс. просмотров';
            return num + ' просмотров';
        }

        function buildCard(item) {
            let video_id = item.url.split('=')[1];

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

            // Навигация и запуск
            card.on('hover:enter', function () {
                Lampa.Controller.toggle('content', false);
                let loader = $('<div class="broadcast__scan" style="position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); z-index:1000;"></div>');
                $('body').append(loader);

                // Запрашиваем прямую ссылку на поток
                network.silent('https://pipedapi.kavin.rocks/streams/' + video_id, (stream_data) => {
                    loader.remove();
                    
                    // Ищем MP4 поток со звуком
                    let video_stream = stream_data.videoStreams.find(s => s.mimeType.includes('mp4') && !s.videoOnly);
                    if(!video_stream) video_stream = stream_data.videoStreams.find(s => s.mimeType.includes('mp4'));

                    if(video_stream) {
                        let playlist = [{
                            title: item.title,
                            url: video_stream.url
                        }];
                        
                        // ЗАПУСКАЕМ КРАСИВЫЙ СИСТЕМНЫЙ ПЛЕЕР LAMPA
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

        this.create = function () { return this.render(); };

        this.render = function () {
            let api_url = "https://pipedapi.kavin.rocks/trending?region=US";
            
            network.silent(api_url, (data) => {
                html.find('.yt-grid').empty();
                data.forEach(item => {
                    html.find('.yt-grid').append(buildCard(item));
                });
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
    // 3. РЕГИСТРАЦИЯ
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
