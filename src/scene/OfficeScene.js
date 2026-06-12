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
        const geo = new THREE.PlaneGeometry(20, 20);
        const mat = new THREE.MeshStandardMaterial({
            color: 0xe2e7ec, // Bright modern office carpet
            roughness: 0.9,
            metalness: 0.0,
        });
        const floor = new THREE.Mesh(geo, mat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0;
        this.group.add(floor);

        // Carpet pattern (subtle grid lines)
        const lineGeo = new THREE.PlaneGeometry(20, 0.01);
        const lineMat = new THREE.MeshBasicMaterial({ color: 0xccd4dd, transparent: true, opacity: 0.45 });
        for (let i = -10; i < 10; i += 0.5) {
            const h = new THREE.Mesh(lineGeo, lineMat);
            h.rotation.x = -Math.PI / 2;
            h.position.set(0, 0.005, i);
            this.group.add(h);

            const v = lineGeo.clone();
            const vMesh = new THREE.Mesh(v, lineMat);
            vMesh.rotation.x = -Math.PI / 2;
            vMesh.rotation.z = Math.PI / 2;
            vMesh.position.set(i, 0.005, 0);
            this.group.add(vMesh);
        }
    }

    /* ── Ceiling ───────────────────────────────────────── */
    _createCeiling() {
        const geo = new THREE.PlaneGeometry(20, 20);
        const mat = new THREE.MeshStandardMaterial({
            color: 0xe8e8e8,
            roughness: 0.95,
        });
        const ceiling = new THREE.Mesh(geo, mat);
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.y = 6;
        this.group.add(ceiling);

        // Ceiling tiles pattern
        const tileMat = new THREE.MeshStandardMaterial({
            color: 0xdddddd,
            roughness: 0.9,
        });
        for (let x = -8; x <= 8; x += 2) {
            for (let z = -8; z <= 8; z += 2) {
                const tile = new THREE.Mesh(
                    new THREE.BoxGeometry(1.9, 0.05, 1.9),
                    tileMat
                );
                tile.position.set(x, 5.95, z);
                this.group.add(tile);
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
            color: 0xf1f3f5, // Bright modern cubicle walls
            roughness: 0.85,
        });
        const frameMat = new THREE.MeshStandardMaterial({
            color: 0xb2bac2, // Polished aluminum/chrome frame
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

    /* ── Hallway ───────────────────────────────────────── */
    _createHallway() {
        const wallMat = new THREE.MeshStandardMaterial({
            color: 0xf1f3f5,
            roughness: 0.9,
        });

        // Hallway floor (matching carpet)
        const hallFloor = new THREE.Mesh(
            new THREE.PlaneGeometry(14, 4),
            new THREE.MeshStandardMaterial({ color: 0xdde2e7, roughness: 0.85 })
        );
        hallFloor.rotation.x = -Math.PI / 2;
        hallFloor.position.set(0, 0.01, -4.5);
        this.group.add(hallFloor);

        // Hallway ceiling
        const hallCeil = new THREE.Mesh(
            new THREE.PlaneGeometry(14, 4),
            new THREE.MeshStandardMaterial({ color: 0xf8f9fa, roughness: 0.95 })
        );
        hallCeil.rotation.x = Math.PI / 2;
        hallCeil.position.set(0, 5.99, -4.5);
        this.group.add(hallCeil);

        // ── CITY SKYLINE BACKGROUND ──────────────────────────
        // Giant sky plane
        const skyGeo = new THREE.PlaneGeometry(60, 40);
        const skyMat = new THREE.MeshBasicMaterial({ color: 0xa8c0ff }); // Sunny office-sky blue
        const sky = new THREE.Mesh(skyGeo, skyMat);
        sky.position.set(0, 10, -15.0);
        this.group.add(sky);

        // Low-poly office towers
        const buildingMat1 = new THREE.MeshStandardMaterial({ color: 0xf8f9fa, roughness: 0.6 });
        const buildingMat2 = new THREE.MeshStandardMaterial({ color: 0xe9ecef, roughness: 0.6 });
        const buildingMat3 = new THREE.MeshStandardMaterial({ color: 0xdee2e6, roughness: 0.6 });
        const windowMat = new THREE.MeshStandardMaterial({ color: 0x4a5568, roughness: 0.3 });

        // Tower 1 (Left background)
        const tower1 = new THREE.Mesh(new THREE.BoxGeometry(4.0, 16.0, 4.0), buildingMat2);
        tower1.position.set(-6.5, 7.0, -13.5);
        this.group.add(tower1);
        for (let y = 1.0; y < 14.0; y += 2.0) {
            const strip = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.4, 0.1), windowMat);
            strip.position.set(-6.5, y, -11.4);
            this.group.add(strip);
        }

        // Tower 2 (Center-right main tower)
        const tower2 = new THREE.Mesh(new THREE.BoxGeometry(5.0, 22.0, 5.0), buildingMat1);
        tower2.position.set(3.5, 9.0, -14.0);
        this.group.add(tower2);
        for (let y = 1.0; y < 19.0; y += 2.5) {
            const strip = new THREE.Mesh(new THREE.BoxGeometry(5.1, 0.5, 0.1), windowMat);
            strip.position.set(3.5, y, -11.4);
            this.group.add(strip);
        }

        // Tower 3 (Center background, shorter)
        const tower3 = new THREE.Mesh(new THREE.BoxGeometry(3.0, 12.0, 3.0), buildingMat3);
        tower3.position.set(-1.0, 5.0, -13.8);
        this.group.add(tower3);
        for (let y = 1.0; y < 10.0; y += 1.8) {
            const strip = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.3, 0.1), windowMat);
            strip.position.set(-1.0, y, -12.2);
            this.group.add(strip);
        }

        // ── GLASS WINDOW WALL ─────────────────────────────────
        // Lower sill
        const sill = new THREE.Mesh(new THREE.BoxGeometry(14, 1.2, 0.2), wallMat);
        sill.position.set(0, 0.6, -6.5);
        this.group.add(sill);

        // Upper header
        const header = new THREE.Mesh(new THREE.BoxGeometry(14, 1.0, 0.2), wallMat);
        header.position.set(0, 5.5, -6.5);
        this.group.add(header);

        // Side pillars
        const pillarL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 6, 0.2), wallMat);
        pillarL.position.set(-6.85, 3.0, -6.5);
        this.group.add(pillarL);

        const pillarR = new THREE.Mesh(new THREE.BoxGeometry(0.3, 6, 0.2), wallMat);
        pillarR.position.set(6.85, 3.0, -6.5);
        this.group.add(pillarR);

        // Vertical Mullions (charcoal window dividers)
        const mullionGeo = new THREE.BoxGeometry(0.08, 4.3, 0.12);
        const mullionMat = new THREE.MeshStandardMaterial({ color: 0x4a5568, roughness: 0.5 });
        const xPositions = [-4.5, -1.5, 1.5, 4.5];
        for (const x of xPositions) {
            const mullion = new THREE.Mesh(mullionGeo, mullionMat);
            mullion.position.set(x, 3.15, -6.45);
            this.group.add(mullion);
        }

        // Transom horizontal bar
        const transomBar = new THREE.Mesh(new THREE.BoxGeometry(14, 0.08, 0.12), mullionMat);
        transomBar.position.set(0, 3.15, -6.45);
        this.group.add(transomBar);

        // Semi-transparent window glass
        const glassGeo = new THREE.PlaneGeometry(14, 4.3);
        const glassMat = new THREE.MeshStandardMaterial({
            color: 0x90caf9,
            transparent: true,
            opacity: 0.18,
            roughness: 0.1,
            metalness: 0.9,
            side: THREE.DoubleSide
        });
        const glass = new THREE.Mesh(glassGeo, glassMat);
        glass.position.set(0, 3.15, -6.42);
        this.group.add(glass);
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

        // Water cooler in hallway
        this._createWaterCooler(4, 0, -5.0);
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
