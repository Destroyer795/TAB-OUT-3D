/**
 * SaveManager.js – Persistent storage via localStorage.
 */

const STORAGE_KEY = 'tabout3d_save';

class _SaveManager {
    constructor() {
        this._data = this._load();
    }

    /* ── Public API ────────────────────────────────────── */

    get highScore() {
        return this._data.highScore || 0;
    }

    set highScore(value) {
        if (value > this._data.highScore) {
            this._data.highScore = value;
            this._persist();
        }
    }

    /**
     * Submit a score; automatically updates high score if appropriate.
     * @param {number} score
     * @returns {boolean} Whether a new high score was set.
     */
    submitScore(score) {
        if (score > this._data.highScore) {
            this._data.highScore = score;
            this._persist();
            return true;
        }
        return false;
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
