// =====================================================================
// Патч премиума — V3.1 (устойчивая версия с подробным логированием)
// =====================================================================
function patchPremium() {
    LOG('→ patchPremium(): старт');
    
    // --- 1. Проверка Lampa ---
    if (typeof Lampa === 'undefined') {
        ERR('patchPremium: Lampa не определена');
        return false;
    }
    LOG('  Lampa есть, версия:', (Lampa.Manifest && Lampa.Manifest.app_digital) || 'unknown');
    
    // --- 2. Проверка Lampa.Account ---
    if (!Lampa.Account) {
        ERR('patchPremium: Lampa.Account не существует. Возможно, плагин загружен до инициализации Account, либо это сборка без Account.');
        return false;
    }
    LOG('  Lampa.Account есть');
    LOG('  typeof Lampa.Account.hasPremium =', typeof Lampa.Account.hasPremium);
    
    // --- 3. Патч hasPremium ---
    var patchedPremium = false;
    try {
        if (typeof Lampa.Account.hasPremium === 'function') {
            if (!Lampa.Account._artimus_original) {
                Lampa.Account._artimus_original = Lampa.Account.hasPremium;
                LOG('  Оригинал hasPremium сохранён');
            }
            Lampa.Account.hasPremium = function () {
                LOG('  hasPremium() вызван → true');
                return true;
            };
            Lampa.Account._artimus_patched = true;
            patchedPremium = true;
            LOG('✅ hasPremium() пропатчен → всегда true');
        } else if (typeof Lampa.Account.hasPremium === 'undefined') {
            // Некоторые сборки Lampa не имеют hasPremium вовсе.
            // Тогда создаём свою заглушку — некоторые модули могут её вызывать.
            LOG('  hasPremium отсутствует — создаём заглушку');
            Lampa.Account.hasPremium = function () { return true; };
            Lampa.Account._artimus_patched = true;
            patchedPremium = true;
            LOG('✅ hasPremium() создан → всегда true');
        } else {
            ERR('  Lampa.Account.hasPremium существует, но не функция. Тип:', typeof Lampa.Account.hasPremium);
        }
    } catch (e) {
        ERR('patchPremium.hasPremium ошибка:', e && e.message, e && e.stack);
    }
    
    // --- 4. Патч developer_nopremium (не критично) ---
    try {
        if (Lampa.Storage && typeof Lampa.Storage.set === 'function') {
            Lampa.Storage.set('developer_nopremium', false);
            LOG('  developer_nopremium сброшен');
        } else {
            LOG('  Lampa.Storage.set недоступен — пропускаем developer_nopremium');
        }
    } catch (e) {
        ERR('patchPremium.developer_nopremium ошибка:', e && e.message);
    }
    
    // --- 5. Дополнительный патч: Permit / Premium модули ---
    // В некоторых версиях Lampa премиум проверяется не через hasPremium,
    // а через Lampa.Account.Permit.hasPremium() или Lampa.Premium.hasPremium().
    try {
        if (Lampa.Account.Permit && typeof Lampa.Account.Permit.hasPremium === 'function') {
            if (!Lampa.Account.Permit._artimus_original) {
                Lampa.Account.Permit._artimus_original = Lampa.Account.Permit.hasPremium;
            }
            Lampa.Account.Permit.hasPremium = function () { return true; };
            LOG('✅ Lampa.Account.Permit.hasPremium() пропатчен');
        }
    } catch (e) { /* ignore */ }
    
    try {
        if (Lampa.Premium && typeof Lampa.Premium.hasPremium === 'function') {
            if (!Lampa.Premium._artimus_original) {
                Lampa.Premium._artimus_original = Lampa.Premium.hasPremium;
            }
            Lampa.Premium.hasPremium = function () { return true; };
            LOG('✅ Lampa.Premium.hasPremium() пропатчен');
        }
    } catch (e) { /* ignore */ }
    
    LOG('← patchPremium(): конец, patchedPremium =', patchedPremium);
    return patchedPremium;
}
