/*!
 * Skip Intro/Outro для Lampa — v3.0 (переписан с нуля)
 *
 * Принципиальное отличие: НЕ зависит от событий плеера — сам находит
 * <video> на странице и включается. События используются только для
 * получения метаданных (название, ID, сезон, эпизод).
 *
 * Источники данных: TheIntroDB, IntroDB, IntroHater + анализ субтитров
 * (паузы, ключевые слова, музыкальные реплики) + анализ звука.
 * Сериалы и фильмы.
 *
 * Проверка, что плагин загрузился: в консоли window.__skipIntroVersion → "3.0"
 * Отладка: в консоли доступен объект __skipIntro (например __skipIntro.segs)
 */
(function () {
  'use strict';

  if (window.__skipIntroLoaded) return;
  window.__skipIntroLoaded = true;
  window.__skipIntroVersion = '3.0';

  /* ============================ утилиты ============================ */

  function log() {
    try {
      var a = [].slice.call(arguments);
      a.unshift('[SkipIntro]');
      console.log.apply(console, a);
    } catch (e) {}
  }
  function has(a, v) { for (var i = 0; i < a.length; i++) if (a[i] === v) return true; return false; }
  function num(v) { if (v == null) return null; var n = parseInt(v, 10); return isNaN(n) ? null : n; }
  function rnd(v) { return Math.max(0, Math.round(v)); }

  var LABELS = {
    intro: 'Пропустить заставку',
    recap: 'Пропустить рекап',
    credits: 'Пропустить титры',
    preview: 'Пропустить превью'
  };
  var TYPES = ['intro', 'recap', 'credits', 'preview'];

  var KW = {
    recap: ['previously on', 'previously in', 'last time on', 'last episode', 'recap',
      'ранее в сериале', 'ранее в', 'в прошлой серии', 'в предыдущей серии', 'в прошлых сериях'],
    intro: ['intro', 'opening credits', 'main title', 'main titles', 'title sequence',
      'theme song', 'theme music', 'opening theme', 'заставка', 'начальные титры'],
    credits: ['directed by', 'режиссёр', 'режиссер', 'end credits', 'closing credits',
      'the end', 'конец фильма', 'заключительные титры']
  };

  /* ============================ настройки ============================ */

  var S = {
    keyMap: {
      enter: [13], space: [32], back: [8, 27, 10009, 461, 4],
      red: [403], green: [404], yellow: [405], blue: [406]
    },

    init: function () {
      try {
        Lampa.SettingsApi.addComponent({
          component: 'skip_intro',
          name: 'Пропуск заставок',
          icon: '<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line></svg>'
        });
      } catch (e) { log('addComponent:', e); }

      function p(o) { try { Lampa.SettingsApi.addParam(o); } catch (e) { log('addParam:', o.param && o.param.name, e); } }

      p({ component: 'skip_intro', param: { name: 'skip_intro_enabled', type: 'trigger', default: true },
        field: { name: 'Включить плагин', description: 'Показывать кнопку пропуска заставок и титров' } });

      p({ component: 'skip_intro', param: { name: 'skip_intro_test', type: 'trigger', default: false },
        field: { name: 'Тестовый режим', description: 'Кнопка появляется в начале ЛЮБОГО видео (проверка работы плагина)' } });

      p({ component: 'skip_intro', param: { name: 'skip_intro_auto', type: 'trigger', default: false },
        field: { name: 'Всегда автопропуск', description: 'Всегда перематывать без кнопки' } });

      p({ component: 'skip_intro', param: { name: 'skip_intro_detect', type: 'trigger', default: true },
        field: { name: 'Умное обнаружение', description: 'Определять заставку по субтитрам и звуку, если нет данных в базах' } });

      p({ component: 'skip_intro', param: { name: 'skip_intro_movies', type: 'trigger', default: true },
        field: { name: 'Работать с фильмами', description: 'Искать заставку в начале и титры в конце фильмов' } });

      p({ component: 'skip_intro', param: { name: 'skip_intro_type_intro', type: 'trigger', default: true },
        field: { name: 'Пропускать заставку (intro)' } });
      p({ component: 'skip_intro', param: { name: 'skip_intro_type_recap', type: 'trigger', default: true },
        field: { name: 'Пропускать рекап (recap)' } });
      p({ component: 'skip_intro', param: { name: 'skip_intro_type_credits', type: 'trigger', default: true },
        field: { name: 'Пропускать титры (credits)' } });
      p({ component: 'skip_intro', param: { name: 'skip_intro_type_preview', type: 'trigger', default: false },
        field: { name: 'Пропускать превью (preview)' } });

      p({ component: 'skip_intro',
        param: { name: 'skip_intro_key_skip', type: 'select', default: 'enter',
          values: { enter: 'Enter / OK', space: 'Пробел', red: 'Красная (403)', green: 'Зелёная (404)', yellow: 'Жёлтая (405)', blue: 'Синяя (406)' } },
        field: { name: 'Кнопка «Пропустить»', description: 'Какая кнопка на пульте пропускает сегмент' } });

      p({ component: 'skip_intro',
        param: { name: 'skip_intro_key_cancel', type: 'select', default: 'back',
          values: { back: 'Назад (Back)', red: 'Красная (403)', green: 'Зелёная (404)', yellow: 'Жёлтая (405)', blue: 'Синяя (406)' } },
        field: { name: 'Кнопка «Отменить»', description: 'Какая кнопка отменяет автопропуск' } });
    },

    f: function (name, def) {
      try { var v = Lampa.Storage.field(name); return (v === undefined || v === null) ? def : v; }
      catch (e) { return def; }
    },
    enabled: function () { return this.f('skip_intro_enabled', true) !== false; },
    test: function () { return this.f('skip_intro_test', false) === true; },
    auto: function () { return this.f('skip_intro_auto', false) === true; },
    detect: function () { return this.f('skip_intro_detect', true) !== false; },
    movies: function () { return this.f('skip_intro_movies', true) !== false; },
    typeOn: function (t) { return this.f('skip_intro_type_' + t, true) !== false; },
    skipKeys: function () { var k = this.f('skip_intro_key_skip', 'enter'); return this.keyMap[k] || this.keyMap.enter; },
    cancelKeys: function () { var k = this.f('skip_intro_key_cancel', 'back'); return this.keyMap[k] || this.keyMap.back; }
  };

  /* ================= Smart Skip (я это уже пропускал) ================= */

  var Smart = {
    all: function () {
      try { var r = Lampa.Storage.get('skip_intro_smart', '{}'); return typeof r === 'string' ? JSON.parse(r) : (r || {}); }
      catch (e) { return {}; }
    },
    save: function (o) { try { Lampa.Storage.set('skip_intro_smart', JSON.stringify(o)); } catch (e) {} },
    has: function (k, t) { return k ? this.all()[k + '|' + t] === true : false; },
    set: function (k, t, v) {
      if (!k) return;
      var o = this.all();
      if (v) o[k + '|' + t] = true; else delete o[k + '|' + t];
      this.save(o);
    }
  };

  /* ================ кэш ответов баз (localStorage, 7 дней) ================ */

  var Cache = {
    ttl: 7 * 24 * 3600 * 1000,
    id: function (m) {
      var base = m.tmdbId != null ? 'tmdb' + m.tmdbId : (m.imdbId ? 'imdb' + m.imdbId : null);
      if (!base) return null;
      return base + (m.isMovie ? '|mv' : '|s' + m.season + 'e' + m.episode);
    },
    get: function (m) {
      var k = this.id(m); if (!k) return null;
      try {
        var raw = localStorage.getItem('skipintro3_' + k);
        /* переиспользуем кэш старой рабочей версии v1 */
        if (!raw && m.tmdbId != null && !m.isMovie && m.season != null) {
          raw = localStorage.getItem('skip_' + m.tmdbId + '_s' + m.season + '_e' + m.episode);
        }
        if (!raw) return null;
        var r = JSON.parse(raw);
        if (!r || !r._ts || Date.now() - r._ts > this.ttl) { localStorage.removeItem('skipintro3_' + k); return null; }
        return r.segments || [];
      } catch (e) { return null; }
    },
    set: function (m, segs) {
      var k = this.id(m); if (!k) return;
      try { localStorage.setItem('skipintro3_' + k, JSON.stringify({ segments: segs, _ts: Date.now() })); } catch (e) {}
    }
  };

  /* ============ кэш результатов детекции (Lampa.Storage, 30 дней) ============ */

  var DC = {
    all: function () {
      try { var r = Lampa.Storage.get('skip_intro_detected', '{}'); return typeof r === 'string' ? JSON.parse(r) : (r || {}); }
      catch (e) { return {}; }
    },
    save: function (o) { try { Lampa.Storage.set('skip_intro_detected', JSON.stringify(o)); } catch (e) {} },
    key: function (m) {
      if (!m || m.tmdbId == null) return null;
      return m.isMovie ? m.tmdbId + '_mv' : m.tmdbId + '_s' + m.season + '_e' + m.episode;
    },
    legacy: function (m) { return m.tmdbId + '_s' + m.season + '_e' + m.episode; },
    get: function (m) {
      var k = this.key(m); if (!k) return null;
      var o = this.all();
      var lg = (!m.isMovie && m.season != null) ? this.legacy(m) : null;
      var r = o[k] || (lg ? o[lg] : null);
      if (!r) return null;
      if (!r._ts || Date.now() - r._ts > 30 * 24 * 3600 * 1000) {
        delete o[k]; if (lg) delete o[lg]; this.save(o);
        return null;
      }
      return r.segments || null;
    },
    set: function (m, segs) {
      var k = this.key(m); if (!k || !segs || !segs.length) return;
      var o = this.all(); o[k] = { segments: segs, _ts: Date.now() }; this.save(o);
    }
  };

  /* ============================ сеть (10с + 2 повтора) ============================ */

  var Net = {
    delay: function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); },
    once: function (url) {
      return new Promise(function (resolve, reject) {
        var done = false, xhr = new XMLHttpRequest();
        var t = setTimeout(function () {
          done = true;
          try { xhr.abort(); } catch (e) {}
          reject(new Error('timeout'));
        }, 10000);
        xhr.open('GET', url, true);
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.onreadystatechange = function () {
          if (xhr.readyState !== 4 || done) return;
          clearTimeout(t);
          if (xhr.status >= 200 && xhr.status < 300) {
            try { resolve(JSON.parse(xhr.responseText)); } catch (e) { reject(e); }
          } else if (xhr.status === 204 || xhr.status === 404) {
            resolve(null); /* данных нет — не ошибка */
          } else {
            reject(new Error('HTTP ' + xhr.status));
          }
        };
        xhr.onerror = function () { clearTimeout(t); reject(new Error('network')); };
        xhr.send();
      });
    },
    get: function (url) {
      var self = this;
      function go(left, d) {
        return self.once(url).catch(function (e) {
          var m = e && e.message || '';
          if (left > 0 && (m === 'network' || m === 'timeout' || /^HTTP 5/.test(m))) {
            return self.delay(d).then(function () { return go(left - 1, d * 2); });
          }
          throw e;
        });
      }
      return go(2, 700);
    }
  };

  /* ============================ базы сегментов ============================ */

  var Sources = {
    theintrodb: function (m) {
      var u = 'https://api.theintrodb.org/v2/media?tmdb_id=' + m.tmdbId;
      if (!m.isMovie) u += '&season=' + m.season + '&episode=' + m.episode;
      return Net.get(u).then(function (j) {
        var s = [];
        if (j) {
          for (var i = 0; i < TYPES.length; i++) {
            var list = j[TYPES[i]];
            if (Array.isArray(list)) {
              for (var q = 0; q < list.length; q++) {
                var it = list[q]; if (!it) continue;
                var a = it.start_ms != null ? it.start_ms / 1000 : it.start;
                var b = it.end_ms != null ? it.end_ms / 1000 : it.end;
                if (b > a) s.push({ type: TYPES[i], start: a, end: b, confidence: 'high', source: 'theintrodb' });
              }
            }
          }
        }
        return s;
      });
    },

    introdbapp: function (m) {
      var id = m.imdbId ? 'imdb=' + encodeURIComponent(m.imdbId) : 'tmdb=' + m.tmdbId;
      var a = 'https://api.introdb.app/get_intros?' + id;
      var b = 'https://api.introdb.app/get_credits?' + id;
      if (!m.isMovie) {
        a += '&season=' + m.season + '&episode=' + m.episode;
        b += '&season=' + m.season + '&episode=' + m.episode;
      }
      return Promise.all([
        Net.get(a).catch(function () { return null; }),
        Net.get(b).catch(function () { return null; })
      ]).then(function (r) {
        var s = [];
        if (r[0] && r[0].start != null && r[0].end != null && r[0].end > r[0].start) {
          s.push({ type: 'intro', start: r[0].start, end: r[0].end, confidence: 'high', source: 'introdb' });
        }
        if (r[1] && r[1].start != null && r[1].end != null && r[1].end > r[1].start) {
          s.push({ type: 'credits', start: r[1].start, end: r[1].end, confidence: 'high', source: 'introdb' });
        }
        return s;
      });
    },

    introhater: function (m) {
      if (!m.imdbId) return Promise.resolve([]);
      var p = m.isMovie ? m.imdbId : (m.imdbId + ':' + m.season + ':' + m.episode);
      return Net.get('https://introhater.com/api/segments/' + encodeURIComponent(p)).then(function (j) {
        var s = [];
        if (Array.isArray(j)) {
          for (var i = 0; i < j.length; i++) {
            var it = j[i];
            if (!it || it.start == null || it.end == null || it.end <= it.start) continue;
            var t = 'intro', l = (it.label || '').toLowerCase();
            if (l.indexOf('credit') !== -1 || l === 'ed') t = 'credits';
            else if (l.indexOf('recap') !== -1) t = 'recap';
            else if (l.indexOf('preview') !== -1) t = 'preview';
            s.push({ type: t, start: it.start, end: it.end, confidence: 'high', source: 'introhater' });
          }
        }
        return s;
      });
    },

    load: function (meta) {
      var cached = Cache.get(meta);
      if (cached) { log('сегменты из кэша:', cached.length); return Promise.resolve(cached); }

      var canSeries = meta.season != null && meta.episode != null;
      if (!(meta.isMovie || canSeries)) return Promise.resolve([]);

      var fns = [];
      if (meta.tmdbId != null) fns.push(this.theintrodb);
      if (meta.tmdbId != null || meta.imdbId) fns.push(this.introdbapp);
      if (meta.imdbId) fns.push(this.introhater);
      if (!fns.length) return Promise.resolve([]);

      var ok = false;
      function run(i) {
        if (i >= fns.length) return Promise.resolve([]);
        return fns[i](meta).then(
          function (s) { ok = true; return (s && s.length) ? s : run(i + 1); },
          function () { return run(i + 1); }
        );
      }
      return run(0).then(function (s) {
        if (ok) Cache.set(meta, s || []);
        log('из баз сегментов:', (s || []).length);
        return s || [];
      });
    }
  };

  /* ============================ анализ субтитров ============================ */

  var Subs = {
    fromVideo: function (video, extra) {
      var self = this;
      return new Promise(function (resolve) {
        try {
          var lists = [];
          if (extra && extra.length) lists.push(extra);
          if (video) {
            if (video.customSubs) lists.push(video.customSubs);
            if (video.subtitles) lists.push(video.subtitles);
            if (video.subtitle) lists.push(video.subtitle);
          }
          var url = null;
          outer:
          for (var i = 0; i < lists.length; i++) {
            var a = lists[i]; if (!a) continue;
            if (!Array.isArray(a)) a = [a];
            for (var j = 0; j < a.length; j++) {
              if (a[j] && a[j].url) { url = a[j].url; break outer; }
            }
          }
          if (url) {
            self.load(url, function (txt) { resolve(txt ? self.parse(txt) : null); });
            return;
          }
          if (video && video.textTracks) {
            for (var t = 0; t < video.textTracks.length; t++) {
              var cues = video.textTracks[t] && video.textTracks[t].cues;
              if (cues && cues.length > 4) { resolve(self.fromCues(cues)); return; }
            }
          }
          resolve(null);
        } catch (e) { log('Subs.fromVideo:', e); resolve(null); }
      });
    },

    load: function (url, cb) {
      try {
        var x = new XMLHttpRequest();
        x.open('GET', url, true);
        x.timeout = 12000;
        x.onload = function () { cb(x.status >= 200 && x.status < 300 ? x.responseText : null); };
        x.onerror = function () { cb(null); };
        x.ontimeout = function () { cb(null); };
        x.send();
      } catch (e) { cb(null); }
    },

    fromCues: function (cl) {
      var out = [];
      for (var i = 0; i < cl.length; i++) {
        var c = cl[i];
        if (c && c.startTime != null && c.endTime != null && c.endTime > c.startTime) {
          out.push({ start: c.startTime, end: c.endTime, text: c.text != null ? String(c.text) : '' });
        }
      }
      return out.length ? out : null;
    },

    time: function (s) {
      var m = String(s).trim().match(/(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{1,3})/);
      if (!m) return 0;
      return (m[1] ? parseInt(m[1], 10) : 0) * 3600 + parseInt(m[2], 10) * 60 +
        parseInt(m[3], 10) + parseInt((m[4] + '00').slice(0, 3), 10) / 1000;
    },

    /* SRT и WebVTT */
    parse: function (txt) {
      try {
        txt = String(txt).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        var blocks = txt.split(/\n\n+/);
        var cues = [];
        var re = /(?:\d{1,2}:)?\d{1,2}:\d{2}[.,]\d{1,3}\s*-->\s*(?:\d{1,2}:)?\d{1,2}:\d{2}[.,]\d{1,3}/;
        for (var i = 0; i < blocks.length; i++) {
          var lines = blocks[i].split('\n');
          for (var j = 0; j < lines.length; j++) {
            if (re.test(lines[j])) {
              var p = lines[j].split('-->');
              var a = this.time(p[0]), b = this.time(p[1]);
              var t = lines.slice(j + 1).join(' ')
                .replace(/<[^>]+>/g, ' ').replace(/\{[^}]+\}/g, ' ').replace(/\s+/g, ' ').trim();
              if (b > a) cues.push({ start: a, end: b, text: t });
              break;
            }
          }
        }
        log('субтитры загружены, реплик:', cues.length);
        return cues.length >= 5 ? cues : null;
      } catch (e) { log('Subs.parse:', e); return null; }
    },

    analyze: function (cues, dur, isMovie) {
      cues.sort(function (a, b) { return a.start - b.start; });
      var segs = [];
      var kw = this.kw(cues, dur);

      /* заставка = большой пробел между репликами в начале */
      var intro = null, best = 0, maxGap = isMovie ? 210 : 150;
      if (cues[0].start >= 15 && cues[0].start <= maxGap) {
        best = cues[0].start;
        intro = { type: 'intro', start: 0, end: cues[0].start, confidence: 'medium', source: 'subs' };
      }
      var lim = isMovie ? Math.min(360, Math.max(60, (dur || 0) * 0.2)) : 360;
      for (var i = 0; i < cues.length - 1; i++) {
        if (cues[i].end > lim) break;
        var g = cues[i + 1].start - cues[i].end;
        if (g >= 15 && g <= maxGap && g > best) {
          best = g;
          intro = { type: 'intro', start: cues[i].end, end: cues[i + 1].start, confidence: 'medium', source: 'subs' };
        }
      }

      /* заставка = музыкальные реплики (♪ ... ♪) */
      var mus = this.music(cues);

      /* подтверждение ключевыми словами */
      if (intro && kw.intro != null && kw.intro >= intro.start - 5 && kw.intro <= intro.end + 5) intro.confidence = 'high';
      if (mus && intro && mus.start <= intro.end + 10 && mus.end >= intro.start - 10) {
        intro = { type: 'intro', start: Math.min(intro.start, mus.start), end: Math.max(intro.end, mus.end), confidence: 'high', source: 'subs' };
        mus = null;
      }
      /* у фильма пробел без подтверждения — скорее пролог без реплик, не трогаем */
      if (isMovie && intro && intro.confidence !== 'high') intro = null;

      if (intro) segs.push({ type: 'intro', start: rnd(intro.start), end: rnd(intro.end), confidence: intro.confidence, source: 'subs' });
      else if (mus && (!isMovie || mus.start <= 240)) {
        segs.push({ type: 'intro', start: rnd(mus.start), end: rnd(mus.end), confidence: 'medium', source: 'subs' });
      }

      /* рекап: "Previously on..." в начале */
      if (kw.recap != null && kw.recap >= 15 && kw.recap <= 240) {
        var z = false;
        for (var q = 0; q < segs.length; q++) if (segs[q].type === 'intro' && segs[q].start <= 1) { z = true; break; }
        if (!z) segs.push({ type: 'recap', start: 0, end: rnd(kw.recap), confidence: 'high', source: 'subs' });
      }

      var cr = this.credits(cues, dur, isMovie, kw);
      if (cr) segs.push(cr);

      segs.sort(function (a, b) { return a.start - b.start; });
      return segs;
    },

    kw: function (cues, dur) {
      var r = { recap: null, intro: null, credits: null };
      for (var i = 0; i < cues.length; i++) {
        var c = cues[i];
        var clean = c.text || '';
        var txt = ' ' + clean.toLowerCase() + ' ';
        if (r.intro == null && c.start < 300 && this.match(txt, KW.intro)) r.intro = c.start;
        if (r.recap == null && c.start < 60 && clean.length < 150 && this.match(txt, KW.recap)) {
          var e = c.end, j = i;
          while (j + 1 < cues.length && cues[j + 1].start - cues[j].end < 8 && cues[j + 1].start - c.start < 240) {
            j++; e = cues[j].end;
          }
          r.recap = e;
        }
        if (r.credits == null && dur && c.start > dur * 0.7 && clean.length < 60 && this.match(txt, KW.credits)) {
          r.credits = c.start;
        }
        if (r.intro != null && r.recap != null && r.credits != null) break;
      }
      return r;
    },

    match: function (txt, list) {
      for (var i = 0; i < list.length; i++) if (txt.indexOf(list[i]) !== -1) return true;
      return false;
    },

    music: function (cues) {
      var runs = [], cur = null;
      for (var i = 0; i < cues.length; i++) {
        var c = cues[i];
        if (c.start >= 300) break;
        if (/[♪♫]/.test(c.text || '')) {
          if (cur && c.start - cur.end < 3) { cur.end = Math.max(cur.end, c.end); cur.n++; }
          else { if (cur) runs.push(cur); cur = { start: c.start, end: c.end, n: 1 }; }
        } else if (cur && c.start - cur.end >= 3) { runs.push(cur); cur = null; }
      }
      if (cur) runs.push(cur);
      for (var q = 0; q < runs.length; q++) {
        var r = runs[q];
        if (r.n >= 3 && r.end - r.start >= 15 && r.end - r.start <= 180 && r.start < 240) {
          return { start: r.start, end: r.end };
        }
      }
      return null;
    },

    credits: function (cues, dur, isMovie, kw) {
      if (!dur) return null;
      var last = cues[cues.length - 1];

      /* фильмы: титры строго в последних 10% */
      if (isMovie) {
        var w = dur * 0.9;
        if (kw.credits != null && kw.credits >= w - 30) {
          return { type: 'credits', start: rnd(kw.credits), end: rnd(dur), confidence: 'high', source: 'subs' };
        }
        if (last.end >= w && dur - last.end >= 20 && dur - last.end <= 900) {
          return { type: 'credits', start: rnd(last.end), end: rnd(dur), confidence: 'medium', source: 'subs' };
        }
        return null;
      }

      /* сериалы */
      var cr = null, best = 0, high = false;
      if (dur > 600) {
        var tail = dur - last.end;
        if (tail >= 30 && tail <= 600) { best = tail; cr = { start: last.end, end: dur }; }
      }
      var ws = Math.max(0, dur - 600);
      for (var i = 0; i < cues.length - 1; i++) {
        if (cues[i].end < ws) continue;
        var g = cues[i + 1].start - cues[i].end;
        if (g >= 30 && g <= 420 && g > best) { best = g; cr = { start: cues[i].end, end: cues[i + 1].start }; }
      }
      if (kw.credits != null && kw.credits > dur * 0.7) {
        if (cr && kw.credits >= cr.start && kw.credits <= cr.end) { cr.start = kw.credits; high = true; }
        else if (!cr) { cr = { start: kw.credits, end: dur }; high = true; }
      }
      if (!cr) return null;
      return { type: 'credits', start: rnd(cr.start), end: rnd(cr.end), confidence: high ? 'high' : 'medium', source: 'subs' };
    }
  };

  /* ============================ анализ звука ============================ */

  var AudioDet = {
    ctx: null, an: null, srcNode: null, el: null, dead: false,
    _iv: null, _to: null,

    clear: function () {
      if (this._iv) { clearInterval(this._iv); this._iv = null; }
      if (this._to) { clearTimeout(this._to); this._to = null; }
    },

    detect: function (video, isMovie) {
      var self = this;
      self.clear();
      return new Promise(function (resolve) {
        var fin = false;
        function done(r) { if (fin) return; fin = true; self.clear(); resolve(r); }

        if (self.dead) return done(null);
        try {
          if (!window.AudioContext && !window.webkitAudioContext) { self.dead = true; return done(null); }
          if (!self.ctx || self.ctx.state === 'closed') {
            self.ctx = new (window.AudioContext || window.webkitAudioContext)();
            self.an = null; self.srcNode = null; self.el = null;
          }
          try { if (self.ctx.state === 'suspended') self.ctx.resume(); } catch (e) {}
          if (self.el !== video || !self.an) {
            self.srcNode = self.ctx.createMediaElementSource(video);
            self.an = self.ctx.createAnalyser();
            self.an.fftSize = 2048;
            self.srcNode.connect(self.an);
            self.an.connect(self.ctx.destination);
            self.el = video;
          }
        } catch (e) {
          self.dead = true;
          log('звук недоступен:', e && e.message);
          return done(null);
        }

        var samples = [];
        var buf = new Uint8Array(self.an.frequencyBinCount);
        var t0 = video.currentTime;

        self._iv = setInterval(function () {
          try {
            if (!self.an) { done(null); return; }
            if (video.paused) return; /* на паузе не копим «тишину» */
            var t = video.currentTime;
            if (t - t0 > 360 || t > 420) {
              done(samples.length > 8 ? self.energy(samples, isMovie) : null);
              return;
            }
            self.an.getByteFrequencyData(buf);
            var sum = 0;
            for (var i = 0; i < buf.length; i++) sum += buf[i];
            samples.push({ t: t, e: sum / buf.length });
          } catch (e) { done(null); }
        }, 500);

        self._to = setTimeout(function () {
          done(samples.length > 8 ? self.energy(samples, isMovie) : null);
        }, 380000);
      });
    },

    energy: function (samples, isMovie) {
      if (samples.length < 20) return null;
      var sm = [];
      for (var i = 2; i < samples.length - 2; i++) {
        sm.push({ t: samples[i].t, e: (samples[i - 2].e + samples[i - 1].e + samples[i].e + samples[i + 1].e + samples[i + 2].e) / 5 });
      }
      if (sm.length < 10) return null;
      var es = [];
      for (var q = 0; q < sm.length; q++) es.push(sm[q].e);
      es.sort(function (a, b) { return a - b; });
      var med = es[Math.floor(es.length / 2)];
      var loud = med * 1.3, quiet = med * 0.8;

      var st = null, cnt = 0;
      for (var j = 0; j < sm.length; j++) {
        var s = sm[j];
        if (s.t > 360) break;
        if (s.e > loud) { if (st == null) { st = s.t; cnt = 0; } cnt++; }
        else if (st != null && s.e < quiet) {
          var len = s.t - st;
          if (len >= 15 && len <= 150 && cnt >= 10) {
            if (isMovie && st > 300) { st = null; cnt = 0; continue; }
            return { type: 'intro', start: st, end: s.t, confidence: 'medium', source: 'audio' };
          }
          st = null; cnt = 0;
        }
      }
      return null;
    }
  };

  /* ============================ кнопка (стиль Netflix) ============================ */

  var Button = {
    el: null, visible: false, cd: false, _iv: null, _last: 0,
    label: null, hint: null, prog: null,
    OK: [13, 29443, 65385],
    SKIPN: { enter: 'OK', space: 'Пробел', red: 'Красная', green: 'Зелёная', yellow: 'Жёлтая', blue: 'Синяя' },
    CANCELN: { back: 'Назад', red: 'Красную', green: 'Зелёную', yellow: 'Жёлтую', blue: 'Синюю' },

    css: function () {
      if (document.getElementById('skip-intro-css')) return;
      var st = document.createElement('style');
      st.id = 'skip-intro-css';
      st.textContent = [
        '.skip-intro-button{position:absolute;right:40px;bottom:150px;display:flex;align-items:center;padding:13px 26px 13px 20px;background:rgba(10,12,16,.55);-webkit-backdrop-filter:blur(14px) saturate(160%);backdrop-filter:blur(14px) saturate(160%);border:1px solid rgba(255,255,255,.28);border-radius:10px;color:#fff;font-size:1em;font-family:inherit;font-weight:600;letter-spacing:.4px;line-height:1.2;white-space:nowrap;cursor:pointer;z-index:99999;opacity:0;visibility:hidden;pointer-events:none;transform:translateY(14px);outline:none;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,.45);transition:opacity .3s ease,visibility .3s ease,transform .35s cubic-bezier(.22,.8,.32,1),background .25s ease,border-color .25s ease,box-shadow .25s ease}',
        '.skip-intro-button.visible{opacity:1;visibility:visible;pointer-events:auto;transform:translateY(0)}',
        '.skip-intro-button:hover,.skip-intro-button:focus{background:rgba(255,255,255,.16);border-color:rgba(255,255,255,.7);box-shadow:0 0 0 1px rgba(255,255,255,.18),0 0 26px rgba(150,170,255,.35),0 10px 36px rgba(0,0,0,.5);transform:translateY(0) scale(1.06)}',
        '.skip-intro-button .skip-intro-icon{width:22px;height:22px;flex:0 0 22px;margin-right:12px;opacity:.95;transition:transform .25s ease}',
        '.skip-intro-button:hover .skip-intro-icon,.skip-intro-button:focus .skip-intro-icon{transform:translateX(4px)}',
        '.skip-intro-button .skip-intro-hint{font-size:.68em;font-weight:400;opacity:.55;margin-left:13px;padding-left:13px;border-left:1px solid rgba(255,255,255,.25);letter-spacing:.3px}',
        '.skip-intro-button .skip-intro-progress{position:absolute;left:0;bottom:0;height:3px;width:0;background:linear-gradient(90deg,#fff,#b9c6ff);z-index:3;transition:width .12s linear;pointer-events:none}',
        '.skip-intro-button:not(.countdown) .skip-intro-progress{display:none}'
      ].join('\n');
      document.head.appendChild(st);
    },

    attach: function () {
      if (!this.el) return;
      var host = document.querySelector('.player') || document.body;
      if (this.el.parentNode !== host) host.appendChild(this.el);
    },

    keepAlive: function () { if (this.el && this.visible) this.attach(); },

    create: function () {
      if (this.el) return;
      var self = this;
      this.css();

      var b = document.createElement('div');
      b.className = 'skip-intro-button';
      b.setAttribute('tabindex', '1');

      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'skip-intro-icon');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('stroke-width', '2.2');
      svg.setAttribute('stroke-linecap', 'round');
      svg.setAttribute('stroke-linejoin', 'round');
      var p1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p1.setAttribute('d', 'M5 5l7 7-7 7');
      var p2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p2.setAttribute('d', 'M13 5l7 7-7 7');
      svg.appendChild(p1); svg.appendChild(p2);
      b.appendChild(svg);

      this.label = document.createElement('span');
      this.label.className = 'skip-intro-label';
      this.label.textContent = LABELS.intro;
      b.appendChild(this.label);

      this.hint = document.createElement('span');
      this.hint.className = 'skip-intro-hint';
      b.appendChild(this.hint);

      this.prog = document.createElement('div');
      this.prog.className = 'skip-intro-progress';
      b.appendChild(this.prog);

      b._skip = function () {
        if (!b.classList.contains('visible')) return;
        var n = Date.now();
        if (n - self._last < 400) return;
        self._last = n;
        if (typeof b._onSkip === 'function') b._onSkip();
      };
      b._cancel = function () {
        if (!b.classList.contains('visible')) return;
        if (typeof b._onCancel === 'function') b._onCancel();
      };
      b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); b._skip(); });

      /* кнопки пульта Lampa */
      b._kd = function (e) {
        if (!b.classList.contains('visible')) return;
        var c = e.code, sk = S.skipKeys(), ck = S.cancelKeys();
        if (has(sk, c) && !has(self.OK, c)) {
          if (e.event) { try { e.event.preventDefault(); e.event.stopPropagation(); } catch (x) {} }
          b._skip();
        } else if (b._withCancel && has(ck, c)) {
          if (e.event) { try { e.event.preventDefault(); e.event.stopPropagation(); } catch (x) {} }
          b._cancel();
        }
      };
      b._ku = function (e) {
        if (!b.classList.contains('visible')) return;
        if (has(self.OK, e.code)) {
          var sk = S.skipKeys();
          if (has(sk, 13) || has(sk, 29443) || has(sk, 65385)) b._skip();
        }
      };
      try {
        if (Lampa.Keypad && Lampa.Keypad.listener) {
          Lampa.Keypad.listener.follow('keydown', b._kd);
          Lampa.Keypad.listener.follow('keyup', b._ku);
        }
      } catch (e) {}

      /* обычная клавиатура */
      b._dk = function (e) {
        if (!b.classList.contains('visible')) return;
        var tag = e.target && e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        var c = e.keyCode, sk = S.skipKeys(), ck = S.cancelKeys();
        if (has(sk, c)) { e.preventDefault(); e.stopPropagation(); b._skip(); }
        else if (b._withCancel && has(ck, c)) { e.preventDefault(); e.stopPropagation(); b._cancel(); }
      };
      document.addEventListener('keydown', b._dk, true);

      this.el = b;
      this.attach();
    },

    show: function (label, onSkip) {
      this.create();
      this.stopCd();
      this.el._onSkip = onSkip || null;
      this.el._onCancel = null;
      this.el._withCancel = false;
      this.el.classList.remove('countdown');
      this.label.textContent = label || LABELS.intro;
      var k = S.f('skip_intro_key_skip', 'enter');
      this.hint.textContent = 'нажмите ' + (this.SKIPN[k] || 'OK');
      if (this.prog) this.prog.style.width = '0%';
      this.attach();
      this.visible = true;
      this.el.classList.add('visible');
    },

    showAuto: function (label, onSkip, onCancel) {
      this.create();
      this.stopCd();
      this.el._onSkip = onSkip || null;
      this.el._onCancel = onCancel || null;
      this.el._withCancel = true;
      this.el.classList.add('countdown');
      this.label.textContent = label || LABELS.intro;
      var k = S.f('skip_intro_key_cancel', 'back');
      this.hint.textContent = 'нажмите ' + (this.CANCELN[k] || 'Назад') + ' для отмены';
      if (this.prog) this.prog.style.width = '0%';
      this.attach();
      this.visible = true;
      this.el.classList.add('visible');
      this.cd = true;
      var self = this, t0 = Date.now();
      this._iv = setInterval(function () {
        var p = (Date.now() - t0) / 4000;
        if (self.prog) self.prog.style.width = Math.min(100, p * 100) + '%';
        if (p >= 1) {
          self.stopCd();
          if (self.el && typeof self.el._onSkip === 'function') self.el._onSkip();
        }
      }, 50);
    },

    stopCd: function () {
      this.cd = false;
      if (this._iv) { clearInterval(this._iv); this._iv = null; }
    },

    hide: function () {
      this.stopCd();
      this.visible = false;
      if (this.el) this.el.classList.remove('visible');
    }
  };

  /* ============================ метаданные ============================ */

  var Meta = {
    resolve: function (payload) {
      var r = { season: null, episode: null, tvId: null, tmdbId: null, imdbId: null, cardId: null, cardTv: false, tvMarks: 0, title: '', subs: [] };
      var seen = [];
      var cands = [];

      if (payload) cands.push(payload);
      try {
        if (Lampa.Player) {
          var pl = typeof Lampa.Player.playlist === 'function' ? Lampa.Player.playlist() : null;
          if (pl && pl.length) {
            var pi = typeof Lampa.Player.played === 'function' ? Lampa.Player.played() : null;
            var it = typeof pi === 'number' ? (pl[pi] || null) : (pi && pi.url ? pi : null);
            if (it) cands.push(it);
          }
          var pv = typeof Lampa.Player.video === 'function' ? Lampa.Player.video() : null;
          if (pv && pv.url) cands.push(pv);
        }
      } catch (e) {}
      try {
        if (Lampa.Activity && typeof Lampa.Activity.active === 'function') {
          var a = Lampa.Activity.active();
          if (a) {
            var w = {};
            if (a.movie) w.movie = a.movie;
            if (a.card) w.card = a.card;
            if (a.season != null) w.season = a.season;
            if (a.episode != null) w.episode = a.episode;
            cands.push(w);
          }
        }
      } catch (e) {}

      for (var i = 0; i < cands.length; i++) this.scan(cands[i], 0, r, seen);

      var hasEp = r.season != null && r.episode != null;
      var isTv = hasEp || r.tvMarks > 0 || r.cardTv;
      var isMovie = !isTv;

      var tmdb = null;
      if (isTv) tmdb = r.tvId != null ? r.tvId : (r.tmdbId != null ? r.tmdbId : r.cardId);
      else tmdb = r.tmdbId != null ? r.tmdbId : (r.cardId != null ? r.cardId : r.tvId);

      var key = null;
      if (tmdb != null) key = (isMovie ? 'm' : 't') + tmdb + (isMovie ? '' : '_' + r.season + 'x' + r.episode);
      else if (r.imdbId) key = 'i' + r.imdbId + (isMovie ? '' : '_' + r.season + 'x' + r.episode);

      var meta = {
        tmdbId: tmdb,
        imdbId: r.imdbId || null,
        season: isMovie ? null : r.season,
        episode: isMovie ? null : r.episode,
        isMovie: isMovie,
        title: r.title || '',
        key: key,
        trackable: !!(tmdb != null || r.imdbId),
        subs: r.subs
      };
      log('мета:', meta.isMovie ? 'фильм' : ('сезон ' + meta.season + ', эпизод ' + meta.episode),
        '| tmdb:', meta.tmdbId, '| imdb:', meta.imdbId,
        meta.title ? '| «' + meta.title + '»' : '', '| субтитров:', meta.subs.length);
      return meta;
    },

    scan: function (node, depth, r, seen) {
      if (!node || typeof node !== 'object' || depth > 4 || node.nodeType || seen.length > 300) return;
      if (seen.indexOf(node) !== -1) return;
      seen.push(node);
      var i;

      if (Array.isArray(node)) {
        for (i = 0; i < node.length && i < 30; i++) this.scan(node[i], depth + 1, r, seen);
        return;
      }

      if (r.season == null && node.season != null) { var s = num(node.season); if (s != null) r.season = s; }
      if (r.episode == null && node.episode != null) { var ep = num(node.episode); if (ep != null) r.episode = ep; }
      if (r.tvId == null && node.tv_id != null) { var tv = num(node.tv_id); if (tv != null) r.tvId = tv; }
      if (r.tmdbId == null && node.tmdb_id != null) { var tm = num(node.tmdb_id); if (tm != null) r.tmdbId = tm; }
      if (r.imdbId == null && typeof node.imdb_id === 'string' && node.imdb_id) r.imdbId = node.imdb_id;

      if (node.number_of_seasons != null && num(node.number_of_seasons) > 0) r.tvMarks++;
      if (node.first_air_date || node.original_name || node.last_episode_to_air || node.next_episode_to_air) r.tvMarks++;
      if (node.seasons && Array.isArray(node.seasons) && node.seasons.length) r.tvMarks++;

      /* карточка TMDB (не видео-объект с url) */
      if (r.cardId == null && node.id != null && !node.url &&
        (node.title || node.name || node.original_title || node.original_name) &&
        (node.poster_path || node.backdrop_path || node.release_date || node.first_air_date ||
          node.number_of_seasons || node.original_title || node.original_name)) {
        var cid = num(node.id);
        if (cid != null) {
          r.cardId = cid;
          r.cardTv = !!(node.number_of_seasons || node.first_air_date || node.original_name ||
            node.last_episode_to_air || node.next_episode_to_air);
        }
      }

      if (!r.title) r.title = node.title || node.name || '';

      /* дорожки субтитров */
      var sk = ['customSubs', 'subtitles', 'subs', 'subtitle'];
      for (var q = 0; q < sk.length; q++) {
        var sv = node[sk[q]];
        if (sv && typeof sv === 'object') {
          var arr2 = Array.isArray(sv) ? sv : [sv];
          for (var w2 = 0; w2 < arr2.length && r.subs.length < 20; w2++) {
            if (arr2[w2] && arr2[w2].url) r.subs.push(arr2[w2]);
          }
        }
      }

      for (var k in node) {
        if (!Object.prototype.hasOwnProperty.call(node, k)) continue;
        var v = node[k];
        if (v && typeof v === 'object') this.scan(v, depth + 1, r, seen);
      }
    }
  };

  /* ============================ контроллер ============================ */

  var C = {
    video: null, src: '', meta: null, segs: [], payload: null,
    dismissed: {}, handled: {}, activeKey: null, shownAuto: null, onTime: null,

    init: function () {
      var self = this;

      /* события — только для метаданных, работать будем и без них */
      try {
        if (Lampa.Player && Lampa.Player.listener) {
          Lampa.Player.listener.follow('start', function (e) { self.payload = e; log('событие: start'); });
          Lampa.Player.listener.follow('destroy', function () { log('событие: destroy'); self.reset(); });
        }
      } catch (e) { log('Player.listener:', e); }
      try {
        if (Lampa.Listener) {
          Lampa.Listener.follow('player', function (e) {
            if (!e || typeof e !== 'object') return;
            if (e.type === 'start') { self.payload = e.data || e; log('событие: player.start'); }
            else if (e.type === 'destroy') { log('событие: player.destroy'); self.reset(); }
          });
        }
      } catch (e) { log('Listener:', e); }

      /* сторож: сам находит видео — главная движущая сила */
      setInterval(function () { self.tick(); }, 1200);
      log('запущен, версия', window.__skipIntroVersion);
    },

    reset: function () {
      if (this.video && this.onTime) {
        try { this.video.removeEventListener('timeupdate', this.onTime); } catch (e) {}
      }
      this.video = null; this.onTime = null; this.src = '';
      this.meta = null; this.segs = []; this.payload = null;
      this.dismissed = {}; this.handled = {};
      this.activeKey = null; this.shownAuto = null;
      Button.hide();
      AudioDet.clear();
    },

    tick: function () {
      try {
        if (!S.enabled()) { if (this.video) this.reset(); return; }

        var v = document.querySelector('.player video');
        if (!v) {
          /* видео вне плеера — берём только длинное (не трейлер) */
          var all = document.querySelectorAll('video');
          for (var i = 0; i < all.length; i++) {
            if (isNaN(all[i].duration) || all[i].duration > 240) { v = all[i]; break; }
          }
        }
        if (!v) { if (this.video) this.reset(); return; }

        var src = '';
        try { src = v.currentSrc || v.src || ''; } catch (e) {}

        var same = v === this.video && (!src || !this.src || src === this.src);
        if (!same) {
          if (!v.paused && v.currentTime > 0.3 && !v.ended) this.begin(v, src);
          return;
        }
        if (this.video) {
          Button.keepAlive();
          this.check();
        }
      } catch (e) { log('tick:', e); }
    },

    begin: function (v, src) {
      if (this.video && this.onTime) {
        try { this.video.removeEventListener('timeupdate', this.onTime); } catch (e) {}
      }
      this.video = v; this.src = src || ''; this.onTime = null;
      this.segs = []; this.dismissed = {}; this.handled = {};
      this.activeKey = null; this.shownAuto = null;
      Button.hide(); AudioDet.clear();

      var meta = Meta.resolve(this.payload);
      this.meta = meta;

      if (meta.isMovie && !S.movies()) { log('фильмы отключены настройкой'); return; }

      var self = this;
      this.onTime = function () { self.check(); };
      try { v.addEventListener('timeupdate', this.onTime); } catch (e) {}

      if (S.test()) {
        this.segs = [{ type: 'intro', start: 3, end: 180, confidence: 'high', source: 'test' }];
        log('ТЕСТОВЫЙ РЕЖИМ: кнопка появится с 3-й секунды');
        try { Lampa.Toast && Lampa.Toast.show({ title: 'SkipIntro: тест, кнопка на 3-й секунде' }); } catch (e) {}
        return;
      }

      this.load();
    },

    load: function () {
      var self = this, v = this.video, meta = this.meta;
      if (!meta) return;

      if (!meta.trackable) {
        log('ID не найден — только умная детекция');
        this.detect();
        return;
      }

      Sources.load(meta).then(function (segs) {
        if (self.video !== v || !self.meta) return;
        if (segs && segs.length) {
          self.setSegs(segs);
          if (!self.hasType('intro')) self.detect(); /* для фильмов базы почти всегда пусты */
        } else {
          var dc = DC.get(meta);
          if (dc && dc.length) {
            self.setSegs(dc);
            if (!self.hasType('intro')) self.detect();
          } else {
            self.detect();
          }
        }
      });
    },

    setSegs: function (segs) {
      this.segs = this.clean(segs, this.video ? this.video.duration || 0 : 0);
      var s = [];
      for (var i = 0; i < this.segs.length; i++) s.push(this.segs[i].type + ' ' + this.segs[i].start + '-' + this.segs[i].end);
      log('сегменты:', s.join(', ') || 'нет');
    },

    mergeSegs: function (segs) {
      var add = this.clean(segs, this.video ? this.video.duration || 0 : 0);
      var changed = false;
      for (var i = 0; i < add.length; i++) {
        var n = add[i], hit = false;
        for (var j = 0; j < this.segs.length; j++) {
          var e = this.segs[j];
          if (e.type !== n.type) continue;
          if (Math.min(e.end, n.end) - Math.max(e.start, n.start) > 0) {
            e.start = Math.min(e.start, n.start);
            e.end = Math.max(e.end, n.end);
            e.confidence = 'high';
            hit = true; changed = true;
            break;
          }
        }
        if (!hit) {
          var exists = false;
          for (var q = 0; q < this.segs.length; q++) if (this.segs[q].type === n.type) { exists = true; break; }
          if (!exists) { this.segs.push(n); changed = true; }
        }
      }
      if (changed) {
        this.segs.sort(function (a, b) { return a.start - b.start; });
        if (this.meta && this.meta.trackable && this.segs.length) DC.set(this.meta, this.segs);
        log('детекция обновила сегменты');
      }
    },

    detect: function () {
      if (!S.detect() || !this.video || !this.meta) return;
      var self = this, v = this.video, meta = this.meta;
      log('умная детекция...');

      Subs.fromVideo(v, meta.subs && meta.subs.length ? meta.subs : null).then(function (cues) {
        if (self.video !== v) return;
        var segs = cues ? Subs.analyze(cues, v.duration || 0, meta.isMovie) : [];
        log('по субтитрам сегментов:', segs.length);
        if (segs.length) self.mergeSegs(segs);

        /* звук подключаем только если субтитры не нашли заставку */
        if (!self.hasType('intro')) {
          AudioDet.detect(v, meta.isMovie).then(function (seg) {
            if (self.video !== v || !seg) return;
            log('по звуку: intro', seg.start, '-', seg.end);
            self.mergeSegs([seg]);
          });
        }
      });
    },

    hasType: function (t) {
      for (var i = 0; i < this.segs.length; i++) if (this.segs[i].type === t) return true;
      return false;
    },

    clean: function (segs, dur) {
      var out = [];
      if (!segs || typeof segs.length !== 'number') return out;
      for (var i = 0; i < segs.length; i++) {
        var s = segs[i];
        if (!s || s.start == null || s.end == null) continue;
        var a = Number(s.start), b = Number(s.end);
        if (isNaN(a) || isNaN(b) || b - a < 5) continue;
        a = Math.max(0, a);
        if (dur) {
          if (a > dur - 5) continue;
          b = Math.min(b, dur);
        }
        if (b - a < 5) continue;
        out.push({ type: s.type, start: rnd(a), end: rnd(b), confidence: s.confidence || 'high', source: s.source || '' });
      }
      out.sort(function (x, y) { return x.start - y.start; });
      return out;
    },

    check: function () {
      if (!this.video || !this.meta) return;
      var t = this.video.currentTime, seg = null;

      for (var i = 0; i < this.segs.length; i++) {
        var s = this.segs[i];
        if (t >= s.start && t < s.end - 2 && S.typeOn(s.type)) { seg = s; break; }
      }

      if (!seg || seg.end - t < 3) {
        if (this.activeKey !== null) {
          this.activeKey = null; this.shownAuto = null;
          Button.hide();
        }
        return;
      }

      var key = seg.type + ':' + seg.start + ':' + seg.end;
      var auto = !this.dismissed[key] && !this.handled[key] &&
        (S.auto() || (this.meta.key && Smart.has(this.meta.key, seg.type)));

      if (key === this.activeKey && auto === this.shownAuto) return;
      this.activeKey = key; this.shownAuto = auto;

      var self = this, label = LABELS[seg.type] || LABELS.intro;
      if (auto) {
        this.handled[key] = true;
        Button.showAuto(label,
          function () { self.skip(seg); },
          function () { self.cancel(key, seg); });
      } else {
        Button.show(label, function () { self.skip(seg); });
      }
    },

    skip: function (seg) {
      if (!this.video) return;
      var to = seg.end, d = this.video.duration || 0;
      if (d) to = Math.min(to, d);
      try { this.video.currentTime = to; } catch (e) {}
      if (this.meta && this.meta.key) Smart.set(this.meta.key, seg.type, true);
      this.activeKey = null; this.shownAuto = null;
      Button.hide();
      log('пропущено:', seg.type, seg.start, '→', seg.end);
    },

    cancel: function (key, seg) {
      this.dismissed[key] = true;
      if (this.meta && this.meta.key) Smart.set(this.meta.key, seg.type, false);
      this.activeKey = null; this.shownAuto = null;
      Button.hide();
      log('автопропуск отменён');
    }
  };

  /* ============================ запуск ============================ */

  try { S.init(); } catch (e) { log('Settings:', e); }
  try { C.init(); } catch (e) { log('Controller:', e); }

  window.__skipIntro = C; /* отладка из консоли */

})();
