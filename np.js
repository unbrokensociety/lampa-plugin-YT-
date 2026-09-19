//========================================================================
// [LAMPA PREMIUM UNLOCKER PLUGIN - V1.0 - BY ARTIMUS]
//========================================================================
// Description: This plugin overrides the premium status check in Lampa,
//              forcing the application to believe the user has an active
//              CUB Premium subscription. It works by monkey-patching the
//              Account.hasPremium() method and disabling the
//              'developer_nopremium' flag.
//
// Based on analysis of: https://github.com/yumata/lampa-source
//                        (Account System & Authentication, DeepWiki)
//
// WARNING: For educational/experimental purposes only. Using this may
//          violate the Lampa Terms of Service and could lead to account
//          termination or other consequences. Use at your own risk.
//========================================================================

(function () {
    'use strict';

    // Уникальное имя плагина для предотвращения повторной загрузки
    if (window.plugin_premium_unlock_ready) {
        console.log('[Premium Unlocker] Плагин уже загружен.');
        return;
    }
    window.plugin_premium_unlock_ready = true;

    function startPremiumUnlock() {
        console.log('[Premium Unlocker] Попытка активации...');

        // 1. Ждём, пока приложение Lampa полностью инициализируется.
        //    Проверяем наличие глобального объекта Lampa и его модуля Account.
        function tryPatch() {
            if (typeof Lampa !== 'undefined' && Lampa.Account && typeof Lampa.Account.hasPremium === 'function') {
                // --- МОМЕНТ ИСТИНЫ ---

                // 2. Сохраняем оригинальную функцию (на всякий случай, для отката).
                if (!Lampa.Account._originalHasPremium) {
                    Lampa.Account._originalHasPremium = Lampa.Account.hasPremium;
                }

                // 3. Подменяем метод hasPremium.
                //    Теперь он всегда возвращает true, независимо от данных пользователя.
                Lampa.Account.hasPremium = function () {
                    console.log('[Premium Unlocker] hasPremium() вызван. Возвращаем true (было: ' + Lampa.Account._originalHasPremium() + ').');
                    return true;
                };

                // 4. Убираем флаг "симуляции отсутствия премиума" из настроек.
                //    Он может использоваться в режиме разработчика и мешать нам.
                try {
                    Lampa.Storage.set('developer_nopremium', false);
                    console.log('[Premium Unlocker] Флаг developer_nopremium сброшен.');
                } catch (e) {
                    console.warn('[Premium Unlocker] Не удалось сбросить developer_nopremium:', e);
                }

                // 5. (Опционально) Можно также переопределить другие проверки,
                //    но hasPremium() — основная. Если найдутся ещё, добавим в следующих версиях.

                console.log('[Premium Unlocker] ✅ Патч успешно применён. Премиум-статус активирован (локально).');
                return true;
            }
            return false;
        }

        // Пытаемся применить патч сразу, если Lampa уже готова.
        if (!tryPatch()) {
            // Если нет — подписываемся на событие готовности приложения.
            if (window.appready) {
                // Если appready уже true, но Lampa.Account ещё не доступен (редкий случай),
                // пробуем ещё раз с небольшой задержкой.
                setTimeout(tryPatch, 1000);
            } else {
                // Ждём события 'ready' от Lampa.
                Lampa.Listener.follow('app', function (e) {
                    if (e.type === 'ready') {
                        setTimeout(tryPatch, 500); // Даём приложению немного времени на инициализацию модулей.
                    }
                });
            }
        }
    }

    // Запускаем процесс.
    startPremiumUnlock();

})();
