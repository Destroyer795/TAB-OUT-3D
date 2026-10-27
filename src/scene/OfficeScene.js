/**
 * OfficeScene.js – Builds the full low-poly office environment from Three.js primitives.
 */

import * as THREE from 'three';
import { createEmployee } from './HumanoidRig.js';
import { disposeTree } from '../utils/DisposeUtils.js';

// World scale: scene deskTopY = 0.85m / real 0.74m
const S = 0.85 / 0.74;

export class OfficeScene {
    /**
     * @param {THREE.Scene} scene
     */
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.employees = [];
        this.time = 0;
        this.suspicion = 0;
        this._build();
        this._finishScene();
        this.scene.add(this.group);
    }

    setBoss(boss) {
        this.boss = boss;
    }

    _finishScene() {
        this.group.updateMatrixWorld(true);
        const position = new THREE.Vector3();
        const rigRoots = new Set(this.employees.map(emp => emp.group));
        this.group.traverse(mesh => {
            if (!mesh.isMesh || mesh.material?.isMeshBasicMaterial) return;
            for (let parent = mesh.parent; parent; parent = parent.parent) if (rigRoots.has(parent)) return;
            mesh.getWorldPosition(position);
            mesh.receiveShadow = true;
            // Exterior towers and the ceiling must not shadow the entire office.
            mesh.castShadow = Math.abs(position.x) < 12 && position.y > .03 && position.y < 3;
        });
        // Contact gradients stay soft even beyond the directional shadow frustum.
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 64;
        const ctx = canvas.getContext('2d');
        const gradient = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(15,23,42,.28)');
        gradient.addColorStop(1, 'rgba(15,23,42,0)');
        ctx.fillStyle = gradient; ctx.fillRect(0, 0, 64, 64);
        const material = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 });
        const geometry = new THREE.PlaneGeometry(1, 1);
        const add = (x, z, sx, sz) => {
            const shadow = new THREE.Mesh(geometry, material);
            shadow.rotation.x = -Math.PI / 2;
            shadow.position.set(x, .015, z);
            shadow.scale.set(sx, sz, 1);
            this.group.add(shadow);
        };
        add(0, -.65, 3.8, 2.5);
        add(0, .7, 1.3, 1.3);
        this.employees.forEach(emp => {
            add(emp.homeX, emp.homeZ, 1.1, 1.1);
            if (emp.type === 'sitting_desk') add(emp.homeX, emp.homeZ - .4, 2.8, 1.7);
        });
        this._batchStaticMeshes();
    }

    _batchStaticMeshes() {
        // Collapse repeated furniture/architecture into instanced draws. Rig and
        // interactive prop hierarchies remain independently animated.
        const excluded = new Set([...this.employees.map(emp => emp.group), this.coffeeMug, this.deskLamp]);
        const batches = new Map();
        const collect = node => {
            if (excluded.has(node)) return;
            if (node.isMesh && !Array.isArray(node.material) && node.geometry.parameters && !node.material.transparent) {
                const key = node.geometry.type + JSON.stringify(node.geometry.parameters) + node.material.uuid + node.castShadow + node.receiveShadow;
                if (!batches.has(key)) batches.set(key, []);
                batches.get(key).push(node);
            }
            node.children.forEach(collect);
        };
        collect(this.group);
        batches.forEach(meshes => {
            if (meshes.length < 3) return;
            const first = meshes[0];
            const instance = new THREE.InstancedMesh(first.geometry, first.material, meshes.length);
            instance.castShadow = first.castShadow;
            instance.receiveShadow = first.receiveShadow;
            const discarded = new Set();
            meshes.forEach((mesh, i) => {
                instance.setMatrixAt(i, mesh.matrixWorld);
                if (mesh.geometry !== first.geometry) discarded.add(mesh.geometry);
                mesh.removeFromParent();
            });
            discarded.forEach(geometry => geometry.dispose());
            instance.computeBoundingSphere();
            this.group.add(instance);
        });
    }

    _build() {
        this._createFloor();
        this._createCeiling();
        this._createDesk();
        this._createKeyboard();
        this._createMouse();
        this._createChair();
        this._createCubicleWalls();
        this._createHallway();
        this._createOfficeProps();
    }

    /* ── Floor ─────────────────────────────────────────── */
    _createFloor() {
        const geo = new THREE.PlaneGeometry(24, 30);
        const mat = new THREE.MeshStandardMaterial({
            color: 0xfafbfc, // Ultra-light warm white carpet
            roughness: 0.9,
            metalness: 0.0,
        });
        const floor = new THREE.Mesh(geo, mat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(0, 0, -5.0);
        floor.receiveShadow = true;
        this.group.add(floor);

        // Carpet pattern (subtle grid lines)
        const lineMat = new THREE.MeshBasicMaterial({ color: 0xf3f4f6, transparent: true, opacity: 0.45 });
        
        // Horizontal lines (along X, spaced along Z)
        for (let z = -20; z <= 10; z += 0.5) {
            const h = new THREE.Mesh(new THREE.PlaneGeometry(24, 0.01), lineMat);
            h.rotation.x = -Math.PI / 2;
            h.position.set(0, 0.005, z);
            this.group.add(h);
        }

        // Vertical lines (along Z, spaced along X)
        for (let x = -12; x <= 12; x += 0.5) {
            const v = new THREE.Mesh(new THREE.PlaneGeometry(30, 0.01), lineMat);
            v.rotation.x = -Math.PI / 2;
            v.rotation.z = Math.PI / 2;
            v.position.set(x, 0.005, -5.0);
            this.group.add(v);
        }
    }

    /* ── Ceiling ───────────────────────────────────────── */
    _createCeiling() {
        const geo = new THREE.PlaneGeometry(24, 30);
        const mat = new THREE.MeshStandardMaterial({
            color: 0xffffff, // Pure white ceiling
            roughness: 0.95,
        });
        const ceiling = new THREE.Mesh(geo, mat);
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.set(0, 6.0, -5.0);
        this.group.add(ceiling);

        // Ceiling tiles pattern (bright off-white)
        const tileMat = new THREE.MeshStandardMaterial({
            color: 0xf8fafc,
            roughness: 0.9,
        });
        for (let x = -10; x <= 10; x += 2) {
            for (let z = -18; z <= 8; z += 2) {
                const tile = new THREE.Mesh(
                    new THREE.BoxGeometry(1.9, 0.05, 1.9),
                    tileMat
                );
                tile.position.set(x, 5.95, z);
                this.group.add(tile);
            }
        }

        // Long fluorescent/LED lights characteristic of corporate offices
        this._createLongLights();
    }

    _createLongLights() {
        const fixtureMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 }); // Lighter light-fixture casing
        const glowMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

        // A mathematically perfect grid of 3x3 fixtures
        // X coordinates: -6.0, 0.0, 6.0 (spaced exactly 6 units apart)
        // Z coordinates: -15.0, -7.0, 1.0 (spaced exactly 8 units apart)
        for (let x = -6.0; x <= 6.0; x += 6.0) {
            for (let z = -15.0; z <= 1.0; z += 8.0) {
                // Casing
                const casing = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.08, 3.2), fixtureMat);
                casing.position.set(x, 5.96, z);
                this.group.add(casing);

                // Glowing tube
                const tube = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.07, 3.0), glowMat);
                tube.position.set(x, 5.92, z);
                this.group.add(tube);
            }
        }
    }

    /* ── Desk ──────────────────────────────────────────── */
    _createDesk() {
        const deskMat = new THREE.MeshStandardMaterial({
            color: 0xf8f9fa, // Clean modern white office desk top
            roughness: 0.5,
            metalness: 0.1,
        });

        // Desk top
        const top = new THREE.Mesh(
            new THREE.BoxGeometry(2.4, 0.06, 1.2),
            deskMat
        );
        top.position.set(0, 0.82, -0.6);
        top.castShadow = true;
        top.receiveShadow = true;
        this.group.add(top);

        // Legs
        const legMat = new THREE.MeshStandardMaterial({
            color: 0x8e9aa6, // Light aluminum legs
            roughness: 0.3,
            metalness: 0.8,
        });
        const legGeo = new THREE.BoxGeometry(0.06, 0.82, 0.06);
        const positions = [
            [-1.1, 0.41, -0.15],
            [ 1.1, 0.41, -0.15],
            [-1.1, 0.41, -1.05],
            [ 1.1, 0.41, -1.05],
        ];
        for (const [x, y, z] of positions) {
            const leg = new THREE.Mesh(legGeo, legMat);
            leg.position.set(x, y, z);
            this.group.add(leg);
        }

        // Desk edge trim
        const edgeMat = new THREE.MeshStandardMaterial({
            color: 0xdbe1e6, // Light grey edge trim
            roughness: 0.6,
        });
        const frontEdge = new THREE.Mesh(
            new THREE.BoxGeometry(2.4, 0.08, 0.03),
            edgeMat
        );
        frontEdge.position.set(0, 0.82, 0.01);
        this.group.add(frontEdge);
    }

    /* ── Keyboard ──────────────────────────────────────── */
    _createKeyboard() {
        const kbMat = new THREE.MeshStandardMaterial({
            color: 0x2a2a2e,
            roughness: 0.8,
        });
        const kb = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.02, 0.18),
            kbMat
        );
        kb.position.set(0, 0.86, -0.35);
        this.group.add(kb);

        // Keys (tiny rows)
        const keyMat = new THREE.MeshStandardMaterial({ color: 0x3a3a40 });
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 12; c++) {
                const key = new THREE.Mesh(
                    new THREE.BoxGeometry(0.032, 0.012, 0.028),
                    keyMat
                );
                key.position.set(
                    -0.2 + c * 0.036,
                    0.87,
                    -0.28 - r * 0.036
                );
                this.group.add(key);
            }
        }
    }

    /* ── Mouse ─────────────────────────────────────────── */
    _createMouse() {
        const mat = new THREE.MeshStandardMaterial({
            color: 0x2a2a2e,
            roughness: 0.6,
        });
        // Mouse pad
        const pad = new THREE.Mesh(
            new THREE.BoxGeometry(0.28, 0.005, 0.22),
            new THREE.MeshStandardMaterial({ color: 0x222230, roughness: 0.95 })
        );
        pad.position.set(0.55, 0.85, -0.4);
        this.group.add(pad);

        // Mouse body
        const mouse = new THREE.Mesh(
            new THREE.BoxGeometry(0.06, 0.025, 0.1),
            mat
        );
        mouse.position.set(0.55, 0.87, -0.4);
        this.group.add(mouse);

        // Scroll wheel
        const wheel = new THREE.Mesh(
            new THREE.CylinderGeometry(0.008, 0.008, 0.02, 8),
            new THREE.MeshStandardMaterial({ color: 0x555555 })
        );
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(0.55, 0.885, -0.38);
        this.group.add(wheel);
    }

    /* ── Chair ─────────────────────────────────────────── */
    _createChair() {
        const seatMat = new THREE.MeshStandardMaterial({
            color: 0x333340,
            roughness: 0.8,
        });
        const frameMat = new THREE.MeshStandardMaterial({
            color: 0x444450,
            roughness: 0.5,
            metalness: 0.4,
        });

        // Seat
        const seat = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.06, 0.5),
            seatMat
        );
        seat.position.set(0, 0.5, 0.4);
        seat.castShadow = true;
        seat.receiveShadow = true;
        this.group.add(seat);

        // Back rest
        const back = new THREE.Mesh(
            new THREE.BoxGeometry(0.48, 0.6, 0.04),
            seatMat
        );
        back.position.set(0, 0.85, 0.64);
        back.rotation.x = 0.08;
        back.castShadow = true;
        this.group.add(back);

        // Center post (smooth 24-seg cylinder)
        const post = new THREE.Mesh(
            new THREE.CylinderGeometry(0.03, 0.03, 0.3, 24),
            frameMat
        );
        post.position.set(0, 0.32, 0.4);
        post.castShadow = true;
        this.group.add(post);

        // Star base
        const baseGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.35, 6);
        for (let i = 0; i < 5; i++) {
            const arm = new THREE.Mesh(baseGeo, frameMat);
            const angle = (i / 5) * Math.PI * 2;
            arm.rotation.z = Math.PI / 2;
            arm.rotation.y = angle;
            arm.position.set(
                Math.cos(angle) * 0.15,
                0.15,
                0.4 + Math.sin(angle) * 0.15
            );
            this.group.add(arm);
        }

        // Wheels
        const wheelGeo = new THREE.SphereGeometry(0.03, 6, 4);
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2;
            const w = new THREE.Mesh(wheelGeo, wheelMat);
            w.position.set(
                Math.cos(angle) * 0.3,
                0.03,
                0.4 + Math.sin(angle) * 0.3
            );
            this.group.add(w);
        }
    }

    /* ── Cubicle Walls ─────────────────────────────────── */
    _createCubicleWalls() {
        const wallMat = new THREE.MeshStandardMaterial({
            color: 0xf8fafc, // Extremely bright modern cubicle walls
            roughness: 0.85,
        });
        const frameMat = new THREE.MeshStandardMaterial({
            color: 0xe2e8f0, // Extremely bright aluminum/chrome frame
            roughness: 0.25,
            metalness: 0.8,
        });

        // Left wall
        const leftWall = new THREE.Mesh(
            new THREE.BoxGeometry(0.06, 1.2, 3.0),
            wallMat
        );
        leftWall.position.set(-1.8, 0.6, -1.0);
        leftWall.castShadow = true;
        leftWall.receiveShadow = true;
        this.group.add(leftWall);

        // Left wall top trim
        const leftTrim = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.04, 3.0),
            frameMat
        );
        leftTrim.position.set(-1.8, 1.2, -1.0);
        this.group.add(leftTrim);

        // Right wall
        const rightWall = new THREE.Mesh(
            new THREE.BoxGeometry(0.06, 1.2, 3.0),
            wallMat
        );
        rightWall.position.set(1.8, 0.6, -1.0);
        rightWall.castShadow = true;
        rightWall.receiveShadow = true;
        this.group.add(rightWall);

        const rightTrim = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.04, 3.0),
            frameMat
        );
        rightTrim.position.set(1.8, 1.2, -1.0);
        this.group.add(rightTrim);

        // Back wall (with panoramic opening for hallway and meeting view)
        // Left section
        const backLeft = new THREE.Mesh(
            new THREE.BoxGeometry(1.2, 1.2, 0.06),
            wallMat
        );
        backLeft.position.set(-1.2, 0.6, -2.5);
        backLeft.castShadow = true;
        backLeft.receiveShadow = true;
        this.group.add(backLeft);

        // Right section
        const backRight = new THREE.Mesh(
            new THREE.BoxGeometry(0.9, 1.2, 0.06),
            wallMat
        );
        backRight.position.set(1.35, 0.6, -2.5);
        backRight.castShadow = true;
        backRight.receiveShadow = true;
        this.group.add(backRight);
    }

    /* ── Hallway / Background Office Floor ──────────────── */
    _createHallway() {
        const wallMat = new THREE.MeshStandardMaterial({
            color: 0xffffff, // Pure bright white drywall
            roughness: 0.9,
        });
        const trimMat = new THREE.MeshStandardMaterial({
            color: 0xdbe1e8, // Soft, extremely light silver gray trim
            roughness: 0.7,
        });

        // ── Distant Office Walls ─────────────────────────────
        // Back Wall
        const backWall = new THREE.Mesh(new THREE.BoxGeometry(24, 6.0, 0.15), wallMat);
        backWall.position.set(0, 3.0, -20.0);
        this.group.add(backWall);

        // ── Left Glass Curtain Wall ──────────────────────────
        // Frame Material for windows (metallic silver anodized aluminum)
        const glassFrameMat = new THREE.MeshStandardMaterial({
            color: 0xe2e8f0,
            metalness: 0.9,
            roughness: 0.1
        });

        // Thin bottom sill (resting exactly at floor level)
        const sill = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 30.0), glassFrameMat);
        sill.position.set(-12.0, 0.06, -5.0);
        this.group.add(sill);

        // Thin top head (meeting the ceiling)
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 30.0), glassFrameMat);
        head.position.set(-12.0, 5.94, -5.0);
        this.group.add(head);

        // Thin horizontal mid-rails (at height y = 2.8)
        const midRail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 30.0), glassFrameMat);
        midRail.position.set(-12.0, 2.8, -5.0);
        this.group.add(midRail);

        // Thin vertical window mullions (spaced every 5 units from z = -20 to z = 10)
        for (let mz = -20.0; mz <= 10.0; mz += 5.0) {
            const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.04, 5.76, 0.04), glassFrameMat);
            mullion.position.set(-12.0, 3.0, mz);
            this.group.add(mullion);
        }

        // Highly transparent sky-tinted glass pane (MeshBasicMaterial prevents dark shadow reflections)
        const glassMat = new THREE.MeshBasicMaterial({
            color: 0xe2f1ff, // Crisp ice-tinted glass
            transparent: true,
            opacity: 0.08,
            side: THREE.DoubleSide,
            fog: false
        });
        const glass = new THREE.Mesh(new THREE.BoxGeometry(0.01, 5.76, 30.0), glassMat);
        glass.position.set(-12.0, 3.0, -5.0);
        this.group.add(glass);

        // Outside cityscape scenery (buildings and clouds)
        this._createCityscape();

        // Right Wall
        const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.15, 6.0, 30.0), wallMat);
        rightWall.position.set(12.0, 3.0, -5.0);
        this.group.add(rightWall);

        // Baseboards for distant walls
        const bbBack = new THREE.Mesh(new THREE.BoxGeometry(24, 0.15, 0.18), trimMat);
        bbBack.position.set(0, 0.075, -19.9);
        this.group.add(bbBack);

        const bbRight = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.15, 30.0), trimMat);
        bbRight.position.set(11.9, 0.075, -5.0);
        this.group.add(bbRight);

        // ── Walkway Patrol Aisle ─────────────────────────────
        // Visual carpet strip marking the patrol pathway where the boss walks
        const walkway = new THREE.Mesh(
            new THREE.PlaneGeometry(24, 1.8),
            new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.9 }) // Ultra-light carpet strip
        );
        walkway.rotation.x = -Math.PI / 2;
        walkway.position.set(0, 0.008, -4.5);
        this.group.add(walkway);

        // Walkway borders (extremely light subtle gray lines)
        const borderMat = new THREE.MeshBasicMaterial({ color: 0xf1f5f9, transparent: true, opacity: 0.6 });
        const borderN = new THREE.Mesh(new THREE.PlaneGeometry(24, 0.02), borderMat);
        borderN.rotation.x = -Math.PI / 2;
        borderN.position.set(0, 0.01, -3.6);
        this.group.add(borderN);

        const borderS = new THREE.Mesh(new THREE.PlaneGeometry(24, 0.02), borderMat);
        borderS.rotation.x = -Math.PI / 2;
        borderS.position.set(0, 0.01, -5.4);
        this.group.add(borderS);

        // ── Background Office Workstations (Cubicle Farm) ────
        // Row 1 (directly across the walkway aisle, z = -5.8)
        this._createBackgroundCubicle(-3.2, -5.8, 0);
        this._createEmployee(-3.2, 0, -5.45, Math.PI, {
            type: "sitting_desk"
        });

        this._createBackgroundCubicle(0.0, -5.8, 0); // Directly visible in the central opening!
        this._createEmployee(0.0, 0, -5.45, Math.PI, {
            type: "sitting_desk"
        });

        this._createBackgroundCubicle(3.2, -5.8, 0);
        this._createEmployee(3.2, 0, -5.45, Math.PI, {
            type: "sitting_desk"
        });

        // Row 2 (z = -9.2)
        this._createBackgroundCubicle(-1.6, -9.2, 0);
        this._createEmployee(-1.6, 0, -8.85, Math.PI, {
            type: "sitting_desk"
        });

        this._createBackgroundCubicle(1.6, -9.2, 0);
        this._createEmployee(1.6, 0, -8.85, Math.PI, {
            type: "sitting_desk"
        });

        // ── Office Props & Details in Background ──────────────
        // File Cabinets against back wall
        this._createFileCabinet(-9.0, -19.8);
        this._createFileCabinet(9.0, -19.8);

        // Whiteboard on back wall
        const wbFrame = new THREE.Mesh(new THREE.BoxGeometry(4.0, 2.0, 0.04), new THREE.MeshStandardMaterial({ color: 0x475569 }));
        wbFrame.position.set(0, 3.2, -19.9);
        this.group.add(wbFrame);

        const wbSheet = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 1.8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        wbSheet.position.set(0, 3.2, -19.86);
        this.group.add(wbSheet);

        // Fake scribbles on whiteboard
        const markerMatRed = new THREE.MeshBasicMaterial({ color: 0xef4444 });
        const markerMatBlue = new THREE.MeshBasicMaterial({ color: 0x3b82f6 });
        
        const line1 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.04, 0.01), markerMatRed);
        line1.position.set(-0.8, 3.5, -19.85);
        line1.rotation.z = -0.15;
        this.group.add(line1);

        const line2 = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.04, 0.01), markerMatBlue);
        line2.position.set(0.5, 3.1, -19.85);
        line2.rotation.z = 0.08;
        this.group.add(line2);

        // Water cooler positioned on the left aisle in clear view
        this._createWaterCooler(-3.8, 0, -4.2);

        // Potted plants in empty spots
        this._createPlant(-6.5, 0, -8.0);
        this._createPlant(6.5, 0, -8.0);

        // Meeting Hub area on the right wall (Agile Scrum Board & Collaborative Furniture)
        this._createMeetingHub();
    }

    _createCityscape() {
        // ── 1. Sky Backdrop ──────────────────────────────────
        // A massive blue sky plane placed far to the left to span the full window view, with DoubleSide to ensure visibility
        const skyGeo = new THREE.PlaneGeometry(300, 150);
        const skyMat = new THREE.MeshBasicMaterial({ color: 0x7dd3fc, fog: false, side: THREE.DoubleSide });
        const sky = new THREE.Mesh(skyGeo, skyMat);
        sky.position.set(-48.0, 15.0, -25.0);
        sky.rotation.y = Math.PI / 2;
        this.group.add(sky);

        // ── 2. Distant Skyscraper Buildings (Self-illuminated for high visibility, clustered in player's FOV) ───────────────────
        const skyscrapers = [
            { x: -24, z: -28, w: 4.5, h: 42, d: 4.5, color: 0xf1f5f9 }, // Sleek white/silver tower (central view)
            { x: -28, z: -36, w: 5,   h: 36, d: 5,   color: 0xbae6fd }, // Crisp light cyan tower
            { x: -22, z: -20, w: 3.5, h: 28, d: 3.5, color: 0x93c5fd }, // Bright blue tower (left side)
            { x: -32, z: -44, w: 5,   h: 48, d: 5,   color: 0xcbd5e1 }, // Modern gray-metal tower
            { x: -26, z: -15, w: 4,   h: 24, d: 4,   color: 0xfde047 }  // Warm golden tower reflecting the sun
        ];

        skyscrapers.forEach(s => {
            const towerGroup = new THREE.Group();
            towerGroup.position.set(s.x, s.h / 2 - 2, s.z);

            // Using MeshBasicMaterial ensures the buildings are brightly visible and unaffected by room lighting
            const bodyMat = new THREE.MeshBasicMaterial({ color: s.color, fog: false });
            const body = new THREE.Mesh(new THREE.BoxGeometry(s.w, s.h, s.d), bodyMat);
            towerGroup.add(body);

            // Glowing office window bands
            const windowMat = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.85,
                fog: false
            });
            const numBands = Math.floor(s.h / 1.4);
            for (let i = 1; i < numBands; i++) {
                const bandY = -s.h / 2 + i * 1.4;
                const winBand = new THREE.Mesh(
                    new THREE.BoxGeometry(s.w + 0.04, 0.45, s.d + 0.04),
                    windowMat
                );
                winBand.position.y = bandY;
                towerGroup.add(winBand);
            }

            this.group.add(towerGroup);
        });

        // ── 3. Distant Clouds (Clustered in player's direct line of sight) ─────────────────
        const cloudPositions = [
            [-30, 18, -25],
            [-32, 22, -15],
            [-28, 16, -35],
            [-34, 14, -8]
        ];

        cloudPositions.forEach(([cx, cy, cz]) => {
            const cloudGroup = new THREE.Group();
            cloudGroup.position.set(cx, cy, cz);
            const cloudMat = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.95,
                fog: false
            });

            const sphereParams = [
                { r: 1.0, x: 0, y: 0, z: 0 },
                { r: 0.8, x: -0.8, y: -0.2, z: 0.4 },
                { r: 0.7, x: 0.7, y: -0.1, z: -0.3 },
                { r: 0.6, x: -0.4, y: 0.4, z: -0.2 },
                { r: 0.5, x: 0.4, y: 0.3, z: 0.3 }
            ];

            sphereParams.forEach(p => {
                const sphereGeo = new THREE.SphereGeometry(p.r, 8, 8);
                const sphere = new THREE.Mesh(sphereGeo, cloudMat);
                sphere.position.set(p.x, p.y, p.z);
                cloudGroup.add(sphere);
            });

            this.group.add(cloudGroup);
        });
    }

    _createMeetingHub() {
        // ── 1. Giant Agile Board on the Outer Right Wall ──────
        const boardX = 11.88; // Mounted right inside the right wall (x = 12)
        const boardY = 2.8;
        const boardZ = -7.0;

        // Board Frame (polished light aluminum trim)
        const frameMat = new THREE.MeshStandardMaterial({ color: 0xd1d7dd, metalness: 0.8, roughness: 0.2 });
        const frame = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.4, 4.8), frameMat);
        frame.position.set(boardX, boardY, boardZ);
        this.group.add(frame);

        // Whiteboard sheet (facing towards center of room: -X)
        const sheetMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const sheet = new THREE.Mesh(new THREE.BoxGeometry(0.02, 2.2, 4.6), sheetMat);
        sheet.position.set(boardX - 0.012, boardY, boardZ);
        this.group.add(sheet);

        // Title: "AGILE SCRUM ROADMAP" (represented by dark marker dashes)
        const titleMat = new THREE.MeshBasicMaterial({ color: 0x0f172a }); // Black marker
        const title1 = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.05, 0.8), titleMat);
        title1.position.set(boardX - 0.025, boardY + 0.9, boardZ - 0.5);
        this.group.add(title1);

        const title2 = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.05, 0.6), titleMat);
        title2.position.set(boardX - 0.025, boardY + 0.9, boardZ + 0.5);
        this.group.add(title2);

        // Scrum columns dividers (2 vertical grid lines)
        const gridMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8 });
        const col1 = new THREE.Mesh(new THREE.BoxGeometry(0.005, 1.4, 0.02), gridMat);
        col1.position.set(boardX - 0.025, boardY - 0.1, boardZ - 0.85);
        this.group.add(col1);

        const col2 = new THREE.Mesh(new THREE.BoxGeometry(0.005, 1.4, 0.02), gridMat);
        col2.position.set(boardX - 0.025, boardY - 0.1, boardZ + 0.85);
        this.group.add(col2);

        // Column Labels (represented by hand-drawn looking colored marker dashes)
        const labelMat = new THREE.MeshBasicMaterial({ color: 0x2563eb }); // Blue marker
        // "To Do" label
        const todoLbl = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.04, 0.35), labelMat);
        todoLbl.position.set(boardX - 0.025, boardY + 0.68, boardZ - 1.5);
        this.group.add(todoLbl);

        // "In Progress" label
        const inProgLbl = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.04, 0.45), labelMat);
        inProgLbl.position.set(boardX - 0.025, boardY + 0.68, boardZ);
        this.group.add(inProgLbl);

        // "Done" label
        const doneLbl = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.04, 0.3), labelMat);
        doneLbl.position.set(boardX - 0.025, boardY + 0.68, boardZ + 1.5);
        this.group.add(doneLbl);

        // Sticky notes (backlog tasks in To Do, In Progress, Done)
        const notes = [
            // To Do column (left)
            { z: -1.6, y: 0.35, color: 0xfef08a },
            { z: -1.3, y: 0.1, color: 0xfecdd3 },
            { z: -1.5, y: -0.2, color: 0xbae6fd },
            { z: -1.2, y: -0.45, color: 0xfef08a },

            // In Progress column (center)
            { z: -0.3, y: 0.3, color: 0xbbf7d0 },
            { z: 0.2, y: 0.05, color: 0xfef08a },
            { z: -0.1, y: -0.3, color: 0xbae6fd },

            // Done column (right)
            { z: 1.3, y: 0.4, color: 0xbae6fd },
            { z: 1.6, y: 0.15, color: 0xbbf7d0 },
            { z: 1.2, y: -0.25, color: 0xfecdd3 }
        ];

        notes.forEach(note => {
            const noteMat = new THREE.MeshStandardMaterial({
                color: note.color,
                roughness: 0.6
            });
            const noteMesh = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.22, 0.28), noteMat);
            noteMesh.rotation.x = (Math.random() - 0.5) * 0.18;
            noteMesh.position.set(boardX - 0.025, boardY + note.y, boardZ + note.z);
            this.group.add(noteMesh);
        });

        // Handwritten notes/manifesto on the lower whiteboard section
        const redMarker = new THREE.MeshBasicMaterial({ color: 0xdc2626 });
        const manifestoTitle = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.03, 0.4), redMarker);
        manifestoTitle.position.set(boardX - 0.025, boardY - 0.5, boardZ - 1.4);
        this.group.add(manifestoTitle);

        // Hand-written text lines (scribbles)
        for (let i = 0; i < 4; i++) {
            const scribble = new THREE.Mesh(
                new THREE.BoxGeometry(0.005, 0.015, 0.6 + Math.random() * 0.2),
                new THREE.MeshBasicMaterial({ color: 0x1e293b })
            );
            scribble.position.set(boardX - 0.025, boardY - 0.64 - i * 0.12, boardZ - 1.2);
            this.group.add(scribble);
        }

        // ── 2. Collaborative High-Top Table (placed in clear view of player) ──
        const tableX = 4.2;
        const tableY = 0.95;
        const tableZ = -5.0;

        const woodMat = new THREE.MeshStandardMaterial({ color: 0xddc4b0, roughness: 0.4 });
        const legMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.3, metalness: 0.8 });

        // Table Top
        const tableTop = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 2.4), woodMat);
        tableTop.position.set(tableX, tableY, tableZ);
        tableTop.castShadow = true;
        tableTop.receiveShadow = true;
        this.group.add(tableTop);

        // Legs (4 steel columns)
        const legD = 0.08;
        const legOffsets = [
            [-0.45, -1.0],
            [-0.45, 1.0],
            [0.45, -1.0],
            [0.45, 1.0]
        ];
        legOffsets.forEach(([ox, oz]) => {
            const leg = new THREE.Mesh(new THREE.BoxGeometry(legD, tableY, legD), legMat);
            leg.position.set(tableX + ox, tableY / 2, tableZ + oz);
            leg.castShadow = true;
            this.group.add(leg);
        });

        // ── 3. High-top Stools (Meeting Chairs) ────────────────
        const stoolSeatMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 });
        const stoolLegMat = new THREE.MeshStandardMaterial({ color: 0xdbe1e8, roughness: 0.3, metalness: 0.8 });

        const stoolPositions = [
            [tableX - 0.75, tableZ - 0.45],
            [tableX - 0.75, tableZ + 0.45],
            [tableX + 0.75, tableZ - 0.45],
            [tableX + 0.75, tableZ + 0.45]
        ];

        stoolPositions.forEach(([sx, sz], index) => {
            // Seat
            const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.05, 24), stoolSeatMat);
            seat.position.set(sx, 0.65, sz);
            seat.castShadow = true;
            seat.receiveShadow = true;
            this.group.add(seat);

            // Stool post/base (smooth 24-seg cylinder)
            const post = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 24), stoolLegMat);
            post.position.set(sx, 0.3, sz);
            post.castShadow = true;
            this.group.add(post);

            // Ring footrest
            const ring = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.015, 8, 20), stoolLegMat);
            ring.rotation.x = Math.PI / 2;
            ring.position.set(sx, 0.2, sz);
            ring.castShadow = true;
            this.group.add(ring);

            // Place sitting employees on 3 stools having an active conversation
            if (index === 0) {
                // Facing table center (+X)
                this._createEmployee(sx, 0, sz, Math.PI / 2, {
                    type: "sitting_stool"
                });
            } else if (index === 2) {
                // Facing table center (-X)
                this._createEmployee(sx, 0, sz, -Math.PI / 2, {
                    type: "sitting_stool"
                });
            } else if (index === 3) {
                // Facing table center (-X)
                this._createEmployee(sx, 0, sz, -Math.PI / 2, {
                    type: "sitting_stool"
                });
            }
        });

        // Link conversation eye-contact between the stool coworkers
        const stoolEmps = this.employees.filter(e => e.type === "sitting_stool");
        if (stoolEmps.length >= 2) {
            stoolEmps.forEach(emp => { emp.peers = stoolEmps.filter(other => other !== emp); });
            stoolEmps[0].human.lookAt(stoolEmps[1].group.position);
            for (let i = 1; i < stoolEmps.length; i++) {
                stoolEmps[i].human.lookAt(stoolEmps[0].group.position);
            }
        }
    }

    /* ── Small Office Props ────────────────────────────── */
    _createOfficeProps() {
        // Coffee mug
        this._createMug(-0.9, 0.85, -0.5);

        // Desk lamp
        this._createLamp(1.0, 0.85, -0.85);

        // Notebook (replaces the stacked papers)
        this._createNotebook(-0.7, 0.85, -0.8);

        // Pen holder
        this._createPenHolder(0.85, 0.85, -0.45);

        // Sticky notes (placed on a small board on the player's left cubicle wall)
        this._createStickyNote(-1.77, 1.0, -0.6);

        // Photo frame
        this._createPhotoFrame(-1.0, 0.85, -1.0);

        // Potted plant on neighboring cubicle
        this._createPlant(2.5, 0.0, -3.0);
    }

    _createMug(x, y, z) {
        this.coffeeMug = new THREE.Group();
        this.coffeeMug.position.set(x, y, z);
        const mat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.4 });
        const body = new THREE.Mesh(
            new THREE.CylinderGeometry(0.055, 0.045, 0.13, 32, 1, true),
            mat
        );
        body.position.set(0, .065, 0);
        this.coffeeMug.add(body);
        const rim = new THREE.Mesh(new THREE.TorusGeometry(.052, .004, 12, 32), mat);
        rim.rotation.x = Math.PI / 2;
        rim.position.y = .13;
        this.coffeeMug.add(rim);

        // Handle
        const handle = new THREE.Mesh(
            new THREE.TorusGeometry(0.034, 0.008, 12, 32, Math.PI),
            mat
        );
        handle.rotation.y = Math.PI / 2;
        handle.position.set(.05, .065, 0);
        this.coffeeMug.add(handle);

        // Coffee inside
        const coffee = new THREE.Mesh(
            new THREE.CylinderGeometry(0.048, 0.048, 0.006, 32),
            new THREE.MeshStandardMaterial({ color: 0x3c1e0a, roughness: 0.3 })
        );
        coffee.position.set(0, .12, 0);
        this.coffeeMug.add(coffee);
        this.group.add(this.coffeeMug);
    }

    _createLamp(x, y, z) {
        // Materials
        const metalMat = new THREE.MeshStandardMaterial({
            color: 0x111827, // Glossy deep black/charcoal
            roughness: 0.3,
            metalness: 0.85,
        });

        const chromeMat = new THREE.MeshStandardMaterial({
            color: 0xe2e8f0, // Polished chrome for accent joints/rods
            roughness: 0.15,
            metalness: 0.95,
        });

        const copperMat = new THREE.MeshStandardMaterial({
            color: 0xb45309, // Polished copper for hinges/springs
            roughness: 0.2,
            metalness: 0.9,
        });

        const bulbMat = new THREE.MeshStandardMaterial({
            color: 0xe2e8f0, // Unlit bulb
            roughness: 0.5,
        });

        const lampGroup = new THREE.Group();
        this.deskLamp = lampGroup;
        this.lampBulb = bulbMat;
        bulbMat.emissive = new THREE.Color(0xffc078);
        this.lampLight = new THREE.PointLight(0xffc078, 1.4, 2.8, 2);
        this.lampLight.position.set(-.2, .4, 0);
        lampGroup.add(this.lampLight);
        lampGroup.position.set(x, y, z);

        // 1. Double-tiered beveled base
        const baseBottom = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.085, 0.012, 16),
            metalMat
        );
        baseBottom.position.y = 0.006;
        lampGroup.add(baseBottom);

        const baseTop = new THREE.Mesh(
            new THREE.CylinderGeometry(0.05, 0.06, 0.01, 16),
            metalMat
        );
        baseTop.position.y = 0.017;
        lampGroup.add(baseTop);

        // 2. Base joint bracket
        const baseBracket = new THREE.Group();
        baseBracket.position.y = 0.022;
        lampGroup.add(baseBracket);

        const bracketMesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.02, 0.024, 0.02),
            metalMat
        );
        bracketMesh.position.y = 0.012;
        baseBracket.add(bracketMesh);

        const basePin = new THREE.Mesh(
            new THREE.CylinderGeometry(0.006, 0.006, 0.032, 8),
            chromeMat
        );
        basePin.rotation.x = Math.PI / 2;
        basePin.position.y = 0.018;
        baseBracket.add(basePin);

        // 3. Lower arm group (rotates around the base pin)
        const lowerArm = new THREE.Group();
        lowerArm.position.set(0, 0.018, 0);
        lowerArm.rotation.z = 0.25; // Leaning inward/left
        baseBracket.add(lowerArm);

        // Twin parallel rods (lower arm)
        const lowerRodGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.22, 8);
        
        const leftLowerRod = new THREE.Mesh(lowerRodGeo, chromeMat);
        leftLowerRod.position.set(0, 0.11, -0.012);
        lowerArm.add(leftLowerRod);

        const rightLowerRod = new THREE.Mesh(lowerRodGeo, chromeMat);
        rightLowerRod.position.set(0, 0.11, 0.012);
        lowerArm.add(rightLowerRod);

        // Diagonal bracing bar between rods
        const crossBrace = new THREE.Mesh(
            new THREE.BoxGeometry(0.003, 0.15, 0.003),
            metalMat
        );
        crossBrace.rotation.z = -0.4;
        crossBrace.position.set(0, 0.11, 0);
        lowerArm.add(crossBrace);

        // Small tension springs for retro-mechanical look
        const springGeo = new THREE.CylinderGeometry(0.007, 0.007, 0.08, 8);
        const springMat = new THREE.MeshStandardMaterial({
            color: 0x64748b,
            roughness: 0.4,
            metalness: 0.8
        });
        const leftSpring = new THREE.Mesh(springGeo, springMat);
        leftSpring.position.set(-0.01, 0.06, -0.012);
        leftSpring.rotation.z = 0.15;
        lowerArm.add(leftSpring);

        const rightSpring = new THREE.Mesh(springGeo, springMat);
        rightSpring.position.set(-0.01, 0.06, 0.012);
        rightSpring.rotation.z = 0.15;
        lowerArm.add(rightSpring);

        // 4. Elbow joint (positioned at the top of the lower arm)
        const elbowJoint = new THREE.Group();
        elbowJoint.position.set(0, 0.22, 0);
        elbowJoint.rotation.z = 0.35; // Leaning further left relative to lower arm
        lowerArm.add(elbowJoint);

        // Elbow joint plates (left and right)
        const elbowPlateGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.006, 12);
        const leftElbowPlate = new THREE.Mesh(elbowPlateGeo, metalMat);
        leftElbowPlate.rotation.x = Math.PI / 2;
        leftElbowPlate.position.z = -0.016;
        elbowJoint.add(leftElbowPlate);

        const rightElbowPlate = new THREE.Mesh(elbowPlateGeo, metalMat);
        rightElbowPlate.rotation.x = Math.PI / 2;
        rightElbowPlate.position.z = 0.016;
        elbowJoint.add(rightElbowPlate);

        // Central elbow pin
        const elbowPin = new THREE.Mesh(
            new THREE.CylinderGeometry(0.006, 0.006, 0.038, 8),
            copperMat
        );
        elbowPin.rotation.x = Math.PI / 2;
        elbowJoint.add(elbowPin);

        // 5. Upper arm group
        const upperArm = new THREE.Group();
        // Twin parallel rods (upper arm)
        const upperRodGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.2, 8);
        
        const leftUpperRod = new THREE.Mesh(upperRodGeo, chromeMat);
        leftUpperRod.position.set(0, 0.1, -0.009);
        upperArm.add(leftUpperRod);

        const rightUpperRod = new THREE.Mesh(upperRodGeo, chromeMat);
        rightUpperRod.position.set(0, 0.1, 0.009);
        upperArm.add(rightUpperRod);

        elbowJoint.add(upperArm);

        // Upper arm tension spring
        const upperSpring = new THREE.Mesh(springGeo, springMat);
        upperSpring.position.set(0.01, 0.08, 0);
        upperSpring.rotation.z = -0.1;
        upperArm.add(upperSpring);

        // 6. Head joint (at the top of the upper arm)
        const headJoint = new THREE.Group();
        headJoint.position.set(0, 0.2, 0);
        headJoint.rotation.z = -0.6; // Counter-rotate so head points straight down
        upperArm.add(headJoint);

        const headBracket = new THREE.Mesh(
            new THREE.BoxGeometry(0.014, 0.02, 0.024),
            metalMat
        );
        headJoint.add(headBracket);

        const headPin = new THREE.Mesh(
            new THREE.CylinderGeometry(0.005, 0.005, 0.03, 8),
            copperMat
        );
        headPin.rotation.x = Math.PI / 2;
        headJoint.add(headPin);

        // 7. Lamp shade assembly (pointing along -Y locally)
        const shadeGroup = new THREE.Group();
        shadeGroup.position.set(0, -0.01, 0);
        headJoint.add(shadeGroup);

        // Flared cone shade
        const shadeCone = new THREE.Mesh(
            new THREE.CylinderGeometry(0.025, 0.075, 0.09, 16, 1, true),
            metalMat
        );
        shadeCone.position.y = -0.045;
        
        // Interior of shade (creamy off-white)
        const interiorMat = new THREE.MeshStandardMaterial({
            color: 0xfffbeb,
            roughness: 0.5,
            side: THREE.BackSide
        });
        const shadeConeInterior = new THREE.Mesh(
            new THREE.CylinderGeometry(0.024, 0.074, 0.088, 16, 1, true),
            interiorMat
        );
        shadeConeInterior.position.y = -0.045;
        shadeGroup.add(shadeCone);
        shadeGroup.add(shadeConeInterior);

        // Closed cap at the top of the shade cone
        const shadeCap = new THREE.Mesh(
            new THREE.CylinderGeometry(0.026, 0.026, 0.01, 16),
            metalMat
        );
        shadeCap.position.y = 0.005;
        shadeGroup.add(shadeCap);

        // Polished switch pin
        const switchPin = new THREE.Mesh(
            new THREE.CylinderGeometry(0.004, 0.004, 0.012, 8),
            chromeMat
        );
        switchPin.position.y = 0.013;
        shadeGroup.add(switchPin);

        // Unlit light bulb inside
        const bulb = new THREE.Mesh(
            new THREE.SphereGeometry(0.018, 12, 12),
            bulbMat
        );
        bulb.position.y = -0.05;
        shadeGroup.add(bulb);

        // Lighting effects disabled per user request

        // Add the entire lamp assembly to the scene group
        this.group.add(lampGroup);
    }

    _createNotebook(x, y, z) {
        const notebookGroup = new THREE.Group();
        notebookGroup.position.set(x, y, z);
        notebookGroup.rotation.y = 0.15; // slightly angled

        // Leather cover (navy blue)
        const coverMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.8 });
        const cover = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.01, 0.26), coverMat);
        cover.position.set(0, 0.005, 0);
        notebookGroup.add(cover);

        // Cream paper pages
        const paperMat = new THREE.MeshStandardMaterial({ color: 0xfffaf0, roughness: 0.9 });
        
        // Left page (slightly tilted)
        const leftPage = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.008, 0.24), paperMat);
        leftPage.position.set(-0.09, 0.01, 0);
        leftPage.rotation.z = 0.03; // angled open
        notebookGroup.add(leftPage);

        // Right page (slightly tilted)
        const rightPage = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.008, 0.24), paperMat);
        rightPage.position.set(0.09, 0.01, 0);
        rightPage.rotation.z = -0.03; // angled open
        notebookGroup.add(rightPage);

        // Spiral binding (silver metal rings along the center spine)
        const spiralMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.2 });
        for (let i = -0.11; i <= 0.11; i += 0.03) {
            const ring = new THREE.Mesh(
                new THREE.TorusGeometry(0.012, 0.003, 4, 8),
                spiralMat
            );
            ring.rotation.y = Math.PI / 2;
            ring.position.set(0, 0.014, i);
            notebookGroup.add(ring);
        }

        this.group.add(notebookGroup);
    }

    _createPenHolder(x, y, z) {
        const mat = new THREE.MeshStandardMaterial({ color: 0x333344, roughness: 0.5 });
        const cup = new THREE.Mesh(
            new THREE.CylinderGeometry(0.03, 0.025, 0.08, 8),
            mat
        );
        cup.position.set(x, y + 0.04, z);
        this.group.add(cup);

        // Pens
        const colors = [0x2244cc, 0xcc2222, 0x222222];
        for (let i = 0; i < 3; i++) {
            const pen = new THREE.Mesh(
                new THREE.CylinderGeometry(0.004, 0.004, 0.12, 4),
                new THREE.MeshStandardMaterial({ color: colors[i] })
            );
            pen.position.set(
                x + (i - 1) * 0.012,
                y + 0.1,
                z
            );
            pen.rotation.z = (i - 1) * 0.08;
            this.group.add(pen);
        }
    }

    _createStickyNote(x, y, z) {
        // ── Corkboard Frame (brown wood, placed safely clear of the partition wall surface) ─────────────────────
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.7 });
        const frame = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.48, 0.88), frameMat);
        frame.position.set(-1.75, y, z);
        this.group.add(frame);

        // Cork center panel
        const corkMat = new THREE.MeshStandardMaterial({ color: 0xbca58c, roughness: 0.95 });
        const board = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.44, 0.84), corkMat);
        board.position.set(-1.73, y, z);
        this.group.add(board);

        // 3 Sticky Notes pinned to the corkboard (facing positive X)
        const colors = [0xfff176, 0xff8a80, 0x80d8ff]; // Yellow, pink, blue
        const noteOffsets = [
            { dy: 0.1, dz: -0.22 },
            { dy: -0.08, dz: 0.0 },
            { dy: 0.08, dz: 0.22 }
        ];

        noteOffsets.forEach((offset, i) => {
            const note = new THREE.Mesh(
                new THREE.PlaneGeometry(0.15, 0.15),
                new THREE.MeshStandardMaterial({
                    color: colors[i],
                    roughness: 0.9,
                    side: THREE.DoubleSide
                })
            );
            // Rotate the plane to face +X (normal along +X)
            note.rotation.y = Math.PI / 2;
            // Angle the note slightly so it looks naturally pinned
            note.rotation.x = (Math.random() - 0.5) * 0.12;

            // Place note clearly in front of the corkboard to prevent clipping (Z-fighting)
            note.position.set(-1.71, y + offset.dy, z + offset.dz);
            this.group.add(note);
        });
    }

    _createPhotoFrame(x, y, z) {
        const frameMat = new THREE.MeshStandardMaterial({
            color: 0x5c4033,
            roughness: 0.6,
        });

        const frame = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, 0.14, 0.015),
            frameMat
        );
        frame.position.set(x, y + 0.07, z);
        frame.rotation.x = -0.3;
        this.group.add(frame);

        // Photo (placeholder color rectangle)
        const photo = new THREE.Mesh(
            new THREE.PlaneGeometry(0.09, 0.11),
            new THREE.MeshBasicMaterial({ color: 0x88aacc })
        );
        photo.position.set(x, y + 0.07, z + 0.009);
        photo.rotation.x = -0.3;
        this.group.add(photo);
    }

    _createPlant(x, y, z) {
        // Pot
        const potMat = new THREE.MeshStandardMaterial({ color: 0xb45a3c, roughness: 0.8 });
        const pot = new THREE.Mesh(
            new THREE.CylinderGeometry(0.15, 0.12, 0.25, 8),
            potMat
        );
        pot.position.set(x, y + 0.125, z);
        this.group.add(pot);

        // Soil
        const soil = new THREE.Mesh(
            new THREE.CylinderGeometry(0.14, 0.14, 0.03, 8),
            new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 1 })
        );
        soil.position.set(x, y + 0.26, z);
        this.group.add(soil);

        // Leaves (simple spheres)
        const leafMat = new THREE.MeshStandardMaterial({ color: 0x4caf50, roughness: 0.8 });
        const leafPositions = [
            [0, 0.4, 0], [-0.08, 0.35, 0.06], [0.06, 0.38, -0.05],
            [0.05, 0.45, 0.04], [-0.04, 0.48, -0.03],
        ];
        for (const [lx, ly, lz] of leafPositions) {
            const leaf = new THREE.Mesh(
                new THREE.SphereGeometry(0.06 + Math.random() * 0.04, 6, 4),
                leafMat
            );
            leaf.position.set(x + lx, y + ly, z + lz);
            this.group.add(leaf);
        }
    }

    _createWaterCooler(x, y, z) {
        const mat = new THREE.MeshStandardMaterial({
            color: 0xdde0e3,
            roughness: 0.4,
            metalness: 0.2,
        });

        // Body
        const body = new THREE.Mesh(
            new THREE.BoxGeometry(0.35, 1.0, 0.35),
            mat
        );
        body.position.set(x, y + 0.5, z);
        this.group.add(body);

        // Water jug
        const jug = new THREE.Mesh(
            new THREE.CylinderGeometry(0.12, 0.14, 0.4, 12),
            new THREE.MeshStandardMaterial({
                color: 0xaaddff,
                roughness: 0.1,
                transparent: true,
                opacity: 0.5,
            })
        );
        jug.position.set(x, y + 1.2, z);
        this.group.add(jug);
    }

    _createBackgroundCubicle(x, z, rotationY = 0) {
        const cubicleGroup = new THREE.Group();
        cubicleGroup.position.set(x, 0, z);
        cubicleGroup.rotation.y = rotationY;

        // Desk top (full scale, matches player's desk)
        const deskMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }); // Pure white desk top
        const desk = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.05, 1.2), deskMat);
        desk.position.set(0, 0.82, 0);
        desk.castShadow = true;
        desk.receiveShadow = true;
        cubicleGroup.add(desk);

        // Desk legs (simplified, lighter metal)
        const legMat = new THREE.MeshStandardMaterial({ color: 0xbac2cc, metalness: 0.5, roughness: 0.4 });
        const legGeo = new THREE.BoxGeometry(0.04, 0.82, 0.04);
        const legPositions = [
            [-1.1, 0.41, -0.5],
            [ 1.1, 0.41, -0.5],
            [-1.1, 0.41,  0.5],
            [ 1.1, 0.41,  0.5]
        ];
        for (const pos of legPositions) {
            const leg = new THREE.Mesh(legGeo, legMat);
            leg.position.set(pos[0], pos[1], pos[2]);
            leg.castShadow = true;
            cubicleGroup.add(leg);
        }

        // Cubicle partition walls (back and sides, lowered to height 1.2 to match player's open visual style)
        const wallMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }); // Pure white fabric
        const frameMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.6, roughness: 0.3 }); // Extremely light gray trim

        // Back wall
        const backWall = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 0.04), wallMat);
        backWall.position.set(0, 0.6, -0.6);
        backWall.castShadow = true;
        backWall.receiveShadow = true;
        cubicleGroup.add(backWall);

        const backTrim = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.03, 0.06), frameMat);
        backTrim.position.set(0, 1.2, -0.6);
        cubicleGroup.add(backTrim);

        // Left wall
        const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.2, 1.2), wallMat);
        leftWall.position.set(-1.2, 0.6, 0);
        leftWall.castShadow = true;
        leftWall.receiveShadow = true;
        cubicleGroup.add(leftWall);

        const leftTrim = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 1.2), frameMat);
        leftTrim.position.set(-1.2, 1.2, 0);
        cubicleGroup.add(leftTrim);

        // Right wall
        const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.2, 1.2), wallMat);
        rightWall.position.set(1.2, 0.6, 0);
        rightWall.castShadow = true;
        rightWall.receiveShadow = true;
        cubicleGroup.add(rightWall);

        const rightTrim = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 1.2), frameMat);
        rightTrim.position.set(0.8, 1.2, 0); // Correctly offset trim
        cubicleGroup.add(rightTrim);

        // Monitor
        const monMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
        
        // Let some screens be on (glowing spreadsheet green or blue)
        const screenOn = Math.random() > 0.4;
        const screenOnMat = new THREE.MeshBasicMaterial({ color: screenOn ? (Math.random() > 0.5 ? 0x22c55e : 0x3b82f6) : 0x0f172a });

        // Monitor body (larger and more detailed)
        const monitor = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.04), monMat);
        monitor.position.set(0, 1.05, -0.3);
        monitor.castShadow = true;
        cubicleGroup.add(monitor);

        // Monitor screen face (facing towards the desk/chair, so towards +Z)
        const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.38), screenOnMat);
        screen.position.set(0, 1.05, -0.278);
        cubicleGroup.add(screen);

        // Monitor stand
        const stand = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.1), monMat);
        stand.position.set(0, 0.92, -0.3);
        cubicleGroup.add(stand);

        // Keyboard (simple flat box, matches player's desk)
        const kb = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.16), new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8 }));
        kb.position.set(0, 0.835, 0.05);
        cubicleGroup.add(kb);

        // Chair (properly sized)
        const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.5), new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.7 }));
        chairSeat.position.set(0, 0.45, 0.35);
        chairSeat.castShadow = true;
        chairSeat.receiveShadow = true;
        cubicleGroup.add(chairSeat);

        const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.6, 0.04), new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.7 }));
        chairBack.position.set(0, 0.75, 0.58);
        chairBack.rotation.x = 0.08;
        chairBack.castShadow = true;
        cubicleGroup.add(chairBack);

        const chairPost = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.25, 24), new THREE.MeshStandardMaterial({ color: 0x8fa0b5, metalness: 0.6 }));
        chairPost.position.set(0, 0.3, 0.35);
        chairPost.castShadow = true;
        cubicleGroup.add(chairPost);

        this.group.add(cubicleGroup);
    }

    _createFileCabinet(x, z) {
        const cabMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.5 }); // Lighter metallic gray
        const handleMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.8, roughness: 0.2 });

        const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.0, 0.6), cabMat);
        body.position.set(x, 1.0, z);
        this.group.add(body);

        // Drawers (visual ridges)
        for (let i = 0; i < 4; i++) {
            const drawerY = 0.25 + i * 0.48;
            
            // Drawer line groove (lighter gray)
            const line = new THREE.Mesh(
                new THREE.BoxGeometry(0.92, 0.02, 0.02),
                new THREE.MeshStandardMaterial({ color: 0xbac2cc })
            );
            line.position.set(x, drawerY, z + 0.301);
            this.group.add(line);

            // Handle
            const handle = new THREE.Mesh(
                new THREE.BoxGeometry(0.25, 0.03, 0.04),
                handleMat
            );
            handle.position.set(x, drawerY + 0.12, z + 0.31);
            this.group.add(handle);
        }
    }

    _createEmployee(x, y, z, rotationY, config) {
        const empIndex = this.employees.length;
        const isDesk = (config.type === "sitting_desk");

        const heights = [1.80, 1.68, 1.85, 1.66, 1.76, 1.70, 1.79, 1.72];
        const height = heights[empIndex % heights.length] * S;
        const scale = height / 1.78;
        const seatHeight = (isDesk ? .56 : .76) / scale;
        // palm centre of keyboard, METRES, relative to root (floor under chair facing +Z)
        const keyboard = [0, .865 / scale, .30 / scale];

        const human = createEmployee(empIndex, {
            height,
            seatHeight,
            keyboard,
            restHands: [0, (isDesk ? .70 : .86) / scale, .19 / scale],
            tableHands: [0, .99 / scale, .25 / scale],
            footHeight: isDesk ? 0 : .20 / scale,
            seatedFootZ: (isDesk ? .33 : .12) / scale,
        });

        // Floor point = 0, facing = rotationY
        human.root.position.set(x, 0, z);
        human.root.rotation.y = rotationY;
        this.group.add(human.root);

        // World position of the desktop monitor in this cubicle
        const monitorTarget = isDesk ? new THREE.Vector3(x, 1.05, z - 0.65) : null;

        if (isDesk) {
            human.setPose('sitType', { snap: true });
            human.lookAt(monitorTarget);
        } else {
            human.setPose('sitTalk', { snap: true });
            human.setTalking(true);
        }

        this.employees.push({
            human,
            group: human.root,
            type: config.type,
            state: "sitting",
            homeX: x,
            homeZ: z,
            homeRotationY: rotationY,
            monitorTarget,
            walkCooldown: 18 + empIndex * 5 + Math.random() * 12,
            walkSpeed: 1.05 + Math.random() * .18,
            path: [],
            pathIndex: 0,
            standTimer: 0,
            idleTimer: 3.0 + Math.random() * 5.0,
            stretchTimer: 0,
            startled: false,
            gaze: new THREE.Vector3(),
            velocity: new THREE.Vector2(),
            transitionTimer: 0,
            alarmTimer: 0,
            index: empIndex,
        });
    }

    _generateWalkPath(emp, dest) {
        const path = [];
        path.push({ x: emp.homeX, z: emp.homeZ });
        path.push({ x: emp.homeX + .65, z: emp.homeZ + .08 });
        const aisleZ = -4.5;
        path.push({ x: emp.homeX + .65, z: aisleZ });
        path.push({ x: dest.x, z: aisleZ });
        path.push({ x: dest.x, z: dest.z });
        return path;
    }

    update(dt) {
        this.time += dt;
        const alarm = !!this.boss?.group.visible || this.suspicion > 60;
        for (const emp of this.employees) {
            const human = emp.human;
            if (alarm) {
                emp.alarmTimer += dt;
                emp.velocity.multiplyScalar(Math.exp(-12 * dt));
                if (!emp.startled && emp.alarmTimer > .10 + emp.index * .035) {
                    emp.startled = true;
                    human.setPose(human.s.sit > .5 ? 'sitAlert' : 'alert');
                    human.setTalking(false);
                }
                if (emp.startled) {
                    emp.gaze.copy(this.boss.group.position); emp.gaze.y += 1.7;
                    human.lookAt(emp.gaze);
                    human.setExpression(emp.alarmTimer < 1 ? 'shock' : 'focus');
                }
                human.update(dt);
                continue;
            }
            emp.alarmTimer = 0;
            if (emp.startled) {
                emp.startled = false;
                human.setExpression('neutral');
                human.setPose(emp.state === 'sitting' || emp.state === 'settling'
                    ? (emp.type === 'sitting_desk' ? 'sitType' : 'sitTalk') : 'stand');
                human.lookAt(emp.monitorTarget);
            }
            if (emp.type === 'sitting_stool') {
                const speaker = Math.floor(this.time / 4.8) % 3;
                const talking = emp.index % 3 === speaker;
                const peer = emp.peers.find(other => other.index % 3 === speaker) || emp.peers[0];
                if (peer) {
                    emp.gaze.copy(peer.group.position); emp.gaze.y += 1.35;
                    human.lookAt(emp.gaze);
                }
                human.setTalking(talking);
                human.update(dt);
                continue;
            }
            switch (emp.state) {
                case 'sitting': {
                    emp.idleTimer -= dt;
                    emp.walkCooldown -= dt;
                    if (emp.stretchTimer > 0) {
                        emp.stretchTimer -= dt;
                        if (emp.stretchTimer <= 0) human.setPose('sitType');
                    } else if (emp.idleTimer <= 0) {
                        emp.idleTimer = 9 + Math.random() * 12;
                        emp.stretchTimer = 2 + Math.random() * 2;
                        human.setPose('sitIdle');
                    }
                    emp.gaze.copy(emp.monitorTarget);
                    emp.gaze.x += Math.sin(this.time * .4 + emp.index) * .06;
                    human.lookAt(emp.gaze);
                    const aisleOccupied = this.employees.some(other => other !== emp && other.type === 'sitting_desk' && other.state !== 'sitting');
                    if (emp.walkCooldown <= 0 && !aisleOccupied) {
                        emp.state = 'rising'; emp.transitionTimer = 1;
                        const destination = emp.index % 2 ? { x: 2.75, z: -4.1 } : { x: -3.8, z: -4.25 };
                        emp.path = this._generateWalkPath(emp, destination); emp.pathIndex = 1;
                        human.setPose('stand'); human.lookAt(null);
                        emp.walkCooldown = 26 + Math.random() * 25;
                    }
                    break;
                }
                case 'rising':
                    emp.transitionTimer -= dt;
                    if (emp.transitionTimer <= 0) emp.state = 'walking';
                    break;
                case 'walking':
                case 'returning': {
                    const target = emp.path[emp.pathIndex];
                    if (!target) break;
                    const dx = target.x - emp.group.position.x, dz = target.z - emp.group.position.z;
                    const distance = Math.hypot(dx, dz);
                    if (distance < .055) {
                        emp.velocity.set(0, 0); emp.pathIndex++;
                        if (emp.pathIndex >= emp.path.length) {
                            if (emp.state === 'walking') {
                                emp.state = 'standing'; emp.standTimer = 3 + Math.random() * 3;
                                human.setPose('stand'); human.setTalking(false);
                            } else {
                                emp.state = 'aligning'; emp.transitionTimer = .85;
                            }
                        }
                        break;
                    }
                    const heading = Math.atan2(dx, dz);
                    const error = Math.atan2(Math.sin(heading - emp.group.rotation.y), Math.cos(heading - emp.group.rotation.y));
                    emp.group.rotation.y += error * (1 - Math.exp(-6 * dt));
                    const arrival = Math.min(1, distance / .30);
                    const speed = emp.walkSpeed * arrival * Math.max(.08, Math.cos(error));
                    const blend = 1 - Math.exp(-7 * dt);
                    emp.velocity.x += (dx / distance * speed - emp.velocity.x) * blend;
                    emp.velocity.y += (dz / distance * speed - emp.velocity.y) * blend;
                    const step = Math.min(distance, emp.velocity.length() * dt);
                    if (step > 0) {
                        const length = emp.velocity.length();
                        emp.group.position.x += emp.velocity.x / length * step;
                        emp.group.position.z += emp.velocity.y / length * step;
                    }
                    break;
                }
                case 'standing':
                    emp.standTimer -= dt;
                    if (emp.standTimer <= 0) {
                        emp.state = 'returning'; emp.path = [...emp.path].reverse(); emp.pathIndex = 1;
                        human.setPose('stand'); human.lookAt(null);
                    }
                    break;
                case 'aligning': {
                    const error = Math.atan2(Math.sin(emp.homeRotationY - emp.group.rotation.y), Math.cos(emp.homeRotationY - emp.group.rotation.y));
                    emp.group.rotation.y += error * (1 - Math.exp(-7 * dt));
                    emp.transitionTimer -= dt;
                    if (emp.transitionTimer <= 0) {
                        emp.state = 'settling'; emp.transitionTimer = .9;
                        human.setPose('sitIdle'); human.lookAt(emp.monitorTarget);
                    }
                    break;
                }
                case 'settling':
                    emp.transitionTimer -= dt;
                    if (emp.transitionTimer <= 0) {
                        emp.state = 'sitting'; emp.stretchTimer = 0;
                        human.setPose('sitType');
                    }
                    break;
            }
            human.update(dt);
        }
    }

    dispose() {
        this.scene.remove(this.group);
        this.employees.forEach(emp => {
            emp.group.removeFromParent();
            if (emp.human) emp.human.dispose();
        });
        disposeTree(this.group);
        this.employees = [];
    }
}
