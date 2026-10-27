import * as THREE from 'three';
import { disposeTree } from '../utils/DisposeUtils.js';

export class DeskInteractions {
    constructor(office, camera, canvas, onCoffee, isActive) {
        this.office = office;
        this.camera = camera;
        this.canvas = canvas;
        this.onCoffee = onCoffee;
        this.isActive = isActive;
        this.raycaster = new THREE.Raycaster();
        this.pointer = new THREE.Vector2();
        this.group = new THREE.Group();
        office.group.add(this.group);
        this.angle = 0; this.velocity = 0; this.time = 0; this.sip = 0;

        this.duck = new THREE.Group();
        this.duck.position.set(.64, .88, -.18);
        const yellow = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: .32 });
        const sphere = new THREE.SphereGeometry(1, 32, 24);
        const add = (material, position, scale) => {
            const mesh = new THREE.Mesh(sphere, material);
            mesh.position.set(...position); mesh.scale.set(...scale);
            mesh.castShadow = mesh.receiveShadow = true;
            this.duck.add(mesh);
            return mesh;
        };
        add(yellow, [0, .05, 0], [.075, .052, .09]);
        add(yellow, [0, .12, .025], [.047, .048, .045]);
        add(new THREE.MeshStandardMaterial({ color: 0xfb923c }), [0, .109, .069], [.032, .012, .031]);
        const black = new THREE.MeshStandardMaterial({ color: 0x0f172a });
        for (const x of [-.026, .026]) add(black, [x, .135, .06], [.005, .006, .004]);
        this.group.add(this.duck);

        // Soft translucent steam curls from the real mug.
        this.steam = new THREE.Group();
        const steamMat = new THREE.MeshBasicMaterial({ color: 0xe2f4ff, transparent: true, opacity: .16, depthWrite: false });
        for (let i = 0; i < 7; i++) {
            const puff = new THREE.Mesh(sphere, steamMat.clone());
            puff.scale.set(.012, .025, .012);
            this.steam.add(puff);
        }
        this.group.add(this.steam);
        this._click = event => this._interact(event, true);
        this._move = event => this._interact(event, false);
        canvas.addEventListener('pointerdown', this._click);
        canvas.addEventListener('pointermove', this._move);
    }

    _interact(event, click) {
        if (!this.isActive()) { this.canvas.style.cursor = ''; return; }
        const rect = this.canvas.getBoundingClientRect();
        this.pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2);
        this.raycaster.setFromCamera(this.pointer, this.camera);
        const targets = [this.office.coffeeMug, this.office.deskLamp, this.duck];
        const hit = this.raycaster.intersectObjects(targets, true)[0];
        this.canvas.style.cursor = hit ? 'pointer' : '';
        if (!click || !hit || event.button !== 0) return;
        let object = hit.object;
        while (object.parent && !targets.includes(object)) object = object.parent;
        if (object === this.office.coffeeMug) this.onCoffee();
        if (object === this.duck) this.velocity += 12;
        if (object === this.office.deskLamp) {
            const light = this.office.lampLight;
            light.intensity = light.intensity ? 0 : 1.4;
            this.office.lampBulb.emissive.setHex(light.intensity ? 0xffc078 : 0x000000);
        }
    }

    drink() { this.sip = 1; }

    reset() {
        this.sip = this.angle = this.velocity = 0;
        this.office.coffeeMug.position.y = .85;
        this.office.coffeeMug.rotation.z = 0;
    }

    update(dt) {
        this.time += dt;
        // Semi-implicit damped spring; stable with Game's capped delta.
        this.velocity += (-70 * this.angle - 7 * this.velocity) * dt;
        this.angle += this.velocity * dt;
        this.duck.rotation.z = this.angle;
        this.sip = Math.max(0, this.sip - dt * 1.5);
        const lift = Math.sin(this.sip * Math.PI);
        this.office.coffeeMug.position.y = .85 + lift * .23;
        this.office.coffeeMug.rotation.z = -lift * .3;
        this.steam.children.forEach((puff, i) => {
            const phase = (this.time * .38 + i / 7) % 1;
            puff.position.set(-.9 + Math.sin(phase * 7 + i) * .018, 1 + phase * .23, -.5 + Math.cos(phase * 6 + i) * .012);
            puff.material.opacity = Math.sin(phase * Math.PI) * .17;
        });
    }

    dispose() {
        this.canvas.removeEventListener('pointerdown', this._click);
        this.canvas.removeEventListener('pointermove', this._move);
        this.group.removeFromParent();
        disposeTree(this.group);
    }
}
