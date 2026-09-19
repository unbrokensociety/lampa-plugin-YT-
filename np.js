//========================================================================
// [LAMPA PREMIUM + SYNC - V3.0 - BY ARTIMUS]
//========================================================================
// Что делает:
//   1. Патчит Lampa.Account.hasPremium() → всегда true (локально)
//   2. Синхронизирует закладки ('favorite') и прогресс ('file_view')
//      между устройствами через кастомный Cloudflare Worker
//   3. Поддерживает пейринг через 6-значный код
//
// Требует:
//   - Задеплоенный Worker (см. V1.2 с префиксом lampa_sync:)
//   - KV Namespace, привязанный как LAMPA_SYNC_KV
//========================================================================

(function () {
    'use strict';

    // =====================================================================
    // НАСТРОЙКА — ЗАМЕНИ НА СВОЙ URL
    // =====================================================================
    var WORKER_URL = 'https://lampa-sync.wrk-me.workers.dev';
    var SYNC_INTERVAL_MS = 60000; // 60 секунд
    // =====================================================================

    if (window._artimus_lampa_v3) return;
    window._artimus_lampa_v3 = true;

    var LOG = function () {
        var args = Array.prototype.slice.call(arguments);
        args.unshift('[Artimus V3]');
        console.log.apply(console, args);
    };
    var ERR = function () {
        var args = Array.prototype.slice.call(arguments);
        args.unshift('[Artimus V3]');
        console.error.apply(console, args);
    };

    // =====================================================================
    // Утилиты
    // =====================================================================
    function uuid() {
        return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0;
            var v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    function mergeArrays(a, b) {
        var map = {};
        var out = [];
        (a || []).concat(b || []).forEach(function (item) {
            var key = (item && item.id) ? String(item.id) : JSON.stringify(item);
            if (!map[key]) { map[key] = true; out.push(item); }
        });
        return out;
    }

    function mergeObjects(a, b) {
        var out = {};
        var k;
        for (k in (a || {})) out[k] = a[k];
        for (k in (b || {})) {
            if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) &&
                out[k] && typeof out[k] === 'object' && !Array.isArray(out[k])) {
                out[k] = mergeObjects(out[k], b[k]);
            } else {
                out[k] = b[k];
            }
        }
        return out;
    }

    // =====================================================================
    // Патч премиума
    // =====================================================================
    function patchPremium() {
        try {
            if (typeof Lampa === 'undefined') return false;
            if (!Lampa.Account) return false;

            if (typeof Lampa.Account.hasPremium === 'function' && !Lampa.Account._artimus_patched) {
                var original = Lampa.Account.hasPremium;
                Lampa.Account.hasPremium = function () {
                    try { return true; } catch (e) { return true; }
                };
                Lampa.Account._artimus_patched = true;
                Lampa.Account._artimus_original = original;
                LOG('✅ hasPremium() пропатчен → всегда true');
            }

            // Флаг разработчика, который может имитировать "нет премиума"
            try {
                if (Lampa.Storage && Lampa.Storage.set) {
                    Lampa.Storage.set('developer_nopremium', false);
                }
            } catch (e) {}

            return true;
        } catch (e) {
            ERR('patchPremium:', e);
            return false;
        }
    }

    // =====================================================================
    // Работа с Worker
    // =====================================================================
    function getDeviceId() {
        var id = Lampa.Storage.get('artimus_device_id', '');
        if (!id) {
            id = 'dev_' + uuid();
            Lampa.Storage.set('artimus_device_id', id);
            LOG('Создан device_id:', id);
        }
        return id;
    }

    function getSyncToken() {
        return Lampa.Storage.get('artimus_sync_token', '');
    }

    function setSyncToken(token) {
        Lampa.Storage.set('artimus_sync_token', token);
    }

    function requestPair() {
        var deviceId = getDeviceId();
        fetch(WORKER_URL + '/pair', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ device_id: deviceId })
        })
        .then(function (r) { return r.json(); })
        .then(function (d) {
            if (!d.success) { ERR('pair failed:', d); return; }
            LOG('Код пейринга:', d.code);
            showPairDialog(d.code, deviceId);
        })
        .catch(function (e) { ERR('pair network:', e); });
    }

    function verifyPair(code, deviceId) {
        fetch(WORKER_URL + '/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: code, device_id: deviceId })
        })
        .then(function (r) { return r.json(); })
        .then(function (d) {
            if (d.success && d.sync_token) {
                setSyncToken(d.sync_token);
                LOG('✅ Спарен. Токен сохранён.');
                if (window.Lampa && Lampa.Noty) Lampa.Noty.show('Sync: спарено успешно', 3000);
                startSyncLoop();
            } else {
                ERR('verify failed:', d);
                if (window.Lampa && Lampa.Noty) Lampa.Noty.show('Sync: ошибка — ' + (d.error || 'unknown'), 5000);
            }
        })
        .catch(function (e) { ERR('verify network:', e); });
    }

    function showPairDialog(myCode, deviceId) {
        var html = '<div style="padding:20px;color:#fff;font-family:sans-serif">' +
                   '<h2 style="margin:0 0 10px">Синхронизация Lampa</h2>' +
                   '<p style="margin:0 0 15px;opacity:.8">Код для сопряжения с другим устройством:</p>' +
                   '<div style="font-size:32px;font-weight:bold;letter-spacing:6px;' +
                   'background:#222;padding:15px;border-radius:8px;text-align:center;margin-bottom:15px">' + myCode + '</div>' +
                   '<p style="margin:0 0 10px;opacity:.8">Или введи код с другого устройства:</p>' +
                   '<input id="artimus-pair-input" type="text" maxlength="6" ' +
                   'style="width:100%;padding:10px;font-size:20px;text-align:center;' +
                   'border-radius:8px;border:1px solid #444;background:#1a1a1a;color:#fff;box-sizing:border-box" ' +
                   'placeholder="000000">' +
                   '<div style="margin-top:15px;display:flex;gap:10px">' +
                   '<button id="artimus-pair-ok" style="flex:1;padding:10px;background:#e50914;' +
                   'color:#fff;border:none;border-radius:8px;font-size:16px;cursor:pointer">Войти</button>' +
                   '<button id="artimus-pair-close" style="flex:1;padding:10px;background:#333;' +
                   'color:#fff;border:none;border-radius:8px;font-size:16px;cursor:pointer">Закрыть</button>' +
                   '</div></div>';

        if (Lampa.Modal && Lampa.Modal.open) {
            Lampa.Modal.open({
                title: '',
                html: html,
                size: 'small',
                onBack: function () { Lampa.Modal.close(); }
            });
            setTimeout(bindPairButtons, 100);
        } else {
            // Fallback: prompt
            var code = prompt('Код вашего устройства: ' + myCode +
                              '\n\nВведите код с другого устройства (или отмена):');
            if (code && code.length === 6) verifyPair(code, deviceId);
        }
    }

    function bindPairButtons() {
        var ok = document.getElementById('artimus-pair-ok');
        var close = document.getElementById('artimus-pair-close');
        var input = document.getElementById('artimus-pair-input');
        if (ok) {
            ok.addEventListener('click', function () {
                var code = (input && input.value || '').trim();
                if (code.length !== 6) {
                    if (Lampa.Noty) Lampa.Noty.show('Код должен быть 6 цифр', 3000);
                    return;
                }
                if (Lampa.Modal) Lampa.Modal.close();
                verifyPair(code, getDeviceId());
            });
        }
        if (close) {
            close.addEventListener('click', function () {
                if (Lampa.Modal) Lampa.Modal.close();
            });
        }
    }

    // =====================================================================
    // Синхронизация данных
    // =====================================================================
    var _syncInFlight = false;

    function pushData(dataType, data) {
        var token = getSyncToken();
        if (!token) return;
        var deviceId = getDeviceId();
        fetch(WORKER_URL + '/sync', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Sync-Token': token,
                'X-Device-Id': deviceId
            },
            body: JSON.stringify({
                profile_id: 'default',
                data_type: dataType,
                data: data
            })
        })
        .then(function (r) { return r.json(); })
        .then(function (d) {
            if (!d.success) ERR('push ' + dataType + ':', d.error);
            else LOG('⬆ push ' + dataType + ' ok');
        })
        .catch(function (e) { ERR('push network:', e); });
    }

    function pullAll() {
        var token = getSyncToken();
        if (!token || _syncInFlight) return;
        _syncInFlight = true;
        var deviceId = getDeviceId();

        fetch(WORKER_URL + '/sync?data_type=all', {
            headers: {
                'X-Sync-Token': token,
                'X-Device-Id': deviceId
            }
        })
        .then(function (r) { return r.json(); })
        .then(function (d) {
            _syncInFlight = false;
            if (!d.success) { ERR('pull:', d.error); return; }
            applyRemote(d.data);
        })
        .catch(function (e) {
            _syncInFlight = false;
            ERR('pull network:', e);
        });
    }

    function applyRemote(remote) {
        if (!remote) return;

        // Закладки
        if (remote.bookmarks && remote.bookmarks.data) {
            var local = Lampa.Storage.get('favorite', []) || [];
            var merged = mergeArrays(local, remote.bookmarks.data);
            Lampa.Storage.set('favorite', merged);
            LOG('⬇ bookmarks: local=' + local.length + ' remote=' +
                remote.bookmarks.data.length + ' merged=' + merged.length);
        }

        // Прогресс просмотра
        if (remote.timeline && remote.timeline.data) {
            var localT = Lampa.Storage.get('file_view', {}) || {};
            var mergedT = mergeObjects(localT, remote.timeline.data);
            Lampa.Storage.set('file_view', mergedT);
            LOG('⬇ timeline: keys merged=' + Object.keys(mergedT).length);
        }

        // Обновляем UI Lampa, если возможно
        try {
            if (Lampa.Storage.listener && Lampa.Storage.listener.send) {
                Lampa.Storage.listener.send('favorite');
                Lampa.Storage.listener.send('file_view');
            }
        } catch (e) {}
    }

    function pushAll() {
        try {
            var fav = Lampa.Storage.get('favorite', []);
            if (fav && fav.length) pushData('bookmarks', fav);
            var view = Lampa.Storage.get('file_view', {});
            if (view && Object.keys(view).length) pushData('timeline', view);
        } catch (e) { ERR('pushAll:', e); }
    }

    function startSyncLoop() {
        if (window._artimus_sync_timer) clearInterval(window._artimus_sync_timer);

        // Первая синхронизация сразу
        pullAll();

        // Периодическая синхронизация
        window._artimus_sync_timer = setInterval(function () {
            pullAll();
            // Пуш локальных изменений тоже раз в минуту — на случай, если
            // не поймали событие изменения Storage
            pushAll();
        }, SYNC_INTERVAL_MS);

        LOG('Sync loop started (каждые ' + (SYNC_INTERVAL_MS / 1000) + ' сек)');
    }

    // Хук на изменения Storage — пушим сразу, не ждём таймер
    function hookStorageChanges() {
        try {
            var origSet = Lampa.Storage.set;
            if (origSet && !Lampa.Storage._artimus_hooked) {
                Lampa.Storage.set = function (key, value) {
                    var result = origSet.apply(this, arguments);
                    if (key === 'favorite') pushData('bookmarks', value);
                    else if (key === 'file_view') pushData('timeline', value);
                    return result;
                };
                Lampa.Storage._artimus_hooked = true;
                LOG('Storage.set перехвачен для мгновенной синхронизации');
            }
        } catch (e) { ERR('hookStorage:', e); }
    }

    // =====================================================================
    // Инициализация
    // =====================================================================
    function init() {
        LOG('Инициализация...');

        var tries = 0;
        var wait = setInterval(function () {
            tries++;
            if (typeof Lampa !== 'undefined' && Lampa.Account && Lampa.Storage) {
                clearInterval(wait);
                LOG('Lampa готова, патчим...');

                patchPremium();
                hookStorageChanges();

                var token = getSyncToken();
                if (token) {
                    LOG('Токен найден, запускаем sync loop');
                    startSyncLoop();
                } else {
                    LOG('Токена нет — запускаем пейринг');
                    setTimeout(requestPair, 2000);
                }
            } else if (tries > 30) {
                clearInterval(wait);
                ERR('Lampa так и не инициализировалась за 30 секунд');
            }
        }, 1000);
    }

    if (window.appready) {
        init();
    } else {
        try {
            Lampa.Listener.follow('app', function (e) {
                if (e.type === 'ready') setTimeout(init, 500);
            });
        } catch (e) {
            init();
        }
    }

})();
