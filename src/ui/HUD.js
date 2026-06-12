/**
 * HUD.js – In-game heads-up display (DOM overlay).
 */

import EventBus from '../core/EventBus.js';

export class HUD {
    constructor() {
        this.el = document.getElementById('hud');
        this._build();
        this.hide();
    }

    _build() {
        this.el.innerHTML = `
            <div class="hud-top-bar">
                <div class="hud-score-block">
                    <span class="hud-label">SCORE</span>
                    <span class="hud-score" id="hud-score">0</span>
                </div>
                <div class="hud-mode-block" id="hud-mode">
                    <span class="hud-mode-dot"></span>
                    <span class="hud-mode-text">ARCADE</span>
                </div>
                <div class="hud-score-block">
                    <span class="hud-label">BEST</span>
                    <span class="hud-score hud-best" id="hud-best">0</span>
                </div>
            </div>

            <div class="hud-productivity-block">
                <span class="hud-label">PRODUCTIVITY</span>
                <div class="hud-bar-bg">
                    <div class="hud-bar-fill" id="hud-prod-fill"></div>
                </div>
                <span class="hud-prod-value" id="hud-prod-value">100%</span>
            </div>

            <div class="hud-alert" id="hud-alert">
                ⚠ BOSS INCOMING!
            </div>

            <div class="hud-controls">
                <span>← → MOVE</span>
                <span>HOLD SPACE TO HIDE</span>
                <span>ESC MENU</span>
            </div>
        `;

        this._scoreEl = document.getElementById('hud-score');
        this._bestEl  = document.getElementById('hud-best');
        this._prodFill = document.getElementById('hud-prod-fill');
        this._prodValue = document.getElementById('hud-prod-value');
        this._alertEl = document.getElementById('hud-alert');
        this._modeEl  = document.getElementById('hud-mode');
    }

    show() { this.el.classList.add('visible'); }
    hide() { this.el.classList.remove('visible'); }

    setScore(v) {
        this._scoreEl.textContent = v;
    }

    setBest(v) {
        this._bestEl.textContent = v;
    }

    setProductivity(pct) {
        this._prodFill.style.width = `${pct}%`;
        this._prodValue.textContent = `${Math.round(pct)}%`;

        // Color coding
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
            text.textContent = 'STEALTH';
            dot.style.background = '#ffab00';
            this._modeEl.classList.add('hud-mode-hiding');
        }
    }
}
