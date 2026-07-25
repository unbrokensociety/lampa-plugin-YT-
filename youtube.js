(function () {
    'use strict';

    // Плагин работает НАД штатной системой профилей Lampa (Lampa.Account.Profile),
    // той самой, что открывается по иконке профиля в шапке при включённом аккаунте (CUB).
    // Он не создаёт свои профили, а лишь:
    //   1) заставляет выбрать один из уже существующих профилей при каждом запуске;
    //   2) добавляет опциональный PIN на вход в конкретный профиль.

    if (window.plugin_profile_lock_ready) return;
    window.plugin_profile_lock_ready = true;

    var PIN_KEY = 'pl_pins';           // { [profileId]: '1234' }
    var ASK_KEY = 'pl_ask_on_start';   // bool

    // ===================== ХРАНЕНИЕ PIN =====================

    function getPins() {
        return Lampa.Storage.get(PIN_KEY, {});
    }

    function savePins(p) {
        Lampa.Storage.set(PIN_KEY, p);
    }

    // ===================== ПРОВЕРКА PIN =====================

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
            var pins = getPins();

            if (digits && digits === String(pins[profile.id])) {
                onOk();
            } else {
                Lampa.Noty.show('Неверный PIN');
                onFail();
            }
        });
    }

    // ===================== ЗАПУСК ВЫБОРА ПРОФИЛЯ =====================

    // ВАЖНО: своего затемняющего оверлея больше нет — Lampa.Account.Profile.select()
    // сам открывает полноэкранный список профилей, и наш div поверх него
    // просто закрашивал экран чёрным цветом, из-за чего ничего не было видно.

    var MAX_RETRIES = 15;

    /**
     * Открывает штатный выбор профиля Lampa.
     * blocking = true  -> нельзя закрыть без выбора (используется на старте приложения)
     * blocking = false -> обычное поведение (используется из настроек)
     */
    function runProfileFlow(blocking, onDone) {
        if (!Lampa.Account || !Lampa.Account.Permit || !Lampa.Account.Permit.access) {
            // нет аккаунта / профилей нет вообще — блокировать нечего
            if (onDone) onDone();
            return;
        }

        var picked = null;
        function onProfileSelect(e) { picked = e.profile; }
        Lampa.Listener.follow('profile_select', onProfileSelect);

        function finish() {
            Lampa.Listener.remove('profile_select', onProfileSelect);
            if (onDone) onDone();
        }

        function open(attempt) {
            attempt = attempt || 0;

            Lampa.Account.Profile.select(function () {
                if (picked) {
                    var profile = picked;
                    picked = null;

                    var pins = getPins();
                    if (pins[profile.id]) {
                        askPin(profile, finish, function () {
                            open(0); // неверный PIN — выбор заново
                        });
                    } else {
                        finish();
                    }
                } else if (blocking) {
                    // нажали "назад" / "добавить профиль" без выбора, либо не
                    // прогрузился список профилей (например, сеть ещё не готова) —
                    // пробуем снова, но не бесконечно, чтобы не заблокировать вход
                    // намертво при сбое сети
                    if (attempt >= MAX_RETRIES) {
                        Lampa.Noty.show('Не удалось открыть выбор профиля, вход разрешён');
                        finish();
                        return;
                    }
                    setTimeout(function () { open(attempt + 1); }, 400);
                } else {
                    finish();
                }
            });
        }

        open(0);
    }

    // ===================== НАСТРОЙКА PIN ДЛЯ ПРОФИЛЯ =====================

    function pickProfileForPin() {
        Lampa.Account.Api.load('profiles/all').then(function (result) {
            if (!result || !result.profiles || !result.profiles.length) {
                Lampa.Noty.show('Профили не найдены');
                return;
            }

            var pins = getPins();
            var items = result.profiles.map(function (p) {
                return { title: p.name + (pins[p.id] ? ' 🔒' : ''), id: p.id, profile: p };
            });

            Lampa.Select.show({
                title: 'Выберите профиль',
                items: items,
                onSelect: function (item) {
                    profilePinMenu(item.profile);
                },
                onBack: function () {
                    if (Lampa.Controller.toggle) Lampa.Controller.toggle('settings');
                }
            });
        }).catch(function () {
            Lampa.Noty.show('Не удалось получить список профилей');
        });
    }

    function profilePinMenu(profile) {
        var pins = getPins();
        var has = Boolean(pins[profile.id]);

        var actions = [
            { title: has ? 'Изменить PIN' : 'Задать PIN', id: 'set' }
        ];
        if (has) actions.push({ title: 'Убрать PIN', id: 'unset' });
        actions.push({ title: 'Назад', id: 'back' });

        Lampa.Select.show({
            title: profile.name,
            items: actions,
            onSelect: function (action) {
                if (action.id === 'set') {
                    Lampa.Input.edit({
                        title: 'Новый PIN (только цифры)',
                        value: '',
                        free: true,
                        nosave: true,
                        nomic: true,
                        password: true
                    }, function (value) {
                        var digits = String(value || '').replace(/\D/g, '');
                        if (digits) {
                            var p = getPins();
                            p[profile.id] = digits;
                            savePins(p);
                            Lampa.Noty.show('PIN сохранён');
                        }
                        pickProfileForPin();
                    });
                } else if (action.id === 'unset') {
                    var p = getPins();
                    delete p[profile.id];
                    savePins(p);
                    Lampa.Noty.show('PIN удалён');
                    pickProfileForPin();
                } else {
                    pickProfileForPin();
                }
            },
            onBack: function () { pickProfileForPin(); }
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
            param: { name: 'pl_set_pin', type: 'button', default: '' },
            field: { name: 'PIN-код для профиля', description: 'Задать, изменить или убрать PIN для конкретного профиля' },
            onRender: function (item) {
                item.on('hover:enter', pickProfileForPin);
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'profile_lock',
            param: { name: 'pl_switch_now', type: 'button', default: '' },
            field: { name: 'Сменить профиль сейчас', description: 'Открыть штатный выбор профиля' },
            onRender: function (item) {
                item.on('hover:enter', function () { runProfileFlow(false); });
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'profile_lock',
            param: { name: ASK_KEY, type: 'trigger', default: true },
            field: { name: 'Спрашивать профиль при запуске', description: 'Показывать обязательный выбор профиля при каждом открытии Lampa' }
        });
    }

    // ===================== СТАРТ =====================

    function startPlugin() {
        initSettings();

        var askOnStart = Lampa.Storage.get(ASK_KEY, true);
        if (!askOnStart) return;

        var started = false;
        function boot() {
            if (started) return;
            started = true;
            runProfileFlow(true);
        }

        // основной триггер: срабатывает штатно после того, как Lampa успешно
        // получила данные профиля с сервера (сеть уже точно готова)
        Lampa.Listener.follow('profile_check', boot);

        // подстраховка на случай, если 'profile_check' не придёт
        // (нет доступа к аккаунту, либо событие уже прошло раньше подписки)
        setTimeout(boot, 2500);
    }

    if (window.appready) {
        startPlugin();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') startPlugin();
        });
    }

})();
