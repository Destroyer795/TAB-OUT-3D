/**
 * AnimationUtils.js – Easing functions and lightweight tween helpers.
 */

/* ── Easing Functions ──────────────────────────────────── */

export const Easing = {
    linear: t => t,

    easeInQuad: t => t * t,
    easeOutQuad: t => t * (2 - t),
    easeInOutQuad: t => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),

    easeInCubic: t => t * t * t,
    easeOutCubic: t => (--t) * t * t + 1,
    easeInOutCubic: t =>
        t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,

    easeInExpo: t => (t === 0 ? 0 : Math.pow(2, 10 * (t - 1))),
    easeOutExpo: t => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),

    easeOutBack: t => {
        const s = 1.70158;
        return (t -= 1) * t * ((s + 1) * t + s) + 1;
    },

    easeOutElastic: t => {
        if (t === 0 || t === 1) return t;
        return Math.pow(2, -10 * t) * Math.sin((t - 0.075) * (2 * Math.PI) / 0.3) + 1;
    },

    easeOutBounce: t => {
        if (t < 1 / 2.75) return 7.5625 * t * t;
        if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
        if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
        return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
    }
};

/* ── Tween Class ───────────────────────────────────────── */

export class Tween {
    /**
     * @param {object}   target   – Object whose properties will be interpolated.
     * @param {object}   to       – Target values  { x: 10, y: 20 }.
     * @param {number}   duration – Duration in seconds.
     * @param {object}   opts     – { easing, delay, onUpdate, onComplete }
     */
    constructor(target, to, duration, opts = {}) {
        this.target   = target;
        this.to       = to;
        this.duration  = duration;
        this.easing    = opts.easing || Easing.easeOutCubic;
        this.delay     = opts.delay  || 0;
        this.onUpdate  = opts.onUpdate  || null;
        this.onComplete = opts.onComplete || null;

        this.from      = {};
        this.elapsed   = 0;
        this.finished  = false;

        for (const key in to) {
            this.from[key] = target[key];
        }
    }

    update(dt) {
        if (this.finished) return;
        if (this.delay > 0) { this.delay -= dt; return; }

        this.elapsed += dt;
        const rawT = Math.min(this.elapsed / this.duration, 1);
        const t = this.easing(rawT);

        for (const key in this.to) {
            this.target[key] = this.from[key] + (this.to[key] - this.from[key]) * t;
        }

        if (this.onUpdate) this.onUpdate(rawT);

        if (rawT >= 1) {
            this.finished = true;
            if (this.onComplete) this.onComplete();
        }
    }
}

/* ── Tween Manager ─────────────────────────────────────── */

export class TweenManager {
    constructor() {
        /** @type {Tween[]} */
        this.tweens = [];
    }

    /** Create & register a tween, returns the Tween instance. */
    add(target, to, duration, opts) {
        const tw = new Tween(target, to, duration, opts);
        this.tweens.push(tw);
        return tw;
    }

    update(dt) {
        for (let i = this.tweens.length - 1; i >= 0; i--) {
            this.tweens[i].update(dt);
            if (this.tweens[i].finished) {
                this.tweens.splice(i, 1);
            }
        }
    }

    clear() {
        this.tweens.length = 0;
    }
}
