/**
 * AudioManager.js – All game audio via Web Audio API synthesis.
 * No external audio files needed.
 */

class _AudioManager {
    constructor() {
        /** @type {AudioContext|null} */
        this.ctx = null;
        this._masterGain = null;
        this._initialized = false;
        this._muted = false;
    }

    /* ── Lifecycle ────────────────────────────────────── */

    /** Must be called after a user gesture. */
    init() {
        if (this._initialized) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this._masterGain = this.ctx.createGain();
        this._masterGain.gain.value = 0.35;
        this._masterGain.connect(this.ctx.destination);
        this._initialized = true;
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this._muted = !this._muted;
        if (this._masterGain) {
            this._masterGain.gain.value = this._muted ? 0 : 0.35;
        }
        return this._muted;
    }

    /* ── Utility synth primitives ─────────────────────── */

    _osc(type, freq, duration, gainVal = 0.15, detune = 0) {
        if (!this._initialized) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const g   = this.ctx.createGain();
        osc.type  = type;
        osc.frequency.value = freq;
        osc.detune.value = detune;
        g.gain.setValueAtTime(gainVal, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + duration);
        osc.connect(g).connect(this._masterGain);
        osc.start(t);
        osc.stop(t + duration);
    }

    _noise(duration, gainVal = 0.08) {
        if (!this._initialized) return;
        const t = this.ctx.currentTime;
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const src = this.ctx.createBufferSource();
        src.buffer = buffer;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(gainVal, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + duration);
        src.connect(g).connect(this._masterGain);
        src.start(t);
    }

    /* ── Sound Effects ────────────────────────────────── */

    playMenuAmbience() {
        if (!this._initialized) return;
        // Soft pad chord
        const freqs = [130.81, 164.81, 196.00, 261.63];
        freqs.forEach(f => {
            this._osc('sine', f, 3.0, 0.04);
            this._osc('triangle', f * 2, 3.0, 0.02);
        });
    }

    playButtonHover() {
        this._osc('sine', 880, 0.08, 0.06);
    }

    playButtonClick() {
        this._osc('square', 440, 0.06, 0.08);
        this._osc('sine', 660, 0.1, 0.06);
    }

    playTyping() {
        const freq = 1200 + Math.random() * 800;
        this._noise(0.03, 0.06);
        this._osc('square', freq, 0.02, 0.03);
    }

    playBossWarning() {
        if (!this._initialized) return;
        const t = this.ctx.currentTime;
        // Alarm sweep
        const osc = this.ctx.createOscillator();
        const g   = this.ctx.createGain();
        osc.type  = 'sawtooth';
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.linearRampToValueAtTime(600, t + 0.3);
        osc.frequency.linearRampToValueAtTime(200, t + 0.6);
        g.gain.setValueAtTime(0.12, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
        osc.connect(g).connect(this._masterGain);
        osc.start(t);
        osc.stop(t + 0.7);
    }

    playFootstep() {
        this._noise(0.08, 0.1);
        this._osc('sine', 80 + Math.random() * 40, 0.12, 0.08);
    }

    playScoreTick() {
        this._osc('sine', 1046.5, 0.06, 0.05);
    }

    playProductivityWarning() {
        this._osc('triangle', 330, 0.15, 0.1);
        this._osc('triangle', 220, 0.2, 0.08);
    }

    playGameOver() {
        if (!this._initialized) return;
        const t = this.ctx.currentTime;
        // Descending tones
        [440, 370, 311, 261].forEach((f, i) => {
            const osc = this.ctx.createOscillator();
            const g   = this.ctx.createGain();
            osc.type  = 'square';
            osc.frequency.value = f;
            g.gain.setValueAtTime(0.1, t + i * 0.15);
            g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.15 + 0.25);
            osc.connect(g).connect(this._masterGain);
            osc.start(t + i * 0.15);
            osc.stop(t + i * 0.15 + 0.3);
        });
        this._noise(0.6, 0.05);
    }

    playArcadeCollision() {
        this._noise(0.3, 0.15);
        this._osc('sawtooth', 80, 0.4, 0.12);
    }

    playHideSwitch() {
        this._osc('sine', 600, 0.08, 0.06);
        this._osc('sine', 400, 0.12, 0.04);
    }

    playShowSwitch() {
        this._osc('sine', 400, 0.08, 0.06);
        this._osc('sine', 600, 0.12, 0.04);
    }

    playLaneSwitchSound() {
        this._osc('sine', 523.25, 0.05, 0.05);
    }
}

const AudioManager = new _AudioManager();
export default AudioManager;
