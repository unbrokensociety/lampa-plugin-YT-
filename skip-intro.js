!function() {
    "use strict";

    if (window.__skipIntroLoaded) return;
    window.__skipIntroLoaded = true;

    // ============== CONSTANTS ==============
    const API_INTRODB = "https://api.introdb.app";
    const API_THEINTRODB = "https://api.theintrodb.org/v2";
    const API_INTROHATER = "https://introhater.com/api";
    const REQUEST_TIMEOUT = 15000; // 15 sec
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000; // 1 sec
    const DB_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
    const DETECT_CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days
    const AUDIO_SAMPLE_LIMIT = 360; // stop audio analysis after 6 min
    const MOVIE_CREDITS_WINDOW = 0.1; // last 10% of video

    const SEGMENT_TYPES = ["intro", "recap", "credits", "preview"];
    const LABELS = {
        intro: "Пропустить заставку",
        recap: "Пропустить рекап",
        credits: "Пропустить титры",
        preview: "Пропустить превью"
    };

    // ============== SETTINGS ==============
    const Settings = {
        init() {
            Lampa.SettingsApi.addComponent({
                component: "skip_intro",
                name: "Пропуск заставок",
                icon: '<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line></svg>'
            });

            const params = [
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
                    desc: "Кнопка «Отменить» (при автопропуске)"
                }
            ];

            params.forEach(p => {
                Lampa.SettingsApi.addParam({
                    component: "skip_intro",
                    param: { name: p.name, type: p.type, default: p.default },
                    field: { name: p.name.replace("skip_intro_", "").replace(/_/g, " "), description: p.desc }
                });
            });
        },

        isEnabled: () => Lampa.Storage.field("skip_intro_enabled") !== false,
        isAutoSkip: () => Lampa.Storage.field("skip_intro_auto") === true,
        isDetectEnabled: () => Lampa.Storage.field("skip_intro_detect") !== false,
        isTypeEnabled: (type) => Lampa.Storage.field("skip_intro_type_" + type) !== false,
        getSkipKeys() {
            const key = Lampa.Storage.field("skip_intro_key_skip") || "enter";
            return this._keyMap[key] || [13];
        },
        getCancelKeys() {
            const key = Lampa.Storage.field("skip_intro_key_cancel") || "back";
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
    const Cache = {
        // For DB results (localStorage)
        _storageKey: "skip_intro_db_cache",
        getDB(key) {
            try {
                const raw = localStorage.getItem(this._storageKey + ":" + key);
                if (!raw) return null;
                const data = JSON.parse(raw);
                if (data._ts && Date.now() - data._ts > DB_CACHE_TTL) {
                    localStorage.removeItem(this._storageKey + ":" + key);
                    return null;
                }
                return data.segments || [];
            } catch (e) { return null; }
        },
        setDB(key, segments) {
            try {
                localStorage.setItem(this._storageKey + ":" + key, JSON.stringify({
                    segments: segments,
                    _ts: Date.now()
                }));
            } catch (e) {}
        },

        // For detected segments (Lampa.Storage)
        _detectKey: "skip_intro_detected",
        getDetected(key) {
            try {
                const all = JSON.parse(Lampa.Storage.get(this._detectKey, "{}"));
                const entry = all[key];
                if (!entry) return null;
                if (entry._ts && Date.now() - entry._ts > DETECT_CACHE_TTL) {
                    delete all[key];
                    Lampa.Storage.set(this._detectKey, JSON.stringify(all));
                    return null;
                }
                return entry.segments || [];
            } catch (e) { return null; }
        },
        setDetected(key, segments) {
            try {
                const all = JSON.parse(Lampa.Storage.get(this._detectKey, "{}"));
                all[key] = { segments, _ts: Date.now() };
                Lampa.Storage.set(this._detectKey, JSON.stringify(all));
            } catch (e) {}
        },

        // Build key for media
        buildKey(tmdb, season, episode) {
            if (season !== undefined && episode !== undefined && season !== null && episode !== null) {
                return `${tmdb}_s${season}_e${episode}`;
            }
            return `${tmdb}_movie`;
        }
    };

    // ============== API ==============
    const API = {
        _fetchWithTimeout(url, timeout = REQUEST_TIMEOUT) {
            return new Promise((resolve, reject) => {
                let done = false;
                const timer = setTimeout(() => {
                    if (!done) {
                        done = true;
                        reject(new Error("timeout"));
                    }
                }, timeout);

                const xhr = new XMLHttpRequest();
                xhr.open("GET", url, true);
                xhr.setRequestHeader("Accept", "application/json");
                xhr.onreadystatechange = () => {
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
                xhr.onerror = () => {
                    clearTimeout(timer);
                    if (!done) {
                        done = true;
                        reject(new Error("network"));
                    }
                };
                xhr.send();
            });
        },

        _fetchWithRetry(url, retries = MAX_RETRIES, delay = RETRY_DELAY) {
            return new Promise((resolve, reject) => {
                const attempt = (n) => {
                    this._fetchWithTimeout(url)
                        .then(resolve)
                        .catch(err => {
                            if (n < retries) {
                                setTimeout(() => attempt(n + 1), delay);
                            } else {
                                reject(err);
                            }
                        });
                };
                attempt(1);
            });
        },

        _normalizeTheIntroDB(data) {
            if (!data) return [];
            const segments = [];
            SEGMENT_TYPES.forEach(type => {
                if (Array.isArray(data[type])) {
                    data[type].forEach(seg => {
                        const start = seg.start_ms !== undefined ? seg.start_ms / 1000 : seg.start;
                        const end = seg.end_ms !== undefined ? seg.end_ms / 1000 : seg.end;
                        if (end > start) {
                            segments.push({ type, start, end });
                        }
                    });
                }
            });
            return segments;
        },

        _normalizeIntroHater(data) {
            if (!Array.isArray(data)) return [];
            return data
                .filter(seg => seg.start !== undefined && seg.end !== undefined && seg.end > seg.start)
                .map(seg => {
                    let type = "intro";
                    const label = (seg.label || "").toLowerCase();
                    if (label.includes("credit") || label === "ed") type = "credits";
                    else if (label.includes("recap")) type = "recap";
                    else if (label.includes("preview")) type = "preview";
                    return { type, start: Math.round(seg.start), end: Math.round(seg.end) };
                });
        },

        _normalizeIntroDB(introData, creditsData) {
            const segments = [];
            if (introData && introData.start !== undefined && introData.end !== undefined && introData.end > introData.start) {
                segments.push({ type: "intro", start: introData.start, end: introData.end });
            }
            if (creditsData && creditsData.start !== undefined && creditsData.end !== undefined && creditsData.end > creditsData.start) {
                segments.push({ type: "credits", start: creditsData.start, end: creditsData.end });
            }
            return segments;
        },

        fetchTheIntroDB(tmdb, season, episode) {
            let url = `${API_THEINTRODB}/media?tmdb_id=${tmdb}`;
            if (season !== undefined && episode !== undefined) {
                url += `&season=${season}&episode=${episode}`;
            }
            return this._fetchWithRetry(url).then(data => this._normalizeTheIntroDB(data));
        },

        fetchIntroHater(imdb, season, episode) {
            if (!imdb) return Promise.resolve([]);
            let url = `${API_INTROHATER}/segments/${imdb}`;
            if (season !== undefined && episode !== undefined) {
                url += `:${season}:${episode}`;
            }
            return this._fetchWithRetry(url).then(data => this._normalizeIntroHater(data));
        },

        fetchIntroDB(tmdb, imdb, season, episode) {
            const idParam = imdb ? `imdb=${imdb}` : `tmdb=${tmdb}`;
            const base = `${API_INTRODB}/get_intros?${idParam}`;
            const creditsBase = `${API_INTRODB}/get_credits?${idParam}`;
            let introUrl = base;
            let creditsUrl = creditsBase;
            if (season !== undefined && episode !== undefined) {
                introUrl += `&season=${season}&episode=${episode}`;
                creditsUrl += `&season=${season}&episode=${episode}`;
            }
            return Promise.all([
                this._fetchWithRetry(introUrl).catch(() => null),
                this._fetchWithRetry(creditsUrl).catch(() => null)
            ]).then(([intro, credits]) => this._normalizeIntroDB(intro, credits));
        },

        async load(tmdb, imdb, season, episode) {
            const key = Cache.buildKey(tmdb, season, episode);
            const cached = Cache.getDB(key);
            if (cached) return cached;

            const isMovie = season === undefined || episode === undefined;

            // Try sources in order, collect first non-empty result
            let segments = [];
            try {
                segments = await this.fetchTheIntroDB(tmdb, season, episode);
                if (segments.length) return this._cacheAndReturn(key, segments);
            } catch (e) {}

            try {
                segments = await this.fetchIntroDB(tmdb, imdb, season, episode);
                if (segments.length) return this._cacheAndReturn(key, segments);
            } catch (e) {}

            try {
                segments = await this.fetchIntroHater(imdb, season, episode);
                if (segments.length) return this._cacheAndReturn(key, segments);
            } catch (e) {}

            Cache.setDB(key, []);
            return [];
        },

        _cacheAndReturn(key, segments) {
            Cache.setDB(key, segments);
            return segments;
        }
    };

    // ============== SMART DETECTION ==============
    const Detectors = {
        // ---------- Subtitle analysis ----------
        async detectFromSubtitles(media, duration, isMovie) {
            try {
                let cues = [];
                const customSubs = media.customSubs;
                if (customSubs && customSubs.length) {
                    // find first usable URL
                    const sub = customSubs.find(s => s.url);
                    if (sub) {
                        const text = await this._loadSubtitle(sub.url);
                        if (text) cues = this._parseSRT(text);
                    }
                } else {
                    const tracks = media.textTracks;
                    if (tracks && tracks.length) {
                        for (const track of tracks) {
                            if (track.cues && track.cues.length > 5) {
                                cues = Array.from(track.cues).map(c => ({ start: c.startTime, end: c.endTime, text: c.text || "" }));
                                break;
                            }
                        }
                    }
                }

                if (cues.length < 5) return [];

                // Sort cues by start
                cues.sort((a, b) => a.start - b.start);
                return this._analyzeCues(cues, duration, isMovie);
            } catch (e) {
                console.log("[SkipIntro] Subtitle detection error:", e);
                return [];
            }
        },

        _loadSubtitle(url) {
            return new Promise(resolve => {
                const xhr = new XMLHttpRequest();
                xhr.open("GET", url, true);
                xhr.responseType = "text";
                xhr.timeout = 8000;
                xhr.onload = () => resolve(xhr.status === 200 ? xhr.responseText : null);
                xhr.onerror = () => resolve(null);
                xhr.ontimeout = () => resolve(null);
                xhr.send();
            });
        },

        _parseSRT(text) {
            text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
            const cues = [];
            const regex = /(\d{1,2}:\d{2}:\d{2}[.,]\d{3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[.,]\d{3})/g;
            let match;
            while ((match = regex.exec(text)) !== null) {
                const start = this._parseTime(match[1]);
                const end = this._parseTime(match[2]);
                if (end > start) cues.push({ start, end });
            }
            // Extract text after each timecode until next timecode (simplified - only times needed for now)
            // For keyword analysis we would need text, but we ignore for now
            return cues;
        },

        _parseTime(str) {
            const m = str.match(/(\d+):(\d{2}):(\d{2})[.,](\d{3})/);
            if (!m) return 0;
            return parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseInt(m[3]) + parseInt(m[4]) / 1000;
        },

        _analyzeCues(cues, duration, isMovie) {
            const segments = [];
            const MAX_INTRO_GAP = 150;
            const MIN_INTRO_GAP = 15;
            const MIN_CREDITS_GAP = 30;

            // Intro detection: gap before first cue or between cues in first N minutes
            if (cues[0].start >= MIN_INTRO_GAP && cues[0].start <= MAX_INTRO_GAP) {
                segments.push({ type: "intro", start: 0, end: Math.round(cues[0].start) });
            }
            // Intro between cues in first 6 minutes
            for (let i = 0; i < cues.length - 1 && cues[i].end < 360; i++) {
                const gap = cues[i + 1].start - cues[i].end;
                if (gap >= MIN_INTRO_GAP && gap <= MAX_INTRO_GAP && cues[i].end < 360) {
                    // Only add if not already overlapping
                    const start = Math.round(cues[i].end);
                    const end = Math.round(cues[i + 1].start);
                    if (!segments.some(s => s.type === "intro" && Math.abs(s.start - start) < 5)) {
                        segments.push({ type: "intro", start, end });
                    }
                    break; // only take first
                }
            }

            // Credits detection
            if (isMovie) {
                // For movies: look in last 10% of duration for gap or no cues
                const windowStart = duration * (1 - MOVIE_CREDITS_WINDOW);
                const lastCues = cues.filter(c => c.start >= windowStart);
                if (lastCues.length > 0) {
                    const lastEnd = lastCues[lastCues.length - 1].end;
                    if (duration - lastEnd >= MIN_CREDITS_GAP) {
                        segments.push({ type: "credits", start: Math.round(lastEnd), end: Math.round(duration) });
                    } else {
                        // Look for large gap in last 10%
                        let maxGap = 0, gapStart = 0, gapEnd = 0;
                        for (let i = 0; i < lastCues.length - 1; i++) {
                            const gap = lastCues[i + 1].start - lastCues[i].end;
                            if (gap > maxGap && gap >= MIN_CREDITS_GAP) {
                                maxGap = gap;
                                gapStart = lastCues[i].end;
                                gapEnd = lastCues[i + 1].start;
                            }
                        }
                        if (maxGap > 0) {
                            segments.push({ type: "credits", start: Math.round(gapStart), end: Math.round(gapEnd) });
                        }
                    }
                }
            } else {
                // TV series: similar logic as before but maybe less strict
                const lastCue = cues[cues.length - 1];
                if (duration - lastCue.end >= MIN_CREDITS_GAP) {
                    segments.push({ type: "credits", start: Math.round(lastCue.end), end: Math.round(duration) });
                }
                // Look for large gap in last 10 minutes
                const windowStart = Math.max(0, duration - 600);
                let maxGap = 0, gapStart = 0, gapEnd = 0;
                for (let i = 0; i < cues.length - 1; i++) {
                    if (cues[i].end < windowStart) continue;
                    const gap = cues[i + 1].start - cues[i].end;
                    if (gap > maxGap && gap >= MIN_CREDITS_GAP) {
                        maxGap = gap;
                        gapStart = cues[i].end;
                        gapEnd = cues[i + 1].start;
                    }
                }
                if (maxGap > 0) {
                    // Replace existing credits if this gap is larger and later
                    const existingIdx = segments.findIndex(s => s.type === "credits");
                    if (existingIdx === -1 || gapStart > segments[existingIdx].start) {
                        if (existingIdx !== -1) segments.splice(existingIdx, 1);
                        segments.push({ type: "credits", start: Math.round(gapStart), end: Math.round(gapEnd) });
                    }
                }
            }

            return segments;
        },

        // ---------- Audio energy detection ----------
        _audioContext: null,
        _analyser: null,
        _source: null,
        _connected: false,
        _sampleTimer: null,
        _timeoutTimer: null,

        _stopSampling() {
            if (this._sampleTimer) clearInterval(this._sampleTimer);
            if (this._timeoutTimer) clearTimeout(this._timeoutTimer);
            this._sampleTimer = null;
            this._timeoutTimer = null;
        },

        async detectFromAudio(media, duration) {
            this._stopSampling();
            return new Promise(resolve => {
                let finished = false;
                const finish = (result) => {
                    if (!finished) {
                        finished = true;
                        this._stopSampling();
                        resolve(result);
                    }
                };

                try {
                    if (!window.AudioContext && !window.webkitAudioContext) {
                        console.log("[SkipIntro] Web Audio API not available");
                        return finish(null);
                    }

                    if (!this._audioContext || this._audioContext.state === "closed") {
                        try {
                            this._audioContext = new (window.AudioContext || window.webkitAudioContext)();
                        } catch (e) {
                            return finish(null);
                        }
                    }

                    if (!this._connected || !this._analyser) {
                        this._source = null;
                        this._analyser = null;
                        this._connected = false;
                        try {
                            this._source = this._audioContext.createMediaElementSource(media);
                            this._analyser = this._audioContext.createAnalyser();
                            this._analyser.fftSize = 2048;
                            this._source.connect(this._analyser);
                            this._analyser.connect(this._audioContext.destination);
                            this._connected = true;
                        } catch (e) {
                            return finish(null);
                        }
                    }

                    if (!this._analyser) return finish(null);

                    const samples = [];
                    const freqData = new Uint8Array(this._analyser.frequencyBinCount);
                    const startTime = media.currentTime;

                    this._sampleTimer = setInterval(() => {
                        if (!this._analyser) {
                            this._stopSampling();
                            return finish(samples.length > 10 ? this._analyzeEnergy(samples) : null);
                        }
                        try {
                            const current = media.currentTime;
                            if (current - startTime > AUDIO_SAMPLE_LIMIT || current > 420) {
                                this._stopSampling();
                                return finish(samples.length > 10 ? this._analyzeEnergy(samples) : null);
                            }
                            this._analyser.getByteFrequencyData(freqData);
                            let sum = 0;
                            for (let i = 0; i < freqData.length; i++) sum += freqData[i];
                            samples.push({ time: current, energy: sum / freqData.length });
                        } catch (e) {
                            this._stopSampling();
                            finish(null);
                        }
                    }, 500);

                    this._timeoutTimer = setTimeout(() => {
                        this._stopSampling();
                        finish(samples.length > 10 ? this._analyzeEnergy(samples) : null);
                    }, 370000); // 6.1 min safety

                } catch (e) {
                    console.log("[SkipIntro] Audio detection error:", e);
                    finish(null);
                }
            });
        },

        _analyzeEnergy(samples) {
            if (samples.length < 20) return null;
            // Smooth
            const smoothed = [];
            for (let i = 2; i < samples.length - 2; i++) {
                const avg = (samples[i-2].energy + samples[i-1].energy + samples[i].energy + samples[i+1].energy + samples[i+2].energy) / 5;
                smoothed.push({ time: samples[i].time, energy: avg });
            }
            if (smoothed.length < 10) return null;
            const sorted = smoothed.map(s => s.energy).sort((a,b)=>a-b);
            const median = sorted[Math.floor(sorted.length/2)];
            const thresholdHigh = median * 1.3;
            const thresholdLow = median * 0.8;
            let start = null;
            let highCount = 0;
            let inHigh = false;
            for (let i = 0; i < smoothed.length; i++) {
                const s = smoothed[i];
                if (s.time > 360) break;
                if (s.energy > thresholdHigh) {
                    if (!inHigh) {
                        inHigh = true;
                        start = s.time;
                        highCount = 0;
                    }
                    highCount++;
                } else if (inHigh && s.energy < thresholdLow) {
                    const duration = s.time - start;
                    if (duration >= 15 && duration <= 150 && highCount >= 10) {
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

        destroy() {
            this._stopSampling();
            try {
                if (this._source) this._source.disconnect();
                if (this._analyser) this._analyser.disconnect();
                if (this._audioContext) this._audioContext.close();
            } catch(e) {}
            this._source = null;
            this._analyser = null;
            this._audioContext = null;
            this._connected = false;
        },

        // ---------- Combined detection ----------
        async detectCombined(media, duration, isMovie) {
            // Run both detections in parallel
            const [subSegments, audioSegment] = await Promise.all([
                this.detectFromSubtitles(media, duration, isMovie),
                this.detectFromAudio(media, duration)
            ]);

            const combined = [];

            // Add subtitle segments (they are more reliable)
            if (subSegments.length) combined.push(...subSegments);

            // Add audio intro if no subtitle intro
            if (audioSegment && audioSegment.type === "intro") {
                const hasIntro = combined.some(s => s.type === "intro");
                if (!hasIntro) combined.push(audioSegment);
            }

            // Sort and merge overlapping
            combined.sort((a,b) => a.start - b.start);
            const merged = [];
            for (const seg of combined) {
                const last = merged[merged.length - 1];
                if (last && seg.start <= last.end && seg.type === last.type) {
                    last.end = Math.max(last.end, seg.end);
                } else {
                    merged.push({...seg});
                }
            }
            return merged;
        }
    };

    // ============== BUTTON UI ==============
    const Button = {
        _el: null,
        _visible: false,
        _fadeTimer: null,
        _countdownTimer: null,
        _progressBar: null,
        _mode: null,

        _injectCSS() {
            if (document.getElementById("skip-intro-css")) return;
            const style = document.createElement("style");
            style.id = "skip-intro-css";
            style.textContent = `
                .skip-intro-button {
                    position: absolute;
                    right: 48px;
                    bottom: 100px;
                    padding: 0;
                    background: rgba(0, 0, 0, 0.45);
                    backdrop-filter: blur(16px);
                    -webkit-backdrop-filter: blur(16px);
                    border: 1px solid rgba(255, 255, 255, 0.25);
                    border-radius: 12px;
                    color: #fff;
                    font-size: 16px;
                    cursor: pointer;
                    z-index: 9999;
                    opacity: 0;
                    pointer-events: none;
                    transform: translateY(10px) scale(0.95);
                    transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.2, 0.9, 0.4, 1), background 0.2s ease, border-color 0.2s ease;
                    outline: none;
                    font-family: 'Inter', 'Roboto', sans-serif;
                    line-height: 1.3;
                    white-space: nowrap;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                }
                .skip-intro-button.visible {
                    opacity: 1;
                    pointer-events: auto;
                    transform: translateY(0) scale(1);
                }
                .skip-intro-button:hover,
                .skip-intro-button:focus {
                    background: rgba(0, 0, 0, 0.6);
                    border-color: rgba(255, 255, 255, 0.5);
                    transform: translateY(-2px) scale(1.03);
                    box-shadow: 0 12px 40px rgba(0,0,0,0.5);
                }
                .skip-intro-content {
                    display: flex;
                    align-items: center;
                    padding: 14px 22px;
                    gap: 12px;
                    position: relative;
                    z-index: 2;
                }
                .skip-intro-icon {
                    width: 22px;
                    height: 22px;
                    flex-shrink: 0;
                }
                .skip-intro-label {
                    font-weight: 500;
                    letter-spacing: 0.02em;
                }
                .skip-intro-progress {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    height: 3px;
                    background: rgba(255, 255, 255, 0.8);
                    border-radius: 0 0 11px 11px;
                    transition: width 0.1s linear;
                    z-index: 3;
                }
                .skip-intro-countdown {
                    position: absolute;
                    right: 10px;
                    top: 10px;
                    font-size: 12px;
                    opacity: 0.6;
                    z-index: 4;
                }
            `;
            document.head.appendChild(style);
        },

        showNormal(label, onSkip, type) {
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
            setTimeout(() => this._setVisible(true), 50);
        },

        showCountdown(label, onSkip, onCancel, type) {
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
            setTimeout(() => this._setVisible(true), 50);
            this._startCountdown(onSkip);
        },

        _createButton(label, onSkip, withCountdown, onCancel, type) {
            const el = document.createElement("div");
            el.className = "skip-intro-button" + (withCountdown ? " countdown" : "");
            el.setAttribute("tabindex", "1");

            const content = document.createElement("div");
            content.className = "skip-intro-content";

            // Icon: double right arrows
            const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.setAttribute("class", "skip-intro-icon");
            svg.setAttribute("viewBox", "0 0 24 24");
            svg.setAttribute("fill", "currentColor");
            const path1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path1.setAttribute("d", "M6 18V6l6 6-6 6z");
            const path2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path2.setAttribute("d", "M14 18V6l6 6-6 6z");
            svg.appendChild(path1);
            svg.appendChild(path2);
            content.appendChild(svg);

            const labelSpan = document.createElement("span");
            labelSpan.className = "skip-intro-label";
            labelSpan.textContent = label;
            content.appendChild(labelSpan);

            if (type) {
                const badge = document.createElement("span");
                badge.className = "skip-intro-badge";
                badge.style.cssText = "font-size:0.8em;opacity:0.6;margin-left:6px;";
                badge.textContent = type.charAt(0).toUpperCase() + type.slice(1);
                content.appendChild(badge);
            }

            el.appendChild(content);

            const progress = document.createElement("div");
            progress.className = "skip-intro-progress";
            progress.style.width = "0%";
            el.appendChild(progress);
            this._progressBar = progress;

            el._onSkip = onSkip;
            el._onCancel = onCancel || null;
            el._withCancel = !!withCountdown;

            // Event handlers
            content.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (el._onSkip) el._onSkip();
            });

            // Keyboard via Lampa
            if (Lampa.Keypad && Lampa.Keypad.listener) {
                el._lampaKeyHandler = (e) => {
                    if (!el.classList.contains("visible")) return;
                    const code = e.code;
                    const skipKeys = Settings.getSkipKeys();
                    const cancelKeys = Settings.getCancelKeys();
                    if (skipKeys.includes(code)) {
                        if (e.event) { e.event.preventDefault(); e.event.stopPropagation(); }
                        if (el._onSkip) el._onSkip();
                    } else if (el._withCancel && cancelKeys.includes(code)) {
                        if (e.event) { e.event.preventDefault(); e.event.stopPropagation(); }
                        if (el._onCancel) el._onCancel();
                    }
                };
                Lampa.Keypad.listener.follow("keydown", el._lampaKeyHandler);
            }

            // Fallback DOM keyboard
            el._domKeyHandler = (e) => {
                if (!el.classList.contains("visible")) return;
                const key = e.keyCode;
                const skipKeys = Settings.getSkipKeys();
                const cancelKeys = Settings.getCancelKeys();
                if (skipKeys.includes(key)) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (el._onSkip) el._onSkip();
                } else if (el._withCancel && cancelKeys.includes(key)) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (el._onCancel) el._onCancel();
                }
            };
            document.addEventListener("keydown", el._domKeyHandler, true);

            // Append to player
            const player = document.querySelector(".player");
            (player || document.body).appendChild(el);
            this._el = el;
        },

        _setVisible(visible) {
            if (!this._el) return;
            this._visible = visible;
            if (visible) {
                this._el.classList.add("visible");
            } else {
                this._el.classList.remove("visible");
                if (this._mode === "countdown") this._clearCountdown();
            }
        },

        _updateLabel(text) {
            if (this._el) {
                const label = this._el.querySelector(".skip-intro-label");
                if (label) label.textContent = text;
            }
        },

        _startCountdown(onComplete) {
            const startTime = Date.now();
            const duration = 4000; // 4 seconds
            this._countdownTimer = setInterval(() => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(1, elapsed / duration);
                if (this._progressBar) this._progressBar.style.width = (progress * 100) + "%";
                if (progress >= 1) {
                    this._clearCountdown();
                    if (onComplete) onComplete();
                }
            }, 50);
        },

        _clearCountdown() {
            if (this._countdownTimer) {
                clearInterval(this._countdownTimer);
                this._countdownTimer = null;
            }
        },

        hide() {
            this._setVisible(false);
            this._clearCountdown();
        },

        destroy() {
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
    const Plugin = {
        _currentMedia: null,
        _currentSegments: [],
        _currentIndex: -1,
        _lastTime: 0,
        _skipTriggered: false,

        init() {
            Settings.init();
            this._registerListeners();
            console.log("[SkipIntro] Plugin initialized");
        },

        _registerListeners() {
            if (Lampa.Player) {
                Lampa.Player.listener.follow("time", (e) => this._onTime(e));
                Lampa.Player.listener.follow("destroy", () => {
                    this._reset();
                    Button.destroy();
                });
                Lampa.Player.listener.follow("media", (e) => this._onMedia(e));
            }
        },

        _onMedia(media) {
            this._reset();
            if (!media) return;
            this._currentMedia = media;
            this._loadSegments(media);
        },

        _reset() {
            this._currentMedia = null;
            this._currentSegments = [];
            this._currentIndex = -1;
            this._lastTime = 0;
            this._skipTriggered = false;
            Button.hide();
        },

        async _loadSegments(media) {
            const tmdb = media.tmdb || media.tmdb_id;
            const imdb = media.imdb;
            const season = media.season;
            const episode = media.episode;
            const duration = media.duration || 0;
            const isMovie = (season === undefined || season === null || episode === undefined || episode === null);

            if (!tmdb && !imdb) {
                console.log("[SkipIntro] No TMDB or IMDB id, skip DB lookup");
            }

            let segments = [];
            if (tmdb || imdb) {
                try {
                    segments = await API.load(tmdb, imdb, season, episode);
                } catch (e) {
                    console.log("[SkipIntro] API load failed", e);
                }
            }

            // If no segments from DB and smart detection enabled
            if (!segments.length && Settings.isDetectEnabled() && media) {
                const cacheKey = Cache.buildKey(tmdb || imdb, season, episode);
                const cachedDetected = Cache.getDetected(cacheKey);
                if (cachedDetected) {
                    segments = cachedDetected;
                } else {
                    try {
                        segments = await Detectors.detectCombined(media, duration, isMovie);
                        if (segments.length) {
                            Cache.setDetected(cacheKey, segments);
                        }
                    } catch (e) {
                        console.log("[SkipIntro] Detection failed", e);
                    }
                }
            }

            // Filter by enabled types
            this._currentSegments = segments.filter(s => Settings.isTypeEnabled(s.type));
            this._currentIndex = -1;
            this._skipTriggered = false;
            console.log("[SkipIntro] Loaded segments:", this._currentSegments);
        },

        _onTime(e) {
            if (!this._currentMedia || !this._currentSegments.length || !Settings.isEnabled()) return;

            const currentTime = e.time;
            this._lastTime = currentTime;

            // Find active segment
            const segments = this._currentSegments;
            let activeIdx = -1;
            for (let i = 0; i < segments.length; i++) {
                if (currentTime >= segments[i].start && currentTime < segments[i].end) {
                    activeIdx = i;
                    break;
                }
            }

            if (activeIdx !== -1 && activeIdx !== this._currentIndex) {
                // Entered new segment
                this._currentIndex = activeIdx;
                const seg = segments[activeIdx];
                if (Settings.isAutoSkip()) {
                    this._autoSkip(seg);
                } else {
                    this._showButton(seg);
                }
            } else if (activeIdx === -1 && this._currentIndex !== -1) {
                // Left segment
                this._currentIndex = -1;
                Button.hide();
                this._skipTriggered = false;
            }
        },

        _showButton(seg) {
            const label = LABELS[seg.type] || "Пропустить";
            const skipFn = () => {
                if (this._currentMedia && seg.end) {
                    this._currentMedia.currentTime = seg.end;
                    Button.hide();
                }
            };
            const cancelFn = () => {
                Button.hide();
                this._skipTriggered = true; // prevent re-show for this segment
            };

            if (Settings.isAutoSkip()) {
                Button.showCountdown(label, skipFn, cancelFn, seg.type);
            } else {
                Button.showNormal(label, skipFn, seg.type);
            }
        },

        _autoSkip(seg) {
            if (this._skipTriggered) return;
            this._skipTriggered = true;
            if (this._currentMedia && seg.end) {
                this._currentMedia.currentTime = seg.end;
            }
            Button.hide();
        }
    };

    // ============== INIT ==============
    try {
        // Check if already loaded in Lampa
        if (window.Lampa) {
            Plugin.init();
        } else {
            window.addEventListener("lampa:ready", () => Plugin.init());
        }
    } catch (e) {
        console.error("[SkipIntro] Init error:", e);
    }

})();
