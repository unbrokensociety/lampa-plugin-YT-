(function () {
'use strict';
var CSS = [
'.player.netflix{background:#000;}',
'.player.netflix:not(.iptv) .player-info{',
' background:linear-gradient(to bottom,rgba(0,0,0,.82) 0%,rgba(0,0,0,.38) 48%,rgba(0,0,0,0) 100%);',
' left:0;top:0;right:0;width:100%;border-radius:0;',
'}',
'.player.netflix:not(.iptv) .player-info__body{padding:.8em 1.1em 0;}',
'.player.netflix:not(.iptv) .player-info__line{',
' margin:.4em 0 0;padding-left:0;display:flex;flex-direction:column;align-items:flex-start;',
'}',
'.player.netflix:not(.iptv) .player-info__name{',
' font-size:1.55em;font-weight:700;letter-spacing:.01em;line-height:1.25;',
' color:#fff;text-shadow:0 1px 4px rgba(0,0,0,.75);',
' max-width:80%;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;',
'}',
'.player.netflix:not(.iptv) .player-info__subtitle{',
' font-size:1em;font-weight:400;color:rgba(255,255,255,.75);',
' margin-top:.25em;text-shadow:0 1px 3px rgba(0,0,0,.6);',
' max-width:80%;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;',
'}',
'.player.netflix:not(.iptv) .player-info__values,',
'.player.netflix:not(.iptv) .player-info__time,',
'.player.netflix:not(.iptv) .player-info__values>div{display:none !important;}',
'.player.netflix:not(.iptv) .head-backward{display:block;margin:0;padding:0;position:relative;}',
'.player.netflix:not(.iptv) .head-backward__button{',
' position:static;top:auto;left:auto;display:flex;align-items:center;justify-content:center;',
' width:2.3em;height:2.3em;padding:0;margin:0;border-radius:50%;',
' background:rgba(0,0,0,.4);box-shadow:inset 0 0 0 .05em rgba(255,255,255,.18);',
' transition:background .2s ease;',
'}',
'.player.netflix:not(.iptv) .head-backward__button:hover,',
'.player.netflix:not(.iptv) .head-backward__button.focus{background:rgba(255,255,255,.25);}',
'.player.netflix:not(.iptv) .head-backward__title{display:none !important;}',
'.player.netflix:not(.iptv) .player-panel{',
' background:linear-gradient(to top,rgba(0,0,0,.88) 0%,rgba(0,0,0,.45) 45%,rgba(0,0,0,0) 100%);',
' left:0;right:0;bottom:0;width:100%;border-radius:0;',
'}',
'.player.netflix:not(.iptv) .player-panel__body{padding:1em 1.4em 1.5em;}',
'.player.netflix:not(.iptv) .player-panel__timeline{',
' display:block;height:.28em;background:rgba(255,255,255,.28);border-radius:99px;',
' margin:0 0 1.1em;transition:height .15s ease;',
'}',
'.player.netflix:not(.iptv) .player-panel__timeline:hover{height:.44em;}',
'.player.netflix:not(.iptv) .player-panel__timeline.focus{box-shadow:0 0 0 .06em rgba(229,9,20,.8);}',
'.player.netflix:not(.iptv) .player-panel__timeline:not(.focus) .player-panel__position>div::after{display:none;}',
'.player.netflix:not(.iptv) .player-panel__peding{background:rgba(255,255,255,.4);}',
'.player.netflix:not(.iptv) .player-panel__position{background:linear-gradient(90deg,#b20710,#e50914);}',
'.player.netflix:not(.iptv) .player-panel__position>div::after{',
' width:1em;height:1em;background:#fff;box-shadow:0 0 6px rgba(0,0,0,.6);',
'}',
'.player.netflix:not(.iptv) .player-panel__line-one{display:none !important;}',
'.player.netflix:not(.iptv) .player-panel__line-two{',
' position:relative;display:flex;align-items:center;justify-content:center;',
'}',
'.player.netflix:not(.iptv) .player-panel__left,',
'.player.netflix:not(.iptv) .player-panel__right{',
' position:absolute;top:50%;transform:translateY(-50%);width:auto;',
'}',
'.player.netflix:not(.iptv) .player-panel__left{display:none !important;}',
'.player.netflix:not(.iptv) .player-panel__right{right:.3em;justify-content:flex-end;}',
'.player.netflix:not(.iptv) .player-panel__center{',
' width:100%;display:flex !important;justify-content:center;align-items:center;',
'}',
'.player.netflix.tv .player-panel__timeline{display:block !important;}',
'.player.netflix.tv .player-panel__center{display:flex !important;}',
'.player.netflix.tv .player-panel__line-two{display:flex;}',
'.player.netflix.tv .player-panel__right{display:flex;}',
'.player.netflix:not(.iptv) .player-panel .button{',
' display:flex;align-items:center;justify-content:center;',
' width:2.2em;height:2.2em;padding:0;border-radius:50%;',
' background:transparent;color:rgba(255,255,255,.95);',
' transition:background .18s ease,transform .18s ease,color .18s ease;',
'}',
'.player.netflix:not(.iptv) .player-panel .button>svg{width:1.15em;height:1.15em;}',
'.player.netflix:not(.iptv) .player-panel .button+.button{margin-left:.35em;}',
'.player.netflix:not(.iptv) .player-panel .button:hover,',
'.player.netflix:not(.iptv) .player-panel .button.focus{',
' background:rgba(255,255,255,.22);color:#fff;transform:scale(1.08);',
'}',
'.player.netflix:not(.iptv) .player-panel__center .player-panel__prev,',
'.player.netflix:not(.iptv) .player-panel__center .player-panel__next{display:flex !important;}',
'.player.netflix:not(.iptv) .player-panel__tstart,',
'.player.netflix:not(.iptv) .player-panel__tend{display:none !important;}',
'.player.netflix:not(.iptv) .player-panel__playpause{',
' width:2.9em;height:2.9em;font-size:1.45em;margin:0 1.2em !important;',
' background:rgba(255,255,255,.1);',
'}',
'.player.netflix:not(.iptv) .player-panel__playpause:not(.focus){background:rgba(255,255,255,.1);}',
'.player.netflix:not(.iptv) .player-panel__playpause.focus,',
'.player.netflix:not(.iptv) .player-panel__playpause:hover{',
' background:#e50914 !important;color:#fff;transform:scale(1.1);',
' box-shadow:0 .3em 1.2em rgba(229,9,20,.55);',
'}',
'.player.netflix:not(.iptv) .player-panel__quality{',
' width:auto !important;padding:0 .9em !important;border-radius:99px !important;',
' background:rgba(255,255,255,.16);font-size:.85em;font-weight:600;letter-spacing:.05em;',
'}',
'.player.netflix:not(.iptv) .player-panel__quality.focus,',
'.player.netflix:not(.iptv) .player-panel__quality:hover{background:#e50914 !important;color:#fff;}',
'.player.netflix:not(.iptv) .player-video__paused{background:rgba(0,0,0,.5);}',
'body.true--mobile.orientation--portrait .player.netflix .player-panel__left,',
'body.true--mobile.orientation--portrait .player.netflix .player-panel__right{display:none !important;}'
].join('');
function startPlugin() {
$('<style type="text/css">' + CSS + '</style>').appendTo('body');
var render = Lampa.Player && Lampa.Player.render();
if (!render || !render.length) return;
var apply = function () {
var el = Lampa.Player.render();
if (el && el.length) el.addClass('netflix');
};
apply();
Lampa.Player.listener.follow('start', function (data) {
apply();
if (!data) return;
var line = render.find('.player-info__line');
var nameEl = line.find('.player-info__name');
var main = (data.card && (data.card.title || data.card.name)) || data.title;
if (nameEl.length) nameEl.text(main || '');
line.find('.player-info__subtitle').remove();
if (data.title && main && data.title !== main) {
$('<div class="player-info__subtitle"></div>')
.text(data.title)
.appendTo(line);
}
render.toggleClass('netflix--iptv', !!data.iptv);
});
}
if (!window.netflix_player_plugin) {
window.netflix_player_plugin = true;
if (window.appready) startPlugin();
else Lampa.Listener.follow('app', function (e) {
if (e && e.type == 'ready') startPlugin();
});
}
})();
