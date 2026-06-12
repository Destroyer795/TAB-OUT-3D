/**
 * StateMachine.js – Centralized finite state machine for game states.
 *
 * Valid states:
 *   MENU | PLAYING | HIDING | BOSS_WARNING | BOSS_PRESENT
 *   GAMEOVER_FIRED | GAMEOVER_PRODUCTIVITY | GAMEOVER_CRASH
 */

import EventBus from './EventBus.js';

export const GameState = Object.freeze({
    MENU:                  'MENU',
    PLAYING:               'PLAYING',
    HIDING:                'HIDING',
    BOSS_WARNING:          'BOSS_WARNING',
    BOSS_PRESENT:          'BOSS_PRESENT',
    GAMEOVER_FIRED:        'GAMEOVER_FIRED',
    GAMEOVER_PRODUCTIVITY: 'GAMEOVER_PRODUCTIVITY',
    GAMEOVER_CRASH:        'GAMEOVER_CRASH',
});

/**
 * Allowed transitions:  from → [to, to, …]
 */
const TRANSITIONS = {
    [GameState.MENU]: [
        GameState.PLAYING,
    ],
    [GameState.PLAYING]: [
        GameState.HIDING,
        GameState.BOSS_WARNING,
        GameState.GAMEOVER_CRASH,
        GameState.GAMEOVER_PRODUCTIVITY,
        GameState.MENU,
    ],
    [GameState.HIDING]: [
        GameState.PLAYING,
        GameState.BOSS_WARNING,
        GameState.GAMEOVER_PRODUCTIVITY,
        GameState.MENU,
    ],
    [GameState.BOSS_WARNING]: [
        GameState.BOSS_PRESENT,
        GameState.HIDING,
        GameState.GAMEOVER_FIRED,
        GameState.GAMEOVER_CRASH,
        GameState.GAMEOVER_PRODUCTIVITY,
        GameState.MENU,
    ],
    [GameState.BOSS_PRESENT]: [
        GameState.PLAYING,
        GameState.HIDING,
        GameState.GAMEOVER_FIRED,
        GameState.GAMEOVER_CRASH,
        GameState.GAMEOVER_PRODUCTIVITY,
        GameState.MENU,
    ],
    [GameState.GAMEOVER_FIRED]: [
        GameState.MENU,
        GameState.PLAYING,
    ],
    [GameState.GAMEOVER_PRODUCTIVITY]: [
        GameState.MENU,
        GameState.PLAYING,
    ],
    [GameState.GAMEOVER_CRASH]: [
        GameState.MENU,
        GameState.PLAYING,
    ],
};

export class StateMachine {
    constructor() {
        /** @type {string} */
        this._current = GameState.MENU;
        /** @type {string|null} */
        this._previous = null;
    }

    /** Current state string. */
    get current() { return this._current; }

    /** Previous state string. */
    get previous() { return this._previous; }

    /**
     * Attempt a state transition.
     * @param {string} newState  – One of GameState values.
     * @returns {boolean} Whether the transition was accepted.
     */
    transition(newState) {
        const allowed = TRANSITIONS[this._current];
        if (!allowed || !allowed.includes(newState)) {
            console.warn(
                `[StateMachine] Blocked transition: ${this._current} → ${newState}`
            );
            return false;
        }

        this._previous = this._current;
        this._current  = newState;

        EventBus.emit('stateChange', {
            from: this._previous,
            to:   this._current,
        });

        return true;
    }

    /** Helper: is the game in any of the game-over states? */
    get isGameOver() {
        return (
            this._current === GameState.GAMEOVER_FIRED ||
            this._current === GameState.GAMEOVER_PRODUCTIVITY ||
            this._current === GameState.GAMEOVER_CRASH
        );
    }

    /** Helper: is the game actively being played (any non-menu, non-gameover state)? */
    get isActive() {
        return (
            this._current === GameState.PLAYING ||
            this._current === GameState.HIDING  ||
            this._current === GameState.BOSS_WARNING ||
            this._current === GameState.BOSS_PRESENT
        );
    }

    /** Force-reset to MENU (e.g. hard restart). */
    reset() {
        this._previous = this._current;
        this._current  = GameState.MENU;
        EventBus.emit('stateChange', { from: this._previous, to: this._current });
    }
}
