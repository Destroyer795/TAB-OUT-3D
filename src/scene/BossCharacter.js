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
        // Angular head: NOT a sphere. Built from a box base + sphere blend
        // so cheekbones and jaw read as flat planes, not a ball.
        this.head = new THREE.Group();
        this.head.position.set(0, 2.72, 0);
        this.modelGroup.add(this.head);

        // Cranium – sphere strongly squashed on X and Z for a blocky skull
        const craniumGeo = new THREE.SphereGeometry(0.275, 20, 16);
        craniumGeo.scale(0.88, 1.0, 0.82);
        const cranium = new THREE.Mesh(craniumGeo, skinMat);
        cranium.position.y = 0.02;
        this.head.add(cranium);

        // Cheekbone blocks – two wide flat boxes that break the sphere silhouette
        const cheekGeo = new THREE.BoxGeometry(0.18, 0.10, 0.10);
        const cheekMat = new THREE.MeshStandardMaterial({ color: 0xeab880, roughness: 0.55 });
        [-1, 1].forEach(side => {
            const cheek = new THREE.Mesh(cheekGeo, cheekMat);
            cheek.position.set(side * 0.215, -0.04, 0.165);
            cheek.rotation.y = -side * 0.30;
            this.head.add(cheek);
        });

        // Jaw – a flattened box that gives a strong squared jaw line
        const jawGeo = new THREE.BoxGeometry(0.40, 0.10, 0.26);
        const jawMesh = new THREE.Mesh(jawGeo, skinMat);
        jawMesh.position.set(0, -0.195, 0.03);
        jawMesh.rotation.x = 0.12;  // tilt front down slightly
        this.head.add(jawMesh);

        // Chin point – small wedge forward from the jaw
        const chinGeo = new THREE.SphereGeometry(0.072, 10, 8);
        const chinMat = new THREE.MeshStandardMaterial({ color: 0xe8b278, roughness: 0.55 });
        const chin = new THREE.Mesh(chinGeo, chinMat);
        chin.scale.set(0.80, 0.55, 0.90);
        chin.position.set(0, -0.255, 0.195);
        this.head.add(chin);

        // Forehead – slightly protruding shelf above the brow line
        const foreheadGeo = new THREE.BoxGeometry(0.38, 0.08, 0.10);
        const foreheadMesh = new THREE.Mesh(foreheadGeo, skinMat);
        foreheadMesh.position.set(0, 0.155, 0.195);
        foreheadMesh.rotation.x = -0.15;
        this.head.add(foreheadMesh);

        /* ── HAIR ───────────────────────────────────────────────── */
        // Hard-parted slick-back: flat top slab + swept-back taper + side walls
        // Top slab – sits perfectly flat, covers the crown
        const hairTopGeo = new THREE.BoxGeometry(0.46, 0.055, 0.42);
        const hairTop = new THREE.Mesh(hairTopGeo, hairMat);
        hairTop.position.set(0, 0.285, -0.025);
        this.head.add(hairTop);

        // Front hairline ridge – a thin wedge that creates a distinct hairline
        const hairFrontGeo = new THREE.BoxGeometry(0.44, 0.072, 0.05);
        const hairFront = new THREE.Mesh(hairFrontGeo, hairMat);
        hairFront.position.set(0, 0.248, 0.185);
        hairFront.rotation.x = 0.35;  // angled forward over the forehead
        this.head.add(hairFront);

        // Side panels – close-cropped against the skull
        const hairSideGeo = new THREE.BoxGeometry(0.048, 0.22, 0.40);
        [-1, 1].forEach(side => {
            const hairSide = new THREE.Mesh(hairSideGeo, hairMat);
            hairSide.position.set(side * 0.238, 0.155, -0.015);
            this.head.add(hairSide);
        });

        // Back – covers the occipital slope cleanly
        const hairBackGeo = new THREE.BoxGeometry(0.44, 0.28, 0.052);
        const hairBack = new THREE.Mesh(hairBackGeo, hairMat);
        hairBack.position.set(0, 0.12, -0.248);
        this.head.add(hairBack);

        // Hard part line – a very thin bright strip on the left side
        const partMat = new THREE.MeshStandardMaterial({ color: 0xd4a06a, roughness: 0.6 });
        const partGeo = new THREE.BoxGeometry(0.010, 0.008, 0.30);
        const partLine = new THREE.Mesh(partGeo, partMat);
        partLine.position.set(-0.06, 0.292, 0.04);
        this.head.add(partLine);

        /* ── EYES ───────────────────────────────────────────────── */
        // Eye socket recess – slightly darker ellipse behind each eye
        const socketMat = new THREE.MeshStandardMaterial({ color: 0xc8935a, roughness: 0.7 });
        const socketGeo = new THREE.SphereGeometry(0.068, 10, 8);
        socketGeo.scale(1.1, 0.75, 0.4);

        // Upper eyelid shelf – a thin box that creates a lid crease above each eye
        const lidMat  = new THREE.MeshStandardMaterial({ color: 0xd8a06a, roughness: 0.6 });
        const lidGeo  = new THREE.BoxGeometry(0.115, 0.022, 0.028);

        // Lower lid – subtle ridge below the eye
        const llidGeo = new THREE.BoxGeometry(0.108, 0.014, 0.020);

        const eyeXPositions = [-0.098, 0.098];
        eyeXPositions.forEach(xOff => {
            // Socket shadow
            const socket = new THREE.Mesh(socketGeo, socketMat);
            socket.position.set(xOff, 0.042, 0.228);
            this.head.add(socket);

            // Eyeball (white sclera)
            const eyeballGeo = new THREE.SphereGeometry(0.052, 14, 10);
            const eyeball = new THREE.Mesh(eyeballGeo, scleraMat);
            eyeball.position.set(xOff, 0.042, 0.242);
            this.head.add(eyeball);

            // Iris – flat disc sitting on the eyeball surface
            const irisGeo = new THREE.CylinderGeometry(0.030, 0.030, 0.008, 14);
            const irisMat = new THREE.MeshStandardMaterial({ color: 0x2a1a08, roughness: 0.3, metalness: 0.05 });
            const iris = new THREE.Mesh(irisGeo, irisMat);
            iris.rotation.x = Math.PI / 2;
            iris.position.set(xOff, 0.042, 0.265);
            this.head.add(iris);

            // Pupil – smaller darker disc on iris
            const pupilGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.009, 12);
            const pupil = new THREE.Mesh(pupilGeo, eyeMat);
            pupil.rotation.x = Math.PI / 2;
            pupil.position.set(xOff, 0.042, 0.269);
            this.head.add(pupil);

            // Upper eyelid
            const lid = new THREE.Mesh(lidGeo, lidMat);
            lid.position.set(xOff, 0.076, 0.253);
            lid.rotation.x = -0.20;
            this.head.add(lid);

            // Lower eyelid
            const llid = new THREE.Mesh(llidGeo, lidMat);
            llid.position.set(xOff, 0.012, 0.254);
            llid.rotation.x = 0.15;
            this.head.add(llid);
        });

        /* ── EYEBROWS ───────────────────────────────────────────── */
        // Thick, heavy brows – two segments each (inner + outer) for a V-shape scowl
        const browThickMat = new THREE.MeshStandardMaterial({ color: 0x0e0804, roughness: 0.95 });

        // Left brow – inner segment drops sharply toward nose bridge
        const browInnerGeo = new THREE.BoxGeometry(0.055, 0.024, 0.026);
        const browInnerL = new THREE.Mesh(browInnerGeo, browThickMat);
        browInnerL.position.set(-0.068, 0.118, 0.252);
        browInnerL.rotation.z =  0.50;   // steep downward pitch inward
        this.head.add(browInnerL);

        const browInnerR = new THREE.Mesh(browInnerGeo, browThickMat);
        browInnerR.position.set( 0.068, 0.118, 0.252);
        browInnerR.rotation.z = -0.50;
        this.head.add(browInnerR);

        // Left brow – outer segment (flatter, horizontal)
        const browOuterGeo = new THREE.BoxGeometry(0.068, 0.020, 0.022);
        const browOuterL = new THREE.Mesh(browOuterGeo, browThickMat);
        browOuterL.position.set(-0.130, 0.102, 0.248);
        browOuterL.rotation.z =  0.10;
        this.head.add(browOuterL);

        const browOuterR = new THREE.Mesh(browOuterGeo, browThickMat);
        browOuterR.position.set( 0.130, 0.102, 0.248);
        browOuterR.rotation.z = -0.10;
        this.head.add(browOuterR);

        // Glabella – the knot between the brows (furrowed look)
        const glabellaGeo = new THREE.BoxGeometry(0.028, 0.032, 0.020);
        const glabella = new THREE.Mesh(glabellaGeo, browThickMat);
        glabella.position.set(0, 0.102, 0.255);
        this.head.add(glabella);

        /* ── NOSE ───────────────────────────────────────────────── */
        // Nose bridge – a narrow ridge from brow to tip
        const bridgeGeo = new THREE.BoxGeometry(0.038, 0.120, 0.035);
        const bridgeMat = new THREE.MeshStandardMaterial({ color: 0xe8aa72, roughness: 0.55 });
        const bridge = new THREE.Mesh(bridgeGeo, bridgeMat);
        bridge.position.set(0, 0.010, 0.265);
        bridge.rotation.x = 0.08;
        this.head.add(bridge);

        // Nose tip – slightly bulbous sphere
        const tipGeo = new THREE.SphereGeometry(0.036, 10, 8);
        tipGeo.scale(1.05, 0.78, 1.10);
        const tipMat = new THREE.MeshStandardMaterial({ color: 0xe0a268, roughness: 0.55 });
        const tip = new THREE.Mesh(tipGeo, tipMat);
        tip.position.set(0, -0.060, 0.278);
        this.head.add(tip);

        // Nostrils – two small dark ellipsoids flanking the tip
        const nostrilGeo = new THREE.SphereGeometry(0.018, 8, 6);
        nostrilGeo.scale(0.75, 0.55, 1.0);
        const nostrilMat = new THREE.MeshStandardMaterial({ color: 0x9a5c38, roughness: 0.8 });
        [-0.032, 0.032].forEach(xOff => {
            const nostril = new THREE.Mesh(nostrilGeo, nostrilMat);
            nostril.position.set(xOff, -0.074, 0.272);
            this.head.add(nostril);
        });

        /* ── MOUTH ──────────────────────────────────────────────── */
        const mouthMat = new THREE.MeshStandardMaterial({ color: 0x5a1e14, roughness: 0.9 });

        // Upper lip – thin wedge, slightly proud of face
        const upperLipGeo = new THREE.BoxGeometry(0.092, 0.020, 0.028);
        const upperLip = new THREE.Mesh(upperLipGeo, mouthMat);
        upperLip.position.set(0, -0.118, 0.258);
        upperLip.rotation.x = -0.10;
        this.head.add(upperLip);

        // Lower lip – slightly thicker and further out
        const lowerLipGeo = new THREE.BoxGeometry(0.082, 0.022, 0.030);
        const lowerLipMat = new THREE.MeshStandardMaterial({ color: 0xc06048, roughness: 0.7 });
        const lowerLip = new THREE.Mesh(lowerLipGeo, lowerLipMat);
        lowerLip.position.set(0, -0.144, 0.255);
        this.head.add(lowerLip);

        // Mouth corners – tiny dark spheres to define the mouth line ends
        const cornerGeo = new THREE.SphereGeometry(0.012, 6, 5);
        const cornerMat = new THREE.MeshStandardMaterial({ color: 0x4a1810, roughness: 0.9 });
        [-0.047, 0.047].forEach(xOff => {
            const corner = new THREE.Mesh(cornerGeo, cornerMat);
            corner.position.set(xOff, -0.128, 0.252);
            this.head.add(corner);
        });

        // Nasolabial fold line – subtle ridge from nose wing to mouth corner
        const foldGeo = new THREE.BoxGeometry(0.010, 0.052, 0.010);
        const foldMat = new THREE.MeshStandardMaterial({ color: 0xc8885a, roughness: 0.7 });
        [-0.072, 0.072].forEach(xOff => {
            const fold = new THREE.Mesh(foldGeo, foldMat);
            fold.position.set(xOff, -0.092, 0.252);
            fold.rotation.z = xOff < 0 ? 0.18 : -0.18;
            this.head.add(fold);
        });

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
