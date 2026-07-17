(function() {
    'use strict';

    Lampa.Manifest.plugins = Lampa.Manifest.plugins || {};
    Lampa.Manifest.plugins.spy = {
        name: 'Шпион',
        version: '1.0.0',
        description: 'Находит плавающую панель и показывает её класс',
        author: 'AI'
    };

    Lampa.Listener.follow('app', function(e) {
        if (e.type === 'ready') {
            // Ждем 3 секунды, чтобы Lampa полностью загрузила интерфейс
            setTimeout(function() {
                let found = [];
                let w = window.innerWidth;
                let h = window.innerHeight;

                // Ищем все элементы на странице
                document.querySelectorAll('div, span, a, button, svg').forEach(el => {
                    let r = el.getBoundingClientRect();
                    
                    // Проверяем, находится ли элемент в левом нижнем углу
                    if (r.left < (w * 0.35) && r.top > (h * 0.6)) {
                        let style = window.getComputedStyle(el);
                        // Если элемент видим и не слишком огромный (исключаем фон)
                        if (style.display !== 'none' && style.visibility !== 'hidden' && r.width > 5 && r.width < 250 && r.height > 5 && r.height < 250) {
                            let className = (typeof el.className === 'string' ? el.className : '');
                            // Собираем уникальные классы
                            if (className && found.indexOf(className) === -1) {
                                found.push(className);
                            }
                        }
                    }
                });

                let resultText = found.length > 0 ? found.join('<br>') : 'Ничего не найдено в левом нижнем углу!';

                // Создаем черное окно поверх всего приложения
                let modal = document.createElement('div');
                modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:999999;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;';
                modal.innerHTML = '<div style="background:#1f1f1f;padding:20px;border-radius:10px;max-width:400px;width:100%;color:#fff;font-family:sans-serif;font-size:16px;line-height:1.5;word-break:break-all;">' + 
                                  '<b style="display:block;margin-bottom:15px;color:#2196F3;">Найденные классы панельки:</b>' + 
                                  resultText + 
                                  '<br><br><div style="text-align:center;color:#888;font-size:12px;">Сделай скриншот этого окна и скинь создателю плагина. Чтобы закрыть — смахни Lampa из памяти.</div>' + 
                                  '</div>';
                document.body.appendChild(modal);
            }, 3000);
        }
    });
})();
