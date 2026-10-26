/**
 * Monitor.js – The in-game computer monitor with CanvasTexture and Surveillance Webcam.
 *
 * Owns the off-screen <canvas> and updates the Three.js CanvasTexture.
 * Features:
 *  - High-res CanvasTexture.
 *  - Surveillance webcam with dynamic LED indicator that blinks red when boss is watching!
 */

import * as THREE from 'three';

const CANVAS_W = 1024;
const CANVAS_H = 576;

export class Monitor {
    /**
     * @param {THREE.Scene} scene
     */
    constructor(scene) {
        this.scene = scene;

        // Off-screen canvas
        this.canvas  = document.createElement('canvas');
        this.canvas.width  = CANVAS_W;
        this.canvas.height = CANVAS_H;
        this.canvasCtx = this.canvas.getContext('2d');

        // CanvasTexture
        this.texture = new THREE.CanvasTexture(this.canvas);
        this.texture.minFilter = THREE.LinearFilter;
        this.texture.magFilter = THREE.LinearFilter;

        // Monitor group
        this.group = new THREE.Group();
        this._ledBlinkTimer = 0;
        this._ledState = 'normal'; // 'normal' | 'warning' | 'alert'

        this._build();
        this.scene.add(this.group);
    }

    _build() {
        // ── Monitor screen ───────────────────────────
        const screenGeo = new THREE.PlaneGeometry(1.6, 0.9);
        this._screenMat = new THREE.MeshBasicMaterial({ map: this.texture });
        this._screen = new THREE.Mesh(screenGeo, this._screenMat);
        this._screen.position.set(0, 1.6, -1.05);
        this._screen.rotation.x = -0.05;   // slight tilt
        this.group.add(this._screen);

        // ── Monitor bezel ────────────────────────────
        const bezelMat = new THREE.MeshStandardMaterial({
            color: 0x222228,
            roughness: 0.6,
            metalness: 0.3,
        });

        // Back
        const backGeo = new THREE.BoxGeometry(1.7, 1.0, 0.08);
        const back = new THREE.Mesh(backGeo, bezelMat);
        back.position.set(0, 1.6, -1.1);
        back.rotation.x = -0.05;
        this.group.add(back);

        // Bezel frame (thin border)
        const frameMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a20,
            roughness: 0.5,
            metalness: 0.4,
        });
        const topBezel = new THREE.BoxGeometry(1.72, 0.04, 0.09);
        const tb = new THREE.Mesh(topBezel, frameMat);
        tb.position.set(0, 2.12, -1.08);
        this.group.add(tb);

        const botBezel = new THREE.BoxGeometry(1.72, 0.06, 0.09);
        const bb = new THREE.Mesh(botBezel, frameMat);
        bb.position.set(0, 1.08, -1.08);
        this.group.add(bb);

        // Stand neck
        const neckGeo = new THREE.BoxGeometry(0.08, 0.25, 0.08);
        const neck = new THREE.Mesh(neckGeo, bezelMat);
        neck.position.set(0, 0.975, -1.1);
        this.group.add(neck);

        // Stand base
        const baseGeo = new THREE.CylinderGeometry(0.25, 0.3, 0.04, 16);
        const base = new THREE.Mesh(baseGeo, bezelMat);
        base.position.set(0, 0.84, -1.1);
        this.group.add(base);

        // ── Surveillance Webcam on Top Bezel ─────────
        const camBodyGeo = new THREE.BoxGeometry(0.12, 0.038, 0.06);
        const camBodyMat = new THREE.MeshStandardMaterial({ color: 0x111115, roughness: 0.4, metalness: 0.6 });
        const camMesh = new THREE.Mesh(camBodyGeo, camBodyMat);
        camMesh.position.set(0, 2.155, -1.07);
        this.group.add(camMesh);

        // Webcam Glass Lens
        const lensGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.02, 12);
        const lensMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.1, metalness: 0.9 });
        const lensMesh = new THREE.Mesh(lensGeo, lensMat);
        lensMesh.rotation.x = Math.PI / 2;
        lensMesh.position.set(0, 2.155, -1.038);
        this.group.add(lensMesh);

        // Surveillance LED Indicator
        const ledGeo = new THREE.SphereGeometry(0.006, 8, 8);
        this._ledMat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
        this._ledMesh = new THREE.Mesh(ledGeo, this._ledMat);
        this._ledMesh.position.set(0.038, 2.155, -1.038);
        this.group.add(this._ledMesh);
    }

    /**
     * Set the status of the surveillance webcam LED.
     * @param {'normal' | 'warning' | 'alert'} state
     */
    setLedState(state) {
        this._ledState = state;
        if (state === 'normal') {
            this._ledMat.color.set(0x00ff88);
        } else if (state === 'warning') {
            this._ledMat.color.set(0xffab00);
        } else if (state === 'alert') {
            this._ledMat.color.set(0xff1744);
        }
    }

    update(dt) {
        // Fast pulse when alert or warning
        if (this._ledState === 'alert') {
            this._ledBlinkTimer += dt * 16;
            const on = Math.sin(this._ledBlinkTimer) > 0;
            this._ledMat.color.set(on ? 0xff1744 : 0x4a0000);
        } else if (this._ledState === 'warning') {
            this._ledBlinkTimer += dt * 8;
            const on = Math.sin(this._ledBlinkTimer) > 0;
            this._ledMat.color.set(on ? 0xffab00 : 0x5a3000);
        } else {
            this._ledMat.color.set(0x00ff88);
        }
    }

    /** Mark the texture as needing update. */
    needsUpdate() {
        this.texture.needsUpdate = true;
    }

    /** Get the shared canvas for game renderers. */
    getCanvas() {
        return this.canvas;
    }

    dispose() {
        this.texture.dispose();
        this._screenMat.dispose();
        this._ledMat.dispose();
        this.scene.remove(this.group);
        this.group.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        });
    }
}
