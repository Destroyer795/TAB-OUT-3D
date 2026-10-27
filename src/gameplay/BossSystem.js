/**
 * BossSystem.js – Controls boss patrol timing, warning phase, presence, and lingering pause.
 */

import EventBus from '../core/EventBus.js';
import { randomRange } from '../utils/MathUtils.js';

export class BossSystem {
    constructor() {
        /* ── Tunables ──────────────────────────────────── */
        this.minInterval   = 6.5;
        this.maxInterval   = 11.0;
        this.warningTime   = 1.6;
        this.presenceTime  = 4.4;

        /* ── Internal state ────────────────────────────── */
        this._timer        = 0;
        this._nextEvent    = 0;
        this._phase        = 'idle';   // idle | warning | present
        this._phaseTimer   = 0;
        this._bossProgress = 0;

        // Lingering inspection mechanic
        this._willPause     = false;
        this._pauseTimer    = 0;
        this._pauseDuration = 1.3;
        this._hasPaused     = false;

        this._scheduleNext();
    }

    reset() {
        this._timer        = 0;
        this._phase        = 'idle';
        this._phaseTimer   = 0;
        this._bossProgress = 0;
        this._willPause    = false;
        this._pauseTimer   = 0;
        this._hasPaused    = false;
        this._scheduleNext();
    }

    get bossProgress() { return this._bossProgress; }
    get phase()        { return this._phase; }
    get warningRemaining() { return this._phase === 'warning' ? Math.max(0, this.warningTime - this._phaseTimer) : 0; }
    get isPaused()     { return this._pauseTimer > 0; }

    /**
     * @param {number} dt – seconds
     */
    update(dt) {
        switch (this._phase) {
            case 'idle':
                this._timer += dt;
                if (this._timer >= this._nextEvent) {
                    this._phase = 'warning';
                    this._phaseTimer = 0;
                    EventBus.emit('bossWarning');
                }
                break;

            case 'warning':
                this._phaseTimer += dt;
                if (this._phaseTimer >= this.warningTime) {
                    this._phase = 'present';
                    this._phaseTimer = 0;
                    this._bossProgress = 0;
                    this._willPause = Math.random() < 0.38; // 38% chance of lingering
                    this._pauseTimer = 0;
                    this._hasPaused = false;
                    EventBus.emit('bossPresent');
                }
                break;

            case 'present':
                // Check if boss should pause right in front of player cubicle
                const baseProgress = Math.min(this._phaseTimer / this.presenceTime, 1);

                if (this._willPause && !this._hasPaused && baseProgress >= 0.46 && baseProgress <= 0.54) {
                    // Pause in place!
                    this._pauseTimer += dt;
                    if (this._pauseTimer >= this._pauseDuration) {
                        this._hasPaused = true;
                        this._pauseTimer = 0;
                    }
                    // While paused, footstep frequency decreases or pauses
                } else {
                    this._phaseTimer += dt;
                    this._bossProgress = Math.min(this._phaseTimer / this.presenceTime, 1);

                    // Footstep events roughly every 0.48s
                    if (Math.floor(this._phaseTimer / 0.48) >
                        Math.floor((this._phaseTimer - dt) / 0.48)) {
                        EventBus.emit('bossFootstep');
                    }
                }

                if (this._phaseTimer >= this.presenceTime) {
                    this.endPresence();
                }
                break;
        }
    }

    endPresence() {
        if (this._phase === 'present') {
            this._phase = 'idle';
            this._bossProgress = 0;
            this._scheduleNext();
            EventBus.emit('bossGone');
        }
    }

    _scheduleNext() {
        this._timer = 0;
        this._nextEvent = randomRange(this.minInterval, this.maxInterval);
    }
}
