/**
 * BossSystem.js – Controls boss timing, warning phase, and presence phase.
 */

import EventBus from '../core/EventBus.js';
import { randomRange } from '../utils/MathUtils.js';

export class BossSystem {
    constructor() {
        /* ── Tunables ──────────────────────────────────── */
        this.minInterval   = 6;    // seconds between boss events
        this.maxInterval   = 10;
        this.warningTime   = 1.5;  // warning phase duration
        this.presenceTime  = 4.0;  // boss visible duration

        /* ── Internal state ────────────────────────────── */
        this._timer        = 0;
        this._nextEvent    = 0;
        this._phase        = 'idle';   // idle | warning | present
        this._phaseTimer   = 0;
        this._bossProgress = 0;        // 0…1 walk progress (for animation)

        this._scheduleNext();
    }

    reset() {
        this._timer     = 0;
        this._phase     = 'idle';
        this._phaseTimer = 0;
        this._bossProgress = 0;
        this._scheduleNext();
    }

    /** 0…1 boss walk progress for the scene animation. */
    get bossProgress() { return this._bossProgress; }

    /** Current boss phase. */
    get phase() { return this._phase; }

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
                    EventBus.emit('bossPresent');
                }
                break;

            case 'present':
                this._phaseTimer += dt;
                this._bossProgress = Math.min(this._phaseTimer / this.presenceTime, 1);

                // Footstep events (roughly every 0.5s)
                if (Math.floor(this._phaseTimer / 0.5) >
                    Math.floor((this._phaseTimer - dt) / 0.5)) {
                    EventBus.emit('bossFootstep');
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
