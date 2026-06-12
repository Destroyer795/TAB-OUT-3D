/**
 * InputManager.js – Centralised keyboard & mouse state tracking.
 */

class _InputManager {
    constructor() {
        /** Currently held keys (key string → true). */
        this._held = {};

        /** Keys pressed this frame (consumed after read). */
        this._justPressed = {};

        /** Keys released this frame. */
        this._justReleased = {};

        /** Mouse position in normalised coords (-1 … 1). */
        this.mouseX = 0;
        this.mouseY = 0;

        this._boundKeyDown  = this._onKeyDown.bind(this);
        this._boundKeyUp    = this._onKeyUp.bind(this);
        this._boundMouseMove = this._onMouseMove.bind(this);

        this._installed = false;
    }

    /* ── Lifecycle ────────────────────────────────────── */

    install() {
        if (this._installed) return;
        window.addEventListener('keydown', this._boundKeyDown);
        window.addEventListener('keyup',   this._boundKeyUp);
        window.addEventListener('mousemove', this._boundMouseMove);
        this._installed = true;
    }

    uninstall() {
        window.removeEventListener('keydown', this._boundKeyDown);
        window.removeEventListener('keyup',   this._boundKeyUp);
        window.removeEventListener('mousemove', this._boundMouseMove);
        this._installed = false;
    }

    /** Call once at end of every game-loop tick. */
    endFrame() {
        this._justPressed  = {};
        this._justReleased = {};
    }

    /* ── Queries ──────────────────────────────────────── */

    isDown(key)         { return !!this._held[key]; }
    wasPressed(key)     { return !!this._justPressed[key]; }
    wasReleased(key)    { return !!this._justReleased[key]; }

    /* ── Internal handlers ────────────────────────────── */

    _onKeyDown(e) {
        if (!this._held[e.code]) {
            this._justPressed[e.code] = true;
        }
        this._held[e.code] = true;

        // Prevent arrow-key page scroll
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) {
            e.preventDefault();
        }
    }

    _onKeyUp(e) {
        delete this._held[e.code];
        this._justReleased[e.code] = true;
    }

    _onMouseMove(e) {
        this.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
        this.mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    }
}

/** Singleton */
const InputManager = new _InputManager();
export default InputManager;
