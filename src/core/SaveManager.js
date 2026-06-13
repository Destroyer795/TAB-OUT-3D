/**
 * SaveManager.js – Persistent storage via localStorage, integrated with AuthSystem.
 */

import AuthSystem from './AuthSystem.js';

const STORAGE_KEY = 'tabout3d_save';

class _SaveManager {
    constructor() {
        this._data = this._load();
    }

    /* ── Public API ────────────────────────────────────── */

    get highScore() {
        // If a user is logged in, get their personal best. Otherwise fallback to global best.
        const user = AuthSystem.getCurrentUser();
        if (user) {
            return user.personalBest || 0;
        }
        return this._data.highScore || 0;
    }

    set highScore(value) {
        let isNewLocalBest = false;
        if (value > this._data.highScore) {
            this._data.highScore = value;
            this._persist();
            isNewLocalBest = true;
        }

        const user = AuthSystem.getCurrentUser();
        if (user) {
            AuthSystem.updateScore(value);
        }
    }

    /**
     * Submit a score; automatically updates high score if appropriate.
     * @param {number} score
     * @returns {boolean} Whether a new high score was set.
     */
    submitScore(score) {
        let isNewBest = false;
        
        // 1. Update user profile score
        const user = AuthSystem.getCurrentUser();
        if (user) {
            isNewBest = AuthSystem.updateScore(score);
        }

        // 2. Also update global device high score
        if (score > this._data.highScore) {
            this._data.highScore = score;
            this._persist();
            isNewBest = true;
        }

        return isNewBest;
    }

    /** Wipe all saved data. */
    clear() {
        this._data = { highScore: 0 };
        this._persist();
    }

    /* ── Internal ──────────────────────────────────────── */

    _load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : { highScore: 0 };
        } catch {
            return { highScore: 0 };
        }
    }

    _persist() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this._data));
        } catch {
            // Storage full or blocked – silently ignore.
        }
    }
}

const SaveManager = new _SaveManager();
export default SaveManager;
