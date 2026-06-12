/**
 * BossCharacter.js – Tall, intimidating shadow silhouette that walks across the hallway.
 */

import * as THREE from 'three';
import { lerp } from '../utils/MathUtils.js';

export class BossCharacter {
    /**
     * @param {THREE.Scene} scene
     */
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.group.visible = false;

        this._build();

        this.scene.add(this.group);

        /* Walk path – from right to left across the hallway opening */
        this._startX =  5;
        this._endX   = -5;
        this._posZ   = -4.5;  // hallway Z position
        this._posY   = 0;

        this.group.position.set(this._startX, this._posY, this._posZ);
    }

    _build() {
        const mat = new THREE.MeshStandardMaterial({
            color: 0x111118,
            roughness: 0.9,
            metalness: 0.0,
        });

        // Body – tall rectangle
        const bodyGeo = new THREE.BoxGeometry(0.8, 2.6, 0.5);
        const body = new THREE.Mesh(bodyGeo, mat);
        body.position.y = 1.3;
        this.group.add(body);

        // Head
        const headGeo = new THREE.SphereGeometry(0.35, 8, 6);
        const head = new THREE.Mesh(headGeo, mat);
        head.position.y = 2.85;
        this.group.add(head);

        // Shoulders
        const shoulderGeo = new THREE.BoxGeometry(1.3, 0.3, 0.5);
        const shoulders = new THREE.Mesh(shoulderGeo, mat);
        shoulders.position.y = 2.45;
        this.group.add(shoulders);

        // Arms
        const armGeo = new THREE.BoxGeometry(0.22, 1.4, 0.25);
        const leftArm = new THREE.Mesh(armGeo, mat);
        leftArm.position.set(-0.65, 1.6, 0);
        this.group.add(leftArm);
        this._leftArm = leftArm;

        const rightArm = new THREE.Mesh(armGeo, mat.clone());
        rightArm.position.set(0.65, 1.6, 0);
        this.group.add(rightArm);
        this._rightArm = rightArm;

        // Legs
        const legGeo = new THREE.BoxGeometry(0.28, 1.2, 0.3);
        const leftLeg = new THREE.Mesh(legGeo, mat);
        leftLeg.position.set(-0.2, -0.6, 0);
        this.group.add(leftLeg);
        this._leftLeg = leftLeg;

        const rightLeg = new THREE.Mesh(legGeo, mat.clone());
        rightLeg.position.set(0.2, -0.6, 0);
        this.group.add(rightLeg);
        this._rightLeg = rightLeg;

        // Glowing eyes
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff2222 });
        const eyeGeo = new THREE.SphereGeometry(0.06, 6, 4);
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.12, 2.9, 0.3);
        this.group.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeo, eyeMat.clone());
        rightEye.position.set(0.12, 2.9, 0.3);
        this.group.add(rightEye);

        // Eye glow point light
        this._eyeLight = new THREE.PointLight(0xff2222, 0.4, 3);
        this._eyeLight.position.set(0, 2.9, 0.4);
        this.group.add(this._eyeLight);
    }

    /**
     * Show the boss and start walking.
     */
    show() {
        this.group.visible = true;
        this.group.position.x = this._startX;
    }

    hide() {
        this.group.visible = false;
    }

    /**
     * Update boss position along walk path.
     * @param {number} progress – 0 to 1
     */
    updateWalk(progress) {
        if (!this.group.visible) return;

        // Position
        this.group.position.x = lerp(this._startX, this._endX, progress);
        this.group.position.z = this._posZ;

        // Walking animation – arm/leg swing
        const swing = Math.sin(progress * Math.PI * 6) * 0.3;
        this._leftArm.rotation.x  =  swing;
        this._rightArm.rotation.x = -swing;
        this._leftLeg.rotation.x  = -swing;
        this._rightLeg.rotation.x =  swing;

        // Subtle body bob
        this.group.position.y = Math.abs(Math.sin(progress * Math.PI * 6)) * 0.06;

        // Eye flicker
        this._eyeLight.intensity = 0.3 + Math.random() * 0.3;
    }

    dispose() {
        this.scene.remove(this.group);
        this.group.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });
    }
}
