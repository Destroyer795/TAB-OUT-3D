/**
 * LightingSystem.js – Office-style lighting for the 3D scene.
 */

import * as THREE from 'three';

export class LightingSystem {
    /**
     * @param {THREE.Scene} scene
     */
    constructor(scene) {
        this.scene = scene;
        this.lights = [];
        this._warningActive = false;
        this._warningTime = 0;

        this._build();
    }

    _build() {
        // Ambient - brighter office day ambient
        this.ambient = new THREE.AmbientLight(0xeef2f7, 0.85);
        this.scene.add(this.ambient);
        this.lights.push(this.ambient);

        // Main overhead fluorescent (cool white) - brightened
        this.overhead = new THREE.DirectionalLight(0xffffff, 1.15);
        this.overhead.position.set(0, 6, 0);
        this.overhead.castShadow = false;
        this.scene.add(this.overhead);
        this.lights.push(this.overhead);

        // Fill from left (warm-ish) - brightened
        const fill = new THREE.PointLight(0xfff8f0, 0.5, 15);
        fill.position.set(-3, 4, 1);
        this.scene.add(fill);
        this.lights.push(fill);

        // Monitor glow (will be tinted during gameplay)
        this.monitorGlow = new THREE.PointLight(0x00ffaa, 0.3, 4);
        this.monitorGlow.position.set(0, 1.8, -0.5);
        this.scene.add(this.monitorGlow);
        this.lights.push(this.monitorGlow);

        // Hallway light (over the hallway walk path) - brightened
        this.hallwayLight = new THREE.PointLight(0xffffff, 0.8, 12);
        this.hallwayLight.position.set(0, 4, -4.0);
        this.scene.add(this.hallwayLight);
        this.lights.push(this.hallwayLight);

        // Ceiling light fixtures (visual rectangles)
        this._createCeilingFixture(0, 5.9, 0);
        this._createCeilingFixture(-3, 5.9, -4);
        this._createCeilingFixture(3, 5.9, -4);
    }

    _createCeilingFixture(x, y, z) {
        const geo = new THREE.BoxGeometry(1.5, 0.08, 0.4);
        const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        this.scene.add(mesh);
    }

    /**
     * Set the monitor glow colour (arcade=green, spreadsheet=white).
     */
    setMonitorColor(hex) {
        this.monitorGlow.color.set(hex);
    }

    /** Start the boss-warning flash. */
    startWarning() {
        this._warningActive = true;
        this._warningTime = 0;
    }

    stopWarning() {
        this._warningActive = false;
        this.ambient.intensity = 0.85;
        this.ambient.color.set(0xeef2f7);
    }

    /**
     * @param {number} dt
     */
    update(dt) {
        if (this._warningActive) {
            this._warningTime += dt;
            // Flash between normal and red tint
            const flash = Math.sin(this._warningTime * 14) * 0.5 + 0.5;
            this.ambient.color.lerpColors(
                new THREE.Color(0xeef2f7),
                new THREE.Color(0xff3333),
                flash * 0.45
            );
            this.ambient.intensity = 0.85 + flash * 0.25;
        }
    }

    dispose() {
        for (const l of this.lights) {
            this.scene.remove(l);
            if (l.dispose) l.dispose();
        }
    }
}
