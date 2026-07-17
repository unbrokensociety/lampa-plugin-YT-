function applyYouTubeStyle() {
    // Проверяем, не добавили ли мы уже стили
    if (document.getElementById('youtube-style-lampa')) return;

    const style = document.createElement('style');
    style.id = 'youtube-style-lampa';
    style.innerHTML = `
        /* Контейнер плеера */
        .player { background: #000 !important; }
        
        /* Полоса прогресса */
        .player .player-footer__progress {
            height: 4px !important;
            background: rgba(255,255,255,0.3) !important;
            border-radius: 0 !important;
            transform: translateY(-25px) !important;
            transition: height 0.1s ease !important;
        }
        .player .player-footer__progress:hover { height: 8px !important; }
        
        /* Красная линия просмотра */
        .player .player-footer__progress-load { background: rgba(255,255,255,0.5) !important; }
        .player .player-footer__progress-played { background: #FF0000 !important; }
        
        /* Кружок ползунка */
        .player .player-footer__progress-dot {
            width: 14px !important; height: 14px !important;
            background: #FF0000 !important; border-radius: 50% !important;
            top: 50% !important; transform: translate(-50%, -50%) scale(0) !important;
            box-shadow: none !important;
        }
        .player .player-footer__progress:hover .player-footer__progress-dot {
            transform: translate(-50%, -50%) scale(1) !important;
        }

        /* Кнопки */
        .player .player-panel__button {
            color: #FFF !important; opacity: 0.9 !important;
            width: 40px !important; height: 40px !important;
            margin-right: 10px !important; border-radius: 50% !important;
        }
        .player .player-panel__button:hover { background: rgba(255,255,255,0.1) !important; opacity: 1 !important; }
        .player .player-panel__button svg { width: 24px !important; height: 24px !important; }

        /* Время */
        .player .player-panel__time, .player .player-panel .time {
            color: #FFF !important; font-size: 1.1em !important; margin: 0 15px !important;
        }
        
        /* Заголовок */
        .player .player-video__top .name {
            color: #FFF !important; font-size: 1.2em !important; padding: 20px !important; text-shadow: none !important;
        }
    `;
    document.head.appendChild(style);
}

// Вызови эту функцию когда плеер открывается. 
// Например, повесь слушатель на открытие плеера:
Lampa.Player.listener.follow('start', (e) => {
    applyYouTubeStyle();
});
