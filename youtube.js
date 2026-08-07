(function () {
'use strict';
var CSS = [
'.player.netflix{background:#000;}',
'.player.netflix:not(.iptv) .player-info{',
'background:linear-gradient(to bottom,rgba(0,0,0,.85) 0%,rgba(0,0,0,.4) 45%,rgba(0,0,0,0) 100%);',
'left:0;top:0;right:0;width:100%;border-radius:0;',
'}',
'.player.netflix:not(.iptv) .player-info__body{padding:.7em 1.1em 0;}',
'.player.netflix:not(.iptv) .player-info__line{margin:.15em 0 0;padding-left:1.1em;display:flex;align-items:center;}',
'.player.netflix:not(.iptv) .player-info__name{',
' font-size:1.55em;font-weight:700;letter-spacing:.01em;line-height:1.25;',
' color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.6);',
' max-width:70%;',
' overflow:hidden;white-space:nowrap;text-overflow:ellipsis;',
'}',
'.player.netflix:not(.iptv) .player-info__values,',
'.player.netflix:not(.iptv) .player-info__time,',
'.player.netflix:not(.iptv) .player-info__values > div{display:none !important;}',
'.player.netflix:not(.iptv) .head-backward{display:block;margin:0;padding:0;position:relative;}',
'.player.netflix:not(.iptv) .head-backward__button{',
' position:static;top:auto;left:auto;display:flex;align-items:center;justify-content:center;',
' width:2.15em;height:2.15em;padding:0;margin:0;border-radius:50%;',
' background:rgba(0,0,0,.35);box-shadow:inset 0 0 0 .05em rgba(255,255,255,.22);',
'}',
'.player.netflix:not(.iptv) .head-backward__title{display:none !important;}',
'.player.netflix:not(.iptv) .player-panel{',
' background:linear-gradient(to top,rgba(0,0,0,.9) 0%,rgba(0,0,0,.5) 45%,rgba(0,0,0,0) 100%);',
' left:0;right:0;bottom:0;width:100%;border-radius:0;',
'}',
'.player.netflix:not(.iptv) .player-panel__body{padding:1em 1.3em 1.3em;}',
'.player.netflix:not(.iptv) .player-panel__timeline{',
' height:.24em;background:rgba(255,255,255,.22);border-radius:99px;',
' margin-bottom:.85em;transition:height .15s ease,box-shadow .15s ease;',
'}',
'.player.netflix:not(.iptv) .player-panel__timeline:hover{height:.42em;}',
'.player.netflix:not(.iptv) .player-panel__timeline.focus{box-shadow:0 0 0 .05em rgba(255,255,255,.6);}',
'.player.netflix:not(.iptv) .player-panel__timeline:not(.focus) .player-panel__position>div::after{display:none;}',
'.player.netflix:not(.iptv) .player-panel__peding{background:rgba(255,255,255,.25);}',
'.player.netflix:not(.iptv) .player-panel__position{',
' background:linear-gradient(90deg,#b20710 0%,#e50914 100%);',
'}',
'.player.netflix:not(.iptv) .player-panel__position>div::after{',
' width:.95em;height:.95em;background:#fff;box-shadow:0 0 5px rgba(0,0,0,.55);',
'}',
'.player.netflix:not(.iptv) .player-panel__line-one{margin-bottom:.85em;}',
'.player.netflix:not(.iptv) .player-panel__timenow,',
'.player.netflix:not(.iptv) .player-panel__timeend{',
' font-size:.92em;font-weight:500;color:rgba(255,255,255,.9);text-shadow:0 1px 2px #000;',
'}',
'.player.netflix:not(.iptv) .player-panel .button{',
' display:flex;align-items:center;justify-content:center;',
' width:2.15em;height:2.15em;padding:0;border-radius:50%;',
' background:rgba(255,255,255,.05);color:rgba(255,255,255,.94);',
' transition:background .2s ease,transform .2s ease,box-shadow .2s ease;',
'}',
'.player.netflix:not(.iptv) .player-panel .button>svg{width:1.15em;height:1.15em;}',
'.player.netflix:not(.iptv) .player-panel__left{width:auto;}',
'.player.netflix:not(.iptv) .player-panel__right{width:auto;}',
'.player.netflix:not(.iptv) .player-panel .button+.button{margin-left:.3em;}',
'.player.netflix:not(.iptv) .player-panel .button:hover,',
'.player.netflix:not(.iptv) .player-panel .button.focus{',
' background:rgba(255,255,255,.22);transform:scale(1.06);',
'}',
'.player.netflix:not(.iptv) .player-panel__playpause{',
' width:2.7em;height:2.7em;font-size:1.35em;margin:0 1.15em !important;',
' background:rgba(255,255,255,.09);',
'}',
'.player.netflix:not(.iptv) .player-panel__playpause:not(.focus){background:rgba(255,255,255,.09);}',
'.player.netflix:not(.iptv) .player-panel__playpause.focus,',
'.player.netflix:not(.iptv) .player-panel__playpause:hover{background:#e50914;color:#fff;transform:scale(1.08);}',
'.player.netflix:not(.iptv) .player-panel__center,.player.netflix:not(.iptv) .player-panel__left,.player.netflix:not(.iptv) .player-panel__right{align-items:center;}',
'.player.netflix:not(.iptv) .player-panel__quality{',
' width:auto !important;padding:0 .85em !important;border-radius:99px !important;',
' background:rgba(255,255,255,.14);font-size:.85em;font-weight:600;letter-spacing:.04em;',
'}',
'.player.netflix:not(.iptv) .player-panel__quality.focus,.player.netflix:not(.iptv) .player-panel__quality:hover{background:#e50914;color:#fff;}',
'.player.netflix:not(.iptv) .player-video__paused{background:rgba(0,0,0,.55);}'
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
var nameEl = render.find('.player-info__name');
if (nameEl.length && data && data.title) nameEl.text(data.title);
render.toggleClass('netflix--iptv', !!(data && data.iptv));
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
