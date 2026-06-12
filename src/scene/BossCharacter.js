/**
 * BossCharacter.js – Tall, intimidating boss character with a strong visual presence.
 *
 * Key fixes over the original:
 *  - Shirt is a proper recessed front panel on the torso, not a floating plane
 *  - Tie is a 3D tapered box, not a floating plane
 *  - Face has eyes (spheres), brows, a nose, and a stern mouth
 *  - Shoulders are wide and squared-off (power pose)
 *  - Lapels are angled 3D wedges on the jacket front
 *  - Overall proportions are taller and more imposing
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
        this._posZ   = -4.5;
        this._posY   = 0;

        this.group.position.set(this._startX, this._posY, this._posZ);
    }

    _build() {
        /* ── Materials ─────────────────────────────────────────── */
        const suitMat   = new THREE.MeshStandardMaterial({ color: 0x1a1f2e, roughness: 0.75, metalness: 0.05 });
        const suitLight = new THREE.MeshStandardMaterial({ color: 0x252b3d, roughness: 0.75 }); // lighter suit for lapels
        const skinMat   = new THREE.MeshStandardMaterial({ color: 0xf4c48a, roughness: 0.55 });
        const shirtMat  = new THREE.MeshStandardMaterial({ color: 0xf0ece4, roughness: 0.9  });
        const tieMat    = new THREE.MeshStandardMaterial({ color: 0x8b1a1a, roughness: 0.6  }); // deep burgundy
        const shoeMat   = new THREE.MeshStandardMaterial({ color: 0x0d0d0d, roughness: 0.3, metalness: 0.1 });
        const hairMat   = new THREE.MeshStandardMaterial({ color: 0x1a1008, roughness: 0.95 });
        const eyeMat    = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.2, metalness: 0.1 });
        const scleraMat = new THREE.MeshStandardMaterial({ color: 0xf8f8f8, roughness: 0.8  });
        const browMat   = new THREE.MeshStandardMaterial({ color: 0x120c04, roughness: 0.9  });
        const briefMat  = new THREE.MeshStandardMaterial({ color: 0x2c1a08, roughness: 0.6, metalness: 0.05 });
        const classMat  = new THREE.MeshStandardMaterial({ color: 0xc8a840, roughness: 0.3, metalness: 0.8 }); // gold clasp

        /* ── Model group – Y=0 is ground level ─────────────────── */
        this.modelGroup = new THREE.Group();
        this.group.add(this.modelGroup);

        /* ── LEGS ───────────────────────────────────────────────── */
        // Hips at Y=1.15, legs extend down to Y=0
        this._leftLeg  = new THREE.Group();
        this._rightLeg = new THREE.Group();
        this._leftLeg.position.set(-0.19, 1.15, 0);
        this._rightLeg.position.set( 0.19, 1.15, 0);
        this.modelGroup.add(this._leftLeg, this._rightLeg);

        const legGeo = new THREE.CylinderGeometry(0.135, 0.115, 1.15, 12);
        [this._leftLeg, this._rightLeg].forEach(leg => {
            const mesh = new THREE.Mesh(legGeo, suitMat);
            mesh.position.y = -0.575;
            leg.add(mesh);
        });

        /* Shoes – elongated box with a slight toe cap */
        const shoeBody = new THREE.BoxGeometry(0.23, 0.12, 0.42);
        const shoeToe  = new THREE.BoxGeometry(0.21, 0.09, 0.12);
        [this._leftLeg, this._rightLeg].forEach(leg => {
            const shoe = new THREE.Mesh(shoeBody, shoeMat);
            shoe.position.set(0, -1.21, 0.06);
            leg.add(shoe);
            const toe = new THREE.Mesh(shoeToe, shoeMat);
            toe.position.set(0, -1.18, 0.26);
            leg.add(toe);
        });

        /* ── TORSO ──────────────────────────────────────────────── */
        // Torso: Y=1.15 (hips) → Y=2.35 (shoulders). Height=1.20
        // Use a box torso so it reads as a proper suit jacket — not a cylinder.
        const torsoGeo = new THREE.BoxGeometry(0.82, 1.20, 0.40);
        const torso = new THREE.Mesh(torsoGeo, suitMat);
        torso.position.set(0, 1.75, 0);  // center at Y=1.75
        this.modelGroup.add(torso);

        /* Shirt front – recessed panel inset into the jacket */
        const shirtPanel = new THREE.BoxGeometry(0.20, 0.70, 0.06);
        const shirt = new THREE.Mesh(shirtPanel, shirtMat);
        shirt.position.set(0, 1.90, 0.21);   // sits proud of the torso face
        this.modelGroup.add(shirt);

        /* Tie – tapered 3D box, wider at top */
        // Built from two stacked boxes: knot block + body
        const knotGeo = new THREE.BoxGeometry(0.085, 0.07, 0.055);
        const tieKnot = new THREE.Mesh(knotGeo, tieMat);
        tieKnot.position.set(0, 2.18, 0.245);
        this.modelGroup.add(tieKnot);

        const tieBodyGeo = new THREE.BoxGeometry(0.065, 0.58, 0.048);
        const tieBody = new THREE.Mesh(tieBodyGeo, tieMat);
        tieBody.position.set(0, 1.87, 0.246);
        this.modelGroup.add(tieBody);

        /* Lapels – angled wedge-like boxes on either side of the shirt */
        const lapelGeo = new THREE.BoxGeometry(0.22, 0.52, 0.055);
        const lapelL = new THREE.Mesh(lapelGeo, suitLight);
        lapelL.position.set(-0.19, 1.97, 0.208);
        lapelL.rotation.z =  0.22;  // angled inward
        this.modelGroup.add(lapelL);

        const lapelR = new THREE.Mesh(lapelGeo, suitLight);
        lapelR.position.set( 0.19, 1.97, 0.208);
        lapelR.rotation.z = -0.22;
        this.modelGroup.add(lapelR);

        /* Jacket buttons – three small discs */
        const btnGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.02, 8);
        const btnMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.4 });
        [1.62, 1.50, 1.38].forEach(y => {
            const btn = new THREE.Mesh(btnGeo, btnMat);
            btn.rotation.x = Math.PI / 2;
            btn.position.set(0, y, 0.215);
            this.modelGroup.add(btn);
        });

        /* Collar – two small angular planes sitting on top of shirt */
        const collarGeo = new THREE.BoxGeometry(0.095, 0.06, 0.04);
        const collarL = new THREE.Mesh(collarGeo, shirtMat);
        collarL.position.set(-0.05, 2.23, 0.228);
        collarL.rotation.z = -0.35;
        this.modelGroup.add(collarL);
        const collarR = new THREE.Mesh(collarGeo, shirtMat);
        collarR.position.set( 0.05, 2.23, 0.228);
        collarR.rotation.z =  0.35;
        this.modelGroup.add(collarR);

        /* ── ARMS ───────────────────────────────────────────────── */
        // Shoulders at Y=2.3, wide and squared
        this._leftArm  = new THREE.Group();
        this._rightArm = new THREE.Group();
        this._leftArm.position.set(-0.51, 2.28, 0);
        this._rightArm.position.set( 0.51, 2.28, 0);
        this.modelGroup.add(this._leftArm, this._rightArm);

        // Shoulder caps – box to give a squared-off suit shoulder
        const shoulderCapGeo = new THREE.BoxGeometry(0.25, 0.15, 0.38);
        const capL = new THREE.Mesh(shoulderCapGeo, suitMat);
        capL.position.set(0, 0.02, 0);
        this._leftArm.add(capL);
        const capR = new THREE.Mesh(shoulderCapGeo, suitMat);
        capR.position.set(0, 0.02, 0);
        this._rightArm.add(capR);

        // Upper arm + forearm as cylinders
        const upperArmGeo = new THREE.CylinderGeometry(0.105, 0.095, 0.82, 10);
        const foreArmGeo  = new THREE.CylinderGeometry(0.092, 0.080, 0.56, 10);
        [this._leftArm, this._rightArm].forEach(arm => {
            const upper = new THREE.Mesh(upperArmGeo, suitMat);
            upper.position.y = -0.52;
            arm.add(upper);
            const fore = new THREE.Mesh(foreArmGeo, suitMat);
            fore.position.y = -1.12;
            arm.add(fore);
        });

        /* Hands */
        const handGeo = new THREE.SphereGeometry(0.092, 12, 10);
        handGeo.scale(1, 0.9, 0.8);
        [this._leftArm, this._rightArm].forEach(arm => {
            const hand = new THREE.Mesh(handGeo, skinMat);
            hand.position.y = -1.45;
            arm.add(hand);
        });

        /* Briefcase on right arm */
        const bcBodyGeo   = new THREE.BoxGeometry(0.30, 0.22, 0.10);
        const bcHandleGeo = new THREE.TorusGeometry(0.055, 0.012, 6, 12, Math.PI);
        const bc = new THREE.Mesh(bcBodyGeo, briefMat);
        bc.position.set(0, -1.66, 0.02);
        this._rightArm.add(bc);
        // Stitching lines (thin dark box edges)
        const bcStitchGeo = new THREE.BoxGeometry(0.26, 0.18, 0.005);
        const stitchMat   = new THREE.MeshStandardMaterial({ color: 0x1a0c04, roughness: 0.9 });
        const bcStitch    = new THREE.Mesh(bcStitchGeo, stitchMat);
        bcStitch.position.set(0, -1.66, 0.053);
        this._rightArm.add(bcStitch);
        // Handle
        const bcHandle = new THREE.Mesh(bcHandleGeo, briefMat);
        bcHandle.rotation.x = Math.PI;
        bcHandle.position.set(0, -1.54, 0.02);
        this._rightArm.add(bcHandle);
        // Gold clasp
        const clasp = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.025, 0.015), classMat);
        clasp.position.set(0, -1.655, 0.056);
        this._rightArm.add(clasp);

        /* ── NECK ───────────────────────────────────────────────── */
        const neckGeo = new THREE.CylinderGeometry(0.095, 0.105, 0.18, 10);
        const neck = new THREE.Mesh(neckGeo, skinMat);
        neck.position.set(0, 2.42, 0.0);
        this.modelGroup.add(neck);

        /* ── HEAD ───────────────────────────────────────────────── */
        // Slightly flattened on the sides – more angular, not perfectly round
        this.head = new THREE.Group();
        this.head.position.set(0, 2.72, 0);
        this.modelGroup.add(this.head);

        const headGeo = new THREE.SphereGeometry(0.28, 16, 14);
        headGeo.scale(0.92, 1.05, 0.90);
        const headMesh = new THREE.Mesh(headGeo, skinMat);
        this.head.add(headMesh);

        /* Hair – squared crew-cut look */
        const hairTopGeo  = new THREE.BoxGeometry(0.50, 0.08, 0.46);
        const hairSideGeo = new THREE.BoxGeometry(0.06, 0.26, 0.44);
        const hairBack    = new THREE.BoxGeometry(0.50, 0.30, 0.06);

        const hairTop = new THREE.Mesh(hairTopGeo, hairMat);
        hairTop.position.set(0, 0.27, -0.02);
        this.head.add(hairTop);

        const hairSideL = new THREE.Mesh(hairSideGeo, hairMat);
        hairSideL.position.set(-0.245, 0.14, -0.01);
        this.head.add(hairSideL);

        const hairSideR = new THREE.Mesh(hairSideGeo, hairMat);
        hairSideR.position.set( 0.245, 0.14, -0.01);
        this.head.add(hairSideR);

        const hairBackMesh = new THREE.Mesh(hairBack, hairMat);
        hairBackMesh.position.set(0, 0.12, -0.25);
        this.head.add(hairBackMesh);

        /* Eyes – whites + pupils */
        const eyeballGeo = new THREE.SphereGeometry(0.055, 10, 8);
        const pupilGeo   = new THREE.SphereGeometry(0.030, 8, 6);
        const eyeOffsets = [-0.095, 0.095];
        eyeOffsets.forEach(xOff => {
            const eyeball = new THREE.Mesh(eyeballGeo, scleraMat);
            eyeball.position.set(xOff, 0.04, 0.245);
            this.head.add(eyeball);
            const pupil = new THREE.Mesh(pupilGeo, eyeMat);
            pupil.position.set(xOff, 0.04, 0.268);
            this.head.add(pupil);
        });

        /* Eyebrows – thin dark boxes, angled inward for a stern look */
        const browGeo = new THREE.BoxGeometry(0.10, 0.018, 0.018);
        const browL = new THREE.Mesh(browGeo, browMat);
        browL.position.set(-0.095, 0.105, 0.248);
        browL.rotation.z =  0.28;  // inner end lower = stern
        this.head.add(browL);

        const browR = new THREE.Mesh(browGeo, browMat);
        browR.position.set( 0.095, 0.105, 0.248);
        browR.rotation.z = -0.28;
        this.head.add(browR);

        /* Nose – a small elongated sphere */
        const noseGeo = new THREE.SphereGeometry(0.032, 8, 6);
        noseGeo.scale(0.8, 1.3, 1.1);
        const nose = new THREE.Mesh(noseGeo, skinMat);
        nose.position.set(0, -0.018, 0.272);
        this.head.add(nose);

        /* Mouth – thin dark slit, slightly downturned */
        const mouthGeo = new THREE.BoxGeometry(0.085, 0.014, 0.012);
        const mouthMat = new THREE.MeshStandardMaterial({ color: 0x5c2a20, roughness: 0.9 });
        const mouth = new THREE.Mesh(mouthGeo, mouthMat);
        mouth.position.set(0, -0.092, 0.263);
        this.head.add(mouth);

        /* Chin shadow – slight darker sphere at chin */
        const chinGeo = new THREE.SphereGeometry(0.06, 8, 6);
        const chinMat = new THREE.MeshStandardMaterial({ color: 0xd4a870, roughness: 0.6 });
        const chin = new THREE.Mesh(chinGeo, chinMat);
        chin.scale.set(1.2, 0.5, 0.8);
        chin.position.set(0, -0.20, 0.18);
        this.head.add(chin);

        /* ── LIGHTING ───────────────────────────────────────────── */
        // Warm key light to illuminate the face from slightly above/front
        this.frontLight = new THREE.PointLight(0xfff4e0, 2.8, 5.5);
        this.frontLight.position.set(0, 0.5, 1.6);   // relative to head group
        this.head.add(this.frontLight);

        // Cool fill from below for menacing shadow cast upward
        this.fillLight = new THREE.PointLight(0xa0c0ff, 0.6, 4.0);
        this.fillLight.position.set(0, -1.2, 1.0);
        this.modelGroup.add(this.fillLight);
    }

    /* ── Public API ─────────────────────────────────────────────── */

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

        this.group.position.x = lerp(this._startX, this._endX, progress);
        this.group.position.z = this._posZ;

        // Arm and leg swing
        const swing = Math.sin(progress * Math.PI * 8) * 0.40;
        this._leftArm.rotation.x  =  swing;
        this._rightArm.rotation.x = -swing;
        this._leftLeg.rotation.x  = -swing * 0.85;
        this._rightLeg.rotation.x =  swing * 0.85;

        // Subtle body bob (stay grounded)
        this.modelGroup.position.y = Math.abs(Math.sin(progress * Math.PI * 8)) * 0.045;

        // Very slight head turn toward direction of travel (menacing)
        this.head.rotation.y = -0.08;
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
