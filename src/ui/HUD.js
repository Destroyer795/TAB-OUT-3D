/**
 * HUD.js – Upgraded In-Game Heads-Up Display.
 *
 * New Features:
 *  - Dynamic Boss Suspicion Eye Bar with heartbeat pulsing
 *  - Career Rank & Promotion Badge
 *  - Interactive Coffee Drink Widget with cooldown indicator
 *  - Toast Notification System for promotions, achievements & close calls
 *  - Pause Screen with resume, restart, and sound toggle
 */

import EventBus from '../core/EventBus.js';
import AudioManager from '../audio/AudioManager.js';

export class HUD {
    constructor() {
        this.el = document.getElementById('hud');
        this._build();
        this._toastQueue = [];
        this._isShowingToast = false;
        this._bindEvents();
        this.hide();
    }

    _build() {
        this.el.innerHTML = `
            <!-- Top Status Bar -->
            <div class="hud-top-bar">
                <div class="hud-score-block">
                    <span class="hud-label">SCORE</span>
                    <span class="hud-score" id="hud-score">0</span>
                </div>

                <div class="hud-center-cluster">
                    <div class="hud-rank-badge" id="hud-rank">
                        <span id="hud-rank-icon" class="hud-rank-tag">LVL 01</span>
                        <span id="hud-rank-title">Intern</span>
                    </div>

                    <div class="hud-mode-block" id="hud-mode">
                        <span class="hud-mode-dot"></span>
                        <span class="hud-mode-text">ARCADE</span>
                    </div>
                </div>

                <div class="hud-score-block">
                    <span class="hud-label">BEST</span>
                    <span class="hud-score hud-best" id="hud-best">0</span>
                </div>
            </div>

            <!-- Boss Suspicion Danger Meter -->
            <div class="hud-suspicion-block" id="hud-suspicion-block">
                <div class="hud-suspicion-header">
                    <span class="suspicion-icon">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3.5"/></svg>
                    </span>
                    <span class="suspicion-label">SURVEILLANCE RADAR</span>
                    <span class="suspicion-value" id="hud-suspicion-val">0%</span>
                </div>
                <div class="hud-suspicion-bar-bg">
                    <div class="hud-suspicion-bar-fill" id="hud-suspicion-fill"></div>
                </div>
            </div>

            <!-- Productivity Bar -->
            <div class="hud-productivity-block">
                <div class="hud-prod-header">
                    <span class="hud-label">PRODUCTIVITY METER</span>
                    <span class="hud-prod-value" id="hud-prod-value">100%</span>
                </div>
                <div class="hud-bar-bg">
                    <div class="hud-bar-fill" id="hud-prod-fill"></div>
                </div>
            </div>

            <!-- Interactive Coffee Widget -->
            <div class="hud-coffee-widget" id="hud-coffee-btn" title="Click or Press [C] to drink coffee">
                <span class="coffee-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="2" x2="6" y2="5"/><line x1="10" y1="2" x2="10" y2="5"/><line x1="14" y1="2" x2="14" y2="5"/></svg>
                </span>
                <div class="coffee-details">
                    <span class="coffee-title">[C] Energy Surge</span>
                    <span class="coffee-status" id="hud-coffee-status">READY</span>
                </div>
            </div>

            <!-- Boss Warning Banner -->
            <div class="hud-alert" id="hud-alert">
                <span class="alert-pulse-tag">ALERT</span> BOSS SURVEILLANCE INCOMING — HOLD SPACE TO HIDE!
            </div>

            <!-- Toast Notification Container -->
            <div class="hud-toast" id="hud-toast">
                <div class="hud-toast-icon" id="toast-icon"><span class="toast-chip">SYS</span></div>
                <div class="hud-toast-content">
                    <div class="hud-toast-title" id="toast-title">PROMOTION</div>
                    <div class="hud-toast-desc" id="toast-desc">System access upgraded</div>
                </div>
            </div>

            <!-- Quick Controls Hint Bar -->
            <div class="hud-controls">
                <span>← → / A D MOVE</span>
                <span>HOLD SPACE HIDE & CRUNCH</span>
                <span>C DRINK COFFEE</span>
                <span>P PAUSE</span>
            </div>

            <!-- Pause Modal Overlay -->
            <div class="hud-pause-overlay" id="hud-pause">
                <div class="pause-card">
                    <h2 class="pause-title">SHIFT PAUSED</h2>
                    <p class="pause-subtitle">Taking an unscheduled micro-break</p>
                    <div class="pause-buttons">
                        <button class="menu-btn" id="pause-resume">RESUME SHIFT</button>
                        <button class="menu-btn menu-btn-secondary" id="pause-mute">MUTE AUDIO</button>
                        <button class="menu-btn menu-btn-secondary" id="pause-menu">QUIT TO MENU</button>
                    </div>
                </div>
            </div>
        `;

        this._scoreEl = document.getElementById('hud-score');
        this._bestEl  = document.getElementById('hud-best');
        this._rankIcon = document.getElementById('hud-rank-icon');
        this._rankTitle = document.getElementById('hud-rank-title');
        this._prodFill = document.getElementById('hud-prod-fill');
        this._prodValue = document.getElementById('hud-prod-value');
        this._alertEl = document.getElementById('hud-alert');
        this._modeEl  = document.getElementById('hud-mode');
        this._coffeeBtn = document.getElementById('hud-coffee-btn');
        this._coffeeStatus = document.getElementById('hud-coffee-status');

        this._suspicionBlock = document.getElementById('hud-suspicion-block');
        this._suspicionFill = document.getElementById('hud-suspicion-fill');
        this._suspicionVal = document.getElementById('hud-suspicion-val');

        this._toastEl = document.getElementById('hud-toast');
        this._toastIcon = document.getElementById('toast-icon');
        this._toastTitle = document.getElementById('toast-title');
        this._toastDesc = document.getElementById('toast-desc');

        this._pauseEl = document.getElementById('hud-pause');
    }

    _bindEvents() {
        this._coffeeBtn.addEventListener('click', () => {
            EventBus.emit('requestCoffee');
        });

        EventBus.on('playerPromoted', rank => {
            this.setRank(rank.title, rank.icon);
            this.showToast(rank.icon, 'PROMOTION!', `Promoted to ${rank.title}! +${rank.bonus} Pts`);
        });

        EventBus.on('achievementUnlocked', ach => {
            this.showToast(ach.icon, 'ACHIEVEMENT UNLOCKED!', `${ach.title}: ${ach.desc}`);
        });

        EventBus.on('closeCall', () => {
            this.showToast('EVASION', 'CLOSE CALL!', 'Narrowly escaped boss detection! +250 Pts');
        });
    }

    show() { this.el.classList.add('visible'); }
    hide() { this.el.classList.remove('visible'); }

    setScore(v) {
        this._scoreEl.textContent = v;
    }

    setBest(v) {
        this._bestEl.textContent = v;
    }

    setRank(title, icon) {
        this._rankTitle.textContent = title;
        this._rankIcon.textContent = icon;
    }

    setCoffeeCooldown(remainingSeconds) {
        if (remainingSeconds <= 0) {
            this._coffeeStatus.textContent = 'READY (PRESS C)';
            this._coffeeStatus.style.color = '#00ff88';
            this._coffeeBtn.classList.add('ready');
        } else {
            this._coffeeStatus.textContent = `${remainingSeconds.toFixed(1)}s`;
            this._coffeeStatus.style.color = '#8892a4';
            this._coffeeBtn.classList.remove('ready');
        }
    }

    setSuspicion(pct) {
        if (pct <= 0) {
            this._suspicionBlock.classList.remove('active', 'critical');
            this._suspicionFill.style.width = '0%';
            this._suspicionVal.textContent = '0%';
            return;
        }

        this._suspicionBlock.classList.add('active');
        this._suspicionFill.style.width = `${Math.min(100, pct)}%`;
        this._suspicionVal.textContent = `${Math.round(pct)}%`;

        if (pct >= 55) {
            this._suspicionBlock.classList.add('critical');
        } else {
            this._suspicionBlock.classList.remove('critical');
        }
    }

    setProductivity(pct) {
        this._prodFill.style.width = `${pct}%`;
        this._prodValue.textContent = `${Math.round(pct)}%`;

        if (pct > 50) {
            this._prodFill.style.background = 'linear-gradient(90deg, #00e676, #69f0ae)';
        } else if (pct > 25) {
            this._prodFill.style.background = 'linear-gradient(90deg, #ffab00, #ffd740)';
        } else {
            this._prodFill.style.background = 'linear-gradient(90deg, #ff1744, #ff5252)';
        }
    }

    showAlert() {
        this._alertEl.classList.add('visible');
    }

    hideAlert() {
        this._alertEl.classList.remove('visible');
    }

    setMode(mode) {
        const dot  = this._modeEl.querySelector('.hud-mode-dot');
        const text = this._modeEl.querySelector('.hud-mode-text');

        if (mode === 'arcade') {
            text.textContent = 'ARCADE';
            dot.style.background = '#00ff88';
            this._modeEl.classList.remove('hud-mode-hiding');
        } else {
            text.textContent = 'STEALTH (CRUNCHING)';
            dot.style.background = '#ffab00';
            this._modeEl.classList.add('hud-mode-hiding');
        }
    }

    showToast(icon, title, desc) {
        this._toastQueue.push({ icon, title, desc });
        this._processToastQueue();
    }

    _processToastQueue() {
        if (this._isShowingToast || this._toastQueue.length === 0) return;
        this._isShowingToast = true;

        const next = this._toastQueue.shift();
        this._toastIcon.innerHTML = `<span class="toast-chip">${next.icon}</span>`;
        this._toastTitle.textContent = next.title;
        this._toastDesc.textContent = next.desc;

        this._toastEl.classList.add('visible');

        setTimeout(() => {
            this._toastEl.classList.remove('visible');
            setTimeout(() => {
                this._isShowingToast = false;
                this._processToastQueue();
            }, 350);
        }, 2800);
    }

    showPause(onResume, onMute, onQuit) {
        this._pauseEl.classList.add('visible');
        const resumeBtn = document.getElementById('pause-resume');
        const muteBtn = document.getElementById('pause-mute');
        const menuBtn = document.getElementById('pause-menu');

        resumeBtn.onclick = () => {
            this.hidePause();
            if (onResume) onResume();
        };

        muteBtn.onclick = () => {
            const isMuted = AudioManager.toggleMute();
            muteBtn.textContent = isMuted ? 'UNMUTE AUDIO' : 'MUTE AUDIO';
        };

        menuBtn.onclick = () => {
            this.hidePause();
            if (onQuit) onQuit();
        };
    }

    hidePause() {
        this._pauseEl.classList.remove('visible');
    }
}
