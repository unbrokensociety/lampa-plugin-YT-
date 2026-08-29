!function() {
    "use strict";

    if (window.__skipIntroLoaded) return;
    window.__skipIntroLoaded = true;

    // ============== CONSTANTS ==============
    var API_INTRODB = "https://api.introdb.app";
    var API_THEINTRODB = "https://api.theintrodb.org/v2";
    var API_INTROHATER = "https://introhater.com/api";
    var REQUEST_TIMEOUT = 15000;
    var MAX_RETRIES = 3;
    var RETRY_DELAY = 1000;
    var DB_CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
    var DETECT_CACHE_TTL = 30 * 24 * 60 * 60 * 1000;
    var AUDIO_SAMPLE_LIMIT = 360;
    var MOVIE_CREDITS_WINDOW = 0.1;

    var SEGMENT_TYPES = ["intro", "recap", "credits", "preview"];
    var LABELS = {
        intro: "Пропустить заставку",
        recap: "Пропустить рекап",
        credits: "Пропустить титры",
        preview: "Пропустить превью"
    };

    // ============== SETTINGS ==============
    var Settings = {
        init: function() {
            Lampa.SettingsApi.addComponent({
                component: "skip_intro",
                name: "Пропуск заставок",
                icon: '<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line></svg>'
            });

            var params = [
                { name: "skip_intro_enabled", type: "trigger", default: true, desc: "Показывать кнопку пропуска заставок и титров" },
                { name: "skip_intro_auto", type: "trigger", default: false, desc: "Всегда автопропуск (без кнопки)" },
                { name: "skip_intro_detect", type: "trigger", default: true, desc: "Умное обнаружение (если нет данных в базе)" },
                { name: "skip_intro_type_intro", type: "trigger", default: true, desc: "Пропускать заставку (intro)" },
                { name: "skip_intro_type_recap", type: "trigger", default: true, desc: "Пропускать рекап (recap)" },
                { name: "skip_intro_type_credits", type: "trigger", default: true, desc: "Пропускать титры (credits)" },
                { name: "skip_intro_type_preview", type: "trigger", default: false, desc: "Пропускать превью (preview)" },
                {
                    name: "skip_intro_key_skip",
                    type: "select",
                    values: {
                        enter: "Enter / OK",
                        space: "Пробел",
                        red: "Красная кнопка (403)",
                        green: "Зелёная кнопка (404)",
                        yellow: "Жёлтая кнопка (405)",
                        blue: "Синяя кнопка (406)"
                    },
                    default: "enter",
                    desc: "Кнопка «Пропустить»"
                },
                {
                    name: "skip_intro_key_cancel",
                    type: "select",
                    values: {
                        back: "Назад (Back)",
                        red: "Красная кнопка (403)",
                        green: "Зелёная кнопка (404)",
                        yellow: "Жёлтая кнопка (405)",
                        blue: "Синяя кнопка (406)"
                    },
                    default: "back",
                    desc: "Кнопка «Отмена» (при автопропуске)"
                }
            ];

            params.forEach(function(p) {
                Lampa.SettingsApi.addParam({
                    component: "skip_intro",
                    param: { name: p.name, type: p.type, default: p.default },
                    field: { name: p.desc, description: p.desc }
                });
            });
        },

        isEnabled: function() {
            return Lampa.Storage.field("skip_intro_enabled") !== false;
        },
        isAutoSkip: function() {
            return Lampa.Storage.field("skip_intro_auto") === true;
        },
        isDetectEnabled: function() {
            return Lampa.Storage.field("skip_intro_detect") !== false;
        },
        isTypeEnabled: function(type) {
            return Lampa.Storage.field("skip_intro_type_" + type) !== false;
        },
        getSkipKeys: function() {
            var key = Lampa.Storage.field("skip_intro_key_skip") || "enter";
            return this._keyMap[key] || [13];
        },
        getCancelKeys: function() {
            var key = Lampa.Storage.field("skip_intro_key_cancel") || "back";
            return this._keyMap[key] || [8, 27, 10009, 461, 4];
        },
        _keyMap: {
            enter: [13, 29443, 65385],
            space: [32],
            back: [8, 27, 10009, 461, 4],
            red: [403],
            green: [404],
            yellow: [405],
            blue: [406]
        }
    };

    // ============== CACHE ==============
    var Cache = {
        _dbStorageKey: "skip_intro_db_cache",
        _detectStorageKey: "skip_intro_detected",

        getDB: function(key) {
            try {
                var raw = localStorage.getItem(this._dbStorageKey + ":" + key);
                if (!raw) return null;
                var data = JSON.parse(raw);
                if (data._ts && Date.now() - data._ts > DB_CACHE_TTL) {
                    localStorage.removeItem(this._dbStorageKey + ":" + key);
                    return null;
                }
                return data.segments || [];
            } catch (e) { return null; }
        },

        setDB: function(key, segments) {
            try {
                localStorage.setItem(this._dbStorageKey + ":" + key, JSON.stringify({
                    segments: segments,
                    _ts: Date.now()
                }));
            } catch (e) {}
        },

        getDetected: function(key) {
            try {
                var all = JSON.parse(Lampa.Storage.get(this._detectStorageKey, "{}"));
                var entry = all[key];
                if (!entry) return null;
                if (entry._ts && Date.now() - entry._ts > DETECT_CACHE_TTL) {
                    delete all[key];
                    Lampa.Storage.set(this._detectStorageKey, JSON.stringify(all));
                    return null;
                }
                return entry.segments || [];
            } catch (e) { return null; }
        },

        setDetected: function(key, segments) {
            try {
                var all = JSON.parse(Lampa.Storage.get(this._detectStorageKey, "{}"));
                all[key] = { segments: segments, _ts: Date.now() };
                Lampa.Storage.set(this._detectStorageKey, JSON.stringify(all));
            } catch (e) {}
        },

        buildKey: function(tmdb, season, episode) {
            if (season !== undefined && season !== null && episode !== undefined && episode !== null) {
                return tmdb + "_s" + season + "_e" + episode;
            }
            return tmdb + "_movie";
        }
    };

    // ============== API ==============
    var API = {
        _fetchWithTimeout: function(url, timeout) {
            timeout = timeout || REQUEST_TIMEOUT;
            return new Promise(function(resolve, reject) {
                var done = false;
                var timer = setTimeout(function() {
                    if (!done) {
                        done = true;
                        reject(new Error("timeout"));
                    }
                }, timeout);

                var xhr = new XMLHttpRequest();
                xhr.open("GET", url, true);
                xhr.setRequestHeader("Accept", "application/json");
                xhr.onreadystatechange = function() {
                    if (xhr.readyState === 4) {
                        clearTimeout(timer);
                        if (done) return;
                        done = true;
                        if (xhr.status >= 200 && xhr.status < 300) {
                            try { resolve(JSON.parse(xhr.responseText)); }
                            catch (e) { reject(e); }
                        } else if (xhr.status === 204 || xhr.status === 404) {
                            resolve(null);
                        } else {
                            reject(new Error("HTTP " + xhr.status));
                        }
                    }
                };
                xhr.onerror = function() {
                    clearTimeout(timer);
                    if (!done) {
                        done = true;
                        reject(new Error("network"));
                    }
                };
                xhr.send();
            });
        },

        _fetchWithRetry: function(url, retries, delay) {
            retries = retries || MAX_RETRIES;
            delay = delay || RETRY_DELAY;
            var self = this;
            return new Promise(function(resolve, reject) {
                var attempt = function(n) {
                    self._fetchWithTimeout(url)
                        .then(resolve)
                        .catch(function(err) {
                            if (n < retries) {
                                setTimeout(function() { attempt(n + 1); }, delay);
                            } else {
                                reject(err);
                            }
                        });
                };
                attempt(1);
            });
        },

        _normalizeTheIntroDB: function(data) {
            if (!data) return [];
            var segments = [];
            SEGMENT_TYPES.forEach(function(type) {
                if (Array.isArray(data[type])) {
                    data[type].forEach(function(seg) {
                        var start = seg.start_ms !== undefined ? seg.start_ms / 1000 : seg.start;
                        var end = seg.end_ms !== undefined ? seg.end_ms / 1000 : seg.end;
                        if (end > start) {
                            segments.push({ type: type, start: start, end: end });
                        }
                    });
                }
            });
            return segments;
        },

        _normalizeIntroHater: function(data) {
            if (!Array.isArray(data)) return [];
            return data
                .filter(function(seg) { return seg.start !== undefined && seg.end !== undefined && seg.end > seg.start; })
                .map(function(seg) {
                    var type = "intro";
                    var label = (seg.label || "").toLowerCase();
                    if (label.indexOf("credit") !== -1 || label === "ed") type = "credits";
                    else if (label.indexOf("recap") !== -1) type = "recap";
                    else if (label.indexOf("preview") !== -1) type = "preview";
                    return { type: type, start: Math.round(seg.start), end: Math.round(seg.end) };
                });
        },

        _normalizeIntroDB: function(introData, creditsData) {
            var segments = [];
            if (introData && introData.start !== undefined && introData.end !== undefined && introData.end > introData.start) {
                segments.push({ type: "intro", start: introData.start, end: introData.end });
            }
            if (creditsData && creditsData.start !== undefined && creditsData.end !== undefined && creditsData.end > creditsData.start) {
                segments.push({ type: "credits", start: creditsData.start, end: creditsData.end });
            }
            return segments;
        },

        fetchTheIntroDB: function(tmdb, season, episode) {
            var url = API_THEINTRODB + "/media?tmdb_id=" + tmdb;
            if (season !== undefined && season !== null && episode !== undefined && episode !== null) {
                url += "&season=" + season + "&episode=" + episode;
            }
            return this._fetchWithRetry(url).then(this._normalizeTheIntroDB);
        },

        fetchIntroHater: function(imdb, season, episode) {
            if (!imdb) return Promise.resolve([]);
            var url = API_INTROHATER + "/segments/" + imdb;
            if (season !== undefined && season !== null && episode !== undefined && episode !== null) {
                url += ":" + season + ":" + episode;
            }
            return this._fetchWithRetry(url).then(this._normalizeIntroHater);
        },

        fetchIntroDB: function(tmdb, imdb, season, episode) {
            var idParam = imdb ? "imdb=" + imdb : "tmdb=" + tmdb;
            var base = API_INTRODB + "/get_intros?" + idParam;
            var creditsBase = API_INTRODB + "/get_credits?" + idParam;
            var introUrl = base;
            var creditsUrl = creditsBase;
            if (season !== undefined && season !== null && episode !== undefined && episode !== null) {
                introUrl += "&season=" + season + "&episode=" + episode;
                creditsUrl += "&season=" + season + "&episode=" + episode;
            }
            var self = this;
            return Promise.all([
                this._fetchWithRetry(introUrl).catch(function() { return null; }),
                this._fetchWithRetry(creditsUrl).catch(function() { return null; })
            ]).then(function(results) {
                return self._normalizeIntroDB(results[0], results[1]);
            });
        },

        load: function(tmdb, imdb, season, episode) {
            var key = Cache.buildKey(tmdb, season, episode);
            var cached = Cache.getDB(key);
            if (cached) return Promise.resolve(cached);

            var self = this;
            
            return this.fetchTheIntroDB(tmdb, season, episode)
                .then(function(segments) {
                    if (segments.length) {
                        Cache.setDB(key, segments);
                        return segments;
                    }
                    return self.fetchIntroDB(tmdb, imdb, season, episode);
                })
                .then(function(segments) {
                    if (segments.length) {
                        Cache.setDB(key, segments);
                        return segments;
                    }
                    return self.fetchIntroHater(imdb, season, episode);
                })
                .then(function(segments) {
                    if (segments.length) {
                        Cache.setDB(key, segments);
                        return segments;
                    }
                    Cache.setDB(key, []);
                    return [];
                })
                .catch(function() {
                    Cache.setDB(key, []);
                    return [];
                });
        }
    };

    // ============== DETECTORS ==============
    var Detectors = {
        _audioContext: null,
        _analyser: null,
        _source: null,
        _connected: false,
        _sampleTimer: null,
        _timeoutTimer: null,

        detectFromSubtitles: function(media, duration, isMovie) {
            var self = this;
            return new Promise(function(resolve) {
                try {
                    var cues = [];
                    var customSubs = media.customSubs;
                    if (customSubs && customSubs.length) {
                        var sub = null;
                        for (var i = 0; i < customSubs.length; i++) {
                            if (customSubs[i].url) {
                                sub = customSubs[i];
                                break;
                            }
                        }
                        if (sub) {
                            self._loadSubtitle(sub.url).then(function(text) {
                                if (text) {
                                    cues = self._parseSRT(text);
                                    resolve(self._analyzeCues(cues, duration, isMovie));
                                } else {
                                    resolve([]);
                                }
                            });
                            return;
                        }
                    }
                    var tracks = media.textTracks;
                    if (tracks && tracks.length) {
                        for (var j = 0; j < tracks.length; j++) {
                            if (tracks[j].cues && tracks[j].cues.length > 5) {
                                cues = Array.from(tracks[j].cues).map(function(c) {
                                    return { start: c.startTime, end: c.endTime };
                                });
                                break;
                            }
                        }
                    }
                    if (cues.length < 5) {
                        resolve([]);
                    } else {
                        cues.sort(function(a, b) { return a.start - b.start; });
                        resolve(self._analyzeCues(cues, duration, isMovie));
                    }
                } catch (e) {
                    console.log("[SkipIntro] Subtitle detection error:", e);
                    resolve([]);
                }
            });
        },

        _loadSubtitle: function(url) {
            return new Promise(function(resolve) {
                var xhr = new XMLHttpRequest();
                xhr.open("GET", url, true);
                xhr.responseType = "text";
                xhr.timeout = 8000;
                xhr.onload = function() { resolve(xhr.status === 200 ? xhr.responseText : null); };
                xhr.onerror = function() { resolve(null); };
                xhr.ontimeout = function() { resolve(null); };
                xhr.send();
            });
        },

        _parseSRT: function(text) {
            text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
            var cues = [];
            var regex = /(\d{1,2}:\d{2}:\d{2}[.,]\d{3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[.,]\d{3})/g;
            var match;
            while ((match = regex.exec(text)) !== null) {
                var start = this._parseTime(match[1]);
                var end = this._parseTime(match[2]);
                if (end > start) cues.push({ start: start, end: end });
            }
            return cues;
        },

        _parseTime: function(str) {
            var m = str.match(/(\d+):(\d{2}):(\d{2})[.,](\d{3})/);
            if (!m) return 0;
            return parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseInt(m[3]) + parseInt(m[4]) / 1000;
        },

        _analyzeCues: function(cues, duration, isMovie) {
            var segments = [];
            var MIN_GAP = 15;
            var MAX_GAP = 150;
            var MIN_CREDITS_GAP = 30;

            // Intro detection
            if (cues[0].start >= MIN_GAP && cues[0].start <= MAX_GAP) {
                segments.push({ type: "intro", start: 0, end: Math.round(cues[0].start) });
            }
            for (var i = 0; i < cues.length - 1 && cues[i].end < 360; i++) {
                var gap = cues[i + 1].start - cues[i].end;
                if (gap >= MIN_GAP && gap <= MAX_GAP && cues[i].end < 360) {
                    var start = Math.round(cues[i].end);
                    var end = Math.round(cues[i + 1].start);
                    var hasIntro = false;
                    for (var j = 0; j < segments.length; j++) {
                        if (segments[j].type === "intro" && Math.abs(segments[j].start - start) < 5) {
                            hasIntro = true;
                            break;
                        }
                    }
                    if (!hasIntro) {
                        segments.push({ type: "intro", start: start, end: end });
                    }
                    break;
                }
            }

            // Credits detection
            if (isMovie) {
                var windowStart = duration * (1 - MOVIE_CREDITS_WINDOW);
                var lastCues = [];
                for (var k = 0; k < cues.length; k++) {
                    if (cues[k].start >= windowStart) lastCues.push(cues[k]);
                }
                if (lastCues.length > 0) {
                    var lastEnd = lastCues[lastCues.length - 1].end;
                    if (duration - lastEnd >= MIN_CREDITS_GAP) {
                        segments.push({ type: "credits", start: Math.round(lastEnd), end: Math.round(duration) });
                    } else {
                        var maxGap = 0, gapStart = 0, gapEnd = 0;
                        for (var m = 0; m < lastCues.length - 1; m++) {
                            var creditGap = lastCues[m + 1].start - lastCues[m].end;
                            if (creditGap > maxGap && creditGap >= MIN_CREDITS_GAP) {
                                maxGap = creditGap;
                                gapStart = lastCues[m].end;
                                gapEnd = lastCues[m + 1].start;
                            }
                        }
                        if (maxGap > 0) {
                            segments.push({ type: "credits", start: Math.round(gapStart), end: Math.round(gapEnd) });
                        }
                    }
                }
            } else {
                var lastCue = cues[cues.length - 1];
                if (duration - lastCue.end >= MIN_CREDITS_GAP) {
                    segments.push({ type: "credits", start: Math.round(lastCue.end), end: Math.round(duration) });
                }
                var seriesWindowStart = Math.max(0, duration - 600);
                var seriesMaxGap = 0, seriesGapStart = 0, seriesGapEnd = 0;
                for (var n = 0; n < cues.length - 1; n++) {
                    if (cues[n].end < seriesWindowStart) continue;
                    var seriesGap = cues[n + 1].start - cues[n].end;
                    if (seriesGap > seriesMaxGap && seriesGap >= MIN_CREDITS_GAP) {
                        seriesMaxGap = seriesGap;
                        seriesGapStart = cues[n].end;
                        seriesGapEnd = cues[n + 1].start;
                    }
                }
                if (seriesMaxGap > 0) {
                    var existingIdx = -1;
                    for (var p = 0; p < segments.length; p++) {
                        if (segments[p].type === "credits") {
                            existingIdx = p;
                            break;
                        }
                    }
                    if (existingIdx === -1 || seriesGapStart > segments[existingIdx].start) {
                        if (existingIdx !== -1) segments.splice(existingIdx, 1);
                        segments.push({ type: "credits", start: Math.round(seriesGapStart), end: Math.round(seriesGapEnd) });
                    }
                }
            }

            return segments;
        },

        _stopSampling: function() {
            if (this._sampleTimer) clearInterval(this._sampleTimer);
            if (this._timeoutTimer) clearTimeout(this._timeoutTimer);
            this._sampleTimer = null;
            this._timeoutTimer = null;
        },

        detectFromAudio: function(media, duration) {
            var self = this;
            this._stopSampling();
            return new Promise(function(resolve) {
                var finished = false;
                var finish = function(result) {
                    if (!finished) {
                        finished = true;
                        self._stopSampling();
                        resolve(result);
                    }
                };

                try {
                    if (!window.AudioContext && !window.webkitAudioContext) {
                        return finish(null);
                    }
                    if (!self._audioContext || self._audioContext.state === "closed") {
                        try {
                            self._audioContext = new (window.AudioContext || window.webkitAudioContext)();
                        } catch (e) {
                            return finish(null);
                        }
                    }
                    if (!self._connected || !self._analyser) {
                        self._source = null;
                        self._analyser = null;
                        self._connected = false;
                        try {
                            self._source = self._audioContext.createMediaElementSource(media);
                            self._analyser = self._audioContext.createAnalyser();
                            self._analyser.fftSize = 2048;
                            self._source.connect(self._analyser);
                            self._analyser.connect(self._audioContext.destination);
                            self._connected = true;
                        } catch (e) {
                            return finish(null);
                        }
                    }
                    if (!self._analyser) return finish(null);

                    var samples = [];
                    var freqData = new Uint8Array(self._analyser.frequencyBinCount);
                    var startTime = media.currentTime;

                    self._sampleTimer = setInterval(function() {
                        if (!self._analyser) {
                            self._stopSampling();
                            return finish(samples.length > 10 ? self._analyzeEnergy(samples) : null);
                        }
                        try {
                            var current = media.currentTime;
                            if (current - startTime > AUDIO_SAMPLE_LIMIT || current > 420) {
                                self._stopSampling();
                                return finish(samples.length > 10 ? self._analyzeEnergy(samples) : null);
                            }
                            self._analyser.getByteFrequencyData(freqData);
                            var sum = 0;
                            for (var i = 0; i < freqData.length; i++) sum += freqData[i];
                            samples.push({ time: current, energy: sum / freqData.length });
                        } catch (e) {
                            self._stopSampling();
                            finish(null);
                        }
                    }, 500);

                    self._timeoutTimer = setTimeout(function() {
                        self._stopSampling();
                        finish(samples.length > 10 ? self._analyzeEnergy(samples) : null);
                    }, 370000);

                } catch (e) {
                    console.log("[SkipIntro] Audio detection error:", e);
                    finish(null);
                }
            });
        },

        _analyzeEnergy: function(samples) {
            if (samples.length < 20) return null;
            var smoothed = [];
            for (var i = 2; i < samples.length - 2; i++) {
                var avg = (samples[i-2].energy + samples[i-1].energy + samples[i].energy + samples[i+1].energy + samples[i+2].energy) / 5;
                smoothed.push({ time: samples[i].time, energy: avg });
            }
            if (smoothed.length < 10) return null;
            var sorted = smoothed.map(function(s) { return s.energy; }).sort(function(a, b) { return a - b; });
            var median = sorted[Math.floor(sorted.length / 2)];
            var thresholdHigh = median * 1.3;
            var thresholdLow = median * 0.8;
            var start = null;
            var highCount = 0;
            var inHigh = false;
            for (var j = 0; j < smoothed.length; j++) {
                var s = smoothed[j];
                if (s.time > 360) break;
                if (s.energy > thresholdHigh) {
                    if (!inHigh) {
                        inHigh = true;
                        start = s.time;
                        highCount = 0;
                    }
                    highCount++;
                } else if (inHigh && s.energy < thresholdLow) {
                    var segmentDuration = s.time - start;
                    if (segmentDuration >= 15 && segmentDuration <= 150 && highCount >= 10) {
                        return {
                            type: "intro",
                            start: Math.round(start),
                            end: Math.round(s.time)
                        };
                    }
                    inHigh = false;
                    start = null;
                    highCount = 0;
                }
            }
            return null;
        },

        destroy: function() {
            this._stopSampling();
            try {
                if (this._source) this._source.disconnect();
                if (this._analyser) this._analyser.disconnect();
                if (this._audioContext) this._audioContext.close();
            } catch (e) {}
            this._source = null;
            this._analyser = null;
            this._audioContext = null;
            this._connected = false;
        },

        detectCombined: function(media, duration, isMovie) {
            var self = this;
            return Promise.all([
                this.detectFromSubtitles(media, duration, isMovie),
                this.detectFromAudio(media, duration)
            ]).then(function(results) {
                var subSegments = results[0];
                var audioSegment = results[1];
                var combined = [];

                if (subSegments.length) {
                    combined = combined.concat(subSegments);
                }

                if (audioSegment && audioSegment.type === "intro") {
                    var hasIntro = false;
                    for (var i = 0; i < combined.length; i++) {
                        if (combined[i].type === "intro") {
                            hasIntro = true;
                            break;
                        }
                    }
                    if (!hasIntro) combined.push(audioSegment);
                }

                combined.sort(function(a, b) { return a.start - b.start; });
                var merged = [];
                for (var j = 0; j < combined.length; j++) {
                    var seg = combined[j];
                    var last = merged[merged.length - 1];
                    if (last && seg.start <= last.end && seg.type === last.type) {
                        last.end = Math.max(last.end, seg.end);
                    } else {
                        merged.push({ type: seg.type, start: seg.start, end: seg.end });
                    }
                }
                return merged;
            });
        }
    };

    // ============== BUTTON UI ==============
    var Button = {
        _el: null,
        _visible: false,
        _countdownTimer: null,
        _progressBar: null,
        _mode: null,

        _injectCSS: function() {
            if (document.getElementById("skip-intro-css")) return;
            var style = document.createElement("style");
            style.id = "skip-intro-css";
            style.textContent = [
                ".skip-intro-button {",
                "  position: absolute;",
                "  right: 48px;",
                "  bottom: 100px;",
                "  padding: 0;",
                "  background: rgba(0, 0, 0, 0.45);",
                "  backdrop-filter: blur(16px);",
                "  -webkit-backdrop-filter: blur(16px);",
                "  border: 1px solid rgba(255, 255, 255, 0.25);",
                "  border-radius: 12px;",
                "  color: #fff;",
                "  font-size: 16px;",
                "  cursor: pointer;",
                "  z-index: 9999;",
                "  opacity: 0;",
                "  pointer-events: none;",
                "  transform: translateY(10px) scale(0.95);",
                "  transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.2, 0.9, 0.4, 1), background 0.2s ease, border-color 0.2s ease;",
                "  outline: none;",
                "  font-family: inherit;",
                "  line-height: 1.3;",
                "  white-space: nowrap;",
                "  overflow: hidden;",
                "  display: flex;",
                "  flex-direction: column;",
                "  box-shadow: 0 8px 32px rgba(0,0,0,0.3);",
                "}",
                ".skip-intro-button.visible {",
                "  opacity: 1;",
                "  pointer-events: auto;",
                "  transform: translateY(0) scale(1);",
                "}",
                ".skip-intro-button:hover,",
                ".skip-intro-button:focus {",
                "  background: rgba(0, 0, 0, 0.6);",
                "  border-color: rgba(255, 255, 255, 0.5);",
                "  transform: translateY(-2px) scale(1.03);",
                "  box-shadow: 0 12px 40px rgba(0,0,0,0.5);",
                "}",
                ".skip-intro-content {",
                "  display: flex;",
                "  align-items: center;",
                "  padding: 14px 22px;",
                "  gap: 12px;",
                "  position: relative;",
                "  z-index: 2;",
                "}",
                ".skip-intro-icon {",
                "  width: 22px;",
                "  height: 22px;",
                "  flex-shrink: 0;",
                "}",
                ".skip-intro-label {",
                "  font-weight: 500;",
                "  letter-spacing: 0.02em;",
                "}",
                ".skip-intro-progress {",
                "  position: absolute;",
                "  bottom: 0;",
                "  left: 0;",
                "  height: 3px;",
                "  background: rgba(255, 255, 255, 0.8);",
                "  border-radius: 0 0 11px 11px;",
                "  transition: width 0.1s linear;",
                "  z-index: 3;",
                "}"
            ].join("\n");
            document.head.appendChild(style);
        },

        showNormal: function(label, onSkip, type) {
            this._clearCountdown();
            this._injectCSS();
            this._mode = "normal";
            if (this._el) {
                this._updateLabel(label);
                this._el._onSkip = onSkip;
                this._el._onCancel = null;
                this._el._withCancel = false;
                this._el.classList.remove("countdown");
                if (this._progressBar) this._progressBar.style.width = "0%";
                if (!this._visible) this._setVisible(true);
                return;
            }
            this._createButton(label, onSkip, false, null, type);
            var self = this;
            setTimeout(function() { self._setVisible(true); }, 50);
        },

        showCountdown: function(label, onSkip, onCancel, type) {
            this._clearCountdown();
            this._injectCSS();
            this._mode = "countdown";
            if (this._el) {
                this._updateLabel(label);
                this._el._onSkip = onSkip;
                this._el._onCancel = onCancel;
                this._el._withCancel = true;
                this._el.classList.add("countdown");
                if (this._progressBar) this._progressBar.style.width = "0%";
                if (!this._visible) this._setVisible(true);
                this._startCountdown(onSkip);
                return;
            }
            this._createButton(label, onSkip, true, onCancel, type);
            var self = this;
            setTimeout(function() { self._setVisible(true); }, 50);
            this._startCountdown(onSkip);
        },

        _createButton: function(label, onSkip, withCountdown, onCancel, type) {
            var el = document.createElement("div");
            el.className = "skip-intro-button" + (withCountdown ? " countdown" : "");
            el.setAttribute("tabindex", "1");

            var content = document.createElement("div");
            content.className = "skip-intro-content";

            // Double right arrows icon
            var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.setAttribute("class", "skip-intro-icon");
            svg.setAttribute("viewBox", "0 0 24 24");
            svg.setAttribute("fill", "currentColor");
            var path1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path1.setAttribute("d", "M6 18V6l6 6-6 6z");
            var path2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path2.setAttribute("d", "M14 18V6l6 6-6 6z");
            svg.appendChild(path1);
            svg.appendChild(path2);
            content.appendChild(svg);

            var labelSpan = document.createElement("span");
            labelSpan.className = "skip-intro-label";
            labelSpan.textContent = label;
            content.appendChild(labelSpan);

            if (type) {
                var badge = document.createElement("span");
                badge.style.cssText = "font-size:0.8em;opacity:0.6;margin-left:6px;";
                badge.textContent = type.charAt(0).toUpperCase() + type.slice(1);
                content.appendChild(badge);
            }

            el.appendChild(content);

            var progress = document.createElement("div");
            progress.className = "skip-intro-progress";
            progress.style.width = "0%";
            el.appendChild(progress);
            this._progressBar = progress;

            el._onSkip = onSkip;
            el._onCancel = onCancel || null;
            el._withCancel = !!withCountdown;

            content.addEventListener("click", function(e) {
                e.preventDefault();
                e.stopPropagation();
                if (el._onSkip) el._onSkip();
            });

            var keyHandler = function(e) {
                if (!el.classList.contains("visible")) return;
                var code = e.code;
                var skipKeys = Settings.getSkipKeys();
                var cancelKeys = Settings.getCancelKeys();
                if (skipKeys.indexOf(code) !== -1) {
                    if (e.event) { e.event.preventDefault(); e.event.stopPropagation(); }
                    if (el._onSkip) el._onSkip();
                } else if (el._withCancel && cancelKeys.indexOf(code) !== -1) {
                    if (e.event) { e.event.preventDefault(); e.event.stopPropagation(); }
                    if (el._onCancel) el._onCancel();
                }
            };

            if (Lampa.Keypad && Lampa.Keypad.listener) {
                el._lampaKeyHandler = keyHandler;
                Lampa.Keypad.listener.follow("keydown", el._lampaKeyHandler);
            }

            el._domKeyHandler = function(e) {
                if (!el.classList.contains("visible")) return;
                var key = e.keyCode;
                var skipKeys = Settings.getSkipKeys();
                var cancelKeys = Settings.getCancelKeys();
                if (skipKeys.indexOf(key) !== -1) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (el._onSkip) el._onSkip();
                } else if (el._withCancel && cancelKeys.indexOf(key) !== -1) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (el._onCancel) el._onCancel();
                }
            };
            document.addEventListener("keydown", el._domKeyHandler, true);

            var player = document.querySelector(".player");
            (player || document.body).appendChild(el);
            this._el = el;
        },

        _setVisible: function(visible) {
            if (!this._el) return;
            this._visible = visible;
            if (visible) {
                this._el.classList.add("visible");
            } else {
                this._el.classList.remove("visible");
                if (this._mode === "countdown") this._clearCountdown();
            }
        },

        _updateLabel: function(text) {
            if (this._el) {
                var label = this._el.querySelector(".skip-intro-label");
                if (label) label.textContent = text;
            }
        },

        _startCountdown: function(onComplete) {
            var startTime = Date.now();
            var duration = 4000;
            var self = this;
            this._countdownTimer = setInterval(function() {
                var elapsed = Date.now() - startTime;
                var progress = Math.min(1, elapsed / duration);
                if (self._progressBar) self._progressBar.style.width = (progress * 100) + "%";
                if (progress >= 1) {
                    self._clearCountdown();
                    if (onComplete) onComplete();
                }
            }, 50);
        },

        _clearCountdown: function() {
            if (this._countdownTimer) {
                clearInterval(this._countdownTimer);
                this._countdownTimer = null;
            }
        },

        hide: function() {
            this._setVisible(false);
            this._clearCountdown();
        },

        destroy: function() {
            this.hide();
            if (this._el) {
                document.removeEventListener("keydown", this._el._domKeyHandler, true);
                if (Lampa.Keypad && Lampa.Keypad.listener && this._el._lampaKeyHandler) {
                    Lampa.Keypad.listener.unfollow("keydown", this._el._lampaKeyHandler);
                }
                this._el.remove();
                this._el = null;
            }
            Detectors.destroy();
        }
    };

    // ============== PLUGIN LOGIC ==============
    var Plugin = {
        _currentMedia: null,
        _currentSegments: [],
        _currentIndex: -1,
        _skipTriggered: false,

        init: function() {
            Settings.init();
            this._registerListeners();
            console.log("[SkipIntro] Plugin initialized");
        },

        _registerListeners: function() {
            var self = this;
            if (Lampa.Player) {
                Lampa.Player.listener.follow("time", function(e) { self._onTime(e); });
                Lampa.Player.listener.follow("destroy", function() {
                    self._reset();
                    Button.destroy();
                });
                Lampa.Player.listener.follow("media", function(e) { self._onMedia(e); });
            }
        },

        _onMedia: function(media) {
            this._reset();
            if (!media) return;
            this._currentMedia = media;
            this._loadSegments(media);
        },

        _reset: function() {
            this._currentMedia = null;
            this._currentSegments = [];
            this._currentIndex = -1;
            this._skipTriggered = false;
            Button.hide();
        },

        _loadSegments: function(media) {
            var self = this;
            var tmdb = media.tmdb || media.tmdb_id;
            var imdb = media.imdb;
            var season = media.season;
            var episode = media.episode;
            var duration = media.duration || 0;
            var isMovie = (season === undefined || season === null || episode === undefined || episode === null);

            if (!tmdb && !imdb) {
                console.log("[SkipIntro] No TMDB or IMDB id, skip DB lookup");
            }

            var loadFromDB = function() {
                if (tmdb || imdb) {
                    return API.load(tmdb, imdb, season, episode);
                }
                return Promise.resolve([]);
            };

            loadFromDB().then(function(segments) {
                if (!segments.length && Settings.isDetectEnabled() && media) {
                    var cacheKey = Cache.buildKey(tmdb || imdb, season, episode);
                    var cachedDetected = Cache.getDetected(cacheKey);
                    if (cachedDetected) {
                        segments = cachedDetected;
                    } else {
                        return Detectors.detectCombined(media, duration, isMovie).then(function(detected) {
                            if (detected.length) {
                                Cache.setDetected(cacheKey, detected);
                            }
                            return detected;
                        });
                    }
                }
                return segments;
            }).then(function(segments) {
                self._currentSegments = segments.filter(function(s) {
                    return Settings.isTypeEnabled(s.type);
                });
                self._currentIndex = -1;
                self._skipTriggered = false;
                console.log("[SkipIntro] Loaded segments:", self._currentSegments);
            }).catch(function(e) {
                console.log("[SkipIntro] Failed to load segments", e);
                self._currentSegments = [];
            });
        },

        _onTime: function(e) {
            if (!this._currentMedia || !this._currentSegments.length || !Settings.isEnabled()) return;

            var currentTime = e.time;
            var segments = this._currentSegments;
            var activeIdx = -1;

            for (var i = 0; i < segments.length; i++) {
                if (currentTime >= segments[i].start && currentTime < segments[i].end) {
                    activeIdx = i;
                    break;
                }
            }

            if (activeIdx !== -1 && activeIdx !== this._currentIndex) {
                this._currentIndex = activeIdx;
                var seg = segments[activeIdx];
                if (Settings.isAutoSkip()) {
                    this._autoSkip(seg);
                } else {
                    this._showButton(seg);
                }
            } else if (activeIdx === -1 && this._currentIndex !== -1) {
                this._currentIndex = -1;
                Button.hide();
                this._skipTriggered = false;
            }
        },

        _showButton: function(seg) {
            var label = LABELS[seg.type] || "Пропустить";
            var self = this;
            var skipFn = function() {
                if (self._currentMedia && seg.end) {
                    self._currentMedia.currentTime = seg.end;
                    Button.hide();
                }
            };
            var cancelFn = function() {
                Button.hide();
                self._skipTriggered = true;
            };

            if (Settings.isAutoSkip()) {
                Button.showCountdown(label, skipFn, cancelFn, seg.type);
            } else {
                Button.showNormal(label, skipFn, seg.type);
            }
        },

        _autoSkip: function(seg) {
            if (this._skipTriggered) return;
            this._skipTriggered = true;
            if (this._currentMedia && seg.end) {
                this._currentMedia.currentTime = seg.end;
            }
            Button.hide();
        }
    };

    // ============== INITIALIZATION ==============
    try {
        if (window.Lampa) {
            Plugin.init();
        } else {
            window.addEventListener("lampa:ready", function() {
                Plugin.init();
            });
        }
    } catch (e) {
        console.error("[SkipIntro] Init error:", e);
    }

})();
