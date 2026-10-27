/**
 * BossCharacter.js – Fully rigged procedural boss using HumanoidRig.
 *
 * Implements IK skeleton, auto-walking, suit with briefcase and gold watch,
 * and state-mapped animations:
 *  - PATROL: 'patrol' or 'carry'
 *  - APPROACHING: 'carry' + lookAt(playerCamera)
 *  - AT_DESK: 'interrogate' + setTalking(true)
 *  - SUSPICIOUS: 'interrogate' + setExpression('scowl')
 *  - BUSTED: 'point' + setTalking(true) + setExpression('scowl')
 *  - RETURNING: 'patrol'
 */

import * as THREE from 'three';
import { createBoss } from './HumanoidRig.js';
import { lerp } from '../utils/MathUtils.js';

export class BossCharacter {
    /**
     * @param {THREE.Scene} scene
     */
    constructor(scene) {
        this.scene = scene;

        // World scale: real desk = 0.74m, scene deskTopY = 0.85m
        const S = 0.85 / 0.74;
        this.human = createBoss({
            height: 1.88 * S,
            walkSpeedScale: 1,
        });

        // The root group is placed on the floor (Y = 0) and faces +Z
        this.group = this.human.root;
        this.group.visible = false;
        this.scene.add(this.group);

        this.officeScene = null;
        this.playerCamera = null;

        // Path coordinates & initial placement
        this._currentPathIndex = 0;
        this._startX = 8;
        this._endX = -8;
        this._posZ = -4.5;
        this._posY = 0;
        this.group.position.set(this._startX, this._posY, this._posZ);
        this._paths = [
            [[8, -4.5], [3, -4.5], [-3, -4.5], [-8, -4.5]],
            [[-8, -4.5], [-3, -4.5], [3, -4.5], [8, -4.5]],
            [[-7, -17], [-7, -7], [-6, -4.5], [0, -4.5], [8, -4.5]],
            [[7, -17], [7, -7], [6, -4.5], [0, -4.5], [-8, -4.5]],
            [[-8, -4.5], [-2, -4.5], [5, -4.5], [7, -7], [7, -17]],
        ].map(points => new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal'));
        this._pathPosition = new THREE.Vector3();
        this._pathTangent = new THREE.Vector3();
        this._pathState = { x: 0, y: 0, z: 0, bodyRotY: 0 };
        this._avoidance = new THREE.Vector2();

        // Cinematic lighting attached to boss root
        this.frontLight = new THREE.PointLight(0xffedd5, 1.8, 6.0);
        this.frontLight.position.set(0, 1.8, 1.2);
        this.group.add(this.frontLight);

        this.rimLight = new THREE.PointLight(0x38bdf8, 1.0, 5.0);
        this.rimLight.position.set(0, 2.0, -1.2);
        this.group.add(this.rimLight);

        this.fillLight = new THREE.PointLight(0x818cf8, 0.35, 4.0);
        this.fillLight.position.set(0, 0.5, 1.0);
        this.group.add(this.fillLight);
    }

    setOfficeScene(officeScene) {
        this.officeScene = officeScene;
    }

    setCamera(camera) {
        this.playerCamera = camera;
    }

    /* ── Path Coordinates ────────────────────────────────────────── */

    _getPathState(pathIndex, progress) {
        const curve = this._paths[pathIndex];
        curve.getPointAt(Math.max(0, Math.min(1, progress)), this._pathPosition);
        curve.getTangentAt(Math.max(0, Math.min(1, progress)), this._pathTangent);
        this._pathState.x = this._pathPosition.x;
        this._pathState.z = this._pathPosition.z;
        this._pathState.bodyRotY = Math.atan2(this._pathTangent.x, this._pathTangent.z);
        return this._pathState;
    }

    get pathLength() { return this._paths[this._currentPathIndex].getLength(); }

    show() {
        this.group.visible = true;
        this._currentPathIndex = Math.floor(Math.random() * 5);
        this.human.setSpeed(null);
        this.human._first = true;
        this._avoidance.set(0, 0);

        const state = this._getPathState(this._currentPathIndex, 0);
        this.group.position.set(state.x, 0, state.z);
        this.group.rotation.y = state.bodyRotY;

        this.human.setPose('carry', { snap: true });
        this.human.setExpression('neutral', { snap: true });
        this.human.setTalking(false);
        if (this.playerCamera) {
            this.human.lookAt(this.playerCamera);
        }
    }

    hide() {
        this.group.visible = false;
        this.human.setSpeed(0);
        this.human.lookAt(null);
        this.human.setTalking(false);
    }

    setPose(name) {
        this.human.setPose(name);
    }

    setExpression(name) {
        this.human.setExpression(name);
    }

    setTalking(bool) {
        this.human.setTalking(bool);
    }

    lookAt(target) {
        this.human.lookAt(target);
    }

    /**
     * Called every frame to advance procedural IK, blinking, breathing, etc.
     */
    update(dt) {
        if (!this.group.visible) return;
        this.human.update(dt);
    }

    /**
     * Update boss position along walk path and map poses to BossSystem states.
     * @param {number} progress – 0 to 1
     * @param {number} dt – seconds
     * @param {string} [gameState]
     * @param {number} [suspicion]
     */
    updateWalk(progress, dt = 0.016, gameState = '', suspicion = 0) {
        if (!this.group.visible) return;

        const state = this._getPathState(this._currentPathIndex, progress);

        // Steering avoidance around any active coworkers
        let avoidX = 0;
        let avoidZ = 0;
        const avoidRadius = 1.2;

        if (this.officeScene && this.officeScene.employees) {
            for (const emp of this.officeScene.employees) {
                if (emp.state !== 'sitting') {
                    const ex = emp.group.position.x;
                    const ez = emp.group.position.z;
                    const d = Math.hypot(state.x - ex, state.z - ez);
                    if (d < avoidRadius && d > 0.01) {
                        const pushX = (state.x - ex) / d;
                        const pushZ = (state.z - ez) / d;
                        const weight = (avoidRadius - d) / avoidRadius;
                        avoidX += pushX * weight * 0.7;
                        avoidZ += pushZ * weight * 0.7;
                    }
                }
            }
        }

        // Move root (HumanoidRig auto-detects movement and animates walk stride/IK feet)
        this._avoidance.x += (avoidX - this._avoidance.x) * (1 - Math.exp(-4 * dt));
        this._avoidance.y += (avoidZ - this._avoidance.y) * (1 - Math.exp(-4 * dt));
        this.group.position.set(state.x + this._avoidance.x, 0, state.z + this._avoidance.y);

        // Smooth body rotation toward path heading
        let angleDiff = state.bodyRotY - this.group.rotation.y;
        angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
        this.group.rotation.y += angleDiff * (1 - Math.exp(-7.7 * dt));

        // Map game state to HumanoidRig poses
        if (gameState === 'GAMEOVER_FIRED' || suspicion >= 100) {
            // BUSTED state: point, scowl, and talk
            this.human.setPose('point');
            this.human.setExpression('scowl');
            this.human.setTalking(true);
            if (this.playerCamera) this.human.lookAt(this.playerCamera);
        } else if (suspicion > 30) {
            // SUSPICIOUS: stern interrogate pose and scowl
            this.human.setPose('interrogate');
            this.human.setExpression('scowl');
            this.human.setTalking(false);
            if (this.playerCamera) this.human.lookAt(this.playerCamera);
        } else if (progress >= 0.44 && progress <= 0.56) {
            // AT_DESK: interrogate pose, looking down at workstation / camera, talking
            this.human.setPose('interrogate');
            this.human.setTalking(true);
            this.human.setExpression('neutral');
            if (this.playerCamera) this.human.lookAt(this.playerCamera);
        } else if (progress < 0.44) {
            // APPROACHING: carry with briefcase, looking toward player
            this.human.setPose('carry');
            this.human.setTalking(false);
            this.human.setExpression('neutral');
            if (this.playerCamera) this.human.lookAt(this.playerCamera);
        } else {
            // RETURNING: patrol pose with hands behind back, looking forward
            this.human.setPose('patrol');
            this.human.setTalking(false);
            this.human.setExpression('neutral');
            this.human.lookAt(null);
        }
    }

    dispose() {
        this.frontLight.dispose();
        this.rimLight.dispose();
        this.fillLight.dispose();
        this.scene.remove(this.group);
        if (this.human) {
            this.human.dispose();
        }
    }
}
