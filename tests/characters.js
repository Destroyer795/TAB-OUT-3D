import * as THREE from 'three';
import { createEmployee, createBoss } from '../src/scene/HumanoidRig.js';
import { BossCharacter } from '../src/scene/BossCharacter.js';
import { OfficeScene } from '../src/scene/OfficeScene.js';

const results = document.getElementById('qa-results');
const errors = [];
window.addEventListener('error', event => errors.push(event.message));
window.addEventListener('unhandledrejection', event => errors.push(String(event.reason)));
const oldError = console.error;
console.error = (...args) => { errors.push(args.map(String).join(' ')); oldError(...args); };
const lines = [];
const report = line => { lines.push(line); results.textContent = lines.join('\n'); console.log(line); };
const assert = (condition, label) => { if (!condition) throw new Error(label); report(`PASS · ${label}`); };
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
document.body.prepend(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x253349);
const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, .05, 100);
camera.position.set(0, 1.2, 6); camera.lookAt(0, .95, 0);
scene.add(new THREE.HemisphereLight(0xdceaff, 0x7f6f64, 2));
const key = new THREE.DirectionalLight(0xffe5ce, 3); key.position.set(3, 5, 4); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048); key.shadow.normalBias = .006;
key.shadow.camera.left = -4; key.shadow.camera.right = 4; key.shadow.camera.top = 4; key.shadow.camera.bottom = -4;
scene.add(key);
const rim = new THREE.DirectionalLight(0x93c5fd, 2); rim.position.set(-4, 3, -3); scene.add(rim);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: 0x344155, roughness: .95 }));
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
const figures = [createEmployee(0), createEmployee(3), createEmployee(2), createBoss()];
figures.forEach((human, i) => { human.root.position.x = (i - 1.5) * .9; human.root.rotation.y = i % 2 ? -.12 : .12; scene.add(human.root); });
let mode = 'stand', elapsed = 0, faceView = false;
const clock = new THREE.Clock();
const state = { isPaused: false };
window.__tabout3d = state;
const applyPose = pose => { mode = pose; figures.forEach(human => { human.setPose(pose === 'walk' ? 'stand' : pose); human.setSpeed(pose === 'walk' ? 1.2 : 0); human.setTalking(pose === 'sitTalk'); }); };
document.querySelectorAll('[data-pose]').forEach(button => button.onclick = () => applyPose(button.dataset.pose));
document.getElementById('face-view').onclick = () => {
    faceView = !faceView;
    camera.position.set(faceView ? -1.35 : 0, faceView ? 1.58 : 1.2, faceView ? .74 : 6);
    camera.lookAt(faceView ? -1.35 : 0, faceView ? 1.58 : .95, 0);
};
window.__characterLab = { applyPose, figures, camera, renderer, scene };
renderer.setAnimationLoop(() => {
    const dt = Math.min(.05, clock.getDelta()); elapsed += dt;
    if (!state.isPaused) figures.forEach((human, i) => {
        human.setTalking(mode === 'sitTalk' && Math.floor(elapsed / 4) % 4 === i);
        human.update(dt);
    });
    renderer.render(scene, camera);
});
report('Ready for close inspection.');

document.getElementById('run-qa').onclick = async () => {
    document.getElementById('run-qa').disabled = true;
    try {
        const human = createEmployee(0);
        scene.add(human.root);
        human.setPose('sitType', { snap: true });
        for (let i = 0; i < 120; i++) human.update(1 / 60);
        human.root.updateMatrixWorld(true);
        const wrist = new THREE.Vector3();
        human.arms[0].wr.getWorldPosition(wrist);
        assert(Math.abs(wrist.y - human.o.keyboard[1]) < .035, 'Typing hands reach keyboard height');
        assert(Math.abs(wrist.z - (human.o.keyboard[2] - .06)) < .04, 'Typing hands remain over keyboard');
        const initialPhase = human.phase;
        human.setPose('stand');
        for (let i = 0; i < 240; i++) { human.root.position.z += 1.2 / 60; human.update(1 / 60); }
        assert(Math.abs(human.phase - initialPhase) > .01, 'Walk cycle advances after standing from a chair');
        assert(human.walkW > .9, 'Movement activates full walking blend');
        human.setPose('sitType', { snap: true });
        human.setSpeed(0);
        human.update(1 / 60);
        const seatedHeight = human.hips.position.y;
        human.setPose('sitAlert');
        for (let i = 0; i < 90; i++) human.update(1 / 60);
        assert(Math.abs(human.hips.position.y - seatedHeight) < .015, 'Alert reaction preserves seated hip height');
        human.setPose('sitTalk', { snap: true }); human.setTalking(false);
        for (let i = 0; i < 120; i++) human.update(1 / 60);
        assert(human.talkingWeight < .001, 'Listeners settle into a quiet resting pose');
        human.setTalking(true); human.update(1 / 60);
        assert(human.talkingWeight > 0 && human.talkingWeight < .15, 'Speech gestures fade in smoothly');
        human.dispose();
        const snapshots = [];
        for (const fps of [30, 60, 144]) {
            const rig = createEmployee(0);
            rig.setPose('sitType', { snap: true }); rig.setPose('stand'); rig.setSpeed(1.2);
            for (let i = 0; i < fps * 3; i++) rig.update(1 / fps);
            snapshots.push({ hip: rig.hips.position.y, phase: rig.phase });
            rig.dispose();
        }
        assert(Math.max(...snapshots.map(s => s.hip)) - Math.min(...snapshots.map(s => s.hip)) < .012, 'Pose blending is consistent at 30 / 60 / 144 Hz');
        const officeScene = new THREE.Scene();
        const office = new OfficeScene(officeScene);
        const boss = new BossCharacter(officeScene); office.setBoss(boss);
        const heights = office.employees.map(emp => { emp.human.update(1 / 60); return emp.human.hips.position.y; });
        boss.show();
        assert(boss.human.speedOverride === null, 'Boss resumes stride detection after being hidden');
        for (let i = 0; i < 60; i++) office.update(1 / 60);
        assert(office.employees.every((emp, i) => Math.abs(emp.human.hips.position.y - heights[i]) < .025), 'All seated coworkers react without jumping out of chairs');
        boss.hide();
        for (let i = 0; i < 4200; i++) office.update(1 / 60);
        assert(office.employees.every(emp => Number.isFinite(emp.group.position.x) && Number.isFinite(emp.group.position.z)), 'Living routines remain finite through a 70-second shift');
        const scale = office.employees[0].human.root.scale.x;
        assert(Math.abs(office.employees[0].human.o.keyboard[1] * scale - .865) < .001, 'Keyboard IK targets account for character scale');
        office.dispose(); boss.dispose();
        assert(errors.length === 0, `No character runtime errors (${errors.length})`);
        applyPose('stand');
        report('CHARACTER QA COMPLETE');
        document.title = 'PASS · TAB-OUT 3D Character QA';
    } catch (error) { report(`FAIL · ${error.stack}`); document.title = 'FAIL · TAB-OUT 3D Character QA'; }
};
