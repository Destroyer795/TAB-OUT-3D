/**
 * ProductivitySystem.js – Tracks the player's productivity meter.
 */

import EventBus from '../core/EventBus.js';
import { clamp } from '../utils/MathUtils.js';

export class ProductivitySystem {
    constructor() {
        /** Percentage 0-100. */
        this.value = 100;
        /** Drain rate while idle (%/s). */
        this.drainRate = 15;
        /** Recovery rate while hiding & boss absent (%/s). */
        this.recoverRate = 0; // no recovery – pure drain
        /** Warning already shown this low? */
        this._warned25 = false;
        this._warned10 = false;
    }

    reset() {
        this.value = 100;
        this._warned25 = false;
        this._warned10 = false;
    }

    /**
     * @param {number}  dt         – Delta time (seconds).
     * @param {boolean} isDraining – Should productivity drain this frame?
     */
    update(dt, isDraining) {
        if (isDraining) {
            this.value -= this.drainRate * dt;
        }

        this.value = clamp(this.value, 0, 100);

        // Warnings
        if (this.value <= 25 && !this._warned25) {
            this._warned25 = true;
            EventBus.emit('productivityWarning', { level: 25 });
        }
        if (this.value <= 10 && !this._warned10) {
            this._warned10 = true;
            EventBus.emit('productivityWarning', { level: 10 });
        }

        if (this.value <= 0) {
            EventBus.emit('productivityDepleted');
        }
    }
}
