(function () {
    'use strict';

    /**
     * ============================================================
     *  LAMPA PLAYER — ПОЛНЫЙ YOUTUBE ДИЗАЙН
     * ============================================================
     *
     *  Точная копия дизайна YouTube плеера:
     *  — Прогресс-бар сверху контролов (красный, тонкий)
     *  — Кнопки: Play | Next | Volume + слайдер | Время ... Subs | Настройки ⚙ | Fullscreen
     *  — Меню настроек: всплывающее окно сверху с суб-панелями
     *  — Выбор качества: через меню настроек (не сбоку!)
     *  — Горизонтальный слайдер громкости рядом с иконкой
     *  — Градиент только снизу
     *
     * ============================================================
     */

    function startPlugin() {

        /* ============================================================
         *  CSS СТИЛИ — ПОЛНЫЙ YOUTUBE ДИЗАЙН
         * ============================================================ */

        var css = `

        /* ===========================================
         *  СБРОС — убираем все дефолтные стили Lampa
         * =========================================== */

        .player:not(.iptv) .player-panel,
        .player:not(.iptv) .player-info,
        .player:not(.iptv) .player-footer {
            background: transparent !important;
            -webkit-backdrop-filter: none !important;
            backdrop-filter: none !important;
            box-shadow: none !important;
        }

        .player:not(.iptv) .player-panel__body,
        .player:not(.iptv) .player-info__body,
        .player:not(.iptv) .player-footer__body {
            padding: 0 !important;
        }

        .player:not(.iptv) .player-footer__row {
            padding: 0 !important;
        }

        /* Скрываем «Назад» — в YouTube его нет */
        .player:not(.iptv) .head-backward {
            display: none !important;
        }

        /* Скрываем стандартный volume overlay Lampa */
        .player-video__volume-default {
            display: none !important;
        }


        /* ===========================================
         *  ОВЕРЛЕЙ — Градиент ТОЛЬКО снизу
         *  Как в YouTube: верх чистый, низ затемнён
         * =========================================== */

        .player-video__overlay {
            display: none !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            pointer-events: none !important;
            background: linear-gradient(
                to top,
                rgba(0, 0, 0, 0.8) 0%,
                rgba(0, 0, 0, 0.4) 12%,
                rgba(0, 0, 0, 0.0) 28%,
                rgba(0, 0, 0, 0.0) 100%
            ) !important;
            z-index: 1 !important;
        }

        .player:not(.iptv).player--panel-visible .player-video__overlay {
            display: block !important;
            animation: yt-fade-in 0.25s ease-out !important;
        }

        /* Верхний градиент для заголовка */
        .player-video__overlay::before {
            content: "" !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            height: 120px !important;
            background: linear-gradient(
                to bottom,
                rgba(0, 0, 0, 0.6) 0%,
                rgba(0, 0, 0, 0.0) 100%
            ) !important;
            pointer-events: none !important;
        }


        /* ===========================================
         *  ЗАГОЛОВОК — Верхний левый угол
         * =========================================== */

        .player:not(.iptv) .player-info {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            z-index: 10 !important;
            padding: 1.2em 1.5em !important;
        }

        .player:not(.iptv) .player-info__title {
            font-size: 1.15em !important;
            font-weight: 500 !important;
            line-height: 1.3 !important;
            color: #fff !important;
            text-shadow: 0 1px 3px rgba(0,0,0,0.5) !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
            max-width: 70% !important;
            display: block !important;
            letter-spacing: 0.01em !important;
        }

        .player:not(.iptv) .player-info__name {
            font-size: 0.9em !important;
            opacity: 0.7 !important;
            margin-top: 0.2em !important;
            text-shadow: 0 1px 3px rgba(0,0,0,0.5) !important;
        }

        /* Время справа вверху */
        .player:not(.iptv) .player-info__time {
            position: absolute !important;
            top: 1.2em !important;
            right: 1.5em !important;
            font-size: 0.85em !important;
            opacity: 0.7 !important;
            font-variant-numeric: tabular-nums !important;
        }


        /* ===========================================
         *  НИЖНЯЯ ПАНЕЛЬ — Контролы YouTube
         *
         *  Структура (сверху вниз):
         *  1. Прогресс-бар (полная ширина)
         *  2. Ряд кнопок:
         *     Лево: Play | Next | 🔊 slider | 0:00/0:00
         *     Право: Subs | ⚙ Settings | ⛶ Fullscreen
         * =========================================== */

        .player:not(.iptv) .player-panel {
            position: absolute !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            z-index: 20 !important;
            padding: 0 12px 8px 12px !important;
        }

        .player:not(.iptv) .player-panel__body {
            display: flex !important;
            flex-direction: column !important;
            gap: 0 !important;
        }


        /* ===========================================
         *  ПРОГРЕСС-БАР — Красная полоса YouTube
         * =========================================== */

        .player:not(.iptv) .player-panel__timeline {
            width: 100% !important;
            height: 3px !important;
            background: rgba(255, 255, 255, 0.25) !important;
            border-radius: 0 !important;
            cursor: pointer !important;
            position: relative !important;
            overflow: visible !important;
            z-index: 30 !important;
            margin: 0 0 8px 0 !important;
            transition: height 0.1s ease !important;
            order: -1 !important;
        }

        .player:not(.iptv) .player-panel__timeline:hover {
            height: 5px !important;
        }

        .player:not(.iptv) .player-panel__timeline.focus {
            height: 5px !important;
        }

        /* Прогресс — красная заливка */
        .player:not(.iptv) .player-panel__position {
            background: transparent !important;
            height: 100% !important;
            position: relative !important;
            overflow: visible !important;
            border-radius: 0 !important;
        }

        .player:not(.iptv) .player-panel__position > div {
            background: #FF0000 !important;
            height: 100% !important;
            border-radius: 0 !important;
            position: relative !important;
        }

        /* Скраббер — красная точка */
        .player:not(.iptv) .player-panel__position > div::after {
            content: "" !important;
            display: block !important;
            width: 13px !important;
            height: 13px !important;
            background: #FF0000 !important;
            border-radius: 50% !important;
            position: absolute !important;
            right: -6.5px !important;
            top: 50% !important;
            transform: translateY(-50%) scale(0) !important;
            transition: transform 0.1s cubic-bezier(0.4, 0, 0.2, 1) !important;
            z-index: 5 !important;
        }

        .player:not(.iptv) .player-panel__timeline:hover .player-panel__position > div::after,
        .player:not(.iptv) .player-panel__timeline.focus .player-panel__position > div::after {
            transform: translateY(-50%) scale(1) !important;
        }

        .player:not(.iptv) .player-panel__timeline:not(.focus):not(:hover) .player-panel__position > div::after {
            transform: translateY(-50%) scale(0) !important;
        }


        /* ===========================================
         *  РЯД КНОПОК — Главная полоса контролов
         * =========================================== */

        .player:not(.iptv) .player-panel__line-two {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            width: 100% !important;
            height: 40px !important;
        }

        .player:not(.iptv) .player-panel__left,
        .player:not(.iptv) .player-panel__right,
        .player:not(.iptv) .player-panel__center {
            display: flex !important;
            align-items: center !important;
            gap: 0 !important;
        }

        .player:not(.iptv) .player-panel__center {
            display: none !important;
        }

        /* Время над кнопками — скрываем дефолтное, покажем своё */
        .player:not(.iptv) .player-panel__line-one {
            display: none !important;
        }


        /* ===========================================
         *  КНОПКИ — Белые иконки без фона
         * =========================================== */

        .player:not(.iptv) .player-panel .button {
            background: transparent !important;
            border: none !important;
            padding: 8px !important;
            width: 40px !important;
            height: 40px !important;
            border-radius: 50% !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            cursor: pointer !important;
            transition: background-color 0.15s ease,
                        opacity 0.15s ease !important;
            position: relative !important;
            flex-shrink: 0 !important;
            opacity: 0.9 !important;
        }

        .player:not(.iptv) .player-panel .button > svg {
            width: 22px !important;
            height: 22px !important;
            fill: #fff !important;
        }

        .player:not(.iptv) .player-panel .button + .button {
            margin-left: 0 !important;
        }

        /* Hover на кнопке */
        .player:not(.iptv) .player-panel .button:hover {
            opacity: 1 !important;
        }

        /* Focus для ТВ */
        .player:not(.iptv) .player-panel .button.focus {
            background: rgba(255, 255, 255, 0.15) !important;
            opacity: 1 !important;
        }

        /* Play/Pause — чуть крупнее */
        .player:not(.iptv) .player-panel__playpause {
            width: 46px !important;
            height: 46px !important;
            margin: 0 !important;
        }

        .player:not(.iptv) .player-panel__playpause > svg {
            width: 28px !important;
            height: 28px !important;
        }

        .player:not(.iptv) .player-panel__playpause:not(.focus) {
            background: transparent !important;
        }

        .player:not(.iptv) .player-panel__playpause.focus {
            background: rgba(255, 255, 255, 0.15) !important;
        }

        /* Next/Prev */
        .player:not(.iptv) .player-panel__next > svg,
        .player:not(.iptv) .player-panel__prev > svg {
            width: 18px !important;
            height: 18px !important;
        }

        /* Pill-контейнеры кнопок — прозрачные */
        .player:not(.iptv) .player-panel__box-buttons {
            display: flex !important;
            align-items: center !important;
            background: transparent !important;
            border-radius: 0 !important;
            flex-shrink: 0 !important;
        }


        /* ===========================================
         *  КНОПКА КАЧЕСТВА — Текстовая, YouTube-стиль
         * =========================================== */

        .player:not(.iptv) .player-panel__quality {
            border-radius: 2px !important;
            padding: 0 8px !important;
            font-size: 0.8em !important;
            font-weight: 500 !important;
            height: 28px !important;
            line-height: 28px !important;
            letter-spacing: 0.03em !important;
            opacity: 0.9 !important;
        }

        .player:not(.iptv) .player-panel__quality.focus,
        .player:not(.iptv) .player-panel__quality:hover {
            background: rgba(255, 255, 255, 0.15) !important;
            opacity: 1 !important;
        }


        /* ===========================================
         *  ВРЕМЯ — Рядом с кнопками (как YouTube)
         * =========================================== */

        .yt-time-display {
            display: flex !important;
            align-items: center !important;
            color: #fff !important;
            font-size: 13px !important;
            font-weight: 400 !important;
            font-variant-numeric: tabular-nums !important;
            margin-left: 12px !important;
            white-space: nowrap !important;
            opacity: 0.9 !important;
            letter-spacing: 0.02em !important;
            user-select: none !important;
            -webkit-user-select: none !important;
        }

        .yt-time-display__separator {
            margin: 0 4px !important;
            opacity: 0.7 !important;
        }


        /* ===========================================
         *  ГОРИЗОНТАЛЬНЫЙ СЛАЙДЕР ГРОМКОСТИ
         *  (рядом с иконкой, как в YouTube)
         * =========================================== */

        .yt-volume-wrap {
            display: flex !important;
            align-items: center !important;
            position: relative !important;
            margin-left: 0 !important;
        }

        .yt-volume-slider-container {
            width: 0 !important;
            overflow: hidden !important;
            transition: width 0.2s cubic-bezier(0.4, 0, 0.2, 1),
                        margin 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
            display: flex !important;
            align-items: center !important;
            margin-left: 0 !important;
        }

        .yt-volume-wrap:hover .yt-volume-slider-container,
        .yt-volume-wrap.yt-vol-expanded .yt-volume-slider-container {
            width: 52px !important;
            margin-left: 0 !important;
            margin-right: 4px !important;
        }

        .yt-volume-slider {
            width: 52px !important;
            height: 3px !important;
            background: rgba(255, 255, 255, 0.3) !important;
            border-radius: 1.5px !important;
            position: relative !important;
            cursor: pointer !important;
        }

        .yt-volume-slider__fill {
            height: 100% !important;
            background: #fff !important;
            border-radius: 1.5px !important;
            position: relative !important;
            transition: width 0.1s ease !important;
        }

        .yt-volume-slider__thumb {
            width: 12px !important;
            height: 12px !important;
            background: #fff !important;
            border-radius: 50% !important;
            position: absolute !important;
            right: -6px !important;
            top: 50% !important;
            transform: translateY(-50%) scale(0) !important;
            transition: transform 0.1s ease !important;
        }

        .yt-volume-wrap:hover .yt-volume-slider__thumb,
        .yt-volume-wrap.yt-vol-expanded .yt-volume-slider__thumb {
            transform: translateY(-50%) scale(1) !important;
        }


        /* ===========================================
         *  МЕНЮ НАСТРОЕК — Всплывающее окно YouTube
         *
         *  Появляется НАД кнопкой ⚙ (снизу вверх),
         *  тёмный фон, скруглённые углы, суб-панели
         *  с анимацией slide
         * =========================================== */

        .yt-settings-menu {
            position: absolute !important;
            bottom: 56px !important;
            right: 12px !important;
            background: #212121 !important;
            border-radius: 12px !important;
            min-width: 250px !important;
            max-height: 320px !important;
            overflow: hidden !important;
            z-index: 500 !important;
            opacity: 0 !important;
            transform: translateY(8px) scale(0.96) !important;
            transform-origin: bottom right !important;
            transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1),
                        transform 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
            pointer-events: none !important;
            box-shadow: 0 4px 32px rgba(0,0,0,0.5),
                        0 0 0 1px rgba(255,255,255,0.06) !important;
            font-family: 'Roboto', 'YouTube Noto', Arial, sans-serif !important;
        }

        .yt-settings-menu.yt-settings-visible {
            opacity: 1 !important;
            transform: translateY(0) scale(1) !important;
            pointer-events: auto !important;
        }

        /* Панель (главная / суб-панель) */
        .yt-settings-panel {
            display: none !important;
            flex-direction: column !important;
            max-height: 320px !important;
            overflow-y: auto !important;
        }

        .yt-settings-panel.yt-panel-active {
            display: flex !important;
        }

        /* Заголовок панели (с кнопкой «Назад») */
        .yt-settings-header {
            display: flex !important;
            align-items: center !important;
            padding: 12px 16px !important;
            border-bottom: 1px solid rgba(255,255,255,0.1) !important;
            gap: 12px !important;
        }

        .yt-settings-header__back {
            width: 24px !important;
            height: 24px !important;
            cursor: pointer !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            border-radius: 50% !important;
            transition: background 0.15s ease !important;
            flex-shrink: 0 !important;
        }

        .yt-settings-header__back:hover,
        .yt-settings-header__back.focus {
            background: rgba(255,255,255,0.1) !important;
        }

        .yt-settings-header__back svg {
            width: 18px !important;
            height: 18px !important;
            fill: #fff !important;
        }

        .yt-settings-header__title {
            font-size: 14px !important;
            font-weight: 500 !important;
            color: #fff !important;
        }

        /* Элемент меню */
        .yt-settings-item {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            padding: 10px 16px !important;
            cursor: pointer !important;
            transition: background-color 0.12s ease !important;
            color: #eee !important;
            font-size: 14px !important;
            gap: 12px !important;
            user-select: none !important;
            -webkit-user-select: none !important;
        }

        .yt-settings-item:hover,
        .yt-settings-item.focus {
            background: rgba(255, 255, 255, 0.1) !important;
        }

        .yt-settings-item__label {
            display: flex !important;
            align-items: center !important;
            gap: 12px !important;
            flex: 1 !important;
        }

        .yt-settings-item__icon {
            width: 20px !important;
            height: 20px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            flex-shrink: 0 !important;
        }

        .yt-settings-item__icon svg {
            width: 20px !important;
            height: 20px !important;
            fill: #fff !important;
        }

        .yt-settings-item__text {
            font-size: 14px !important;
        }

        .yt-settings-item__value {
            font-size: 13px !important;
            color: rgba(255,255,255,0.5) !important;
            display: flex !important;
            align-items: center !important;
            gap: 4px !important;
        }

        .yt-settings-item__arrow {
            width: 16px !important;
            height: 16px !important;
            fill: rgba(255,255,255,0.5) !important;
        }

        /* Элемент качества — с чекмаркой */
        .yt-quality-item {
            display: flex !important;
            align-items: center !important;
            padding: 10px 16px !important;
            cursor: pointer !important;
            transition: background-color 0.12s ease !important;
            color: #eee !important;
            font-size: 14px !important;
            gap: 12px !important;
        }

        .yt-quality-item:hover,
        .yt-quality-item.focus {
            background: rgba(255, 255, 255, 0.1) !important;
        }

        .yt-quality-item__check {
            width: 20px !important;
            height: 20px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            flex-shrink: 0 !important;
        }

        .yt-quality-item__check svg {
            width: 18px !important;
            height: 18px !important;
            fill: #3ea6ff !important;
            opacity: 0 !important;
        }

        .yt-quality-item.yt-quality-active .yt-quality-item__check svg {
            opacity: 1 !important;
        }

        .yt-quality-item__label {
            flex: 1 !important;
        }

        .yt-quality-item__badge {
            font-size: 11px !important;
            background: rgba(255,255,255,0.1) !important;
            color: rgba(255,255,255,0.7) !important;
            padding: 2px 6px !important;
            border-radius: 2px !important;
            margin-left: 8px !important;
        }


        /* ===========================================
         *  КНОПКА НАСТРОЕК (⚙) — Шестерёнка
         * =========================================== */

        .yt-settings-btn {
            width: 40px !important;
            height: 40px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            cursor: pointer !important;
            border-radius: 50% !important;
            transition: background 0.15s ease, transform 0.3s ease !important;
            flex-shrink: 0 !important;
            opacity: 0.9 !important;
        }

        .yt-settings-btn:hover {
            opacity: 1 !important;
        }

        .yt-settings-btn.focus {
            background: rgba(255,255,255,0.15) !important;
            opacity: 1 !important;
        }

        .yt-settings-btn svg {
            width: 22px !important;
            height: 22px !important;
            fill: #fff !important;
            transition: transform 0.3s ease !important;
        }

        .yt-settings-btn.yt-settings-open svg {
            transform: rotate(30deg) !important;
        }


        /* ===========================================
         *  ИНДИКАТОРЫ — Пауза, загрузка
         * =========================================== */

        .player:not(.iptv) .player-video__paused,
        .player:not(.iptv) .player-video__loader {
            background-color: rgba(0, 0, 0, 0.4) !important;
            border-radius: 50% !important;
        }


        /* ===========================================
         *  НОРМАЛИЗАЦИЯ ЗВУКА
         * =========================================== */

        .normalization {
            background: rgba(255, 255, 255, 0.08) !important;
            border-radius: 8px !important;
        }

        .normalization canvas {
            border-radius: 8px !important;
        }


        /* ===========================================
         *  АДАПТИВНОСТЬ
         * =========================================== */

        /* Мобилки */
        @media (max-width: 768px) {
            .player:not(.iptv) .player-panel .button {
                min-width: 44px !important;
                min-height: 44px !important;
            }

            .player:not(.iptv) .player-panel__timeline {
                height: 5px !important;
            }

            .player:not(.iptv) .player-panel__timeline:active {
                height: 8px !important;
            }

            .player:not(.iptv) .player-panel__position > div::after {
                transform: translateY(-50%) scale(1) !important;
                width: 16px !important;
                height: 16px !important;
            }

            .player:not(.iptv) .player-panel__playpause {
                width: 50px !important;
                height: 50px !important;
            }

            .player:not(.iptv) .player-info__title {
                font-size: 1em !important;
                max-width: 80% !important;
            }

            .yt-settings-menu {
                min-width: 220px !important;
                right: 8px !important;
                bottom: 50px !important;
            }

            .yt-time-display {
                font-size: 12px !important;
                margin-left: 8px !important;
            }

            .yt-volume-wrap:hover .yt-volume-slider-container,
            .yt-volume-wrap.yt-vol-expanded .yt-volume-slider-container {
                width: 40px !important;
            }

            .yt-volume-slider {
                width: 40px !important;
            }
        }

        /* ТВ — большие экраны */
        @media (min-width: 1920px) {
            .player:not(.iptv) .player-panel .button.focus {
                transform: scale(1.15) !important;
            }

            .player:not(.iptv) .player-panel__position > div::after {
                width: 16px !important;
                height: 16px !important;
                right: -8px !important;
            }

            .player:not(.iptv) .player-panel__timeline.focus {
                height: 6px !important;
            }

            .yt-settings-menu {
                min-width: 300px !important;
            }

            .yt-settings-item {
                padding: 14px 20px !important;
                font-size: 16px !important;
            }

            .yt-quality-item {
                padding: 14px 20px !important;
                font-size: 16px !important;
            }
        }


        /* ===========================================
         *  АНИМАЦИИ
         * =========================================== */

        @keyframes yt-fade-in {
            from { opacity: 0; }
            to   { opacity: 1; }
        }

        @keyframes yt-slide-up {
            from {
                opacity: 0;
                transform: translateY(8px) scale(0.96);
            }
            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }

        @keyframes animation-trigger-enter {
            from { transform: scale(0.8); opacity: 0; }
            to   { transform: scale(1); opacity: 1; }
        }

        @keyframes animation-opacity {
            from { opacity: 0; }
            to   { opacity: 1; }
        }

        .player:not(.iptv) .player-panel .button:active {
            transform: scale(0.92) !important;
        }


        /* ===========================================
         *  СКРОЛЛБАР В МЕНЮ (тонкий, тёмный)
         * =========================================== */

        .yt-settings-panel::-webkit-scrollbar {
            width: 4px !important;
        }

        .yt-settings-panel::-webkit-scrollbar-track {
            background: transparent !important;
        }

        .yt-settings-panel::-webkit-scrollbar-thumb {
            background: rgba(255,255,255,0.2) !important;
            border-radius: 2px !important;
        }

        `;

        /* ============================================================
         *  ВСТАВКА СТИЛЕЙ
         * ============================================================ */

        $('#yt-player-style').remove();
        $('body').append('<style id="yt-player-style">' + css + '</style>');


        /* ============================================================
         *  SVG ИКОНКИ
         * ============================================================ */

        var ICONS = {
            gear: '<svg viewBox="0 0 24 24"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/></svg>',

            arrowRight: '<svg viewBox="0 0 24 24"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>',

            arrowLeft: '<svg viewBox="0 0 24 24"><path d="M15.41 7.41L10.83 12l4.58 4.59L14 18l-6-6 6-6z"/></svg>',

            check: '<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>',

            quality: '<svg viewBox="0 0 24 24"><path d="M15,17H20V19H15V17M15,13H22V15H15V13M15,9H21V11H15V9M3,20A2,2 0 0,1 1,18V6A2,2 0 0,1 3,4H15A2,2 0 0,1 17,6V9H15V6H3V18H15V15H17V18A2,2 0 0,1 15,20H3M10,10.5A1.5,1.5 0 0,0 8.5,12A1.5,1.5 0 0,0 10,13.5A1.5,1.5 0 0,0 11.5,12A1.5,1.5 0 0,0 10,10.5Z"/></svg>',

            speed: '<svg viewBox="0 0 24 24"><path d="M10,8v8l6-4L10,8L10,8z M6.3,5L5.7,4.2C7.2,3,9,2.2,11,2L11,3C9.2,3.2,7.6,3.9,6.3,5z M5,6.3L4.2,5.7 C3,7.2,2.2,9,2,11l1,0C3.2,9.2,3.9,7.6,5,6.3z M5,17.7c-1.1-1.3-1.8-2.9-2-4.7l-1,0c0.2,2,1,3.8,2.2,5.3L5,17.7z M11,21 c-1.8-0.2-3.4-0.9-4.7-2l-0.7,0.8C7.2,21,9,21.8,11,22L11,21z M22,12c0-5.2-3.9-9.4-9-10l0,1c4.5,0.5,8,4.3,8,9s-3.5,8.5-8,9 l0,1C18.1,21.5,22,17.2,22,12z"/></svg>',

            subs: '<svg viewBox="0 0 24 24"><path d="M20,4H4C2.9,4,2,4.9,2,6v12c0,1.1,0.9,2,2,2h16c1.1,0,2-0.9,2-2V6C22,4.9,21.1,4,20,4z M4,12h4v2H4V12z M14,18H4v-2 h10V18z M20,18h-4v-2h4V18z M20,14H10v-2h10V14z"/></svg>',

            volumeHigh: '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>',

            volumeLow: '<svg viewBox="0 0 24 24"><path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/></svg>',

            volumeMute: '<svg viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>'
        };


        /* ============================================================
         *  DOM — ПЕРЕСТРОЙКА ИНТЕРФЕЙСА
         * ============================================================ */

        var render, title, value;
        var ui_inited = false;
        var settingsMenuEl = null;
        var settingsOpen = false;

        function initPlayerUI() {
            render = Lampa.Player.render();

            /** Заголовок */
            title = $('<div class="player-info__title"></div>');
            value = $('<div class="value--name"><span></span></div>');

            /* Оверлей */
            if (!render.find('.player-video__overlay').length) {
                render.find('.player-video__display').after(
                    $('<div class="player-video__overlay"></div>')
                );
            }

            /* Убираем лишнее из центра */
            render.find('.player-panel__center')
                .find('.button:not(.player-panel__playpause)')
                .remove();

            /* Заголовок */
            if (!render.find('.player-info__title').length) {
                render.find('.player-info .player-info__line').before(title);
            }

            if (!render.find('.value--name').length) {
                render.find('.value--size').after(value);
            }


            /* =======================================================
             *  ПЕРЕГРУППИРОВКА КНОПОК — YouTube Layout
             *
             *  Лево:  [Prev] [Play/Pause] [Next] [Volume+Slider] [Time]
             *  Право: [Subs] [Quality] [⚙ Settings] [остальные]
             * ======================================================= */

            var left_panel = render.find('.player-panel__left');
            var right_panel = render.find('.player-panel__right');

            /* Очищаем контейнеры от Lampa-группировок */
            left_panel.find('.player-panel__box-buttons').children().unwrap();
            right_panel.find('.player-panel__box-buttons').children().unwrap();

            /* --- ЛЕВАЯ ПАНЕЛЬ --- */
            var playBtn = left_panel.find('.player-panel__playpause');
            var prevBtn = left_panel.find('.player-panel__prev');
            var nextBtn = left_panel.find('.player-panel__next');

            /* Очищаем и пересобираем */
            left_panel.empty();

            if (prevBtn.length) left_panel.append(prevBtn);
            left_panel.append(playBtn);
            if (nextBtn.length) left_panel.append(nextBtn);


            /* --- ГОРИЗОНТАЛЬНЫЙ СЛАЙДЕР ГРОМКОСТИ --- */
            if (!left_panel.find('.yt-volume-wrap').length) {
                var volumeWrap = $(
                    '<div class="yt-volume-wrap">' +
                        '<div class="yt-volume-btn button" style="background:transparent!important;width:40px!important;height:40px!important;display:flex!important;align-items:center!important;justify-content:center!important;border-radius:50%!important;cursor:pointer!important;opacity:0.9!important;">' +
                            ICONS.volumeHigh +
                        '</div>' +
                        '<div class="yt-volume-slider-container">' +
                            '<div class="yt-volume-slider">' +
                                '<div class="yt-volume-slider__fill" style="width:100%">' +
                                    '<div class="yt-volume-slider__thumb"></div>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                    '</div>'
                );
                left_panel.append(volumeWrap);
            }


            /* --- ВРЕМЯ (встроим своё отображение) --- */
            if (!left_panel.find('.yt-time-display').length) {
                var timeDisplay = $(
                    '<div class="yt-time-display">' +
                        '<span class="yt-time-current">0:00</span>' +
                        '<span class="yt-time-display__separator"> / </span>' +
                        '<span class="yt-time-total">0:00</span>' +
                    '</div>'
                );
                left_panel.append(timeDisplay);
            }


            /* --- ПРАВАЯ ПАНЕЛЬ --- */
            var subsBtn = right_panel.find('.player-panel__subs');
            var tracksBtn = right_panel.find('.player-panel__tracks');
            var flowBtn = right_panel.find('.player-panel__flow');
            var qualityBtn = right_panel.find('.player-panel__quality');
            var playlistBtn = right_panel.find('.player-panel__playlist');
            var otherBtns = right_panel.find('.button')
                .not(subsBtn).not(tracksBtn).not(flowBtn).not(qualityBtn).not(playlistBtn);

            right_panel.empty();

            if (flowBtn.length) right_panel.append(flowBtn);
            if (subsBtn.length) right_panel.append(subsBtn);
            if (tracksBtn.length) right_panel.append(tracksBtn);

            /* Скрываем оригинальную кнопку качества —
               качество теперь через ⚙ Settings */
            if (qualityBtn.length) {
                qualityBtn.hide();
                right_panel.append(qualityBtn);
            }

            /* Кнопка ⚙ Настроек */
            if (!right_panel.find('.yt-settings-btn').length) {
                var settingsBtn = $(
                    '<div class="yt-settings-btn">' + ICONS.gear + '</div>'
                );
                right_panel.append(settingsBtn);
            }

            if (playlistBtn.length) right_panel.append(playlistBtn);
            if (otherBtns.length) right_panel.append(otherBtns);


            /* =======================================================
             *  МЕНЮ НАСТРОЕК — YouTube Settings Popup
             * ======================================================= */

            if (!render.find('.yt-settings-menu').length) {
                settingsMenuEl = $(
                    '<div class="yt-settings-menu">' +

                        /* === Главная панель === */
                        '<div class="yt-settings-panel yt-panel-main yt-panel-active">' +
                            /* Качество */
                            '<div class="yt-settings-item" data-panel="quality">' +
                                '<div class="yt-settings-item__label">' +
                                    '<div class="yt-settings-item__icon">' + ICONS.quality + '</div>' +
                                    '<span class="yt-settings-item__text">Качество</span>' +
                                '</div>' +
                                '<div class="yt-settings-item__value">' +
                                    '<span class="yt-settings-quality-val">Авто</span>' +
                                    ICONS.arrowRight +
                                '</div>' +
                            '</div>' +
                            /* Скорость */
                            '<div class="yt-settings-item" data-panel="speed">' +
                                '<div class="yt-settings-item__label">' +
                                    '<div class="yt-settings-item__icon">' + ICONS.speed + '</div>' +
                                    '<span class="yt-settings-item__text">Скорость</span>' +
                                '</div>' +
                                '<div class="yt-settings-item__value">' +
                                    '<span class="yt-settings-speed-val">Обычная</span>' +
                                    ICONS.arrowRight +
                                '</div>' +
                            '</div>' +
                        '</div>' +

                        /* === Панель качества === */
                        '<div class="yt-settings-panel yt-panel-quality">' +
                            '<div class="yt-settings-header">' +
                                '<div class="yt-settings-header__back" data-panel="main">' + ICONS.arrowLeft + '</div>' +
                                '<div class="yt-settings-header__title">Качество</div>' +
                            '</div>' +
                            '<div class="yt-quality-list"></div>' +
                        '</div>' +

                        /* === Панель скорости === */
                        '<div class="yt-settings-panel yt-panel-speed">' +
                            '<div class="yt-settings-header">' +
                                '<div class="yt-settings-header__back" data-panel="main">' + ICONS.arrowLeft + '</div>' +
                                '<div class="yt-settings-header__title">Скорость воспроизведения</div>' +
                            '</div>' +
                            '<div class="yt-speed-list"></div>' +
                        '</div>' +

                    '</div>'
                );

                render.find('.player-panel').append(settingsMenuEl);

                /* Скорости воспроизведения */
                var speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
                var speedList = settingsMenuEl.find('.yt-speed-list');

                speeds.forEach(function(s) {
                    var label = s === 1 ? 'Обычная' : s + 'x';
                    var item = $(
                        '<div class="yt-quality-item yt-speed-item' + (s === 1 ? ' yt-quality-active' : '') + '" data-speed="' + s + '">' +
                            '<div class="yt-quality-item__check">' + ICONS.check + '</div>' +
                            '<div class="yt-quality-item__label">' + label + '</div>' +
                        '</div>'
                    );
                    speedList.append(item);
                });
            }


            /* =======================================================
             *  ОБРАБОТЧИКИ СОБЫТИЙ
             * ======================================================= */

            /* --- Кнопка ⚙ --- */
            render.find('.yt-settings-btn').off('click.yts').on('click.yts', function(e) {
                e.stopPropagation();
                toggleSettings();
            });

            /* --- Навигация по панелям --- */
            render.find('.yt-settings-item[data-panel]').off('click.yts').on('click.yts', function(e) {
                e.stopPropagation();
                var panel = $(this).data('panel');
                showSettingsPanel(panel);
            });

            render.find('.yt-settings-header__back[data-panel]').off('click.yts').on('click.yts', function(e) {
                e.stopPropagation();
                var panel = $(this).data('panel');
                showSettingsPanel(panel);
            });

            /* --- Скорость --- */
            render.find('.yt-speed-item').off('click.yts').on('click.yts', function(e) {
                e.stopPropagation();
                var speed = parseFloat($(this).data('speed'));
                setPlaybackSpeed(speed);
                $(this).siblings().removeClass('yt-quality-active');
                $(this).addClass('yt-quality-active');
                var label = speed === 1 ? 'Обычная' : speed + 'x';
                render.find('.yt-settings-speed-val').text(label);
                setTimeout(function() { closeSettings(); }, 200);
            });

            /* --- Клик вне меню закрывает его --- */
            render.off('click.yts-close').on('click.yts-close', function(e) {
                if (settingsOpen && !$(e.target).closest('.yt-settings-menu, .yt-settings-btn').length) {
                    closeSettings();
                }
            });

            /* --- Volume button (mute/unmute) --- */
            render.find('.yt-volume-btn').off('click.ytvol').on('click.ytvol', function(e) {
                e.stopPropagation();
                var video = render.find('video')[0];
                if (video) {
                    video.muted = !video.muted;
                    updateVolumeUI(video.muted ? 0 : video.volume, video.muted);
                }
            });

            /* --- Volume slider --- */
            var volSlider = render.find('.yt-volume-slider');
            volSlider.off('click.ytvol').on('click.ytvol', function(e) {
                e.stopPropagation();
                var video = render.find('video')[0];
                if (!video) return;
                var rect = this.getBoundingClientRect();
                var x = e.clientX - rect.left;
                var pct = Math.max(0, Math.min(1, x / rect.width));
                video.volume = pct;
                video.muted = false;
                updateVolumeUI(pct, false);
            });

            /* Drag на слайдере громкости */
            var volDragging = false;
            volSlider.off('mousedown.ytvol').on('mousedown.ytvol', function(e) {
                volDragging = true;
                render.find('.yt-volume-wrap').addClass('yt-vol-expanded');
                e.preventDefault();
            });

            $(document).off('mousemove.ytvol').on('mousemove.ytvol', function(e) {
                if (!volDragging) return;
                var slider = render.find('.yt-volume-slider')[0];
                if (!slider) return;
                var video = render.find('video')[0];
                if (!video) return;
                var rect = slider.getBoundingClientRect();
                var x = e.clientX - rect.left;
                var pct = Math.max(0, Math.min(1, x / rect.width));
                video.volume = pct;
                video.muted = false;
                updateVolumeUI(pct, false);
            });

            $(document).off('mouseup.ytvol').on('mouseup.ytvol', function() {
                if (volDragging) {
                    volDragging = false;
                    setTimeout(function() {
                        render.find('.yt-volume-wrap').removeClass('yt-vol-expanded');
                    }, 800);
                }
            });


            /* =======================================================
             *  ОБНОВЛЕНИЕ ГРОМКОСТИ UI
             * ======================================================= */

            function updateVolumeUI(level, muted) {
                var icon;
                if (muted || level <= 0) {
                    icon = ICONS.volumeMute;
                } else if (level < 0.5) {
                    icon = ICONS.volumeLow;
                } else {
                    icon = ICONS.volumeHigh;
                }
                render.find('.yt-volume-btn').html(icon);
                var pct = muted ? 0 : Math.round(level * 100);
                render.find('.yt-volume-slider__fill').css('width', pct + '%');
            }

            /* Слушаем volumechange */
            function attachVolumeListener() {
                var video = render.find('video')[0];
                if (video) {
                    video.addEventListener('volumechange', function() {
                        updateVolumeUI(this.volume, this.muted);
                    });
                    updateVolumeUI(video.volume, video.muted);
                    return true;
                }
                return false;
            }

            var volAttempts = 0;
            var volInterval = setInterval(function() {
                volAttempts++;
                if (attachVolumeListener() || volAttempts > 30) {
                    clearInterval(volInterval);
                }
            }, 500);


            /* =======================================================
             *  ОБНОВЛЕНИЕ ВРЕМЕНИ
             * ======================================================= */

            function formatTime(sec) {
                if (isNaN(sec) || sec < 0) sec = 0;
                sec = Math.floor(sec);
                var h = Math.floor(sec / 3600);
                var m = Math.floor((sec % 3600) / 60);
                var s = sec % 60;
                if (h > 0) {
                    return h + ':' + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
                }
                return m + ':' + (s < 10 ? '0' : '') + s;
            }

            function startTimeUpdater() {
                var video = render.find('video')[0];
                if (!video) return;

                function update() {
                    render.find('.yt-time-current').text(formatTime(video.currentTime));
                    render.find('.yt-time-total').text(formatTime(video.duration));
                }

                video.addEventListener('timeupdate', update);
                video.addEventListener('loadedmetadata', update);
                update();
            }

            var timeAttempts = 0;
            var timeInterval = setInterval(function() {
                timeAttempts++;
                var video = render.find('video')[0];
                if (video || timeAttempts > 30) {
                    clearInterval(timeInterval);
                    if (video) startTimeUpdater();
                }
            }, 500);


            /* =======================================================
             *  МЕНЮ НАСТРОЕК — ЛОГИКА
             * ======================================================= */

            function toggleSettings() {
                if (settingsOpen) {
                    closeSettings();
                } else {
                    openSettings();
                }
            }

            function openSettings() {
                settingsOpen = true;
                render.find('.yt-settings-menu').addClass('yt-settings-visible');
                render.find('.yt-settings-btn').addClass('yt-settings-open');

                /* Обновляем список качеств */
                updateQualityList();

                /* Всегда показываем главную панель при открытии */
                showSettingsPanel('main');
            }

            function closeSettings() {
                settingsOpen = false;
                render.find('.yt-settings-menu').removeClass('yt-settings-visible');
                render.find('.yt-settings-btn').removeClass('yt-settings-open');
            }

            function showSettingsPanel(name) {
                render.find('.yt-settings-panel').removeClass('yt-panel-active');
                render.find('.yt-panel-' + name).addClass('yt-panel-active');
            }


            /* =======================================================
             *  КАЧЕСТВО — Считываем из Lampa и строим список
             * ======================================================= */

            function updateQualityList() {
                var qualityList = render.find('.yt-quality-list');
                qualityList.empty();

                /**
                 * Получаем качества через Lampa API
                 * Lampa хранит качества в кнопке .player-panel__quality
                 * или через событие. Пробуем несколько способов.
                 */
                var qualities = [];
                var currentQuality = '';

                /* Способ 1: Через текст кнопки качества */
                var qualityBtnText = render.find('.player-panel__quality').text().trim();
                if (qualityBtnText) {
                    currentQuality = qualityBtnText;
                }

                /* Способ 2: Через Lampa.PlayerPanel (если есть) */
                try {
                    if (Lampa.PlayerPanel && Lampa.PlayerPanel.qualityList) {
                        qualities = Lampa.PlayerPanel.qualityList();
                    }
                } catch(e) {}

                /* Способ 3: Парсим из DOM Lampa */
                if (!qualities.length) {
                    try {
                        /* Lampa при клике на quality показывает select-box.
                           Мы триггерим клик и считываем варианты */
                        var origSelect = render.find('.selectbox-item');
                        if (origSelect.length) {
                            origSelect.each(function() {
                                qualities.push({
                                    label: $(this).text().trim(),
                                    active: $(this).hasClass('active')
                                });
                            });
                        }
                    } catch(e) {}
                }

                /* Если ничего не нашли — показываем текущее */
                if (!qualities.length && currentQuality) {
                    qualities.push({ label: currentQuality, active: true });
                }

                if (!qualities.length) {
                    qualities.push({ label: 'Авто', active: true });
                }

                /* Строим элементы */
                qualities.forEach(function(q) {
                    var item = $(
                        '<div class="yt-quality-item' + (q.active ? ' yt-quality-active' : '') + '" data-quality="' + q.label + '">' +
                            '<div class="yt-quality-item__check">' + ICONS.check + '</div>' +
                            '<div class="yt-quality-item__label">' + q.label + '</div>' +
                        '</div>'
                    );

                    item.on('click', function(e) {
                        e.stopPropagation();
                        selectQuality(q.label);
                        $(this).siblings().removeClass('yt-quality-active');
                        $(this).addClass('yt-quality-active');
                        render.find('.yt-settings-quality-val').text(q.label);
                        setTimeout(function() { closeSettings(); }, 200);
                    });

                    qualityList.append(item);
                });

                /* Обновляем отображаемое значение */
                var activeQ = qualities.find(function(q) { return q.active; });
                if (activeQ) {
                    render.find('.yt-settings-quality-val').text(activeQ.label);
                }
            }


            /* =======================================================
             *  КАЧЕСТВО — Переключение через Lampa API
             * ======================================================= */

            function selectQuality(label) {
                /**
                 * Lampa переключает качество через клик на элемент
                 * selectbox. Мы эмулируем это.
                 */
                try {
                    /* Триггерим клик на оригинальной кнопке качества */
                    var qualityBtn = render.find('.player-panel__quality');
                    if (qualityBtn.length) {
                        qualityBtn.trigger('click');

                        /* Ждём появления selectbox и кликаем нужный вариант */
                        setTimeout(function() {
                            var items = $('.selectbox-item, .select-box-item, .selectbox__item');
                            items.each(function() {
                                if ($(this).text().trim() === label) {
                                    $(this).trigger('click');
                                }
                            });
                        }, 100);
                    }
                } catch(e) {
                    console.log('[YT-Player] Quality switch error:', e);
                }
            }


            /* =======================================================
             *  СКОРОСТЬ — Через HTML5 API
             * ======================================================= */

            function setPlaybackSpeed(speed) {
                try {
                    var video = render.find('video')[0];
                    if (video) {
                        video.playbackRate = speed;
                    }
                } catch(e) {
                    console.log('[YT-Player] Speed change error:', e);
                }
            }


            /* Переподключение при старте нового видео */
            Lampa.Player.listener.follow('start', function() {
                setTimeout(function() {
                    attachVolumeListener();
                    startTimeUpdater();
                    closeSettings();
                }, 500);
            });
        }


        /* ===========================================================
         *  РАЗДЕЛ 5: СОБЫТИЯ ПЛЕЕРА
         * =========================================================== */

        Lampa.Player.listener.follow('start', function(data) {
            if (!ui_inited) {
                initPlayerUI();
                ui_inited = true;
            }

            render = Lampa.Player.render();
            title = render.find('.player-info__title');
            value = render.find('.value--name span');

            /* Обновляем заголовок */
            if (data && data.title) {
                var txt = data.title.trim();
                var sub = '';

                if (data.name && data.name !== txt) sub = data.name;

                /* Если есть сезон/эпизод */
                if (data.season !== undefined && data.episode !== undefined) {
                    sub = 'S' + data.season + ':E' + data.episode;
                    if (data.name) sub += ' — ' + data.name;
                }

                title.text(txt);
                if (sub) {
                    value.text(sub);
                    value.parent().show();
                } else {
                    value.parent().hide();
                }
            }

            /* Обновляем качества при старте */
            setTimeout(function() {
                var qualityBtn = render.find('.player-panel__quality');
                var qText = qualityBtn.text().trim();
                if (qText) {
                    render.find('.yt-settings-quality-val').text(qText);
                }
            }, 1000);
        });


        /* ===========================================================
         *  РАЗДЕЛ 6: КНОПКИ НАСТРОЕК / ИНФОРМАЦИИ
         * =========================================================== */

        /**
         * Кнопка «Информация» — открывает страницу фильма
         */
        function showInfo() {
            try {
                var card = Lampa.Player.data && Lampa.Player.data.movie ? Lampa.Player.data.movie : null;
                if (card) {
                    Lampa.Activity.push({
                        url: '',
                        title: card.title || card.name || '',
                        component: 'full',
                        id: card.id,
                        source: card.source || 'tmdb',
                        card: card
                    });
                }
            } catch (e) {}
        }


        /* ===========================================================
         *  РАЗДЕЛ 7: КНОПКИ В МЕНЮ LAMPA
         * =========================================================== */

        /**
         * Добавляем пункт в настройки Lampa для включения/отключения
         * (опционально, если нужно)
         */

    }

    /* ================================================================
     *  ЗАПУСК ПЛАГИНА
     *
     *  Ждём полной загрузки приложения Lampa,
     *  затем запускаем плагин.
     * ================================================================ */

    if (window.appready) {
        startPlugin();
    } else {
        Lampa.Listener.follow('app', function (event) {
            if (event.type === 'ready') {
                startPlugin();
            }
        });
    }

})();
