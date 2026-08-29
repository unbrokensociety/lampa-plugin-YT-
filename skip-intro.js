!function() {
    "use strict";
    
    if (window.__skipIntroLoaded) return;
    window.__skipIntroLoaded = !0;

    // ============================================================
    // 1. ИНИЦИАЛИЗАЦИЯ ПЛАГИНА В СПИСКЕ ПЛАГИНОВ LAMPA
    // ============================================================
    try {
        var t = Lampa.Storage.get("plugins", "[]");
        if ("string" == typeof t && (t = JSON.parse(t)), Array.isArray(t)) {
            var e = !1;
            t.forEach(function(t) {
                t.url && -1 !== t.url.indexOf("lampa-auto-skip") && (
                    t.name && "Skip Intro/Outro" === t.name || (t.name = "Skip Intro/Outro (Enhanced)", e = !0),
                    t.author && "@vahagn" === t.author || (t.author = "@vahagn + enhanced", e = !0)
                )
            }), e && Lampa.Storage.set("plugins", JSON.stringify(t))
        }
    } catch (t) {}

    // ============================================================
    // 2. КОНСТАНТЫ И НАСТРОЙКИ
    // ============================================================
    var API_BASE = "https://api.introdb.app";
    var API_TIMEOUT = 8000;
    var MAX_INTRO_DURATION = 360;
    var LABELS = {
        intro: "Пропустить заставку",
        recap: "Пропустить рекап",
        credits: "Пропустить титры",
        preview: "Пропустить превью",
        loading: "Поиск заставки...",
        not_found: "Заставка не найдена"
    };
    var SEGMENT_TYPES = ["intro", "recap", "credits", "preview"];

    // ============================================================
    // 3. МОДУЛЬ НАСТРОЕК (Settings)
    // ============================================================
    var Settings = {
        init: function() {
            Lampa.SettingsApi.addComponent({
                component: "skip_intro",
                name: "Пропуск заставок (Enhanced)",
                icon: '<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line></svg>'
            });

            var params = [
                { name: "skip_intro_enabled", default: !0, field: { name: "Включить плагин", description: "Показывать кнопку пропуска заставок и титров" } },
                { name: "skip_intro_auto", default: !1, field: { name: "Всегда автопропуск", description: "Всегда перематывать без кнопки (для всех сериалов и фильмов)" } },
                { name: "skip_intro_detect", default: !0, field: { name: "Умное обнаружение", description: "Определять заставку по субтитрам и звуку, если нет данных в базе" } },
                { name: "skip_intro_movies", default: !0, field: { name: "Включить для фильмов", description: "Искать и пропускать сегменты в фильмах (обычно титры)" } },
                { name: "skip_intro_type_intro", default: !0, field: { name: "Пропускать заставку (intro)" } },
                { name: "skip_intro_type_recap", default: !0, field: { name: "Пропускать рекап (recap)" } },
                { name: "skip_intro_type_credits", default: !0, field: { name: "Пропускать титры (credits)" } },
                { name: "skip_intro_type_preview", default: !1, field: { name: "Пропускать превью (preview)" } }
            ];

            params.forEach(function(p) {
                Lampa.SettingsApi.addParam({
                    component: "skip_intro",
                    param: { name: p.name, type: "trigger", default: p.default },
                    field: p.field
                });
            });

            Lampa.SettingsApi.addParam({
                component: "skip_intro",
                param: {
                    name: "skip_intro_key_skip",
                    type: "select",
                    values: { enter: "Enter / OK", space: "Пробел", red: "Красная (403)", green: "Зелёная (404)", yellow: "Жёлтая (405)", blue: "Синяя (406)" },
                    default: "enter"
                },
                field: { name: "Кнопка «Пропустить»", description: "Какая кнопка на пульте пропускает сегмент" }
            });

            Lampa.SettingsApi.addParam({
                component: "skip_intro",
                param: {
                    name: "skip_intro_key_cancel",
                    type: "select",
                    values: { back: "Назад (Back)", red: "Красная (403)", green: "Зелёная (404)", yellow: "Жёлтая (405)", blue: "Синяя (406)" },
                    default: "back"
                },
                field: { name: "Кнопка «Отменить»", description: "Какая кнопка на пульте отменяет автопропуск" }
            });
        },

        isEnabled: function() {
            return !1 !== Lampa.Storage.field("skip_intro_enabled");
        },
        isAutoSkip: function() {
            return !0 === Lampa.Storage.field("skip_intro_auto");
        },
        isDetectEnabled: function() {
            return !1 !== Lampa.Storage.field("skip_intro_detect");
        },
        isMoviesEnabled: function() {
            return !1 !== Lampa.Storage.field("skip_intro_movies");
        },
        isTypeEnabled: function(t) {
            return !1 !== Lampa.Storage.field("skip_intro_type_" + t);
        },

        _keyMap: {
            enter: [13],
            space: [32],
            back: [8, 27, 10009, 461, 4],
            red: [403],
            green: [404],
            yellow: [405],
            blue: [406]
        },

        getSkipKeys: function() {
            var t = Lampa.Storage.field("skip_intro_key_skip") || "enter";
            return this._keyMap[t] || this._keyMap.enter;
        },
        getCancelKeys: function() {
            var t = Lampa.Storage.field("skip_intro_key_cancel") || "back";
            return this._keyMap[t] || this._keyMap.back;
        }
    };

    // ============================================================
    // 4. SMART SKIP (запоминание ручного пропуска)
    // ============================================================
    var SmartSkip = {
        _storageKey: "skip_intro_smart_v2",

        _getAll: function() {
            try {
                var t = Lampa.Storage.get(this._storageKey, "{}");
                return "string" == typeof t && (t = JSON.parse(t)), t || {};
            } catch (t) { return {}; }
        },

        _saveAll: function(t) {
            try { Lampa.Storage.set(this._storageKey, JSON.stringify(t)); } catch (t) {}
        },

        _getKey: function(tmdbId, type) {
            return tmdbId + "_" + type;
        },

        hasSkipped: function(tmdbId, type) {
            return !0 === this._getAll()[this._getKey(tmdbId, type)];
        },

        rememberSkip: function(tmdbId, type) {
            var data = this._getAll();
            data[this._getKey(tmdbId, type)] = !0;
            this._saveAll(data);
            console.log("[SkipIntro] Smart skip remembered for", tmdbId, type);
        },

        forgetSkip: function(tmdbId, type) {
            var data = this._getAll();
            delete data[this._getKey(tmdbId, type)];
            this._saveAll(data);
            console.log("[SkipIntro] Smart skip forgotten for", tmdbId, type);
        }
    };

    // ============================================================
    // 5. API КЭШ (локальное хранилище)
    // ============================================================
    var ApiCache = {
        _prefix: "skip_api_",

        _getKey: function(tmdbId, season, episode) {
            return this._prefix + tmdbId + "_s" + (season || "0") + "_e" + (episode || "0");
        },

        get: function(tmdbId, season, episode) {
            try {
                var data = localStorage.getItem(this._getKey(tmdbId, season, episode));
                if (!data) return null;
                var parsed = JSON.parse(data);
                if (parsed && parsed._ts) {
                    if (Date.now() - parsed._ts > 604800000) { // 7 дней
                        localStorage.removeItem(this._getKey(tmdbId, season, episode));
                        return null;
                    }
                    return parsed.segments || null;
                }
                return null;
            } catch (t) { return null; }
        },

        set: function(tmdbId, season, episode, segments) {
            try {
                localStorage.setItem(this._getKey(tmdbId, season, episode), JSON.stringify({
                    segments: segments,
                    _ts: Date.now()
                }));
            } catch (t) {}
        }
    };

    // ============================================================
    // 6. КЭШ ДЕТЕКТОРА (обнаруженные сегменты)
    // ============================================================
    var DetectCache = {
        _storageKey: "skip_intro_detected_v2",
        _ttl: 2592000000, // 30 дней

        _getAll: function() {
            try {
                var t = Lampa.Storage.get(this._storageKey, "{}");
                return "string" == typeof t && (t = JSON.parse(t)), t || {};
            } catch (t) { return {}; }
        },

        _saveAll: function(t) {
            try { Lampa.Storage.set(this._storageKey, JSON.stringify(t)); } catch (t) {}
        },

        _getKey: function(tmdbId, season, episode) {
            return tmdbId + "_s" + (season || "0") + "_e" + (episode || "0");
        },

        get: function(tmdbId, season, episode) {
            var data = this._getAll();
            var key = this._getKey(tmdbId, season, episode);
            var cached = data[key];
            if (cached) {
                if (cached._ts && Date.now() - cached._ts > this._ttl) {
                    delete data[key];
                    this._saveAll(data);
                    return null;
                }
                return cached.segments || null;
            }
            return null;
        },

        set: function(tmdbId, season, episode, segments) {
            var data = this._getAll();
            data[this._getKey(tmdbId, season, episode)] = {
                segments: segments,
                _ts: Date.now()
            };
            this._saveAll(data);
            console.log("[SkipIntro] Detected segments cached for TMDB:", tmdbId, "S" + (season || "0") + "E" + (episode || "0"), segments.length, "segments");
        }
    };

    // ============================================================
    // 7. ДЕТЕКТОР СУБТИТРОВ (улучшенный)
    // ============================================================
    var SubtitleDetector = {
        detect: function(videoElement) {
            var duration = videoElement.duration || 0;
            var self = this;

            return new Promise(function(resolve) {
                try {
                    // Пытаемся получить субтитры из разных источников
                    var subtitles = self._getSubtitles(videoElement);
                    if (!subtitles || subtitles.length < 5) {
                        console.log("[SkipIntro] Not enough subtitles for detection");
                        return resolve([]);
                    }

                    var segments = self._analyzeSubtitles(subtitles, duration);
                    resolve(segments);
                } catch (t) {
                    console.log("[SkipIntro] SubtitleDetector error:", t);
                    resolve([]);
                }
            });
        },

        _getSubtitles: function(videoElement) {
            var cues = [];

            // 1. Пробуем textTracks
            if (videoElement.textTracks) {
                for (var i = 0; i < videoElement.textTracks.length; i++) {
                    var track = videoElement.textTracks[i];
                    if (track.cues && track.cues.length > 5) {
                        for (var j = 0; j < track.cues.length; j++) {
                            cues.push({
                                start: track.cues[j].startTime,
                                end: track.cues[j].endTime,
                                text: track.cues[j].text || ""
                            });
                        }
                        break;
                    }
                }
            }

            // 2. Пробуем customSubs (если есть)
            if (cues.length < 5 && videoElement.customSubs) {
                // Здесь можно добавить загрузку внешних субтитров
                // Пока пропускаем, т.к. требует асинхронной загрузки
            }

            return cues;
        },

        _analyzeSubtitles: function(cues, duration) {
            if (!cues || cues.length < 5) return [];

            // Сортируем по времени
            cues.sort(function(a, b) { return a.start - b.start; });

            var segments = [];
            var self = this;

            // 1. Поиск заставки в начале (intro)
            var intro = self._findIntro(cues);
            if (intro) {
                intro._source = "subs";
                segments.push(intro);
            }

            // 2. Поиск титров в конце (credits)
            var credits = self._findCredits(cues, duration);
            if (credits) {
                credits._source = "subs";
                segments.push(credits);
            }

            // 3. Поиск рекапа и превью (если есть)
            var recap = self._findRecap(cues);
            if (recap) {
                recap._source = "subs";
                segments.push(recap);
            }

            // 4. Удаляем дубликаты и сортируем по времени
            segments = self._mergeSegments(segments);

            console.log("[SkipIntro] Found", segments.length, "segments from subtitles");
            return segments;
        },

        _findIntro: function(cues) {
            if (cues.length < 2) return null;

            // Проверяем первую реплику - она должна начинаться не раньше 10 секунд и не позже 150
            var first = cues[0];
            if (first.start < 10 || first.start > 150) return null;

            // Проверяем текст на ключевые слова (заставка)
            var keywords = ["intro", "заставк", "theme", "opening", "title"];
            var textMatch = this._checkKeywords(first.text, keywords);
            
            // Ищем большой промежуток до следующей реплики
            var gap = this._findLargeGap(cues, 0, 15, 150);
            if (gap && gap.start > 5) {
                return {
                    type: "intro",
                    start: 0,
                    end: Math.round(gap.start),
                    _source: "subs"
                };
            }

            // Если нашли по ключевым словам
            if (textMatch && first.start > 5 && first.start < 100) {
                return {
                    type: "intro",
                    start: 0,
                    end: Math.round(first.start),
                    _source: "subs"
                };
            }

            return null;
        },

        _findCredits: function(cues, duration) {
            if (duration < 600 || cues.length < 5) return null;

            // Ищем большой промежуток в конце
            var last = cues[cues.length - 1];
            if (duration - last.end > 30) {
                return {
                    type: "credits",
                    start: Math.round(last.end),
                    end: Math.round(duration),
                    _source: "subs"
                };
            }

            // Проверяем последние 10% видео на ключевые слова
            var threshold = duration * 0.9;
            var keywords = ["credit", "титр", "cast", "star", "director", "producer", "writer"];
            var match = null;

            for (var i = cues.length - 1; i >= 0; i--) {
                var cue = cues[i];
                if (cue.start < threshold) break;
                if (this._checkKeywords(cue.text, keywords)) {
                    match = cue;
                    break;
                }
            }

            if (match && duration - match.end > 10) {
                return {
                    type: "credits",
                    start: Math.round(match.end),
                    end: Math.round(duration),
                    _source: "subs"
                };
            }

            return null;
        },

        _findRecap: function(cues) {
            var keywords = ["previously", "recap", "в прошлом", "ранее", "напомним"];
            for (var i = 0; i < Math.min(cues.length, 20); i++) {
                if (this._checkKeywords(cues[i].text, keywords)) {
                    var start = Math.max(0, cues[i].start - 2);
                    var end = cues[i].end + 2;
                    return {
                        type: "recap",
                        start: Math.round(start),
                        end: Math.round(end),
                        _source: "subs"
                    };
                }
            }
            return null;
        },

        _findLargeGap: function(cues, startIdx, minGap, maxGap) {
            for (var i = startIdx; i < cues.length - 1; i++) {
                var gap = cues[i + 1].start - cues[i].end;
                if (gap >= minGap && gap <= maxGap) {
                    return {
                        start: cues[i].end,
                        end: cues[i + 1].start
                    };
                }
            }
            return null;
        },

        _checkKeywords: function(text, keywords) {
            if (!text) return false;
            text = text.toLowerCase();
            for (var i = 0; i < keywords.length; i++) {
                if (text.indexOf(keywords[i]) !== -1) return true;
            }
            return false;
        },

        _mergeSegments: function(segments) {
            if (!segments || segments.length < 2) return segments;

            var merged = [];
            segments.sort(function(a, b) { return a.start - b.start; });

            for (var i = 0; i < segments.length; i++) {
                var current = segments[i];
                if (merged.length === 0) {
                    merged.push(current);
                    continue;
                }

                var last = merged[merged.length - 1];
                // Если сегменты перекрываются или касаются
                if (current.start <= last.end + 2) {
                    // Объединяем
                    last.end = Math.max(last.end, current.end);
                    // Если типы разные, оставляем первый
                } else {
                    merged.push(current);
                }
            }

            return merged;
        }
    };

    // ============================================================
    // 8. ДЕТЕКТОР ЗВУКА (улучшенный)
    // ============================================================
    var AudioDetector = {
        _context: null,
        _analyser: null,
        _source: null,
        _connected: !1,
        _sampleTimer: null,
        _timeoutTimer: null,

        _stopSampling: function() {
            if (this._sampleTimer) {
                clearInterval(this._sampleTimer);
                this._sampleTimer = null;
            }
            if (this._timeoutTimer) {
                clearTimeout(this._timeoutTimer);
                this._timeoutTimer = null;
            }
        },

        detect: function(videoElement) {
            var self = this;
            self._stopSampling();

            return new Promise(function(resolve) {
                var resolved = !1;

                function done(result) {
                    if (!resolved) {
                        resolved = !0;
                        resolve(result);
                    }
                }

                try {
                    if (!window.AudioContext && !window.webkitAudioContext) {
                        console.log("[SkipIntro] Web Audio API not available");
                        return done(null);
                    }

                    if (!self._context || self._context.state === "closed") {
                        try {
                            self._context = new(window.AudioContext || window.webkitAudioContext)();
                        } catch (t) {
                            console.log("[SkipIntro] AudioDetector: cannot create AudioContext:", t.message);
                            return done(null);
                        }
                    }

                    if (!self._connected || !self._analyser) {
                        self._source = null;
                        self._analyser = null;
                        self._connected = !1;
                        try {
                            self._source = self._context.createMediaElementSource(videoElement);
                            self._analyser = self._context.createAnalyser();
                            self._analyser.fftSize = 2048;
                            self._source.connect(self._analyser);
                            self._analyser.connect(self._context.destination);
                            self._connected = !0;
                        } catch (t) {
                            console.log("[SkipIntro] AudioDetector connect error:", t.message);
                            return done(null);
                        }
                    }

                    if (!self._analyser) return done(null);

                    var samples = [];
                    var dataArray = new Uint8Array(self._analyser.frequencyBinCount);
                    var startTime = videoElement.currentTime;
                    var lastLogTime = 0;

                    self._sampleTimer = setInterval(function() {
                        if (!self._analyser) {
                            self._stopSampling();
                            return done(self._analyzeEnergy(samples));
                        }

                        try {
                            var currentTime = videoElement.currentTime;
                            if (currentTime - startTime > MAX_INTRO_DURATION || currentTime > 420) {
                                self._stopSampling();
                                return done(self._analyzeEnergy(samples));
                            }

                            self._analyser.getByteFrequencyData(dataArray);
                            var sum = 0;
                            for (var i = 0; i < dataArray.length; i++) {
                                sum += dataArray[i];
                            }
                            var energy = sum / dataArray.length;
                            samples.push({ time: currentTime, energy: energy });

                            // Логируем прогресс каждые 10 секунд
                            if (currentTime - lastLogTime > 10) {
                                lastLogTime = currentTime;
                                console.log("[SkipIntro] Audio analysis:", Math.round(currentTime) + "s, samples: " + samples.length);
                            }
                        } catch (t) {
                            console.log("[SkipIntro] AudioDetector sample error:", t);
                            self._stopSampling();
                            done(null);
                        }
                    }, 500);

                    self._timeoutTimer = setTimeout(function() {
                        self._stopSampling();
                        done(self._analyzeEnergy(samples));
                    }, 370000);

                } catch (t) {
                    console.log("[SkipIntro] AudioDetector error:", t);
                    done(null);
                }
            });
        },

        _analyzeEnergy: function(samples) {
            if (!samples || samples.length < 20) return null;

            console.log("[SkipIntro] Analyzing audio samples:", samples.length);

            // Сглаживание (moving average)
            var smoothed = [];
            for (var i = 2; i < samples.length - 2; i++) {
                var avg = (samples[i - 2].energy + samples[i - 1].energy + samples[i].energy + samples[i + 1].energy + samples[i + 2].energy) / 5;
                smoothed.push({ time: samples[i].time, energy: avg });
            }

            if (smoothed.length < 10) return null;

            // Находим медиану для определения порогов
            var energies = smoothed.map(function(s) { return s.energy; });
            energies.sort(function(a, b) { return a - b; });
            var median = energies[Math.floor(energies.length / 2)];
            var highThreshold = median * 1.4;
            var lowThreshold = median * 0.7;

            console.log("[SkipIntro] Audio thresholds: median=" + median.toFixed(2) + ", high=" + highThreshold.toFixed(2) + ", low=" + lowThreshold.toFixed(2));

            // Ищем паттерн: резкое затихание, пауза, затем резкое повышение
            var introStart = null;
            var introEnd = null;
            var inQuiet = !1;
            var quietStart = null;
            var quietDuration = 0;
            var minQuietDuration = 12;
            var maxQuietDuration = 150;

            for (var j = 0; j < smoothed.length; j++) {
                var sample = smoothed[j];
                if (sample.time > MAX_INTRO_DURATION) break;

                if (sample.energy < lowThreshold) {
                    if (!inQuiet) {
                        inQuiet = !0;
                        quietStart = sample.time;
                        quietDuration = 0;
                    } else {
                        quietDuration = sample.time - quietStart;
                    }
                } else {
                    if (inQuiet && quietDuration >= minQuietDuration && quietDuration <= maxQuietDuration) {
                        // Нашли тишину - проверяем, что после неё громко
                        var afterQuiet = null;
                        for (var k = j + 1; k < Math.min(j + 10, smoothed.length); k++) {
                            if (smoothed[k].energy > highThreshold) {
                                afterQuiet = smoothed[k];
                                break;
                            }
                        }
                        if (afterQuiet) {
                            introStart = Math.round(quietStart);
                            introEnd = Math.round(afterQuiet.time);
                            console.log("[SkipIntro] Audio pattern found: quiet from", introStart, "to", quietStart + quietDuration, "then loud at", introEnd);
                            break;
                        }
                    }
                    inQuiet = !1;
                    quietStart = null;
                    quietDuration = 0;
                }
            }

            if (introStart !== null && introEnd !== null && introEnd > introStart) {
                var duration = introEnd - introStart;
                if (duration > 10 && duration < 150) {
                    console.log("[SkipIntro] Audio intro detected:", introStart, "→", introEnd, "(" + duration + "s)");
                    return {
                        type: "intro",
                        start: introStart,
                        end: introEnd,
                        _source: "audio"
                    };
                }
            }

            console.log("[SkipIntro] No audio pattern detected");
            return null;
        },

        destroy: function() {
            this._stopSampling();
            try {
                if (this._source) {
                    this._source.disconnect();
                    this._source = null;
                }
                if (this._analyser) {
                    this._analyser.disconnect();
                    this._analyser = null;
                }
                if (this._context) {
                    this._context.close();
                    this._context = null;
                }
                this._connected = !1;
            } catch (t) {}
        }
    };

    // ============================================================
    // 9. API КЛИЕНТ (запросы к базам данных)
    // ============================================================
    var ApiClient = {
        _fetchWithTimeout: function(url, timeout) {
            return new Promise(function(resolve, reject) {
                var timedOut = !1;
                var timer = setTimeout(function() {
                    timedOut = !0;
                    reject(new Error("timeout"));
                }, timeout || API_TIMEOUT);

                var xhr = new XMLHttpRequest();
                xhr.open("GET", url, !0);
                xhr.setRequestHeader("Accept", "application/json");
                xhr.onreadystatechange = function() {
                    if (xhr.readyState === 4) {
                        clearTimeout(timer);
                        if (timedOut) return;
                        if (xhr.status >= 200 && xhr.status < 300) {
                            try {
                                resolve(JSON.parse(xhr.responseText));
                            } catch (t) {
                                reject(t);
                            }
                        } else if (xhr.status === 204 || xhr.status === 404) {
                            resolve(null);
                        } else {
                            reject(new Error("HTTP " + xhr.status));
                        }
                    }
                };
                xhr.onerror = function() {
                    clearTimeout(timer);
                    reject(new Error("network"));
                };
                xhr.send();
            });
        },

        _normalizeSegments: function(data, type) {
            var segments = [];
            if (!data) return segments;

            // Для TheIntroDB
            if (data.intro || data.credits || data.recap || data.preview) {
                SEGMENT_TYPES.forEach(function(t) {
                    var items = data[t];
                    if (Array.isArray(items)) {
                        items.forEach(function(item) {
                            var start = item.start_ms ? item.start_ms / 1000 : (item.start || 0);
                            var end = item.end_ms ? item.end_ms / 1000 : (item.end || 0);
                            if (end > start) {
                                segments.push({ type: t, start: start, end: end });
                            }
                        });
                    }
                });
                return segments;
            }

            // Для IntroDB
            if (data.start !== undefined && data.end !== undefined) {
                segments.push({ type: type || "intro", start: data.start, end: data.end });
                return segments;
            }

            // Для IntroHater
            if (Array.isArray(data)) {
                data.forEach(function(item) {
                    if (item.start !== undefined && item.end !== undefined && item.end > item.start) {
                        var type = "intro";
                        var label = (item.label || "").toLowerCase();
                        if (label.indexOf("credit") !== -1 || label === "ed") type = "credits";
                        else if (label.indexOf("recap") !== -1) type = "recap";
                        else if (label.indexOf("preview") !== -1) type = "preview";
                        segments.push({ type: type, start: Math.round(item.start), end: Math.round(item.end) });
                    }
                });
                return segments;
            }

            return segments;
        },

        fetchTheIntroDB: function(tmdbId, season, episode) {
            var url = "https://api.theintrodb.org/v2/media?tmdb_id=" + tmdbId;
            if (season !== null && season !== undefined && episode !== null && episode !== undefined) {
                url += "&season=" + season + "&episode=" + episode;
            }
            var self = this;
            return this._fetchWithTimeout(url).then(function(data) {
                return self._normalizeSegments(data);
            }).catch(function() { return []; });
        },

        fetchIntroHater: function(imdbId, season, episode) {
            if (!imdbId) return Promise.resolve([]);
            var url = "https://introhater.com/api/segments/" + imdbId;
            if (season !== null && season !== undefined && episode !== null && episode !== undefined) {
                url += ":" + season + ":" + episode;
            }
            var self = this;
            return this._fetchWithTimeout(url).then(function(data) {
                return self._normalizeSegments(data);
            }).catch(function() { return []; });
        },

        fetchIntroDB: function(tmdbId, imdbId, season, episode) {
            var self = this;
            var params = imdbId ? "imdb=" + imdbId : "tmdb=" + tmdbId;
            if (season !== null && season !== undefined && episode !== null && episode !== undefined) {
                params += "&season=" + season + "&episode=" + episode;
            }

            var introUrl = API_BASE + "/get_intros?" + params;
            var creditsUrl = API_BASE + "/get_credits?" + params;

            return Promise.all([
                self._fetchWithTimeout(introUrl).catch(function() { return null; }),
                self._fetchWithTimeout(creditsUrl).catch(function() { return null; })
            ]).then(function(results) {
                var segments = [];
                if (results[0]) {
                    segments = segments.concat(self._normalizeSegments(results[0], "intro"));
                }
                if (results[1]) {
                    segments = segments.concat(self._normalizeSegments(results[1], "credits"));
                }
                return segments;
            });
        },

        load: function(tmdbId, imdbId, season, episode) {
            var self = this;

            // Проверяем кэш
            var cached = ApiCache.get(tmdbId, season, episode);
            if (cached !== null) {
                console.log("[SkipIntro] Using cached API data");
                return Promise.resolve(cached);
            }

            var saveAndReturn = function(segments) {
                segments = segments || [];
                ApiCache.set(tmdbId, season, episode, segments);
                return segments;
            };

            // Запрашиваем из всех источников
            return this.fetchTheIntroDB(tmdbId, season, episode).then(function(segments1) {
                if (segments1 && segments1.length > 0) {
                    return saveAndReturn(segments1);
                }
                return self.fetchIntroDB(tmdbId, imdbId, season, episode).then(function(segments2) {
                    if (segments2 && segments2.length > 0) {
                        return saveAndReturn(segments2);
                    }
                    return self.fetchIntroHater(imdbId, season, episode).then(function(segments3) {
                        return saveAndReturn(segments3);
                    });
                });
            }).catch(function() {
                return self.fetchIntroDB(tmdbId, imdbId, season, episode).then(function(segments) {
                    if (segments && segments.length > 0) {
                        return saveAndReturn(segments);
                    }
                    return self.fetchIntroHater(imdbId, season, episode).then(saveAndReturn);
                }).catch(function() {
                    return self.fetchIntroHater(imdbId, season, episode).then(saveAndReturn).catch(function() {
                        return [];
                    });
                });
            });
        }
    };

    // ============================================================
    // 10. КНОПКА В СТИЛЕ NETFLIX (улучшенная)
    // ============================================================
    var NetflixButton = {
        _button: null,
        _visible: !1,
        _fadeTimer: null,
        _countdownInterval: null,
        _progressBar: null,
        _mode: null,
        _statusText: null,

        _injectCSS: function() {
            if (document.getElementById("skip-intro-css-enhanced")) return;

            var style = document.createElement("style");
            style.id = "skip-intro-css-enhanced";
            style.textContent = `
                /* Основная кнопка - стиль Netflix */
                .skip-intro-btn {
                    position: absolute;
                    right: 60px;
                    bottom: 130px;
                    padding: 0;
                    background: rgba(0, 0, 0, 0.7);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border: none;
                    border-radius: 30px;
                    color: #fff;
                    font-size: 1.1em;
                    cursor: pointer;
                    z-index: 9999;
                    opacity: 0;
                    pointer-events: none;
                    transform: translateY(20px) scale(0.95);
                    transition: all 0.4s cubic-bezier(0.2, 0.9, 0.4, 1);
                    outline: none;
                    font-family: inherit;
                    line-height: 1.4;
                    box-shadow: 0 8px 40px rgba(0, 0, 0, 0.6);
                    overflow: hidden;
                    min-width: 180px;
                }

                .skip-intro-btn.visible {
                    opacity: 1;
                    pointer-events: auto;
                    transform: translateY(0) scale(1);
                }

                .skip-intro-btn:hover {
                    background: rgba(255, 255, 255, 0.15);
                    transform: translateY(0) scale(1.03);
                }

                .skip-intro-btn:active {
                    transform: scale(0.97);
                }

                /* Контент кнопки */
                .skip-intro-content {
                    display: flex;
                    align-items: center;
                    padding: 14px 28px;
                    gap: 12px;
                    position: relative;
                    z-index: 2;
                }

                /* Текст */
                .skip-intro-label {
                    font-weight: 500;
                    letter-spacing: 0.3px;
                    white-space: nowrap;
                }

                /* Бейдж с таймером */
                .skip-intro-badge {
                    font-size: 0.75em;
                    opacity: 0.7;
                    font-weight: 300;
                    background: rgba(255, 255, 255, 0.1);
                    padding: 2px 12px;
                    border-radius: 20px;
                    margin-left: 4px;
                    min-width: 30px;
                    text-align: center;
                }

                /* Статус (поиск/не найдено) */
                .skip-intro-status {
                    font-size: 0.8em;
                    opacity: 0.5;
                    font-weight: 300;
                }

                /* Иконка - две стрелки вправо (как в Netflix) */
                .skip-intro-icon {
                    width: 22px;
                    height: 22px;
                    flex-shrink: 0;
                    opacity: 0.9;
                    margin-left: 4px;
                }

                /* Прогресс-бар */
                .skip-intro-progress {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    height: 3px;
                    background: linear-gradient(90deg, #fff, rgba(200, 200, 255, 0.8));
                    border-radius: 0 0 30px 30px;
                    transition: width 0.1s linear;
                    z-index: 3;
                    width: 0%;
                }

                /* Состояние загрузки */
                .skip-intro-btn.loading .skip-intro-icon {
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                /* Подсказка для пульта */
                .skip-intro-hint {
                    font-size: 0.6em;
                    opacity: 0.3;
                    margin-left: 8px;
                    font-weight: 300;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 4px;
                    padding: 1px 8px;
                    letter-spacing: 0.5px;
                }

                /* Адаптив для мобильных */
                @media (max-width: 768px) {
                    .skip-intro-btn {
                        right: 20px;
                        bottom: 100px;
                        font-size: 0.9em;
                        min-width: 140px;
                    }
                    .skip-intro-content {
                        padding: 10px 18px;
                        gap: 8px;
                    }
                }
            `;

            document.head.appendChild(style);
        },

        _createIcon: function() {
            var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.setAttribute("viewBox", "0 0 24 24");
            svg.setAttribute("fill", "currentColor");
            svg.setAttribute("class", "skip-intro-icon");

            var path1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path1.setAttribute("d", "M6 18L14 12L6 6V18Z");

            var path2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path2.setAttribute("d", "M14 18L22 12L14 6V18Z");

            svg.appendChild(path1);
            svg.appendChild(path2);
            return svg;
        },

        showLoading: function(text) {
            this._clearCountdown();
            this._injectCSS();
            this._mode = "loading";

            if (this._button) {
                this._updateLabel(text || "Поиск...", null);
                this._button.classList.add("loading");
                this._button.classList.remove("countdown");
                this._statusText && (this._statusText.textContent = "");
                this._visible || this._setVisible(!0);
                return;
            }

            this._createButton(text || "Поиск...", null, !1, null, null, !0);
        },

        showNotFound: function(text) {
            this._clearCountdown();
            this._injectCSS();
            this._mode = "notfound";

            if (this._button) {
                this._updateLabel(text || "Не найдено", null);
                this._button.classList.remove("loading", "countdown");
                this._statusText && (this._statusText.textContent = "✕");
                setTimeout(function() {
                    this.hide();
                }.bind(this), 3000);
                this._visible || this._setVisible(!0);
                return;
            }

            this._createButton(text || "Не найдено", null, !1, null, null, !1);
            setTimeout(function() {
                this.hide();
            }.bind(this), 3000);
        },

        showNormal: function(label, onSkip, badge) {
            this._clearCountdown();
            this._injectCSS();
            this._mode = "normal";

            if (this._button) {
                this._updateLabel(label, badge);
                this._button._onSkip = onSkip;
                this._button._onCancel = null;
                this._button._withCancel = !1;
                this._button.classList.remove("loading", "countdown");
                this._progressBar && (this._progressBar.style.width = "0%");
                this._statusText && (this._statusText.textContent = "");
                this._updateHint(!1);
                this._visible || this._setVisible(!0);
                return;
            }

            this._createButton(label, onSkip, !1, null, badge, !1);
        },

        showCountdown: function(label, onSkip, onCancel, badge) {
            this._clearCountdown();
            this._injectCSS();
            this._mode = "countdown";

            if (this._button) {
                this._updateLabel(label, badge || "4s");
                this._button._onSkip = onSkip;
                this._button._onCancel = onCancel;
                this._button._withCancel = !0;
                this._button.classList.add("countdown");
                this._button.classList.remove("loading");
                this._progressBar && (this._progressBar.style.width = "0%");
                this._statusText && (this._statusText.textContent = "");
                this._updateHint(!0);
                this._visible || this._setVisible(!0);
                this._startCountdown(onSkip, badge);
                return;
            }

            this._createButton(label, onSkip, !0, onCancel, badge || "4s", !1);
            this._startCountdown(onSkip, badge || "4s");
        },

        _updateHint: function(withCancel) {
            if (!this._button || !this._button._hintEl) return;

            if (withCancel) {
                var cancelKey = Lampa.Storage.field("skip_intro_key_cancel") || "back";
                var cancelLabels = { back: "Назад", red: "Красная", green: "Зелёная", yellow: "Жёлтая", blue: "Синяя" };
                this._button._hintEl.textContent = "нажмите " + (cancelLabels[cancelKey] || "Назад") + " для отмены";
            } else {
                var skipKeys = Settings.getSkipKeys();
                var keyLabels = { 13: "OK", 29443: "OK", 65385: "OK" };
                var keyName = "OK";
                for (var i = 0; i < skipKeys.length; i++) {
                    if (keyLabels[skipKeys[i]]) { keyName = keyLabels[skipKeys[i]]; break; }
                }
                this._button._hintEl.textContent = "нажмите " + keyName;
            }
        },

        _createButton: function(label, onSkip, withCancel, onCancel, badge, isLoading) {
            var self = this;
            var container = document.createElement("div");
            container.className = "skip-intro-btn" + (withCancel ? " countdown" : "") + (isLoading ? " loading" : "");
            container.setAttribute("tabindex", "1");

            var content = document.createElement("div");
            content.className = "skip-intro-content";

            // Текст
            var labelEl = document.createElement("span");
            labelEl.className = "skip-intro-label";
            labelEl.textContent = label;
            content.appendChild(labelEl);

            // Бейдж (таймер или статус)
            if (badge) {
                var badgeEl = document.createElement("span");
                badgeEl.className = "skip-intro-badge";
                badgeEl.textContent = badge;
                content.appendChild(badgeEl);
                container._badgeEl = badgeEl;
            }

            // Статус (для загрузки/ошибки)
            var statusEl = document.createElement("span");
            statusEl.className = "skip-intro-status";
            statusEl.textContent = isLoading ? "⏳" : "";
            content.appendChild(statusEl);
            container._statusEl = statusEl;
            this._statusText = statusEl;

            // Иконка
            var icon = this._createIcon();
            content.appendChild(icon);

            // Подсказка
            var hintEl = document.createElement("span");
            hintEl.className = "skip-intro-hint";
            hintEl.textContent = withCancel ? "нажмите Назад для отмены" : "нажмите OK";
            content.appendChild(hintEl);
            container._hintEl = hintEl;

            container.appendChild(content);

            // Прогресс-бар
            var progress = document.createElement("div");
            progress.className = "skip-intro-progress";
            progress.style.width = "0%";
            container.appendChild(progress);
            this._progressBar = progress;

            // Сохраняем ссылки
            container._onSkip = onSkip;
            container._onCancel = onCancel || null;
            container._withCancel = !!withCancel;

            // Обработчик клика
            content.addEventListener("click", function(e) {
                e.preventDefault();
                e.stopPropagation();
                if (container._onSkip && !isLoading) {
                    container._onSkip();
                }
            });

            // Обработчики клавиш (Lampa и DOM)
            var skipKeyCodes = Settings.getSkipKeys();
            var cancelKeyCodes = Settings.getCancelKeys();
            var okKeyCodes = [13, 29443, 65385];

            function isKeyInArray(code, arr) {
                for (var i = 0; i < arr.length; i++) {
                    if (arr[i] === code) return !0;
                }
                return !1;
            }

            container._lampaKeyHandler = function(event) {
                if (!container.classList.contains("visible") || isLoading) return;
                var code = event.code;
                if (isKeyInArray(code, skipKeyCodes) && !isKeyInArray(code, okKeyCodes)) {
                    if (event.event) { event.event.preventDefault(); event.event.stopPropagation(); }
                    if (container._onSkip) container._onSkip();
                } else if (container._withCancel && isKeyInArray(code, cancelKeyCodes)) {
                    if (event.event) { event.event.preventDefault(); event.event.stopPropagation(); }
                    if (container._onCancel) container._onCancel();
                }
            };

            container._lampaKeyupHandler = function(event) {
                if (!container.classList.contains("visible") || isLoading) return;
                var code = event.code;
                if (isKeyInArray(code, okKeyCodes)) {
                    if (isKeyInArray(13, skipKeyCodes) || isKeyInArray(29443, skipKeyCodes) || isKeyInArray(65385, skipKeyCodes)) {
                        if (event.event) { event.event.preventDefault(); event.event.stopPropagation(); }
                        if (container._onSkip) container._onSkip();
                    }
                }
            };

            container._domKeyHandler = function(event) {
                if (!container.classList.contains("visible") || isLoading) return;
                var code = event.keyCode;
                if (isKeyInArray(code, skipKeyCodes)) {
                    event.preventDefault();
                    event.stopPropagation();
                    if (container._onSkip) container._onSkip();
                } else if (container._withCancel && isKeyInArray(code, cancelKeyCodes)) {
                    event.preventDefault();
                    event.stopPropagation();
                    if (container._onCancel) container._onCancel();
                }
            };

            if (Lampa.Keypad && Lampa.Keypad.listener) {
                Lampa.Keypad.listener.follow("keydown", container._lampaKeyHandler);
                Lampa.Keypad.listener.follow("keyup", container._lampaKeyupHandler);
            }
            document.addEventListener("keydown", container._domKeyHandler, !0);

            this._button = container;

            // Добавляем в DOM
            var player = document.querySelector(".player");
            if (player) {
                player.appendChild(container);
            } else {
                document.body.appendChild(container);
            }

            setTimeout(function() {
                self._setVisible(!0);
            }, 50);
        },

        _updateLabel: function(label, badge) {
            if (!this._button) return;

            var labelEl = this._button.querySelector(".skip-intro-label");
            if (labelEl) labelEl.textContent = label;

            if (badge !== undefined && this._button._badgeEl) {
                this._button._badgeEl.textContent = badge;
            }

            if (this._statusText) {
                this._statusText.textContent = "";
            }
        },

        _startCountdown: function(onSkip, badgeText) {
            var self = this;
            var startTime = Date.now();
            var duration = 4000;

            if (this._button && this._button._badgeEl) {
                this._button._badgeEl.textContent = "4s";
            }

            this._countdownInterval = setInterval(function() {
                var elapsed = Date.now() - startTime;
                var progress = Math.min(1, elapsed / duration);

                if (self._progressBar) {
                    self._progressBar.style.width = (100 * progress) + "%";
                }

                var remaining = Math.max(0, Math.ceil((duration - elapsed) / 1000));
                if (self._button && self._button._badgeEl) {
                    self._button._badgeEl.textContent = remaining + "s";
                }

                if (elapsed >= duration) {
                    self._clearCountdown();
                    if (onSkip) onSkip();
                }
            }, 50);
        },

        _clearCountdown: function() {
            if (this._countdownInterval) {
                clearInterval(this._countdownInterval);
                this._countdownInterval = null;
            }
        },

        _removeListeners: function(button) {
            if (!button) return;

            if (Lampa.Keypad && Lampa.Keypad.listener) {
                if (button._lampaKeyHandler) {
                    Lampa.Keypad.listener.remove("keydown", button._lampaKeyHandler);
                }
                if (button._lampaKeyupHandler) {
                    Lampa.Keypad.listener.remove("keyup", button._lampaKeyupHandler);
                }
            }
            if (button._domKeyHandler) {
                document.removeEventListener("keydown", button._domKeyHandler, !0);
            }

            button._lampaKeyHandler = null;
            button._lampaKeyupHandler = null;
            button._domKeyHandler = null;
        },

        hide: function() {
            this._clearCountdown();
            if (!this._button) return;

            this._setVisible(!1);
            var button = this._button;
            var self = this;

            clearTimeout(this._fadeTimer);
            this._fadeTimer = setTimeout(function() {
                self._removeListeners(button);
                if (button.parentNode) {
                    button.parentNode.removeChild(button);
                }
                if (self._button === button) {
                    self._button = null;
                    self._progressBar = null;
                    self._statusText = null;
                }
            }, 400);
        },

        destroy: function() {
            this._clearCountdown();
            clearTimeout(this._fadeTimer);
            if (this._button) {
                this._removeListeners(this._button);
                if (this._button.parentNode) {
                    this._button.parentNode.removeChild(this._button);
                }
            }
            this._button = null;
            this._progressBar = null;
            this._statusText = null;
            this._visible = !1;
            this._mode = null;
        },

        _setVisible: function(visible) {
            this._visible = visible;
            if (this._button) {
                if (visible) {
                    this._button.classList.add("visible");
                } else {
                    this._button.classList.remove("visible");
                }
            }
        },

        isVisible: function() {
            return this._visible;
        },

        focus: function() {
            if (this._button) this._button.focus();
        }
    };

    // ============================================================
    // 11. ОСНОВНОЙ МОДУЛЬ (Main)
    // ============================================================
    var Main = {
        _segments: [],
        _activeSegment: null,
        _lastSkippedSegment: null,
        _currentData: null,
        _currentTmdbId: null,
        _currentImdbId: null,
        _currentSeason: null,
        _currentEpisode: null,
        _isMovie: !1,
        _detecting: !1,
        _detectionDone: !1,
        _inited: !1,
        _loadingShown: !1,

        init: function() {
            if (this._inited) return;
            this._inited = !0;

            Settings.init();

            var self = this;
            Lampa.Player.listener.follow("start", function(e) {
                self._onPlayerStart(e);
            });
            Lampa.Player.listener.follow("destroy", function() {
                self._onDestroy();
            });

            if (Lampa.PlayerVideo && Lampa.PlayerVideo.listener) {
                Lampa.PlayerVideo.listener.follow("timeupdate", function(e) {
                    self._onTimeUpdate(e);
                });
            }

            console.log("[SkipIntro] Enhanced plugin v3.0 initialized | " + new Date().toISOString() + " | Features: movies support, Netflix-style button, improved detection");
        },

        _extractMeta: function(data) {
            var meta = {
                tmdb_id: null,
                imdb_id: null,
                season: null,
                episode: null,
                is_series: !1,
                is_movie: !1
            };

            // Извлекаем из card
            var card = data.card || null;
            if (!card) {
                try {
                    var activity = Lampa.Activity.active();
                    if (activity && activity.card) card = activity.card;
                    if (!card && activity && activity.movie) card = activity.movie;
                } catch (t) {}
            }

            if (card) {
                meta.tmdb_id = card.id || null;
                meta.imdb_id = card.imdb_id || null;
                if (card.name && !card.title) meta.is_series = !0;
                if (card.number_of_seasons || card.first_air_date) meta.is_series = !0;
                if (card.title && !card.name && !card.number_of_seasons && !card.first_air_date) {
                    meta.is_movie = !0;
                }
            }

            // Извлекаем сезон/эпизод из параметров
            if (data.season !== undefined && data.season !== null) {
                meta.season = parseInt(data.season);
            }
            if (data.episode !== undefined && data.episode !== null) {
                meta.episode = parseInt(data.episode);
            }

            // Пробуем извлечь из заголовка
            if ((meta.season === null || meta.episode === null) && data.title) {
                var match = data.title.match(/[Ss](\d+)[Ee](\d+)/);
                if (match) {
                    if (meta.season === null) meta.season = parseInt(match[1]);
                    if (meta.episode === null) meta.episode = parseInt(match[2]);
                }
            }

            // Проверяем плейлист
            if (data.playlist && Array.isArray(data.playlist)) {
                var url = data.url;
                for (var i = 0; i < data.playlist.length; i++) {
                    var item = data.playlist[i];
                    var itemUrl = typeof item.url === "string" ? item.url : "";
                    if (itemUrl === url || i === 0) {
                        if (item.season !== undefined && meta.season === null) meta.season = parseInt(item.season);
                        if (item.episode !== undefined && meta.episode === null) meta.episode = parseInt(item.episode);
                        if (item.s !== undefined && meta.season === null) meta.season = parseInt(item.s);
                        if (item.e !== undefined && meta.episode === null) meta.episode = parseInt(item.e);
                        if (itemUrl === url) break;
                    }
                }
            }

            // Определяем тип контента
            if (meta.season !== null && meta.episode !== null) {
                meta.is_series = !0;
            } else if (meta.tmdb_id || meta.imdb_id) {
                // Если есть ID и это не сериал - считаем фильмом
                if (!meta.is_series && !meta.is_movie) {
                    meta.is_movie = !0;
                }
            }

            // Если включена поддержка фильмов, разрешаем фильмы
            if (meta.is_movie && !Settings.isMoviesEnabled()) {
                console.log("[SkipIntro] Movies support disabled in settings");
                meta.is_movie = !1;
            }

            return meta;
        },

        _onPlayerStart: function(data) {
            this._segments = [];
            this._activeSegment = null;
            this._lastSkippedSegment = null;
            this._currentData = data;
            this._currentTmdbId = null;
            this._currentImdbId = null;
            this._currentSeason = null;
            this._currentEpisode = null;
            this._isMovie = !1;
            this._detecting = !1;
            this._detectionDone = !1;
            this._loadingShown = !1;

            if (!Settings.isEnabled()) {
                console.log("[SkipIntro] Plugin disabled");
                return;
            }

            var meta = this._extractMeta(data);
            console.log("[SkipIntro] Extracted meta:", meta);

            // Проверяем, подходит ли контент
            var isEligible = meta.tmdb_id && (meta.is_series || (meta.is_movie && Settings.isMoviesEnabled()));
            if (!isEligible) {
                console.log("[SkipIntro] Content not eligible for skipping");
                return;
            }

            this._currentTmdbId = meta.tmdb_id;
            this._currentImdbId = meta.imdb_id;
            this._currentSeason = meta.season;
            this._currentEpisode = meta.episode;
            this._isMovie = meta.is_movie;

            var typeLabel = meta.is_series ? "S" + meta.season + "E" + meta.episode : "Movie";
            console.log("[SkipIntro] Loading segments for TMDB:", meta.tmdb_id, typeLabel);

            // Показываем индикатор загрузки
            this._showLoading("Поиск заставки...");

            var self = this;
            var apiDone = !1;
            var detectDone = !1;
            var apiSegments = [];
            var detectSegments = [];

            var finalize = function() {
                if (!apiDone || !detectDone) return;
                if (self._currentData !== data) return;

                // Объединяем сегменты
                var merged = self._mergeSegments(apiSegments, detectSegments);
                self._segments = merged;
                self._detectionDone = !0;

                console.log("[SkipIntro] Final merged segments:", merged.length, merged);

                if (merged.length === 0) {
                    self._showNotFound("Заставка не найдена");
                } else {
                    // Скрываем индикатор загрузки
                    NetflixButton.hide();
                }
            };

            // Загрузка из API
            ApiClient.load(meta.tmdb_id, meta.imdb_id, meta.season, meta.episode).then(function(segments) {
                if (self._currentData !== data) return;
                apiSegments = segments || [];
                apiDone = !0;
                console.log("[SkipIntro] API segments:", apiSegments.length, apiSegments);
                if (apiSegments.length > 0) {
                    self._segments = apiSegments;
                    self._detectionDone = !0;
                    NetflixButton.hide();
                }
                finalize();
            }).catch(function(err) {
                console.log("[SkipIntro] API error:", err);
                apiSegments = [];
                apiDone = !0;
                finalize();
            });

            // Умное обнаружение (если включено)
            if (Settings.isDetectEnabled()) {
                this._runDetection(data, meta, function(segments) {
                    if (self._currentData !== data) return;
                    detectSegments = segments || [];
                    detectDone = !0;
                    console.log("[SkipIntro] Detection segments:", detectSegments.length, detectSegments);
                    finalize();
                });
            } else {
                detectSegments = [];
                detectDone = !0;
                finalize();
            }
        },

        _showLoading: function(text) {
            this._loadingShown = !0;
            NetflixButton.showLoading(text);
        },

        _showNotFound: function(text) {
            NetflixButton.showNotFound(text);
        },

        _runDetection: function(data, meta, callback) {
            var self = this;
            var tmdbId = meta.tmdb_id;
            var season = meta.season;
            var episode = meta.episode;

            // Проверяем кэш
            var cached = DetectCache.get(tmdbId, season, episode);
            if (cached && cached.length > 0) {
                console.log("[SkipIntro] Using cached detection");
                return callback(cached);
            }

            var attempts = 0;
            var maxAttempts = 20;

            function tryDetect() {
                var video;
                try {
                    video = Lampa.PlayerVideo.video();
                } catch (t) {}

                if (!video || !video.duration) {
                    attempts++;
                    if (attempts < maxAttempts && self._currentData === data) {
                        setTimeout(tryDetect, 500);
                    } else {
                        callback([]);
                    }
                    return;
                }

                var duration = video.duration;
                console.log("[SkipIntro] Starting detection for duration:", duration);

                // Запускаем детекторы параллельно
                var promises = [];

                // Детектор субтитров
                promises.push(SubtitleDetector.detect(video));

                // Детектор звука (только для сериалов или коротких фильмов)
                if (!self._isMovie || duration < 1800) {
                    promises.push(AudioDetector.detect(video));
                } else {
                    promises.push(Promise.resolve(null));
                }

                Promise.all(promises).then(function(results) {
                    if (self._currentData !== data) return callback([]);

                    var subSegments = results[0] || [];
                    var audioSegment = results[1] || null;

                    var combined = subSegments.slice();

                    if (audioSegment) {
                        audioSegment._source = "audio";
                        // Проверяем, не дублирует ли аудио сегмент субтитры
                        var duplicate = !1;
                        for (var i = 0; i < combined.length; i++) {
                            if (combined[i].type === audioSegment.type &&
                                Math.abs(combined[i].start - audioSegment.start) < 5) {
                                duplicate = !0;
                                break;
                            }
                        }
                        if (!duplicate) {
                            combined.push(audioSegment);
                        }
                    }

                    // Специальный поиск для фильмов
                    if (self._isMovie) {
                        var movieCredits = self._detectMovieCredits(subSegments, duration);
                        if (movieCredits && movieCredits.length > 0) {
                            combined = combined.concat(movieCredits);
                        }
                    }

                    // Объединяем и сортируем
                    combined = self._mergeSegments(combined);

                    if (combined.length > 0) {
                        DetectCache.set(tmdbId, season, episode, combined);
                    }

                    callback(combined);
                }).catch(function(err) {
                    console.log("[SkipIntro] Detection error:", err);
                    callback([]);
                });
            }

            tryDetect();
        },

        _detectMovieCredits: function(subSegments, duration) {
            if (!subSegments || subSegments.length === 0) return [];

            // Ищем титры в конце фильма (последние 10%)
            var threshold = duration * 0.9;
            var lastCue = null;
            var maxEnd = 0;

            for (var i = 0; i < subSegments.length; i++) {
                var seg = subSegments[i];
                if (seg.start > threshold && seg.end > maxEnd) {
                    maxEnd = seg.end;
                    lastCue = seg;
                }
            }

            if (lastCue && duration - lastCue.end > 30) {
                return [{
                    type: "credits",
                    start: Math.round(lastCue.end),
                    end: Math.round(duration),
                    _source: "movie_detect"
                }];
            }

            return [];
        },

        _mergeSegments: function(apiSegments, detectSegments) {
            var all = [];

            // Добавляем API сегменты
            if (apiSegments && apiSegments.length > 0) {
                apiSegments.forEach(function(s) {
                    all.push({ type: s.type, start: s.start, end: s.end, _source: s._source || "api" });
                });
            }

            // Добавляем обнаруженные сегменты
            if (detectSegments && detectSegments.length > 0) {
                detectSegments.forEach(function(s) {
                    // Проверяем дубликаты с API
                    var duplicate = !1;
                    for (var i = 0; i < all.length; i++) {
                        if (all[i].type === s.type &&
                            Math.abs(all[i].start - s.start) < 3 &&
                            Math.abs(all[i].end - s.end) < 3) {
                            duplicate = !0;
                            break;
                        }
                    }
                    if (!duplicate) {
                        all.push({ type: s.type, start: s.start, end: s.end, _source: s._source || "detect" });
                    }
                });
            }

            // Сортируем по времени
            all.sort(function(a, b) { return a.start - b.start; });

            // Объединяем перекрывающиеся сегменты
            var merged = [];
            for (var j = 0; j < all.length; j++) {
                var current = all[j];
                if (merged.length === 0) {
                    merged.push(current);
                    continue;
                }
                var last = merged[merged.length - 1];
                if (current.start <= last.end + 2) {
                    // Перекрываются - объединяем
                    last.end = Math.max(last.end, current.end);
                } else {
                    merged.push(current);
                }
            }

            return merged;
        },

        _onTimeUpdate: function(data) {
            if (!Settings.isEnabled() || !this._segments || this._segments.length === 0) {
                return;
            }

            var current = data.current;
            if (current === null || current === undefined || isNaN(current)) {
                return;
            }

            // Проверяем, находимся ли мы в сегменте
            var segment = this._findSegmentAt(this._segments, current);
            if (!segment) {
                if (this._activeSegment) {
                    this._hideButton();
                }
                return;
            }

            // Проверяем тип
            if (!Settings.isTypeEnabled(segment.type)) {
                if (this._activeSegment) {
                    this._hideButton();
                }
                return;
            }

            // Проверяем, не пропустили ли уже этот сегмент
            if (this._lastSkippedSegment === segment) {
                return;
            }

            // Автопропуск
            if (Settings.isAutoSkip()) {
                this._doSkip(segment, !0);
                return;
            }

            // Показываем кнопку
            if (this._activeSegment !== segment) {
                this._activeSegment = segment;

                var label = LABELS[segment.type] || "Пропустить";
                var badge = null;

                // Проверяем Smart Skip
                var tmdbId = this._currentTmdbId;
                if (tmdbId && SmartSkip.hasSkipped(tmdbId, segment.type)) {
                    // Автопропуск с таймером
                    this._showCountdownButton(segment, label);
                } else {
                    this._showNormalButton(segment, label);
                }
            }
        },

        _findSegmentAt: function(segments, time) {
            if (!segments || !segments.length) return null;
            for (var i = 0; i < segments.length; i++) {
                var seg = segments[i];
                if (time >= seg.start && time < seg.end) {
                    return seg;
                }
            }
            return null;
        },

        _showNormalButton: function(segment, label) {
            var source = segment._source || "";
            var badge = source === "subs" ? "по субтитрам" :
                        source === "audio" ? "по звуку" :
                        source === "movie_detect" ? "фильм" :
                        source === "api" ? "база" : null;

            var self = this;
            NetflixButton.showNormal(label, function() {
                if (self._currentTmdbId) {
                    SmartSkip.rememberSkip(self._currentTmdbId, segment.type);
                }
                self._doSkip(segment, !1);
            }, badge);
        },

        _showCountdownButton: function(segment, label) {
            var self = this;
            var source = segment._source || "";
            var badge = source === "subs" ? "субтитры" :
                        source === "audio" ? "звук" :
                        source === "movie_detect" ? "фильм" :
                        source === "api" ? "база" : null;

            NetflixButton.showCountdown(label,
                function() {
                    self._doSkip(segment, !0);
                },
                function() {
                    console.log("[SkipIntro] Auto-skip cancelled by user");
                    if (self._currentTmdbId) {
                        SmartSkip.forgetSkip(self._currentTmdbId, segment.type);
                    }
                    self._lastSkippedSegment = segment;
                    NetflixButton.destroy();
                    self._activeSegment = null;
                },
                badge
            );
        },

        _hideButton: function() {
            this._activeSegment = null;
            NetflixButton.hide();
        },

        _doSkip: function(segment, auto) {
            this._lastSkippedSegment = segment;
            this._activeSegment = null;
            NetflixButton.destroy();

            try {
                var video = Lampa.PlayerVideo.video();
                if (video) {
                    var targetTime = Math.min(segment.end, video.duration || segment.end);
                    video.currentTime = targetTime;
                    console.log("[SkipIntro] Skipped", segment.type, "to", targetTime, auto ? "(auto)" : "(manual)");

                    // Возобновляем воспроизведение, если на паузе
                    setTimeout(function() {
                        try {
                            if (video.paused) {
                                video.play();
                            }
                        } catch (t) {}
                    }, 100);
                }
            } catch (t) {
                console.log("[SkipIntro] Error seeking:", t);
            }
        },

        _onDestroy: function() {
            this._segments = [];
            this._activeSegment = null;
            this._lastSkippedSegment = null;
            this._currentData = null;
            this._currentTmdbId = null;
            this._currentImdbId = null;
            this._currentSeason = null;
            this._currentEpisode = null;
            this._isMovie = !1;
            this._detecting = !1;
            this._detectionDone = !1;
            this._loadingShown = !1;
            NetflixButton.destroy();
            AudioDetector.destroy();
        }
    };

    // ============================================================
    // 12. ЗАПУСК
    // ============================================================
    function startPlugin() {
        if (window.Lampa && Lampa.SettingsApi && Lampa.Player && Lampa.Storage) {
            Main.init();
        } else {
            setTimeout(startPlugin, 500);
        }
    }

    if (window.Lampa && Lampa.Listener) {
        Lampa.Listener.follow("app", function(event) {
            if (event.type === "ready") {
                startPlugin();
            }
        });
        setTimeout(startPlugin, 1000);
    } else {
        var interval = setInterval(function() {
            if (window.Lampa && Lampa.Listener) {
                clearInterval(interval);
                Lampa.Listener.follow("app", function(event) {
                    if (event.type === "ready") {
                        startPlugin();
                    }
                });
                setTimeout(startPlugin, 1000);
            }
        }, 300);
    }
})();
