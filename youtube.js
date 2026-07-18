(function () {
    'use strict';

    if (!window.Lampa) {
        return console.log('Lampa YouTube Plugin: Lampa not found');
    }

    /**
     * Добавляет стиль один раз. Отдельные id важны: так тема каталога и тема
     * плеера не конфликтуют между собой, а повторная загрузка плагина не
     * размножает теги <style>.
     */
    function appendStyle(id, css) {
        if (document.getElementById(id)) return;

        var style = document.createElement('style');
        style.id = id;
        style.textContent = css;
        document.head.appendChild(style);
    }

    // =============================================================
    // 1. СТИЛЬ СТРАНИЦЫ YOUTUBE
    // =============================================================
    appendStyle('youtube-custom-theme', `
        /* Убираем рамки, отступы и серые фоны Lampa только у экрана плагина. */
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

        /* Адаптивная сетка роликов. */
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

        .yt-card {
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            cursor: pointer;
            outline: none !important;
        }

        /* Lampa добавляет .is-focus при навигации пультом. */
        .yt-card.is-focus .yt-card__img {
            transform: scale(1.03);
            border-radius: 0 !important;
        }

        .yt-card.is-focus .yt-card__img img {
            border-radius: 0 !important;
        }

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
