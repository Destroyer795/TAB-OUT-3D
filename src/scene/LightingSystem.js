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
        // Ambient - balanced so shadows and contrast show beautifully
        this.ambient = new THREE.AmbientLight(0xf8fafc, 0.52);
        this.scene.add(this.ambient);
        this.lights.push(this.ambient);

        // Hemisphere light: soft cool light from ceiling, subtle warm bounce from floor
        this.hemi = new THREE.HemisphereLight(0xffffff, 0xd1d5db, 0.40);
        this.scene.add(this.hemi);
        this.lights.push(this.hemi);

        // Main shadow-casting key light
        this.keyLight = new THREE.DirectionalLight(0xfff7ed, 1.15);
        this.keyLight.position.set(4, 7.5, 2);
        this.keyLight.castShadow = true;
        this.keyLight.shadow.mapSize.width = 2048;
        this.keyLight.shadow.mapSize.height = 2048;
        this.keyLight.shadow.camera.near = 0.5;
        this.keyLight.shadow.camera.far = 30;
        this.keyLight.shadow.camera.left = -14;
        this.keyLight.shadow.camera.right = 14;
        this.keyLight.shadow.camera.top = 10;
        this.keyLight.shadow.camera.bottom = -12;
        this.keyLight.shadow.bias = -0.0004;
        this.keyLight.shadow.normalBias = 0.02;
        this.scene.add(this.keyLight);
        this.lights.push(this.keyLight);

        // Overhead aisle light
        this.overhead = new THREE.DirectionalLight(0xffffff, 0.6);
        this.overhead.position.set(0, 6, -4.5);
        this.overhead.castShadow = false;
        this.scene.add(this.overhead);
        this.lights.push(this.overhead);

        // Fill from left
        const fill = new THREE.PointLight(0xfff8f0, 0.5, 20);
        fill.position.set(-3, 4, 1);
        this.scene.add(fill);
        this.lights.push(fill);

        // Monitor glow (will be tinted during gameplay)
        this.monitorGlow = new THREE.PointLight(0x00ffaa, 0.35, 4);
        this.monitorGlow.position.set(0, 1.65, -0.5);
        this.scene.add(this.monitorGlow);
        this.lights.push(this.monitorGlow);

        // Hallway light over boss walk path
        this.hallwayLight = new THREE.PointLight(0xffffff, 0.8, 15);
        this.hallwayLight.position.set(0, 4, -4.0);
        this.scene.add(this.hallwayLight);
        this.lights.push(this.hallwayLight);
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
        this.ambient.intensity = 1.0;
        this.ambient.color.set(0xffffff);
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
                new THREE.Color(0xffffff),
                new THREE.Color(0xff3333),
                flash * 0.45
            );
            this.ambient.intensity = 1.0 + flash * 0.25;
        }
    }

    dispose() {
        for (const l of this.lights) {
            this.scene.remove(l);
            if (l.dispose) l.dispose();
        }
    }
}
