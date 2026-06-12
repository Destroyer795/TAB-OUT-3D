/**
 * ArcadeGame.js – Cyberpunk lane-runner rendered to a 2D canvas.
 *
 * The canvas is used as a Three.js CanvasTexture on the in-game monitor.
 */

import { clamp, randomInt, randomRange } from '../utils/MathUtils.js';
import { CollisionSystem } from './CollisionSystem.js';
import EventBus from '../core/EventBus.js';

const W = 1024;
const H = 576;
const LANE_COUNT = 3;
const LANE_WIDTH = 140;
const LANES_TOTAL_WIDTH = LANE_COUNT * LANE_WIDTH;
const LANES_X_OFFSET = (W - LANES_TOTAL_WIDTH) / 2;

export class ArcadeGame {
    /**
     * @param {HTMLCanvasElement} canvas – Shared monitor canvas (1024×576).
     */
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx    = canvas.getContext('2d');

        this.collision = new CollisionSystem(LANE_WIDTH, 30);

        /* ── Ship state ───────────────────────────────── */
        this.shipLane  = 1;            // 0, 1, 2
        this.shipY     = H - 80;
        this.shipVisualX = this._laneX(1);

        /* ── Obstacle pool ────────────────────────────── */
        /** @type {{ lane:number, y:number, height:number, width:number, passed:boolean, hue:number }[]} */
        this.obstacles = [];

        /* ── Particle pool ────────────────────────────── */
        /** @type {{ x:number, y:number, vx:number, vy:number, life:number, maxLife:number, hue:number }[]} */
        this.particles = [];

        /* ── Gameplay vars ────────────────────────────── */
        this.score          = 0;
        this.speed          = 250;      // px/s
        this.spawnTimer     = 0;
        this.spawnInterval  = 0.9;      // seconds
        this.elapsedTime    = 0;
        this.alive          = true;

        /* ── Visual FX ────────────────────────────────── */
        this.screenShake   = 0;
        this.scanlinePhase = 0;
        this.bgScroll      = 0;

        /* ── Background grid lines ────────────────────── */
        this._gridLines = [];
        for (let i = 0; i < 20; i++) {
            this._gridLines.push(Math.random() * H);
        }
    }

    /* ── Public API ────────────────────────────────────── */

    reset() {
        this.shipLane   = 1;
        this.shipVisualX = this._laneX(1);
        this.obstacles.length  = 0;
        this.particles.length  = 0;
        this.score        = 0;
        this.speed        = 250;
        this.spawnTimer   = 0;
        this.spawnInterval = 0.9;
        this.elapsedTime  = 0;
        this.alive        = true;
        this.screenShake  = 0;
    }

    moveLeft() {
        if (this.shipLane > 0) {
            this.shipLane--;
            EventBus.emit('arcadeLaneSwitch');
        }
    }

    moveRight() {
        if (this.shipLane < LANE_COUNT - 1) {
            this.shipLane++;
            EventBus.emit('arcadeLaneSwitch');
        }
    }

    /**
     * @param {number} dt – seconds
     */
    update(dt) {
        if (!this.alive) return;

        this.elapsedTime += dt;

        // Gradually increase difficulty
        this.speed = 250 + this.elapsedTime * 8;
        this.spawnInterval = Math.max(0.35, 0.9 - this.elapsedTime * 0.008);

        // Ship visual interpolation
        const targetX = this._laneX(this.shipLane);
        this.shipVisualX += (targetX - this.shipVisualX) * Math.min(1, dt * 18);

        // Spawn obstacles
        this.spawnTimer += dt;
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer = 0;
            this._spawnObstacle();
        }

        // Move obstacles
        for (const obs of this.obstacles) {
            obs.y += this.speed * dt;
            if (!obs.passed && obs.y > this.shipY + 20) {
                obs.passed = true;
                this.score += 10;
                EventBus.emit('arcadeScoreTick', { score: this.score });
            }
        }

        // Remove off-screen obstacles
        this.obstacles = this.obstacles.filter(o => o.y < H + 60);

        // Collision
        const hit = this.collision.check(
            { lane: this.shipLane, y: this.shipY },
            this.obstacles
        );
        if (hit) {
            this.alive = false;
            this.screenShake = 0.5;
            this._spawnExplosion(this.shipVisualX, this.shipY);
            EventBus.emit('arcadeCollision', { score: this.score });
            return;
        }

        // Update particles
        this._updateParticles(dt);

        // Spawn trail particles
        if (Math.random() < 0.6) {
            this.particles.push({
                x: this.shipVisualX + randomRange(-6, 6),
                y: this.shipY + 18,
                vx: randomRange(-15, 15),
                vy: randomRange(30, 80),
                life: 0.4,
                maxLife: 0.4,
                hue: 140 + Math.random() * 30,
            });
        }

        // Screen shake decay
        if (this.screenShake > 0) {
            this.screenShake -= dt * 2;
            if (this.screenShake < 0) this.screenShake = 0;
        }

        // BG scroll
        this.bgScroll += this.speed * dt * 0.3;
        this.scanlinePhase += dt;
    }

    /**
     * Render the arcade game to the shared canvas.
     */
    render() {
        const ctx = this.ctx;
        ctx.save();

        // Screen shake
        if (this.screenShake > 0) {
            const sx = (Math.random() - 0.5) * this.screenShake * 14;
            const sy = (Math.random() - 0.5) * this.screenShake * 14;
            ctx.translate(sx, sy);
        }

        // ── Background ───────────────────────────────
        ctx.fillStyle = '#0a0a18';
        ctx.fillRect(0, 0, W, H);

        // Moving grid
        ctx.strokeStyle = 'rgba(0, 255, 180, 0.06)';
        ctx.lineWidth = 1;
        for (let i = 0; i < this._gridLines.length; i++) {
            const y = (this._gridLines[i] + this.bgScroll) % H;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(W, y);
            ctx.stroke();
        }
        // Vertical grid
        for (let x = 0; x < W; x += 60) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, H);
            ctx.stroke();
        }

        // ── Lane highlights ──────────────────────────
        for (let i = 0; i < LANE_COUNT; i++) {
            const lx = LANES_X_OFFSET + i * LANE_WIDTH;
            ctx.fillStyle = i === this.shipLane
                ? 'rgba(0, 255, 140, 0.04)'
                : 'rgba(255, 255, 255, 0.01)';
            ctx.fillRect(lx, 0, LANE_WIDTH, H);

            // Lane borders
            ctx.strokeStyle = 'rgba(0, 255, 180, 0.15)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(lx, 0);
            ctx.lineTo(lx, H);
            ctx.stroke();
        }
        // Right edge
        ctx.beginPath();
        ctx.moveTo(LANES_X_OFFSET + LANES_TOTAL_WIDTH, 0);
        ctx.lineTo(LANES_X_OFFSET + LANES_TOTAL_WIDTH, H);
        ctx.stroke();

        // ── Obstacles ────────────────────────────────
        for (const obs of this.obstacles) {
            const ox = LANES_X_OFFSET + obs.lane * LANE_WIDTH + (LANE_WIDTH - obs.width) / 2;
            // Glow
            ctx.shadowColor = `hsl(${obs.hue}, 100%, 60%)`;
            ctx.shadowBlur  = 15;
            ctx.fillStyle   = `hsl(${obs.hue}, 100%, 55%)`;
            ctx.fillRect(ox, obs.y, obs.width, obs.height);

            // Inner detail
            ctx.shadowBlur = 0;
            ctx.fillStyle  = `hsl(${obs.hue}, 80%, 75%)`;
            ctx.fillRect(ox + 4, obs.y + 4, obs.width - 8, obs.height - 8);

            // Glitch lines
            ctx.fillStyle = `hsla(${obs.hue}, 100%, 90%, 0.4)`;
            for (let g = 0; g < 3; g++) {
                const gy = obs.y + Math.random() * obs.height;
                ctx.fillRect(ox, gy, obs.width, 1);
            }
        }
        ctx.shadowBlur = 0;

        // ── Particles ────────────────────────────────
        for (const p of this.particles) {
            const alpha = p.life / p.maxLife;
            ctx.fillStyle = `hsla(${p.hue}, 100%, 70%, ${alpha})`;
            const size = 2 + alpha * 3;
            ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size);
        }

        // ── Ship ─────────────────────────────────────
        if (this.alive) {
            this._drawShip(ctx, this.shipVisualX, this.shipY);
        }

        // ── Score display ────────────────────────────
        ctx.font = 'bold 22px monospace';
        ctx.fillStyle = '#00ffb4';
        ctx.shadowColor = '#00ffb4';
        ctx.shadowBlur = 8;
        ctx.textAlign = 'right';
        ctx.fillText(`SCORE: ${this.score}`, W - 30, 35);
        ctx.shadowBlur = 0;

        // Speed indicator
        ctx.font = '14px monospace';
        ctx.fillStyle = 'rgba(0,255,180,0.5)';
        ctx.fillText(`SPD: ${Math.floor(this.speed)}`, W - 30, 55);

        // ── CRT Scanlines ────────────────────────────
        ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
        for (let y = 0; y < H; y += 3) {
            ctx.fillRect(0, y, W, 1);
        }

        // CRT vignette
        const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.85);
        vignette.addColorStop(0, 'rgba(0,0,0,0)');
        vignette.addColorStop(1, 'rgba(0,0,0,0.45)');
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, W, H);

        // Horizontal CRT band (moving)
        const bandY = ((this.scanlinePhase * 60) % (H + 40)) - 20;
        const bandGrad = ctx.createLinearGradient(0, bandY, 0, bandY + 30);
        bandGrad.addColorStop(0, 'rgba(255,255,255,0)');
        bandGrad.addColorStop(0.5, 'rgba(255,255,255,0.03)');
        bandGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = bandGrad;
        ctx.fillRect(0, bandY, W, 30);

        ctx.restore();
    }

    /* ── Private helpers ───────────────────────────────── */

    _laneX(lane) {
        return LANES_X_OFFSET + lane * LANE_WIDTH + LANE_WIDTH / 2;
    }

    _spawnObstacle() {
        const lane = randomInt(0, LANE_COUNT - 1);
        this.obstacles.push({
            lane,
            y: -50,
            height: 28 + Math.random() * 18,
            width:  70 + Math.random() * 40,
            passed: false,
            hue: 320 + Math.random() * 30,  // pink range
        });
    }

    _drawShip(ctx, x, y) {
        ctx.save();
        ctx.translate(x, y);

        // Glow
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur  = 20;

        // Triangle ship
        ctx.beginPath();
        ctx.moveTo(0, -20);
        ctx.lineTo(-16, 16);
        ctx.lineTo(16, 16);
        ctx.closePath();

        ctx.fillStyle = '#00ff88';
        ctx.fill();

        // Inner lighter triangle
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.moveTo(0, -12);
        ctx.lineTo(-8, 10);
        ctx.lineTo(8, 10);
        ctx.closePath();
        ctx.fillStyle = '#80ffcc';
        ctx.fill();

        // Engine glow
        ctx.beginPath();
        ctx.arc(0, 18, 5 + Math.sin(Date.now() * 0.02) * 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 255, 200, 0.6)';
        ctx.fill();

        ctx.restore();
    }

    _spawnExplosion(x, y) {
        for (let i = 0; i < 40; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = randomRange(50, 250);
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: randomRange(0.3, 0.8),
                maxLife: 0.8,
                hue: Math.random() > 0.5 ? 140 : 330,
            });
        }
    }

    _updateParticles(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
}
