/**
 * GameOverScreen.js – Distinct game-over screens for each failure type.
 */

import AudioManager from '../audio/AudioManager.js';

export class GameOverScreen {
    /**
     * @param {Function} onRetry    – Restart gameplay.
     * @param {Function} onMainMenu – Return to title screen.
     */
    constructor(onRetry, onMainMenu) {
        this.el = document.getElementById('gameover');
        this._onRetry    = onRetry;
        this._onMainMenu = onMainMenu;
        this._build();
    }

    _build() {
        this.el.innerHTML = `
            <div class="go-overlay"></div>
            <div class="go-content">
                <div class="go-icon" id="go-icon"></div>
                <h2 class="go-title" id="go-title">GAME OVER</h2>
                <p class="go-reason" id="go-reason"></p>
                <div class="go-scores">
                    <div class="go-score-block">
                        <span class="go-label">FINAL SCORE</span>
                        <span class="go-value" id="go-score">0</span>
                    </div>
                    <div class="go-score-block">
                        <span class="go-label">BEST SCORE</span>
                        <span class="go-value go-best" id="go-best">0</span>
                    </div>
                </div>
                <div class="go-new-best" id="go-new-best">🏆 NEW HIGH SCORE!</div>
                <div class="go-buttons">
                    <button class="menu-btn go-btn" id="btn-retry">TRY AGAIN</button>
                    <button class="menu-btn go-btn go-btn-secondary" id="btn-menu">MAIN MENU</button>
                </div>
            </div>
        `;

        document.getElementById('btn-retry').addEventListener('click', () => {
            AudioManager.playButtonClick();
            this._onRetry();
        });
        document.getElementById('btn-menu').addEventListener('click', () => {
            AudioManager.playButtonClick();
            this._onMainMenu();
        });

        // Hover sounds
        for (const btn of this.el.querySelectorAll('.go-btn')) {
            btn.addEventListener('mouseenter', () => AudioManager.playButtonHover());
        }
    }

    /**
     * @param {'fired' | 'productivity' | 'crash'} type
     * @param {number} score
     * @param {number} best
     * @param {boolean} isNewBest
     */
    show(type, score, best, isNewBest) {
        const configs = {
            fired: {
                icon: '👔',
                title: 'BUSTED!',
                reason: 'You were caught playing games at work!',
                color: '#ff1744',
            },
            productivity: {
                icon: '📉',
                title: 'TERMINATED!',
                reason: 'HR fired you for total inactivity!',
                color: '#ff9100',
            },
            crash: {
                icon: '💥',
                title: 'CRASHED!',
                reason: 'Your ship smashed into a glitch block!',
                color: '#d500f9',
            },
        };

        const cfg = configs[type] || configs.crash;

        document.getElementById('go-icon').textContent = cfg.icon;
        document.getElementById('go-title').textContent = cfg.title;
        document.getElementById('go-title').style.color = cfg.color;
        document.getElementById('go-reason').textContent = cfg.reason;
        document.getElementById('go-score').textContent = score;
        document.getElementById('go-best').textContent = best;

        const newBestEl = document.getElementById('go-new-best');
        newBestEl.style.display = isNewBest ? 'block' : 'none';

        this.el.classList.add('visible');
    }

    hide() {
        this.el.classList.remove('visible');
    }
}
