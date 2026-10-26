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
        this._startX = 5;
        this._endX = -5;
        this._posZ = -4.5;
        this._posY = 0;

        this.group.position.set(this._startX, this._posY, this._posZ);
        this.officeScene = null;
    }

    setOfficeScene(officeScene) {
        this.officeScene = officeScene;
    }

    _build() {
        /* ── Materials ─────────────────────────────────────────── */
        // Executive navy-charcoal worsted wool suit
        const suitMat = new THREE.MeshStandardMaterial({ 
            color: 0x181e2b, 
            roughness: 0.68, 
            metalness: 0.08 
        });
        // Satin silk lapels & pocket trim
        const lapelMat = new THREE.MeshStandardMaterial({ 
            color: 0x222a3a, 
            roughness: 0.35, 
            metalness: 0.12 
        });
        // Natural executive complexion
        const skinMat = new THREE.MeshStandardMaterial({ 
            color: 0xf5c99e, 
            roughness: 0.52, 
            metalness: 0.02 
        });
        const skinDarkMat = new THREE.MeshStandardMaterial({ 
            color: 0xdfab82, 
            roughness: 0.6 
        });
        // Crisp poplin white shirt
        const shirtMat = new THREE.MeshStandardMaterial({ 
            color: 0xf6f8fa, 
            roughness: 0.82 
        });
        // Burgundy silk woven necktie
        const tieMat = new THREE.MeshStandardMaterial({ 
            color: 0x861422, 
            roughness: 0.45, 
            metalness: 0.15 
        });
        // 14k brushed gold (tie clip, watch bezel, cufflink, briefcase brass)
        const goldMat = new THREE.MeshStandardMaterial({ 
            color: 0xd4af37, 
            roughness: 0.22, 
            metalness: 0.88 
        });
        // Hand-polished Italian leather shoes
        const shoeMat = new THREE.MeshStandardMaterial({ 
            color: 0x0c0e12, 
            roughness: 0.2, 
            metalness: 0.22 
        });
        const shoeSoleMat = new THREE.MeshStandardMaterial({ 
            color: 0x261b14, 
            roughness: 0.85 
        });
        // Salt-and-pepper / distinguished dark hair
        const hairMat = new THREE.MeshStandardMaterial({ 
            color: 0x1a1e24, 
            roughness: 0.88 
        });
        const silverHairMat = new THREE.MeshStandardMaterial({ 
            color: 0x8e9aa8, 
            roughness: 0.8 
        });
        // Realistic eyes
        const scleraMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2 });
        const irisMat = new THREE.MeshStandardMaterial({ color: 0x2e4057, roughness: 0.25, metalness: 0.1 });
        const pupilMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.1 });
        const browMat = new THREE.MeshStandardMaterial({ color: 0x181b22, roughness: 0.9 });
        const mouthMat = new THREE.MeshStandardMaterial({ color: 0xa84e44, roughness: 0.7 });
        // Full-grain saddle mahogany briefcase
        const briefMat = new THREE.MeshStandardMaterial({ color: 0x2e190e, roughness: 0.52, metalness: 0.05 });
        // Executive titanium wireframe glasses
        const glassesFrameMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.25, metalness: 0.85 });
        const glassesLensMat = new THREE.MeshStandardMaterial({ 
            color: 0x60a5fa, 
            transparent: true, 
            opacity: 0.35, 
            roughness: 0.05, 
            metalness: 0.15 
        });

        /* ── Model group – Y=0 is ground level ─────────────────── */
        this.modelGroup = new THREE.Group();
        this.group.add(this.modelGroup);

        /* ── LEGS & OXFORD SHOES ────────────────────────────────── */
        this._leftLeg = new THREE.Group();
        this._rightLeg = new THREE.Group();
        this._leftLeg.position.set(-0.19, 1.15, 0);
        this._rightLeg.position.set(0.19, 1.15, 0);
        this.modelGroup.add(this._leftLeg, this._rightLeg);

        // Tapered tailored trousers with realistic cylinder smoothness
        const legUpperGeo = new THREE.CylinderGeometry(0.145, 0.125, 0.62, 16);
        const legLowerGeo = new THREE.CylinderGeometry(0.125, 0.11, 0.56, 16);
        const creaseGeo = new THREE.BoxGeometry(0.012, 1.14, 0.015);

        [this._leftLeg, this._rightLeg].forEach(leg => {
            const thigh = new THREE.Mesh(legUpperGeo, suitMat);
            thigh.position.y = -0.31;
            leg.add(thigh);

            const calf = new THREE.Mesh(legLowerGeo, suitMat);
            calf.position.y = -0.87;
            leg.add(calf);

            // Front pressed trouser crease line
            const crease = new THREE.Mesh(creaseGeo, lapelMat);
            crease.position.set(0, -0.58, 0.125);
            leg.add(crease);

            // Trouser cuff hem at ankle
            const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.124, 0.05, 16), suitMat);
            cuff.position.y = -1.14;
            leg.add(cuff);

            // ── Sculpted Italian Oxford Shoes ──
            const shoeGroup = new THREE.Group();
            shoeGroup.position.set(0, -1.18, 0.04);

            // Stacked heel
            const heel = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.04, 0.14), shoeSoleMat);
            heel.position.set(0, -0.04, -0.09);
            shoeGroup.add(heel);

            // Outsole welt
            const sole = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.025, 0.40), shoeSoleMat);
            sole.position.set(0, -0.035, 0.05);
            shoeGroup.add(sole);

            // Upper leather body
            const upperGeo = new THREE.CylinderGeometry(0.10, 0.11, 0.38, 16);
            upperGeo.scale(1.0, 0.38, 1.0);
            upperGeo.rotateX(Math.PI / 2);
            const upper = new THREE.Mesh(upperGeo, shoeMat);
            upper.position.set(0, 0.01, 0.04);
            shoeGroup.add(upper);

            // Cap-toe front with sleek curve
            const capToeGeo = new THREE.SphereGeometry(0.105, 16, 12);
            capToeGeo.scale(0.98, 0.42, 1.3);
            const capToe = new THREE.Mesh(capToeGeo, shoeMat);
            capToe.position.set(0, -0.005, 0.17);
            shoeGroup.add(capToe);

            // Lacing vamp
            const vamp = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.14), shoeMat);
            vamp.position.set(0, 0.065, 0.02);
            vamp.rotation.x = -0.3;
            shoeGroup.add(vamp);

            leg.add(shoeGroup);
        });

        /* ── TORSO & TAILORED SUIT JACKET ──────────────────────── */
        // Organic contoured athletic chest and tailored waist
        const chestGeo = new THREE.CylinderGeometry(0.42, 0.36, 0.65, 20);
        chestGeo.scale(1.0, 1.0, 0.58);
        const chest = new THREE.Mesh(chestGeo, suitMat);
        chest.position.set(0, 2.05, 0);
        this.modelGroup.add(chest);

        const waistGeo = new THREE.CylinderGeometry(0.36, 0.39, 0.58, 20);
        waistGeo.scale(1.0, 1.0, 0.56);
        const waist = new THREE.Mesh(waistGeo, suitMat);
        waist.position.set(0, 1.48, 0);
        this.modelGroup.add(waist);

        // Lower jacket skirt extending gracefully over hips
        const skirtGeo = new THREE.CylinderGeometry(0.39, 0.43, 0.30, 20);
        skirtGeo.scale(1.0, 1.0, 0.56);
        const skirt = new THREE.Mesh(skirtGeo, suitMat);
        skirt.position.set(0, 1.10, 0);
        this.modelGroup.add(skirt);

        // Rear center coat vent slit
        const ventLine = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.28, 0.02), lapelMat);
        ventLine.position.set(0, 1.10, -0.225);
        this.modelGroup.add(ventLine);

        /* ── DRESS SHIRT & TIE ─────────────────────────────────── */
        // Clean white dress shirt V-panel
        const shirtPanel = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.64, 0.04), shirtMat);
        shirtPanel.position.set(0, 2.04, 0.225);
        this.modelGroup.add(shirtPanel);

        // Stiff spread collar
        const collarL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.03), shirtMat);
        collarL.position.set(-0.065, 2.34, 0.23);
        collarL.rotation.z = -0.38;
        this.modelGroup.add(collarL);

        const collarR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.03), shirtMat);
        collarR.position.set(0.065, 2.34, 0.23);
        collarR.rotation.z = 0.38;
        this.modelGroup.add(collarR);

        // Silk Necktie (Four-in-hand knot + tapered blade)
        const knotGeo = new THREE.CylinderGeometry(0.055, 0.04, 0.075, 8);
        knotGeo.scale(1.0, 1.0, 0.7);
        const tieKnot = new THREE.Mesh(knotGeo, tieMat);
        tieKnot.position.set(0, 2.30, 0.252);
        this.modelGroup.add(tieKnot);

        const tieBladeGeo = new THREE.CylinderGeometry(0.038, 0.062, 0.65, 8);
        tieBladeGeo.scale(1.0, 1.0, 0.4);
        const tieBlade = new THREE.Mesh(tieBladeGeo, tieMat);
        tieBlade.position.set(0, 1.94, 0.25);
        this.modelGroup.add(tieBlade);

        // 14k Gold Tie Bar / Clip
        const tieClip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.015, 0.018), goldMat);
        tieClip.position.set(0.01, 1.98, 0.264);
        this.modelGroup.add(tieClip);

        /* ── NOTCHED PEAK LAPELS & POCKETS ─────────────────────── */
        // Left & Right Peaked Lapels
        const lapelGeo = new THREE.BoxGeometry(0.18, 0.62, 0.045);
        const lapelL = new THREE.Mesh(lapelGeo, lapelMat);
        lapelL.position.set(-0.21, 2.05, 0.235);
        lapelL.rotation.z = 0.24;
        this.modelGroup.add(lapelL);

        const lapelR = new THREE.Mesh(lapelGeo, lapelMat);
        lapelR.position.set(0.21, 2.05, 0.235);
        lapelR.rotation.z = -0.24;
        this.modelGroup.add(lapelR);

        // Corporate Titanium/Gold Lapel Pin on left lapel
        const lapelPin = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.01, 6), goldMat);
        lapelPin.rotation.x = Math.PI / 2;
        lapelPin.position.set(-0.24, 2.22, 0.262);
        this.modelGroup.add(lapelPin);

        // Breast Pocket with Silk Pocket Square
        const breastPocket = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.018, 0.02), lapelMat);
        breastPocket.position.set(-0.24, 2.02, 0.248);
        breastPocket.rotation.z = 0.08;
        this.modelGroup.add(breastPocket);

        const pocketSquare = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.035, 0.015), shirtMat);
        pocketSquare.position.set(-0.24, 2.045, 0.252);
        pocketSquare.rotation.z = 0.08;
        this.modelGroup.add(pocketSquare);

        // Waist Flap Pockets
        const flapPocketGeo = new THREE.BoxGeometry(0.16, 0.03, 0.025);
        const flapL = new THREE.Mesh(flapPocketGeo, lapelMat);
        flapL.position.set(-0.28, 1.45, 0.228);
        this.modelGroup.add(flapL);

        const flapR = new THREE.Mesh(flapPocketGeo, lapelMat);
        flapR.position.set(0.28, 1.45, 0.228);
        this.modelGroup.add(flapR);

        // Suit Jacket Buttons
        const buttonGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.016, 12);
        [1.62, 1.46].forEach(y => {
            const btn = new THREE.Mesh(buttonGeo, goldMat);
            btn.rotation.x = Math.PI / 2;
            btn.position.set(0, y, 0.248);
            this.modelGroup.add(btn);
        });

        /* ── ARMS & HANDS ───────────────────────────────────────── */
        this._leftArm = new THREE.Group();
        this._rightArm = new THREE.Group();
        this._leftArm.position.set(-0.51, 2.28, 0);
        this._rightArm.position.set(0.51, 2.28, 0);
        this.modelGroup.add(this._leftArm, this._rightArm);

        // Broad shoulder pads
        const padGeo = new THREE.SphereGeometry(0.15, 16, 12);
        padGeo.scale(1.1, 0.8, 1.1);
        const padL = new THREE.Mesh(padGeo, suitMat);
        padL.position.set(0, -0.02, 0);
        this._leftArm.add(padL);

        const padR = new THREE.Mesh(padGeo, suitMat);
        padR.position.set(0, -0.02, 0);
        this._rightArm.add(padR);

        // Upper arm & forearm as smooth tapered cylinders
        const armUpperGeo = new THREE.CylinderGeometry(0.115, 0.098, 0.72, 16);
        const armForeGeo = new THREE.CylinderGeometry(0.098, 0.084, 0.62, 16);

        [this._leftArm, this._rightArm].forEach((arm, armIdx) => {
            const upper = new THREE.Mesh(armUpperGeo, suitMat);
            upper.position.y = -0.46;
            arm.add(upper);

            const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.098, 14, 10), suitMat);
            elbow.position.y = -0.80;
            arm.add(elbow);

            const fore = new THREE.Mesh(armForeGeo, suitMat);
            fore.position.y = -1.12;
            arm.add(fore);

            // Peeking French cuff (white shirt cuff)
            const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.088, 0.04, 16), shirtMat);
            cuff.position.y = -1.42;
            arm.add(cuff);

            // Gold Cufflink
            const cufflink = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.016, 0.025), goldMat);
            cufflink.position.set(armIdx === 0 ? -0.088 : 0.088, -1.42, 0);
            arm.add(cufflink);

            // ── Sculpted Hand ──
            const handGroup = new THREE.Group();
            handGroup.position.set(0, -1.54, 0);

            // Palm
            const palmGeo = new THREE.BoxGeometry(0.10, 0.12, 0.055);
            const palm = new THREE.Mesh(palmGeo, skinMat);
            palm.position.y = -0.02;
            handGroup.add(palm);

            // Opposable Thumb
            const thumbGeo = new THREE.CylinderGeometry(0.022, 0.018, 0.08, 8);
            const thumb = new THREE.Mesh(thumbGeo, skinMat);
            thumb.position.set(armIdx === 0 ? 0.055 : -0.055, -0.01, 0.025);
            thumb.rotation.z = armIdx === 0 ? -0.6 : 0.6;
            handGroup.add(thumb);

            // Knuckles & articulated finger block
            const fingersGeo = new THREE.BoxGeometry(0.095, 0.10, 0.045);
            const fingers = new THREE.Mesh(fingersGeo, skinMat);
            fingers.position.set(0, -0.11, 0.01);
            handGroup.add(fingers);

            arm.add(handGroup);
        });

        // ── Gold Luxury Chronometer Watch (Left Wrist) ──
        const watchGroup = new THREE.Group();
        watchGroup.position.set(0, -1.38, 0);
        // Leather strap
        const strap = new THREE.Mesh(new THREE.CylinderGeometry(0.096, 0.096, 0.035, 16), suitMat);
        watchGroup.add(strap);
        // Gold bezel
        const bezel = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.018, 16), goldMat);
        bezel.rotation.z = Math.PI / 2;
        bezel.position.set(-0.098, 0, 0);
        watchGroup.add(bezel);
        // Dark dial
        const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.019, 16), pupilMat);
        dial.rotation.z = Math.PI / 2;
        dial.position.set(-0.099, 0, 0);
        watchGroup.add(dial);
        this._leftArm.add(watchGroup);

        // ── Executive Leather Attaché Briefcase (Right Arm) ──
        const bcGroup = new THREE.Group();
        bcGroup.position.set(0, -1.72, 0.02);

        // Rich mahogany leather briefcase body
        const bcBody = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.28, 0.12), briefMat);
        bcGroup.add(bcBody);

        // Stitched welt boundary
        const bcWelt = new THREE.Mesh(new THREE.BoxGeometry(0.39, 0.29, 0.015), suitMat);
        bcGroup.add(bcWelt);

        // 4 Solid Brass Corner Brackets
        const cornerGeo = new THREE.BoxGeometry(0.035, 0.035, 0.124);
        [[-0.17, 0.12], [0.17, 0.12], [-0.17, -0.12], [0.17, -0.12]].forEach(([cx, cy]) => {
            const corner = new THREE.Mesh(cornerGeo, goldMat);
            corner.position.set(cx, cy, 0);
            bcGroup.add(corner);
        });

        // Dual Brass Combination Locks
        const lockGeo = new THREE.BoxGeometry(0.032, 0.045, 0.025);
        [-0.09, 0.09].forEach(lx => {
            const lock = new THREE.Mesh(lockGeo, goldMat);
            lock.position.set(lx, 0.08, 0.062);
            bcGroup.add(lock);
        });

        // Ergonomic arched leather handle
        const handle = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.014, 8, 16, Math.PI), briefMat);
        handle.rotation.x = Math.PI;
        handle.position.set(0, 0.16, 0);
        bcGroup.add(handle);

        this._rightArm.add(bcGroup);

        /* ── NECK ───────────────────────────────────────────────── */
        const neckGeo = new THREE.CylinderGeometry(0.098, 0.11, 0.20, 16);
        const neck = new THREE.Mesh(neckGeo, skinMat);
        neck.position.set(0, 2.44, 0);
        this.modelGroup.add(neck);

        /* ── HEAD & REALISTIC SCULPTED EXECUTIVE FACE ────────────── */
        this.head = new THREE.Group();
        this.head.position.set(0, 2.72, 0);
        this.modelGroup.add(this.head);

        // Anatomical cranium
        const craniumGeo = new THREE.SphereGeometry(0.28, 32, 32);
        craniumGeo.scale(0.92, 1.16, 0.96);
        const cranium = new THREE.Mesh(craniumGeo, skinMat);
        this.head.add(cranium);

        // Chiseled masculine jawline & chin
        const jawGeo = new THREE.BoxGeometry(0.26, 0.20, 0.22);
        const jaw = new THREE.Mesh(jawGeo, skinMat);
        jaw.position.set(0, -0.14, 0.08);
        jaw.rotation.x = 0.22;
        this.head.add(jaw);

        const chinGeo = new THREE.SphereGeometry(0.085, 16, 16);
        chinGeo.scale(1.1, 0.8, 1.1);
        const chin = new THREE.Mesh(chinGeo, skinMat);
        chin.position.set(0, -0.22, 0.19);
        this.head.add(chin);

        // Subtle chin cleft
        const cleft = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.045, 0.015), skinDarkMat);
        cleft.position.set(0, -0.22, 0.258);
        this.head.add(cleft);

        // Cheekbones
        const cheekGeo = new THREE.SphereGeometry(0.08, 12, 12);
        cheekGeo.scale(0.6, 1.0, 1.2);
        [-0.18, 0.18].forEach(cx => {
            const cheek = new THREE.Mesh(cheekGeo, skinMat);
            cheek.position.set(cx, -0.04, 0.14);
            this.head.add(cheek);
        });

        // Anatomical Ears (Helix, antihelix & earlobe)
        const earOuterGeo = new THREE.TorusGeometry(0.065, 0.018, 8, 16, Math.PI * 1.3);
        const earInnerGeo = new THREE.SphereGeometry(0.05, 12, 12);
        earInnerGeo.scale(0.4, 1.0, 0.6);

        [-0.27, 0.27].forEach((ex, i) => {
            const earOuter = new THREE.Mesh(earOuterGeo, skinMat);
            earOuter.rotation.y = i === 0 ? Math.PI / 2 : -Math.PI / 2;
            earOuter.position.set(ex, -0.02, -0.03);
            this.head.add(earOuter);

            const earInner = new THREE.Mesh(earInnerGeo, skinDarkMat);
            earInner.position.set(ex, -0.02, -0.03);
            this.head.add(earInner);
        });

        /* ── EYES (Realistic Sclera, Iris, Pupils & Eyelids) ────── */
        const eyeballGeo = new THREE.SphereGeometry(0.046, 20, 20);
        const irisGeo = new THREE.SphereGeometry(0.027, 16, 16);
        const pupilGeo = new THREE.SphereGeometry(0.015, 12, 12);
        const eyelidGeo = new THREE.SphereGeometry(0.052, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.45);

        [-0.095, 0.095].forEach((eyeX, i) => {
            const eyeGroup = new THREE.Group();
            eyeGroup.position.set(eyeX, 0.06, 0.225);

            // Sclera
            const sclera = new THREE.Mesh(eyeballGeo, scleraMat);
            eyeGroup.add(sclera);

            // Iris (piercing cold steel blue)
            const iris = new THREE.Mesh(irisGeo, irisMat);
            iris.position.set(0, 0, 0.032);
            eyeGroup.add(iris);

            // Pupil
            const pupil = new THREE.Mesh(pupilGeo, pupilMat);
            pupil.position.set(0, 0, 0.044);
            eyeGroup.add(pupil);

            // Upper hooded eyelid
            const eyelid = new THREE.Mesh(eyelidGeo, skinMat);
            eyelid.rotation.x = 0.55;
            eyeGroup.add(eyelid);

            this.head.add(eyeGroup);
        });

        // Piercing Scowling Brow Bone & Eyebrows
        const browRidge = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.04, 0.06), skinMat);
        browRidge.position.set(0, 0.12, 0.245);
        this.head.add(browRidge);

        const browGeo = new THREE.BoxGeometry(0.125, 0.028, 0.025);
        const browL = new THREE.Mesh(browGeo, browMat);
        browL.position.set(-0.095, 0.13, 0.262);
        browL.rotation.z = 0.28; // stern inward scowl
        this.head.add(browL);

        const browR = new THREE.Mesh(browGeo, browMat);
        browR.position.set(0.095, 0.13, 0.262);
        browR.rotation.z = -0.28;
        this.head.add(browR);

        // Frown lines between brows
        [-0.015, 0.015].forEach(fx => {
            const wrinkle = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.04, 0.01), skinDarkMat);
            wrinkle.position.set(fx, 0.13, 0.272);
            this.head.add(wrinkle);
        });

        /* ── NOSE & MOUTH ───────────────────────────────────────── */
        // Sculpted nose bridge and tip
        const noseBridge = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.14, 0.065), skinMat);
        noseBridge.position.set(0, 0.01, 0.275);
        this.head.add(noseBridge);

        const noseTip = new THREE.Mesh(new THREE.SphereGeometry(0.038, 14, 12), skinMat);
        noseTip.position.set(0, -0.065, 0.305);
        this.head.add(noseTip);

        // Nostril wings
        const nostrilGeo = new THREE.SphereGeometry(0.022, 10, 10);
        [-0.032, 0.032].forEach(nx => {
            const nostril = new THREE.Mesh(nostrilGeo, skinDarkMat);
            nostril.position.set(nx, -0.07, 0.288);
            this.head.add(nostril);
        });

        // Sculpted lips with Cupid's bow and firm executive set
        const upperLip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.018, 0.025), mouthMat);
        upperLip.position.set(0, -0.135, 0.265);
        this.head.add(upperLip);

        const lowerLip = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.022, 0.028), mouthMat);
        lowerLip.position.set(0, -0.155, 0.262);
        this.head.add(lowerLip);

        // Philtrum groove above upper lip
        const philtrum = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 0.01), skinDarkMat);
        philtrum.position.set(0, -0.11, 0.28);
        this.head.add(philtrum);

        /* ── TITANIUM EXECUTIVE GLASSES ─────────────────────────── */
        // Left & right rectangular frames
        const frameGeo = new THREE.BoxGeometry(0.14, 0.095, 0.018);
        const lensMeshGeo = new THREE.BoxGeometry(0.12, 0.075, 0.008);

        [-0.095, 0.095].forEach(gx => {
            const frame = new THREE.Mesh(frameGeo, glassesFrameMat);
            frame.position.set(gx, 0.06, 0.27);
            this.head.add(frame);

            const lens = new THREE.Mesh(lensMeshGeo, glassesLensMat);
            lens.position.set(gx, 0.06, 0.275);
            this.head.add(lens);
        });

        // Glasses bridge
        const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.016, 0.018), glassesFrameMat);
        bridge.position.set(0, 0.075, 0.27);
        this.head.add(bridge);

        // Side temples extending back over the ears
        const templeGeo = new THREE.BoxGeometry(0.012, 0.012, 0.28);
        [-0.17, 0.17].forEach((tx, i) => {
            const temple = new THREE.Mesh(templeGeo, glassesFrameMat);
            temple.position.set(tx, 0.06, 0.14);
            temple.rotation.y = i === 0 ? 0.08 : -0.08;
            this.head.add(temple);
        });

        /* ── HAIR (Executive Slicked-Back with Salt-and-Pepper) ─── */
        // Main cranial hair crown
        const hairDomeGeo = new THREE.SphereGeometry(0.292, 28, 24);
        hairDomeGeo.scale(1.02, 1.08, 1.08);
        const hairDome = new THREE.Mesh(hairDomeGeo, hairMat);
        hairDome.position.set(0, 0.05, -0.05);
        hairDome.rotation.x = 0.14;
        this.head.add(hairDome);

        // Front executive pomp / swept quiff
        const pompGeo = new THREE.SphereGeometry(0.16, 20, 16);
        pompGeo.scale(1.25, 0.75, 1.4);
        const pomp = new THREE.Mesh(pompGeo, hairMat);
        pomp.position.set(0, 0.25, 0.06);
        pomp.rotation.x = 0.12;
        this.head.add(pomp);

        // Flow locks down the back of the skull
        const backLockGeo = new THREE.SphereGeometry(0.14, 16, 16);
        backLockGeo.scale(0.85, 0.7, 1.8);
        const backLock = new THREE.Mesh(backLockGeo, hairMat);
        backLock.position.set(0, 0.22, -0.08);
        this.head.add(backLock);

        // Distinguished Silver Temple Highlights
        const silverTempleGeo = new THREE.SphereGeometry(0.085, 14, 12);
        silverTempleGeo.scale(0.45, 1.6, 1.1);

        const silverL = new THREE.Mesh(silverTempleGeo, silverHairMat);
        silverL.position.set(-0.255, 0.08, 0.02);
        this.head.add(silverL);

        const silverR = new THREE.Mesh(silverTempleGeo, silverHairMat);
        silverR.position.set(0.255, 0.08, 0.02);
        this.head.add(silverR);

        // Tailored Sideburns
        const sideburnGeo = new THREE.BoxGeometry(0.025, 0.14, 0.06);
        [-0.262, 0.262].forEach(sx => {
            const sideburn = new THREE.Mesh(sideburnGeo, hairMat);
            sideburn.position.set(sx, -0.03, 0.02);
            this.head.add(sideburn);
        });

        /* ── CINEMATIC LIGHTING ─────────────────────────────────── */
        // Key light on the face highlighting bone structure
        this.frontLight = new THREE.PointLight(0xffedd5, 3.2, 6.0);
        this.frontLight.position.set(0, 0.6, 1.8);
        this.head.add(this.frontLight);

        // Cool rim light from behind for dramatic silhouette separation
        this.rimLight = new THREE.PointLight(0x38bdf8, 1.2, 5.0);
        this.rimLight.position.set(0, 1.2, -1.5);
        this.modelGroup.add(this.rimLight);

        // Subtle upward shadow fill
        this.fillLight = new THREE.PointLight(0x818cf8, 0.5, 4.0);
        this.fillLight.position.set(0, -1.0, 1.2);
        this.modelGroup.add(this.fillLight);
    }

    /* ── Public API ─────────────────────────────────────────────── */

    _getPathState(pathIndex, progress) {
        let x = 0, y = 0, z = -4.5;
        let bodyRotY = 0;

        switch (pathIndex) {
            case 0: // Right to Left (Main walkway)
                x = lerp(8, -8, progress);
                z = -4.5;
                bodyRotY = -Math.PI / 2;
                break;
            case 1: // Left to Right (Main walkway)
                x = lerp(-8, 8, progress);
                z = -4.5;
                bodyRotY = Math.PI / 2;
                break;
            case 2: { // Back-Left corridor to Main-Right walkway
                if (progress < 0.5) {
                    const t = progress / 0.5;
                    x = -7.0;
                    z = lerp(-18.0, -4.5, t);
                    
                    // Smooth turn to the right (facing positive X)
                    if (progress > 0.4) {
                        const turnT = (progress - 0.4) / 0.1;
                        bodyRotY = lerp(0, Math.PI / 2, turnT);
                    } else {
                        bodyRotY = 0;
                    }
                } else {
                    const t = (progress - 0.5) / 0.5;
                    x = lerp(-7.0, 8.0, t);
                    z = -4.5;
                    bodyRotY = Math.PI / 2;
                }
                break;
            }
            case 3: { // Back-Right corridor to Main-Left walkway
                if (progress < 0.5) {
                    const t = progress / 0.5;
                    x = 7.0;
                    z = lerp(-18.0, -4.5, t);
                    
                    // Smooth turn to the left (facing negative X)
                    if (progress > 0.4) {
                        const turnT = (progress - 0.4) / 0.1;
                        bodyRotY = lerp(0, -Math.PI / 2, turnT);
                    } else {
                        bodyRotY = 0;
                    }
                } else {
                    const t = (progress - 0.5) / 0.5;
                    x = lerp(7.0, -8.0, t);
                    z = -4.5;
                    bodyRotY = -Math.PI / 2;
                }
                break;
            }
            case 4: { // Main-Left walkway to Back-Right corridor (Walk in and Turn Away)
                if (progress < 0.5) {
                    const t = progress / 0.5;
                    x = lerp(-8.0, 7.0, t);
                    z = -4.5;
                    bodyRotY = Math.PI / 2;
                    
                    // Smooth turn towards the back (facing -Z, which is rotation PI)
                    if (progress > 0.4) {
                        const turnT = (progress - 0.4) / 0.1;
                        bodyRotY = lerp(Math.PI / 2, Math.PI, turnT);
                    }
                } else {
                    const t = (progress - 0.5) / 0.5;
                    x = 7.0;
                    z = lerp(-4.5, -18.0, t);
                    bodyRotY = Math.PI;
                }
                break;
            }
        }

        return { x, y, z, bodyRotY };
    }

    show() {
        this.group.visible = true;
        
        // Randomly select a path index
        this._currentPathIndex = Math.floor(Math.random() * 5);
        
        // For Path 2, decide the turn direction: -1 = left, 1 = right
        this._path2Direction = Math.random() < 0.5 ? -1 : 1;

        // Set the initial position based on progress = 0
        const state = this._getPathState(this._currentPathIndex, 0);
        this.group.position.set(state.x, state.y, state.z);
        this.group.rotation.y = state.bodyRotY;
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

        // Calculate position and body rotation based on selected path
        const state = this._getPathState(this._currentPathIndex, progress);

        let avoidX = 0;
        let avoidZ = 0;
        const avoidRadius = 1.2; // Start avoiding employees within this distance
        
        if (this.officeScene && this.officeScene.employees) {
            for (const emp of this.officeScene.employees) {
                if (emp.state !== "sitting") {
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

        this.group.position.set(state.x + avoidX, state.y, state.z + avoidZ);

        // Smooth body rotation (angular lerp to avoid snapping)
        let angleDiff = state.bodyRotY - this.group.rotation.y;
        angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
        this.group.rotation.y += angleDiff * 0.12;

        // Smooth sinusoidal walk cycle for arms and legs
        const walkCycle = progress * Math.PI * 8;
        const targetSwing = Math.sin(walkCycle) * 0.35;

        // Smooth lerp for arm/leg swing
        this._leftArm.rotation.x += (targetSwing - this._leftArm.rotation.x) * 0.15;
        this._rightArm.rotation.x += (-targetSwing - this._rightArm.rotation.x) * 0.15;
        this._leftLeg.rotation.x += (-targetSwing * 0.8 - this._leftLeg.rotation.x) * 0.15;
        this._rightLeg.rotation.x += (targetSwing * 0.8 - this._rightLeg.rotation.x) * 0.15;

        // Subtle body bob (smooth)
        const targetBob = Math.abs(Math.sin(walkCycle)) * 0.04;
        this.modelGroup.position.y += (targetBob - this.modelGroup.position.y) * 0.15;

        // Dynamic head tracking - turn head to look at the player's desk (0, 0.85, 0)
        const bx = this.group.position.x;
        const bz = this.group.position.z;

        // Vector from boss head to player's desk
        const dx = 0 - bx;
        const dz = 0 - bz;
        
        // Target angle in world space around Y axis
        const worldAngle = Math.atan2(dx, dz);
        
        // Convert to local angle relative to boss body rotation
        let localAngleY = worldAngle - this.group.rotation.y;
        localAngleY = Math.atan2(Math.sin(localAngleY), Math.cos(localAngleY));
        localAngleY = Math.max(-1.22, Math.min(1.22, localAngleY));

        // Smooth head yaw tracking
        this.head.rotation.y += (localAngleY - this.head.rotation.y) * 0.08;

        // Head tilt/pitch to look down at the desk (smooth)
        const dist2D = Math.sqrt(dx * dx + dz * dz);
        const pitchAngle = Math.atan2(-1.87, dist2D);
        const clampedPitch = Math.max(-0.45, Math.min(0.1, pitchAngle));
        this.head.rotation.x += (clampedPitch - this.head.rotation.x) * 0.08;
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
