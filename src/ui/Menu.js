/**
 * Menu.js – Polished animated title screen.
 */

import AudioManager from '../audio/AudioManager.js';

export class Menu {
    /**
     * @param {Function} onStart – Callback when player clicks Start.
     */
    constructor(onStart) {
        this.el = document.getElementById('menu');
        this._onStart = onStart;
        this._ambienceInterval = null;
        this._build();
    }

    _build() {
        this.el.innerHTML = `
            <div class="menu-bg"></div>
            <div class="menu-content">
                <h1 class="menu-title">
                    <span class="title-tab">TAB</span><span class="title-dash">-</span><span class="title-out">OUT</span>
                    <span class="title-3d">3D</span>
                </h1>
                <p class="menu-subtitle">A Stealth Arcade Experience</p>

                <div class="menu-instructions">
                    <div class="instruction-row">
                        <span class="key">←  →</span>
                        <span>Move ship between lanes</span>
                    </div>
                    <div class="instruction-row">
                        <span class="key">SPACE</span>
                        <span>Hold to hide arcade / show spreadsheet</span>
                    </div>
                    <div class="instruction-row">
                        <span class="key">ESC</span>
                        <span>Pause / Return to menu</span>
                    </div>
                </div>

                <p class="menu-tip">Play the arcade game to score points — but hide it before the boss sees! Hiding drains your productivity, so don't stay hidden too long.</p>

                <button class="menu-btn" id="btn-start">
                    <span class="btn-glow"></span>
                    START GAME
                </button>
            </div>
        `;

        const btn = document.getElementById('btn-start');
        btn.addEventListener('mouseenter', () => AudioManager.playButtonHover());
        btn.addEventListener('click', () => {
            AudioManager.playButtonClick();
            this._onStart();
        });
    }

    show() {
        this.el.classList.add('visible');
        // Start ambience loop
        this._ambienceInterval = setInterval(() => {
            AudioManager.playMenuAmbience();
        }, 3500);
        AudioManager.playMenuAmbience();
    }

    hide() {
        this.el.classList.remove('visible');
        if (this._ambienceInterval) {
            clearInterval(this._ambienceInterval);
            this._ambienceInterval = null;
        }
    }
}
