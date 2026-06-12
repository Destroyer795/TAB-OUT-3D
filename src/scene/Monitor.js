/**
 * Monitor.js – The in-game computer monitor with CanvasTexture.
 *
 * Owns the off-screen <canvas> and updates the Three.js CanvasTexture.
 * The ArcadeGame and SpreadsheetMode render into the same canvas.
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

        this._build();
        this.scene.add(this.group);
    }

    _build() {
        // ── Monitor screen ───────────────────────────
        const screenGeo = new THREE.PlaneGeometry(1.6, 0.9);
        this._screenMat = new THREE.MeshBasicMaterial({ map: this.texture });
        this._screen = new THREE.Mesh(screenGeo, this._screenMat);
        this._screen.position.set(0, 1.75, -1.05);
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
        back.position.set(0, 1.75, -1.1);
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
        tb.position.set(0, 2.27, -1.08);
        this.group.add(tb);

        const botBezel = new THREE.BoxGeometry(1.72, 0.06, 0.09);
        const bb = new THREE.Mesh(botBezel, frameMat);
        bb.position.set(0, 1.23, -1.08);
        this.group.add(bb);

        // Stand neck
        const neckGeo = new THREE.BoxGeometry(0.08, 0.4, 0.08);
        const neck = new THREE.Mesh(neckGeo, bezelMat);
        neck.position.set(0, 1.05, -1.1);
        this.group.add(neck);

        // Stand base
        const baseGeo = new THREE.CylinderGeometry(0.25, 0.3, 0.04, 16);
        const base = new THREE.Mesh(baseGeo, bezelMat);
        base.position.set(0, 0.84, -1.1);
        this.group.add(base);
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
        this.scene.remove(this.group);
        this.group.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        });
    }
}
