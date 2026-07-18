(function () {
    'use strict';

    // ============================================================
    //  YOUTUBE PLAYER PLUS — стилизация встроенного плеера Lampa
    //  под интерфейс YouTube: прогресс-бар, громкость, кнопки.
    //  Работает на: Smart TV (пульт), ПК (мышь+клавиатура), Mobile (тач)
    // ============================================================

    function startPlugin() {

        // Изначально в базовом плагине плеер отключался на мобилках —
        // здесь убираем это ограничение, т.к. нам нужен тач-контроль.
        // Оставляем только проверку версии приложения (совместимость).
        if (Lampa.Manifest.app_digital > 328) return;

        var is_touch_device = ('ontouchstart' in window) || Lampa.Platform.screen('mobile');

        // ------------------------------------------------------
        // 1. БАЗОВЫЕ СТИЛИ (адаптированы из оригинального плагина)
        // ------------------------------------------------------
        $('body').append(
            '\n        <style>\n' +
            '        .player-video__overlay{display:none;background:linear-gradient(to bottom,rgba(0,0,0,0.5) 0,rgba(0,0,0,0.3) 53%,rgba(11,13,16,0.85) 100%);position:absolute;top:0;left:0;width:100%;height:100%}' +
            '.player:not(.iptv) .player-panel,.player:not(.iptv) .player-info,.player:not(.iptv) .player-footer{background:transparent !important;-webkit-backdrop-filter:unset !important;backdrop-filter:unset !important}' +
            '.player:not(.iptv) .player-panel__body,.player:not(.iptv) .player-info__body,.player:not(.iptv) .player-footer__body{padding:0}' +
            '.player:not(.iptv) .player-footer__row{padding:0}' +
            '.player:not(.iptv) .head-backward{display:none !important}' +
            '.player:not(.iptv) .player-info__body{padding-left:0 !important;position:relative}' +
            '.player:not(.iptv) .player-info__name{font-size:1.2em;text-shadow:0 0 .2em rgba(0,0,0,0.5)}' +
            '.player:not(.iptv) .player-info__title{font-size:2.4em;font-weight:600;line-height:1.4;width:60%;text-shadow:0 0 .2em rgba(0,0,0,0.5);overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}' +
            '.player:not(.iptv) .player-info__values{text-shadow:0 0 .2em rgba(0,0,0,0.5)}' +
            '.player:not(.iptv) .player-info__values .value--name span{font-weight:600}' +
            '.player:not(.iptv) .player-info__time{position:absolute;top:.8em;right:0}' +
            '.player:not(.iptv) .player-panel .button{padding:.9em;width:3em;height:3em;border-radius:50%;transition:transform .15s ease,background .15s ease}' +
            '.player:not(.iptv) .player-panel .button>svg{width:1.2em;height:1.2em}' +
            '.player:not(.iptv) .player-panel .button+.button{margin-left:0}' +
            '.player:not(.iptv) .player-panel__playpause{margin:0;padding:1em !important}' +
            '.player:not(.iptv) .player-panel__playpause:not(.focus){background:rgba(255,255,255,0.1)}' +
            '.player:not(.iptv) .player-panel__quality{border-radius:5em !important;padding:0 1em !important}' +
            '.player:not(.iptv) .player-panel__timeline{margin-bottom:1em}' +
            '.player:not(.iptv) .player-panel__line-one{margin-bottom:1em;position:relative;z-index:2;text-shadow:0 0 .2em rgba(0,0,0,0.5)}' +
            '.player:not(.iptv) .player-panel__box-buttons{flex-shrink:0;display:flex;align-items:center;background:rgba(255,255,255,0.1);border-radius:4em}' +
            '.player:not(.iptv) .player-panel__box-buttons+.player-panel__box-buttons{margin-left:.5em}' +
            '.player:not(.iptv) .player-panel__next,.player:not(.iptv) .player-panel__prev{padding:1.1em !important}' +
            '.player:not(.iptv) .player-panel__next>svg,.player:not(.iptv) .player-panel__prev>svg{width:.8em;height:.8em}' +
            '.player:not(.iptv) .player-panel__playlist{text-align:center}' +
            '.player:not(.iptv) .player-panel__playlist>svg{width:1em !important}' +
            '.player:not(.iptv) .player-video__paused,.player:not(.iptv) .player-video__loader{background-color:rgba(255,255,255,0.1)}' +
            '.player:not(.iptv) .player-info__values .value--size span{background:rgba(255,255,255,0.1);border-radius:1em}' +
            '.player:not(.iptv).player--panel-visible .player-video__overlay{display:block;animation:animation-opacity .3s}' +

            /* --------------------------------------------------
               2. ПРОГРЕСС-БАР В СТИЛЕ YOUTUBE — тонкий, красный,
               утолщается при наведении/фокусе, с "шариком"-ползунком
            -------------------------------------------------- */
            '.player:not(.iptv) .player-panel__timeline{height:4px !important;background:rgba(255,255,255,.25) !important;border-radius:3px !important;cursor:pointer;position:relative;transition:height .15s ease;touch-action:none}' +
            '.player:not(.iptv) .player-panel__timeline:hover,.player:not(.iptv) .player-panel__timeline.focus,.player:not(.iptv) .player-panel__timeline.player-panel__timeline--drag{height:7px !important}' +
            '.player:not(.iptv) .player-panel__position{background:#ff0000 !important;border-radius:3px !important;height:100% !important;position:relative}' +
            '.player:not(.iptv) .player-panel__position>div{background:transparent !important}' +
            '.player:not(.iptv) .player-panel__position::after{content:"";position:absolute;right:-6px;top:50%;width:13px;height:13px;border-radius:50%;background:#ff0000;box-shadow:0 0 4px rgba(0,0,0,.6);transform:translateY(-50%) scale(0);transition:transform .15s ease}' +
            '.player:not(.iptv) .player-panel__timeline:hover .player-panel__position::after,.player:not(.iptv) .player-panel__timeline.focus .player-panel__position::after,.player:not(.iptv) .player-panel__timeline--drag .player-panel__position::after{transform:translateY(-50%) scale(1)}' +

            /* --------------------------------------------------
               3. СЛАЙДЕР ГРОМКОСТИ (наш собственный компонент) —
               горизонтальная полоса рядом с кнопкой mute, как в YT
            -------------------------------------------------- */
            '.yt-volume{display:flex;align-items:center;height:3em;padding:0 .6em 0 .2em;flex-shrink:0}' +
            '.yt-volume__icon{width:3em;height:3em;display:flex;align-items:center;justify-content:center;border-radius:50%;flex-shrink:0;cursor:pointer;transition:background .15s ease,transform .15s ease}' +
            '.yt-volume__icon:hover,.yt-volume__icon.focus{background:rgba(255,255,255,.15)}' +
            '.yt-volume__icon.focus{transform:scale(1.08);outline:.15em solid rgba(255,255,255,.9);outline-offset:-.1em}' +
            '.yt-volume__icon svg{width:1.3em;height:1.3em}' +
            '.yt-volume__track-wrap{width:0;overflow:hidden;transition:width .2s ease;display:flex;align-items:center}' +
            '.yt-volume:hover .yt-volume__track-wrap,.yt-volume.yt-volume--active .yt-volume__track-wrap,.yt-volume__track-wrap.focus{width:6em}' +
            /* На ТВ громкость всегда видна (наведения мышью нет) */
            'body.platform--tv .yt-volume__track-wrap,body.platform--android .yt-volume__track-wrap{width:6em}' +
            '.yt-volume__track{position:relative;width:6em;height:4px;border-radius:3px;background:rgba(255,255,255,.25);cursor:pointer;touch-action:none}' +
            '.yt-volume__fill{position:absolute;left:0;top:0;height:100%;border-radius:3px;background:#fff}' +
            '.yt-volume__thumb{position:absolute;top:50%;width:12px;height:12px;border-radius:50%;background:#fff;box-shadow:0 0 4px rgba(0,0,0,.6);transform:translate(-50%,-50%) scale(0);transition:transform .15s ease}' +
            '.yt-volume__track:hover .yt-volume__thumb,.yt-volume__track.focus .yt-volume__thumb,.yt-volume__track--drag .yt-volume__thumb{transform:translate(-50%,-50%) scale(1)}' +
            '.yt-volume__tooltip{position:absolute;bottom:1.6em;left:50%;transform:translateX(-50%);background:rgba(11,13,16,.9);color:#fff;font-size:.85em;padding:.2em .6em;border-radius:.4em;opacity:0;pointer-events:none;transition:opacity .15s ease;white-space:nowrap}' +
            '.yt-volume__tooltip.show{opacity:1}' +

            /* --------------------------------------------------
               4. АДАПТАЦИЯ ПОД ТАЧ (мобильные) — крупнее кнопки/зоны нажатия
            -------------------------------------------------- */
            'body.platform--mobile .player:not(.iptv) .player-panel .button,body.platform--android.layer--touch .player:not(.iptv) .player-panel .button{width:3.6em;height:3.6em;padding:1em}' +
            'body.platform--mobile .player:not(.iptv) .player-panel__timeline,body.platform--android.layer--touch .player:not(.iptv) .player-panel__timeline{height:8px !important}' +
            'body.platform--mobile .yt-volume__track,body.platform--android.layer--touch .yt-volume__track{height:6px}' +
            'body.platform--mobile .yt-volume__track-wrap,body.platform--android.layer--touch .yt-volume__track-wrap{width:6em !important}' +

            /* --------------------------------------------------
               5. ЧЁТКИЙ ФОКУС ДЛЯ ТВ (пульт) — outline + масштаб
            -------------------------------------------------- */
            '.player:not(.iptv) .player-panel .button.focus{outline:.15em solid #fff;outline-offset:-.1em;transform:scale(1.08);background:rgba(255,255,255,.18)}' +
            '.player:not(.iptv) .player-panel__timeline.focus{box-shadow:0 0 0 .12em rgba(255,255,255,.6)}' +

            '.normalization{background:rgba(255,255,255,0.1);border-radius:1em}' +
            '.normalization canvas{border-radius:1em}' +
            'body.platform--browser .player:not(.iptv) .player-panel__box-buttons,body.platform--browser .player:not(.iptv) .player-panel__playpause:not(.focus),body.platform--browser .player:not(.iptv) .player-info__values .value--size span,body.platform--nw .player:not(.iptv) .player-panel__box-buttons,body.platform--nw .player:not(.iptv) .player-panel__playpause:not(.focus),body.platform--nw .player:not(.iptv) .player-info__values .value--size span{backdrop-filter:blur(1em);-webkit-backdrop-filter:blur(1em)}' +
            'body.platform--browser .normalization,body.platform--browser .player-video__paused,body.platform--browser .player-video__loader,body.platform--nw .normalization,body.platform--nw .player-video__paused,body.platform--nw .player-video__loader{background-color:rgba(255,255,255,0.1);backdrop-filter:blur(1em);-webkit-backdrop-filter:blur(1em)}' +
            '</style>\n    '
        );

        // ------------------------------------------------------
        //  РАЗМЕТКА (перестановка элементов, как в оригинале)
        // ------------------------------------------------------
        var render = Lampa.Player.render();
        var title = $('<div class="player-info__title"></div>');
        var value = $('<div class="value--name"><span></span></div>');

        render.find('.player-video__display').after($('<div class="player-video__overlay"></div>'));
        render.find('.player-panel__center').find('.button:not(.player-panel__playpause)').remove();
        render.find('.player-panel__timeline').before(render.find('.player-panel__line-one'));
        render.find('.player-info .player-info__line').before(title);
        render.find('.value--size').after(value);

        var box = $('<div class="player-panel__box-buttons"></div>');
        var right_panel = render.find('.player-panel__right');
        var left_panel = render.find('.player-panel__left');

        var right_box_quality = box.clone();
        var right_box_main = box.clone();
        var right_box_audio = box.clone();
        var left_box_main = box.clone();

        right_panel.append(right_box_audio);
        right_panel.append(right_box_quality);
        right_panel.append(right_box_main);

        right_box_main.append(right_panel.find('.button'));
        right_box_quality.append(right_panel.find('.player-panel__quality'));
        right_box_audio.append(right_panel.find('.player-panel__flow'));
        right_box_audio.append(right_panel.find('.player-panel__subs'));
        right_box_audio.append(right_panel.find('.player-panel__tracks'));

        left_panel.prepend(left_box_main);
        left_box_main.append(left_panel.find('.button'));

        Lampa.Player.listener.follow('start', function (data) {
            var name = data.title;
            var head = '';

            if (!data.iptv) {
                if (data.card) head = data.card.title || data.card.name;
                else if (Lampa.Activity.active().movie) head = Lampa.Activity.active().movie.title || Lampa.Activity.active().movie.name;
            }
            if (!head) head = name;

            title.text(head).toggleClass('hide', Boolean(data.iptv));
            render.find('.player-info__name').toggleClass('hide', true);
            value.toggleClass('hide', Boolean(name == head)).find('span').text(name);
        });

        // ============================================================
        //  6. КАСТОМНЫЙ СЛАЙДЕР ГРОМКОСТИ (YouTube-style)
        //  Своя реализация, т.к. штатный UI громкости Lampa неудобен
        //  для мыши/тача и по-разному ведёт себя на разных сборках.
        // ============================================================

        // SVG-иконки динамика (обычный / приглушённый)
        var icon_volume_high = '<svg viewBox="0 0 24 24" fill="none"><path d="M3 10v4h4l5 5V5L7 10H3z" fill="#fff"/><path d="M16.5 12a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z" fill="#fff"/><path d="M14 3.2v2.06c3.39 1 5.5 4.16 5.5 6.74s-2.11 5.74-5.5 6.74v2.06c4.5-1.03 7.5-4.9 7.5-8.8s-3-7.77-7.5-8.8z" fill="#fff"/></svg>';
        var icon_volume_mute = '<svg viewBox="0 0 24 24" fill="none"><path d="M3 10v4h4l5 5V5L7 10H3z" fill="#fff"/><path d="M19 8.5l-1.4-1.4-2.6 2.6-2.6-2.6L11 8.5l2.6 2.6L11 13.7l1.4 1.4 2.6-2.6 2.6 2.6 1.4-1.4-2.6-2.6L19 8.5z" fill="#fff"/></svg>';

        function getVideoEl() {
            var v = render.find('video')[0];
            return v || null;
        }

        // Получить/установить громкость — пробуем через API Lampa.Player,
        // если недоступно — работаем напрямую с <video>
        function getVolume() {
            try {
                if (Lampa.Player.volume) return Lampa.Player.volume();
            } catch (e) {}
            var v = getVideoEl();
            return v ? v.volume : 1;
        }

        function setVolume(val) {
            val = Math.max(0, Math.min(1, val));
            try {
                if (Lampa.Player.volume) {
                    Lampa.Player.volume(val);
                    return val;
                }
            } catch (e) {}
            var v = getVideoEl();
            if (v) v.volume = val;
            return val;
        }

        // Собираем разметку слайдера
        var volume_wrap = $('<div class="yt-volume"></div>');
        var volume_icon = $('<div class="yt-volume__icon selector"></div>').html(icon_volume_high);
        var volume_track_wrap = $('<div class="yt-volume__track-wrap"></div>');
        var volume_track = $('<div class="yt-volume__track selector"></div>');
        var volume_fill = $('<div class="yt-volume__fill"></div>');
        var volume_thumb = $('<div class="yt-volume__thumb"></div>');
        var volume_tooltip = $('<div class="yt-volume__tooltip"></div>');

        volume_track.append(volume_fill).append(volume_thumb).append(volume_tooltip);
        volume_track_wrap.append(volume_track);
        volume_wrap.append(volume_icon).append(volume_track_wrap);

        // Ставим слайдер громкости в левый блок кнопок, сразу после play/pause
        left_box_main.append(volume_wrap);

        var last_volume = 1; // для восстановления после mute
        var muted = false;

        function renderVolume(val, showTooltip) {
            var percent = Math.round(val * 100);
            volume_fill.css('width', percent + '%');
            volume_thumb.css('left', percent + '%');
            volume_tooltip.text(percent + '%');

            if (showTooltip) {
                volume_tooltip.addClass('show');
                clearTimeout(renderVolume._t);
                renderVolume._t = setTimeout(function () {
                    volume_tooltip.removeClass('show');
                }, 900);
            }

            muted = val <= 0;
            volume_icon.html(muted ? icon_volume_mute : icon_volume_high);
        }

        function applyVolume(val, showTooltip) {
            val = setVolume(val);
            if (val > 0) last_volume = val;
            renderVolume(val, showTooltip);
        }

        // Инициализация текущим значением громкости
        applyVolume(getVolume(), false);

        // Клик по иконке — mute/unmute (работает и мышью, и тачем, и OK на пульте)
        volume_icon.on('click', function () {
            if (muted) applyVolume(last_volume, true);
            else applyVolume(0, true);
        });

        // ---------- Расчёт значения по координате клика/тача ----------
        function calcValueFromEvent(e, track) {
            var rect = track.getBoundingClientRect();
            var clientX = (e.touches && e.touches.length) ? e.touches[0].clientX : e.clientX;
            var ratio = (clientX - rect.left) / rect.width;
            return Math.max(0, Math.min(1, ratio));
        }

        // ---------- Мышь (ПК) ----------
        var dragging_volume = false;

        volume_track.on('mousedown', function (e) {
            dragging_volume = true;
            volume_track.addClass('yt-volume__track--drag');
            applyVolume(calcValueFromEvent(e, volume_track[0]), true);
            e.preventDefault();
        });

        $(document).on('mousemove.ytvolume', function (e) {
            if (!dragging_volume) return;
            applyVolume(calcValueFromEvent(e, volume_track[0]), true);
        });

        $(document).on('mouseup.ytvolume', function () {
            if (!dragging_volume) return;
            dragging_volume = false;
            volume_track.removeClass('yt-volume__track--drag');
        });

        // ---------- Тач (мобильные) ----------
        volume_track[0].addEventListener('touchstart', function (e) {
            dragging_volume = true;
            volume_track.addClass('yt-volume__track--drag');
            applyVolume(calcValueFromEvent(e, volume_track[0]), true);
        }, { passive: true });

        volume_track[0].addEventListener('touchmove', function (e) {
            if (!dragging_volume) return;
            applyVolume(calcValueFromEvent(e, volume_track[0]), true);
        }, { passive: true });

        volume_track[0].addEventListener('touchend', function () {
            dragging_volume = false;
            volume_track.removeClass('yt-volume__track--drag');
        });

        // ---------- Пульт ТВ: стрелки Вверх/Вниз меняют громкость,
        // когда в фокусе иконка или сам трек громкости ----------
        var VOLUME_STEP = 0.05;

        $(document).on('keydown.ytvolume', function (e) {
            var focused_on_volume = volume_icon.hasClass('focus') || volume_track.hasClass('focus') || volume_wrap.hasClass('hover');
            if (!focused_on_volume) return;

            // 38 = ArrowUp, 40 = ArrowDown
            if (e.keyCode === 38 || e.keyCode === 40) {
                var current = getVolume();
                var next = e.keyCode === 38 ? current + VOLUME_STEP : current - VOLUME_STEP;
                applyVolume(next, true);
                e.preventDefault();
                e.stopPropagation();
            }
        });

        // Наведение мышью — раскрываем полосу громкости (десктоп)
        volume_wrap.on('mouseenter', function () {
            volume_wrap.addClass('yt-volume--active');
        }).on('mouseleave', function () {
            if (!dragging_volume) volume_wrap.removeClass('yt-volume--active');
        });

        // ------------------------------------------------------
        //  7. Очистка обработчиков при уничтожении плеера,
        //  чтобы не плодить дубликаты слушателей document
        // ------------------------------------------------------
        Lampa.Player.listener.follow('destroy', function () {
            $(document).off('mousemove.ytvolume mouseup.ytvolume keydown.ytvolume');
        });
    }

    if (!window.youtube_player_plugin) {
        window.youtube_player_plugin = true;

        if (window.appready) startPlugin();
        else {
            Lampa.Listener.follow('app', function (e) {
                if (e.type == 'ready') startPlugin();
            });
        }
    }

})();
