/**
 * EventBus.js – Lightweight publish / subscribe event system.
 *
 * Usage:
 *   EventBus.on('bossWarning', handler);
 *   EventBus.emit('bossWarning', { timeLeft: 1.5 });
 *   EventBus.off('bossWarning', handler);
 */

class _EventBus {
    constructor() {
        /** @type {Map<string, Set<Function>>} */
        this._listeners = new Map();
    }

    /**
     * Subscribe to an event.
     * @param {string}   event
     * @param {Function} callback
     */
    on(event, callback) {
        if (!this._listeners.has(event)) {
            this._listeners.set(event, new Set());
        }
        this._listeners.get(event).add(callback);
    }

    /**
     * Unsubscribe from an event.
     * @param {string}   event
     * @param {Function} callback
     */
    off(event, callback) {
        const set = this._listeners.get(event);
        if (set) set.delete(callback);
    }

    /**
     * Emit an event, calling all subscribers synchronously.
     * @param {string} event
     * @param {*}      data
     */
    emit(event, data) {
        const set = this._listeners.get(event);
        if (!set) return;
        for (const fn of set) {
            fn(data);
        }
    }

    /** Remove all listeners (useful on full reset). */
    clear() {
        this._listeners.clear();
    }
}

/** Singleton */
const EventBus = new _EventBus();
export default EventBus;
