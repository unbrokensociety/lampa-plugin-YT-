(function() {
    'use strict';

    Lampa.Manifest.plugins = Lampa.Manifest.plugins || {};
    Lampa.Manifest.plugins.kill_float_v2 = {
        name: 'Убить плавающую панель V2',
        version: '2.0.0',
        description: 'Агрессивное удаление любых плавающих элементов внизу слева.',
        author: 'AI'
    };

    // Функция, которая перебирает элементы и скрывает нужные
    function executeHide() {
        const w = window.innerWidth;
        const h = window.innerHeight;

        // Получаем все элементы на странице
        const elements = document.querySelectorAll('div, span, a, button, svg');
        
        elements.forEach(el => {
            // Пропускаем важные элементы, чтобы не сломать Lampa
            if (el.closest('.player, .modal, .card, .full-start, .simplebox, .explorer__content')) return;

            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return;

            const style = window.getComputedStyle(el);
            
            // Проверяем только фиксированные элементы
            if (style.position === 'fixed' || style.position === 'absolute') {
                // Проверяем, находится ли элемент в левом нижнем углу (левее 35% экрана, ниже 65%)
                const isBottomLeft = rect.left < (w * 0.35) && rect.top > (h * 0.65);
                
                // Исключаем большие панели (плавающая панелька обычно маленькая)
                const isSmall = rect.width < 200 && rect.height < 200;

                if (isBottomLeft && isSmall) {
                    // Если элемент попал под критерии - жестко скрываем
                    if (el.style.display !== 'none' || el.style.visibility !== 'hidden') {
                        el.style.setProperty('display', 'none', 'important');
                        el.style.setProperty('visibility', 'hidden', 'important');
                        el.style.setProperty('opacity', '0', 'important');
                        el.style.setProperty('width', '0px', 'important');
                        el.style.setProperty('height', '0px', 'important');
                        el.style.setProperty('pointer-events', 'none', 'important');
                    }
                }
            }
        });
    }

    // Запускаем наблюдатель (MutationObserver) — он сработает мгновенно, как только панель появится
    const observer = new MutationObserver(function() {
        executeHide();
    });

    // Запускаем после готовности приложения
    Lampa.Listener.follow('app', function(e) {
        if (e.type === 'ready') {
            executeHide(); // Первичная проверка
            // Следим за всеми изменениями в DOM
            observer.observe(document.body, { childList: true, subtree: true });
            
            // На всякий случай дергаем функцию каждые 500 мс
            setInterval(executeHide, 500);
        }
    });

})();
