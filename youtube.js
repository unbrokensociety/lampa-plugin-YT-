(function () {
    'use strict';

    // ВАЖНО: этот плагин НЕ обращается к сети и НЕ трогает CUB/аккаунт Lampa.
    // Все действия — только Lampa.Storage / Lampa.Select / Lampa.Input,
    // это синхронные локальные вызовы, которые не могут "зависнуть" на сети.
    // Именно сетевые обращения к CUB (profiles/all) стали причиной зависаний
    // в предыдущей версии — здесь их больше нет.

    if (window.plugin_profile_lock_ready) return;
    window.plugin_profile_lock_ready = true;

    var STORAGE_KEY  = 'pl_profiles';    // { list: [{id,name,pin}], active: id }
    var ASK_KEY      = 'pl_ask_on_start';
    var SCOPED_KEY   = 'pl_scoped_keys';

    var DEFAULT_SCOPED_KEYS = [
        'history', 'favorite', 'continued', 'view',
        'timetable', 'torrent_history', 'online_history', 'bookmarks'
    ];

    // ===================== ВСПОМОГАТЕЛЬНОЕ =====================

    function uid() {
        return 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    }

    function getData() {
        var d = Lampa.Storage.get(STORAGE_KEY, null);
        if (!d || !d.list || !d.list.length) {
            d = { list: [{ id: 'default', name: 'Основной', pin: '' }], active: 'default' };
            Lampa.Storage.set(STORAGE_KEY, d);
        }
        return d;
    }

    function saveData(d) {
        Lampa.Storage.set(STORAGE_KEY, d);
    }

    function getScopedKeys() {
        var raw = Lampa.Storage.get(SCOPED_KEY, DEFAULT_SCOPED_KEYS.join(','));
        return String(raw).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    }

    // ===================== ДАННЫЕ ПРОФИЛЯ (снэпшоты localStorage) =====================

    function snapshotSave(id) {
        var keys = getScopedKeys();
        var snap = {};
        keys.forEach(function (k) {
            var raw = localStorage.getItem(k);
            if (raw !== null) snap[k] = raw;
        });
        localStorage.setItem('pl_snap_' + id, JSON.stringify(snap));
    }

    function snapshotLoad(id) {
        var keys = getScopedKeys();
        keys.forEach(function (k) { localStorage.removeItem(k); });

        var raw = localStorage.getItem('pl_snap_' + id);
        if (!raw) return;
        try {
            var snap = JSON.parse(raw);
            Object.keys(snap).forEach(function (k) { localStorage.setItem(k, snap[k]); });
        } catch (e) {}
    }

    function switchProfile(id) {
        var data = getData();
        if (data.active === id) return;

        snapshotSave(data.active);
        data.active = id;
        saveData(data);
        snapshotLoad(id);

        location.reload();
    }

    // ===================== ЭКРАН ВЫБОРА ПРОФИЛЯ =====================

    function askPin(profile, onOk, onFail) {
        Lampa.Input.edit({
            title: 'PIN для профиля «' + profile.name + '»',
            value: '',
            free: true,
            nosave: true,
            nomic: true,
            password: true
        }, function (value) {
            var digits = String(value || '').replace(/\D/g, '');
            if (digits && digits === String(profile.pin)) onOk();
            else { Lampa.Noty.show('Неверный PIN'); onFail(); }
        });
    }

    function showProfileSelector() {
        var data = getData();

        var items = data.list.map(function (p) {
            return { title: p.name + (p.pin ? '  🔒' : ''), id: p.id };
        });

        Lampa.Select.show({
            title: 'Кто смотрит?',
            items: items,
            onSelect: function (item) {
                var profile = data.list.filter(function (p) { return p.id === item.id; })[0];
                if (!profile) return;

                function proceed() {
                    if (profile.id !== data.active) switchProfile(profile.id);
                }

                if (profile.pin) {
                    askPin(profile, proceed, showProfileSelector);
                } else {
                    proceed();
                }
            },
            onBack: showProfileSelector // обязательный экран — без выбора не выйти
        });
    }

    // ===================== УПРАВЛЕНИЕ ПРОФИЛЯМИ =====================

    function openProfilesManager() {
        var data = getData();
        var items = data.list.map(function (p) {
            return { title: p.name + (p.pin ? ' 🔒' : '') + (p.id === data.active ? ' (активен)' : ''), id: p.id };
        });
        items.push({ title: '+ Добавить профиль', id: '__add__' });

        Lampa.Select.show({
            title: 'Управление профилями',
            items: items,
            onSelect: function (item) {
                if (item.id === '__add__') addProfileDialog();
                else editProfileDialog(item.id);
            },
            onBack: function () {
                if (Lampa.Controller && Lampa.Controller.toggle) Lampa.Controller.toggle('settings');
            }
        });
    }

    function addProfileDialog() {
        Lampa.Input.edit({ title: 'Имя нового профиля', value: '', free: true, nosave: true, nomic: true }, function (name) {
            if (name) {
                var data = getData();
                data.list.push({ id: uid(), name: String(name), pin: '' });
                saveData(data);
            }
            openProfilesManager();
        });
    }

    function editProfileDialog(id) {
        var data = getData();
        var profile = data.list.filter(function (p) { return p.id === id; })[0];
        if (!profile) return openProfilesManager();

        var actions = [
            { title: 'Переименовать', id: 'rename' },
            { title: profile.pin ? 'Изменить PIN' : 'Задать PIN', id: 'pin' }
        ];
        if (profile.pin) actions.push({ title: 'Убрать PIN', id: 'unpin' });
        if (data.list.length > 1) actions.push({ title: 'Удалить профиль', id: 'delete' });
        actions.push({ title: 'Назад', id: 'back' });

        Lampa.Select.show({
            title: profile.name,
            items: actions,
            onSelect: function (action) {
                if (action.id === 'rename') {
                    Lampa.Input.edit({ title: 'Новое имя', value: profile.name, free: true, nosave: true, nomic: true }, function (v) {
                        if (v) { profile.name = String(v); saveData(data); }
                        openProfilesManager();
                    });
                } else if (action.id === 'pin') {
                    Lampa.Input.edit({ title: 'Новый PIN (только цифры)', value: '', free: true, nosave: true, nomic: true, password: true }, function (v) {
                        var digits = String(v || '').replace(/\D/g, '');
                        if (digits) { profile.pin = digits; saveData(data); }
                        openProfilesManager();
                    });
                } else if (action.id === 'unpin') {
                    profile.pin = '';
                    saveData(data);
                    openProfilesManager();
                } else if (action.id === 'delete') {
                    confirmDeleteProfile(id);
                } else {
                    openProfilesManager();
                }
            },
            onBack: openProfilesManager
        });
    }

    function confirmDeleteProfile(id) {
        Lampa.Select.show({
            title: 'Удалить профиль? Данные будут стёрты.',
            items: [{ title: 'Да, удалить', id: 'yes' }, { title: 'Отмена', id: 'no' }],
            onSelect: function (a) {
                if (a.id === 'yes') {
                    var data = getData();
                    data.list = data.list.filter(function (p) { return p.id !== id; });
                    if (data.active === id) data.active = data.list[0].id;
                    saveData(data);
                    localStorage.removeItem('pl_snap_' + id);
                }
                openProfilesManager();
            },
            onBack: openProfilesManager
        });
    }

    // ===================== ВКЛАДКА В НАСТРОЙКАХ =====================

    function initSettings() {
        Lampa.SettingsApi.addComponent({
            component: 'profile_lock',
            name: 'Профили',
            icon: '<svg height="20" viewBox="0 0 24 24" width="20" xmlns="http://www.w3.org/2000/svg"><path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5z" fill="#fff"/></svg>'
        });

        Lampa.SettingsApi.addParam({
            component: 'profile_lock',
            param: { name: 'pl_manage', type: 'button', default: '' },
            field: { name: 'Управление профилями', description: 'Добавление, переименование, PIN, удаление' },
            onRender: function (item) { item.on('hover:enter', openProfilesManager); }
        });

        Lampa.SettingsApi.addParam({
            component: 'profile_lock',
            param: { name: 'pl_switch_now', type: 'button', default: '' },
            field: { name: 'Сменить профиль сейчас', description: 'Открыть экран выбора профиля' },
            onRender: function (item) { item.on('hover:enter', showProfileSelector); }
        });

        Lampa.SettingsApi.addParam({
            component: 'profile_lock',
            param: { name: ASK_KEY, type: 'trigger', default: true },
            field: { name: 'Спрашивать профиль при запуске', description: 'Показывать экран выбора профиля при каждом открытии Lampa' }
        });

        Lampa.SettingsApi.addParam({
            component: 'profile_lock',
            param: { name: SCOPED_KEY, type: 'input', default: DEFAULT_SCOPED_KEYS.join(',') },
            field: { name: 'Разделяемые ключи данных', description: 'Через запятую: какие данные отделяются по профилям' }
        });
    }

    // ===================== СТАРТ =====================

    function startPlugin() {
        try {
            initSettings();

            var askOnStart = Lampa.Storage.get(ASK_KEY, true);
            if (askOnStart) {
                setTimeout(function () {
                    try { showProfileSelector(); }
                    catch (e) { console.error('profile-lock:', e); }
                }, 500);
            }
        } catch (e) {
            console.error('profile-lock init error:', e);
        }
    }

    try {
        if (window.appready) {
            startPlugin();
        } else {
            Lampa.Listener.follow('app', function (e) {
                if (e.type === 'ready') startPlugin();
            });
        }
    } catch (e) {
        console.error('profile-lock bootstrap error:', e);
    }

})();
