/**
 * ArcadeGame.js – High-octane Cyberpunk Lane Runner.
 * Rendered to a 2D canvas texture on the office monitor.
 *
 * New Features:
 *  - Power-up System: Holographic Shield, Overclock (Nitro), Data Magnet, EMP Bomb, Coffee Drops.
 *  - Ship Aerodynamic Banking Tilt when switching lanes.
 *  - Shifting Glitch Barriers & Pulsing Laser Grids.
 *  - Hexagonal Energy Shield & Nitro Speed Warp visual effects.
 *  - Magnet Attraction Physics for data chips.
 *  - Floating score & combo multiplier popups.
 */

import { clamp, randomInt, randomRange } from '../utils/MathUtils.js';
import { CollisionSystem } from './CollisionSystem.js';
import EventBus from '../core/EventBus.js';
import AudioManager from '../audio/AudioManager.js';

const W = 1024;
const H = 576;
const LANE_COUNT = 4;
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

        this.collision = new CollisionSystem(LANE_WIDTH, 34);

        /* ── Ship state ───────────────────────────────── */
        this.shipLane    = 1;
        this.shipY       = H - 85;
        this.shipVisualX = this._laneX(1);
        this.shipTilt    = 0; // banking angle in radians

        /* ── Active Buffs & Power-ups ─────────────────── */
        this.hasShield   = false;
        this.nitroTimer  = 0;
        this.magnetTimer = 0;

        /* ── Pools ────────────────────────────────────── */
        this.obstacles    = [];
        this.collectibles = [];
        this.popups       = [];
        this.particles    = [];
        this.speedLines   = [];

        /* ── Gameplay stats ───────────────────────────── */
        this.score           = 0;
        this.combo           = 1;
        this.speed           = 270;
        this.spawnTimer      = 0;
        this.spawnInterval   = 0.88;
        this.collectTimer    = 0;
        this.collectInterval = 1.4;
        this.elapsedTime     = 0;
        this.alive           = true;

        /* ── Visual FX ────────────────────────────────── */
        this.screenShake   = 0;
        this.scanlinePhase = 0;
        this.bgScroll      = 0;
        this.empFlash      = 0;

        /* ── Init Speedlines ──────────────────────────── */
        for (let i = 0; i < 25; i++) {
            this.speedLines.push({
                x: randomRange(LANES_X_OFFSET - 40, LANES_X_OFFSET + LANES_TOTAL_WIDTH + 40),
                y: Math.random() * H,
                len: randomRange(40, 110),
                speedMult: randomRange(1.2, 2.2),
            });
        }
    }

    /* ── Public API ────────────────────────────────────── */

    reset() {
        this.shipLane     = 1;
        this.shipVisualX  = this._laneX(1);
        this.shipTilt     = 0;
        this.hasShield    = false;
        this.nitroTimer   = 0;
        this.magnetTimer  = 0;
        this.obstacles.length    = 0;
        this.collectibles.length = 0;
        this.popups.length       = 0;
        this.particles.length    = 0;
        this.combo        = 1;
        this.score        = 0;
        this.speed        = 270;
        this.spawnTimer   = 0;
        this.spawnInterval = 0.88;
        this.collectTimer = 0;
        this.collectInterval = 1.4;
        this.elapsedTime  = 0;
        this.alive        = true;
        this.screenShake  = 0;
        this.empFlash     = 0;
    }

    moveLeft() {
        if (this.shipLane > 0) {
            this.shipLane--;
            this.shipTilt = -0.32; // bank left
            AudioManager.playLaneSwitchSound();
            EventBus.emit('arcadeLaneSwitch');
        }
    }

    moveRight() {
        if (this.shipLane < LANE_COUNT - 1) {
            this.shipLane++;
            this.shipTilt = 0.32; // bank right
            AudioManager.playLaneSwitchSound();
            EventBus.emit('arcadeLaneSwitch');
        }
    }

    /**
     * @param {number} dt – seconds
     */
    update(dt) {
        if (!this.alive) return;

        this.elapsedTime += dt;

        // Difficulty progression
        const baseSpeed = 270 + this.elapsedTime * 9;
        const speedBoost = this.nitroTimer > 0 ? 1.7 : 1.0;
        this.speed = baseSpeed * speedBoost;

        this.spawnInterval   = Math.max(0.32, 0.88 - this.elapsedTime * 0.009);
        this.collectInterval = Math.max(0.65, 1.4 - this.elapsedTime * 0.012);

        // Update active timers
        if (this.nitroTimer > 0) {
            this.nitroTimer = Math.max(0, this.nitroTimer - dt);
        }
        if (this.magnetTimer > 0) {
            this.magnetTimer = Math.max(0, this.magnetTimer - dt);
        }
        if (this.empFlash > 0) {
            this.empFlash = Math.max(0, this.empFlash - dt * 2.5);
        }

        // Ship visual interpolation & bank easing
        const targetX = this._laneX(this.shipLane);
        this.shipVisualX += (targetX - this.shipVisualX) * Math.min(1, dt * 22);
        this.shipTilt += (0 - this.shipTilt) * Math.min(1, dt * 10);

        // Spawning
        this.spawnTimer += dt;
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer = 0;
            this._spawnObstacle();
        }

        this.collectTimer += dt;
        if (this.collectTimer >= this.collectInterval) {
            this.collectTimer = 0;
            this._spawnCollectible();
        }

        // ── Move and update obstacles ────────────────────────
        for (const obs of this.obstacles) {
            obs.y += this.speed * dt;

            // Oscillating shifting obstacles
            if (obs.isShifting) {
                obs.shiftPhase += dt * 3.5;
                obs.shiftOffset = Math.sin(obs.shiftPhase) * (LANE_WIDTH * 0.45);
            }

            if (!obs.passed && obs.y > this.shipY + 20) {
                obs.passed = true;
                const multiplier = (this.nitroTimer > 0 ? 3 : 1) * this.combo;
                this.score += 15 * multiplier;
                EventBus.emit('arcadeScoreTick', { score: this.score });
            }
        }
        this.obstacles = this.obstacles.filter(o => o.y < H + 80);

        // ── Move and update collectibles ─────────────────────
        for (const coll of this.collectibles) {
            coll.y += this.speed * 0.85 * dt;
            coll.pulsePhase += dt * 5;

            // Magnet pull
            if (this.magnetTimer > 0) {
                const collCenterX = LANES_X_OFFSET + coll.lane * LANE_WIDTH + LANE_WIDTH / 2;
                const distToShip = Math.hypot(this.shipVisualX - collCenterX, this.shipY - coll.y);
                if (distToShip < 320) {
                    coll.magnetPullX = (coll.magnetPullX || 0) + (this.shipVisualX - collCenterX) * dt * 5;
                    coll.y += (this.shipY - coll.y) * dt * 4;
                }
            }
        }

        // Collectible pickups
        for (let i = this.collectibles.length - 1; i >= 0; i--) {
            const coll = this.collectibles[i];
            const baseCollX = LANES_X_OFFSET + coll.lane * LANE_WIDTH + LANE_WIDTH / 2;
            const collX = baseCollX + (coll.magnetPullX || 0);
            const distY = Math.abs(coll.y - this.shipY);
            const distX = Math.abs(this.shipVisualX - collX);

            if (distX < 55 && distY < 40) {
                this._onCollectItem(coll, collX);
                this.collectibles.splice(i, 1);
            }
        }
        this.collectibles = this.collectibles.filter(c => c.y < H + 40);

        // ── Collision with obstacles ─────────────────────────
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            const startLane = obs.startLane !== undefined ? obs.startLane : obs.lane;
            const laneSpan  = obs.laneSpan !== undefined ? obs.laneSpan : 1;
            const pad = 12;
            const shift = obs.shiftOffset || 0;
            const ox = LANES_X_OFFSET + startLane * LANE_WIDTH + pad + shift;
            const oWidth = laneSpan * LANE_WIDTH - 2 * pad;
            const oy = obs.y;
            const oh = obs.height;

            // AABB vs Ship Point/Box
            const shipHalfW = 20;
            const shipHalfH = 22;
            const collides = (
                this.shipVisualX + shipHalfW > ox &&
                this.shipVisualX - shipHalfW < ox + oWidth &&
                this.shipY + shipHalfH > oy &&
                this.shipY - shipHalfH < oy + oh
            );

            if (collides) {
                if (this.nitroTimer > 0) {
                    // Overclock smash!
                    this._spawnExplosion(this.shipVisualX, oy);
                    this.screenShake = 0.35;
                    this.score += 150 * this.combo;
                    this.popups.push({
                        text: `SMASH! +${150 * this.combo}`,
                        x: this.shipVisualX,
                        y: oy - 15,
                        life: 0.7,
                        maxLife: 0.7,
                        color: '#ffdd00'
                    });
                    AudioManager.playArcadeCollision();
                    EventBus.emit('arcadeObstacleDestroyed');
                    this.obstacles.splice(i, 1);
                    continue;
                } else if (this.hasShield) {
                    // Shield absorbs hit
                    this.hasShield = false;
                    this.screenShake = 0.55;
                    this._spawnShieldBreakExplosion(this.shipVisualX, this.shipY);
                    AudioManager.playShieldBreak();
                    this.popups.push({
                        text: `SHIELD BROKEN!`,
                        x: this.shipVisualX,
                        y: this.shipY - 25,
                        life: 0.9,
                        maxLife: 0.9,
                        color: '#00e5ff'
                    });
                    EventBus.emit('arcadeShieldUsed');
                    this.obstacles.splice(i, 1);
                    continue;
                } else {
                    // Fatal crash
                    this.alive = false;
                    this.combo = 1;
                    this.screenShake = 0.65;
                    this._spawnExplosion(this.shipVisualX, this.shipY);
                    EventBus.emit('arcadeCollision', { score: this.score });
                    return;
                }
            }
        }

        // ── Popups & Particles ───────────────────────────────
        for (let i = this.popups.length - 1; i >= 0; i--) {
            const popup = this.popups[i];
            popup.y -= dt * 65;
            popup.life -= dt;
            if (popup.life <= 0) this.popups.splice(i, 1);
        }

        this._updateParticles(dt);

        // Trail particles
        const trailHue = this.nitroTimer > 0 ? (Date.now() / 3) % 360 : (this.hasShield ? 190 : 140);
        this.particles.push({
            x: this.shipVisualX + randomRange(-8, 8),
            y: this.shipY + 20,
            vx: randomRange(-20, 20),
            vy: randomRange(60, 160) * (this.nitroTimer > 0 ? 2 : 1),
            life: 0.35,
            maxLife: 0.35,
            hue: trailHue,
        });

        // Speed lines
        for (const line of this.speedLines) {
            line.y += this.speed * line.speedMult * dt;
            if (line.y > H + 50) {
                line.y = -50;
                line.x = randomRange(LANES_X_OFFSET - 40, LANES_X_OFFSET + LANES_TOTAL_WIDTH + 40);
            }
        }

        // Screen shake decay
        if (this.screenShake > 0) {
            this.screenShake = Math.max(0, this.screenShake - dt * 2.2);
        }

        this.bgScroll += this.speed * dt * 0.35;
        this.scanlinePhase += dt;
    }

    _onCollectItem(coll, collX) {
        const type = coll.type || 'data';

        if (type === 'data') {
            const mult = (this.nitroTimer > 0 ? 3 : 1) * this.combo;
            const points = 50 * mult;
            this.score += points;
            AudioManager.playCollect();
            this._spawnCollectExplosion(collX, coll.y, 130);
            this.popups.push({
                text: `+${points}`,
                x: collX,
                y: coll.y - 10,
                life: 0.6,
                maxLife: 0.6,
                color: '#00ff88'
            });
            this.combo++;
            EventBus.emit('arcadeCollect', { combo: this.combo });
        } else if (type === 'shield') {
            this.hasShield = true;
            AudioManager.playPowerupShield();
            this._spawnCollectExplosion(collX, coll.y, 190);
            this.popups.push({
                text: 'SHIELD ONLINE',
                x: collX,
                y: coll.y - 15,
                life: 0.9,
                maxLife: 0.9,
                color: '#00e5ff'
            });
            EventBus.emit('arcadePowerup', { type: 'shield' });
        } else if (type === 'nitro') {
            this.nitroTimer = 5.0;
            AudioManager.playPowerupNitro();
            this._spawnCollectExplosion(collX, coll.y, 50);
            this.popups.push({
                text: 'OVERCLOCK 3X',
                x: collX,
                y: coll.y - 15,
                life: 1.0,
                maxLife: 1.0,
                color: '#ffea00'
            });
            EventBus.emit('arcadePowerup', { type: 'nitro' });
        } else if (type === 'magnet') {
            this.magnetTimer = 8.0;
            AudioManager.playPowerupMagnet();
            this._spawnCollectExplosion(collX, coll.y, 280);
            this.popups.push({
                text: 'DATA MAGNET',
                x: collX,
                y: coll.y - 15,
                life: 0.9,
                maxLife: 0.9,
                color: '#e040fb'
            });
            EventBus.emit('arcadePowerup', { type: 'magnet' });
        } else if (type === 'coffee') {
            AudioManager.playCoffeeGulp();
            this._spawnCollectExplosion(collX, coll.y, 35);
            this.popups.push({
                text: 'ENERGY RECHARGED +30%',
                x: collX,
                y: coll.y - 15,
                life: 1.0,
                maxLife: 1.0,
                color: '#f59e0b'
            });
            EventBus.emit('arcadeCoffee');
        } else if (type === 'emp') {
            AudioManager.playEmpBlast();
            this.empFlash = 1.0;
            this.screenShake = 0.6;
            const bonus = this.obstacles.length * 100 * this.combo;
            this.score += bonus;
            for (const obs of this.obstacles) {
                this._spawnExplosion(LANES_X_OFFSET + obs.startLane * LANE_WIDTH + LANE_WIDTH / 2, obs.y);
            }
            this.obstacles.length = 0;
            this.popups.push({
                text: `EMP DISCHARGE +${bonus}`,
                x: W / 2,
                y: H / 2,
                life: 1.2,
                maxLife: 1.2,
                color: '#f43f5e'
            });
            EventBus.emit('arcadePowerup', { type: 'emp' });
        }
    }

    /* ── Render ────────────────────────────────────────── */

    render() {
        const ctx = this.ctx;
        ctx.save();

        // Screen shake
        if (this.screenShake > 0) {
            const sx = (Math.random() - 0.5) * this.screenShake * 18;
            const sy = (Math.random() - 0.5) * this.screenShake * 18;
            ctx.translate(sx, sy);
        }

        // ── Cyberpunk Cyber-Grid Background ───────────
        ctx.fillStyle = '#080816';
        ctx.fillRect(0, 0, W, H);

        // Perspective Horizon Lines
        const horizonY = 30;
        ctx.strokeStyle = 'rgba(0, 255, 180, 0.08)';
        ctx.lineWidth = 1;

        // Moving Horizontal Grid with Perspective
        const numHLines = 14;
        for (let i = 0; i < numHLines; i++) {
            const norm = (i / numHLines + (this.bgScroll * 0.002)) % 1.0;
            const y = horizonY + Math.pow(norm, 2.2) * (H - horizonY);
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(W, y);
            ctx.stroke();
        }

        // Speed Lines during Overclock / high speeds
        ctx.strokeStyle = this.nitroTimer > 0 ? 'rgba(255, 230, 0, 0.45)' : 'rgba(0, 255, 200, 0.12)';
        ctx.lineWidth = this.nitroTimer > 0 ? 2 : 1;
        for (const line of this.speedLines) {
            ctx.beginPath();
            ctx.moveTo(line.x, line.y);
            ctx.lineTo(line.x, line.y + line.len * (this.nitroTimer > 0 ? 1.8 : 1.0));
            ctx.stroke();
        }

        // ── Lanes ────────────────────────────────────
        for (let i = 0; i < LANE_COUNT; i++) {
            const lx = LANES_X_OFFSET + i * LANE_WIDTH;
            const isShipLane = (i === this.shipLane);

            // Lane fill
            if (isShipLane) {
                const fillGrad = ctx.createLinearGradient(0, 0, 0, H);
                fillGrad.addColorStop(0, 'rgba(0, 255, 140, 0.02)');
                fillGrad.addColorStop(1, 'rgba(0, 255, 140, 0.09)');
                ctx.fillStyle = fillGrad;
            } else {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.015)';
            }
            ctx.fillRect(lx, 0, LANE_WIDTH, H);

            // Lane Dividers
            ctx.strokeStyle = isShipLane ? 'rgba(0, 255, 180, 0.35)' : 'rgba(0, 255, 180, 0.12)';
            ctx.lineWidth = 1.5;
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
            const startLane = obs.startLane !== undefined ? obs.startLane : obs.lane;
            const laneSpan  = obs.laneSpan !== undefined ? obs.laneSpan : 1;
            const pad = 12;
            const shift = obs.shiftOffset || 0;
            const ox = LANES_X_OFFSET + startLane * LANE_WIDTH + pad + shift;
            const oWidth = laneSpan * LANE_WIDTH - 2 * pad;

            // Outer Neon Glow
            ctx.shadowColor = `hsl(${obs.hue}, 100%, 60%)`;
            ctx.shadowBlur  = 16;
            ctx.fillStyle   = `hsl(${obs.hue}, 100%, 52%)`;
            ctx.fillRect(ox, obs.y, oWidth, obs.height);

            // Inner Core
            ctx.shadowBlur = 0;
            ctx.fillStyle  = `hsl(${obs.hue}, 90%, 80%)`;
            ctx.fillRect(ox + 4, obs.y + 4, oWidth - 8, obs.height - 8);

            // Hazard stripes or shift indicator
            if (laneSpan > 1 || obs.isShifting) {
                ctx.save();
                ctx.beginPath();
                ctx.rect(ox + 4, obs.y + 4, oWidth - 8, obs.height - 8);
                ctx.clip();
                ctx.strokeStyle = `hsla(${obs.hue}, 100%, 25%, 0.55)`;
                ctx.lineWidth = 12;
                for (let sx = -40; sx < oWidth + 40; sx += 22) {
                    ctx.beginPath();
                    ctx.moveTo(ox + sx, obs.y);
                    ctx.lineTo(ox + sx + 22, obs.y + obs.height);
                    ctx.stroke();
                }
                ctx.restore();
            }
        }

        // ── Collectibles & Power-ups ─────────────────
        for (const coll of this.collectibles) {
            const baseCollX = LANES_X_OFFSET + coll.lane * LANE_WIDTH + LANE_WIDTH / 2;
            const cx = baseCollX + (coll.magnetPullX || 0);
            const cy = coll.y;
            const scale = 1 + Math.sin(coll.pulsePhase) * 0.15;
            this._drawCollectible(ctx, cx, cy, coll.type || 'data', scale);
        }

        // ── Trail & Explosion Particles ──────────────
        for (const p of this.particles) {
            const alpha = p.life / p.maxLife;
            ctx.fillStyle = `hsla(${p.hue}, 100%, 65%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(1, 4.5 * alpha), 0, Math.PI * 2);
            ctx.fill();
        }

        // ── Player Cyber Ship ────────────────────────
        if (this.alive) {
            this._drawShip(ctx, this.shipVisualX, this.shipY);
        }

        // ── Floating Score Popups ────────────────────
        for (const popup of this.popups) {
            const alpha = Math.min(1, popup.life / (popup.maxLife * 0.5));
            ctx.save();
            ctx.font = 'bold 20px "Outfit", monospace';
            ctx.fillStyle = popup.color || '#00ff88';
            ctx.shadowColor = popup.color || '#00ff88';
            ctx.shadowBlur = 10;
            ctx.textAlign = 'center';
            ctx.globalAlpha = alpha;
            ctx.fillText(popup.text, popup.x, popup.y);
            ctx.restore();
        }

        // ── EMP Flash ────────────────────────────────
        if (this.empFlash > 0) {
            ctx.fillStyle = `rgba(255, 255, 255, ${this.empFlash * 0.6})`;
            ctx.fillRect(0, 0, W, H);
        }

        // ── Heads-Up Display on Monitor Screen ───────
        // Active Powerup Badges
        let badgeY = 25;
        if (this.hasShield) {
            this._drawStatusBadge(ctx, 25, badgeY, 'SHIELD // ONLINE', '#00e5ff');
            badgeY += 28;
        }
        if (this.nitroTimer > 0) {
            this._drawStatusBadge(ctx, 25, badgeY, `OVERCLOCK // ${this.nitroTimer.toFixed(1)}s`, '#ffd600');
            badgeY += 28;
        }
        if (this.magnetTimer > 0) {
            this._drawStatusBadge(ctx, 25, badgeY, `DATA MAGNET // ${this.magnetTimer.toFixed(1)}s`, '#e040fb');
            badgeY += 28;
        }

        // Score & Multiplier top right
        ctx.font = 'bold 20px "JetBrains Mono", monospace';
        ctx.fillStyle = '#0df2a4';
        ctx.shadowColor = '#0df2a4';
        ctx.shadowBlur = 10;
        ctx.textAlign = 'right';
        ctx.fillText(`SCORE: ${this.score}`, W - 25, 35);
        ctx.shadowBlur = 0;

        if (this.combo > 1) {
            const comboColor = this.combo >= 5 ? '#f43f5e' : (this.combo >= 3 ? '#f59e0b' : '#00d2ff');
            ctx.font = 'bold 16px "JetBrains Mono", monospace';
            ctx.fillStyle = comboColor;
            ctx.shadowColor = comboColor;
            ctx.shadowBlur = 6;
            ctx.fillText(`COMBO MULTIPLIER x${this.combo}`, W - 25, 62);
            ctx.shadowBlur = 0;
        }

        // ── CRT Scanlines & Screen Glass Curve ───────
        ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
        for (let y = 0; y < H; y += 3) {
            ctx.fillRect(0, y, W, 1);
        }

        // CRT vignette
        const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.85);
        vignette.addColorStop(0, 'rgba(0,0,0,0)');
        vignette.addColorStop(1, 'rgba(0,0,0,0.4)');
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, W, H);

        ctx.restore();
    }

    /* ── Drawing Helpers ───────────────────────────────── */

    _drawShip(ctx, x, y) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(this.shipTilt);

        // Holographic Hexagon Shield
        if (this.hasShield) {
            ctx.save();
            ctx.strokeStyle = '#00e5ff';
            ctx.shadowColor = '#00e5ff';
            ctx.shadowBlur = 15;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            const rad = 36 + Math.sin(Date.now() * 0.008) * 3;
            for (let a = 0; a < 6; a++) {
                const angle = (a * Math.PI) / 3;
                const px = Math.cos(angle) * rad;
                const py = Math.sin(angle) * rad;
                if (a === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
            ctx.fillStyle = 'rgba(0, 229, 255, 0.08)';
            ctx.fill();
            ctx.restore();
        }

        // Overclock Nitro Aura
        if (this.nitroTimer > 0) {
            ctx.save();
            ctx.strokeStyle = '#ffe600';
            ctx.shadowColor = '#ffe600';
            ctx.shadowBlur = 25;
            ctx.lineWidth = 3;
            ctx.strokeRect(-24, -28, 48, 56);
            ctx.restore();
        }

        // Ship Outer Glow
        const shipColor = this.nitroTimer > 0 ? '#ffea00' : '#00ff88';
        ctx.shadowColor = shipColor;
        ctx.shadowBlur  = 18;

        // Aerodynamic Sleek Cyber Fighter Body
        ctx.beginPath();
        ctx.moveTo(0, -25);       // Nose
        ctx.lineTo(8, -5);
        ctx.lineTo(22, 14);       // Right wingtip
        ctx.lineTo(12, 18);
        ctx.lineTo(5, 12);
        ctx.lineTo(0, 16);        // Rear center
        ctx.lineTo(-5, 12);
        ctx.lineTo(-12, 18);
        ctx.lineTo(-22, 14);      // Left wingtip
        ctx.lineTo(-8, -5);
        ctx.closePath();

        ctx.fillStyle = shipColor;
        ctx.fill();

        // Inner Cockpit Visor
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.moveTo(0, -16);
        ctx.lineTo(5, -2);
        ctx.lineTo(-5, -2);
        ctx.closePath();
        ctx.fillStyle = '#0a192f';
        ctx.fill();

        // Dual Engine Thruster Flames
        const flameHeight = 12 + Math.sin(Date.now() * 0.03) * 6;
        const flameGrad = ctx.createLinearGradient(0, 12, 0, 12 + flameHeight);
        flameGrad.addColorStop(0, this.nitroTimer > 0 ? '#ff3d00' : '#00ffea');
        flameGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = flameGrad;

        // Left flame
        ctx.beginPath();
        ctx.moveTo(-9, 14);
        ctx.lineTo(-6, 14 + flameHeight);
        ctx.lineTo(-3, 14);
        ctx.fill();

        // Right flame
        ctx.beginPath();
        ctx.moveTo(3, 14);
        ctx.lineTo(6, 14 + flameHeight);
        ctx.lineTo(9, 14);
        ctx.fill();

        ctx.restore();
    }

    _drawCollectible(ctx, cx, cy, type, scale) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(scale, scale);

        if (type === 'data') {
            // Neon Diamond Chip
            ctx.shadowColor = '#00ff88';
            ctx.shadowBlur = 14;
            ctx.fillStyle = '#00ff88';
            ctx.beginPath();
            ctx.moveTo(0, -14);
            ctx.lineTo(12, 0);
            ctx.lineTo(0, 14);
            ctx.lineTo(-12, 0);
            ctx.closePath();
            ctx.fill();

            ctx.shadowBlur = 0;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(0, -6);
            ctx.lineTo(5, 0);
            ctx.lineTo(0, 6);
            ctx.lineTo(-5, 0);
            ctx.closePath();
            ctx.fill();
        } else if (type === 'shield') {
            // High-tech Cyan Hex Shield Aegis
            ctx.shadowColor = '#00e5ff';
            ctx.shadowBlur = 16;
            ctx.fillStyle = 'rgba(0, 229, 255, 0.25)';
            ctx.strokeStyle = '#00e5ff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i - Math.PI / 6;
                const hx = Math.cos(angle) * 14;
                const hy = Math.sin(angle) * 14;
                if (i === 0) ctx.moveTo(hx, hy);
                else ctx.lineTo(hx, hy);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Inner Aegis Crest
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(0, -6);
            ctx.lineTo(6, -3);
            ctx.lineTo(5, 3);
            ctx.lineTo(0, 7);
            ctx.lineTo(-5, 3);
            ctx.lineTo(-6, -3);
            ctx.closePath();
            ctx.fill();
        } else if (type === 'nitro') {
            // Golden Overclock Shard with Lightning Glyph
            ctx.shadowColor = '#ffd600';
            ctx.shadowBlur = 18;
            ctx.fillStyle = 'rgba(255, 214, 0, 0.25)';
            ctx.strokeStyle = '#ffd600';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, -15);
            ctx.lineTo(13, 0);
            ctx.lineTo(0, 15);
            ctx.lineTo(-13, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Crisp Lightning Bolt
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(1, -8);
            ctx.lineTo(-4, 0);
            ctx.lineTo(1, 0);
            ctx.lineTo(-1, 8);
            ctx.lineTo(5, -1);
            ctx.lineTo(1, -1);
            ctx.closePath();
            ctx.fill();
        } else if (type === 'magnet') {
            // Neon Violet Magnetic Field Ring
            ctx.shadowColor = '#e040fb';
            ctx.shadowBlur = 16;
            ctx.fillStyle = 'rgba(224, 64, 251, 0.2)';
            ctx.strokeStyle = '#e040fb';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, 14, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Vector Horseshoe Magnet
            ctx.lineWidth = 3.5;
            ctx.strokeStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, 2, 7, Math.PI, 0, false);
            ctx.lineTo(7, 8);
            ctx.moveTo(-7, 2);
            ctx.lineTo(-7, 8);
            ctx.stroke();

            // Red & Blue Magnetic Poles
            ctx.fillStyle = '#ff1744';
            ctx.fillRect(-9, 7, 4, 3);
            ctx.fillStyle = '#00d2ff';
            ctx.fillRect(5, 7, 4, 3);
        } else if (type === 'coffee') {
            // Warm Amber Energy Cell / Coffee Mug
            ctx.shadowColor = '#ff9800';
            ctx.shadowBlur = 16;
            ctx.fillStyle = 'rgba(255, 152, 0, 0.2)';
            ctx.strokeStyle = '#ff9800';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, 14, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Stylized Minimalist Mug
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.roundRect(-5, -3, 10, 10, [0, 0, 4, 4]);
            ctx.fill();
            // Handle
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(6, 1, 3, -Math.PI / 2, Math.PI / 2);
            ctx.stroke();
            // Vapor lines
            ctx.strokeStyle = '#ffd54f';
            ctx.beginPath();
            ctx.moveTo(-3, -5); ctx.lineTo(-3, -7);
            ctx.moveTo(0, -5); ctx.lineTo(0, -8);
            ctx.moveTo(3, -5); ctx.lineTo(3, -7);
            ctx.stroke();
        } else if (type === 'emp') {
            // EMP Pulse Generator / Targeting Reticle
            ctx.shadowColor = '#ff1744';
            ctx.shadowBlur = 18;
            ctx.fillStyle = 'rgba(255, 23, 68, 0.25)';
            ctx.strokeStyle = '#ff1744';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, 14, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Targeting Crosshairs & Core
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(0, 0, 8, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, -11); ctx.lineTo(0, -5);
            ctx.moveTo(0, 5); ctx.lineTo(0, 11);
            ctx.moveTo(-11, 0); ctx.lineTo(-5, 0);
            ctx.moveTo(5, 0); ctx.lineTo(11, 0);
            ctx.stroke();

            ctx.fillStyle = '#ff1744';
            ctx.beginPath();
            ctx.arc(0, 0, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    _drawStatusBadge(ctx, x, y, text, color) {
        ctx.save();
        ctx.fillStyle = 'rgba(8, 10, 15, 0.88)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(x, y, 190, 22, 4);
        ctx.fill();
        ctx.stroke();

        // Left accent indicator pill
        ctx.fillStyle = color;
        ctx.fillRect(x + 2, y + 2, 4, 18);

        ctx.font = 'bold 11px "JetBrains Mono", monospace';
        ctx.fillStyle = color;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x + 12, y + 11);
        ctx.restore();
    }

    _spawnObstacle() {
        const rand = Math.random();
        let laneSpan = 1;
        let isShifting = false;

        if (rand > 0.85) {
            laneSpan = 3;
        } else if (rand > 0.62) {
            laneSpan = 2;
        } else if (rand > 0.45 && this.elapsedTime > 15) {
            isShifting = true; // moving hurdle
        }

        const startLane = randomInt(0, LANE_COUNT - laneSpan);
        let hue = 330; // Neon Pink for 1-lane
        if (laneSpan === 2) hue = 38; // Amber
        else if (laneSpan === 3) hue = 195; // Ice Blue
        if (isShifting) hue = 280; // Violet glitch

        this.obstacles.push({
            startLane,
            laneSpan,
            y: -60,
            height: 32 + Math.random() * 14,
            passed: false,
            hue,
            isShifting,
            shiftPhase: Math.random() * Math.PI,
            shiftOffset: 0,
        });
    }

    _spawnCollectible() {
        const lane = randomInt(0, LANE_COUNT - 1);
        const roll = Math.random();
        let type = 'data';

        if (roll > 0.92) type = 'emp';
        else if (roll > 0.82) type = 'nitro';
        else if (roll > 0.72) type = 'shield';
        else if (roll > 0.62) type = 'coffee';
        else if (roll > 0.52) type = 'magnet';

        this.collectibles.push({
            lane,
            type,
            y: -40,
            pulsePhase: Math.random() * Math.PI * 2,
            magnetPullX: 0,
        });
    }

    _spawnCollectExplosion(x, y, baseHue = 120) {
        for (let i = 0; i < 18; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = randomRange(40, 160);
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                life: randomRange(0.25, 0.55),
                maxLife: 0.55,
                hue: baseHue + Math.random() * 25,
            });
        }
    }

    _spawnShieldBreakExplosion(x, y) {
        for (let i = 0; i < 35; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = randomRange(60, 220);
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                life: randomRange(0.35, 0.75),
                maxLife: 0.75,
                hue: 190 + Math.random() * 20,
            });
        }
    }

    _spawnExplosion(x, y) {
        for (let i = 0; i < 45; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = randomRange(50, 260);
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                life: randomRange(0.3, 0.85),
                maxLife: 0.85,
                hue: Math.random() > 0.5 ? 335 : 35,
            });
        }
    }

    _updateParticles(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    _laneX(lane) {
        return LANES_X_OFFSET + lane * LANE_WIDTH + LANE_WIDTH / 2;
    }
}
