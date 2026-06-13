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
                    <div class="user-greeting">
                        Welcome, <span id="menu-username" class="user-highlight">Agent</span>!
                    </div>
                    <div class="user-pb">
                        Personal Best: <span id="menu-pb" class="pb-highlight">0</span> pts
                    </div>
                    <button class="menu-btn menu-btn-secondary sign-out-btn" id="btn-signout">
                        SIGN OUT
                    </button>
                </div>

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

                <!-- Leaderboard Widget -->
                <div class="menu-leaderboard">
                    <h3 class="leaderboard-title">🏆 OFFICE LEADERBOARD</h3>
                    <div class="leaderboard-rows" id="leaderboard-rows">
                        <!-- Populated dynamically on show() -->
                    </div>
                </div>

                <p class="menu-tip">Play the arcade game to score points — but hide it before the boss sees! Hiding drains your productivity, so don't stay hidden too long.</p>

                <button class="menu-btn" id="btn-start" style="width: 100%; max-width: 320px; margin-top: 12px;">
                    <span class="btn-glow"></span>
                    START GAME
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
    _refreshDetails() {
        const user = AuthSystem.getCurrentUser();
        if (user) {
            document.getElementById('menu-username').textContent = user.username;
            document.getElementById('menu-pb').textContent = user.personalBest || 0;
        }

        const leaderboardRows = document.getElementById('leaderboard-rows');
        const list = AuthSystem.getLeaderboard();

        if (list.length === 0) {
            leaderboardRows.innerHTML = `<div class="leaderboard-empty">No scores recorded yet. Be the first!</div>`;
        } else {
            leaderboardRows.innerHTML = list.map((item, index) => {
                const rankText = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;
                const isCurrentUser = user && item.username === user.username;
                const highlightClass = isCurrentUser ? 'leaderboard-row-self' : '';
                return `
                    <div class="leaderboard-row ${highlightClass}">
                        <span class="rank">${rankText}</span>
                        <span class="username">${item.username}</span>
                        <span class="score">${item.personalBest} pts</span>
                    </div>
                `;
            }).join('');
        }
    }

    show() {
        this._refreshDetails();
        this.el.classList.add('visible');
        
        // Start ambience loop
        if (this._ambienceInterval) {
            clearInterval(this._ambienceInterval);
        }
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
