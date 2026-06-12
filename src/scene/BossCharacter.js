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
        const suitMat = new THREE.MeshStandardMaterial({
            color: 0x2c3e50, // Dark grey/blue suit
            roughness: 0.8,
            metalness: 0.1,
        });
        const skinMat = new THREE.MeshStandardMaterial({
            color: 0xffcca8, // Skin tone
            roughness: 0.6,
        });
        const shirtMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.9,
        });
        const tieMat = new THREE.MeshStandardMaterial({
            color: 0xc0392b, // Red tie
            roughness: 0.7,
        });
        const shoeMat = new THREE.MeshStandardMaterial({
            color: 0x111111,
            roughness: 0.4,
            metalness: 0.2,
        });

        // Body – suit jacket
        const bodyGeo = new THREE.BoxGeometry(0.8, 1.4, 0.4);
        const body = new THREE.Mesh(bodyGeo, suitMat);
        body.position.y = 1.9;
        this.group.add(body);

        // Shirt
        const shirtGeo = new THREE.BoxGeometry(0.3, 1.35, 0.45);
        const shirt = new THREE.Mesh(shirtGeo, shirtMat);
        shirt.position.y = 1.9;
        this.group.add(shirt);

        // Tie
        const tieGeo = new THREE.BoxGeometry(0.1, 0.8, 0.5);
        const tie = new THREE.Mesh(tieGeo, tieMat);
        tie.position.y = 2.0;
        this.group.add(tie);

        // Head
        const headGeo = new THREE.BoxGeometry(0.4, 0.5, 0.4);
        const head = new THREE.Mesh(headGeo, skinMat);
        head.position.y = 2.85;
        this.group.add(head);

        // Hair (simple box on top of head)
        const hairMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.9 });
        const hairGeo = new THREE.BoxGeometry(0.45, 0.15, 0.45);
        const hair = new THREE.Mesh(hairGeo, hairMat);
        hair.position.y = 3.15;
        this.group.add(hair);

        // Arms
        const armGeo = new THREE.BoxGeometry(0.25, 1.2, 0.25);
        const leftArm = new THREE.Mesh(armGeo, suitMat);
        leftArm.position.set(-0.55, 1.9, 0);
        this.group.add(leftArm);
        this._leftArm = leftArm;

        const rightArm = new THREE.Mesh(armGeo, suitMat);
        rightArm.position.set(0.55, 1.9, 0);
        this.group.add(rightArm);
        this._rightArm = rightArm;

        // Hands
        const handGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
        const leftHand = new THREE.Mesh(handGeo, skinMat);
        leftHand.position.set(0, -0.7, 0);
        this._leftArm.add(leftHand);

        const rightHand = new THREE.Mesh(handGeo, skinMat);
        rightHand.position.set(0, -0.7, 0);
        this._rightArm.add(rightHand);

        // Legs (Trousers)
        const legGeo = new THREE.BoxGeometry(0.3, 1.2, 0.3);
        const leftLeg = new THREE.Mesh(legGeo, suitMat);
        leftLeg.position.set(-0.2, 0.6, 0);
        this.group.add(leftLeg);
        this._leftLeg = leftLeg;

        const rightLeg = new THREE.Mesh(legGeo, suitMat);
        rightLeg.position.set(0.2, 0.6, 0);
        this.group.add(rightLeg);
        this._rightLeg = rightLeg;

        // Shoes
        const shoeGeo = new THREE.BoxGeometry(0.3, 0.15, 0.4);
        const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
        leftShoe.position.set(0, -0.6, 0.05);
        this._leftLeg.add(leftShoe);

        const rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
        rightShoe.position.set(0, -0.6, 0.05);
        this._rightLeg.add(rightShoe);
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
