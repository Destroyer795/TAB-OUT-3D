/**
 * Menu.js – Polished animated title screen with user welcome, sign out, and local leaderboards.
 */

import AudioManager from '../audio/AudioManager.js';
import AuthSystem   from '../core/AuthSystem.js';

export class Menu {
    /**
     * @param {Function} onStart   – Callback when player clicks Start.
     * @param {Function} onSignOut – Callback when player clicks Sign Out.
     */
    constructor(onStart, onSignOut) {
        this.el = document.getElementById('menu');
        this._onStart = onStart;
        this._onSignOut = onSignOut;
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

                <!-- User Welcome Banner -->
                <div class="menu-user-banner">
                    <div class="user-info">
                        <div class="user-greeting">
                            OPERATIVE: <span id="menu-username" class="user-highlight">Agent</span>
                        </div>
                        <div class="user-pb">
                            RECORD: <span id="menu-pb" class="pb-highlight">0</span> <span class="pb-unit">PTS</span>
                        </div>
                    </div>
                    <button class="menu-btn menu-btn-secondary sign-out-btn" id="btn-signout">
                        DISCONNECT
                    </button>
                </div>

                <div class="menu-instructions">
                    <div class="instruction-row">
                        <span class="key">← → / A D</span>
                        <span>Move ship & dodge barriers</span>
                    </div>
                    <div class="instruction-row">
                        <span class="key">HOLD SPACE</span>
                        <span>Camouflage & crunch ledger</span>
                    </div>
                    <div class="instruction-row">
                        <span class="key">C KEY</span>
                        <span>Energy coffee boost</span>
                    </div>
                    <div class="instruction-row">
                        <span class="key">P / ESC</span>
                        <span>Pause operations</span>
                    </div>
                </div>

                <!-- Leaderboard Widget -->
                <div class="menu-leaderboard">
                    <div class="leaderboard-title">
                        <span class="terminal-dot"></span>
                        <span>TOP SYSTEM OPERATORS</span>
                    </div>
                    <div class="leaderboard-rows" id="leaderboard-rows">
                        <!-- Populated dynamically on show() -->
                    </div>
                </div>

                <p class="menu-tip">Piloting through digital firewall corridors. When surveillance approaches, hold SPACE to camouflage as spreadsheet data.</p>

                <button class="menu-btn" id="btn-start" style="width: 100%; max-width: 320px; margin-top: 12px;">
                    <span class="btn-glow"></span>
                    INITIALIZE RUN
                </button>
            </div>
        `;

        const btnStart = document.getElementById('btn-start');
        btnStart.addEventListener('mouseenter', () => AudioManager.playButtonHover());
        btnStart.addEventListener('click', () => {
            AudioManager.playButtonClick();
            this._onStart();
        });

        const btnSignOut = document.getElementById('btn-signout');
        btnSignOut.addEventListener('mouseenter', () => AudioManager.playButtonHover());
        btnSignOut.addEventListener('click', () => {
            AudioManager.playButtonClick();
            this._onSignOut();
        });
    }

    /** Re-populate user details and leaderboard lists */
    async _refreshDetails() {
        const user = await AuthSystem.getCurrentUser();
        if (user) {
            document.getElementById('menu-username').textContent = user.username;
            document.getElementById('menu-pb').textContent = user.personalBest || 0;
        }

        const leaderboardRows = document.getElementById('leaderboard-rows');
        const list = await AuthSystem.getLeaderboard();

        if (list.length === 0) {
            leaderboardRows.innerHTML = `<div class="leaderboard-empty">No scores recorded yet. Be the first!</div>`;
        } else {
            leaderboardRows.innerHTML = list.map((item, index) => {
                const rankNum = String(index + 1).padStart(2, '0');
                const rankClass = index === 0 ? 'rank-gold' : index === 1 ? 'rank-silver' : index === 2 ? 'rank-bronze' : 'rank-standard';
                const isCurrentUser = user && item.username === user.username;
                const highlightClass = isCurrentUser ? 'leaderboard-row-self' : '';
                return `
                    <div class="leaderboard-row ${highlightClass}">
                        <span class="rank-badge ${rankClass}">${rankNum}</span>
                        <span class="username">${item.username}</span>
                        <span class="score">${item.personalBest} <span class="score-unit">PTS</span></span>
                    </div>
                `;
            }).join('');
        }
    }

    async show() {
        await this._refreshDetails();
        this.el.classList.add('visible');
        AudioManager.startBgm('menu');
    }

    hide() {
        this.el.classList.remove('visible');
        AudioManager.stopBgm();
        if (this._ambienceInterval) {
            clearInterval(this._ambienceInterval);
            this._ambienceInterval = null;
        }
    }
}
