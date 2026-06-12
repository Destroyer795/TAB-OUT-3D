/**
 * SpreadsheetMode.js – Renders a convincing fake spreadsheet to the monitor canvas.
 */

const W = 1024;
const H = 576;

const COL_NAMES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
const ROW_HEIGHT = 24;
const HEADER_HEIGHT = 28;
const TOOLBAR_HEIGHT = 36;
const COL_WIDTH = 95;
const ROW_HEADER_WIDTH = 40;

export class SpreadsheetMode {
    /**
     * @param {HTMLCanvasElement} canvas – Shared monitor canvas (1024×576).
     */
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx    = canvas.getContext('2d');

        // Pre-generate cell data
        this._cells = this._generateCells();
        this._chartData = this._generateChartData();
        this._cursorRow = 4;
        this._cursorCol = 2;
        this._typingTimer = 0;
        this._typingText = '';
        this._scrollOffset = 0;
        this._updateTimer = 0;
    }

    reset() {
        this._cells = this._generateCells();
        this._chartData = this._generateChartData();
        this._typingTimer = 0;
        this._typingText = '';
        this._updateTimer = 0;
    }

    /**
     * @param {number} dt
     */
    update(dt) {
        this._typingTimer += dt;
        this._updateTimer += dt;

        // Simulate typing animation
        if (this._typingTimer > 0.15) {
            this._typingTimer = 0;
            const chars = '0123456789.+-=SUM(AVERAGE(COUNT(IF(';
            this._typingText += chars[Math.floor(Math.random() * chars.length)];
            if (this._typingText.length > 20) {
                this._typingText = '';
                // Move cursor
                this._cursorCol = Math.floor(Math.random() * 8);
                this._cursorRow = 2 + Math.floor(Math.random() * 15);
            }
        }

        // Periodically update random cell values
        if (this._updateTimer > 0.5) {
            this._updateTimer = 0;
            const r = Math.floor(Math.random() * this._cells.length);
            const c = Math.floor(Math.random() * this._cells[r].length);
            if (this._cells[r][c].type === 'number') {
                this._cells[r][c].value = (Math.random() * 10000).toFixed(2);
            }
            // Update chart
            const idx = Math.floor(Math.random() * this._chartData.length);
            this._chartData[idx] = 20 + Math.random() * 80;
        }
    }

    render() {
        const ctx = this.ctx;
        ctx.save();

        // ── Background ───────────────────────────────
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, W, H);

        // ── Title bar ────────────────────────────────
        ctx.fillStyle = '#217346';
        ctx.fillRect(0, 0, W, 26);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('📊  Q3-FY2026-Budget-Analysis.xlsx — ExcelPro', 10, 17);

        // Window buttons
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px Arial';
        ctx.textAlign = 'right';
        ctx.fillText('— □ ×', W - 12, 17);

        // ── Menu bar ─────────────────────────────────
        ctx.fillStyle = '#e8e8e8';
        ctx.fillRect(0, 26, W, 22);
        ctx.fillStyle = '#333';
        ctx.font = '12px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'left';
        const menus = ['File', 'Edit', 'View', 'Insert', 'Format', 'Data', 'Review', 'Help'];
        let mx = 10;
        for (const m of menus) {
            ctx.fillText(m, mx, 41);
            mx += ctx.measureText(m).width + 18;
        }

        // ── Toolbar ──────────────────────────────────
        const tbY = 48;
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(0, tbY, W, TOOLBAR_HEIGHT);
        ctx.strokeStyle = '#d0d0d0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, tbY + TOOLBAR_HEIGHT);
        ctx.lineTo(W, tbY + TOOLBAR_HEIGHT);
        ctx.stroke();

        // Fake toolbar buttons
        const tools = ['✂️', '📋', '🔤', 'B', 'I', 'U', '🎨', '⬜', '📊', 'Σ', '🔽', '%', ','];
        let tx = 8;
        ctx.font = '14px Arial';
        ctx.fillStyle = '#555';
        for (const t of tools) {
            ctx.fillText(t, tx, tbY + 24);
            tx += 32;
        }

        // Font selector
        ctx.fillStyle = '#fff';
        ctx.fillRect(tx + 10, tbY + 6, 100, 22);
        ctx.strokeStyle = '#bbb';
        ctx.strokeRect(tx + 10, tbY + 6, 100, 22);
        ctx.fillStyle = '#333';
        ctx.font = '11px "Segoe UI", Arial';
        ctx.fillText('Calibri', tx + 16, tbY + 22);

        // Font size
        ctx.fillStyle = '#fff';
        ctx.fillRect(tx + 118, tbY + 6, 40, 22);
        ctx.strokeRect(tx + 118, tbY + 6, 40, 22);
        ctx.fillStyle = '#333';
        ctx.fillText('11', tx + 128, tbY + 22);

        // ── Formula bar ──────────────────────────────
        const fbY = tbY + TOOLBAR_HEIGHT;
        ctx.fillStyle = '#fafafa';
        ctx.fillRect(0, fbY, W, 24);
        ctx.strokeStyle = '#d0d0d0';
        ctx.beginPath();
        ctx.moveTo(0, fbY + 24);
        ctx.lineTo(W, fbY + 24);
        ctx.stroke();

        ctx.fillStyle = '#555';
        ctx.font = 'bold 11px "Segoe UI", Arial';
        ctx.fillText(`${COL_NAMES[this._cursorCol]}${this._cursorRow + 1}`, 8, fbY + 16);

        ctx.fillStyle = '#ddd';
        ctx.fillRect(46, fbY + 3, 1, 18);

        ctx.fillStyle = '#555';
        ctx.font = '12px "Consolas", monospace';
        const formulaText = this._typingText || `=SUM(B${this._cursorRow}:G${this._cursorRow})`;
        ctx.fillText('fx  ' + formulaText, 56, fbY + 16);

        // Blinking cursor
        if (Math.floor(Date.now() / 500) % 2 === 0) {
            const tw = ctx.measureText('fx  ' + formulaText).width;
            ctx.fillStyle = '#000';
            ctx.fillRect(56 + tw + 2, fbY + 4, 1, 16);
        }

        // ── Spreadsheet grid ─────────────────────────
        const gridStartY = fbY + 24;

        // Column headers
        ctx.fillStyle = '#e8eaed';
        ctx.fillRect(0, gridStartY, W, HEADER_HEIGHT);
        ctx.strokeStyle = '#c0c0c0';
        ctx.lineWidth = 1;

        ctx.fillStyle = '#444';
        ctx.font = 'bold 11px "Segoe UI", Arial';
        ctx.textAlign = 'center';
        for (let c = 0; c < COL_NAMES.length; c++) {
            const cx = ROW_HEADER_WIDTH + c * COL_WIDTH + COL_WIDTH / 2;
            ctx.fillText(COL_NAMES[c], cx, gridStartY + 18);
            // Column border
            ctx.beginPath();
            ctx.moveTo(ROW_HEADER_WIDTH + c * COL_WIDTH, gridStartY);
            ctx.lineTo(ROW_HEADER_WIDTH + c * COL_WIDTH, H);
            ctx.strokeStyle = '#ddd';
            ctx.stroke();
        }

        // Rows
        const visibleRows = Math.floor((H - gridStartY - HEADER_HEIGHT) / ROW_HEIGHT);
        const dataStartY = gridStartY + HEADER_HEIGHT;

        for (let r = 0; r < visibleRows && r < this._cells.length; r++) {
            const ry = dataStartY + r * ROW_HEIGHT;

            // Row header
            ctx.fillStyle = '#e8eaed';
            ctx.fillRect(0, ry, ROW_HEADER_WIDTH, ROW_HEIGHT);
            ctx.fillStyle = '#444';
            ctx.font = 'bold 11px "Segoe UI", Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${r + 1}`, ROW_HEADER_WIDTH / 2, ry + 17);

            // Row border
            ctx.beginPath();
            ctx.moveTo(0, ry + ROW_HEIGHT);
            ctx.lineTo(W, ry + ROW_HEIGHT);
            ctx.strokeStyle = '#e8e8e8';
            ctx.stroke();

            // Cells
            for (let c = 0; c < this._cells[r].length && c < COL_NAMES.length; c++) {
                const cx = ROW_HEADER_WIDTH + c * COL_WIDTH;
                const cell = this._cells[r][c];

                // Selected cell highlight
                if (r === this._cursorRow && c === this._cursorCol) {
                    ctx.strokeStyle = '#217346';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(cx + 1, ry + 1, COL_WIDTH - 2, ROW_HEIGHT - 2);
                    ctx.lineWidth = 1;
                }

                // Cell value
                ctx.fillStyle = cell.color || '#222';
                ctx.font = cell.bold ? 'bold 11px Consolas, monospace' : '11px Consolas, monospace';
                ctx.textAlign = cell.type === 'number' ? 'right' : 'left';
                const textX = cell.type === 'number' ? cx + COL_WIDTH - 6 : cx + 4;
                ctx.fillText(cell.value, textX, ry + 17);
            }
        }

        // Row header background
        ctx.fillStyle = '#e8eaed';
        ctx.fillRect(0, gridStartY, ROW_HEADER_WIDTH, H - gridStartY);
        // Redraw row numbers
        for (let r = 0; r < visibleRows && r < this._cells.length; r++) {
            const ry = dataStartY + r * ROW_HEIGHT;
            ctx.fillStyle = '#444';
            ctx.font = 'bold 11px "Segoe UI", Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${r + 1}`, ROW_HEADER_WIDTH / 2, ry + 17);
        }

        // ── Mini Chart (bottom-right) ────────────────
        const chartX = W - 280;
        const chartY = H - 160;
        const chartW = 260;
        const chartH = 140;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(chartX, chartY, chartW, chartH);
        ctx.strokeStyle = '#ccc';
        ctx.strokeRect(chartX, chartY, chartW, chartH);

        ctx.fillStyle = '#333';
        ctx.font = 'bold 10px "Segoe UI", Arial';
        ctx.textAlign = 'left';
        ctx.fillText('Revenue by Quarter', chartX + 8, chartY + 14);

        // Bars
        const barCount = this._chartData.length;
        const barW = (chartW - 40) / barCount - 4;
        const barStartY = chartY + chartH - 15;
        const barMaxH = chartH - 35;
        const barColors = ['#4472C4', '#ED7D31', '#A5A5A5', '#FFC000', '#5B9BD5', '#70AD47'];

        for (let i = 0; i < barCount; i++) {
            const bh = (this._chartData[i] / 100) * barMaxH;
            const bx = chartX + 20 + i * (barW + 4);
            const by = barStartY - bh;
            ctx.fillStyle = barColors[i % barColors.length];
            ctx.fillRect(bx, by, barW, bh);
        }

        // Chart labels
        ctx.font = '8px Arial';
        ctx.fillStyle = '#888';
        ctx.textAlign = 'center';
        const labels = ['Q1', 'Q2', 'Q3', 'Q4', 'Proj', 'YoY'];
        for (let i = 0; i < barCount && i < labels.length; i++) {
            ctx.fillText(labels[i], chartX + 20 + i * (barW + 4) + barW / 2, barStartY + 10);
        }

        // ── Status bar ───────────────────────────────
        ctx.fillStyle = '#217346';
        ctx.fillRect(0, H - 22, W, 22);
        ctx.fillStyle = '#fff';
        ctx.font = '11px "Segoe UI", Arial';
        ctx.textAlign = 'left';
        ctx.fillText('Ready', 10, H - 7);
        ctx.textAlign = 'right';
        ctx.fillText('Sum: $48,293.15   Average: $6,036.64   Count: 8', W - 12, H - 7);

        ctx.restore();
    }

    /* ── Private ───────────────────────────────────────── */

    _generateCells() {
        const rows = 20;
        const cols = 10;
        const data = [];

        // Header row
        const headers = ['Department', 'Q1 Rev', 'Q2 Rev', 'Q3 Rev', 'Q4 Proj', 'Total', 'YoY %', 'Budget', 'Variance', 'Status'];
        data.push(headers.map(h => ({ value: h, type: 'text', bold: true, color: '#1a1a1a' })));

        const departments = ['Engineering', 'Marketing', 'Sales', 'Operations', 'HR', 'Finance', 'Legal', 'R&D', 'Support', 'Product'];
        const statuses = ['On Track', 'At Risk', 'Ahead', 'On Track', 'Behind', 'On Track', 'Ahead', 'At Risk', 'On Track', 'Ahead'];

        for (let r = 0; r < departments.length; r++) {
            const row = [];
            row.push({ value: departments[r], type: 'text', bold: false, color: '#222' });
            // Q1-Q4
            for (let q = 0; q < 4; q++) {
                const v = (1000 + Math.random() * 9000).toFixed(2);
                row.push({ value: `$${v}`, type: 'number', bold: false, color: '#1a5276' });
            }
            // Total (formula-ish)
            const total = (4000 + Math.random() * 36000).toFixed(2);
            row.push({ value: `$${total}`, type: 'number', bold: true, color: '#217346' });
            // YoY
            const yoy = (-15 + Math.random() * 40).toFixed(1);
            const yoyColor = parseFloat(yoy) >= 0 ? '#217346' : '#c0392b';
            row.push({ value: `${yoy}%`, type: 'number', bold: false, color: yoyColor });
            // Budget
            row.push({ value: `$${(3000 + Math.random() * 30000).toFixed(2)}`, type: 'number', bold: false, color: '#555' });
            // Variance
            const variance = (-5000 + Math.random() * 10000).toFixed(2);
            const varColor = parseFloat(variance) >= 0 ? '#217346' : '#c0392b';
            row.push({ value: `$${variance}`, type: 'number', bold: false, color: varColor });
            // Status
            const st = statuses[r];
            const stColor = st === 'On Track' ? '#217346' : st === 'Ahead' ? '#2471a3' : '#c0392b';
            row.push({ value: st, type: 'text', bold: false, color: stColor });
            data.push(row);
        }

        // Empty rows
        for (let r = departments.length + 1; r < rows; r++) {
            const row = [];
            for (let c = 0; c < cols; c++) {
                row.push({ value: '', type: 'text', bold: false, color: '#222' });
            }
            data.push(row);
        }

        // Summary rows
        data[departments.length + 2] = [
            { value: 'TOTALS', type: 'text', bold: true, color: '#1a1a1a' },
            ...Array(4).fill(null).map(() => ({
                value: `$${(15000 + Math.random() * 50000).toFixed(2)}`,
                type: 'number', bold: true, color: '#217346'
            })),
            { value: `$${(60000 + Math.random() * 200000).toFixed(2)}`, type: 'number', bold: true, color: '#217346' },
            { value: `${(5 + Math.random() * 20).toFixed(1)}%`, type: 'number', bold: true, color: '#217346' },
            ...Array(3).fill({ value: '', type: 'text', bold: false, color: '#222' }),
        ];

        return data;
    }

    _generateChartData() {
        return Array.from({ length: 6 }, () => 20 + Math.random() * 80);
    }
}
