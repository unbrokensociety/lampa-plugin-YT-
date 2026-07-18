(function () {
    'use strict';

    /**
     * ============================================================
     *  ПЛАГИН СТИЛИЗАЦИИ ПЛЕЕРА LAMPA — СТИЛЬ YOUTUBE
     * ============================================================
     *
     *  Описание:
     *    Полная CSS-стилизация встроенного плеера Lampa для
     *    придания ему внешнего вида современного YouTube-плеера.
     *    Включает: прогресс-бар, кнопки управления, оверлей
     *    громкости, градиентный фон и кроссплатформенную
     *    поддержку (Smart TV / ПК / Мобильные).
     *
     *  Поддерживаемые платформы:
     *    — Smart TV: навигация пультом, стрелки + OK,
     *      чёткий фокус (.focus) на элементах
     *    — ПК: реакция на :hover, плавные анимации,
     *      перетаскивание ползунков мышью
     *    — Мобильные: увеличенные зоны тапа,
     *      обработка сенсорных событий
     *
     *  Примечание:
     *    Все стили используют !important для надёжной
     *    инъекции поверх встроенных стилей Lampa.
     *    Плагин НЕ содержит логику парсинга или
     *    получения ссылок — только UI/UX.
     * ============================================================
     */

    function startPlugin() {
        /**
         * Раньше здесь была жёсткая проверка версии Lampa
         * (app_digital > 328), из-за которой плагин молча
         * прекращал работу на всех современных сборках —
         * убрали её, чтобы плагин работал на текущих версиях
         * Lampa, включая TV, ПК и мобильные.
         */

        /* ===========================================================
         *  РАЗДЕЛ 1: ОСНОВНЫЕ CSS-СТИЛИ
         *  
         *  Структура стилей:
         *    1.1 — Оверлей и градиентный фон
         *    1.2 — Прогресс-бар (таймлайн) в стиле YouTube
         *    1.3 — Кнопки управления (play, next, prev и т.д.)
         *    1.4 — Информационная панель (название, время)
         *    1.5 — Группы кнопок (pill-shaped контейнеры)
         *    1.6 — Индикаторы паузы и загрузки
         *    1.7 — Кастомный оверлей громкости
         *    1.8 — Адаптация для ТВ (фокус-состояния)
         *    1.9 — Адаптация для ПК (hover-эффекты)
         *    1.10 — Адаптация для мобильных (увеличенные тапы)
         *    1.11 — Backdrop-blur для поддерживающих платформ
         *    1.12 — Анимации
         * =========================================================== */

        var styles = [

            /* -------------------------------------------------------
             *  1.1 ОВЕРЛЕЙ — Градиентный фон поверх видео
             *  
             *  Глубокий кинематографический градиент:
             *  — Лёгкое затемнение сверху (для заголовка)
             *  — Прозрачный центр (видео не перекрывается)
             *  — Плотное затемнение снизу (для контролов)
             *  Это классический YouTube-приём для читаемости UI
             * ------------------------------------------------------- */
            '.player-video__overlay {',
            '    display: none !important;',
            '    position: absolute !important;',
            '    top: 0 !important;',
            '    left: 0 !important;',
            '    width: 100% !important;',
            '    height: 100% !important;',
            '    pointer-events: none !important;',
            /* Многослойный градиент для глубины */
            '    background: linear-gradient(',
            '        to bottom,',
            '        rgba(0, 0, 0, 0.7) 0%,',       /* Верх: затемнение для заголовка */
            '        rgba(0, 0, 0, 0.0) 15%,',       /* Быстро прозрачнеет */
            '        rgba(0, 0, 0, 0.0) 50%,',       /* Центр полностью прозрачен */
            '        rgba(0, 0, 0, 0.0) 60%,',       /* Нижняя граница прозрачности */
            '        rgba(0, 0, 0, 0.55) 80%,',      /* Начало затемнения для контролов */
            '        rgba(0, 0, 0, 0.85) 100%',      /* Плотное затемнение внизу */
            '    ) !important;',
            '}',

            /* Показываем оверлей только когда панель видна */
            '.player:not(.iptv).player--panel-visible .player-video__overlay {',
            '    display: block !important;',
            '    animation: yt-fade-in 0.3s ease-out !important;',
            '}',


            /* -------------------------------------------------------
             *  1.2 ПРОГРЕСС-БАР (ТАЙМЛАЙН) — Стиль YouTube
             *
             *  Ключевые особенности:
             *  — Тонкая полоса (3px) по умолчанию
             *  — Утолщается до 5px при наведении/фокусе
             *  — Красный цвет (#FF0000) — фирменный YouTube
             *  — Круглый скраббер (точка) появляется при взаимодействии
             *  — Буфер — полупрозрачный белый
             *  — Плавные transition для всех изменений
             * ------------------------------------------------------- */

            /* Контейнер таймлайна */
            '.player:not(.iptv) .player-panel__timeline {',
            '    margin-bottom: 0.8em !important;',
            '    height: 3px !important;',
            '    background: rgba(255, 255, 255, 0.2) !important;',
            '    border-radius: 1.5px !important;',
            '    transition: height 0.15s cubic-bezier(0.4, 0, 0.2, 1),',
            '               transform 0.15s cubic-bezier(0.4, 0, 0.2, 1) !important;',
            '    cursor: pointer !important;',
            '    position: relative !important;',
            '    overflow: visible !important;',
            '    z-index: 10 !important;',
            '}',

            /* Утолщение при наведении мышью (ПК) */
            '.player:not(.iptv) .player-panel__timeline:hover {',
            '    height: 5px !important;',
            '}',

            /* Утолщение при фокусе (ТВ — навигация пультом) */
            '.player:not(.iptv) .player-panel__timeline.focus {',
            '    height: 5px !important;',
            '}',

            /* Заполненная часть прогресс-бара — красная */
            '.player:not(.iptv) .player-panel__position {',
            '    background: transparent !important;',
            '    height: 100% !important;',
            '    border-radius: 1.5px !important;',
            '    position: relative !important;',
            '    overflow: visible !important;',
            '}',

            /* Внутренний div — основная красная полоса */
            '.player:not(.iptv) .player-panel__position > div {',
            '    background: #FF0000 !important;',
            '    height: 100% !important;',
            '    border-radius: 1.5px !important;',
            '    position: relative !important;',
            '    transition: background-color 0.2s ease !important;',
            '}',

            /**
             * Скраббер (круглая точка на конце прогресс-бара)
             * — По умолчанию скрыт (scale(0))
             * — Появляется при hover/focus (scale(1))
             * — Красный цвет, тень для контраста
             */
            '.player:not(.iptv) .player-panel__position > div::after {',
            '    content: "" !important;',
            '    display: block !important;',
            '    width: 14px !important;',
            '    height: 14px !important;',
            '    background: #FF0000 !important;',
            '    border-radius: 50% !important;',
            '    position: absolute !important;',
            '    right: -7px !important;',
            '    top: 50% !important;',
            '    transform: translateY(-50%) scale(0) !important;',
            '    transition: transform 0.15s cubic-bezier(0.4, 0, 0.2, 1) !important;',
            '    box-shadow: 0 0 4px rgba(0, 0, 0, 0.4) !important;',
            '    z-index: 5 !important;',
            '}',

            /* Скраббер появляется при наведении мыши на таймлайн */
            '.player:not(.iptv) .player-panel__timeline:hover .player-panel__position > div::after {',
            '    transform: translateY(-50%) scale(1) !important;',
            '}',

            /* Скраббер появляется при фокусе на ТВ */
            '.player:not(.iptv) .player-panel__timeline.focus .player-panel__position > div::after {',
            '    transform: translateY(-50%) scale(1) !important;',
            '}',

            /* Когда НЕ в фокусе — скраббер скрыт (переопределяем дефолт Lampa) */
            '.player:not(.iptv) .player-panel__timeline:not(.focus):not(:hover) .player-panel__position > div::after {',
            '    transform: translateY(-50%) scale(0) !important;',
            '}',


            /* -------------------------------------------------------
             *  1.3 КНОПКИ УПРАВЛЕНИЯ — Современный минималистичный стиль
             *
             *  Как в YouTube:
             *  — Белые иконки без фона
             *  — Округлые, хорошо читаемые
             *  — Плавные переходы при взаимодействии
             *  — Масштабирование при фокусе на ТВ
             * ------------------------------------------------------- */

            /* Убираем фон у панелей (прозрачность) */
            '.player:not(.iptv) .player-panel,',
            '.player:not(.iptv) .player-info,',
            '.player:not(.iptv) .player-footer {',
            '    background: transparent !important;',
            '    -webkit-backdrop-filter: unset !important;',
            '    backdrop-filter: unset !important;',
            '}',

            /* Убираем внутренние отступы для полноширинного расположения */
            '.player:not(.iptv) .player-panel__body,',
            '.player:not(.iptv) .player-info__body,',
            '.player:not(.iptv) .player-footer__body {',
            '    padding: 0 !important;',
            '}',

            '.player:not(.iptv) .player-footer__row {',
            '    padding: 0 !important;',
            '}',

            /* Скрываем кнопку "Назад" (в YouTube её нет в плеере) */
            '.player:not(.iptv) .head-backward {',
            '    display: none !important;',
            '}',

            /* Базовый стиль кнопки */
            '.player:not(.iptv) .player-panel .button {',
            '    padding: 0.9em !important;',
            '    width: 3em !important;',
            '    height: 3em !important;',
            '    border-radius: 50% !important;',
            '    transition: background-color 0.2s ease,',
            '               transform 0.2s cubic-bezier(0.4, 0, 0.2, 1),',
            '               opacity 0.2s ease !important;',
            '    position: relative !important;',
            '    overflow: hidden !important;',
            '}',

            /* Размер иконок внутри кнопок */
            '.player:not(.iptv) .player-panel .button > svg {',
            '    width: 1.2em !important;',
            '    height: 1.2em !important;',
            '    transition: transform 0.15s ease !important;',
            '}',

            /* Убираем дефолтные отступы между кнопками */
            '.player:not(.iptv) .player-panel .button + .button {',
            '    margin-left: 0 !important;',
            '}',

            /* ---- Кнопка Play/Pause — главная, акцентная ---- */
            '.player:not(.iptv) .player-panel__playpause {',
            '    margin: 0 !important;',
            '    padding: 1em !important;',
            '    border-radius: 50% !important;',
            '    transition: background-color 0.2s ease,',
            '               transform 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;',
            '}',

            /* Без фокуса — фона нет вообще, как в оригинале YouTube */
            '.player:not(.iptv) .player-panel__playpause:not(.focus) {',
            '    background: transparent !important;',
            '}',

            /**
             * Фокус на кнопке Play/Pause (ТВ):
             * — Белый полупрозрачный фон
             * — Лёгкое увеличение для визуальной обратной связи
             */
            '.player:not(.iptv) .player-panel__playpause.focus {',
            '    background: rgba(255, 255, 255, 0.2) !important;',
            '    transform: scale(1.1) !important;',
            '}',

            /* ---- Кнопка качества (720p, 1080p и т.д.) ---- */
            '.player:not(.iptv) .player-panel__quality {',
            '    border-radius: 5em !important;',
            '    padding: 0 1em !important;',
            '    font-size: 0.85em !important;',
            '    font-weight: 500 !important;',
            '    letter-spacing: 0.02em !important;',
            '}',

            /* ---- Кнопки Next/Prev (следующий/предыдущий) ---- */
            '.player:not(.iptv) .player-panel__next,',
            '.player:not(.iptv) .player-panel__prev {',
            '    padding: 1.1em !important;',
            '}',

            '.player:not(.iptv) .player-panel__next > svg,',
            '.player:not(.iptv) .player-panel__prev > svg {',
            '    width: 0.8em !important;',
            '    height: 0.8em !important;',
            '}',

            /* ---- Кнопка плейлиста ---- */
            '.player:not(.iptv) .player-panel__playlist {',
            '    text-align: center !important;',
            '}',

            '.player:not(.iptv) .player-panel__playlist > svg {',
            '    width: 1em !important;',
            '}',

            /* Анимация появления кнопки (trigger enter) */
            '.player:not(.iptv) .player-panel .button.animate-trigger-enter {',
            '    animation: yt-trigger-enter 0.2s forwards !important;',
            '}',


            /* -------------------------------------------------------
             *  1.4 ИНФОРМАЦИОННАЯ ПАНЕЛЬ — Заголовок и метаданные
             *
             *  Расположение:
             *  — Название сверху слева (как в YouTube)
             *  — Текущее время справа
             *  — Тени для читаемости на тёмном фоне
             * ------------------------------------------------------- */

            '.player:not(.iptv) .player-info__body {',
            '    padding-left: 0 !important;',
            '    position: relative !important;',
            '}',

            /* Подзаголовок (серия, эпизод) */
            '.player:not(.iptv) .player-info__name {',
            '    font-size: 1.1em !important;',
            '    opacity: 0.8 !important;',
            '    text-shadow: 0 1px 4px rgba(0, 0, 0, 0.7) !important;',
            '    letter-spacing: 0.01em !important;',
            '}',

            /* Основной заголовок — в YouTube это маленький однострочный
               текст, а не крупный заголовок на полэкрана */
            '.player:not(.iptv) .player-info__title {',
            '    font-size: 1.3em !important;',
            '    font-weight: 500 !important;',
            '    line-height: 1.4 !important;',
            '    width: 70% !important;',
            '    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6) !important;',
            '    overflow: hidden !important;',
            '    text-overflow: ellipsis !important;',
            '    white-space: nowrap !important;',
            '    display: block !important;',
            '    letter-spacing: normal !important;',
            '}',

            /* Значения метаданных */
            '.player:not(.iptv) .player-info__values {',
            '    text-shadow: 0 1px 4px rgba(0, 0, 0, 0.7) !important;',
            '}',

            '.player:not(.iptv) .player-info__values .value--name span {',
            '    font-weight: 600 !important;',
            '}',

            /* Время — в YouTube это мелкий приглушённый текст */
            '.player:not(.iptv) .player-info__time {',
            '    position: absolute !important;',
            '    top: 0.8em !important;',
            '    right: 0 !important;',
            '    font-size: 0.85em !important;',
            '    opacity: 0.75 !important;',
            '    font-variant-numeric: tabular-nums !important;',
            '}',

            /* Строка времени над кнопками */
            '.player:not(.iptv) .player-panel__line-one {',
            '    margin-bottom: 0.8em !important;',
            '    position: relative !important;',
            '    z-index: 2 !important;',
            '    text-shadow: 0 1px 4px rgba(0, 0, 0, 0.6) !important;',
            '    font-variant-numeric: tabular-nums !important;',
            '}',

            /* Бейдж размера/качества в инфо */
            '.player:not(.iptv) .player-info__values .value--size span {',
            '    background: rgba(255, 255, 255, 0.12) !important;',
            '    border-radius: 1em !important;',
            '    padding: 0.2em 0.6em !important;',
            '    font-size: 0.85em !important;',
            '}',


            /* -------------------------------------------------------
             *  1.5 ГРУППЫ КНОПОК — Pill-shaped контейнеры
             *
             *  Кнопки группируются в "таблетки" (pills):
             *  — Полупрозрачный фон с blur
             *  — Скруглённые углы (border-radius: 4em)
             *  — Визуальное разделение функциональных групп
             * ------------------------------------------------------- */

            /* В YouTube кнопки НЕ группируются в подсвеченные "таблетки" —
               они просто идут в ряд без общего фона. Оставляем контейнер
               только как flex-обёртку для расстановки */
            '.player:not(.iptv) .player-panel__box-buttons {',
            '    flex-shrink: 0 !important;',
            '    display: flex !important;',
            '    align-items: center !important;',
            '    background: transparent !important;',
            '    border-radius: 0 !important;',
            '}',

            '.player:not(.iptv) .player-panel__box-buttons + .player-panel__box-buttons {',
            '    margin-left: 0.2em !important;',
            '}',


            /* -------------------------------------------------------
             *  1.6 ИНДИКАТОРЫ ПАУЗЫ И ЗАГРУЗКИ
             *
             *  Полупрозрачный фон с blur для красивого
             *  центрального индикатора
             * ------------------------------------------------------- */

            '.player:not(.iptv) .player-video__paused,',
            '.player:not(.iptv) .player-video__loader {',
            '    background-color: rgba(0, 0, 0, 0.35) !important;',
            '    border-radius: 50% !important;',
            '    transition: opacity 0.3s ease, transform 0.3s ease !important;',
            '}',

            /* Нормализация звука */
            '.normalization {',
            '    background: rgba(255, 255, 255, 0.1) !important;',
            '    border-radius: 1em !important;',
            '}',

            '.normalization canvas {',
            '    border-radius: 1em !important;',
            '}',


            /* -------------------------------------------------------
             *  1.7 КАСТОМНЫЙ ОВЕРЛЕЙ ГРОМКОСТИ
             *
             *  Появляется при изменении громкости (стрелки на ТВ
             *  или колёсико мыши на ПК). Стиль — как в YouTube:
             *  — Вертикальная полоса справа
             *  — Иконка динамика
             *  — Плавное появление и исчезновение
             *  — Процент громкости
             * ------------------------------------------------------- */

            /* Контейнер оверлея громкости */
            '.yt-volume-overlay {',
            '    position: absolute !important;',
            '    top: 50% !important;',
            '    right: 2.5em !important;',
            '    transform: translateY(-50%) translateX(20px) !important;',
            '    display: flex !important;',
            '    flex-direction: column !important;',
            '    align-items: center !important;',
            '    gap: 0.8em !important;',
            '    background: rgba(0, 0, 0, 0.75) !important;',
            '    border-radius: 1em !important;',
            '    padding: 1.2em 0.8em !important;',
            '    opacity: 0 !important;',
            '    transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;',
            '    pointer-events: none !important;',
            '    z-index: 100 !important;',
            '    min-width: 3.5em !important;',
            '}',

            /* Видимое состояние оверлея */
            '.yt-volume-overlay.yt-volume-visible {',
            '    opacity: 1 !important;',
            '    transform: translateY(-50%) translateX(0) !important;',
            '}',

            /* Иконка динамика */
            '.yt-volume-overlay__icon {',
            '    width: 2em !important;',
            '    height: 2em !important;',
            '    display: flex !important;',
            '    align-items: center !important;',
            '    justify-content: center !important;',
            '}',

            '.yt-volume-overlay__icon svg {',
            '    width: 100% !important;',
            '    height: 100% !important;',
            '    fill: white !important;',
            '}',

            /* Вертикальная полоса громкости */
            '.yt-volume-overlay__bar {',
            '    width: 4px !important;',
            '    height: 8em !important;',
            '    background: rgba(255, 255, 255, 0.2) !important;',
            '    border-radius: 2px !important;',
            '    position: relative !important;',
            '    overflow: hidden !important;',
            '}',

            /* Заполненная часть (белая, растёт снизу вверх) */
            '.yt-volume-overlay__fill {',
            '    position: absolute !important;',
            '    bottom: 0 !important;',
            '    left: 0 !important;',
            '    width: 100% !important;',
            '    background: white !important;',
            '    border-radius: 2px !important;',
            '    transition: height 0.15s cubic-bezier(0.4, 0, 0.2, 1) !important;',
            '}',

            /* Процент громкости */
            '.yt-volume-overlay__value {',
            '    font-size: 0.85em !important;',
            '    font-weight: 600 !important;',
            '    color: white !important;',
            '    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5) !important;',
            '    font-variant-numeric: tabular-nums !important;',
            '}',


            /* -------------------------------------------------------
             *  1.8 АДАПТАЦИЯ ДЛЯ SMART TV — Фокус-состояния
             *
             *  На ТВ нет мыши — навигация пультом.
             *  Класс .focus добавляется Lampa при перемещении
             *  фокуса между элементами.
             *
             *  Принципы:
             *  — Явный визуальный отклик (масштаб + свечение)
             *  — Контрастный outline для чёткости
             *  — Увеличенные элементы для видимости с дивана
             * ------------------------------------------------------- */

            /* Фокус на кнопках — масштабирование + подсветка */
            '.player:not(.iptv) .player-panel .button.focus {',
            '    background: rgba(255, 255, 255, 0.2) !important;',
            '    transform: scale(1.15) !important;',
            '    outline: 2px solid rgba(255, 255, 255, 0.6) !important;',
            '    outline-offset: 2px !important;',
            '}',

            /* Группа кнопок больше не имеет собственного фона —
               подсветку убираем, фокус виден по самой кнопке */

            /* Фокус на качестве */
            '.player:not(.iptv) .player-panel__quality.focus {',
            '    background: rgba(255, 255, 255, 0.25) !important;',
            '    transform: scale(1.08) !important;',
            '    outline: 2px solid rgba(255, 255, 255, 0.6) !important;',
            '    outline-offset: 2px !important;',
            '}',


            /* -------------------------------------------------------
             *  1.9 АДАПТАЦИЯ ДЛЯ ПК — Hover-эффекты
             *
             *  На ПК пользователь взаимодействует мышью.
             *  Плавные hover-переходы, изменение прозрачности.
             * ------------------------------------------------------- */

            /* Hover на кнопках — лёгкая подсветка */
            '.player:not(.iptv) .player-panel .button:hover {',
            '    background: rgba(255, 255, 255, 0.15) !important;',
            '}',

            /* Hover на кнопке play/pause */
            '.player:not(.iptv) .player-panel__playpause:hover {',
            '    background: rgba(255, 255, 255, 0.2) !important;',
            '    transform: scale(1.05) !important;',
            '}',

            /* Группа кнопок прозрачна — hover не нужен на уровне группы */


            /* -------------------------------------------------------
             *  1.10 АДАПТАЦИЯ ДЛЯ МОБИЛЬНЫХ — Увеличенные тапы
             *
             *  На мобилках нужны большие зоны нажатия (min 44px).
             *  Также увеличиваем прогресс-бар для удобного
             *  перетаскивания пальцем.
             * ------------------------------------------------------- */

            '@media (max-width: 768px) {',
            '    .player:not(.iptv) .player-panel .button {',
            '        min-width: 44px !important;',
            '        min-height: 44px !important;',
            '        padding: 0.7em !important;',
            '    }',
            '',
            '    /* Прогресс-бар толще на мобилках для удобства тапа */',
            '    .player:not(.iptv) .player-panel__timeline {',
            '        height: 5px !important;',
            '    }',
            '',
            '    .player:not(.iptv) .player-panel__timeline:active {',
            '        height: 8px !important;',
            '    }',
            '',
            '    /* Скраббер всегда виден на мобилках */',
            '    .player:not(.iptv) .player-panel__position > div::after {',
            '        transform: translateY(-50%) scale(1) !important;',
            '        width: 16px !important;',
            '        height: 16px !important;',
            '        right: -8px !important;',
            '    }',
            '',
            '    /* Увеличенный тап на Play/Pause */',
            '    .player:not(.iptv) .player-panel__playpause {',
            '        padding: 1.2em !important;',
            '    }',
            '',
            '    /* Заголовок меньше на мобилках */',
            '    .player:not(.iptv) .player-info__title {',
            '        font-size: 1.6em !important;',
            '        width: 80% !important;',
            '    }',
            '',
            '    /* Оверлей громкости адаптация */',
            '    .yt-volume-overlay {',
            '        right: 1em !important;',
            '    }',
            '',
            '    .yt-volume-overlay__bar {',
            '        height: 5em !important;',
            '    }',
            '}',

            /* Экраны ТВ — крупные элементы */
            '@media (min-width: 1920px) {',
            '    .player:not(.iptv) .player-panel .button.focus {',
            '        transform: scale(1.2) !important;',
            '        outline-width: 3px !important;',
            '    }',
            '',
            '    .player:not(.iptv) .player-panel__position > div::after {',
            '        width: 18px !important;',
            '        height: 18px !important;',
            '        right: -9px !important;',
            '    }',
            '',
            '    .player:not(.iptv) .player-panel__timeline.focus {',
            '        height: 7px !important;',
            '    }',
            '}',


            /* -------------------------------------------------------
             *  1.11 БЕЗ СТЕКЛЯННЫХ ЭФФЕКТОВ
             *
             *  В настоящем YouTube-плеере нет glassmorphism/blur —
             *  элементы либо прозрачные, либо с плотным сплошным
             *  тёмным фоном. Убрали backdrop-filter полностью,
             *  оставили обычные полупрозрачные/сплошные фоны там,
             *  где они нужны для читаемости (пауза, загрузка,
             *  оверлей громкости).
             * ------------------------------------------------------- */

            '.player:not(.iptv) .player-video__paused,',
            '.player:not(.iptv) .player-video__loader {',
            '    background-color: rgba(0, 0, 0, 0.5) !important;',
            '}',

            '.yt-volume-overlay {',
            '    background: rgba(0, 0, 0, 0.8) !important;',
            '}',



            /* -------------------------------------------------------
             *  1.12 АНИМАЦИИ
             *
             *  Плавные CSS-анимации для:
             *  — Появления оверлея (fade-in)
             *  — Входа кнопок (trigger-enter)
             *  — Пульсации при нажатии (pulse)
             * ------------------------------------------------------- */

            /* Плавное появление */
            '@keyframes yt-fade-in {',
            '    from { opacity: 0; }',
            '    to   { opacity: 1; }',
            '}',

            /* Вход кнопки с масштабированием */
            '@keyframes yt-trigger-enter {',
            '    from {',
            '        transform: scale(0.8);',
            '        opacity: 0;',
            '    }',
            '    to {',
            '        transform: scale(1);',
            '        opacity: 1;',
            '    }',
            '}',

            /* Совместимость со стандартными animation-* от Lampa */
            '@keyframes animation-trigger-enter {',
            '    from {',
            '        transform: scale(0.8);',
            '        opacity: 0;',
            '    }',
            '    to {',
            '        transform: scale(1);',
            '        opacity: 1;',
            '    }',
            '}',

            '@keyframes animation-opacity {',
            '    from { opacity: 0; }',
            '    to   { opacity: 1; }',
            '}',

            /* Пульсация при нажатии (ripple-like эффект) */
            '@keyframes yt-press {',
            '    0%   { transform: scale(1); }',
            '    50%  { transform: scale(0.9); }',
            '    100% { transform: scale(1); }',
            '}',

            '.player:not(.iptv) .player-panel .button:active {',
            '    animation: yt-press 0.15s ease !important;',
            '}',

            /* -------------------------------------------------------
             *  ДОПОЛНИТЕЛЬНЫЕ СТИЛИ
             *  — Скрытие встроенного индикатора громкости Lampa
             *    (заменяем нашим кастомным)
             * ------------------------------------------------------- */

            /* Скрываем стандартный индикатор громкости Lampa, если он есть — мы показываем свой оверлей */
            '.player-video__volume-default {',
            '    display: none !important;',
            '}',

        ''].join('\n');

        /* ============================================================
         *  Удаляем предыдущие стили (если плагин загружен повторно)
         *  и вставляем новые в <body>
         * ============================================================ */
        $('#yt-player-style').remove();
        $('body').append('<style id="yt-player-style">' + styles + '</style>');


        /* ===========================================================
         *  РАЗДЕЛ 2: РЕСТРУКТУРИЗАЦИЯ DOM
         *
         *  Перемещаем элементы плеера для соответствия
         *  YouTube-лейауту:
         *  — Оверлей после дисплея
         *  — Таймлайн над кнопками
         *  — Кнопки группируются в pill-контейнеры
         *  — Заголовок выносится отдельно
         * =========================================================== */

        /**
         * ВАЖНО: вся работа с DOM плеера (render, кнопки, слайдер
         * громкости) вынесена в функцию initPlayerUI() и запускается
         * не сразу при загрузке плагина, а один раз — при первом
         * реальном старте воспроизведения. Раньше Lampa.Player.render()
         * вызывался сразу в startPlugin(), что могло падать с ошибкой,
         * если плеер ещё не был инициализирован (например, когда
         * плагин только что добавили в Настройках, а видео ещё не
         * открывали).
         */
        var render, title, value;
        var ui_inited = false;

        function initPlayerUI() {
        render = Lampa.Player.render();

        /** Элемент заголовка (название фильма/сериала) */
        title = $('<div class="player-info__title"></div>');

        /** Элемент подзаголовка (серия/эпизод) */
        value = $('<div class="value--name"><span></span></div>');

        /**
         * Создаём оверлей с градиентом и вставляем
         * сразу после видео-дисплея
         */
        if (!render.find('.player-video__overlay').length) {
            render.find('.player-video__display').after(
                $('<div class="player-video__overlay"></div>')
            );
        }

        /**
         * Убираем лишние кнопки из центральной панели
         * (в YouTube центр пуст — play/pause в левой части)
         */
        render.find('.player-panel__center')
            .find('.button:not(.player-panel__playpause)')
            .remove();

        /**
         * Переносим строку времени (01:23:45 / 02:00:00)
         * ПЕРЕД таймлайном — как в YouTube
         */
        render.find('.player-panel__timeline').before(
            render.find('.player-panel__line-one')
        );

        /**
         * Добавляем элементы заголовка и подзаголовка
         * в информационную панель
         */
        if (!render.find('.player-info__title').length) {
            render.find('.player-info .player-info__line').before(title);
        }

        if (!render.find('.value--name').length) {
            render.find('.value--size').after(value);
        }

        /**
         * Группировка кнопок в pill-shaped контейнеры:
         *
         * Правая панель:
         *   [audio/subs/tracks] [quality] [остальные кнопки]
         *
         * Левая панель:
         *   [prev/play/next]
         */
        var box = $('<div class="player-panel__box-buttons"></div>');
        var right_panel = render.find('.player-panel__right');
        var left_panel = render.find('.player-panel__left');

        /* Создаём контейнеры для правой панели */
        var right_box_quality = box.clone();
        var right_box_main = box.clone();
        var right_box_audio = box.clone();

        /* Контейнер для левой панели */
        var left_box_main = box.clone();

        /* Собираем правую панель */
        right_panel.append(right_box_audio);
        right_panel.append(right_box_quality);
        right_panel.append(right_box_main);

        /* Перемещаем кнопки в соответствующие контейнеры */
        right_box_main.append(right_panel.find('.button'));
        right_box_quality.append(right_panel.find('.player-panel__quality'));
        right_box_audio.append(right_panel.find('.player-panel__flow'));
        right_box_audio.append(right_panel.find('.player-panel__subs'));
        right_box_audio.append(right_panel.find('.player-panel__tracks'));

        /* Собираем левую панель */
        left_panel.prepend(left_box_main);
        left_box_main.append(left_panel.find('.button'));


        /* ===========================================================
         *  РАЗДЕЛ 3: КАСТОМНЫЙ ОВЕРЛЕЙ ГРОМКОСТИ
         *
         *  Создаём красивый оверлей, который показывается
         *  при изменении громкости. Отображает:
         *  — Иконку динамика (меняется в зависимости от уровня)
         *  — Вертикальную полосу заполнения
         *  — Числовое значение в процентах
         *
         *  Работает на всех платформах:
         *  — ТВ: реагирует на стрелки вверх/вниз
         *  — ПК: реагирует на колёсико мыши
         *  — Мобилки: реагирует на тач-события
         * =========================================================== */

        /**
         * SVG-иконки динамика для разных уровней громкости
         * Три варианта: выключен (mute), тихо (low), громко (high)
         */
        var volumeIcons = {
            mute: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>',
            low:  '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/></svg>',
            high: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>'
        };

        /**
         * Создаём DOM-элемент оверлея громкости
         * и добавляем его в контейнер плеера
         */
        var volumeOverlay = $(
            '<div class="yt-volume-overlay">' +
                '<div class="yt-volume-overlay__icon">' + volumeIcons.high + '</div>' +
                '<div class="yt-volume-overlay__bar">' +
                    '<div class="yt-volume-overlay__fill" style="height: 100%;"></div>' +
                '</div>' +
                '<div class="yt-volume-overlay__value">100</div>' +
            '</div>'
        );

        /* Добавляем оверлей в рендер плеера (только если ещё не добавлен) */
        if (!render.find('.yt-volume-overlay').length) {
            render.append(volumeOverlay);
        }

        /** Таймер для автоскрытия оверлея громкости */
        var volumeHideTimer = null;

        /**
         * Показывает оверлей громкости с текущим уровнем
         *
         * @param {number} level — уровень громкости от 0 до 1
         * @param {boolean} muted — звук выключен (mute)
         */
        function showVolumeOverlay(level, muted) {
            var overlay = render.find('.yt-volume-overlay');
            if (!overlay.length) return;

            /* Определяем иконку в зависимости от уровня */
            var icon;
            if (muted || level <= 0) {
                icon = volumeIcons.mute;
            } else if (level < 0.5) {
                icon = volumeIcons.low;
            } else {
                icon = volumeIcons.high;
            }

            /* Обновляем содержимое оверлея */
            overlay.find('.yt-volume-overlay__icon').html(icon);
            overlay.find('.yt-volume-overlay__fill').css('height', (muted ? 0 : level * 100) + '%');
            overlay.find('.yt-volume-overlay__value').text(muted ? '0' : Math.round(level * 100));

            /* Показываем оверлей */
            overlay.addClass('yt-volume-visible');

            /* Сбрасываем таймер автоскрытия */
            if (volumeHideTimer) clearTimeout(volumeHideTimer);

            /**
             * Автоскрытие через 1.5 секунды бездействия
             * (как в YouTube)
             */
            volumeHideTimer = setTimeout(function () {
                overlay.removeClass('yt-volume-visible');
            }, 1500);
        }

        /**
         * Отслеживаем изменения громкости через видео-элемент.
         * Используем MutationObserver для обнаружения видео,
         * так как оно может быть создано позже.
         */
        function attachVolumeListener() {
            var video = render.find('video')[0];
            if (video) {
                /**
                 * Слушаем нативное событие volumechange
                 * HTML5 Video API. Срабатывает при любом
                 * изменении громкости, включая mute/unmute.
                 */
                video.addEventListener('volumechange', function () {
                    showVolumeOverlay(this.volume, this.muted);
                });
                return true;
            }
            return false;
        }

        /**
         * Пробуем найти видео-элемент с интервалом.
         * Останавливаемся, когда найдён или после 30 попыток
         * (15 секунд). Это нужно потому, что видео может
         * создаваться асинхронно после вызова Player.play().
         */
        var volumeAttachAttempts = 0;
        var volumeAttachInterval = setInterval(function () {
            volumeAttachAttempts++;
            if (attachVolumeListener() || volumeAttachAttempts > 30) {
                clearInterval(volumeAttachInterval);
            }
        }, 500);

        /**
         * Также слушаем событие старта плеера —
         * при каждом новом воспроизведении переподключаем
         * слушатель громкости
         */
        Lampa.Player.listener.follow('start', function () {
            setTimeout(function () {
                attachVolumeListener();
            }, 500);
        });


        /* ===========================================================
         *  РАЗДЕЛ 4: ОБРАБОТКА СОБЫТИЙ ПЛЕЕРА
         *
         *  — Обновление заголовка при старте воспроизведения
         *  — Отображение названия и серии/эпизода
         *  — Скрытие дублирующихся элементов
         * =========================================================== */

        /**
         * При старте воспроизведения обновляем информацию:
         * — Основной заголовок (название фильма/сериала)
         * — Подзаголовок (серия, эпизод, качество)
         *
         * Это обычная функция (не listener), вызывается из
         * общего обработчика 'start' в самом низу файла —
         * так гарантируем, что initPlayerUI() уже отработал
         * и переменные render/title/value существуют.
         */
        function updateTitle(data) {
            /** Название из данных плеера */
            var name = data.title;
            var head = '';

            /**
             * Определяем основной заголовок:
             * 1. Из карточки (data.card) — приоритет
             * 2. Из активного Activity (текущей страницы)
             * 3. Фоллбэк на name из данных
             */
            if (!data.iptv) {
                if (data.card) {
                    head = data.card.title || data.card.name;
                } else if (Lampa.Activity.active().movie) {
                    head = Lampa.Activity.active().movie.title ||
                           Lampa.Activity.active().movie.name;
                }
            }

            if (!head) head = name;

            /**
             * Обновляем DOM:
             * — Заголовок: название фильма/сериала
             * — Скрываем заголовок для IPTV
             * — Подзаголовок: имя серии/эпизода (если отличается)
             */
            title.text(head).toggleClass('hide', Boolean(data.iptv));

            render.find('.player-info__name')
                .toggleClass('hide', Boolean(name == head))
                .toggleClass('hide', true);

            value.toggleClass('hide', Boolean(name == head))
                .find('span').text(name);
        }


        /* ===========================================================
         *  РАЗДЕЛ 5: УЛУЧШЕНИЯ ТАКТИЛЬНОГО ВЗАИМОДЕЙСТВИЯ
         *
         *  Обработка touch-событий для мобильных устройств.
         *  Улучшает взаимодействие с прогресс-баром на
         *  сенсорных экранах (свайп для перемотки).
         * =========================================================== */

        /**
         * Добавляем визуальную обратную связь при тапе
         * на кнопки плеера (ripple-эффект для мобилок)
         */
        render.on('touchstart', '.player-panel .button', function () {
            $(this).css('transform', 'scale(0.92)');
        });

        render.on('touchend touchcancel', '.player-panel .button', function () {
            $(this).css('transform', '');
        });

        /**
         * Улучшаем взаимодействие с прогресс-баром на тач-экранах:
         * — При касании увеличиваем высоту для удобства
         * — При отпускании возвращаем обратно
         */
        render.on('touchstart', '.player-panel__timeline', function () {
            $(this).css({
                'height': '8px',
                'transition': 'height 0.1s ease'
            });
        });

        render.on('touchend touchcancel', '.player-panel__timeline', function () {
            $(this).css({
                'height': '',
                'transition': ''
            });
        });

        } /* конец initPlayerUI() */


        /* ===========================================================
         *  ГЛАВНЫЙ ОБРАБОТЧИК СТАРТА ПЛЕЕРА
         *
         *  При первом старте видео — один раз строим весь UI
         *  (initPlayerUI). При каждом старте (включая первый)
         *  обновляем заголовок (updateTitle).
         * =========================================================== */
        Lampa.Player.listener.follow('start', function (data) {
            try {
                if (!ui_inited) {
                    ui_inited = true;
                    initPlayerUI();
                }
                updateTitle(data);
            } catch (e) {
                /* Не роняем весь плеер, если что-то пошло не так —
                   просто пишем ошибку в консоль для отладки */
                console.error('[YT Player Plugin] Ошибка инициализации UI:', e);
            }
        });

    } /* конец startPlugin() */


    /* ================================================================
     *  ИНИЦИАЛИЗАЦИЯ ПЛАГИНА
     *
     *  Используем глобальный флаг window.youtube_player_plugin
     *  для предотвращения повторной инициализации при
     *  многократной загрузке скрипта.
     *
     *  Два сценария запуска:
     *  1. Приложение уже готово (window.appready = true)
     *     → запускаем плагин сразу
     *  2. Приложение ещё загружается
     *     → ждём события 'ready' от Lampa.Listener
     * ================================================================ */

    if (!window.youtube_player_plugin) {
        window.youtube_player_plugin = true;

        if (window.appready) {
            startPlugin();
        } else {
            Lampa.Listener.follow('app', function (e) {
                if (e.type == 'ready') startPlugin();
            });
        }
    }

})();
