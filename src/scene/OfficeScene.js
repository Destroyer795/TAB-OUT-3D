/**
 * OfficeScene.js – Builds the full low-poly office environment from Three.js primitives.
 */

import * as THREE from 'three';

export class OfficeScene {
    /**
     * @param {THREE.Scene} scene
     */
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.employees = [];
        this._build();
        this.scene.add(this.group);
    }

    setBoss(boss) {
        this.boss = boss;
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
        this.group.add(seat);

        // Back rest
        const back = new THREE.Mesh(
            new THREE.BoxGeometry(0.48, 0.6, 0.04),
            seatMat
        );
        back.position.set(0, 0.85, 0.64);
        back.rotation.x = 0.08;
        this.group.add(back);

        // Center post
        const post = new THREE.Mesh(
            new THREE.CylinderGeometry(0.03, 0.03, 0.3, 8),
            frameMat
        );
        post.position.set(0, 0.32, 0.4);
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
        this.group.add(rightWall);

        const rightTrim = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.04, 3.0),
            frameMat
        );
        rightTrim.position.set(1.8, 1.2, -1.0);
        this.group.add(rightTrim);

        // Back wall (with gap for hallway view)
        // Left section
        const backLeft = new THREE.Mesh(
            new THREE.BoxGeometry(1.2, 1.2, 0.06),
            wallMat
        );
        backLeft.position.set(-1.2, 0.6, -2.5);
        this.group.add(backLeft);

        // Right section
        const backRight = new THREE.Mesh(
            new THREE.BoxGeometry(1.2, 1.2, 0.06),
            wallMat
        );
        backRight.position.set(1.2, 0.6, -2.5);
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
        // Row 1 (just behind the walkway, z = -7.5)
        this._createBackgroundCubicle(-3.2, -7.5, 0);
        this._createEmployee(-3.2, 0.29, -7.15, Math.PI, {
            shirtColor: 0x93c5fd, // Light blue shirt
            pantsColor: 0x1e293b,
            hairColor: 0x111827, // Black hair
            skinColor: 0xfdba74,
            type: "sitting_desk"
        });

        this._createBackgroundCubicle(0.0, -7.5, 0); // Directly visible in the central opening
        this._createEmployee(0.0, 0.29, -7.15, Math.PI, {
            shirtColor: 0xffffff, // White shirt
            pantsColor: 0x334155,
            hairColor: 0x7c2d12, // Brown hair
            skinColor: 0xfcd34d,
            type: "sitting_desk"
        });

        this._createBackgroundCubicle(3.2, -7.5, 0);

        // Row 2 (z = -12.0)
        this._createBackgroundCubicle(-4.8, -12.0, 0);
        this._createBackgroundCubicle(-1.6, -12.0, 0);
        this._createEmployee(-1.6, 0.29, -11.65, Math.PI, {
            shirtColor: 0xfca5a5, // Light pink shirt
            pantsColor: 0x0f172a,
            hairColor: 0xd97706, // Blonde hair
            skinColor: 0xfca5a5,
            type: "sitting_desk"
        });

        this._createBackgroundCubicle(1.6, -12.0, 0);
        this._createEmployee(1.6, 0.29, -11.65, Math.PI, {
            shirtColor: 0xdbe1e8, // Light gray shirt
            pantsColor: 0x334155,
            hairColor: 0x111827, // Black hair
            skinColor: 0xfdba74,
            type: "sitting_desk"
        });

        this._createBackgroundCubicle(4.8, -12.0, 0);

        // Row 3 (z = -16.5)
        this._createBackgroundCubicle(-3.2, -16.5, 0);
        this._createBackgroundCubicle(0.0, -16.5, 0);
        this._createBackgroundCubicle(3.2, -16.5, 0);
        this._createEmployee(3.2, 0.29, -16.15, Math.PI, {
            shirtColor: 0x93c5fd, // Light blue shirt
            pantsColor: 0x1e293b,
            hairColor: 0x7c2d12, // Brown hair
            skinColor: 0xfcd34d,
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

        // Water cooler moved to the left aisle
        this._createWaterCooler(-8.0, 0, -4.5);

        // Potted plants in empty spots (moved outwards to keep the aisles clear)
        this._createPlant(-8.2, 0, -10.0);
        this._createPlant(8.2, 0, -10.0);

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

        // ── 2. Collaborative High-Top Table ───────────────────
        const tableX = 8.5;
        const tableY = 0.95;
        const tableZ = -7.0;

        const woodMat = new THREE.MeshStandardMaterial({ color: 0xddc4b0, roughness: 0.4 }); // Light birch wood table top
        const legMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.3, metalness: 0.8 }); // Steel legs

        // Table Top
        const tableTop = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 2.6), woodMat);
        tableTop.position.set(tableX, tableY, tableZ);
        this.group.add(tableTop);

        // Legs (4 steel columns)
        const legD = 0.08;
        const legOffsets = [
            [-0.5, -1.1],
            [-0.5, 1.1],
            [0.5, -1.1],
            [0.5, 1.1]
        ];
        legOffsets.forEach(([ox, oz]) => {
            const leg = new THREE.Mesh(new THREE.BoxGeometry(legD, tableY, legD), legMat);
            leg.position.set(tableX + ox, tableY / 2, tableZ + oz);
            this.group.add(leg);
        });

        // ── 3. High-top Stools (Meeting Chairs) ────────────────
        const stoolSeatMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 }); // Slate seat pad
        const stoolLegMat = new THREE.MeshStandardMaterial({ color: 0xdbe1e8, roughness: 0.3, metalness: 0.8 }); // Metal legs

        const stoolPositions = [
            [tableX - 0.9, tableZ - 0.6],
            [tableX - 0.9, tableZ + 0.6],
            [tableX + 0.9, tableZ - 0.6],
            [tableX + 0.9, tableZ + 0.6]
        ];

        stoolPositions.forEach(([sx, sz], index) => {
            // Seat
            const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.05, 12), stoolSeatMat);
            seat.position.set(sx, 0.65, sz);
            this.group.add(seat);

            // Stool post/base
            const post = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 8), stoolLegMat);
            post.position.set(sx, 0.3, sz);
            this.group.add(post);

            // Ring footrest
            const ring = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.015, 6, 16), stoolLegMat);
            ring.rotation.x = Math.PI / 2;
            ring.position.set(sx, 0.2, sz);
            this.group.add(ring);

            // Place sitting employees on 3 out of 4 stools
            if (index === 0) {
                // Stool at sx = tableX - 0.9, sz = tableZ - 0.6 (facing table center: +X)
                this._createEmployee(sx, 0.47, sz, Math.PI / 2, {
                    shirtColor: 0x93c5fd, // Light blue shirt
                    pantsColor: 0x1e293b,
                    hairColor: 0x7c2d12,
                    skinColor: 0xfdba74,
                    type: "sitting_stool"
                });
            } else if (index === 2) {
                // Stool at sx = tableX + 0.9, sz = tableZ - 0.6 (facing table center: -X)
                this._createEmployee(sx, 0.47, sz, -Math.PI / 2, {
                    shirtColor: 0xfca5a5, // Light pink shirt
                    pantsColor: 0x0f172a,
                    hairColor: 0x111827,
                    skinColor: 0xfcd34d,
                    type: "sitting_stool"
                });
            } else if (index === 3) {
                // Stool at sx = tableX + 0.9, sz = tableZ + 0.6 (facing table center: -X)
                this._createEmployee(sx, 0.47, sz, -Math.PI / 2, {
                    shirtColor: 0xdbe1e8, // Light gray shirt
                    pantsColor: 0x334155,
                    hairColor: 0xd97706,
                    skinColor: 0xfca5a5,
                    type: "sitting_stool"
                });
            }
        });
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
        const mat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.4 });
        const body = new THREE.Mesh(
            new THREE.CylinderGeometry(0.04, 0.035, 0.1, 12),
            mat
        );
        body.position.set(x, y + 0.05, z);
        this.group.add(body);

        // Handle
        const handle = new THREE.Mesh(
            new THREE.TorusGeometry(0.025, 0.006, 6, 8, Math.PI),
            mat
        );
        handle.rotation.y = Math.PI / 2;
        handle.position.set(x + 0.04, y + 0.05, z);
        this.group.add(handle);

        // Coffee inside
        const coffee = new THREE.Mesh(
            new THREE.CylinderGeometry(0.035, 0.035, 0.01, 12),
            new THREE.MeshStandardMaterial({ color: 0x3c1e0a, roughness: 0.3 })
        );
        coffee.position.set(x, y + 0.095, z);
        this.group.add(coffee);
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
            cubicleGroup.add(leg);
        }

        // Cubicle partition walls (back and sides, lowered to height 1.2 to match player's open visual style)
        const wallMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }); // Pure white fabric
        const frameMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.6, roughness: 0.3 }); // Extremely light gray trim

        // Back wall
        const backWall = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 0.04), wallMat);
        backWall.position.set(0, 0.6, -0.6);
        cubicleGroup.add(backWall);

        const backTrim = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.03, 0.06), frameMat);
        backTrim.position.set(0, 1.2, -0.6);
        cubicleGroup.add(backTrim);

        // Left wall
        const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.2, 1.2), wallMat);
        leftWall.position.set(-1.2, 0.6, 0);
        cubicleGroup.add(leftWall);

        const leftTrim = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 1.2), frameMat);
        leftTrim.position.set(-1.2, 1.2, 0);
        cubicleGroup.add(leftTrim);

        // Right wall
        const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.2, 1.2), wallMat);
        rightWall.position.set(1.2, 0.6, 0);
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
        cubicleGroup.add(chairSeat);

        const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.6, 0.04), new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.7 }));
        chairBack.position.set(0, 0.75, 0.58);
        chairBack.rotation.x = 0.08;
        cubicleGroup.add(chairBack);

        const chairPost = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.25, 6), new THREE.MeshStandardMaterial({ color: 0x8fa0b5, metalness: 0.6 }));
        chairPost.position.set(0, 0.3, 0.35);
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
        const group = new THREE.Group();
        group.position.set(x, y, z);
        group.rotation.y = rotationY;
        group.scale.set(2.0, 2.0, 2.0); // Scale up employees to be taller

        const skinMat = new THREE.MeshStandardMaterial({ color: config.skinColor || 0xfdba74, roughness: 0.6 });
        const shirtMat = new THREE.MeshStandardMaterial({ color: config.shirtColor || 0xffffff, roughness: 0.7 });
        const pantsMat = new THREE.MeshStandardMaterial({ color: config.pantsColor || 0x1e293b, roughness: 0.8 });
        const hairMat = new THREE.MeshStandardMaterial({ color: config.hairColor || 0x111827, roughness: 0.9 });
        const shoeMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });

        // Torso
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.48, 0.22), shirtMat);
        torso.position.set(0, 0.38, 0);
        group.add(torso);

        // Head Group (parent of all head & face parts for correct rotation inheritance)
        const head = new THREE.Group();
        head.position.set(0, 0.70, 0);
        group.add(head);

        // Head Mesh (radius 0.10 is smaller and fits better)
        const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.10, 12, 10), skinMat);
        head.add(headMesh);

        // Hair (styled modern boxy cut, nested)
        const hair = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.18), hairMat);
        hair.position.set(0, 0.08, -0.01);
        head.add(hair);

        // ── Face (all nested inside head) ─────────────────────
        const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8f8f8, roughness: 0.8 });
        const pupilMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3 });
        const mouthMat = new THREE.MeshStandardMaterial({ color: 0xc47060, roughness: 0.7 });

        // Eyes (sclera)
        const eyeGeo = new THREE.SphereGeometry(0.02, 8, 6);
        const eyeL = new THREE.Mesh(eyeGeo, eyeWhiteMat);
        eyeL.position.set(-0.035, 0.02, 0.09);
        head.add(eyeL);
        
        const eyeR = new THREE.Mesh(eyeGeo, eyeWhiteMat);
        eyeR.position.set(0.035, 0.02, 0.09);
        head.add(eyeR);

        // Pupils (nested inside eyes so they scale and rotate with the eye)
        const pupilGeo = new THREE.SphereGeometry(0.011, 6, 6);
        const pupilL = new THREE.Mesh(pupilGeo, pupilMat);
        pupilL.position.set(0, 0, 0.014);
        eyeL.add(pupilL);
        
        const pupilR = new THREE.Mesh(pupilGeo, pupilMat);
        pupilR.position.set(0, 0, 0.014);
        eyeR.add(pupilR);

        // Nose
        const nose = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 0.02), skinMat);
        nose.position.set(0, -0.01, 0.095);
        head.add(nose);

        // Mouth
        const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.008, 0.008), mouthMat);
        mouth.position.set(0, -0.045, 0.09);
        head.add(mouth);

        // ── Leg Hierarchy ──────────────────────────────────────
        // Left Leg
        const leftThigh = new THREE.Group();
        leftThigh.position.set(-0.09, 0.16, 0.0);
        group.add(leftThigh);

        const leftThighMesh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.32, 0.08), pantsMat);
        leftThighMesh.position.set(0, -0.16, 0);
        leftThigh.add(leftThighMesh);

        const leftCalf = new THREE.Group();
        leftCalf.position.set(0, -0.32, 0);
        leftThigh.add(leftCalf);

        const leftCalfMesh = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.32, 0.075), pantsMat);
        leftCalfMesh.position.set(0, -0.16, 0);
        leftCalf.add(leftCalfMesh);

        const leftShoe = new THREE.Group();
        leftShoe.position.set(0, -0.32, 0.02);
        leftCalf.add(leftShoe);

        const leftShoeMesh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.12), shoeMat);
        leftShoeMesh.position.set(0, -0.025, 0.03);
        leftShoe.add(leftShoeMesh);

        // Right Leg
        const rightThigh = new THREE.Group();
        rightThigh.position.set(0.09, 0.16, 0.0);
        group.add(rightThigh);

        const rightThighMesh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.32, 0.08), pantsMat);
        rightThighMesh.position.set(0, -0.16, 0);
        rightThigh.add(rightThighMesh);

        const rightCalf = new THREE.Group();
        rightCalf.position.set(0, -0.32, 0);
        rightThigh.add(rightCalf);

        const rightCalfMesh = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.32, 0.075), pantsMat);
        rightCalfMesh.position.set(0, -0.16, 0);
        rightCalf.add(rightCalfMesh);

        const rightShoe = new THREE.Group();
        rightShoe.position.set(0, -0.32, 0.02);
        rightCalf.add(rightShoe);

        const rightShoeMesh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.12), shoeMat);
        rightShoeMesh.position.set(0, -0.025, 0.03);
        rightShoe.add(rightShoeMesh);

        // ── Arm Hierarchy ──────────────────────────────────────
        // Left Arm
        const leftUpper = new THREE.Group();
        leftUpper.position.set(-0.18, 0.52, 0.0);
        group.add(leftUpper);

        const leftUpperMesh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.24, 0.06), shirtMat);
        leftUpperMesh.position.set(0, -0.12, 0);
        leftUpper.add(leftUpperMesh);

        const leftFore = new THREE.Group();
        leftFore.position.set(0, -0.24, 0);
        leftUpper.add(leftFore);

        const leftForeMesh = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.20, 0.05), shirtMat);
        leftForeMesh.position.set(0, -0.10, 0);
        leftFore.add(leftForeMesh);

        const leftHand = new THREE.Group();
        leftHand.position.set(0, -0.20, 0);
        leftFore.add(leftHand);

        const leftHandMesh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.06), skinMat);
        leftHandMesh.position.set(0, -0.02, 0);
        leftHand.add(leftHandMesh);

        // Right Arm
        const rightUpper = new THREE.Group();
        rightUpper.position.set(0.18, 0.52, 0.0);
        group.add(rightUpper);

        const rightUpperMesh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.24, 0.06), shirtMat);
        rightUpperMesh.position.set(0, -0.12, 0);
        rightUpper.add(rightUpperMesh);

        const rightFore = new THREE.Group();
        rightFore.position.set(0, -0.24, 0);
        rightUpper.add(rightFore);

        const rightForeMesh = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.20, 0.05), shirtMat);
        rightForeMesh.position.set(0, -0.10, 0);
        rightFore.add(rightForeMesh);

        const rightHand = new THREE.Group();
        rightHand.position.set(0, -0.20, 0);
        rightFore.add(rightHand);

        const rightHandMesh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.06), skinMat);
        rightHandMesh.position.set(0, -0.02, 0);
        rightHand.add(rightHandMesh);

        // Push employee object to appropriate container
        if (config.type === "sitting_desk") {
            this.employees.push({
                group: group,
                head: head,
                torso: torso,
                hair: hair,
                leftThigh: leftThigh,
                rightThigh: rightThigh,
                leftCalf: leftCalf,
                rightCalf: rightCalf,
                leftShoe: leftShoe,
                rightShoe: rightShoe,
                leftUpper: leftUpper,
                rightUpper: rightUpper,
                leftFore: leftFore,
                rightFore: rightFore,
                leftHand: leftHand,
                rightHand: rightHand,
                
                eyeL: eyeL,
                eyeR: eyeR,
                mouth: mouth,
                isBlinking: false,
                blinkTimer: 1.0 + Math.random() * 4.0,
                blinkDuration: 0.0,
                
                type: "sitting_desk",
                state: "sitting",
                homeX: x,
                homeY: y,
                homeZ: z,
                homeRotationY: rotationY,
                
                animOffset: Math.random() * 100,
                typeTimer: Math.random() * 2,
                isTyping: Math.random() > 0.5,
                typeSpeed: 12 + Math.random() * 8,
                lookTimer: Math.random() * 3,
                lookTargetY: 0,
                lookTargetX: 0,
                lookCurrY: 0,
                lookCurrX: 0,
                walkCooldown: 5.0 + Math.random() * 15.0,
                walkSpeed: 1.4 + Math.random() * 0.4,
                path: [],
                pathIndex: 0,
                standTimer: 0,
                gesture: "none",
                gestureTimer: 2.0 + Math.random() * 5.0,
                targetPose: {
                    leftThigh:  { rx: -Math.PI / 2 },
                    rightThigh: { rx: -Math.PI / 2 },
                    leftCalf:   { rx: Math.PI / 2 },
                    rightCalf:  { rx: Math.PI / 2 },
                    leftShoe:   { rx: 0 },
                    rightShoe:  { rx: 0 },
                    leftUpper:  { rx: -1.2, rz: 0.1 },
                    rightUpper: { rx: -1.2, rz: -0.1 },
                    leftFore:   { rx: -0.4 },
                    rightFore:  { rx: -0.4 },
                    leftHand:   { rx: 0.2 },
                    rightHand:  { rx: 0.2 },
                    groupY: y
                }
            });
        } else {
            this.employees.push({
                group: group,
                head: head,
                torso: torso,
                hair: hair,
                leftThigh: leftThigh,
                rightThigh: rightThigh,
                leftCalf: leftCalf,
                rightCalf: rightCalf,
                leftShoe: leftShoe,
                rightShoe: rightShoe,
                leftUpper: leftUpper,
                rightUpper: rightUpper,
                leftFore: leftFore,
                rightFore: rightFore,
                leftHand: leftHand,
                rightHand: rightHand,
                
                eyeL: eyeL,
                eyeR: eyeR,
                mouth: mouth,
                isBlinking: false,
                blinkTimer: 1.0 + Math.random() * 4.0,
                blinkDuration: 0.0,
                
                type: "sitting_stool",
                state: "sitting",
                homeX: x,
                homeY: y,
                homeZ: z,
                homeRotationY: rotationY,
                
                animOffset: Math.random() * 100,
                typeTimer: Math.random() * 2,
                lookTimer: Math.random() * 3,
                lookTargetY: 0,
                lookTargetX: 0,
                lookCurrY: 0,
                lookCurrX: 0,
                gesture: "none",
                gestureTimer: 2.0 + Math.random() * 5.0,
                targetPose: {
                    leftThigh:  { rx: -Math.PI / 2 },
                    rightThigh: { rx: -Math.PI / 2 },
                    leftCalf:   { rx: Math.PI / 2 },
                    rightCalf:  { rx: Math.PI / 2 },
                    leftShoe:   { rx: 0 },
                    rightShoe:  { rx: 0 },
                    leftUpper:  { rx: -0.8, rz: 0.15 },
                    rightUpper: { rx: -0.8, rz: -0.15 },
                    leftFore:   { rx: -0.5 },
                    rightFore:  { rx: -0.5 },
                    leftHand:   { rx: 0.2 },
                    rightHand:  { rx: 0.2 },
                    groupY: y
                }
            });
        }

        this.group.add(group);
    }

    _toStanding(emp) {
        emp.targetPose = {
            leftThigh:  { rx: 0 },
            rightThigh: { rx: 0 },
            leftCalf:   { rx: 0 },
            rightCalf:  { rx: 0 },
            leftShoe:   { rx: 0 },
            rightShoe:  { rx: 0 },
            leftUpper:  { rx: 0, rz: 0.05 },
            rightUpper: { rx: 0, rz: -0.05 },
            leftFore:   { rx: 0 },
            rightFore:  { rx: 0 },
            leftHand:   { rx: 0 },
            rightHand:  { rx: 0 },
            groupY: 1.0
        };
    }

    _toSitting(emp) {
        emp.targetPose = {
            leftThigh:  { rx: -Math.PI / 2 },
            rightThigh: { rx: -Math.PI / 2 },
            leftCalf:   { rx: Math.PI / 2 },
            rightCalf:  { rx: Math.PI / 2 },
            leftShoe:   { rx: 0 },
            rightShoe:  { rx: 0 },
            leftUpper:  { rx: -1.2, rz: 0.1 },
            rightUpper: { rx: -1.2, rz: -0.1 },
            leftFore:   { rx: -0.4 },
            rightFore:  { rx: -0.4 },
            leftHand:   { rx: 0.2 },
            rightHand:  { rx: 0.2 },
            groupY: emp.homeY
        };
    }

    /** Smoothly interpolate all limb positions/rotations toward targetPose */
    _lerpLimbs(emp, dt) {
        if (!emp.targetPose) return;
        const speed = 3.5; // lerp speed — lower = smoother
        const t = 1 - Math.exp(-speed * dt); // frame-rate independent lerp factor

        const _l = (cur, tgt) => cur + (tgt - cur) * t;

        const limbs = ['leftThigh','rightThigh','leftCalf','rightCalf','leftShoe','rightShoe',
                        'leftUpper','rightUpper','leftFore','rightFore','leftHand','rightHand'];

        for (const name of limbs) {
            const mesh = emp[name];
            const tgt = emp.targetPose[name];
            if (!mesh || !tgt) continue;
            if (tgt.rx !== undefined) mesh.rotation.x = _l(mesh.rotation.x, tgt.rx);
            if (tgt.ry !== undefined) mesh.rotation.y = _l(mesh.rotation.y, tgt.ry);
            if (tgt.rz !== undefined) mesh.rotation.z = _l(mesh.rotation.z, tgt.rz);
            if (tgt.px !== undefined) mesh.position.x = _l(mesh.position.x, tgt.px);
            if (tgt.py !== undefined) mesh.position.y = _l(mesh.position.y, tgt.py);
            if (tgt.pz !== undefined) mesh.position.z = _l(mesh.position.z, tgt.pz);
        }

        // Group Y (standing height vs sitting height)
        emp.group.position.y = _l(emp.group.position.y, emp.targetPose.groupY);
    }

    _generateWalkPath(emp, dest) {
        const path = [];
        path.push({ x: emp.homeX, z: emp.homeZ });
        let rowAisleZ = -4.5;
        if (emp.homeZ < -14.0) rowAisleZ = -14.25;
        else if (emp.homeZ < -9.0) rowAisleZ = -9.75;
        path.push({ x: emp.homeX, z: rowAisleZ });
        const corridorX = dest.x < 0 ? -7.0 : 7.0;
        path.push({ x: corridorX, z: rowAisleZ });
        path.push({ x: corridorX, z: dest.z });
        path.push({ x: dest.x, z: dest.z });
        return path;
    }

    update(dt) {
        const _lerp = (a, b, t) => a + (b - a) * t;
        const smoothT = 1 - Math.exp(-3.5 * dt); // frame-rate independent lerp factor

        this.employees.forEach(emp => {
            // ── 0. Smooth limb interpolation (always runs) ────
            this._lerpLimbs(emp, dt);

            // ── 1. AI Walking State Machine (desk employees only) ────
            if (emp.type === "sitting_desk") {
                if (emp.state === "sitting") {
                    emp.walkCooldown -= dt;
                    if (emp.walkCooldown <= 0) {
                        emp.state = "walking";
                        const dest = Math.random() < 0.5
                            ? { x: -8.0, z: -4.5 }
                            : { x: 8.5, z: -7.0 };
                        emp.path = this._generateWalkPath(emp, dest);
                        emp.pathIndex = 1;
                        this._toStanding(emp);
                        emp.walkCooldown = 35.0 + Math.random() * 25.0;
                    }
                } else if (emp.state === "walking" || emp.state === "returning") {
                    const target = emp.path[emp.pathIndex];
                    const dx = target.x - emp.group.position.x;
                    const dz = target.z - emp.group.position.z;
                    const dist = Math.sqrt(dx * dx + dz * dz);

                    // 1. Calculate Local Obstacle Avoidance Steering Forces
                    let avoidX = 0;
                    let avoidZ = 0;
                    const avoidRadius = 1.4; // Detection radius for steering away

                    // Avoid Boss
                    if (this.boss && this.boss.group.visible) {
                        const bx = this.boss.group.position.x;
                        const bz = this.boss.group.position.z;
                        const d = Math.hypot(emp.group.position.x - bx, emp.group.position.z - bz);
                        if (d < avoidRadius && d > 0.01) {
                            // Steer away from boss
                            const pushX = (emp.group.position.x - bx) / d;
                            const pushZ = (emp.group.position.z - bz) / d;
                            const weight = (avoidRadius - d) / avoidRadius;
                            avoidX += pushX * weight * 1.6;
                            avoidZ += pushZ * weight * 1.6;
                        }
                    }

                    // Avoid other active/moving employees
                    for (const other of this.employees) {
                        if (other === emp) continue;
                        if (other.state !== "sitting" || other.type === "sitting_stool") {
                            const ox = other.group.position.x;
                            const oz = other.group.position.z;
                            const d = Math.hypot(emp.group.position.x - ox, emp.group.position.z - oz);
                            if (d < avoidRadius && d > 0.01) {
                                // Steer away
                                const pushX = (emp.group.position.x - ox) / d;
                                const pushZ = (emp.group.position.z - oz) / d;
                                const weight = (avoidRadius - d) / avoidRadius;
                                avoidX += pushX * weight * 1.0;
                                avoidZ += pushZ * weight * 1.0;
                                
                                // Perpendicular bias to steer to the right of each other (like polite humans)
                                avoidX += -pushZ * weight * 0.4;
                                avoidZ += pushX * weight * 0.4;
                            }
                        }
                    }

                    // 2. Backup Hard Collision Blocking (to completely halt if directly behind someone/something)
                    let blocked = false;
                    const collisionDist = 1.0; // tighter bound since we steer to avoid
                    
                    if (this.boss && this.boss.group.visible) {
                        const bx = this.boss.group.position.x;
                        const bz = this.boss.group.position.z;
                        if (Math.hypot(emp.group.position.x - bx, emp.group.position.z - bz) < collisionDist) {
                            const dxBoss = bx - emp.group.position.x;
                            const dzBoss = bz - emp.group.position.z;
                            // Blocked if boss is directly in our path of travel
                            if ((dx / dist) * dxBoss + (dz / dist) * dzBoss > 0) blocked = true;
                        }
                    }
                    
                    if (!blocked) {
                        for (const other of this.employees) {
                            if (other === emp) continue;
                            if (other.state === "walking" || other.state === "returning" || other.state === "standing") {
                                const ox = other.group.position.x;
                                const oz = other.group.position.z;
                                if (Math.hypot(emp.group.position.x - ox, emp.group.position.z - oz) < collisionDist) {
                                    const dxOther = ox - emp.group.position.x;
                                    const dzOther = oz - emp.group.position.z;
                                    // Blocked if other employee is directly in front of us
                                    if ((dx / dist) * dxOther + (dz / dist) * dzOther > 0.2) {
                                        blocked = true;
                                        break;
                                    }
                                }
                            }
                        }
                    }

                    if (dist < 0.15) {
                        emp.pathIndex++;
                        if (emp.pathIndex >= emp.path.length) {
                            if (emp.state === "walking") {
                                emp.state = "standing";
                                emp.standTimer = 3.0 + Math.random() * 3.0;
                            } else {
                                emp.state = "sitting";
                                emp.group.position.set(emp.homeX, emp.homeY, emp.homeZ);
                                emp.group.rotation.set(0, emp.homeRotationY, 0);
                                this._toSitting(emp);
                            }
                        }
                    } else if (!blocked) {
                        const moveDist = emp.walkSpeed * dt;
                        const step = Math.min(moveDist, dist);
                        
                        // Normal step velocity vector towards target path node
                        let vx = (dx / dist) * step;
                        let vz = (dz / dist) * step;
                        
                        // Blend in the steering avoidance offset
                        vx += avoidX * dt * 2.0;
                        vz += avoidZ * dt * 2.0;
                        
                        // Limit final step speed to employee's walk speed
                        const finalSpeed = Math.hypot(vx, vz);
                        if (finalSpeed > moveDist) {
                            vx = (vx / finalSpeed) * moveDist;
                            vz = (vz / finalSpeed) * moveDist;
                        }
                        
                        emp.group.position.x += vx;
                        emp.group.position.z += vz;

                        // Smooth rotation toward movement direction (smooth steering facing)
                        const targetRotY = Math.atan2(vx, vz);
                        let angleDiff = targetRotY - emp.group.rotation.y;
                        angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
                        emp.group.rotation.y += angleDiff * smoothT * 2;

                        // Smooth walking bob
                        const bob = Math.abs(Math.sin(Date.now() * 0.008)) * 0.03;
                        emp.targetPose.groupY = 1.0 + bob;

                        // Walking leg & arm swing animation
                        const walkCycle = Date.now() * 0.006 + emp.animOffset;
                        const swing = Math.sin(walkCycle) * 0.35;

                        // Legs swing opposite to each other (centered at 0)
                        emp.targetPose.leftThigh.rx = swing;
                        emp.targetPose.rightThigh.rx = -swing;
                        emp.targetPose.leftCalf.rx = 0;
                        emp.targetPose.rightCalf.rx = 0;

                        // Arms swing opposite to legs
                        emp.targetPose.leftUpper.rx = -swing * 0.6;
                        emp.targetPose.rightUpper.rx = swing * 0.6;
                        emp.targetPose.leftFore.rx = 0;
                        emp.targetPose.rightFore.rx = 0;
                    } else {
                        // Smoothly return legs/arms to neutral standing pose when blocked
                        emp.targetPose.leftThigh.rx = 0;
                        emp.targetPose.rightThigh.rx = 0;
                        emp.targetPose.leftCalf.rx = 0;
                        emp.targetPose.rightCalf.rx = 0;
                        emp.targetPose.leftUpper.rx = 0;
                        emp.targetPose.rightUpper.rx = 0;
                        emp.targetPose.leftFore.rx = 0;
                        emp.targetPose.rightFore.rx = 0;
                    }
                } else if (emp.state === "standing") {
                    emp.standTimer -= dt;
                    const time = Date.now() * 0.001 + emp.animOffset;
                    emp.group.rotation.y += Math.sin(time * 0.8) * 0.001;

                    // Reset legs/arms to standing neutral when stopped
                    emp.targetPose.leftThigh.rx = 0;
                    emp.targetPose.rightThigh.rx = 0;
                    emp.targetPose.leftUpper.rx = 0;
                    emp.targetPose.rightUpper.rx = 0;
                    emp.targetPose.leftFore.rx = 0;
                    emp.targetPose.rightFore.rx = 0;

                    if (emp.standTimer <= 0) {
                        emp.state = "returning";
                        emp.path = [...emp.path].reverse();
                        emp.pathIndex = 1;
                    }
                }
            }

            // ── 2-5. All idle animations go through targetPose ─────
            // First, reset targetPose hands/forearms/upper to base values
            // so that animations can layer on top cleanly each frame
            if (emp.targetPose && (emp.state === "sitting" || emp.state === "standing")) {
                const isSitting = emp.state === "sitting";
                if (isSitting && emp.type === "sitting_desk") {
                    emp.targetPose.leftUpper.rx = -1.2; emp.targetPose.leftUpper.rz = 0.1;
                    emp.targetPose.rightUpper.rx = -1.2; emp.targetPose.rightUpper.rz = -0.1;
                    emp.targetPose.leftFore.rx = -0.4;
                    emp.targetPose.rightFore.rx = -0.4;
                    emp.targetPose.leftHand.rx = 0.2;
                    emp.targetPose.rightHand.rx = 0.2;
                } else if (isSitting && emp.type === "sitting_stool") {
                    emp.targetPose.leftUpper.rx = -0.8; emp.targetPose.leftUpper.rz = 0.15;
                    emp.targetPose.rightUpper.rx = -0.8; emp.targetPose.rightUpper.rz = -0.15;
                    emp.targetPose.leftFore.rx = -0.5;
                    emp.targetPose.rightFore.rx = -0.5;
                    emp.targetPose.leftHand.rx = 0.2;
                    emp.targetPose.rightHand.rx = 0.2;
                } else if (emp.state === "standing") {
                    emp.targetPose.leftUpper.rx = 0; emp.targetPose.leftUpper.rz = 0.05;
                    emp.targetPose.rightUpper.rx = 0; emp.targetPose.rightUpper.rz = -0.05;
                    emp.targetPose.leftFore.rx = 0;
                    emp.targetPose.rightFore.rx = 0;
                    emp.targetPose.leftHand.rx = 0;
                    emp.targetPose.rightHand.rx = 0;
                }
            }

            // ── Typing (desk employees, sitting) ───
            if (emp.type === "sitting_desk" && emp.state === "sitting" && emp.targetPose) {
                emp.typeTimer += dt;
                if (emp.typeTimer > (emp.isTyping ? 3.0 + Math.random() * 3 : 1.0 + Math.random() * 2)) {
                    emp.isTyping = !emp.isTyping;
                    emp.typeTimer = 0;
                }
                if (emp.isTyping) {
                    const time = Date.now() * 0.001 * emp.typeSpeed;
                    // Tapping is rapid rotation of forearms/hands
                    emp.targetPose.leftFore.rx = -0.4 + Math.sin(time) * 0.08;
                    emp.targetPose.rightFore.rx = -0.4 + Math.cos(time + 1.2) * 0.08;
                    emp.targetPose.leftHand.rx = 0.2 + Math.cos(time) * 0.05;
                    emp.targetPose.rightHand.rx = 0.2 + Math.sin(time + 1.2) * 0.05;
                }
            }

            // ── Stool hand gestures ───
            if (emp.type === "sitting_stool" && emp.targetPose) {
                const time = Date.now() * 0.001 + emp.animOffset;
                const amplitude = Math.max(0, Math.sin(time * 0.5) - 0.2) * 0.15;
                emp.targetPose.leftFore.rx = -0.5 + Math.sin(time * 3) * amplitude;
                emp.targetPose.rightFore.rx = -0.5 + Math.cos(time * 2.5) * amplitude;
            }

            // ── Head looking ─────────────────────
            if (emp.state === "walking" || emp.state === "returning") {
                emp.lookTargetY = 0;
                emp.lookTargetX = 0;
            } else {
                emp.lookTimer += dt;
                if (emp.lookTimer > 2.0 + Math.random() * 3.0) {
                    emp.lookTargetY = (Math.random() - 0.5) * 0.4;
                    emp.lookTargetX = (Math.random() - 0.3) * 0.3;
                    emp.lookTimer = 0;
                }
            }
            emp.lookCurrY = _lerp(emp.lookCurrY, emp.lookTargetY, smoothT);
            emp.lookCurrX = _lerp(emp.lookCurrX, emp.lookTargetX, smoothT);
            emp.head.rotation.y = emp.lookCurrY;
            emp.head.rotation.x = emp.lookCurrX;

            // ── Gestures (only when sitting or standing idle) ───
            if (emp.state !== "walking" && emp.state !== "returning" && emp.targetPose) {
                emp.gestureTimer -= dt;
                if (emp.gestureTimer <= 0) {
                    if (emp.gesture === "none") {
                        const r = Math.random();
                        if (r < 0.35) emp.gesture = "raising_hand";
                        else if (r < 0.65) emp.gesture = "chatting";
                        else emp.gesture = "none";
                        emp.gestureTimer = 2.0 + Math.random() * 3.0;
                    } else {
                        emp.gesture = "none";
                        emp.gestureTimer = 4.0 + Math.random() * 10.0;
                    }
                }

                const time = Date.now() * 0.001;

                if (emp.gesture === "raising_hand") {
                    // Raise upper arm and wave side-to-side
                    emp.targetPose.leftUpper.rx = -2.2;
                    emp.targetPose.leftUpper.rz = 0.1 + Math.sin(time * 3.0) * 0.15;
                    emp.targetPose.leftFore.rx = -0.2;
                } else if (emp.gesture === "chatting") {
                    // Conversational forearm wiggles
                    emp.targetPose.leftFore.rx = -0.6 + Math.sin(time * 2.5) * 0.2;
                    emp.targetPose.rightFore.rx = -0.6 + Math.cos(time * 2.2) * 0.2;
                    emp.lookTargetX = Math.sin(time * 2.5) * 0.05;
                }
            }

            // ── Face Reactions & Movements ─────────────────────
            if (emp.eyeL && emp.eyeR && emp.mouth) {
                // 1. Blinking timer update
                emp.blinkTimer -= dt;
                if (emp.blinkTimer <= 0) {
                    emp.isBlinking = true;
                    emp.blinkDuration = 0.12; // 120ms blink
                    emp.blinkTimer = 2.5 + Math.random() * 4.0;
                }
                if (emp.isBlinking) {
                    emp.blinkDuration -= dt;
                    if (emp.blinkDuration <= 0) {
                        emp.isBlinking = false;
                    }
                }

                // 2. State-based Expression Configurations
                let targetEyeScaleY = 1.0;
                let targetMouthScaleX = 1.0;
                let targetMouthScaleY = 1.0;

                const isBossPresent = this.boss && this.boss.group && this.boss.group.visible;

                if (isBossPresent) {
                    // Panic/alert expression: wide open eyes, small round mouth
                    targetEyeScaleY = 1.35;
                    targetMouthScaleX = 0.55;
                    targetMouthScaleY = 1.6;
                } else if (emp.isTyping && emp.state === "sitting") {
                    // Focused/working hard expression: slightly squinted eyes
                    targetEyeScaleY = 0.8;
                    targetMouthScaleX = 1.05;
                    targetMouthScaleY = 0.85;
                } else if (emp.gesture === "chatting") {
                    // Speaking/talking expression: mouth oscillates dynamically
                    const speakCycle = Date.now() * 0.015;
                    targetMouthScaleY = 0.6 + Math.abs(Math.sin(speakCycle)) * 2.2;
                    targetMouthScaleX = 0.8 + Math.cos(speakCycle) * 0.25;
                } else if (emp.gesture === "raising_hand") {
                    // Pleased/waving expression: wide smile
                    targetMouthScaleX = 1.25;
                    targetMouthScaleY = 0.6;
                }

                // Blink override
                if (emp.isBlinking) {
                    targetEyeScaleY = 0.08;
                }

                // 3. Smooth face lerping for organic animations
                const faceLerp = 1 - Math.exp(-14 * dt);
                emp.eyeL.scale.y += (targetEyeScaleY - emp.eyeL.scale.y) * faceLerp;
                emp.eyeR.scale.y += (targetEyeScaleY - emp.eyeR.scale.y) * faceLerp;
                
                emp.mouth.scale.x += (targetMouthScaleX - emp.mouth.scale.x) * faceLerp;
                emp.mouth.scale.y += (targetMouthScaleY - emp.mouth.scale.y) * faceLerp;
            }
        });
    }

    dispose() {
        this.scene.remove(this.group);
        this.group.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                else child.material.dispose();
            }
        });
        this.employees = [];
    }
}
