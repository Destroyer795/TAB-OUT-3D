/**
 * SpreadsheetMode.js – Interactive corporate spreadsheet simulation.
 *
 * New Features:
 *  - Active Number-Crunching: Typing any keys while hiding files financial formulas!
 *  - Mechanical keyboard audio feedback per key press.
 *  - Floating profit popups & live animated bar chart reactions.
 *  - Active typing replenishes employee productivity meter!
 *  - Hilarious corporate jargon generator.
 */

import AudioManager from '../audio/AudioManager.js';
import EventBus from '../core/EventBus.js';

const W = 1024;
const H = 576;

const COL_NAMES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
const ROW_HEIGHT = 24;
const HEADER_HEIGHT = 28;
const TOOLBAR_HEIGHT = 36;
const COL_WIDTH = 95;
const ROW_HEADER_WIDTH = 40;

const FORMULAS = [
    '=SYNERGY(Q3_CAPEX * 1.45)',
    '=EBITDA_GROWTH(REV, COGS)',
    '=ACCELERATE_AI_DIVIDENDS()',
    '=MAX(COFFEE_BUDGET, 99999)',
    '=VLOOKUP("PROFITS", A1:J20, 2)',
    '=TAX_OPTIMIZATION_BURNOUT()',
    '=FORECAST_UNLIMITED_PIVOT()',
    '=AUDIT_PROOF_INVENTORY()'
];

const JARGON_POPUPS = [
    '+$24,500 EBITDA',
    'SYNERGY +10%',
    'BUDGET APPROVED!',
    'PROD RECOVERED!',
    'Q3 TARGET CRUSHED!',
    'SHAREHOLDERS HAPPY',
    'PARADIGM SHIFTED'
];

export class SpreadsheetMode {
    /**
     * @param {HTMLCanvasElement} canvas – Shared monitor canvas (1024×576).
     */
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx    = canvas.getContext('2d');

        this._cells = this._generateCells();
        this._chartData = this._generateChartData();
        this._cursorRow = 3;
        this._cursorCol = 2;
        this._typingTimer = 0;
        this._typingText = '=SUM(B3:G3)';
        this._updateTimer = 0;
        this._popups = [];
        this._totalCrunched = 0;
    }

    reset() {
        this._cells = this._generateCells();
        this._chartData = this._generateChartData();
        this._typingTimer = 0;
        this._typingText = '=SUM(B3:G3)';
        this._updateTimer = 0;
        this._popups = [];
        this._totalCrunched = 0;
    }

    /**
     * Called when the player presses a key while hiding.
     * Generates active number crunching productivity boost!
     */
    crunchNumber() {
        this._totalCrunched++;
        AudioManager.playMechanicalKey();

        // Advance cursor
        this._cursorCol = (this._cursorCol + 1) % 8;
        if (this._cursorCol === 0) {
            this._cursorRow = 2 + Math.floor(Math.random() * 10);
        }

        // Cycle formula
        const formula = FORMULAS[this._totalCrunched % FORMULAS.length];
        this._typingText = formula;

        // Boost chart and cell
        if (this._cells[this._cursorRow] && this._cells[this._cursorRow][this._cursorCol]) {
            const addedVal = (Math.random() * 8500 + 1200).toFixed(2);
            this._cells[this._cursorRow][this._cursorCol].value = `$${addedVal}`;
            this._cells[this._cursorRow][this._cursorCol].color = '#008744';
        }

        const chartIdx = Math.floor(Math.random() * this._chartData.length);
        this._chartData[chartIdx] = Math.min(100, this._chartData[chartIdx] + 12);

        // Spawn corporate profit popup
        const randJargon = JARGON_POPUPS[Math.floor(Math.random() * JARGON_POPUPS.length)];
        this._popups.push({
            text: randJargon,
            x: ROW_HEADER_WIDTH + this._cursorCol * COL_WIDTH + COL_WIDTH / 2,
            y: HEADER_HEIGHT + TOOLBAR_HEIGHT + 24 + this._cursorRow * ROW_HEIGHT,
            life: 0.8,
            maxLife: 0.8,
        });

        // Emit work done for Game productivity recovery bonus
        EventBus.emit('spreadsheetWorkDone', { boost: 2.2 });
    }

    /**
     * @param {number} dt
     */
    update(dt) {
        this._typingTimer += dt;
        this._updateTimer += dt;

        // Subtle ambient financial updates
        if (this._updateTimer > 0.8) {
            this._updateTimer = 0;
            const r = 1 + Math.floor(Math.random() * 9);
            const c = 1 + Math.floor(Math.random() * 4);
            if (this._cells[r] && this._cells[r][c]) {
                this._cells[r][c].value = `$${(Math.random() * 9000 + 1000).toFixed(2)}`;
            }
        }

        // Update floating popups
        for (let i = this._popups.length - 1; i >= 0; i--) {
            const p = this._popups[i];
            p.y -= dt * 45;
            p.life -= dt;
            if (p.life <= 0) this._popups.splice(i, 1);
        }
    }

    render() {
        const ctx = this.ctx;
        ctx.save();

        // Background
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, W, H);

        // ── Title bar ────────────────────────────────
        ctx.fillStyle = '#107c41'; // Modern Excel dark green
        ctx.fillRect(0, 0, W, 28);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('FINANCIAL_AUDIT_FY26_CONSOLIDATED.XLSX — EXCEL 365 ENTERPRISE', 12, 18);

        // Window buttons
        ctx.fillStyle = '#ffffff';
        ctx.font = '13px Arial';
        ctx.textAlign = 'right';
        ctx.fillText('— □ ×', W - 14, 18);

        // ── Menu bar ─────────────────────────────────
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(0, 28, W, 24);
        ctx.fillStyle = '#334155';
        ctx.font = '12px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'left';
        const menus = ['File', 'Home', 'Insert', 'Page Layout', 'Formulas', 'Data', 'Review', 'View', 'Automate'];
        let mx = 12;
        for (const m of menus) {
            ctx.fillText(m, mx, 44);
            mx += ctx.measureText(m).width + 16;
        }

        // ── Toolbar Ribbon ───────────────────────────
        const tbY = 52;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, tbY, W, TOOLBAR_HEIGHT);
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, tbY + TOOLBAR_HEIGHT);
        ctx.lineTo(W, tbY + TOOLBAR_HEIGHT);
        ctx.stroke();

        const tools = ['Cut', 'Copy', 'Paste', '|', 'B', 'I', 'U', '|', 'AutoSum', 'Sort', '%', '$', '.00'];
        let tx = 14;
        ctx.font = '11px "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = '#475569';
        for (const t of tools) {
            ctx.fillText(t, tx, tbY + 22);
            tx += ctx.measureText(t).width + 16;
        }

        // ── Formula bar ──────────────────────────────
        const fbY = tbY + TOOLBAR_HEIGHT;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, fbY, W, 26);
        ctx.strokeStyle = '#cbd5e1';
        ctx.strokeRect(0, fbY, W, 26);

        // Name Box
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 11px "Segoe UI", Arial';
        ctx.fillText(`${COL_NAMES[this._cursorCol]}${this._cursorRow + 1}`, 12, fbY + 17);

        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(48, fbY + 3, 1, 20);

        // Function Text
        ctx.fillStyle = '#2563eb';
        ctx.font = 'bold 12px "Consolas", monospace';
        ctx.fillText('fx', 58, fbY + 17);

        ctx.fillStyle = '#0f172a';
        ctx.font = '12px "Consolas", monospace';
        ctx.fillText(this._typingText, 80, fbY + 17);

        // Blinking cursor
        if (Math.floor(Date.now() / 450) % 2 === 0) {
            const tw = ctx.measureText(this._typingText).width;
            ctx.fillStyle = '#000000';
            ctx.fillRect(80 + tw + 2, fbY + 5, 2, 16);
        }

        // ── Spreadsheet grid ─────────────────────────
        const gridStartY = fbY + 26;

        // Column headers (A, B, C...)
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(0, gridStartY, W, HEADER_HEIGHT);
        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 11px "Segoe UI", Arial';
        ctx.textAlign = 'center';

        for (let i = 0; i < COL_NAMES.length; i++) {
            const x = ROW_HEADER_WIDTH + i * COL_WIDTH;
            ctx.strokeStyle = '#cbd5e1';
            ctx.strokeRect(x, gridStartY, COL_WIDTH, HEADER_HEIGHT);
            ctx.fillText(COL_NAMES[i], x + COL_WIDTH / 2, gridStartY + 18);
        }

        // Rows and cells
        const maxRows = 12;
        for (let r = 0; r < maxRows; r++) {
            const y = gridStartY + HEADER_HEIGHT + r * ROW_HEIGHT;

            // Row header
            ctx.fillStyle = '#f1f5f9';
            ctx.fillRect(0, y, ROW_HEADER_WIDTH, ROW_HEIGHT);
            ctx.strokeStyle = '#cbd5e1';
            ctx.strokeRect(0, y, ROW_HEADER_WIDTH, ROW_HEIGHT);
            ctx.fillStyle = '#64748b';
            ctx.font = '11px "Segoe UI", Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${r + 1}`, ROW_HEADER_WIDTH / 2, y + 16);

            // Row cells
            for (let c = 0; c < COL_NAMES.length; c++) {
                const x = ROW_HEADER_WIDTH + c * COL_WIDTH;
                const cell = this._cells[r] && this._cells[r][c] ? this._cells[r][c] : null;

                // Active cell cursor highlight
                const isSelected = (r === this._cursorRow && c === this._cursorCol);
                if (isSelected) {
                    ctx.fillStyle = 'rgba(16, 124, 65, 0.08)';
                    ctx.fillRect(x, y, COL_WIDTH, ROW_HEIGHT);
                } else {
                    ctx.fillStyle = (r % 2 === 0) ? '#ffffff' : '#fcfcfc';
                    ctx.fillRect(x, y, COL_WIDTH, ROW_HEIGHT);
                }

                ctx.strokeStyle = '#e2e8f0';
                ctx.strokeRect(x, y, COL_WIDTH, ROW_HEIGHT);

                if (isSelected) {
                    ctx.strokeStyle = '#107c41';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(x, y, COL_WIDTH, ROW_HEIGHT);
                    ctx.lineWidth = 1;
                }

                if (cell && cell.value) {
                    ctx.fillStyle = cell.color || '#1e293b';
                    ctx.font = cell.bold ? 'bold 11px "Segoe UI", Arial' : '11px "Segoe UI", Arial';
                    ctx.textAlign = cell.type === 'number' ? 'right' : 'left';
                    const tx = cell.type === 'number' ? x + COL_WIDTH - 8 : x + 8;
                    ctx.fillText(cell.value, tx, y + 16);
                }
            }
        }

        // ── Real-Time Interactive Financial Chart Widget ──
        const chartX = W - 260;
        const chartY = gridStartY + HEADER_HEIGHT + 10;
        const chartW = 240;
        const chartH = 140;

        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#cbd5e1';
        ctx.fillRect(chartX, chartY, chartW, chartH);
        ctx.strokeRect(chartX, chartY, chartW, chartH);

        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 11px "Segoe UI", Arial';
        ctx.textAlign = 'left';
        ctx.fillText('FINANCIAL PROJECTION // FY26 EBITDA ANALYSIS', chartX + 10, chartY + 18);

        // Chart Bars
        const barW = 26;
        const gap = 12;
        const baseY = chartY + chartH - 24;

        for (let i = 0; i < this._chartData.length; i++) {
            const bx = chartX + 18 + i * (barW + gap);
            const val = this._chartData[i];
            const bh = (val / 100) * 75;

            // Bar Gradient
            const barGrad = ctx.createLinearGradient(0, baseY - bh, 0, baseY);
            barGrad.addColorStop(0, '#107c41');
            barGrad.addColorStop(1, '#22c55e');
            ctx.fillStyle = barGrad;
            ctx.fillRect(bx, baseY - bh, barW, bh);

            ctx.fillStyle = '#64748b';
            ctx.font = '9px "Segoe UI", Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`M${i + 1}`, bx + barW / 2, baseY + 14);
        }

        // ── Floating Profit Popups ────────────────────
        for (const p of this._popups) {
            const alpha = p.life / p.maxLife;
            ctx.save();
            ctx.font = 'bold 14px "Outfit", sans-serif';
            ctx.fillStyle = '#107c41';
            ctx.shadowColor = '#22c55e';
            ctx.shadowBlur = 8;
            ctx.globalAlpha = alpha;
            ctx.textAlign = 'center';
            ctx.fillText(p.text, p.x, p.y);
            ctx.restore();
        }

        // ── Bottom Status Bar ────────────────────────
        ctx.fillStyle = '#107c41';
        ctx.fillRect(0, H - 24, W, 24);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px "Segoe UI", Arial';
        ctx.textAlign = 'left';
        ctx.fillText('TYPE ANY KEYS TO AUDIT FINANCIAL DATA & RESTORE PRODUCTIVITY', 14, H - 8);
        ctx.textAlign = 'right';
        ctx.fillText(`Crunched: ${this._totalCrunched} items   |   Mode: Stealth Protected`, W - 14, H - 8);

        ctx.restore();
    }

    /* ── Private generator ──────────────────────────────── */

    _generateCells() {
        const rows = 14;
        const cols = 10;
        const data = [];

        const headers = ['Department', 'Q1 Rev', 'Q2 Rev', 'Q3 Rev', 'Q4 Proj', 'EBITDA', 'Growth', 'Budget', 'Variance', 'Status'];
        data.push(headers.map(h => ({ value: h, type: 'text', bold: true, color: '#0f172a' })));

        const departments = ['Engineering', 'Marketing', 'Sales', 'Operations', 'Human Res', 'Finance', 'Legal Compliance', 'R&D Labs', 'Product AI', 'Global Cloud'];
        const statuses = ['Ahead', 'On Track', 'Optimized', 'Ahead', 'On Track', 'Surplus', 'Approved', 'Ahead', 'Maximized', 'On Track'];

        for (let r = 0; r < departments.length; r++) {
            const row = [];
            row.push({ value: departments[r], type: 'text', bold: true, color: '#334155' });
            for (let q = 0; q < 4; q++) {
                const val = (2000 + Math.random() * 8000).toFixed(2);
                row.push({ value: `$${val}`, type: 'number', bold: false, color: '#0369a1' });
            }
            const total = (8000 + Math.random() * 32000).toFixed(2);
            row.push({ value: `$${total}`, type: 'number', bold: true, color: '#15803d' });

            const growth = (8 + Math.random() * 35).toFixed(1);
            row.push({ value: `+${growth}%`, type: 'number', bold: false, color: '#15803d' });

            const budget = (5000 + Math.random() * 25000).toFixed(2);
            row.push({ value: `$${budget}`, type: 'number', bold: false, color: '#475569' });

            const variance = (1500 + Math.random() * 8500).toFixed(2);
            row.push({ value: `+$${variance}`, type: 'number', bold: false, color: '#15803d' });

            row.push({ value: statuses[r], type: 'text', bold: true, color: '#16a34a' });
            data.push(row);
        }

        return data;
    }

    _generateChartData() {
        return [35, 52, 68, 74, 88, 95];
    }
}
