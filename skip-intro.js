/*!
 * Skip Intro/Outro для Lampa — v2.1
 * Пропуск заставок, рекапов, превью и титров (сериалы + фильмы).
 *
 * Исправления v2.1 (в v2.0 кнопка могла не появляться):
 *  - отказоустойчивая обработка событий плеера (пустой дубль события больше не блокирует запуск);
 *  - метаданные (tmdb/imdb, сезон, эпизод) ищутся глубоким сканом: объект события,
 *    текущий элемент плейлиста, активность Lampa;
 *  - «сторож» (watchdog): если событие start не пришло — плагин сам заметит
 *    начавшееся воспроизведение и включится;
 *  - субтитры для детекции берутся в том числе из объекта видео (subtitle/subtitles);
 *  - детекция работает даже без ID — кнопка может появиться и без баз данных.
 */
(function() {
  'use strict';

  if (window.__skipIntroLoaded) return;
  window.__skipIntroLoaded = true;
  window.__skipIntroVersion = '2.1';

  /* ---------- метаданные плагина (как в оригинале) ---------- */
  try {
    var plugins = Lampa.Storage.get('plugins', '[]');
    if (typeof plugins === 'string') plugins = JSON.parse(plugins);
    if (Array.isArray(plugins)) {
      var renamed = false;
      plugins.forEach(function(p) {
        if (p && p.url && p.url.indexOf('lampa-auto-skip') !== -1) {
          if (p.name !== 'Skip Intro/Outro') { p.name = 'Skip Intro/Outro'; renamed = true; }
          if (p.author !== '@vahagn') { p.author = '@vahagn'; renamed = true; }
        }
      });
      if (renamed) Lampa.Storage.set('plugins', JSON.stringify(plugins));
    }
  } catch (e) {}

  /* ---------- константы ---------- */
  var API_TIMEOUT = 10000;                       // таймаут запросов, мс
  var API_RETRIES = 2;                           // повторные попытки при ошибках сети
  var RETRY_DELAY = 800;
  var MAX_INTRO_END = 360;                       // заставка не длиннее 6 минут
  var COUNTDOWN_MS = 4000;                       // окно автопропуска
  var CACHE_TTL_API = 7 * 24 * 60 * 60 * 1000;   // кэш ответов API — 7 дней
  var CACHE_TTL_DETECTED = 30 * 24 * 60 * 60 * 1000; // кэш детекции — 30 дней

  var SEGMENT_LABELS = {
    intro:   'Пропустить заставку',
    recap:   'Пропустить рекап',
    credits: 'Пропустить титры',
    preview: 'Пропустить превью'
  };
  var SEGMENT_TYPES = ['intro', 'recap', 'credits', 'preview'];

  var KEYWORDS = {
    recap: ['previously on', 'previously in', 'last time on', 'last episode', 'recap',
            'ранее в сериале', 'ранее в', 'в прошлой серии', 'в предыдущей серии', 'в прошлых сериях'],
    intro: ['intro', 'opening credits', 'main title', 'main titles', 'title sequence',
            'theme song', 'theme music', 'opening theme', 'заставка', 'начальные титры'],
    credits: ['directed by', 'режиссёр', 'режиссер', 'end credits', 'closing credits',
              'the end', 'конец фильма', 'заключительные титры']
  };

  function log() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift('[SkipIntro]');
    try { console.log.apply(console, args); } catch (e) {}
  }

  function inArray(arr, v) {
    for (var i = 0; i < arr.length; i++) if (arr[i] === v) return true;
    return false;
  }

  function metaCacheKey(meta) {
    var id = meta.tmdbId ? 'tmdb' + meta.tmdbId : (meta.imdbId ? 'imdb' + meta.imdbId : null);
    if (!id) return null;
    return meta.isMovie ? id + '_movie' : id + '_s' + meta.season + '_e' + meta.episode;
  }

  /* ================================================================== */
  /*  Настройки                                                          */
  /* ================================================================== */
  var Settings = {
    _keyMap: {
      enter: [13], space: [32], back: [8, 27, 10009, 461, 4],
      red: [403], green: [404], yellow: [405], blue: [406]
    },

    init: function() {
      try {
        Lampa.SettingsApi.addComponent({
          component: 'skip_intro',
          name: 'Пропуск заставок',
          icon: '<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line></svg>'
        });
      } catch (e) { log('addComponent error:', e); }

      function param(p) {
        try { Lampa.SettingsApi.addParam(p); }
        catch (e) { log('addParam error:', p.param && p.param.name, e); }
      }

      param({ component: 'skip_intro',
        param: { name: 'skip_intro_enabled', type: 'trigger', default: true },
        field: { name: 'Включить плагин', description: 'Показывать кнопку пропуска заставок и титров' } });

      param({ component: 'skip_intro',
        param: { name: 'skip_intro_auto', type: 'trigger', default: false },
        field: { name: 'Всегда автопропуск', description: 'Всегда перематывать без кнопки (для всего контента)' } });

      param({ component: 'skip_intro',
        param: { name: 'skip_intro_detect', type: 'trigger', default: true },
        field: { name: 'Умное обнаружение', description: 'Определять заставку по субтитрам и звуку, если нет данных в базе' } });

      param({ component: 'skip_intro',
        param: { name: 'skip_intro_movies', type: 'trigger', default: true },
        field: { name: 'Работать с фильмами', description: 'Искать заставку в начале и титры в конце фильмов' } });

      param({ component: 'skip_intro',
        param: { name: 'skip_intro_type_intro', type: 'trigger', default: true },
        field: { name: 'Пропускать заставку (intro)' } });

      param({ component: 'skip_intro',
        param: { name: 'skip_intro_type_recap', type: 'trigger', default: true },
        field: { name: 'Пропускать рекап (recap)' } });

      param({ component: 'skip_intro',
        param: { name: 'skip_intro_type_credits', type: 'trigger', default: true },
        field: { name: 'Пропускать титры (credits)' } });

      param({ component: 'skip_intro',
        param: { name: 'skip_intro_type_preview', type: 'trigger', default: false },
        field: { name: 'Пропускать превью (preview)' } });

      param({ component: 'skip_intro',
        param: {
          name: 'skip_intro_key_skip', type: 'select', default: 'enter',
          values: { enter: 'Enter / OK', space: 'Пробел', red: 'Красная кнопка (403)', green: 'Зелёная кнопка (404)', yellow: 'Жёлтая кнопка (405)', blue: 'Синяя кнопка (406)' }
        },
        field: { name: 'Кнопка «Пропустить»', description: 'Какая кнопка на пульте пропускает сегмент' } });

      param({ component: 'skip_intro',
        param: {
          name: 'skip_intro_key_cancel', type: 'select', default: 'back',
          values: { back: 'Назад (Back)', red: 'Красная кнопка (403)', green: 'Зелёная кнопка (404)', yellow: 'Жёлтая кнопка (405)', blue: 'Синяя кнопка (406)' }
        },
        field: { name: 'Кнопка «Отменить»', description: 'Какая кнопка на пульте отменяет автопропуск' } });
    },

    isEnabled: function() { try { return Lampa.Storage.field('skip_intro_enabled') !== false; } catch (e) { return true; } },
    isAutoSkip: function() { try { return Lampa.Storage.field('skip_intro_auto') === true; } catch (e) { return false; } },
    isDetectEnabled: function() { try { return Lampa.Storage.field('skip_intro_detect') !== false; } catch (e) { return true; } },
    isMoviesEnabled: function() { try { return Lampa.Storage.field('skip_intro_movies') !== false; } catch (e) { return true; } },
    isTypeEnabled: function(type) { try { return Lampa.Storage.field('skip_intro_type_' + type) !== false; } catch (e) { return true; } },
    getSkipKeys: function() {
      var k = Lampa.Storage.field('skip_intro_key_skip') || 'enter';
      return this._keyMap[k] || this._keyMap.enter;
    },
    getCancelKeys: function() {
      var k = Lampa.Storage.field('skip_intro_key_cancel') || 'back';
      return this._keyMap[k] || this._keyMap.back;
    }
  };

  /* ================================================================== */
  /*  Smart Skip — «пользователь уже пропускал это»                      */
  /* ================================================================== */
  var SmartSkip = {
    _storageKey: 'skip_intro_smart',

    _getAll: function() {
      try {
        var raw = Lampa.Storage.get(this._storageKey, '{}');
        if (typeof raw === 'string') raw = JSON.parse(raw);
        return raw || {};
      } catch (e) { return {}; }
    },
    _saveAll: function(all) {
      try { Lampa.Storage.set(this._storageKey, JSON.stringify(all)); } catch (e) {}
    },
    hasSkipped: function(key, type) {
      if (!key) return false;
      return this._getAll()[key + '_' + type] === true;
    },
    rememberSkip: function(key, type) {
      if (!key) return;
      var all = this._getAll();
      all[key + '_' + type] = true;
      this._saveAll(all);
    },
    forgetSkip: function(key, type) {
      if (!key) return;
      var all = this._getAll();
      if (all[key + '_' + type] !== undefined) {
        delete all[key + '_' + type];
        this._saveAll(all);
      }
    }
  };

  /* ================================================================== */
  /*  Кэш сегментов из API (localStorage, сериалы + фильмы)              */
  /* ================================================================== */
  var SegmentCache = {
    _prefix: 'skip_intro_seg_',

    _legacyKey: function(meta) {
      if (!meta.tmdbId || meta.isMovie) return null;
      return 'skip_' + meta.tmdbId + '_s' + meta.season + '_e' + meta.episode;
    },

    get: function(meta) {
      var key = metaCacheKey(meta);
      if (!key) return null;
      try {
        var raw = localStorage.getItem(this._prefix + key);
        if (raw === null) {
          var legacy = this._legacyKey(meta);
          if (legacy) raw = localStorage.getItem(legacy);
        }
        if (!raw) return null;
        var rec = JSON.parse(raw);
        if (!rec || !rec._ts) return null;
        if (Date.now() - rec._ts > CACHE_TTL_API) {
          localStorage.removeItem(this._prefix + key);
          return null;
        }
        return rec.segments || [];
      } catch (e) { return null; }
    },

    set: function(meta, segments) {
      var key = metaCacheKey(meta);
      if (!key) return;
      try {
        localStorage.setItem(this._prefix + key, JSON.stringify({ segments: segments, _ts: Date.now() }));
      } catch (e) {}
    }
  };

  /* ================================================================== */
  /*  Кэш детектированных сегментов (Lampa.Storage)                      */
  /* ================================================================== */
  var DetectedCache = {
    _storageKey: 'skip_intro_detected',
    _ttl: CACHE_TTL_DETECTED,

    _getAll: function() {
      try {
        var raw = Lampa.Storage.get(this._storageKey, '{}');
        if (typeof raw === 'string') raw = JSON.parse(raw);
        return raw || {};
      } catch (e) { return {}; }
    },
    _saveAll: function(all) {
      try { Lampa.Storage.set(this._storageKey, JSON.stringify(all)); } catch (e) {}
    },
    _key: function(meta) {
      if (!meta.tmdbId) return null;
      return meta.isMovie ? meta.tmdbId + '_movie' : meta.tmdbId + '_s' + meta.season + '_e' + meta.episode;
    },

    get: function(meta) {
      var key = this._key(meta);
      if (!key) return null;
      var all = this._getAll();
      var legacy = meta.tmdbId && !meta.isMovie ? meta.tmdbId + '_s' + meta.season + '_e' + meta.episode : null;
      var rec = all[key] || (legacy ? all[legacy] : null);
      if (!rec) return null;
      if (!rec._ts || Date.now() - rec._ts > this._ttl) {
        delete all[key];
        if (legacy) delete all[legacy];
        this._saveAll(all);
        return null;
      }
      return rec.segments || null;
    },

    set: function(meta, segments) {
      var key = this._key(meta);
      if (!key || !segments || !segments.length) return;
      var all = this._getAll();
      all[key] = { segments: segments, _ts: Date.now() };
      this._saveAll(all);
      log('детекция закэширована:', key);
    }
  };

  /* ================================================================== */
  /*  Детектор по субтитрам                                              */
  /* ================================================================== */
  var SubtitleDetector = {
    /* subsList — список дорожек субтитров, собранный из события плеера */
    detect: function(videoEl, isMovie, subsList) {
      var self = this;
      return new Promise(function(resolve) {
        try {
          var url = null;
          var candidates = [subsList, videoEl ? videoEl.customSubs : null, videoEl ? videoEl.subtitles : null];
          for (var i = 0; i < candidates.length && !url; i++) {
            var arr = candidates[i];
            if (arr && arr.length) {
              for (var j = 0; j < arr.length; j++) {
                if (arr[j] && arr[j].url) { url = arr[j].url; break; }
              }
            }
          }

          if (url) {
            self._loadSubsFile(url, function(text) {
              if (text) resolve(self._analyzeSubsText(text, (videoEl && videoEl.duration) || 0, isMovie));
              else resolve([]);
            });
            return;
          }

          var tracks = videoEl ? videoEl.textTracks : null;
          if (tracks && tracks.length) {
            for (var t = 0; t < tracks.length; t++) {
              var cues = tracks[t] && tracks[t].cues;
              if (cues && cues.length > 5) {
                resolve(self._analyzeCues(cues, (videoEl && videoEl.duration) || 0, isMovie));
                return;
              }
            }
          }
          resolve([]);
        } catch (e) {
          log('SubtitleDetector error:', e);
          resolve([]);
        }
      });
    },

    _loadSubsFile: function(url, cb) {
      try {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'text';
        xhr.timeout = 12000;
        xhr.onload = function() {
          cb(xhr.status >= 200 && xhr.status < 300 && xhr.responseText ? xhr.responseText : null);
        };
        xhr.onerror = function() { cb(null); };
        xhr.ontimeout = function() { cb(null); };
        xhr.send();
      } catch (e) { cb(null); }
    },

    _analyzeCues: function(cueList, duration, isMovie) {
      var cues = [];
      for (var i = 0; i < cueList.length; i++) {
        var c = cueList[i];
        if (c == null || c.startTime == null || c.endTime == null) continue;
        var text = '';
        try { text = c.text != null ? String(c.text) : ''; } catch (e) {}
        if (c.endTime > c.startTime) cues.push({ start: c.startTime, end: c.endTime, text: text });
      }
      return this._analyzeCueList(cues, duration, isMovie);
    },

    _parseTime: function(str) {
      var m = String(str).trim().match(/(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{1,3})/);
      if (!m) return 0;
      var h = m[1] ? parseInt(m[1], 10) : 0;
      var ms = parseInt((m[4] + '00').slice(0, 3), 10);
      return h * 3600 + parseInt(m[2], 10) * 60 + parseInt(m[3], 10) + ms / 1000;
    },

    _analyzeSubsText: function(content, duration, isMovie) {
      content = String(content).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      var blocks = content.split(/\n{2,}/);
      var cues = [];
      var timeRe = /(?:\d{1,2}:)?\d{1,2}:\d{2}[.,]\d{1,3}\s*-->\s*(?:\d{1,2}:)?\d{1,2}:\d{2}[.,]\d{1,3}/;

      for (var i = 0; i < blocks.length; i++) {
        var lines = blocks[i].split('\n');
        for (var j = 0; j < lines.length; j++) {
          if (timeRe.test(lines[j])) {
            var times = lines[j].split('-->');
            var start = this._parseTime(times[0]);
            var end = this._parseTime(times[1]);
            var text = lines.slice(j + 1).join(' ')
              .replace(/<[^>]+>/g, ' ')
              .replace(/\{[^}]+\}/g, ' ')
              .trim();
            if (end > start) cues.push({ start: start, end: end, text: text });
            break;
          }
        }
      }
      return this._analyzeCueList(cues, duration, isMovie);
    },

    _analyzeCueList: function(cues, duration, isMovie) {
      if (cues.length < 5) return [];
      cues.sort(function(a, b) { return a.start - b.start; });
      return this._findSegments(cues, duration || 0, isMovie);
    },

    _findSegments: function(cues, duration, isMovie) {
      var segments = [];
      var keywords = this._scanKeywords(cues, duration);

      var intro = this._findGapIntro(cues, duration, isMovie);
      var musicIntro = this._findMusicIntro(cues);

      if (intro && keywords.introHint != null &&
          keywords.introHint >= intro.start - 5 && keywords.introHint <= intro.end + 5) {
        intro.confidence = 'high';
      }
      /* у фильма «дырка» без подтверждения — скорее пролог, не рискуем */
      if (intro && isMovie && intro.confidence !== 'high') intro = null;

      if (intro && musicIntro) {
        if (musicIntro.end >= intro.start - 10 && musicIntro.start <= intro.end + 10) {
          intro.start = Math.min(intro.start, musicIntro.start);
          intro.end = Math.max(intro.end, musicIntro.end);
          intro.confidence = 'high';
          segments.push(intro);
        } else {
          segments.push(intro);
          segments.push(musicIntro);
        }
      } else if (intro) {
        segments.push(intro);
      } else if (musicIntro) {
        segments.push(musicIntro);
      }

      if (keywords.recapEnd != null && keywords.recapEnd >= 15 && keywords.recapEnd <= 240) {
        var introAtZero = false;
        for (var i = 0; i < segments.length; i++) {
          if (segments[i].type === 'intro' && segments[i].start <= 1) { introAtZero = true; break; }
        }
        if (!introAtZero) {
          segments.push({ type: 'recap', start: 0, end: Math.round(keywords.recapEnd), confidence: 'high' });
        }
      }

      var credits = this._findCredits(cues, duration, isMovie, keywords);
      if (credits) segments.push(credits);

      segments.sort(function(a, b) { return a.start - b.start; });
      return segments;
    },

    _findGapIntro: function(cues, duration, isMovie) {
      var maxGap = isMovie ? 210 : 150;
      var intro = null;
      var bestGap = 0;

      if (cues[0].start >= 15 && cues[0].start <= maxGap) {
        bestGap = cues[0].start;
        intro = { type: 'intro', start: 0, end: cues[0].start, confidence: 'medium' };
      }

      var limit = isMovie ? Math.min(MAX_INTRO_END, Math.max(60, (duration || 0) * 0.2)) : MAX_INTRO_END;

      for (var i = 0; i < cues.length - 1; i++) {
        if (cues[i].end > limit) break;
        var gap = cues[i + 1].start - cues[i].end;
        if (gap >= 15 && gap <= maxGap && gap > bestGap) {
          bestGap = gap;
          intro = { type: 'intro', start: cues[i].end, end: cues[i + 1].start, confidence: 'medium' };
        }
      }

      if (intro) {
        intro.start = Math.round(intro.start);
        intro.end = Math.round(intro.end);
      }
      return intro;
    },

    _findMusicIntro: function(cues) {
      var MUSIC_RE = /[♪♫]/;
      var runs = [];
      var cur = null;

      for (var i = 0; i < cues.length; i++) {
        var c = cues[i];
        if (c.start >= 300) break;
        if (MUSIC_RE.test(c.text)) {
          if (cur && c.start - cur.end < 3) { cur.end = Math.max(cur.end, c.end); cur.count++; }
          else { if (cur) runs.push(cur); cur = { start: c.start, end: c.end, count: 1 }; }
        } else if (cur && c.start - cur.end >= 3) {
          runs.push(cur);
          cur = null;
        }
      }
      if (cur) runs.push(cur);

      for (var r = 0; r < runs.length; r++) {
        var run = runs[r];
        var len = run.end - run.start;
        if (run.count >= 3 && len >= 15 && len <= 180 && run.start < 240) {
          return { type: 'intro', start: Math.round(run.start), end: Math.round(run.end), confidence: 'medium' };
        }
      }
      return null;
    },

    _scanKeywords: function(cues, duration) {
      var res = { recapEnd: null, introHint: null, creditsAt: null };

      for (var i = 0; i < cues.length; i++) {
        var cue = cues[i];
        var clean = cue.text ? String(cue.text).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';
        var text = ' ' + clean.toLowerCase() + ' ';

        if (res.introHint == null && cue.start < 300 && this._matchesAny(text, KEYWORDS.intro)) {
          res.introHint = cue.start;
        }

        if (res.recapEnd == null && cue.start < 60 && clean.length < 150 && this._matchesAny(text, KEYWORDS.recap)) {
          var end = cue.end, j = i;
          while (j + 1 < cues.length && cues[j + 1].start - cues[j].end < 8 && cues[j + 1].start - cue.start < 240) {
            j++;
            end = cues[j].end;
          }
          res.recapEnd = end;
        }

        if (res.creditsAt == null && duration && cue.start > duration * 0.7 && clean.length < 60 && this._matchesAny(text, KEYWORDS.credits)) {
          res.creditsAt = cue.start;
        }

        if (res.introHint != null && res.recapEnd != null && res.creditsAt != null) break;
      }
      return res;
    },

    _matchesAny: function(text, list) {
      for (var i = 0; i < list.length; i++) {
        if (text.indexOf(list[i]) !== -1) return true;
      }
      return false;
    },

    _findCredits: function(cues, duration, isMovie, keywords) {
      if (!duration) return null;
      var last = cues[cues.length - 1];

      /* фильмы: титры ищем строго в последних 10% */
      if (isMovie) {
        var winStart = duration * 0.9;
        if (keywords.creditsAt != null && keywords.creditsAt >= winStart - 30) {
          return { type: 'credits', start: Math.round(keywords.creditsAt), end: Math.round(duration), confidence: 'high' };
        }
        if (last.end >= winStart && duration - last.end >= 20 && duration - last.end <= 900) {
          return { type: 'credits', start: Math.round(last.end), end: Math.round(duration), confidence: 'medium' };
        }
        return null;
      }

      /* сериалы */
      var credits = null;
      var bestGap = 0;

      if (duration > 600) {
        var tailGap = duration - last.end;
        if (tailGap >= 30 && tailGap <= 600) {
          bestGap = tailGap;
          credits = { start: last.end, end: duration, confidence: 'medium' };
        }
      }

      var windowStart = Math.max(0, duration - 600);
      for (var i = 0; i < cues.length - 1; i++) {
        if (cues[i].end < windowStart) continue;
        var gap = cues[i + 1].start - cues[i].end;
        if (gap >= 30 && gap <= 420 && gap > bestGap) {
          bestGap = gap;
          credits = { start: cues[i].end, end: cues[i + 1].start, confidence: 'medium' };
        }
      }

      if (keywords.creditsAt != null && keywords.creditsAt > duration * 0.7) {
        if (credits && keywords.creditsAt >= credits.start && keywords.creditsAt <= credits.end) {
          credits.start = keywords.creditsAt;
          credits.confidence = 'high';
        } else if (!credits) {
          credits = { start: keywords.creditsAt, end: duration, confidence: 'medium' };
        }
      }

      if (!credits) return null;
      credits.type = 'credits';
      credits.start = Math.round(credits.start);
      credits.end = Math.round(credits.end);
      return credits;
    }
  };

  /* ================================================================== */
  /*  Детектор по звуку                                                  */
  /* ================================================================== */
  var AudioDetector = {
    _context: null,
    _analyser: null,
    _source: null,
    _connectedEl: null,
    _sampleTimer: null,
    _timeoutTimer: null,

    _stopSampling: function() {
      if (this._sampleTimer) { clearInterval(this._sampleTimer); this._sampleTimer = null; }
      if (this._timeoutTimer) { clearTimeout(this._timeoutTimer); this._timeoutTimer = null; }
    },

    stop: function() { this._stopSampling(); },

    detect: function(video, isMovie) {
      var self = this;
      self._stopSampling();

      return new Promise(function(resolve) {
        var done = false;
        function finish(result) {
          if (done) return;
          done = true;
          self._stopSampling();
          resolve(result);
        }

        try {
          if (!window.AudioContext && !window.webkitAudioContext) return finish(null);

          if (!self._context || self._context.state === 'closed') {
            self._context = new (window.AudioContext || window.webkitAudioContext)();
            self._source = null;
            self._analyser = null;
            self._connectedEl = null;
          }
          if (self._context.state === 'suspended') {
            try { self._context.resume(); } catch (e) {}
          }

          if (self._connectedEl !== video || !self._analyser) {
            try {
              self._source = self._context.createMediaElementSource(video);
              self._analyser = self._context.createAnalyser();
              self._analyser.fftSize = 2048;
              self._source.connect(self._analyser);
              self._analyser.connect(self._context.destination);
              self._connectedEl = video;
            } catch (e) {
              log('AudioDetector: подключение не удалось:', e.message);
              return finish(null);
            }
          }

          var samples = [];
          var buf = new Uint8Array(self._analyser.frequencyBinCount);
          var startTime = video.currentTime;

          self._sampleTimer = setInterval(function() {
            try {
              if (!self._analyser) { self._stopSampling(); return finish(null); }
              if (video.paused) return;

              var t = video.currentTime;
              if (t - startTime > MAX_INTRO_END || t > MAX_INTRO_END + 60) {
                self._stopSampling();
                return finish(samples.length > 10 ? self._analyzeEnergy(samples, isMovie) : null);
              }

              self._analyser.getByteFrequencyData(buf);
              var sum = 0;
              for (var i = 0; i < buf.length; i++) sum += buf[i];
              samples.push({ time: t, energy: sum / buf.length });
            } catch (e) {
              self._stopSampling();
              finish(null);
            }
          }, 500);

          self._timeoutTimer = setTimeout(function() {
            finish(samples.length > 10 ? self._analyzeEnergy(samples, isMovie) : null);
          }, (MAX_INTRO_END + 10) * 1000);
        } catch (e) {
          log('AudioDetector error:', e);
          finish(null);
        }
      });
    },

    _analyzeEnergy: function(samples, isMovie) {
      if (samples.length < 20) return null;

      var smooth = [];
      for (var i = 2; i < samples.length - 2; i++) {
        smooth.push({
          time: samples[i].time,
          energy: (samples[i - 2].energy + samples[i - 1].energy + samples[i].energy + samples[i + 1].energy + samples[i + 2].energy) / 5
        });
      }
      if (smooth.length < 10) return null;

      var energies = [];
      for (var s = 0; s < smooth.length; s++) energies.push(smooth[s].energy);
      energies.sort(function(a, b) { return a - b; });
      var median = energies[Math.floor(energies.length / 2)];
      var loud = median * 1.3;
      var quiet = median * 0.8;

      var loudStart = null, loudCount = 0;
      for (var j = 0; j < smooth.length; j++) {
        var sm = smooth[j];
        if (sm.time > MAX_INTRO_END) break;

        if (sm.energy > loud) {
          if (loudStart == null) { loudStart = sm.time; loudCount = 0; }
          loudCount++;
        } else if (loudStart != null && sm.energy < quiet) {
          var len = sm.time - loudStart;
          if (len >= 15 && len <= 150 && loudCount >= 10) {
            if (isMovie && loudStart > 300) { loudStart = null; loudCount = 0; continue; }
            log('звук: заставка', Math.round(loudStart), '→', Math.round(sm.time));
            return { type: 'intro', start: Math.round(loudStart), end: Math.round(sm.time), confidence: 'medium' };
          }
          loudStart = null;
          loudCount = 0;
        }
      }
      return null;
    },

    destroy: function() {
      /* не закрываем AudioContext и не отключаем source — иначе можно заглушить видео */
      this._stopSampling();
    }
  };

  /* ================================================================== */
  /*  Движок детекции: субтитры + звук параллельно                       */
  /* ================================================================== */
  var DetectionEngine = {
    detect: function(video, isMovie, subsList, onUpdate) {
      var state = { subs: null, audio: null };
      var self = this;

      function emit() {
        onUpdate(self._combine(state.subs, state.audio, isMovie, (video && video.duration) || 0));
      }

      SubtitleDetector.detect(video, isMovie, subsList).then(function(segs) {
        if (segs && segs.length) {
          state.subs = segs;
          emit();
          var hasIntro = false;
          for (var i = 0; i < segs.length; i++) if (segs[i].type === 'intro') { hasIntro = true; break; }
          if (hasIntro) AudioDetector.stop();
        } else {
          /* дорожки могли загрузиться позже — пробуем ещё раз через 10 секунд */
          setTimeout(function() {
            if (state.subs) return;
            SubtitleDetector.detect(video, isMovie, subsList).then(function(segs2) {
              if (state.subs) return;
              state.subs = segs2 || [];
              if (state.subs.length) emit();
            });
          }, 10000);
        }
      });

      AudioDetector.detect(video, isMovie).then(function(seg) {
        state.audio = seg;
        emit();
      });
    },

    _combine: function(subSegments, audioSegment, isMovie, duration) {
      var result = [];
      (subSegments || []).forEach(function(s) {
        result.push({
          type: s.type, start: Math.round(s.start), end: Math.round(s.end),
          confidence: s.confidence || 'medium', source: 'detect'
        });
      });

      if (audioSegment) {
        var audio = {
          type: audioSegment.type, start: Math.round(audioSegment.start), end: Math.round(audioSegment.end),
          confidence: 'medium', source: 'detect'
        };

        var movieLimit = duration ? Math.min(300, duration * 0.15) : 300;
        if (isMovie && audio.type === 'intro' && audio.start > movieLimit) audio = null;

        if (audio) {
          var match = null;
          for (var i = 0; i < result.length; i++) {
            if (result[i].type !== audio.type) continue;
            var overlap = Math.min(result[i].end, audio.end) - Math.max(result[i].start, audio.start);
            if (overlap > 0) { match = result[i]; break; }
          }
          if (match) {
            match.start = Math.min(match.start, audio.start);
            match.confidence = 'high';
            log('субтитры + звук подтвердили сегмент', match.type);
          } else {
            var exists = false;
            for (var k = 0; k < result.length; k++) if (result[k].type === audio.type) { exists = true; break; }
            if (!exists) result.push(audio);
          }
        }
      }

      result.sort(function(a, b) { return a.start - b.start; });
      return result;
    }
  };

  /* ================================================================== */
  /*  API-клиент: таймаут 10с, повторы, фильмы                           */
  /* ================================================================== */
  var ApiClient = {
    _delay: function(ms) {
      return new Promise(function(resolve) { setTimeout(resolve, ms); });
    },

    _fetchOnce: function(url) {
      return new Promise(function(resolve, reject) {
        var aborted = false;
        var xhr = new XMLHttpRequest();
        var timer = setTimeout(function() {
          aborted = true;
          try { xhr.abort(); } catch (e) {}
          reject(new Error('timeout'));
        }, API_TIMEOUT);

        xhr.open('GET', url, true);
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.onreadystatechange = function() {
          if (xhr.readyState !== 4) return;
          clearTimeout(timer);
          if (aborted) return;
          if (xhr.status >= 200 && xhr.status < 300) {
            try { resolve(JSON.parse(xhr.responseText)); }
            catch (e) { reject(e); }
          } else if (xhr.status === 204 || xhr.status === 404) {
            resolve(null);
          } else {
            reject(new Error('HTTP ' + xhr.status));
          }
        };
        xhr.onerror = function() { clearTimeout(timer); reject(new Error('network')); };
        xhr.send();
      });
    },

    _request: function(url) {
      var self = this;
      function attempt(left, delay) {
        return self._fetchOnce(url).catch(function(err) {
          var msg = err && err.message || '';
          var retriable = msg === 'network' || msg === 'timeout' || /^HTTP 5\d\d$/.test(msg);
          if (retriable && left > 0) {
            return self._delay(delay).then(function() {
              return attempt(left - 1, delay * 2);
            });
          }
          throw err;
        });
      }
      return attempt(API_RETRIES, RETRY_DELAY);
    },

    fetchTheIntroDB: function(meta) {
      var url = 'https://api.theintrodb.org/v2/media?tmdb_id=' + encodeURIComponent(meta.tmdbId);
      if (!meta.isMovie) url += '&season=' + meta.season + '&episode=' + meta.episode;
      var self = this;
      return this._request(url).then(function(json) { return self._normalizeTheIntroDB(json); });
    },

    fetchIntroDB: function(meta) {
      var idParam = meta.imdbId
        ? 'imdb=' + encodeURIComponent(meta.imdbId)
        : 'tmdb=' + encodeURIComponent(meta.tmdbId);
      var introUrl = 'https://api.introdb.app/get_intros?' + idParam;
      var creditsUrl = 'https://api.introdb.app/get_credits?' + idParam;
      if (!meta.isMovie) {
        introUrl += '&season=' + meta.season + '&episode=' + meta.episode;
        creditsUrl += '&season=' + meta.season + '&episode=' + meta.episode;
      }
      var self = this;
      var introFailed = false, creditsFailed = false;
      return Promise.all([
        this._request(introUrl).catch(function() { introFailed = true; return null; }),
        this._request(creditsUrl).catch(function() { creditsFailed = true; return null; })
      ]).then(function(res) {
        if (introFailed && creditsFailed) throw new Error('network');
        return self._normalizeIntroDB(res[0], res[1]);
      });
    },

    fetchIntroHater: function(meta) {
      var path = meta.isMovie
        ? encodeURIComponent(meta.imdbId)
        : encodeURIComponent(meta.imdbId + ':' + meta.season + ':' + meta.episode);
      var self = this;
      return this._request('https://introhater.com/api/segments/' + path).then(function(json) {
        return self._normalizeIntroHater(json);
      });
    },

    _normalizeTheIntroDB: function(json) {
      var segments = [];
      if (!json) return segments;
      SEGMENT_TYPES.forEach(function(type) {
        var list = json[type];
        if (Array.isArray(list)) {
          list.forEach(function(item) {
            if (!item) return;
            var start = item.start_ms != null ? item.start_ms / 1000 : (item.start || 0);
            var end = item.end_ms != null ? item.end_ms / 1000 : (item.end || 0);
            if (end > start) {
              segments.push({ type: type, start: start, end: end, confidence: 'high', source: 'theintrodb' });
            }
          });
        }
      });
      return segments;
    },

    _normalizeIntroDB: function(intro, credits) {
      var segments = [];
      if (intro && intro.start != null && intro.end != null && intro.end > intro.start) {
        segments.push({ type: 'intro', start: intro.start, end: intro.end, confidence: 'high', source: 'introdb' });
      }
      if (credits && credits.start != null && credits.end != null && credits.end > credits.start) {
        segments.push({ type: 'credits', start: credits.start, end: credits.end, confidence: 'high', source: 'introdb' });
      }
      return segments;
    },

    _normalizeIntroHater: function(json) {
      var segments = [];
      if (json && Array.isArray(json)) {
        json.forEach(function(item) {
          if (!item || item.start == null || item.end == null || item.end <= item.start) return;
          var type = 'intro';
          var label = (item.label || '').toLowerCase();
          if (label.indexOf('credit') !== -1 || label === 'ed') type = 'credits';
          else if (label.indexOf('recap') !== -1) type = 'recap';
          else if (label.indexOf('preview') !== -1) type = 'preview';
          segments.push({ type: type, start: Math.round(item.start), end: Math.round(item.end), confidence: 'high', source: 'introhater' });
        });
      }
      return segments;
    },

    load: function(meta) {
      var canQuery = !!meta && (meta.isMovie || (meta.season != null && meta.episode != null));
      if (!canQuery || !(meta.tmdbId || meta.imdbId)) {
        return Promise.resolve({ segments: [], cached: false });
      }

      var cached = SegmentCache.get(meta);
      if (cached !== null) return Promise.resolve({ segments: cached, cached: true });

      var self = this;
      var sources = [];

      if (meta.tmdbId) sources.push(function() { return self.fetchTheIntroDB(meta); });
      if (meta.tmdbId || meta.imdbId) sources.push(function() { return self.fetchIntroDB(meta); });
      if (meta.imdbId) sources.push(function() { return self.fetchIntroHater(meta); });

      if (!sources.length) return Promise.resolve({ segments: [], cached: false });

      var hadSuccess = false;

      function runNext(index) {
        if (index >= sources.length) return Promise.resolve([]);
        return sources[index]().then(
          function(segments) { hadSuccess = true; return segments || []; },
          function() { return []; }
        ).then(function(segments) {
          if (segments.length) return segments;
          return runNext(index + 1);
        });
      }

      return runNext(0).then(function(segments) {
        if (segments.length || hadSuccess) SegmentCache.set(meta, segments);
        return { segments: segments, cached: false };
      }).catch(function() {
        return { segments: [], cached: false };
      });
    }
  };

  /* ================================================================== */
  /*  Кнопка в стиле Netflix                                             */
  /* ================================================================== */
  var SkipButton = {
    _button: null,
    _visible: false,
    _progress: null,
    _labelEl: null,
    _hintEl: null,
    _countdownInterval: null,
    _cssReady: false,
    _lastSkipAt: 0,

    _OK_CODES: [13, 29443, 65385],
    _SKIP_NAMES: { enter: 'OK', space: 'Пробел', red: 'Красная', green: 'Зелёная', yellow: 'Жёлтая', blue: 'Синяя' },
    _CANCEL_NAMES: { back: 'Назад', red: 'Красную', green: 'Зелёную', yellow: 'Жёлтую', blue: 'Синюю' },

    _injectCSS: function() {
      if (this._cssReady || document.getElementById('skip-intro-css')) { this._cssReady = true; return; }
      var style = document.createElement('style');
      style.id = 'skip-intro-css';
      style.textContent = [
        '.skip-intro-button{position:absolute;right:40px;bottom:150px;display:flex;align-items:center;padding:13px 26px 13px 20px;background:rgba(10,12,16,.55);-webkit-backdrop-filter:blur(14px) saturate(160%);backdrop-filter:blur(14px) saturate(160%);border:1px solid rgba(255,255,255,.28);border-radius:10px;color:#fff;font-size:1em;font-family:inherit;font-weight:600;letter-spacing:.4px;line-height:1.2;white-space:nowrap;cursor:pointer;z-index:9999;opacity:0;visibility:hidden;pointer-events:none;transform:translateY(14px);outline:none;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,.45);transition:opacity .3s ease,visibility .3s ease,transform .35s cubic-bezier(.22,.8,.32,1),background .25s ease,border-color .25s ease,box-shadow .25s ease}',
        '.skip-intro-button.visible{opacity:1;visibility:visible;pointer-events:auto;transform:translateY(0)}',
        '.skip-intro-button:hover,.skip-intro-button:focus{background:rgba(255,255,255,.16);border-color:rgba(255,255,255,.7);box-shadow:0 0 0 1px rgba(255,255,255,.18),0 0 26px rgba(150,170,255,.35),0 10px 36px rgba(0,0,0,.5);transform:translateY(0) scale(1.06)}',
        '.skip-intro-button .skip-intro-icon{width:22px;height:22px;flex:0 0 22px;margin-right:12px;opacity:.95;transition:transform .25s ease}',
        '.skip-intro-button:hover .skip-intro-icon,.skip-intro-button:focus .skip-intro-icon{transform:translateX(4px)}',
        '.skip-intro-button .skip-intro-hint{font-size:.68em;font-weight:400;opacity:.55;margin-left:13px;padding-left:13px;border-left:1px solid rgba(255,255,255,.25);letter-spacing:.3px}',
        '.skip-intro-button .skip-intro-progress{position:absolute;left:0;bottom:0;height:3px;width:0;background:linear-gradient(90deg,#fff,#b9c6ff);border-radius:0 0 9px 9px;z-index:3;transition:width .12s linear;pointer-events:none}',
        '.skip-intro-button:not(.countdown) .skip-intro-progress{display:none}'
      ].join('\n');
      document.head.appendChild(style);
      this._cssReady = true;
    },

    show: function(label, opts) {
      opts = opts || {};
      this._clearCountdown();
      this._injectCSS();
      this._ensureButton();

      this._button._onSkip = opts.onSkip || null;
      this._button._onCancel = null;
      this._button._withCancel = false;
      this._button.classList.remove('countdown');
      this._updateLabel(label);
      this._updateHint(false);
      if (this._progress) this._progress.style.width = '0%';
      this._setVisible(true);
    },

    showCountdown: function(label, opts) {
      opts = opts || {};
      this._clearCountdown();
      this._injectCSS();
      this._ensureButton();

      this._button._onSkip = opts.onSkip || null;
      this._button._onCancel = opts.onCancel || null;
      this._button._withCancel = true;
      this._button.classList.add('countdown');
      this._updateLabel(label);
      this._updateHint(true);
      if (this._progress) this._progress.style.width = '0%';
      this._setVisible(true);
      this._startCountdown(opts.onSkip, opts.duration || COUNTDOWN_MS);
    },

    hide: function() {
      this._clearCountdown();
      if (this._button) this._setVisible(false);
    },

    _updateLabel: function(label) {
      if (this._labelEl) this._labelEl.textContent = label || SEGMENT_LABELS.intro;
    },

    _updateHint: function(cancelMode) {
      if (!this._hintEl) return;
      if (cancelMode) {
        var cancelName = Lampa.Storage.field('skip_intro_key_cancel') || 'back';
        this._hintEl.textContent = 'нажмите ' + (this._CANCEL_NAMES[cancelName] || 'Назад') + ' для отмены';
      } else {
        var skipName = Lampa.Storage.field('skip_intro_key_skip') || 'enter';
        this._hintEl.textContent = 'нажмите ' + (this._SKIP_NAMES[skipName] || 'OK');
      }
    },

    _ensureButton: function() {
      if (this._button && this._button.parentNode) return;
      if (this._button) this.destroy();
      this._createButton();
    },

    _createButton: function() {
      var self = this;
      var btn = document.createElement('div');
      btn.className = 'skip-intro-button';
      btn.setAttribute('tabindex', '1');
      btn.setAttribute('role', 'button');

      var icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      icon.setAttribute('class', 'skip-intro-icon');
      icon.setAttribute('viewBox', '0 0 24 24');
      icon.setAttribute('fill', 'none');
      icon.setAttribute('stroke', 'currentColor');
      icon.setAttribute('stroke-width', '2.2');
      icon.setAttribute('stroke-linecap', 'round');
      icon.setAttribute('stroke-linejoin', 'round');
      var p1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p1.setAttribute('d', 'M5 5l7 7-7 7');
      var p2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p2.setAttribute('d', 'M13 5l7 7-7 7');
      icon.appendChild(p1);
      icon.appendChild(p2);
      btn.appendChild(icon);

      this._labelEl = document.createElement('span');
      this._labelEl.className = 'skip-intro-label';
      this._labelEl.textContent = SEGMENT_LABELS.intro;
      btn.appendChild(this._labelEl);

      this._hintEl = document.createElement('span');
      this._hintEl.className = 'skip-intro-hint';
      btn.appendChild(this._hintEl);

      this._progress = document.createElement('div');
      this._progress.className = 'skip-intro-progress';
      btn.appendChild(this._progress);

      btn._fireSkip = function() {
        if (!btn.parentNode || !btn.classList.contains('visible')) return;
        var now = Date.now();
        if (now - self._lastSkipAt < 300) return;
        self._lastSkipAt = now;
        if (typeof btn._onSkip === 'function') btn._onSkip();
      };
      btn._fireCancel = function() {
        if (!btn.parentNode || !btn.classList.contains('visible')) return;
        if (typeof btn._onCancel === 'function') btn._onCancel();
      };

      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        btn._fireSkip();
      });

      btn._lampaKeyDown = function(e) {
        if (!btn.parentNode || !btn.classList.contains('visible')) return;
        var code = e.code;
        var skipKeys = Settings.getSkipKeys();
        var cancelKeys = Settings.getCancelKeys();

        if (inArray(skipKeys, code) && !inArray(self._OK_CODES, code)) {
          if (e.event) { e.event.preventDefault(); e.event.stopPropagation(); }
          btn._fireSkip();
        } else if (btn._withCancel && inArray(cancelKeys, code)) {
          if (e.event) { e.event.preventDefault(); e.event.stopPropagation(); }
          btn._fireCancel();
        }
      };

      btn._lampaKeyUp = function(e) {
        if (!btn.parentNode || !btn.classList.contains('visible')) return;
        if (inArray(self._OK_CODES, e.code)) {
          var skipKeys = Settings.getSkipKeys();
          if (skipKeys.indexOf(13) !== -1 || skipKeys.indexOf(29443) !== -1 || skipKeys.indexOf(65385) !== -1) {
            if (e.event) { e.event.preventDefault(); e.event.stopPropagation(); }
            btn._fireSkip();
          }
        }
      };

      try {
        if (Lampa.Keypad && Lampa.Keypad.listener) {
          Lampa.Keypad.listener.follow('keydown', btn._lampaKeyDown);
          Lampa.Keypad.listener.follow('keyup', btn._lampaKeyUp);
        }
      } catch (e) {}

      btn._domKeyDown = function(e) {
        if (!btn.parentNode || !btn.classList.contains('visible')) return;
        var code = e.keyCode;
        var skipKeys = Settings.getSkipKeys();
        var cancelKeys = Settings.getCancelKeys();
        if (inArray(skipKeys, code)) {
          e.preventDefault();
          e.stopPropagation();
          btn._fireSkip();
        } else if (btn._withCancel && inArray(cancelKeys, code)) {
          e.preventDefault();
          e.stopPropagation();
          btn._fireCancel();
        }
      };
      document.addEventListener('keydown', btn._domKeyDown, true);

      this._button = btn;
      var host = document.querySelector('.player') || document.body;
      host.appendChild(btn);
    },

    _startCountdown: function(onSkip, duration) {
      var self = this;
      var startedAt = Date.now();
      this._countdownInterval = setInterval(function() {
        var elapsed = Date.now() - startedAt;
        if (self._progress) {
          self._progress.style.width = Math.min(100, (elapsed / duration) * 100) + '%';
        }
        if (elapsed >= duration) {
          self._clearCountdown();
          if (typeof onSkip === 'function') onSkip();
        }
      }, 50);
    },

    _clearCountdown: function() {
      if (this._countdownInterval) {
        clearInterval(this._countdownInterval);
        this._countdownInterval = null;
      }
    },

    _setVisible: function(visible) {
      this._visible = visible;
      if (!this._button) return;
      if (visible) this._button.classList.add('visible');
      else this._button.classList.remove('visible');
    },

    destroy: function() {
      this._clearCountdown();
      var btn = this._button;
      if (btn) {
        try {
          if (Lampa.Keypad && Lampa.Keypad.listener && typeof Lampa.Keypad.listener.unfollow === 'function') {
            Lampa.Keypad.listener.unfollow('keydown', btn._lampaKeyDown);
            Lampa.Keypad.listener.unfollow('keyup', btn._lampaKeyUp);
          }
          document.removeEventListener('keydown', btn._domKeyDown, true);
        } catch (e) {}
        if (btn.parentNode) btn.parentNode.removeChild(btn);
      }
      this._button = null;
      this._labelEl = null;
      this._hintEl = null;
      this._progress = null;
      this._visible = false;
    }
  };

  /* ================================================================== */
  /*  Главный контроллер                                                 */
  /* ================================================================== */
  var Controller = {
    _video: null,
    _meta: null,
    _segments: [],
    _subsList: [],
    _dismissed: {},
    _autoHandled: {},
    _activeKey: null,
    _shownAuto: null,
    _countdownActive: false,
    _timeHandler: null,
    _generation: 0,
    _initAt: 0,
    _currentSrc: '',
    _rolloverAt: 0,
    _watchdog: null,

    init: function() {
      var self = this;

      /* подписка №1 — основной способ */
      try {
        if (window.Lampa && Lampa.Player && Lampa.Player.listener && Lampa.Player.listener.follow) {
          Lampa.Player.listener.follow('start', function(e) { self._onStart(e, 'player'); });
          Lampa.Player.listener.follow('destroy', function() { self._onDestroy('player'); });
        } else {
          log('Lampa.Player.listener недоступен');
        }
      } catch (e) { log('подписка Player.listener:', e); }

      /* подписка №2 — запасной канал */
      try {
        if (window.Lampa && Lampa.Listener && Lampa.Listener.follow) {
          Lampa.Listener.follow('player', function(e) {
            if (!e || typeof e !== 'object') return;
            if (e.type === 'start') self._onStart(e.data || e, 'listener');
            else if (e.type === 'destroy') self._onDestroy('listener');
          });
        }
      } catch (e) { log('подписка Listener:', e); }

      this._startWatchdog();
    },

    /* ------------------- события плеера ------------------- */

    _onStart: function(e, via) {
      this._rolloverAt = 0;
      if (!Settings.isEnabled()) return;

      var payload = this._normalizePayload(e);
      var meta = this._resolveMeta(payload);

      /* защита от дублей: игнорируем только если недавно инициализировались
         и новые данные НЕ лучше имеющихся */
      if (Date.now() - this._initAt < 2000 && this._meta &&
          this._metaQuality(meta) <= this._metaQuality(this._meta)) {
        return;
      }

      log('start (' + via + '): ' + (meta.isMovie ? 'фильм' : 'сериал S' + meta.season + 'E' + meta.episode) +
          ', tmdb=' + meta.tmdbId + ', imdb=' + meta.imdbId + (meta.title ? ', «' + meta.title + '»' : ''));

      try {
        if (payload && typeof payload === 'object') {
          var keys = Object.keys(payload);
          log('payload:', keys.slice(0, 25).join(','));
        }
      } catch (e2) {}

      this._initPlayback(meta, payload, null);
    },

    _onDestroy: function(via) {
      this._generation++;
      this._teardownPlayback();
      this._meta = null;
      this._subsList = [];
      SkipButton.destroy();
      log('destroy (' + via + ')');
    },

    /* ------------------- инициализация ------------------- */

    _normalizePayload: function(e) {
      if (!e || typeof e !== 'object') return null;
      if (typeof e.type === 'string' && e.data && typeof e.data === 'object') return e.data;
      return e;
    },

    _metaQuality: function(m) {
      if (!m) return -1;
      var q = 0;
      if (m.tmdbId || m.imdbId) q += 2;
      if (!m.isMovie) q += 1;
      return q;
    },

    _initPlayback: function(meta, payload, knownVideo) {
      var gen = ++this._generation;
      this._initAt = Date.now();
      this._teardownPlayback();

      this._meta = meta;
      this._subsList = this._collectSubtitles(payload);

      if (meta && meta.isMovie && !Settings.isMoviesEnabled()) {
        log('фильмы отключены в настройках');
        return;
      }

      var self = this;
      this._findVideo(function(video) {
        if (gen !== self._generation) return;
        self._video = video;
        self._timeHandler = function() { self._onTimeUpdate(); };
        try { video.addEventListener('timeupdate', self._timeHandler); } catch (e) {}
        self._loadSegments();
      }, knownVideo);
    },

    _teardownPlayback: function() {
      if (this._video && this._timeHandler) {
        try { this._video.removeEventListener('timeupdate', this._timeHandler); } catch (e) {}
      }
      this._video = null;
      this._timeHandler = null;
      this._segments = [];
      this._dismissed = {};
      this._autoHandled = {};
      this._activeKey = null;
      this._shownAuto = null;
      this._countdownActive = false;
      this._currentSrc = '';
      SkipButton.hide();
      AudioDetector.stop();
    },

    _findVideo: function(cb, knownVideo) {
      var self = this;
      if (knownVideo) { cb(knownVideo); return; }
      var gen = this._generation;
      var attempt = 0;
      (function poll() {
        if (gen !== self._generation) return;
        var video = document.querySelector('.player video') || document.querySelector('video');
        if (video) { cb(video); return; }
        if (attempt++ < 60) setTimeout(poll, 500);
      })();
    },

    _videoSrc: function(video) {
      try { return video.currentSrc || video.src || ''; } catch (e) { return ''; }
    },

    /* ------------------- сторож (watchdog) ------------------- */
    /* если событие start не пришло — заметим воспроизведение сами */

    _startWatchdog: function() {
      var self = this;
      if (this._watchdog) return;
      this._watchdog = setInterval(function() {
        try {
          if (!Settings.isEnabled()) return;

          if (self._meta) { self._checkRolloverSrc(); return; }

          var video = document.querySelector('.player video') || document.querySelector('video');
          if (!video) return;
          var src = self._videoSrc(video);
          if (!src || video.paused || video.currentTime <= 0) return;

          log('watchdog: воспроизведение идёт без события start — включаюсь сам');
          self._initPlayback(self._resolveMeta(null), null, video);
        } catch (e) {}
      }, 2000);
    },

    _checkRolloverSrc: function() {
      var video = this._video;
      if (!video) return;
      var src = this._videoSrc(video);
      if (!src) return;

      if (!this._currentSrc) { this._currentSrc = src; return; }
      if (src === this._currentSrc) { this._rolloverAt = 0; return; }

      /* src мог смениться посреди воспроизведения (смена качества) — не реагируем */
      if (video.currentTime >= 15) return;

      /* начало нового видео (например, следующая серия) без события start */
      if (!this._rolloverAt) { this._rolloverAt = Date.now(); return; }
      if (Date.now() - this._rolloverAt < 5000) return; /* даём шанс прийти событию start */

      this._rolloverAt = 0;
      log('watchdog: смена видео без события start — переинициализация');
      this._initPlayback(this._resolveMeta(null), null, video);
    },

    /* ------------------- метаданные ------------------- */

    _collectSubtitles: function(payload) {
      var result = [];
      if (!payload || typeof payload !== 'object') return result;
      var keys = ['subtitle', 'subtitles', 'subs', 'customSubs'];
      for (var i = 0; i < keys.length; i++) {
        var arr = payload[keys[i]];
        if (arr && typeof arr === 'object') {
          if (!Array.isArray(arr)) arr = [arr];
          for (var j = 0; j < arr.length; j++) {
            if (arr[j] && arr[j].url) result.push(arr[j]);
          }
        }
      }
      if (result.length) log('субтитров найдено:', result.length);
      return result;
    },

    _num: function(v) {
      if (v == null) return null;
      var n = parseInt(v, 10);
      return isNaN(n) ? null : n;
    },

    _currentPlaylistItem: function() {
      try {
        if (!window.Lampa || !Lampa.Player) return null;
        var playlist = typeof Lampa.Player.playlist === 'function' ? Lampa.Player.playlist() : null;
        if (!playlist || !playlist.length) return null;
        if (typeof Lampa.Player.played === 'function') {
          var p = Lampa.Player.played();
          if (typeof p === 'number' && playlist[p]) return playlist[p];
          if (p && typeof p === 'object') return p;
        }
      } catch (e) {}
      return null;
    },

    _looksLikeCard: function(node) {
      if (node.url) return false;             /* это видео-объект, не карточка */
      if (node.id == null) return false;
      var hasName = !!(node.title || node.name || node.original_title || node.original_name);
      var hasCardField = !!(node.poster_path || node.backdrop_path || node.release_date ||
        node.first_air_date || node.number_of_seasons || node.original_title || node.original_name);
      return hasName && hasCardField;
    },

    /* глубокий скан объекта в поисках id/сезона/эпизода */
    _scanMeta: function(node, depth, res, visited) {
      if (!node || typeof node !== 'object' || depth > 4) return;
      if (node.nodeType) return; /* DOM-узлы пропускаем */
      if (visited.length > 400) return;
      if (visited.indexOf(node) !== -1) return;
      visited.push(node);

      var i;

      if (Array.isArray(node)) {
        var n = Math.min(node.length, 40);
        for (i = 0; i < n; i++) this._scanMeta(node[i], depth + 1, res, visited);
        return;
      }

      if (res.season == null && node.season != null) {
        var s = this._num(node.season);
        if (s != null) res.season = s;
      }
      if (res.episode == null && node.episode != null) {
        var ep = this._num(node.episode);
        if (ep != null) res.episode = ep;
      }

      if (res.tvId == null && node.tv_id != null) {
        var tv = this._num(node.tv_id);
        if (tv != null) res.tvId = tv;
      }
      if (res.tmdbId == null && node.tmdb_id != null) {
        var tm = this._num(node.tmdb_id);
        if (tm != null) res.tmdbId = tm;
      }
      if (res.imdbId == null && typeof node.imdb_id === 'string' && node.imdb_id) {
        res.imdbId = node.imdb_id;
      }

      if (res.cardId == null && node.id != null && this._looksLikeCard(node)) {
        var cid = this._num(node.id);
        if (cid != null) {
          res.cardId = cid;
          res.cardIsTv = !!(node.number_of_seasons || node.first_air_date ||
            node.original_name || node.last_episode_to_air || node.next_episode_to_air || node.episode_run_time);
        }
      }

      if (node.number_of_seasons != null && this._num(node.number_of_seasons) > 0) res.tvMarkers++;
      if (node.first_air_date || node.original_name || node.last_episode_to_air || node.next_episode_to_air) res.tvMarkers++;
      if (node.seasons && Array.isArray(node.seasons) && node.seasons.length) res.tvMarkers++;

      if (!res.title) res.title = node.title || node.name || '';

      for (var key in node) {
        if (!Object.prototype.hasOwnProperty.call(node, key)) continue;
        var v = node[key];
        if (v && typeof v === 'object') this._scanMeta(v, depth + 1, res, visited);
      }
    },

    _resolveMeta: function(payload) {
      var res = { season: null, episode: null, tvId: null, tmdbId: null, imdbId: null, cardId: null, cardIsTv: false, tvMarkers: 0, title: '' };
      var visited = [];

      try { this._scanMeta(payload, 0, res, visited); } catch (e) { log('scan payload:', e); }

      /* запасной источник №1 — текущий элемент плейлиста */
      try {
        var item = this._currentPlaylistItem();
        if (item && item !== payload) this._scanMeta(item, 0, res, visited);
      } catch (e) {}

      /* запасной источник №2 — активная страница (карточка фильма/сериала) */
      try {
        if (window.Lampa && Lampa.Activity && typeof Lampa.Activity.active === 'function') {
          var act = Lampa.Activity.active();
          if (act) {
            var wrap = {};
            if (act.movie) wrap.movie = act.movie;
            if (act.card) wrap.card = act.card;
            if (act.season != null) wrap.season = act.season;
            if (act.episode != null) wrap.episode = act.episode;
            this._scanMeta(wrap, 0, res, visited);
          }
        }
      } catch (e) {}

      var hasEpisodeInfo = res.season != null && res.episode != null;
      var isTv = hasEpisodeInfo || res.tvMarkers > 0 || res.cardIsTv;
      var isMovie = !isTv;

      var tmdbId = null;
      if (isTv) {
        tmdbId = res.tvId != null ? res.tvId : (res.tmdbId != null ? res.tmdbId : res.cardId);
      } else {
        tmdbId = res.tmdbId != null ? res.tmdbId : (res.cardId != null ? res.cardId : res.tvId);
      }

      /* у видео-объекта фильма id — это tmdb id */
      if (isMovie && tmdbId == null && payload && payload.url && payload.id != null) {
        var pid = this._num(payload.id);
        if (pid != null) tmdbId = pid;
      }

      var contentKey = null;
      if (tmdbId != null) contentKey = (isMovie ? 'm' : 's') + tmdbId;
      else if (res.imdbId) contentKey = 'i' + res.imdbId;

      return {
        tmdbId: tmdbId,
        imdbId: res.imdbId || null,
        season: isMovie ? null : res.season,
        episode: isMovie ? null : res.episode,
        isMovie: isMovie,
        title: res.title || '',
        trackable: !!(tmdbId || res.imdbId),
        contentKey: contentKey
      };
    },

    /* ------------------- загрузка сегментов ------------------- */

    _loadSegments: function() {
      var self = this;
      var meta = this._meta;
      var video = this._video;
      if (!meta || !video) return;

      function apply(segments, from) {
        if (self._meta !== meta) return;
        var clean = self._sanitizeSegments(segments, video.duration || 0);
        if (clean.length) {
          self._segments = clean;
          var info = [];
          for (var i = 0; i < clean.length; i++) {
            info.push(clean[i].type + ' ' + clean[i].start + '-' + clean[i].end);
          }
          log('сегменты (' + from + '):', info.join(', '));
        }
      }

      if (!meta.trackable) {
        log('нет ID — работает только умная детекция');
        this._startDetection();
        return;
      }

      ApiClient.load(meta).then(function(res) {
        if (self._meta !== meta) return;
        if (res.segments && res.segments.length) {
          apply(res.segments, res.cached ? 'кэш' : 'база');
        } else {
          var detected = DetectedCache.get(meta);
          if (detected && detected.length) {
            apply(detected, 'кэш детекции');
          } else {
            self._startDetection();
          }
        }
      });
    },

    _startDetection: function() {
      if (!Settings.isDetectEnabled() || !this._video || !this._meta) return;
      var self = this;
      var meta = this._meta;
      var gen = this._generation;

      DetectionEngine.detect(this._video, meta.isMovie, this._subsList, function(segments) {
        if (gen !== self._generation || self._meta !== meta || !segments || !segments.length) return;
        var clean = self._sanitizeSegments(segments, self._video ? self._video.duration || 0 : 0);
        if (!clean.length) return;
        self._segments = clean;
        if (meta.trackable) DetectedCache.set(meta, clean);
        log('детекция: найдено сегментов —', clean.length);
      });
    },

    _sanitizeSegments: function(segments, duration) {
      var result = [];
      (segments || []).forEach(function(s) {
        if (!s || s.start == null || s.end == null) return;
        var start = Number(s.start);
        var end = Number(s.end);
        if (isNaN(start) || isNaN(end) || end - start < 5) return;
        if (duration && start > duration - 5) return;
        if (duration) end = Math.min(end, duration);
        if (end - start < 5) return;
        result.push({
          type: s.type,
          start: Math.max(0, Math.round(start)),
          end: Math.round(end),
          confidence: s.confidence || 'high',
          source: s.source || ''
        });
      });
      result.sort(function(a, b) { return a.start - b.start; });
      return result;
    },

    /* ------------------- мониторинг воспроизведения ------------------- */

    _onTimeUpdate: function() {
      if (!this._video || !this._meta) return;

      var video = this._video;
      var t = video.currentTime;

      var src = this._videoSrc(video);
      if (src && !this._currentSrc) this._currentSrc = src;

      if (!this._segments.length) return;

      var seg = this._findActive(t);

      if (!seg || seg.end - t < 5) {
        if (this._activeKey !== null || this._countdownActive) {
          this._activeKey = null;
          this._shownAuto = null;
          this._countdownActive = false;
          SkipButton.hide();
        }
        return;
      }

      var key = this._segmentKey(seg);
      var smartSkipHit = this._meta.trackable && SmartSkip.hasSkipped(this._meta.contentKey, seg.type);
      var wantAuto = !this._dismissed[key] && !this._autoHandled[key] &&
        (Settings.isAutoSkip() || smartSkipHit);

      /* уже показано в нужном режиме для этого сегмента */
      if (key === this._activeKey && wantAuto === this._shownAuto) return;

      this._activeKey = key;
      this._shownAuto = wantAuto;

      var self = this;
      var label = SEGMENT_LABELS[seg.type] || SEGMENT_LABELS.intro;

      if (wantAuto) {
        this._autoHandled[key] = true;
        this._countdownActive = true;
        SkipButton.showCountdown(label, {
          onSkip: function() { self._countdownActive = false; self._skipSegment(seg); },
          onCancel: function() { self._cancelSegment(seg); }
        });
      } else {
        SkipButton.show(label, {
          onSkip: function() { self._skipSegment(seg); }
        });
      }
    },

    _findActive: function(t) {
      for (var i = 0; i < this._segments.length; i++) {
        var s = this._segments[i];
        if (t >= s.start && t < s.end - 2 && Settings.isTypeEnabled(s.type)) return s;
      }
      return null;
    },

    _segmentKey: function(seg) {
      return seg.type + ':' + seg.start + ':' + seg.end;
    },

    _skipSegment: function(seg) {
      if (!this._video) return;
      var target = seg.end;
      var d = this._video.duration || 0;
      if (d) target = Math.min(target, d);
      try { this._video.currentTime = Math.max(0, target); } catch (e) {}

      if (this._meta && this._meta.trackable) {
        SmartSkip.rememberSkip(this._meta.contentKey, seg.type);
      }

      this._countdownActive = false;
      this._activeKey = null;
      this._shownAuto = null;
      SkipButton.hide();
      log('пропущено:', seg.type, seg.start, '→', seg.end);
    },

    _cancelSegment: function(seg) {
      this._dismissed[this._segmentKey(seg)] = true;
      this._countdownActive = false;
      if (this._meta && this._meta.trackable) {
        SmartSkip.forgetSkip(this._meta.contentKey, seg.type);
      }
      SkipButton.hide();
      log('автопропуск отменён:', seg.type);
    }
  };

  /* ================================================================== */
  /*  Запуск                                                             */
  /* ================================================================== */
  try { Settings.init(); } catch (e) { log('Settings.init:', e); }
  try { Controller.init(); } catch (e) { log('Controller.init:', e); }
  log('плагин загружен, версия ' + window.__skipIntroVersion);

})();
