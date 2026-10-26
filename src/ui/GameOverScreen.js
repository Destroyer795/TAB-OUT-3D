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
                <div class="go-rank-block">
                    <span class="go-rank-label">FINAL POSITION</span>
                    <span class="go-rank-val" id="go-rank"><span class="go-rank-chip">LVL 01</span> Intern</span>
                </div>
                <div class="go-new-best" id="go-new-best">
                    <span class="new-record-chip">NEW RECORD</span>
                    <span>PERSONAL BEST ACHIEVED</span>
                </div>
                <div class="go-buttons">
                    <button class="menu-btn go-btn" id="btn-retry">START NEW SHIFT</button>
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
    show(type, score, best, isNewBest, rankTitle = 'Unpaid Intern', rankIcon = 'LVL 01') {
        const configs = {
            fired: {
                icon: '<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="1" fill="#f43f5e"/></svg>',
                title: 'SURVEILLANCE BREACH',
                reason: 'Boss surveillance camera identified unauthorized arcade operations.',
                color: '#f43f5e',
            },
            productivity: {
                icon: '<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>',
                title: 'PRODUCTIVITY COLLAPSE',
                reason: 'Audit ledger neglected. Corporate productivity dropped to zero.',
                color: '#f59e0b',
            },
            crash: {
                icon: '<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#00d2ff" stroke-width="2" stroke-linecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
                title: 'KINETIC COLLISION',
                reason: 'Vessel was annihilated by an active firewall glitch barrier.',
                color: '#00d2ff',
            },
        };

        const cfg = configs[type] || configs.crash;

        document.getElementById('go-icon').innerHTML = cfg.icon;
        document.getElementById('go-title').textContent = cfg.title;
        document.getElementById('go-title').style.color = cfg.color;
        document.getElementById('go-reason').textContent = cfg.reason;
        document.getElementById('go-score').textContent = score;
        document.getElementById('go-best').textContent = best;

        const rankEl = document.getElementById('go-rank');
        if (rankEl) {
            rankEl.innerHTML = `<span class="go-rank-chip">${rankIcon}</span> <span>${rankTitle}</span>`;
        }

        const newBestEl = document.getElementById('go-new-best');
        newBestEl.style.display = isNewBest ? 'flex' : 'none';

        this.el.classList.add('visible');
    }

    hide() {
        this.el.classList.remove('visible');
    }
}
