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
        const suitMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.8 });
        const skinMat = new THREE.MeshStandardMaterial({ color: 0xffcca8, roughness: 0.6 });
        const shirtMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
        const tieMat = new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.7 });
        const shoeMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4 });

        // Base group to control full model positioning
        this.modelGroup = new THREE.Group();
        this.group.add(this.modelGroup);
        // Base foot level is Y=0
        this.modelGroup.position.y = 0;

        // Torso (Suit Jacket)
        const torsoGeo = new THREE.CylinderGeometry(0.25, 0.2, 0.7, 16);
        const torso = new THREE.Mesh(torsoGeo, suitMat);
        torso.scale.z = 0.6; // Flatten cylinder front-to-back
        torso.position.y = 1.15; // Center of torso
        this.modelGroup.add(torso);

        // Shirt (plane on front of torso)
        const shirtGeo = new THREE.PlaneGeometry(0.16, 0.5);
        const shirt = new THREE.Mesh(shirtGeo, shirtMat);
        shirt.position.set(0, 1.25, 0.13);
        this.modelGroup.add(shirt);

        // Tie
        const tieGeo = new THREE.PlaneGeometry(0.04, 0.4);
        const tie = new THREE.Mesh(tieGeo, tieMat);
        tie.position.set(0, 1.2, 0.14);
        this.modelGroup.add(tie);

        // Collar Details
        const collarGeo = new THREE.PlaneGeometry(0.08, 0.05);
        const collarL = new THREE.Mesh(collarGeo, shirtMat);
        collarL.position.set(-0.04, 1.46, 0.14);
        collarL.rotation.z = -0.3;
        this.modelGroup.add(collarL);

        const collarR = new THREE.Mesh(collarGeo, shirtMat);
        collarR.position.set(0.04, 1.46, 0.14);
        collarR.rotation.z = 0.3;
        this.modelGroup.add(collarR);

        // Head
        const headGeo = new THREE.SphereGeometry(0.18, 16, 16);
        const head = new THREE.Mesh(headGeo, skinMat);
        head.position.y = 1.62;
        this.modelGroup.add(head);

        // Hair (half-sphere on top)
        const hairMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.9 });
        const hairGeo = new THREE.SphereGeometry(0.19, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        const hair = new THREE.Mesh(hairGeo, hairMat);
        hair.position.y = 1.62;
        this.modelGroup.add(hair);

        // Glasses Frame
        const glassesMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
        const glassesGeo = new THREE.BoxGeometry(0.24, 0.04, 0.02);
        const glasses = new THREE.Mesh(glassesGeo, glassesMat);
        glasses.position.set(0, 1.65, 0.17);
        this.modelGroup.add(glasses);

        // Glasses Lenses
        const lensMat = new THREE.MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.6 });
        const lensGeo = new THREE.PlaneGeometry(0.08, 0.05);
        const lensL = new THREE.Mesh(lensGeo, lensMat);
        lensL.position.set(-0.05, 1.65, 0.185);
        this.modelGroup.add(lensL);

        const lensR = new THREE.Mesh(lensGeo, lensMat);
        lensR.position.set(0.05, 1.65, 0.185);
        this.modelGroup.add(lensR);

        // Shoulders (spheres for joints)
        const shoulderGeo = new THREE.SphereGeometry(0.1, 16, 16);
        const leftShoulder = new THREE.Mesh(shoulderGeo, suitMat);
        leftShoulder.position.set(-0.3, 1.4, 0);
        this.modelGroup.add(leftShoulder);
        
        const rightShoulder = new THREE.Mesh(shoulderGeo, suitMat);
        rightShoulder.position.set(0.3, 1.4, 0);
        this.modelGroup.add(rightShoulder);

        // Arm Pivots (located at the shoulders)
        this._leftArm = new THREE.Group();
        this._leftArm.position.set(-0.3, 1.4, 0);
        this.modelGroup.add(this._leftArm);

        this._rightArm = new THREE.Group();
        this._rightArm.position.set(0.3, 1.4, 0);
        this.modelGroup.add(this._rightArm);

        // Arm Meshes
        const armGeo = new THREE.CylinderGeometry(0.07, 0.06, 0.6, 16);
        const armMeshL = new THREE.Mesh(armGeo, suitMat);
        armMeshL.position.y = -0.3; // Shift down half length
        this._leftArm.add(armMeshL);
        const armMeshR = new THREE.Mesh(armGeo, suitMat);
        armMeshR.position.y = -0.3;
        this._rightArm.add(armMeshR);

        // Hands
        const handGeo = new THREE.SphereGeometry(0.07, 16, 16);
        const handL = new THREE.Mesh(handGeo, skinMat);
        handL.position.y = -0.65;
        this._leftArm.add(handL);
        const handR = new THREE.Mesh(handGeo, skinMat);
        handR.position.y = -0.65;
        this._rightArm.add(handR);

        // Briefcase (attached to right arm)
        const briefcaseMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.7 });
        const briefcaseGeo = new THREE.BoxGeometry(0.1, 0.24, 0.32);
        const briefcase = new THREE.Mesh(briefcaseGeo, briefcaseMat);
        briefcase.position.set(0.05, -0.85, 0.05);
        this._rightArm.add(briefcase);

        const handleGeo = new THREE.BoxGeometry(0.02, 0.06, 0.1);
        const briefcaseHandle = new THREE.Mesh(handleGeo, briefcaseMat);
        briefcaseHandle.position.set(0.05, -0.71, 0.05);
        this._rightArm.add(briefcaseHandle);

        // Leg Pivots (located at the hips)
        this._leftLeg = new THREE.Group();
        this._leftLeg.position.set(-0.12, 0.8, 0);
        this.modelGroup.add(this._leftLeg);

        this._rightLeg = new THREE.Group();
        this._rightLeg.position.set(0.12, 0.8, 0);
        this.modelGroup.add(this._rightLeg);

        // Leg Meshes
        const legGeo = new THREE.CylinderGeometry(0.09, 0.07, 0.7, 16);
        const legMeshL = new THREE.Mesh(legGeo, suitMat);
        legMeshL.position.y = -0.35;
        this._leftLeg.add(legMeshL);
        const legMeshR = new THREE.Mesh(legGeo, suitMat);
        legMeshR.position.y = -0.35;
        this._rightLeg.add(legMeshR);

        // Shoes
        const shoeGeo = new THREE.BoxGeometry(0.14, 0.1, 0.22);
        const shoeL = new THREE.Mesh(shoeGeo, shoeMat);
        shoeL.position.set(0, -0.75, 0.03);
        this._leftLeg.add(shoeL);
        const shoeR = new THREE.Mesh(shoeGeo, shoeMat);
        shoeR.position.set(0, -0.75, 0.03);
        this._rightLeg.add(shoeR);

        // Front Spotlight to illuminate the boss's front side
        this.frontLight = new THREE.PointLight(0xffffff, 1.8, 5);
        this.frontLight.position.set(0, 1.2, 1.2);
        this.modelGroup.add(this.frontLight);
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

        // Walking animation – realistic arm/leg swing
        const swing = Math.sin(progress * Math.PI * 6) * 0.45;
        this._leftArm.rotation.x  =  swing;
        this._rightArm.rotation.x = -swing;
        this._leftLeg.rotation.x  = -swing;
        this._rightLeg.rotation.x =  swing;

        // Subtle body bobbing
        this.modelGroup.position.y = Math.abs(Math.sin(progress * Math.PI * 6)) * 0.05;
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
