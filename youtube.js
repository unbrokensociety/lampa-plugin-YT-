(function() {
    // Вставляем CSS-стили моментально
    var style = document.createElement('style');
    style.innerHTML = `
        /* Скрываем ВСЕ возможные плавающие кнопки Lampa по известным классам */
        .head__menu-icon, .navigator-floating, .floating-button, 
        .menu-fab, .player-tool, .bottom-left-panel, .head__left.mobile, 
        .head__navigation, .head__menu, .navigation-floating, 
        .touch-menu, .touch-nav, .fab, .menu__button {
            display: none !important;
            opacity: 0 !important;
            visibility: hidden !important;
            width: 0 !important;
            height: 0 !important;
        }
    `;
    document.head.appendChild(style);

    // Запускаем независимый таймер, который каждые 500мс проверяет экран
    setInterval(function() {
        var w = window.innerWidth;
        var h = window.innerHeight;
        var elems = document.querySelectorAll('div, a, button, span, svg');
        
        for (var i = 0; i < elems.length; i++) {
            var el = elems[i];
            
            // Пропускаем элементы внутри плеера, модальных окон и карточек
            if (el.closest('.player, .modal, .card, .full-start, .explorer__content, .simplebox')) continue;

            var rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) continue;

            var cs = window.getComputedStyle(el);
            
            // Если элемент висит поверх всего (fixed/absolute)
            if (cs.position === 'fixed' || cs.position === 'absolute') {
                
                // Проверяем: левее 40% экрана И ниже 65% экрана
                var isBottomLeft = rect.left < (w * 0.4) && rect.top > (h * 0.65);
                var isSmall = rect.width < 200 && rect.height < 200;

                if (isBottomLeft && isSmall) {
                    el.style.setProperty('display', 'none', 'important');
                }
            }
        }
    }, 500); // Проверка 2 раза в секунду
})();
