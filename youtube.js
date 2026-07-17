// lampa-plugin-YT-@main/youtube.js
(function () {
    'use strict';

    // Перевіряємо, чи запущено в Lampa
    if (!window.Lampa) return console.log('Lampa YouTube Plugin: Lampa not found');

    // ==========================================
    // 1. ВСТАНОВЛЕННЯ СТИЛІВ ЯК В СПРАВЖНЬОМУ YT
    // ==========================================
    const style = document.createElement('style');
    style.id = 'youtube-custom-theme';
    style.textContent = `
        /* Стираємо фон Lampa, робимо як в YT (Pure Black #0f0f0f) */
        body.body--full, 
        .layer--wheight, 
        .startpage,
        .anybar--hide {
            background-color: #0f0f0f !important;
        }

        /* Ховаємо стандартний верхній бар Lampa, якщо він заважає, або робимо йогоYT-стилем */
        .head {
            background-color: #0f0f0f !important;
            border-bottom: 1px solid #272727 !important;
            box-shadow: none !important;
            height: 56px !important;
        }

        /* Контент на всю ширину (прибиваємо до країв) */
        .content {
            padding: 0 !important;
            margin: 0 !important;
        }
        
        .layer-content {
            padding-top: 16px !important;
        }

        /* Сітка карток як на головній YT */
        .cards--full {
            display: grid !important;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)) !important;
            gap: 40px 16px !important;
            padding: 16px 24px !important;
            width: 100% !important;
            box-sizing: border-box !important;
        }

        @media (max-width: 900px) {
            .cards--full {
                grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)) !important;
                gap: 24px 12px !important;
                padding: 12px 16px !important;
            }
        }

        /* САМЕ ГЛАВНЕ: Прибираємо "квадратність" карток Lampa */
        .full-card {
            background: transparent !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            cursor: pointer;
            transition: transform 0.1s ease;
        }

        /* Мініатюра (Thumbnail) 16:9 */
        .full-card__img {
            border-radius: 12px !important;
            width: 100% !important;
            aspect-ratio: 16 / 9 !important;
            overflow: hidden !important;
            background-color: #272727 !important;
            position: relative !important;
            margin-bottom: 12px !important;
        }

        .full-card__img img {
            width: 100% !important;
            height: 100% !important;
            object-fit: cover !important;
            border-radius: 12px !important;
            transition: transform 0.2s ease;
        }

        /* Ефект при наведенні миші (як на YT) */
        .full-card:hover .full-card__img img {
            border-radius: 0 !important;
            transform: scale(1.05);
        }
        .full-card:hover .full-card__img {
            border-radius: 0 !important;
        }

        /* Час відео (Duration) */
        .full-card__time {
            background: rgba(0, 0, 0, 0.8) !important;
            color: #fff !important;
            font-size: 12px !important;
            font-weight: 500 !important;
            padding: 2px 4px !important;
            border-radius: 4px !important;
            right: 4px !important;
            bottom: 4px !important;
            position: absolute !important;
        }

        /* Текст під відео (Title, Channel, Stats) */
        .full-card__body {
            display: flex !important;
            gap: 12px !important;
        }

        /* Аватар каналу (якщо є, або просто ігноримо) */
        .full-card__badge {
            display: none !important; /* Ховаємо стандартний бейдж Lampa */
        }

        .full-card__info {
            display: flex !important;
            flex-direction: column !important;
            gap: 4px !important;
            width: 100% !important;
        }

        .full-card__title {
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

        .full-card__text {
            color: #aaaaaa !important;
            font-family: Roboto, Arial, sans-serif !important;
            font-size: 12px !important;
            font-weight: 400 !important;
            line-height: 18px !important;
            margin: 0 !important;
            padding: 0 !important;
        }

        /* Ховаємо зайві елементи Lampa */
        .full-card__footer,
        .full-card__rate,
        .full-card__view {
            display: none !important;
        }

        /* Скролбар як в YT */
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #717171; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #909090; }
    `;
    document.head.appendChild(style);

    // ==========================================
    // 2. ЛОГІКА ПЛАГІНА (ІНТЕГРАЦІЯ З LAMPA)
    // ==========================================
    
    function createYoutubeComponent(object) {
        let scroll = Lampa.Arrays.createScroll();
        let items = [];
        let html = $('<div class="youtube-plugin-container"><div class="cards--full"></div></div>');
        
        // Функция для форматування чисел (напр. 1.2M переглядів)
        function formatCount(num) {
            if (!num) return '';
            if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M переглядів';
            if (num >= 1000) return (num / 1000).toFixed(0) + 'K переглядів';
            return num + ' переглядів';
        }

        // Функція створення однієї картки
        function buildCard(item) {
            let card = $(`
                <div class="full-card">
                    <div class="full-card__img">
                        <img src="${item.img || ''}" alt="">
                        ${item.duration ? `<span class="full-card__time">${item.duration}</span>` : ''}
                    </div>
                    <div class="full-card__body">
                        <div class="full-card__info">
                            <div class="full-card__title">${item.title || 'Без назви'}</div>
                            <div class="full-card__text">${item.channel || 'YouTube'}</div>
                            <div class="full-card__text">${item.views ? formatCount(item.views) : ''} ${item.time ? '• ' + item.time : ''}</div>
                        </div>
                    </div>
                </div>
            `);

            card.on('click', function () {
                Lampa.Activity.push({
                    url: item.url || item.id,
                    title: item.title,
                    component: 'youtube_player', // Тут має бути твій компонент плеєра
                    page: 1
                });
            });

            return card;
        }

        this.create = function () {
            return this.render();
        };

        this.render = function () {
            // Тут повинен бути запит до твого API (який написав Клод)
            // Я залишаю заглушку, ТИ МАЄШ ВСТАВИТИ СВОЮ ФУНКЦІЮ ЗАВАНТАЖЕННЯ ДАНИХ
            // Приклад:
            /*
            Lampa.Network.silent("ТВОЙ_API_ЭНДПОИНТ", (data) => {
                data.items.forEach(item => {
                    html.find('.cards--full').append(buildCard(item));
                });
            });
            */

            // --- ЗАГЛУШКА ДЛЯ ДЕМОНСТРАЦІЇ (Видали це коли підключиш свій API) ---
            for(let i=0; i<20; i++) {
                html.find('.cards--full').append(buildCard({
                    title: 'Як зробити плагін для Lampa - Частина ' + (i+1),
                    channel: 'Твій Канал',
                    img: 'https://picsum.photos/640/360?random='+i,
                    duration: Math.floor(Math.random()*20)+1 + ':' + String(Math.floor(Math.random()*60)).padStart(2,'0'),
                    views: Math.floor(Math.random()*1000000),
                    time: '2 дні тому'
                }));
            }
            // -----------------------------------------------------------------

            return html;
        };

        this.destroy = function () {
            scroll.destroy();
            html.remove();
            style.remove();
        };
    }

    // Реєстрація компонента в Lampa (якщо використовується старий метод)
    if (Lampa.Components) {
        Lampa.Components.add('youtube_main', createYoutubeComponent);
    } else {
        console.log('Lampa YouTube Plugin: Styles applied. Waiting for data injection.');
    }

    // Додаємо пункт в меню (опціонально, прибери якщо Клод зробив це інакше)
    function addToMenu() {
        if (Lampa.MainMenu && !Lampa.MainMenu.listener.follow('youtube', function () {
            Lampa.Activity.push({
                url: '',
                title: 'YouTube',
                component: 'youtube_main',
                page: 1
            });
        })) {
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

    if (Lampa.MainMenu) addToMenu();
    else Lampa.Listener.follow('app', addToMenu);

})();
