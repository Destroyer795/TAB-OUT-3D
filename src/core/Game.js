/**
 * Game.js – Master game controller.
 *
 * Orchestrates the game loop, state machine, 3D scene, gameplay systems,
 * audio, and UI. Single source of truth.
 */

import * as THREE from 'three';
import { StateMachine, GameState } from './StateMachine.js';
import EventBus  from './EventBus.js';
import InputManager from './InputManager.js';
import SaveManager  from './SaveManager.js';
import { TweenManager } from '../utils/AnimationUtils.js';
import { lerp, clamp } from '../utils/MathUtils.js';

import { OfficeScene }   from '../scene/OfficeScene.js';
import { Monitor }       from '../scene/Monitor.js';
import { LightingSystem } from '../scene/LightingSystem.js';
import { BossCharacter }  from '../scene/BossCharacter.js';

import { ArcadeGame }        from '../gameplay/ArcadeGame.js';
import { SpreadsheetMode }   from '../gameplay/SpreadsheetMode.js';
import { ProductivitySystem } from '../gameplay/ProductivitySystem.js';
import { BossSystem }        from '../gameplay/BossSystem.js';

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
        this.scene.background = new THREE.Color(0xf1f5f9); // Extremely bright office daytime color
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

        /* ── Gameplay systems ─────────────────────────── */
        this.arcadeGame   = new ArcadeGame(this.monitor.getCanvas());
        this.spreadsheet  = new SpreadsheetMode(this.monitor.getCanvas());
        this.productivity = new ProductivitySystem();
        this.bossSystem   = new BossSystem();

        /* ── Current monitor mode ─────────────────────── */
        this._showingArcade = true;

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
                // Return to appropriate state
                if (this._showingArcade) {
                    this.fsm.transition(GameState.PLAYING);
                } else {
                    // Still hiding – go to HIDING
                    this.fsm.transition(GameState.HIDING);
                }
            }
        });

        EventBus.on('bossFootstep', () => {
            AudioManager.playFootstep();
        });

        EventBus.on('arcadeCollision', ({ score }) => {
            AudioManager.playArcadeCollision();
            if (this.fsm.isActive) {
                this.fsm.transition(GameState.GAMEOVER_CRASH);
            }
        });

        EventBus.on('arcadeScoreTick', () => {
            AudioManager.playScoreTick();
        });

        EventBus.on('arcadeLaneSwitch', () => {
            AudioManager.playLaneSwitchSound();
        });

        EventBus.on('arcadeCollect', () => {
            AudioManager.playCollect();
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
        // ── Leaving states ─────────────────────
        if (from === GameState.MENU) {
            this.menu.hide();
        }
        if (from === GameState.BOSS_WARNING) {
            this.lighting.stopWarning();
            this.hud.hideAlert();
        }

        // ── Entering states ────────────────────
        switch (to) {
            case GameState.MENU:
                this.menu.show();
                this.hud.hide();
                this.gameOver.hide();
                this.boss.hide();
                this._camTarget = { ...CAM_DEFAULT };
                break;

            case GameState.PLAYING:
                this.hud.show();
                this.gameOver.hide();
                this.boss.hide();
                this.lighting.stopWarning();
                this.hud.hideAlert();
                this._showArcade();
                break;

            case GameState.HIDING:
                this._showSpreadsheet();
                break;

            case GameState.BOSS_WARNING:
                AudioManager.playBossWarning();
                this.lighting.startWarning();
                this.hud.showAlert();
                break;

            case GameState.BOSS_PRESENT:
                this.lighting.stopWarning();
                this.hud.hideAlert();
                this.boss.show();
                // Detection check happens in update
                break;

            case GameState.GAMEOVER_FIRED:
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

        // Reset systems
        this.arcadeGame.reset();
        this.spreadsheet.reset();
        this.productivity.reset();
        this.bossSystem.reset();
        this.tweens.clear();

        this._showingArcade = true;
        this._camTarget = { ...CAM_DEFAULT };

        this.hud.setScore(0);
        this.hud.setBest(SaveManager.highScore);
        this.hud.setProductivity(100);
        this.hud.setMode('arcade');
        this.hud.hideAlert();

        this.boss.hide();
        this.lighting.stopWarning();

        this.fsm.transition(GameState.PLAYING);
    }

    _goToMenu() {
        this.fsm.reset();
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
        this.boss.hide();
        this.lighting.stopWarning();

        const score = this.arcadeGame.score;
        const isNew = await SaveManager.submitScore(score);
        const best  = SaveManager.highScore;

        this.gameOver.show(type, score, best, isNew);
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
        const dt = Math.min(this._clock.getDelta(), 0.05); // cap at 50 ms

        this._handleInput(dt);
        this._update(dt);
        this._render();

        InputManager.endFrame();
    }

    /* ── Input ────────────────────────────────────────── */

    _handleInput(dt) {
        const state = this.fsm.current;

        if (state === GameState.MENU) return;

        if (this.fsm.isGameOver) return;

        // ESC → menu
        if (InputManager.wasPressed('Escape')) {
            this._goToMenu();
            return;
        }

        // SPACE → hide/show
        if (InputManager.isDown('Space')) {
            if (state === GameState.PLAYING || state === GameState.BOSS_WARNING) {
                // Can hide during warning too
                if (state === GameState.BOSS_WARNING) {
                    // Stay in BOSS_WARNING but show spreadsheet
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
                // Was hiding during boss warning, now released
                this._showArcade();
            }
        }

        // Arrow keys for arcade (only when arcade is active)
        if (this._showingArcade && this.arcadeGame.alive) {
            if (InputManager.wasPressed('ArrowLeft'))  this.arcadeGame.moveLeft();
            if (InputManager.wasPressed('ArrowRight')) this.arcadeGame.moveRight();
        }
    }

    /* ── Update ───────────────────────────────────────── */

    _update(dt) {
        this.tweens.update(dt);

        const state = this.fsm.current;

        // Camera interpolation (always)
        this.camera.position.x = lerp(this.camera.position.x, this._camTarget.x, dt * 4);
        this.camera.position.y = lerp(this.camera.position.y, this._camTarget.y, dt * 4);
        this.camera.position.z = lerp(this.camera.position.z, this._camTarget.z, dt * 4);
        this._camLookY = lerp(this._camLookY, this._camTarget.lookY, dt * 4);
        this.camera.lookAt(0, this._camLookY, -1);

        // Lighting
        this.lighting.update(dt);

        // Office Scene Animation (typing, talking, looking around)
        this.officeScene.update(dt);

        if (!this.fsm.isActive) return;

        // ── Boss system ──────────────────────────
        this.bossSystem.update(dt);

        // Boss walk animation
        if (this.bossSystem.phase === 'present') {
            this.boss.updateWalk(this.bossSystem.bossProgress);

            // Terminate the presence phase immediately if the boss walks out of the player's POV
            if (!this.isBossVisible() && this.bossSystem.bossProgress > 0.5) {
                this.bossSystem.endPresence();
            }
        }

        // ── Detection: boss sees arcade game ─────
        if (this.fsm.current === GameState.BOSS_PRESENT && this._showingArcade && this.isBossVisible()) {
            this.fsm.transition(GameState.GAMEOVER_FIRED);
            return;
        }

        // ── Productivity drain & recovery ────────
        // Drains when hiding AND boss is NOT present
        const isDraining = !this._showingArcade && this.bossSystem.phase !== 'present';
        // Recovers when playing arcade game
        const isRecovering = this._showingArcade;
        this.productivity.update(dt, isDraining, isRecovering);
        this.hud.setProductivity(this.productivity.value);

        // ── Arcade game update ───────────────────
        if (this._showingArcade) {
            this.arcadeGame.update(dt);
            this.hud.setScore(this.arcadeGame.score);
        } else {
            this.spreadsheet.update(dt);
            // Typing sounds
            if (Math.random() < dt * 8) {
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

        // Compute the visible X range at the boss's current Z coordinate
        // based on line of sight from camera (0, 0, 1.8) past the cubicle opening at z = -2.5, x = +/- 1.8
        const zDistCamToWall = 1.8 - (-2.5); // 4.3
        const zDistCamToBoss = 1.8 - bz;

        const maxVisibleX = 1.8 * (zDistCamToBoss / zDistCamToWall);
        
        // Add a margin (e.g. 1.2 units) for the boss's wide physical body width
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
