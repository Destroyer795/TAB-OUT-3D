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
const CAM_HIDING   = { x: 0, y: 1.4, z: 1.4, lookY: 1.05 };

export class Game {
    constructor() {
        /* ── Three.js core ────────────────────────────── */
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.1;
        document.getElementById('canvas-container').appendChild(this.renderer.domElement);

        this.scene  = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf1f5f9);
        this.scene.fog = new THREE.Fog(0xf1f5f9, 15, 38);

        this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 300);
        this.camera.position.set(CAM_DEFAULT.x, CAM_DEFAULT.y, CAM_DEFAULT.z);
        this._camTarget = { ...CAM_DEFAULT };
        this._camLookY  = CAM_DEFAULT.lookY;

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

        /* ── Gameplay systems ─────────────────────────── */
        this.arcadeGame   = new ArcadeGame(this.monitor.getCanvas());
        this.spreadsheet  = new SpreadsheetMode(this.monitor.getCanvas());
        this.productivity = new ProductivitySystem();
        this.bossSystem   = new BossSystem();
        this.progression  = new ProgressionSystem();

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

        /* ── Clock ────────────────────────────────────── */
        this._clock = new THREE.Clock();
        this._prevTime = 0;

        /* ── Events ───────────────────────────────────── */
        this._bindEvents();

        /* ── Resize ───────────────────────────────────── */
        window.addEventListener('resize', () => this._onResize());

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
                this.fsm.transition(GameState.BOSS_WARNING);
            }
        });

        EventBus.on('bossPresent', () => {
            if (this.fsm.current === GameState.BOSS_WARNING ||
                this.fsm.current === GameState.HIDING) {
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

        EventBus.on('spreadsheetWorkDone', ({ boost }) => {
            this.productivity.value = Math.min(100, this.productivity.value + boost);
            this.hud.setProductivity(this.productivity.value);
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

        this._showingArcade = true;
        this.suspicion      = 0;
        this.coffeeCooldown = 0;
        this.isPaused       = false;
        this._camTarget     = { ...CAM_DEFAULT };

        this.hud.setScore(0);
        this.hud.setBest(SaveManager.highScore);
        this.hud.setProductivity(100);
        this.hud.setRank(this.progression.currentRank.title, this.progression.currentRank.icon);
        this.hud.setMode('arcade');
        this.hud.setCoffeeCooldown(0);
        this.hud.setSuspicion(0);
        this.hud.hideAlert();

        this.boss.hide();
        this.lighting.stopWarning();
        this.monitor.setLedState('normal');

        this.fsm.transition(GameState.PLAYING);
    }

    _goToMenu() {
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
        if (this.coffeeCooldown > 0) return;
        this.coffeeCooldown = 22.0;
        this.productivity.value = Math.min(100, this.productivity.value + 35);
        this.hud.setProductivity(this.productivity.value);
        AudioManager.playCoffeeGulp();
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
        AudioManager.playGameOver();
        this.hud.hide();
        if (type !== 'fired') {
            this.boss.hide();
        }
        this.lighting.stopWarning();
        this.monitor.setLedState('normal');

        const score = this.arcadeGame.score;
        const isNew = await SaveManager.submitScore(score);
        const best  = SaveManager.highScore;
        const rank  = this.progression.currentRank;

        this.gameOver.show(type, score, best, isNew, rank.title, rank.icon);
    }

    /* ══════════════════════════════════════════════════════
       Monitor switching
       ══════════════════════════════════════════════════════ */

    _showArcade() {
        this._showingArcade = true;
        this.hud.setMode('arcade');
        this.lighting.setMonitorColor(0x00ffaa);
        AudioManager.playShowSwitch();
        this._camTarget = { ...CAM_DEFAULT };
    }

    _showSpreadsheet() {
        // Check for Close Call bonus if player dodged boss with high suspicion
        if (this.suspicion >= 55) {
            this.arcadeGame.score += 250;
            AudioManager.playCloseCall();
            EventBus.emit('closeCall');
        }

        this._showingArcade = false;
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
            this._update(dt);
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

        // SPACE → Hide / Show monitor
        if (InputManager.isDown('Space')) {
            if (state === GameState.PLAYING || state === GameState.BOSS_WARNING) {
                if (state === GameState.BOSS_WARNING) {
                    this._showSpreadsheet();
                } else {
                    this.fsm.transition(GameState.HIDING);
                }
            }
        } else {
            // Space released
            if (state === GameState.HIDING) {
                this.fsm.transition(GameState.PLAYING);
            } else if (!this._showingArcade && this.fsm.isActive) {
                this._showArcade();
            }
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
            const typingKeys = ['KeyA', 'KeyB', 'KeyC', 'KeyD', 'KeyE', 'KeyF', 'KeyG', 'KeyH', 'KeyI',
                                'KeyJ', 'KeyK', 'KeyL', 'KeyM', 'KeyN', 'KeyO', 'KeyP', 'KeyQ', 'KeyR',
                                'KeyS', 'KeyT', 'KeyU', 'KeyV', 'KeyW', 'KeyX', 'KeyY', 'KeyZ',
                                'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Enter'];
            for (const code of typingKeys) {
                if (InputManager.wasPressed(code)) {
                    this.spreadsheet.crunchNumber();
                    break;
                }
            }
        }
    }

    /* ── Update ───────────────────────────────────────── */

    _update(dt) {
        this.tweens.update(dt);

        // Camera interpolation
        this.camera.position.x = lerp(this.camera.position.x, this._camTarget.x, dt * 4);
        this.camera.position.y = lerp(this.camera.position.y, this._camTarget.y, dt * 4);
        this.camera.position.z = lerp(this.camera.position.z, this._camTarget.z, dt * 4);
        this._camLookY = lerp(this._camLookY, this._camTarget.lookY, dt * 4);
        this.camera.lookAt(0, this._camLookY, -1);

        // Lighting & Monitor LED
        this.lighting.update(dt);
        this.monitor.update(dt);

        // Office Scene Animation
        this.officeScene.update(dt);
        this.boss.update(dt);

        if (!this.fsm.isActive) return;

        // Coffee Cooldown
        if (this.coffeeCooldown > 0) {
            this.coffeeCooldown = Math.max(0, this.coffeeCooldown - dt);
        }
        this.hud.setCoffeeCooldown(this.coffeeCooldown);

        // ── Boss system ──────────────────────────
        this.bossSystem.update(dt);

        if (this.bossSystem.phase === 'present') {
            this.boss.updateWalk(this.bossSystem.bossProgress, dt, this.fsm.current, this.suspicion);

            if (!this.isBossVisible() && this.bossSystem.bossProgress > 0.5) {
                this.bossSystem.endPresence();
            }
        }

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

        // ── Arcade game update ───────────────────
        if (this._showingArcade) {
            this.arcadeGame.update(dt);
            this.hud.setScore(this.arcadeGame.score);
            this.progression.checkScore(this.arcadeGame.score);
            AudioManager.setMusicSpeed(this.arcadeGame.speed / 270);
        } else {
            this.spreadsheet.update(dt);
            if (Math.random() < dt * 6) {
                AudioManager.playTyping();
            }
        }

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
        this.renderer.setAnimationLoop(null);
        InputManager.uninstall();
        EventBus.clear();
        this.officeScene.dispose();
        this.monitor.dispose();
        this.lighting.dispose();
        this.boss.dispose();
        this.renderer.dispose();
    }
}
