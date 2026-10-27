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

        /* ── Speed and pacing dynamics ─────────────────── */
        this.walkSpeed     = 2.7;

        /* ── Internal state ────────────────────────────── */
        this._timer        = 0;
        this._nextEvent    = 0;
        this._phase        = 'idle';   // idle | warning | present
        this._phaseTimer   = 0;
        this._bossProgress = 0;

        // Lingering inspection & sudden stop mechanics
        this._willPause     = false;
        this._pauseTimer    = 0;
        this._pauseDuration = 1.4;
        this._pauseTarget   = 0.48;
        this._pauseType     = 'desk'; // 'desk' | 'hesitant' | 'none'
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
        this._pauseDuration = 1.4;
        this._pauseTarget   = 0.48;
        this._pauseType     = 'none';
        this._hasPaused    = false;
        this._scheduleNext();
    }

    get bossProgress() { return this._bossProgress; }
    get phase()        { return this._phase; }
    get warningRemaining() { return this._phase === 'warning' ? Math.max(0, this.warningTime - this._phaseTimer) : 0; }
    get isPaused()     { return this._pauseTimer > 0; }
    get pauseType()    { return this._pauseType; }
    get pauseDuration(){ return this._pauseDuration; }

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
                    this._setupVisitDynamics();
                    EventBus.emit('bossWarning');
                }
                break;

            case 'warning':
                this._phaseTimer += dt;
                if (this._phaseTimer >= this.warningTime) {
                    this._phase = 'present';
                    this._phaseTimer = 0;
                    this._bossProgress = 0;
                    this._pauseTimer = 0;
                    this._hasPaused = false;
                    EventBus.emit('bossPresent');
                }
                break;

            case 'present':
                const baseProgress = Math.min(this._phaseTimer / Math.max(0.001, this.presenceTime), 1);

                // Check if boss should pause (desk inspection or hesitant aisle stop)
                if (this._willPause && !this._hasPaused && baseProgress >= (this._pauseTarget || 0.46)) {
                    this._pauseTimer += dt;
                    if (this._pauseTimer >= this._pauseDuration) {
                        this._hasPaused = true;
                        this._pauseTimer = 0;
                    }
                } else {
                    this._phaseTimer += dt;
                    this._bossProgress = Math.min(this._phaseTimer / Math.max(0.001, this.presenceTime), 1);

                    // Dynamic footstep pacing based on walk speed
                    const stepInterval = Math.max(0.22, Math.min(0.44, 0.85 / (this.walkSpeed || 2.7)));
                    if (Math.floor(this._phaseTimer / stepInterval) >
                        Math.floor((this._phaseTimer - dt) / stepInterval)) {
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
            this._pauseTimer = 0;
            this._hasPaused = false;
            this._scheduleNext();
            EventBus.emit('bossGone');
        }
    }

    _setupVisitDynamics() {
        // Random brisk walk speed between 2.3 and 3.6 m/s (much faster than the old 1.35 m/s crawl)
        this.walkSpeed = randomRange(2.3, 3.6);

        const roll = Math.random();
        if (roll < 0.40) {
            // Desk inspection: stops right at player's cubicle
            this._willPause = true;
            this._pauseTarget = randomRange(0.46, 0.52);
            this._pauseDuration = randomRange(1.3, 2.4);
            this._pauseType = 'desk';
        } else if (roll < 0.65) {
            // Hesitant mid-aisle stop: abruptly halts before reaching desk to look around
            this._willPause = true;
            this._pauseTarget = randomRange(0.24, 0.33);
            this._pauseDuration = randomRange(0.9, 1.6);
            this._pauseType = 'hesitant';
        } else {
            // Continuous fast march across
            this._willPause = false;
            this._pauseDuration = 0;
            this._pauseType = 'none';
        }
    }

    _scheduleNext() {
        this._timer = 0;
        this._nextEvent = randomRange(this.minInterval, this.maxInterval);
    }
}
