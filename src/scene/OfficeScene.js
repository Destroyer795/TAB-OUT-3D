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
        this._build();
        this.scene.add(this.group);
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

        // A grid of long light fixtures running along the Z axis
        const lightPositions = [
            [-5.0, -14.0], [-5.0, -6.0], [-5.0, 2.0],
            [ 5.0, -14.0], [ 5.0, -6.0], [ 5.0, 2.0],
            [ 0.0, -10.0], [ 0.0, -2.0]
        ];

        for (const [lx, lz] of lightPositions) {
            // Casing
            const casing = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.08, 3.2), fixtureMat);
            casing.position.set(lx, 5.96, lz);
            this.group.add(casing);

            // Glowing tube
            const tube = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.07, 3.0), glowMat);
            tube.position.set(lx, 5.92, lz);
            this.group.add(tube);
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
            new THREE.BoxGeometry(0.06, 2.0, 3.0),
            wallMat
        );
        leftWall.position.set(-1.8, 1.0, -1.0);
        this.group.add(leftWall);

        // Left wall top trim
        const leftTrim = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.04, 3.0),
            frameMat
        );
        leftTrim.position.set(-1.8, 2.0, -1.0);
        this.group.add(leftTrim);

        // Right wall
        const rightWall = new THREE.Mesh(
            new THREE.BoxGeometry(0.06, 2.0, 3.0),
            wallMat
        );
        rightWall.position.set(1.8, 1.0, -1.0);
        this.group.add(rightWall);

        const rightTrim = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.04, 3.0),
            frameMat
        );
        rightTrim.position.set(1.8, 2.0, -1.0);
        this.group.add(rightTrim);

        // Back wall (with gap for hallway view)
        // Left section
        const backLeft = new THREE.Mesh(
            new THREE.BoxGeometry(1.2, 2.0, 0.06),
            wallMat
        );
        backLeft.position.set(-1.2, 1.0, -2.5);
        this.group.add(backLeft);

        // Right section
        const backRight = new THREE.Mesh(
            new THREE.BoxGeometry(1.2, 2.0, 0.06),
            wallMat
        );
        backRight.position.set(1.2, 1.0, -2.5);
        this.group.add(backRight);

        // Upper transom (above the gap)
        const transom = new THREE.Mesh(
            new THREE.BoxGeometry(1.4, 0.5, 0.06),
            wallMat
        );
        transom.position.set(0, 2.25, -2.5);
        this.group.add(transom);
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

        // Left Wall
        const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.15, 6.0, 30.0), wallMat);
        leftWall.position.set(-12.0, 3.0, -5.0);
        this.group.add(leftWall);

        // Right Wall
        const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.15, 6.0, 30.0), wallMat);
        rightWall.position.set(12.0, 3.0, -5.0);
        this.group.add(rightWall);

        // Baseboards for distant walls
        const bbBack = new THREE.Mesh(new THREE.BoxGeometry(24, 0.15, 0.18), trimMat);
        bbBack.position.set(0, 0.075, -19.9);
        this.group.add(bbBack);

        const bbLeft = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.15, 30.0), trimMat);
        bbLeft.position.set(-11.9, 0.075, -5.0);
        this.group.add(bbLeft);

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
        this._createBackgroundCubicle(0.0, -7.5, 0); // Directly visible in the central opening
        this._createBackgroundCubicle(3.2, -7.5, 0);

        // Row 2 (z = -12.0)
        this._createBackgroundCubicle(-4.8, -12.0, 0);
        this._createBackgroundCubicle(-1.6, -12.0, 0);
        this._createBackgroundCubicle(1.6, -12.0, 0);
        this._createBackgroundCubicle(4.8, -12.0, 0);

        // Row 3 (z = -16.5)
        this._createBackgroundCubicle(-3.2, -16.5, 0);
        this._createBackgroundCubicle(0.0, -16.5, 0);
        this._createBackgroundCubicle(3.2, -16.5, 0);

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

        // Potted plants in empty spots
        this._createPlant(-6.5, 0, -10.0);
        this._createPlant(6.5, 0, -10.0);
    }

    /* ── Small Office Props ────────────────────────────── */
    _createOfficeProps() {
        // Coffee mug
        this._createMug(-0.9, 0.85, -0.5);

        // Desk lamp
        this._createLamp(1.0, 0.85, -0.85);

        // Stack of papers
        this._createPaperStack(-0.7, 0.85, -0.85);

        // Pen holder
        this._createPenHolder(0.85, 0.85, -0.45);

        // Sticky notes
        this._createStickyNote(-1.5, 1.5, -1.0);

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
        const metalMat = new THREE.MeshStandardMaterial({
            color: 0x555555,
            roughness: 0.3,
            metalness: 0.7,
        });

        // Base
        const base = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.1, 0.02, 12),
            metalMat
        );
        base.position.set(x, y + 0.01, z);
        this.group.add(base);

        // Arm
        const arm = new THREE.Mesh(
            new THREE.CylinderGeometry(0.01, 0.01, 0.4, 6),
            metalMat
        );
        arm.position.set(x, y + 0.22, z);
        arm.rotation.z = 0.2;
        this.group.add(arm);

        // Shade
        const shade = new THREE.Mesh(
            new THREE.ConeGeometry(0.08, 0.08, 12, 1, true),
            new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.7, side: THREE.DoubleSide })
        );
        shade.position.set(x + 0.08, y + 0.42, z);
        shade.rotation.z = 0.2;
        this.group.add(shade);
    }

    _createPaperStack(x, y, z) {
        const mat = new THREE.MeshStandardMaterial({ color: 0xf5f5f0, roughness: 0.95 });
        for (let i = 0; i < 5; i++) {
            const paper = new THREE.Mesh(
                new THREE.BoxGeometry(0.15, 0.004, 0.2),
                mat
            );
            paper.position.set(
                x + Math.random() * 0.02,
                y + 0.002 + i * 0.005,
                z + Math.random() * 0.02
            );
            paper.rotation.y = (Math.random() - 0.5) * 0.1;
            this.group.add(paper);
        }
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
        const colors = [0xfff176, 0xff8a80, 0x80d8ff];
        for (let i = 0; i < 3; i++) {
            const note = new THREE.Mesh(
                new THREE.PlaneGeometry(0.15, 0.15),
                new THREE.MeshStandardMaterial({
                    color: colors[i],
                    roughness: 0.9,
                    side: THREE.DoubleSide,
                })
            );
            note.position.set(x + i * 0.18, y + (i % 2) * 0.1, z + 0.01);
            this.group.add(note);
        }
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

        // Desk top
        const deskMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }); // Pure white desk top
        const desk = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.05, 0.8), deskMat);
        desk.position.set(0, 0.82, 0);
        cubicleGroup.add(desk);

        // Desk legs (simplified, lighter metal)
        const legMat = new THREE.MeshStandardMaterial({ color: 0xbac2cc, metalness: 0.5, roughness: 0.4 });
        const legGeo = new THREE.BoxGeometry(0.04, 0.82, 0.04);
        const legPositions = [
            [-0.75, 0.41, -0.35],
            [ 0.75, 0.41, -0.35],
            [-0.75, 0.41,  0.35],
            [ 0.75, 0.41,  0.35]
        ];
        for (const pos of legPositions) {
            const leg = new THREE.Mesh(legGeo, legMat);
            leg.position.set(pos[0], pos[1], pos[2]);
            cubicleGroup.add(leg);
        }

        // Cubicle partition walls (back and sides)
        const wallMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }); // Pure white fabric
        const frameMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.6, roughness: 0.3 }); // Extremely light gray trim

        // Back wall
        const backWall = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 0.04), wallMat);
        backWall.position.set(0, 0.7, -0.4);
        cubicleGroup.add(backWall);

        const backTrim = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.03, 0.06), frameMat);
        backTrim.position.set(0, 1.4, -0.4);
        cubicleGroup.add(backTrim);

        // Left wall
        const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.4, 0.8), wallMat);
        leftWall.position.set(-0.8, 0.7, 0);
        cubicleGroup.add(leftWall);

        const leftTrim = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 0.8), frameMat);
        leftTrim.position.set(-0.8, 1.4, 0);
        cubicleGroup.add(leftTrim);

        // Right wall
        const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.4, 0.8), wallMat);
        rightWall.position.set(0.8, 0.7, 0);
        cubicleGroup.add(rightWall);

        const rightTrim = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 0.8), frameMat);
        rightTrim.position.set(0.8, 1.4, 0);
        cubicleGroup.add(rightTrim);

        // Monitor
        const monMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
        
        // Let some screens be on (glowing spreadsheet green or blue)
        const screenOn = Math.random() > 0.4;
        const screenOnMat = new THREE.MeshBasicMaterial({ color: screenOn ? (Math.random() > 0.5 ? 0x22c55e : 0x3b82f6) : 0x0f172a });

        // Monitor body
        const monitor = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.3, 0.04), monMat);
        monitor.position.set(0, 1.0, -0.2);
        cubicleGroup.add(monitor);

        // Monitor screen face (facing towards the desk/chair, so towards +Z)
        const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.43, 0.28), screenOnMat);
        screen.position.set(0, 1.0, -0.178);
        cubicleGroup.add(screen);

        // Monitor stand
        const stand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.15, 0.08), monMat);
        stand.position.set(0, 0.9, -0.2);
        cubicleGroup.add(stand);

        // Keyboard (simple flat box, lighter gray)
        const kb = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.015, 0.12), new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8 }));
        kb.position.set(0, 0.835, 0.05);
        cubicleGroup.add(kb);

        // Chair (simple mesh, lighter gray fabric)
        const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.04, 0.35), new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.7 }));
        chairSeat.position.set(0, 0.45, 0.2);
        cubicleGroup.add(chairSeat);

        const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.4, 0.03), new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.7 }));
        chairBack.position.set(0, 0.7, 0.35);
        chairBack.rotation.x = 0.08;
        cubicleGroup.add(chairBack);

        const chairPost = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.25, 6), new THREE.MeshStandardMaterial({ color: 0x8fa0b5, metalness: 0.6 }));
        chairPost.position.set(0, 0.3, 0.2);
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

    dispose() {
        this.scene.remove(this.group);
        this.group.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                else child.material.dispose();
            }
        });
    }
}
