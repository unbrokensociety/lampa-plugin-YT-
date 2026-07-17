(function() {
    'use strict';

    // 1. Регистрируем плагин
    Lampa.Manifest.plugins = Lampa.Manifest.plugins || {};
    Lampa.Manifest.plugins.hide_floating = {
        name: 'Убрать плавающую панель',
        version: '1.0.0',
        description: 'Скрывает надоедливую плавающую панельку в левом нижнем углу на телефоне.',
        author: 'AI'
    };

    // 2. CSS-стили, которые жестко скрывают известные классы плавающих элементов Lampa
    const css = `
        .head__navigation,
        .head__menu-icon,
        .navigator-floating,
        .floating-button,
        .menu-fab,
        .player-tool,
        .bottom-left-panel,
        .head__left.mobile {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            width: 0 !important;
            height: 0 !important;
            overflow: hidden !important;
            pointer-events: none !important;
        }
    `;

    // Вставляем стили на страницу
    function injectStyles() {
        if (!document.getElementById('hide-floating-css')) {
            const style = document.createElement('style');
            style.id = 'hide-floating-css';
            style.innerHTML = css;
            document.head.appendChild(style);
        }
    }

    // 3. "Умный" сканер: если у кнопки нет стандартного класса, ищем её по позиции на экране
    function hideFloatingElements() {
        const elements = document.querySelectorAll('div, span, a, button');
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        elements.forEach(el => {
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);

            // Проверяем, что элемент фиксированный/абсолютный и находится в нижней левой четверти экрана
            const isFixed = style.position === 'fixed' || style.position === 'absolute';
            const isBottomLeft = rect.left < (screenWidth * 0.4) && rect.bottom > (screenHeight * 0.65);
            
            // Исключаем полноценные меню, плеер и диалоги (чтобы не сломать приложение)
            const isLarge = rect.width > 150 && rect.height > 150;
            const isImportant = el.closest('.player, .modal, .card, .full-start, .explorer_card');

            if (isFixed && isBottomLeft && !isLarge && !isImportant) {
                // Если это маленькая плавающая панелька внизу слева — скрываем её
                if (style.display !== 'none') {
                    el.style.setProperty('display', 'none', 'important');
                }
            }
        });
    }

    // 4. Запускаем плагин после загрузки Lampa
    Lampa.Listener.follow('app', function(e) {
        if (e.type === 'ready') {
            injectStyles();
            // Запускаем проверку каждые 2 секунды (на случай динамического появления панели)
            setInterval(hideFloatingElements, 2000);
        }
    });

    // На всякий случай запускаем сразу
    injectStyles();

})();
