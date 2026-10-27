/**
 * AudioManager.js – Complete procedural audio engine via Web Audio API.
 * Features:
 *  - Retro Synthwave procedural music generator with dynamic lowpass filter
 *    (muffles into headphones when player switches to spreadsheet mode!)
 *  - 3D Stereo-panned boss footsteps based on corridor position
 *  - Rich sound effects for powerups, shields, coffee, mechanical typing,
 *    boss suspicion heartbeat, close calls, and promotions.
 */

class _AudioManager {
    constructor() {
        /** @type {AudioContext|null} */
        this.ctx = null;
        this._masterGain = null;
        this._sfxGain = null;
        this._musicGain = null;
        this._musicFilter = null;
        this._initialized = false;
        this._muted = false;

        // Music sequencing state
        this._musicTimer = null;
        this._musicStep = 0;
        this._currentBgm = 'none'; // 'arcade' | 'menu' | 'none'
        this._musicSpeed = 1.0;
        this._volume = 0.4;
        this._musicVolume = 0.28;
        this._timeouts = new Set();
        this._stealth = false;
        this._ambienceTimer = 0;
    }

    /* ── Lifecycle ────────────────────────────────────── */

    /** Must be called after user interaction. */
    init() {
        if (this._initialized) return;
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioCtx();

            // Master Gain
            this._masterGain = this.ctx.createGain();
            this._masterGain.gain.setValueAtTime(this._muted ? 0 : this._volume, this.ctx.currentTime);
            this._masterGain.connect(this.ctx.destination);

            // SFX Bus
            this._sfxGain = this.ctx.createGain();
            this._sfxGain.gain.value = 1.0;
            this._sfxGain.connect(this._masterGain);

            // Music Bus with Lowpass Filter (muffle effect)
            this._musicFilter = this.ctx.createBiquadFilter();
            this._musicFilter.type = 'lowpass';
            this._musicFilter.frequency.setValueAtTime(14000, this.ctx.currentTime);
            this._musicFilter.Q.value = 2.0;

            this._musicGain = this.ctx.createGain();
            this._musicGain.gain.setValueAtTime(this._musicVolume, this.ctx.currentTime);

            this._musicGain.connect(this._musicFilter);
            this._musicFilter.connect(this._masterGain);

            this._initialized = true;
            this._startOfficeHum();
        } catch (e) {
            // Unsupported audio must never prevent a silent game session.
            this._initialized = false;
        }
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
    }

    setMasterVolume(val) {
        this._volume = Math.max(0, Math.min(1, val));
        if (this._masterGain && !this._muted) {
            this._masterGain.gain.setValueAtTime(this._volume, this.ctx.currentTime);
        }
    }

    setMusicVolume(val) {
        this._musicVolume = Math.max(0, Math.min(1, val));
        if (this._musicGain) {
            this._musicGain.gain.setValueAtTime(this._musicVolume, this.ctx.currentTime);
        }
    }

    toggleMute() {
        this._muted = !this._muted;
        if (this._masterGain && this.ctx) {
            this._masterGain.gain.setValueAtTime(this._muted ? 0 : this._volume, this.ctx.currentTime);
        }
        return this._muted;
    }

    get isMuted() {
        return this._muted;
    }

    /* ── Synth Primitives ─────────────────────────────── */

    _osc(type, freq, duration, gainVal = 0.15, detune = 0, dest = null) {
        if (!this._initialized || !this.ctx) return;
        const targetBus = dest || this._sfxGain;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const g   = this.ctx.createGain();
        osc.type  = type;
        osc.frequency.setValueAtTime(freq, t);
        if (detune) osc.detune.setValueAtTime(detune, t);
        g.gain.setValueAtTime(gainVal, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
        osc.connect(g).connect(targetBus);
        osc.start(t);
        osc.stop(t + duration);
        osc.onended = () => { osc.disconnect(); g.disconnect(); };
    }

    _noise(duration, gainVal = 0.08, dest = null) {
        if (!this._initialized || !this.ctx) return;
        const targetBus = dest || this._sfxGain;
        const t = this.ctx.currentTime;
        const bufferSize = Math.floor(this.ctx.sampleRate * duration);
        if (bufferSize <= 0) return;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const src = this.ctx.createBufferSource();
        src.buffer = buffer;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(gainVal, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
        src.connect(g).connect(targetBus);
        src.start(t);
        src.onended = () => { src.disconnect(); g.disconnect(); };
    }

    /* ── Procedural Synthwave BGM ──────────────────────── */

    startBgm(mode = 'arcade') {
        if (!this._initialized) return;
        if (this._currentBgm === mode && this._musicTimer) return;
        this.stopBgm();
        this._currentBgm = mode;
        this._musicStep = 0;

        // Set initial filter mode
        this.setStealthMuffled(false);

        const bpm = mode === 'arcade' ? 128 : 84;
        const stepTime = (60 / bpm) / 4; // 16th notes in seconds

        const scheduleLoop = () => {
            if (this._currentBgm !== mode) return;
            this._tickMusic(mode);
            this._musicTimer = setTimeout(scheduleLoop, (stepTime / this._musicSpeed) * 1000);
        };
        scheduleLoop();
    }

    stopBgm() {
        if (this._musicTimer) {
            clearTimeout(this._musicTimer);
            this._musicTimer = null;
        }
        this._currentBgm = 'none';
    }

    setMusicSpeed(speedMultiplier = 1.0) {
        this._musicSpeed = Math.max(0.7, Math.min(1.6, speedMultiplier));
    }

    /**
     * When hiding in spreadsheet, low-pass filter the music to sound like
     * muffled headphones leaking sound into the cubicle.
     */
    setStealthMuffled(isMuffled) {
        this._stealth = isMuffled;
        if (!this._musicFilter || !this.ctx) return;
        const t = this.ctx.currentTime;
        this._musicFilter.frequency.cancelScheduledValues(t);
        if (isMuffled) {
            // Muffled 420 Hz cutoff
            this._musicFilter.frequency.exponentialRampToValueAtTime(420, t + 0.12);
        } else {
            // Full 14 kHz bright audio
            this._musicFilter.frequency.exponentialRampToValueAtTime(14000, t + 0.15);
        }
    }

    _tickMusic(mode) {
        if (!this.ctx || !this._musicGain) return;
        const t = this.ctx.currentTime;
        const step = this._musicStep % 16;
        this._musicStep++;

        if (mode === 'arcade' && !this._stealth) {
            // ── Bassline (driving Cyberpunk 16th note synth) ─────
            // Pattern in A minor: A1, A1, C2, A1, D2, A1, F2, E2...
            const bassNotes = [
                110, 110, 130.81, 110,  146.83, 110, 174.61, 164.81,
                110, 110, 130.81, 110,  196.00, 174.61, 146.83, 130.81
            ];
            const f = bassNotes[step];
            if (f) {
                const osc = this.ctx.createOscillator();
                const g   = this.ctx.createGain();
                osc.type  = 'sawtooth';
                osc.frequency.setValueAtTime(f, t);
                g.gain.setValueAtTime(0.12, t);
                g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
                osc.connect(g).connect(this._musicGain);
                osc.start(t);
                osc.stop(t + 0.15);
            }

            // ── Synth Chord Pad Stabs on beats 0, 6, 10 ──────────
            if (step === 0 || step === 6 || step === 10) {
                const chords = [
                    [220, 261.63, 329.63], // Am
                    [174.61, 220, 261.63], // F
                    [196, 246.94, 293.66], // G
                    [164.81, 207.65, 246.94] // E
                ];
                const chord = chords[Math.floor((this._musicStep / 16) % chords.length)];
                chord.forEach((freq, idx) => {
                    const osc = this.ctx.createOscillator();
                    const g = this.ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(freq, t);
                    osc.detune.setValueAtTime(idx * 4 - 4, t);
                    g.gain.setValueAtTime(0.05, t);
                    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
                    osc.connect(g).connect(this._musicGain);
                    osc.start(t);
                    osc.stop(t + 0.5);
                });
            }

            // ── Hi-Hat Pulse on off-beats ───────────────────────
            if (step % 2 === 1) {
                this._noise(0.02, 0.025, this._musicGain);
            }
            // ── Kick on quarter beats 0, 4, 8, 12 ───────────────
            if (step % 4 === 0) {
                const osc = this.ctx.createOscillator();
                const g   = this.ctx.createGain();
                osc.type  = 'sine';
                osc.frequency.setValueAtTime(140, t);
                osc.frequency.exponentialRampToValueAtTime(45, t + 0.08);
                g.gain.setValueAtTime(0.18, t);
                g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
                osc.connect(g).connect(this._musicGain);
                osc.start(t);
                osc.stop(t + 0.13);
            }
        } else if (mode === 'menu' || this._stealth) {
            // Ambient soft Rhodes-style chords on every 8 steps
            if (step % 8 === 0) {
                const chords = [
                    [130.81, 196.00, 246.94, 293.66], // Cmaj7
                    [146.83, 220.00, 261.63, 329.63], // Dm7
                    [164.81, 246.94, 293.66, 392.00], // Em7
                    [174.61, 261.63, 329.63, 440.00]  // Fmaj7
                ];
                const chord = chords[Math.floor((this._musicStep / 8) % chords.length)];
                chord.forEach(f => {
                    this._osc('sine', f, 1.8, 0.04, 0, this._musicGain);
                });
            }
        }
    }

    /* ── Spatial Footsteps ─────────────────────────────── */

    playFootstep(bossX = 0) {
        if (!this._initialized || !this.ctx) return;
        const t = this.ctx.currentTime;

        // Stereo Panning (-1 = left, +1 = right)
        let panVal = Math.max(-0.85, Math.min(0.85, bossX / 5.5));
        
        let panner = null;
        if (this.ctx.createStereoPanner) {
            panner = this.ctx.createStereoPanner();
            panner.pan.setValueAtTime(panVal, t);
            panner.connect(this._sfxGain);
        }

        const out = panner || this._sfxGain;

        // Thump
        const osc = this.ctx.createOscillator();
        const g   = this.ctx.createGain();
        osc.type  = 'sine';
        osc.frequency.setValueAtTime(85 + Math.random() * 25, t);
        osc.frequency.exponentialRampToValueAtTime(35, t + 0.12);
        g.gain.setValueAtTime(0.18, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
        osc.connect(g).connect(out);
        osc.start(t);
        osc.stop(t + 0.15);

        // Shoe scuff noise
        this._noise(0.06, 0.09, out);
        // Distance attenuation follows the boss as he crosses the aisle.
        const proximity = 1 / (1 + Math.abs(bossX) * .25);
        g.gain.cancelScheduledValues(t);
        g.gain.setValueAtTime(.24 * proximity, t);
        g.gain.exponentialRampToValueAtTime(.001, t + .14);
        osc.onended = () => { osc.disconnect(); g.disconnect(); panner?.disconnect(); };
    }

    /* ── Enhanced SFX Palette ──────────────────────────── */

    playMenuAmbience() {
        if (!this._initialized) return;
        const freqs = [130.81, 164.81, 196.00, 261.63];
        freqs.forEach(f => {
            this._osc('sine', f, 2.5, 0.03);
            this._osc('triangle', f * 2, 2.5, 0.015);
        });
    }

    playButtonHover() {
        this._osc('sine', 880, 0.06, 0.05);
    }

    playButtonClick() {
        this._osc('square', 440, 0.05, 0.07);
        this._osc('sine', 660, 0.08, 0.05);
    }

    playTyping() {
        const freq = 1200 + Math.random() * 800;
        this._noise(0.025, 0.05);
        this._osc('square', freq, 0.02, 0.025);
    }

    playMechanicalKey() {
        // High quality tactile mechanical switch click
        const t = this.ctx ? this.ctx.currentTime : 0;
        const f1 = 2800 + Math.random() * 400;
        const f2 = 800 + Math.random() * 200;
        this._osc('triangle', f1, 0.015, 0.08);
        this._osc('sine', f2, 0.03, 0.06);
        this._noise(0.015, 0.06);
    }

    playCoffeeGulp() {
        if (!this._initialized || !this.ctx) return;
        const t = this.ctx.currentTime;
        // Slurp / gulp pitch glides
        const osc = this.ctx.createOscillator();
        const g   = this.ctx.createGain();
        osc.type  = 'sine';
        osc.frequency.setValueAtTime(320, t);
        osc.frequency.exponentialRampToValueAtTime(580, t + 0.15);
        osc.frequency.exponentialRampToValueAtTime(220, t + 0.32);
        g.gain.setValueAtTime(0.12, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc.connect(g).connect(this._sfxGain);
        osc.start(t);
        osc.stop(t + 0.36);

        // Satisfied sparkle chime
        this._later(() => {
            this._osc('sine', 880, 0.15, 0.06);
            this._osc('sine', 1320, 0.25, 0.08);
        }, 320);
    }

    playBossWarning() {
        if (!this._initialized || !this.ctx) return;
        const t = this.ctx.currentTime;
        // Alarm sweep
        const osc = this.ctx.createOscillator();
        const g   = this.ctx.createGain();
        osc.type  = 'sawtooth';
        osc.frequency.setValueAtTime(220, t);
        osc.frequency.linearRampToValueAtTime(680, t + 0.25);
        osc.frequency.linearRampToValueAtTime(220, t + 0.5);
        g.gain.setValueAtTime(0.14, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
        osc.connect(g).connect(this._sfxGain);
        osc.start(t);
        osc.stop(t + 0.56);
    }

    playSuspicionHeartbeat() {
        if (!this._initialized || !this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(65, t);
        osc.frequency.exponentialRampToValueAtTime(35, t + 0.1);
        g.gain.setValueAtTime(0.25, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc.connect(g).connect(this._sfxGain);
        osc.start(t);
        osc.stop(t + 0.13);
    }

    playCloseCall() {
        if (!this._initialized || !this.ctx) return;
        // Exhale / whoosh of relief + celebratory stinger
        this._noise(0.35, 0.1);
        const t = this.ctx.currentTime;
        this._musicGain.gain.cancelScheduledValues(t);
        this._musicGain.gain.setValueAtTime(.015, t);
        this._musicGain.gain.linearRampToValueAtTime(this._musicVolume, t + 1.1);
        this.playSuspicionHeartbeat();
        const freqs = [523.25, 659.25, 783.99, 1046.50];
        freqs.forEach((f, i) => {
            this._later(() => {
                this._osc('triangle', f, 0.15, 0.08);
            }, i * 60);
        });
    }

    _later(callback, delay) {
        const id = setTimeout(() => { this._timeouts.delete(id); callback(); }, delay);
        this._timeouts.add(id);
        return id;
    }

    _startOfficeHum() {
        const ctx = this.ctx;
        const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let brown = 0;
        for (let i = 0; i < data.length; i++) {
            brown = (brown + (Math.random() * 2 - 1) * .02) / 1.02;
            data[i] = brown * 3.5;
        }
        this._hum = ctx.createBufferSource();
        this._hum.buffer = buffer; this._hum.loop = true;
        this._humFilter = ctx.createBiquadFilter();
        this._humFilter.type = 'lowpass'; this._humFilter.frequency.value = 360;
        this._humGain = ctx.createGain(); this._humGain.gain.value = .16;
        this._hum.connect(this._humFilter).connect(this._humGain).connect(this._masterGain);
        this._hum.start();
    }

    updateAmbience(dt) {
        if (!this._initialized) return;
        this._ambienceTimer -= dt;
        if (this._ambienceTimer <= 0) {
            this._ambienceTimer = .25 + Math.random() * .7;
            this._noise(.018, .009);
        }
    }

    dispose() {
        this.stopBgm();
        this._timeouts.forEach(id => clearTimeout(id));
        this._timeouts.clear();
        this._hum?.stop();
        this._hum?.disconnect();
        this._humFilter?.disconnect();
        this._humGain?.disconnect();
        this.ctx?.close().catch(() => {});
        this.ctx = null;
        this._initialized = false;
    }

    playScoreTick() {
        this._osc('sine', 1046.5, 0.04, 0.04);
    }

    playProductivityWarning() {
        this._osc('triangle', 330, 0.12, 0.09);
        this._osc('triangle', 220, 0.18, 0.08);
    }

    playGameOver() {
        if (!this._initialized || !this.ctx) return;
        this.stopBgm();
        const t = this.ctx.currentTime;
        [440, 370, 311, 261, 196].forEach((f, i) => {
            const osc = this.ctx.createOscillator();
            const g   = this.ctx.createGain();
            osc.type  = 'sawtooth';
            osc.frequency.value = f;
            g.gain.setValueAtTime(0.12, t + i * 0.14);
            g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.14 + 0.25);
            osc.connect(g).connect(this._sfxGain);
            osc.start(t + i * 0.14);
            osc.stop(t + i * 0.14 + 0.3);
        });
        this._noise(0.7, 0.08);
    }

    playArcadeCollision() {
        this._noise(0.35, 0.2);
        this._osc('sawtooth', 75, 0.4, 0.16);
    }

    playShieldBreak() {
        this._noise(0.25, 0.18);
        this._osc('triangle', 600, 0.2, 0.14);
        this._osc('sine', 300, 0.25, 0.1);
    }

    playHideSwitch() {
        this._osc('sine', 600, 0.06, 0.05);
        this._osc('sine', 380, 0.09, 0.04);
        this.setStealthMuffled(true);
    }

    playShowSwitch() {
        this._osc('sine', 380, 0.06, 0.05);
        this._osc('sine', 640, 0.09, 0.04);
        this.setStealthMuffled(false);
    }

    playCollect() {
        if (!this._initialized || !this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(987.77, t);
        osc.frequency.setValueAtTime(1318.51, t + 0.06);
        g.gain.setValueAtTime(0.08, t);
        g.gain.setValueAtTime(0.08, t + 0.06);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        osc.connect(g).connect(this._sfxGain);
        osc.start(t);
        osc.stop(t + 0.23);
    }

    playPowerupShield() {
        if (!this._initialized || !this.ctx) return;
        const freqs = [440, 554.37, 659.25, 880];
        freqs.forEach((f, i) => {
            this._later(() => this._osc('sine', f, 0.18, 0.08), i * 50);
        });
    }

    playPowerupNitro() {
        if (!this._initialized || !this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, t);
        osc.frequency.exponentialRampToValueAtTime(900, t + 0.35);
        g.gain.setValueAtTime(0.12, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        osc.connect(g).connect(this._sfxGain);
        osc.start(t);
        osc.stop(t + 0.42);
    }

    playPowerupMagnet() {
        this._osc('sine', 700, 0.2, 0.07);
        this._osc('sine', 1050, 0.25, 0.06);
    }

    playEmpBlast() {
        this._noise(0.4, 0.22);
        this._osc('sawtooth', 120, 0.35, 0.15);
        this._osc('sine', 50, 0.4, 0.2);
    }

    playLaneSwitchSound() {
        this._osc('sine', 523.25, 0.04, 0.04);
    }

    playLevelUp() {
        if (!this._initialized || !this.ctx) return;
        const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
        notes.forEach((f, i) => {
            this._later(() => {
                this._osc('triangle', f, 0.2, 0.09);
                this._osc('sine', f * 2, 0.2, 0.05);
            }, i * 70);
        });
    }

    playAchievement() {
        if (!this._initialized || !this.ctx) return;
        const notes = [587.33, 739.99, 880.00, 1174.66];
        notes.forEach((f, i) => {
            this._later(() => this._osc('sine', f, 0.25, 0.08), i * 80);
        });
    }
}

const AudioManager = new _AudioManager();
export default AudioManager;
