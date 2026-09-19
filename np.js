//========================================================================
// [LAMPA PREMIUM UNLOCKER PLUGIN - V1.1 - BY ARTIMUS]
//========================================================================
// Description: Forces Lampa to believe the user has an active CUB Premium
//              subscription by overriding Account.hasPremium().
//
// Changes in V1.1:
//   - Added global error handler for debugging
//   - Added app_digital version check
//   - Added try/catch blocks around critical operations
//   - Improved logging for troubleshooting
//   - Prevented multiple instances with singleton flag
//
// WARNING: For educational purposes only. Use at your own risk.
//========================================================================

(function () {
    'use strict';

    // --- Singleton flag: prevent double-loading ---
    if (window.plugin_premium_unlock_ready) {
        console.log('[Premium Unlocker] Плагин уже загружен. Пропускаем.');
        return;
    }
    window.plugin_premium_unlock_ready = true;

    // --- Error handler: catches all errors from this plugin ---
    window.addEventListener('error', function (e) {
        if (e.filename && e.filename.indexOf('premium_unlock') !== -1) {
            var stack = (e.error && e.error.stack) ? e.error.stack : (e.stack || 'no stack');
            console.error('[Premium Unlocker] JS ERROR:', e.filename, (e.error || e).message);
            console.error('[Premium Unlocker] Stack:', stack.split('\n').join('\n'));
        }
    });

    function startPremiumUnlock() {
        console.log('[Premium Unlocker] Попытка активации...');

        // --- Version check: warn if Lampa is too old ---
        try {
            if (typeof Lampa !== 'undefined' && Lampa.Manifest && Lampa.Manifest.app_digital < 300) {
                console.warn('[Premium Unlocker] Внимание: версия Lampa устарела (app_digital=' + Lampa.Manifest.app_digital + '). Плагин может работать некорректно.');
            }
        } catch (e) {
            console.warn('[Premium Unlocker] Не удалось проверить версию Lampa:', e);
        }

        function tryPatch() {
            try {
                // Check that Lampa and Account module are available
                if (typeof Lampa === 'undefined') {
                    console.warn('[Premium Unlocker] Lampa не найдена. Ждём...');
                    return false;
                }

                if (!Lampa.Account) {
                    console.warn('[Premium Unlocker] Lampa.Account не найден. Ждём...');
                    return false;
                }

                if (typeof Lampa.Account.hasPremium !== 'function') {
                    console.warn('[Premium Unlocker] Lampa.Account.hasPremium не является функцией. Пропускаем.');
                    return false;
                }

                // --- Save original function for rollback ---
                if (!Lampa.Account._originalHasPremium) {
                    Lampa.Account._originalHasPremium = Lampa.Account.hasPremium;
                }

                // --- Override hasPremium() ---
                Lampa.Account.hasPremium = function () {
                    try {
                        var originalResult = Lampa.Account._originalHasPremium
                            ? Lampa.Account._originalHasPremium()
                            : false;
                        console.log('[Premium Unlocker] hasPremium() вызван. Оригинал: ' + originalResult + '. Возвращаем: true.');
                    } catch (e) {
                        console.warn('[Premium Unlocker] Ошибка при вызове оригинала hasPremium:', e);
                    }
                    return true;
                };

                // --- Disable developer_nopremium flag ---
                try {
                    Lampa.Storage.set('developer_nopremium', false);
                    console.log('[Premium Unlocker] Флаг developer_nopremium сброшен.');
                } catch (e) {
                    console.warn('[Premium Unlocker] Не удалось сбросить developer_nopremium:', e);
                }

                console.log('[Premium Unlocker] ✅ Патч успешно применён. Премиум-статус активирован (локально).');
                return true;

            } catch (e) {
                console.error('[Premium Unlocker] Критическая ошибка в tryPatch:', e);
                return false;
            }
        }

        // --- Initialization strategy ---
        if (tryPatch()) {
            return; // Already applied
        }

        if (window.appready) {
            // App is ready but Account not yet available — retry with delays
            console.log('[Premium Unlocker] appready=true, но Account не найден. Повторная попытка...');
            var retries = 0;
            var interval = setInterval(function () {
                retries++;
                if (tryPatch()) {
                    clearInterval(interval);
                } else if (retries >= 10) {
                    clearInterval(interval);
                    console.error('[Premium Unlocker] Не удалось применить патч после 10 попыток. Проверьте версию Lampa.');
                }
            }, 1000);
        } else {
            // Wait for app ready event
            console.log('[Premium Unlocker] Ожидание события app.ready...');
            try {
                Lampa.Listener.follow('app', function (e) {
                    if (e.type === 'ready') {
                        console.log('[Premium Unlocker] Событие app.ready получено.');
                        setTimeout(function () {
                            if (!tryPatch()) {
                                console.error('[Premium Unlocker] Патч не применён после app.ready. Возможна несовместимость.');
                            }
                        }, 500);
                    }
                });
            } catch (e) {
                console.error('[Premium Unlocker] Не удалось подписаться на событие app. Ошибка:', e);
            }
        }
    }

    // --- Start the plugin ---
    startPremiumUnlock();

})();
