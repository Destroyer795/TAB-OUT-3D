/**
 * Game.js – Master game controller.
 *
 * Orchestrates the game loop, state machine, 3D scene, gameplay systems,
 * audio, progression, suspicion mechanics, and UI.
 */

import * as THREE from 'three';
import { StateMachine, GameState } from './StateMachine.js';
import EventBus  from './EventBus.js';
import InputManager from './InputManager.js';
import SaveManager  from './SaveManager.js';
import { TweenManager } from '../utils/AnimationUtils.js';
import { lerp } from '../utils/MathUtils.js';

import { OfficeScene }   from '../scene/OfficeScene.js';
import { Monitor }       from '../scene/Monitor.js';
import { LightingSystem } from '../scene/LightingSystem.js';
import { BossCharacter }  from '../scene/BossCharacter.js';
import { Atmosphere } from '../scene/Atmosphere.js';
import { DeskInteractions } from '../scene/DeskInteractions.js';

import { ArcadeGame }        from '../gameplay/ArcadeGame.js';
import { SpreadsheetMode }   from '../gameplay/SpreadsheetMode.js';
import { ProductivitySystem } from '../gameplay/ProductivitySystem.js';
import { BossSystem }        from '../gameplay/BossSystem.js';
import { ProgressionSystem } from '../gameplay/ProgressionSystem.js';

import AudioManager from '../audio/AudioManager.js';

import { HUD }            from '../ui/HUD.js';
import { Menu }           from '../ui/Menu.js';
import { GameOverScreen } from '../ui/GameOverScreen.js';
import { Auth }           from '../ui/Auth.js';
import AuthSystem         from './AuthSystem.js';

/* ── Camera defaults ──────────────────────────────────── */
const CAM_DEFAULT  = { x: 0, y: 2.1, z: 1.8, lookY: 1.45 };
const CAM_HIDING   = { x: 0, y: 2.02, z: 1.95, lookY: 1.45 };

export class Game {
    constructor() {
        /* ── Three.js core ────────────────────────────── */
        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.12;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        document.getElementById('canvas-container').appendChild(this.renderer.domElement);

        this.scene  = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf1f5f9);
        this.scene.fog = new THREE.Fog(0xf1f5f9, 15, 38);

        this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 300);
        this.camera.position.set(CAM_DEFAULT.x, CAM_DEFAULT.y, CAM_DEFAULT.z);
        this._camTarget = { ...CAM_DEFAULT };
        this._camLookY  = CAM_DEFAULT.lookY;
        this._cameraPosition = this.camera.position.clone();
        this._lookTarget = new THREE.Vector3();
        this._parallax = new THREE.Vector2();
        this._shake = 0;
        this._punch = 0;
        this._time = 0;
        this._slowMotion = 0;
        this._closeCallAwarded = false;
        this._stealthLatched = false;
        this._disposed = false;
        this._runId = 0;

        /* ── State machine ────────────────────────────── */
        this.fsm = new StateMachine();

        /* ── Tweens ───────────────────────────────────── */
        this.tweens = new TweenManager();

        /* ── Scene objects ────────────────────────────── */
        this.officeScene = new OfficeScene(this.scene);
        this.monitor     = new Monitor(this.scene);
        this.lighting    = new LightingSystem(this.scene);
        this.boss        = new BossCharacter(this.scene);
        this.officeScene.setBoss(this.boss);
        this.boss.setOfficeScene(this.officeScene);
        this.boss.setCamera(this.camera);
        this.atmosphere = new Atmosphere(this.scene);
        this.desk = new DeskInteractions(this.officeScene, this.camera, this.renderer.domElement,
            () => this._drinkCoffee(), () => this.fsm.isActive && !this.isPaused);

        /* ── Gameplay systems ─────────────────────────── */
        this.arcadeGame   = new ArcadeGame(this.monitor.getCanvas());
        this.spreadsheet  = new SpreadsheetMode(this.monitor.getCanvas());
        this.productivity = new ProductivitySystem();
        this.bossSystem   = new BossSystem();
        this.progression  = new ProgressionSystem();
        this.arcadeGame.render();
        this.monitor.needsUpdate();

        /* ── Dynamic State Vars ───────────────────────── */
        this._showingArcade   = true;
        this.suspicion        = 0;     // 0 to 100%
        this._heartbeatTimer  = 0;
        this.coffeeCooldown   = 0;
        this.isPaused         = false;

        /* ── UI ───────────────────────────────────────── */
        this.hud    = new HUD();
        this.auth   = new Auth(() => this.menu.show());
        this.menu   = new Menu(
            () => this._startGame(),
            () => this._signOutUser()
        );
        this.gameOver = new GameOverScreen(
            () => this._startGame(),
            () => this._goToMenu()
        );

        /* ── Input ────────────────────────────────────── */
        InputManager.install();
        this._unlockAudio = () => {
            AudioManager.init();
            AudioManager.resume();
            if (this.menu.el.classList.contains('visible')) AudioManager.startBgm('menu');
            window.removeEventListener('pointerdown', this._unlockAudio);
            window.removeEventListener('keydown', this._unlockAudio);
        };
        window.addEventListener('pointerdown', this._unlockAudio);
        window.addEventListener('keydown', this._unlockAudio);

        /* ── Clock ────────────────────────────────────── */
        this._clock = new THREE.Clock();
        this._prevTime = 0;

        /* ── Events ───────────────────────────────────── */
        this._bindEvents();

        /* ── Resize ───────────────────────────────────── */
        this._resizeHandler = () => this._onResize();
        this._visibilityHandler = () => {
            if (document.hidden && this.fsm.isActive && !this.isPaused) this._togglePause();
        };
        this._blurHandler = () => {
            if (this.fsm.isActive && !this.isPaused) this._togglePause();
        };
        this._motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
        window.addEventListener('resize', this._resizeHandler);
        window.addEventListener('blur', this._blurHandler);
        document.addEventListener('visibilitychange', this._visibilityHandler);

        /* ── Start at Auth or Menu ────────────────────── */
        this._initSession();

        /* ── Game loop ────────────────────────────────── */
        this._loop = this._loop.bind(this);
        this.renderer.setAnimationLoop(this._loop);
    }

    /* ══════════════════════════════════════════════════════
       Event wiring
       ══════════════════════════════════════════════════════ */

    _bindEvents() {
        EventBus.on('stateChange', ({ from, to }) => this._onStateChange(from, to));

        EventBus.on('bossWarning', () => {
            if (this.fsm.isActive) {
                this._closeCallAwarded = false;
                this.fsm.transition(GameState.BOSS_WARNING);
            }
        });

        EventBus.on('bossPresent', () => {
            if (this.fsm.isActive) {
                this.fsm.transition(GameState.BOSS_PRESENT);
            }
        });

        EventBus.on('bossGone', () => {
            this.boss.hide();
            if (this.fsm.current === GameState.BOSS_PRESENT ||
                this.fsm.current === GameState.HIDING) {
                if (this._showingArcade) {
                    this.fsm.transition(GameState.PLAYING);
                } else {
                    this.fsm.transition(GameState.HIDING);
                }
            }
        });

        EventBus.on('bossFootstep', () => {
            const bossX = this.boss.group ? this.boss.group.position.x : 0;
            AudioManager.playFootstep(bossX);
        });

        EventBus.on('arcadeCollision', () => {
            AudioManager.playArcadeCollision();
            if (this.fsm.isActive) {
                this.fsm.transition(GameState.GAMEOVER_CRASH);
            }
        });

        EventBus.on('arcadeScoreTick', () => {
            AudioManager.playScoreTick();
        });

        EventBus.on('arcadeCoffee', () => {
            this.productivity.value = Math.min(100, this.productivity.value + 30);
            this.hud.setProductivity(this.productivity.value);
        });

        EventBus.on('spreadsheetWorkDone', ({ boost, points = 0 }) => {
            this.productivity.value = Math.min(100, this.productivity.value + boost);
            this.arcadeGame.score += points;
            this.hud.setProductivity(this.productivity.value);
        });

        EventBus.on('playerPromoted', rank => {
            this.arcadeGame.score += rank.bonus;
            this.productivity.value = Math.min(100, this.productivity.value + 15);
        });

        EventBus.on('requestCoffee', () => {
            this._drinkCoffee();
        });

        EventBus.on('productivityDepleted', () => {
            if (this.fsm.isActive) {
                this.fsm.transition(GameState.GAMEOVER_PRODUCTIVITY);
            }
        });

        EventBus.on('productivityWarning', () => {
            AudioManager.playProductivityWarning();
        });
    }

    /* ══════════════════════════════════════════════════════
       State change handler
       ══════════════════════════════════════════════════════ */

    _onStateChange(from, to) {
        if (from === GameState.MENU) {
            this.menu.hide();
        }
        if (from === GameState.BOSS_WARNING) {
            this.lighting.stopWarning();
            this.hud.hideAlert();
        }

        switch (to) {
            case GameState.MENU:
                this.menu.show();
                this.hud.hide();
                this.gameOver.hide();
                this.boss.hide();
                this.suspicion = 0;
                this.monitor.setLedState('normal');
                this._camTarget = { ...CAM_DEFAULT };
                AudioManager.stopBgm();
                break;

            case GameState.PLAYING:
                this.hud.show();
                this.gameOver.hide();
                this.boss.hide();
                this.lighting.stopWarning();
                this.hud.hideAlert();
                this.monitor.setLedState('normal');
                this._showArcade();
                break;

            case GameState.HIDING:
                this._showSpreadsheet();
                break;

            case GameState.BOSS_WARNING:
                AudioManager.playBossWarning();
                this.lighting.startWarning();
                this.hud.showAlert();
                this.monitor.setLedState('warning');
                break;

            case GameState.BOSS_PRESENT:
                this.lighting.stopWarning();
                this.hud.hideAlert();
                this.boss.show();
                this.bossSystem.presenceTime = this.boss.pathLength / 1.35;
                this.monitor.setLedState('alert');
                break;

            case GameState.GAMEOVER_FIRED:
                this.boss.setPose('point');
                this.boss.setExpression('scowl');
                this.boss.setTalking(true);
                this._handleGameOver('fired');
                break;
            case GameState.GAMEOVER_PRODUCTIVITY:
                this._handleGameOver('productivity');
                break;
            case GameState.GAMEOVER_CRASH:
                this._handleGameOver('crash');
                break;
        }
    }

    /* ══════════════════════════════════════════════════════
       Game lifecycle
       ══════════════════════════════════════════════════════ */

    _startGame() {
        this._runId++;
        InputManager.reset();
        AudioManager.init();
        AudioManager.resume();
        AudioManager.startBgm('arcade');

        // Reset systems
        this.arcadeGame.reset();
        this.spreadsheet.reset();
        this.productivity.reset();
        this.bossSystem.reset();
        this.progression.resetRun();
        this.tweens.clear();
        this.desk.reset();
        this.hud.reset();

        this._showingArcade = true;
        this._stealthLatched = false;
        this._closeCallAwarded = false;
        this._slowMotion = 0;
        this._shake = 0;
        this.suspicion      = 0;
        this.coffeeCooldown = 0;
        this.isPaused       = false;
        this._camTarget     = { ...CAM_DEFAULT };

        this.hud.setScore(0);
        this.hud.setBest(SaveManager.highScore);
        this.hud.setProductivity(100);
        this.hud.setRank(this.progression.currentRank.title, this.progression.currentRank.code);
        this.hud.setMode('arcade');
        this.hud.setCoffeeCooldown(0);
        this.hud.setSuspicion(0);
        this.hud.hideAlert();

        this.boss.hide();
        this.lighting.stopWarning();
        this.monitor.setLedState('normal');

        if (this.fsm.current === GameState.PLAYING) this._onStateChange(null, GameState.PLAYING);
        else this.fsm.transition(GameState.PLAYING);
        this.progression.unlock('firstRun');
    }

    _goToMenu() {
        this._runId++;
        this.isPaused = false;
        this.hud.hidePause();
        this.fsm.reset();
    }

    _togglePause() {
        if (!this.fsm.isActive || this.fsm.isGameOver) return;
        this.isPaused = !this.isPaused;

        if (this.isPaused) {
            AudioManager.setStealthMuffled(true);
            this.hud.showPause(
                () => { this.isPaused = false; AudioManager.setStealthMuffled(!this._showingArcade); },
                () => {},
                () => this._goToMenu()
            );
        } else {
            this.hud.hidePause();
            AudioManager.setStealthMuffled(!this._showingArcade);
        }
    }

    _drinkCoffee() {
        if (!this.fsm.isActive || this.isPaused || this.coffeeCooldown > 0) return;
        const perk = this.progression.currentRank;
        this.coffeeCooldown = perk.coffeeCooldown;
        this.productivity.value = Math.min(100, this.productivity.value + perk.coffeeBoost);
        this.hud.setProductivity(this.productivity.value);
        AudioManager.playCoffeeGulp();
        this.desk.drink();
        EventBus.emit('coffeeConsumed');
    }

    async _initSession() {
        try {
            const user = await AuthSystem.getCurrentUser();
            if (user) {
                await this.menu.show();
            } else {
                this.auth.show();
            }
        } catch {
            this.auth.show();
        }
    }

    async _signOutUser() {
        await AuthSystem.signOut();
        this.menu.hide();
        this.auth.show();
    }

    async _handleGameOver(type) {
        const runId = this._runId;
        this._shake = .75;
        AudioManager.playGameOver();
        this.hud.hide();
        if (type !== 'fired') {
            this.boss.hide();
        }
        this.lighting.stopWarning();
        this.monitor.setLedState('normal');

        const score = this.arcadeGame.score;
        const rank  = this.progression.currentRank;
        const previousBest = SaveManager.highScore;
        // The end screen appears immediately; network sync never blocks a retry.
        this.gameOver.show(type, score, Math.max(previousBest, score), score > previousBest, rank.title, rank.code);
        await SaveManager.submitScore(score);
        if (this._disposed || runId !== this._runId) return;
        this.hud.setBest(SaveManager.highScore);
    }

    /* ══════════════════════════════════════════════════════
       Monitor switching
       ══════════════════════════════════════════════════════ */

    _showArcade() {
        if (this._showingArcade) return;
        this._showingArcade = true;
        this._punch = -.09;
        this.hud.setMode('arcade');
        this.lighting.setMonitorColor(0x00ffaa);
        AudioManager.playShowSwitch();
        this._camTarget = { ...CAM_DEFAULT };
    }

    _showSpreadsheet() {
        if (!this._showingArcade) return;
        // Check for Close Call bonus if player dodged boss with high suspicion
        const lastMoment = this.bossSystem.phase === 'warning' && this.bossSystem.warningRemaining <= .22;
        if (!this._closeCallAwarded && (lastMoment || (this.bossSystem.phase === 'present' && this.suspicion >= 60))) {
            this._closeCallAwarded = true;
            this.arcadeGame.score += 500;
            this._slowMotion = .7;
            AudioManager.playCloseCall();
            EventBus.emit('closeCall');
        }

        this._showingArcade = false;
        this._punch = .12;
        this.hud.setMode('stealth');
        this.lighting.setMonitorColor(0xddeeff);
        AudioManager.playHideSwitch();
        this._camTarget = { ...CAM_HIDING };
    }

    /* ══════════════════════════════════════════════════════
       Main loop
       ══════════════════════════════════════════════════════ */

    _loop() {
        const dt = Math.min(this._clock.getDelta(), 0.05);

        this._handleInput(dt);
        if (!this.isPaused) {
            const scale = this._slowMotion > 0 ? .4 : 1;
            this._slowMotion = Math.max(0, this._slowMotion - dt);
            this._update(dt * scale);
        }
        this._render();

        InputManager.endFrame();
    }

    /* ── Input ────────────────────────────────────────── */

    _handleInput(dt) {
        const state = this.fsm.current;

        if (state === GameState.MENU) return;
        if (this.fsm.isGameOver) return;

        // P / ESC → Pause
        if (InputManager.wasPressed('KeyP') || InputManager.wasPressed('Escape')) {
            this._togglePause();
            return;
        }

        if (this.isPaused) return;

        // C → Drink Coffee
        if (InputManager.wasPressed('KeyC')) {
            this._drinkCoffee();
        }

        // Hold Space, or latch stealth with Tab. Alt+Tab is normally owned by
        // the OS; losing browser focus pauses safely instead of leaving stuck keys.
        if (InputManager.wasPressed('Tab')) this._stealthLatched = !this._stealthLatched;
        const hiding = InputManager.isDown('Space') || this._stealthLatched;
        if (hiding && this._showingArcade) {
            if (state === GameState.PLAYING) this.fsm.transition(GameState.HIDING);
            else this._showSpreadsheet();
        } else if (!hiding && !this._showingArcade) {
            if (state === GameState.HIDING && this.bossSystem.phase === 'idle') this.fsm.transition(GameState.PLAYING);
            else this._showArcade();
        }

        // Arcade movement (Arrow keys OR A / D keys)
        if (this._showingArcade && this.arcadeGame.alive) {
            if (InputManager.wasPressed('ArrowLeft') || InputManager.wasPressed('KeyA')) {
                this.arcadeGame.moveLeft();
            }
            if (InputManager.wasPressed('ArrowRight') || InputManager.wasPressed('KeyD')) {
                this.arcadeGame.moveRight();
            }
        }

        // Active Spreadsheet Number-Crunching while hiding
        if (!this._showingArcade) {
            // Any typing keys while hiding
            for (const code of Object.keys(InputManager._justPressed)) {
                if (/^(Key[A-Z]|Digit[0-9]|Enter)$/.test(code) && code !== 'KeyP' && code !== 'KeyC') {
                    this.spreadsheet.crunchNumber();
                    break;
                }
            }
        }
    }

    /* ── Update ───────────────────────────────────────── */

    _update(dt) {
        this.tweens.update(dt);

        this._time += dt;
        const motion = !this._motionQuery.matches;
        const ease = 1 - Math.exp(-6 * dt);
        this._parallax.x = lerp(this._parallax.x, motion ? InputManager.mouseX * .055 : 0, ease);
        this._parallax.y = lerp(this._parallax.y, motion ? InputManager.mouseY * .025 : 0, ease);
        this._cameraPosition.x = lerp(this._cameraPosition.x, this._camTarget.x, ease);
        this._cameraPosition.y = lerp(this._cameraPosition.y, this._camTarget.y, ease);
        this._cameraPosition.z = lerp(this._cameraPosition.z, this._camTarget.z, ease);
        this._punch *= Math.exp(-12 * dt);
        this._shake = Math.max(0, this._shake - dt * 1.5);
        const shake = motion ? this._shake * .035 : 0;
        this.camera.position.copy(this._cameraPosition);
        this.camera.position.x += this._parallax.x + (Math.random() - .5) * shake;
        this.camera.position.y += this._parallax.y + (Math.random() - .5) * shake;
        this.camera.position.z += motion ? this._punch : 0;
        this._camLookY = lerp(this._camLookY, this._camTarget.lookY, ease);
        this._lookTarget.set(-this._parallax.x * .4, this._camLookY, -1);
        this.camera.lookAt(this._lookTarget);
        const pulse = motion && this.suspicion > 60 ? Math.pow(Math.max(0, Math.sin(this._time * 14)), 6) * 1.2 : 0;
        const fov = 55 - pulse;
        if (Math.abs(this.camera.fov - fov) > .001) {
            this.camera.fov = fov;
            this.camera.updateProjectionMatrix();
        }
        this.atmosphere.update(dt);
        this.desk.update(dt);

        // Lighting & Monitor LED
        this.lighting.update(dt);
        this.monitor.update(dt);

        // Office Scene Animation
        if (!this.fsm.isActive) {
            this.officeScene.suspicion = this.suspicion;
            this.officeScene.update(dt);
            this.boss.update(dt);
            return;
        }
        AudioManager.updateAmbience(dt);

        // Coffee Cooldown
        if (this.coffeeCooldown > 0) {
            this.coffeeCooldown = Math.max(0, this.coffeeCooldown - dt);
        }
        this.hud.setCoffeeCooldown(this.coffeeCooldown);

        // ── Boss system ──────────────────────────
        this.bossSystem.update(dt);
        this.hud.setPatrol(this.bossSystem.phase, this.bossSystem.warningRemaining);

        if (this.bossSystem.phase === 'present') {
            this.boss.updateWalk(this.bossSystem.bossProgress, dt, this.fsm.current, this.suspicion);

        }
        this.boss.update(dt);
        this.officeScene.suspicion = this.suspicion;
        this.officeScene.update(dt);

        // ── Dynamic Suspicion Meter ──────────────
        const bossSeesScreen = (this.fsm.current === GameState.BOSS_PRESENT && this._showingArcade && this.isBossVisible());

        if (bossSeesScreen) {
            // Suspicion rises quickly
            this.suspicion = Math.min(100, this.suspicion + dt * 230);
            this.monitor.setLedState('alert');

            // Suspicion heartbeat audio
            this._heartbeatTimer += dt;
            if (this._heartbeatTimer >= 0.32) {
                this._heartbeatTimer = 0;
                AudioManager.playSuspicionHeartbeat();
            }

            // Caught!
            if (this.suspicion >= 100) {
                this.fsm.transition(GameState.GAMEOVER_FIRED);
                return;
            }
        } else {
            // Cool down
            this.suspicion = Math.max(0, this.suspicion - dt * 170);
            if (this.fsm.current === GameState.BOSS_WARNING) {
                this.monitor.setLedState('warning');
            } else if (this.fsm.current === GameState.BOSS_PRESENT) {
                this.monitor.setLedState('warning');
            } else {
                this.monitor.setLedState('normal');
            }
        }
        this.hud.setSuspicion(this.suspicion);

        // ── Productivity drain & recovery ────────
        const isDraining = !this._showingArcade && this.bossSystem.phase !== 'present';
        const isRecovering = this._showingArcade;
        this.productivity.update(dt, isDraining, isRecovering);
        this.hud.setProductivity(this.productivity.value);
        if (!this.fsm.isActive) return;

        // ── Arcade game update ───────────────────
        if (this._showingArcade) {
            this.arcadeGame.update(dt);
            AudioManager.setMusicSpeed(this.arcadeGame.speed / 270);
        } else {
            this.spreadsheet.update(dt);
            if (Math.random() < dt * 6) {
                AudioManager.playTyping();
            }
        }
        this.hud.setScore(this.arcadeGame.score);
        this.progression.checkScore(this.arcadeGame.score);
        this.hud.setCareer(this.arcadeGame.score, this.progression.currentRankIndex, this.spreadsheet.revenue);

        // ── Monitor canvas render ────────────────
        if (this._showingArcade) {
            this.arcadeGame.render();
        } else {
            this.spreadsheet.render();
        }
        this.monitor.needsUpdate();
    }

    isBossVisible() {
        if (!this.boss.group.visible) return false;

        const bx = this.boss.group.position.x;
        const bz = this.boss.group.position.z;

        const zDistCamToWall = 1.8 - (-2.5);
        const zDistCamToBoss = 1.8 - bz;

        const maxVisibleX = 1.8 * (zDistCamToBoss / zDistCamToWall);
        const bodyMargin = 1.2;
        const limitX = maxVisibleX + bodyMargin;

        return (bx >= -limitX && bx <= limitX);
    }

    /* ── Render ────────────────────────────────────────── */

    _render() {
        this.renderer.render(this.scene, this.camera);
    }

    /* ── Resize ───────────────────────────────────────── */

    _onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    /* ── Cleanup ──────────────────────────────────────── */

    dispose() {
        if (this._disposed) return;
        this._disposed = true;
        this._runId++;
        this.renderer.setAnimationLoop(null);
        window.removeEventListener('resize', this._resizeHandler);
        window.removeEventListener('pointerdown', this._unlockAudio);
        window.removeEventListener('keydown', this._unlockAudio);
        window.removeEventListener('blur', this._blurHandler);
        document.removeEventListener('visibilitychange', this._visibilityHandler);
        this.hud.dispose();
        this.menu.hide();
        AudioManager.dispose();
        this.tweens.clear();
        this.desk.dispose();
        this.atmosphere.dispose();
        InputManager.uninstall();
        EventBus.clear();
        this.officeScene.dispose();
        this.monitor.dispose();
        this.lighting.dispose();
        this.boss.dispose();
        this.renderer.dispose();
        this.renderer.domElement.remove();
    }
}
