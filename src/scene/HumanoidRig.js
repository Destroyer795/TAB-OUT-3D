/* ==========================================================================
 *  HumanoidRig.js — procedural, fully rigged, animated humans for Three.js
 *  No external assets.  Character faces +Z, stands on y = 0, units = metres
 *  (scale the whole figure with `height`).  Character's LEFT hand is at +X.
 *
 *  const boss = createBoss({ height: 1.9 * S });
 *  scene.add(boss.root);  boss.root.position.set(...);
 *  boss.setPose('patrol');            // every frame:  boss.update(dt);
 *
 *  Walking is automatic: move/rotate `root` and the feet plant, the stride
 *  length and cadence follow your speed (no sliding), arms counter-swing.
 * ========================================================================== */
import * as THREE from 'three';

const { Vector2: V2, Vector3: V3, Quaternion: Q, Matrix4: M4, Euler: E } = THREE;
const clamp = THREE.MathUtils.clamp;
const lerp = THREE.MathUtils.lerp;
const damp = (a, b, k, dt) => b + (a - b) * Math.exp(-k * dt);
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);
const merge = (a, b) => { const o = { ...a }; for (const k in b) o[k] = isObj(b[k]) && isObj(a[k]) ? merge(a[k], b[k]) : b[k]; return o; };

/* ───────────────────────── body dimensions (metres) ───────────────────── */
const K = {
  THIGH: 0.45, SHIN: 0.43, ANKLE: 0.08, HIP_W: 0.095,
  SPINE_Y: 0.08, SH_W: 0.20, SH_Y: 0.395, NECK_Y: 0.46, HEAD_Y: 0.09,
  UARM: 0.29, FARM: 0.26,
  HIP_STAND: 0.93, HIP_WALK: 0.89, SEAT: 0.55,
  BASE_HEIGHT: 1.78,
};
const HX = 0.082, HY = 0.108, HZ = 0.095;   // skull half-extents

/* ───────────────────────── geometry helpers ───────────────────────────── */
const UNIT_SPHERE = new THREE.SphereGeometry(1, 22, 16);
const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const SHARED = new Set([UNIT_SPHERE, UNIT_BOX]);

function lathe(prof, seg = 28) {
  const pts = new THREE.SplineCurve(prof.map(([r, y]) => new V2(r, y))).getPoints(prof.length * 5);
  pts.unshift(new V2(0.0005, pts[0].y));
  pts.push(new V2(0.0005, pts[pts.length - 1].y));
  return new THREE.LatheGeometry(pts, seg);
}

/** Tapered capsule hanging down from y=0 to y=-len (rounded ends hide joints). */
function limbGeo(len, r0, r1, bulge = 0.08, seg = 18) {
  const pts = [];
  for (let i = 0; i <= 5; i++) { const a = (i / 5) * Math.PI / 2; pts.push(new V2(Math.sin(a) * r1, -(len - r1) - Math.cos(a) * r1)); }
  for (let i = 1; i <= 8; i++) {
    const t = i / 8, y = -(len - r1) + t * (len - r1 - r0);
    pts.push(new V2(lerp(r1, r0, t) * (1 + bulge * Math.sin(Math.PI * t)), y));
  }
  for (let i = 1; i <= 5; i++) { const a = (i / 5) * Math.PI / 2; pts.push(new V2(Math.cos(a) * r0, -r0 + Math.sin(a) * r0)); }
  return new THREE.LatheGeometry(pts, seg);
}

const jawK = (Y) => sstep(0.05, -0.95, Y);
const szK = (j, front) => 1 - 0.10 * j + (front ? 0.06 * j * j : 0);
function headGeo() {
  const g = new THREE.SphereGeometry(1, 44, 32);
  const p = g.attributes.position, n = g.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    const X = p.getX(i), Y = p.getY(i), Z = p.getZ(i), j = jawK(Y);
    const x = X * (1 - 0.24 * j) * HX, y = Y * HY, z = Z * szK(j, Z > 0) * HZ;
    p.setXYZ(i, x, y, z);
    const nv = new V3(x / (HX * HX), y / (HY * HY), z / (HZ * HZ)).normalize();
    n.setXYZ(i, nv.x, nv.y, nv.z);
  }
  return g;
}
/** z of the skull surface at (x,y) — used to seat the face features precisely. */
function headZ(x, y) {
  const Y = clamp(y / HY, -0.999, 0.999), j = jawK(Y);
  const X = x / (HX * (1 - 0.24 * j)), Z2 = 1 - X * X - Y * Y;
  return Z2 <= 0 ? 0 : HZ * Math.sqrt(Z2) * szK(j, true);
}

/* ───────────────────────── two-bone IK (parent space) ─────────────────── */
const _d = new V3(), _p = new V3(), _Kn = new V3(), _T = new V3(), _u1 = new V3(), _u2 = new V3();
const _x = new V3(), _y = new V3(), _z = new V3(), _bm = new M4();
/**
 * Solves upper/lower so the chain end reaches `target` (in upper's parent space).
 * `pole` = direction the middle joint points to. bend=+1 knee-like, -1 elbow-like.
 * Writes upper.quaternion; returns the middle-joint flexion about local X.
 */
function solveLimb(upper, target, pole, bend, L1, L2) {
  const H = upper.position;
  _d.subVectors(target, H);
  let dist = _d.length();
  if (dist < 1e-5) { _d.set(0, -1, 0); dist = 1e-5; } else _d.divideScalar(dist);
  dist = clamp(dist, Math.abs(L1 - L2) + 0.01, (L1 + L2) * 0.998);
  const a = (L1 * L1 - L2 * L2 + dist * dist) / (2 * dist);
  const h = Math.sqrt(Math.max(L1 * L1 - a * a, 0));
  _p.copy(pole).addScaledVector(_d, -pole.dot(_d));
  if (_p.lengthSq() < 1e-8) _p.set(1, 0, 0).addScaledVector(_d, -_d.x);
  _p.normalize();
  _Kn.copy(H).addScaledVector(_d, a).addScaledVector(_p, h);
  _T.copy(H).addScaledVector(_d, dist);
  _u1.subVectors(_Kn, H).normalize();
  _u2.subVectors(_T, _Kn).normalize();
  _y.copy(_u1).negate();
  _z.copy(_p).multiplyScalar(bend); _z.addScaledVector(_y, -_z.dot(_y)).normalize();
  _x.crossVectors(_y, _z);
  _bm.makeBasis(_x, _y, _z);
  upper.quaternion.setFromRotationMatrix(_bm);
  return Math.atan2(-_z.dot(_u2), -_y.dot(_u2));
}

/* ───────────────────────── poses & expressions ────────────────────────── */
const BASE_G = { sit: 0, spX: 0.02, spY: 0, spZ: 0, hdX: 0, hdY: 0, hdZ: 0, stance: 0, stagger: 0, hipDrop: 0, talk: 0, type: 0, panic: 0 };
const ARM0 = { sX: 0.04, sZ: 0.10, tw: 0, el: -0.22, pro: 0.30, wX: 0, wZ: 0, curl: 0.30, ik: 0, point: 0, swing: 1 };
const pose = (g, L, R, expr = 'neutral') => ({ g: { ...BASE_G, ...g }, L: { ...ARM0, ...L }, R: { ...ARM0, ...(R || L) }, expr });

const HANDS_BACK = { sX: 0.5, sZ: 0.02, tw: -1.25, el: -1.15, pro: 0.2, curl: 0.5, swing: 0 };
const CROSS_L = { sX: -0.55, sZ: -0.02, tw: -1.2, el: -1.85, pro: 0.9, curl: 0.7, swing: 0 };
const CROSS_R = { sX: -0.70, sZ: -0.02, tw: -1.2, el: -1.7, pro: 0.9, curl: 0.7, swing: 0 };
const RELAX_SIT = { sX: -0.25, sZ: 0.05, el: -0.95, pro: 0.9, curl: 0.35 };
const TALK_ARM = { sX: -0.45, sZ: 0.12, el: -1.25, pro: 0.8, curl: 0.4 };

export const POSES = {
  stand: pose({}, {}),
  patrol: pose({ spX: -0.02, hdX: -0.04 }, HANDS_BACK),                              // hands clasped behind back
  carry: pose({}, {}, { sX: 0.03, sZ: 0.05, el: -0.12, pro: 0.35, curl: 1.25, swing: 0.2 }),   // right hand holds a case
  sitType: pose({ sit: 1, spX: 0.15, hdX: 0.14, type: 1 }, { ik: 1, curl: 0.5, sX: -0.5, el: -1.3, pro: 1.4 }, null, 'focus'),
  sitIdle: pose({ sit: 1, spX: 0.06 }, RELAX_SIT),
  sitTalk: pose({ sit: 1, spX: 0.05, talk: 1 }, TALK_ARM),
  standTalk: pose({ talk: 1, stance: 0.02 }, TALK_ARM),
  interrogate: pose({ spX: 0.2, hdX: 0.14, stance: 0.045, stagger: 0.14 }, CROSS_L, CROSS_R, 'scowl'),
  point: pose({ spX: 0.12, hdX: 0.06, stagger: 0.12, stance: 0.04 },
    { sX: -0.1, sZ: 0.55, tw: -0.9, el: -1.4, pro: 1.0, curl: 1.1, swing: 0 },
    { sX: -1.35, sZ: 0.12, el: -0.12, pro: 1.3, curl: 1.2, point: 1, swing: 0 }, 'scowl'),
  panic: pose({ spX: -0.1, hdX: -0.1, hdZ: 0.06, stance: 0.03, panic: 1 }, { sX: -0.85, sZ: 0.4, el: -1.5, pro: 0.4, curl: 0.9, swing: 0 }, null, 'shock'),
};
export const EXPRESSIONS = {
  neutral: { brow: 0, furrow: 0, smile: 0.05, mouth: 0, lid: 0.9 },
  focus: { brow: -0.1, furrow: 0.25, smile: 0, mouth: 0, lid: 0.7 },
  scowl: { brow: -0.3, furrow: 1, smile: -0.8, mouth: 0, lid: 0.68 },
  smile: { brow: 0.2, furrow: 0, smile: 0.9, mouth: 0, lid: 0.85 },
  shock: { brow: 1, furrow: 0, smile: 0, mouth: 0.75, lid: 1.28 },
};

/* ───────────────────────── defaults & presets ─────────────────────────── */
const DEFAULTS = {
  name: 'Human', height: K.BASE_HEIGHT, gender: 'm', seed: 1, shadows: true,
  body: { shoulder: 1, waist: 1, hip: 1, chest: 1 },
  skin: 0xd8a47f, eye: 0x4b3621,
  hair: { style: 'crop', color: 0x2a1a10 },
  outfit: { type: 'shirt', top: 0x3b6ea5, shirt: 0xf2f2ee, pants: 0x2b2f3a, shoes: 0x16161a, tie: 0x7a1530 },
  acc: { glasses: false, headphones: false, watch: false, briefcase: false, lanyard: null, mustache: false },
  keyboard: [0, 0.76, 0.40],   // palm-centre target for typing, model metres, relative to root (floor under chair)
  seatHeight: K.SEAT,          // hip height above floor when sitting
  walkSpeedScale: 1,
};

export function createBoss(opts = {}) {
  return new Human(merge({
    name: 'Boss', height: 1.9, seed: 99, body: { shoulder: 1.1, waist: 1.12, hip: 1.04, chest: 1.06 },
    skin: 0xd2a07c, eye: 0x2e2a26, hair: { style: 'slick', color: 0x2c2c30 },
    outfit: { type: 'suit', top: 0x14213d, shirt: 0xf6f6f2, pants: 0x14213d, shoes: 0x0c0c0e, tie: 0x8c1c2c },
    acc: { glasses: true, watch: true, briefcase: true },
  }, opts));
}

const LOOKS = [
  { gender: 'm', skin: 0xe8b997, hair: { style: 'crop', color: 0x2b1d14 }, outfit: { type: 'shirt', top: 0x4f7cac, pants: 0x2d3340 }, acc: { glasses: true, lanyard: 0x06b6d4 }, height: 1.80 },
  { gender: 'f', skin: 0xc68b63, hair: { style: 'bob', color: 0x1c1410 }, outfit: { type: 'shirt', top: 0xf1ede4, pants: 0x30343f }, acc: { headphones: true, lanyard: 0x6366f1 }, height: 1.66, body: { shoulder: 0.9, waist: 0.9, hip: 1.06, chest: 1.02 } },
  { gender: 'm', skin: 0x8d5a3b, hair: { style: 'curly', color: 0x120c08 }, outfit: { type: 'sweater', top: 0x5a6b4f, pants: 0x3a3a3f }, acc: { lanyard: 0x10b981 }, height: 1.84, body: { shoulder: 1.05, waist: 1.04, hip: 1, chest: 1.04 } },
  { gender: 'f', skin: 0xf0c9ad, hair: { style: 'bun', color: 0x6b3e22 }, outfit: { type: 'shirt', top: 0x9b5c7a, pants: 0x25272e }, acc: { glasses: true, lanyard: 0xf59e0b }, height: 1.64, body: { shoulder: 0.9, waist: 0.88, hip: 1.08, chest: 1.04 } },
  { gender: 'm', skin: 0xd9a47e, hair: { style: 'pomp', color: 0x3a2a1c }, outfit: { type: 'shirt', top: 0xcdd3dc, pants: 0x3b3f4a }, acc: { headphones: true, lanyard: 0x06b6d4 }, height: 1.76 },
  { gender: 'f', skin: 0xa86f4c, hair: { style: 'long', color: 0x20140e }, outfit: { type: 'sweater', top: 0x7a5aa8, pants: 0x2a2a30 }, acc: { lanyard: 0x6366f1 }, height: 1.70, body: { shoulder: 0.92, waist: 0.9, hip: 1.06, chest: 1.03 } },
  { gender: 'm', skin: 0xf0c4a4, hair: { style: 'crop', color: 0x8a5a2b }, outfit: { type: 'shirt', top: 0x2f7d6d, pants: 0x30343c }, acc: { glasses: true, mustache: true, lanyard: 0x10b981 }, height: 1.78 },
  { gender: 'f', skin: 0x6f4630, hair: { style: 'curly', color: 0x0e0907 }, outfit: { type: 'shirt', top: 0xd9893a, pants: 0x262a33 }, acc: { lanyard: 0xf59e0b }, height: 1.68, body: { shoulder: 0.9, waist: 0.9, hip: 1.05, chest: 1.02 } },
];
export function createEmployee(index = 0, opts = {}) {
  const look = LOOKS[index % LOOKS.length];
  return new Human(merge(merge({ name: 'Employee' + index, seed: index + 3 }, look), opts));
}

/* ═══════════════════════════════ Human ═══════════════════════════════════ */
export class Human {
  constructor(opts = {}) {
    this.o = merge(DEFAULTS, opts);
    this.root = new THREE.Group(); this.root.name = this.o.name;
    this._mats = new Map(); this._geos = [];
    this.rng = mulberry32(this.o.seed * 7919 + 13);
    this.time = this.rng() * 50; this.phase = this.rng();
    this.t = {}; this.s = {}; this.rate = 7;
    this.speed = 0; this.speedOverride = null; this.walkW = 0;
    this._prev = new V3(); this._first = true;
    this.lookTarget = null; this.talking = false; this.poseName = 'stand';
    this._gaze = { yaw: 0, pit: 0 };
    this._blink = { next: 1 + this.rng() * 3, age: 9 };
    this._sac = { next: 0, yaw: 0, pit: 0 };
    this._invHips = new M4(); this._invSpine = new M4();
    this._build();
    this.root.scale.setScalar(this.o.height / K.BASE_HEIGHT);
    this.setPose('stand', { snap: true });
  }

  /* ───────────── public API ───────────── */
  /** name ∈ POSES. opts: { snap:true (no blend), expr:false (keep face) } */
  setPose(name, opts = {}) {
    const P = POSES[name]; if (!P) throw new Error('Unknown pose ' + name);
    this.poseName = name;
    const t = { ...P.g };
    for (const sd of ['L', 'R']) for (const k in P[sd]) t[sd + '.' + k] = P[sd][k];
    Object.assign(this.t, t);
    if (opts.expr !== false) this.setExpression(P.expr, opts);
    if (opts.snap) Object.assign(this.s, this.t);
    for (const k in this.t) if (this.s[k] === undefined) this.s[k] = this.t[k];
    return this;
  }
  setExpression(name, opts = {}) {
    const X = EXPRESSIONS[name]; if (!X) throw new Error('Unknown expression ' + name);
    for (const k in X) this.t['e.' + k] = X[k];
    if (opts.snap) for (const k in X) this.s['e.' + k] = X[k];
    return this;
  }
  /** Vector3 | Object3D (world space) | null */
  lookAt(target) { this.lookTarget = target || null; return this; }
  setTalking(on) { this.talking = !!on; return this; }
  /** force walk speed in model m/s (null = auto-detect from root movement) */
  setSpeed(v) { this.speedOverride = v; return this; }
  getHeadWorld(out = new V3()) { return this.skull.getWorldPosition(out); }

  dispose() {
    this._geos.forEach((g) => g.dispose());
    this._mats.forEach((m) => m.dispose());
    this.root.removeFromParent();
  }

  /* ───────────── build ───────────── */
  _mat(color, rough = 0.7, metal = 0, extra = null) {
    const key = [color, rough, metal, extra ? JSON.stringify(extra) : ''].join('|');
    let m = this._mats.get(key);
    if (!m) { m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...(extra || {}) }); this._mats.set(key, m); }
    return m;
  }
  _m(parent, geo, mat, p = [0, 0, 0], s = null, r = null, cast = true) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(p[0], p[1], p[2]);
    if (s) m.scale.set(s[0], s[1], s[2]);
    if (r) m.rotation.set(r[0], r[1], r[2]);
    m.castShadow = cast && this.o.shadows;
    parent.add(m);
    if (!SHARED.has(geo)) this._geos.push(geo);
    return m;
  }
  _e(parent, mat, r, p, rot, cast) { return this._m(parent, UNIT_SPHERE, mat, p, r, rot, cast); }
  _b(parent, mat, size, p, rot, cast) { return this._m(parent, UNIT_BOX, mat, p, size, rot, cast); }
  _g(parent, x = 0, y = 0, z = 0) { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; }

  _build() {
    const o = this.o, b = o.body, out = o.outfit, acc = o.acc, f = o.gender === 'f';
    const suit = out.type === 'suit', lw = f ? 0.93 : 1;
    const M = (c, r, m, e) => this._mat(c, r, m, e);
    const skin = M(o.skin, 0.58);
    const top = M(out.top, suit ? 0.72 : 0.86);
    const shirt = M(out.shirt, 0.85);
    const pants = M(out.pants, 0.8);
    const shoeM = M(out.shoes, suit ? 0.2 : 0.5, suit ? 0.12 : 0);
    const soleM = M(0x151515, 0.9);
    const gold = M(0xd4af37, 0.25, 0.9);
    const leather = M(0x2a1a12, 0.45);
    this._skin = skin;

    const root = this.root;
    const hips = this.hips = this._g(root, 0, K.HIP_STAND, 0);
    const spine = this.spine = this._g(hips, 0, K.SPINE_Y, 0);
    const torsoG = this.torsoG = this._g(spine);
    const neck = this.neck = this._g(spine, 0, K.NECK_Y, 0);
    const head = this.head = this._g(neck, 0, K.HEAD_Y, 0);
    const skull = this.skull = this._g(head, 0, 0.10, 0);

    /* pelvis + belt */
    this._e(hips, pants, [0.165 * b.hip, 0.115, 0.115], [0, -0.01, 0]);
    if (!suit) this._m(hips, new THREE.CylinderGeometry(1, 1, 0.032, 26), M(0x1b1b1d, 0.5), [0, 0.085, 0], [0.153 * b.hip, 1, 0.153 * b.hip * 0.66]);

    /* torso profile (spine-local y → half-width) */
    const prof = (grow, hem) => {
      const P = [[0.150 * b.hip, -0.075], [0.152 * b.hip, -0.01], [0.138 * b.waist, 0.08], [0.150 * b.chest, 0.19],
        [0.168 * b.chest * (f ? 1.04 : 1), 0.29], [0.172 * b.shoulder, 0.355], [0.150 * b.shoulder, 0.405], [0.090, 0.44], [0.056, 0.47]]
        .map(([r, y]) => [r + grow, y]);
      if (hem) P.unshift([0.170 * b.hip + grow, -0.17], [0.162 * b.hip + grow, -0.12]);
      return P;
    };
    const radiusAt = (y, grow) => {
      const P = prof(grow, false);
      for (let i = 1; i < P.length; i++) if (y <= P[i][1]) { const t = (y - P[i - 1][1]) / (P[i][1] - P[i - 1][1]); return lerp(P[i - 1][0], P[i][0], t); }
      return P[P.length - 1][0];
    };
    const mkTorso = (grow, hem, mat) => { const g = lathe(prof(grow, hem), 32); g.scale(1, 1, 0.66); return this._m(torsoG, g, mat); };
    const zf = (y, grow = 0) => radiusAt(y, grow) * 0.66;
    mkTorso(0, false, suit ? shirt : top);
    this._e(spine, skin, [0.05, 0.065, 0.05], [0, NECK_BASE(), 0]);          // neck root filler
    this._m(neck, new THREE.CylinderGeometry(0.047, 0.053, 0.15, 18), skin, [0, 0.03, 0.004]);

    if (suit) {
      mkTorso(0.013, true, top);
      const jz = zf(0.3, 0.013);
      const vt = new THREE.Shape(); vt.moveTo(-0.062, 0.385); vt.lineTo(0.062, 0.385); vt.lineTo(0, 0.17); vt.closePath();
      const v = this._m(torsoG, new THREE.ShapeGeometry(vt), M(out.shirt, 0.85, 0, { side: THREE.DoubleSide }), [0, 0, zf(0.28, 0.013) + 0.002], null, null, false);
      for (const sd of [1, -1]) {
        this._b(torsoG, top, [0.036, 0.228, 0.012], [sd * 0.052, 0.275, zf(0.27, 0.013) + 0.004], [0, -sd * 0.18, -sd * 0.27]);
      }
      this._m(torsoG, new THREE.CylinderGeometry(0.02, 0.031, 0.27, 8), M(out.tie, 0.4), [0, 0.255, zf(0.26, 0.013) + 0.012], [1, 1, 0.22], [-0.04, 0, 0]);
      this._e(torsoG, M(out.tie, 0.4), [0.022, 0.02, 0.014], [0, 0.375, zf(0.375, 0.013) + 0.012]);
      this._b(torsoG, gold, [0.05, 0.008, 0.006], [0.0, 0.2, zf(0.2, 0.013) + 0.019]);
      this._e(torsoG, gold, [0.009, 0.009, 0.006], [0, 0.1, zf(0.1, 0.013) + 0.004]);
      this._b(torsoG, shirt, [0.05, 0.022, 0.006], [0.092 * b.chest, 0.27, jz + 0.003], [0, 0, -0.12]);   // pocket square
      this._m(neck, new THREE.TorusGeometry(0.058, 0.011, 8, 22), shirt, [0, -0.015, 0], null, [Math.PI / 2, 0, 0]);
    } else {
      this._m(neck, new THREE.TorusGeometry(0.058, out.type === 'sweater' ? 0.02 : 0.012, 8, 22), top, [0, -0.015, 0], null, [Math.PI / 2, 0, 0]);
    }
    if (acc.lanyard !== null && acc.lanyard !== false) {
      const lm = M(acc.lanyard, 0.6), z = (y) => zf(y, 0) + 0.008;
      for (const sd of [1, -1]) this._b(torsoG, lm, [0.011, 0.34, 0.004], [sd * 0.027, 0.3, z(0.3)], [0, 0, -sd * 0.16]);
      const badge = this.badge = this._g(torsoG, 0, 0.17, z(0.17));
      this._b(badge, M(0x444444, 0.5), [0.02, 0.014, 0.008], [0, 0.01, 0]);
      this._b(badge, M(0xf5f5f5, 0.6), [0.062, 0.085, 0.004], [0, -0.04, 0.002]);
      this._b(badge, lm, [0.062, 0.018, 0.005], [0, -0.008, 0.004]);
      this._e(badge, M(0xb08a6a, 0.6), [0.011, 0.011, 0.003], [0, -0.04, 0.005]);
    }

    /* arms */
    this.arms = [];
    const sleeve = suit ? top : (out.type === 'sweater' ? top : top);
    for (const side of [1, -1]) {
      const sh = this._g(spine, side * K.SH_W * b.shoulder, K.SH_Y, 0);
      const tw = this._g(sh);
      const el = this._g(tw, 0, -K.UARM, 0);
      const fa = this._g(el);
      const wr = this._g(fa, 0, -K.FARM, 0);
      this._e(sh, sleeve, [0.056 * lw, 0.058 * lw, 0.056 * lw], [0, -0.01, 0]);
      this._m(tw, limbGeo(K.UARM + 0.01, 0.050 * lw * (suit ? 1.05 : 1), 0.041 * lw, 0.06), sleeve, [0, 0.0, 0]);
      const rolled = !suit && out.type === 'shirt';
      this._m(fa, limbGeo(K.FARM + 0.01, 0.040 * lw, 0.029 * lw, 0.10), rolled ? skin : sleeve, [0, 0.005, 0]);
      if (rolled) this._m(fa, new THREE.CylinderGeometry(0.043 * lw, 0.041 * lw, 0.045, 16), sleeve, [0, -0.02, 0]);
      if (suit) this._m(fa, new THREE.CylinderGeometry(0.032, 0.032, 0.03, 14), shirt, [0, -K.FARM + 0.02, 0]);
      const hand = this._hand(side, wr, skin);
      const arm = { side, sh, tw, el, fa, wr, fingers: hand.fingers };
      if (side === 1 && acc.watch) {
        this._m(fa, new THREE.CylinderGeometry(0.034, 0.034, 0.024, 16), gold, [0, -K.FARM + 0.04, 0]);
        this._b(fa, M(0x0b0b0d, 0.2, 0.6), [0.008, 0.026, 0.026], [side * 0.034, -K.FARM + 0.04, 0]);
      }
      if (side === -1 && acc.briefcase) {
        const cg = this.case = this._g(wr, 0, -0.1, 0);
        this._m(cg, new THREE.TorusGeometry(0.05, 0.007, 8, 18, Math.PI), gold, [0, 0, 0], null, [0, Math.PI / 2, 0]);
        this._b(cg, leather, [0.075, 0.30, 0.46], [0, -0.17, 0]);
        for (const zz of [-0.17, 0.17]) this._b(cg, gold, [0.08, 0.03, 0.03], [0, -0.04, zz]);
        this._b(cg, gold, [0.08, 0.02, 0.05], [0, -0.04, 0]);
      }
      this.arms.push(arm);
    }

    /* legs */
    this.legs = [];
    const hipK = b.hip;
    for (const side of [1, -1]) {
      const th = this._g(hips, side * K.HIP_W * (0.9 + 0.1 * hipK), 0, 0);
      const kn = this._g(th, 0, -K.THIGH, 0);
      const an = this._g(kn, 0, -K.SHIN, 0);
      this._m(th, limbGeo(K.THIGH + 0.02, 0.088 * lw * hipK, 0.060 * lw, 0.07), pants, [0, 0.01, 0]);
      this._m(kn, limbGeo(K.SHIN + 0.01, 0.060 * lw, 0.042 * lw, 0.14), pants, [0, 0.005, 0]);
      this._m(kn, new THREE.CylinderGeometry(0.047 * lw, 0.05 * lw, 0.035, 16), pants, [0, -K.SHIN + 0.03, 0]);
      this._shoe(an, shoeM, soleM, suit);
      this.legs.push({ side, th, kn, an, pole: new V3(side * 0.12, 0, 1) });
    }

    this._buildHead(skull, skin, acc);
    this._applyShadows();
  }

  _applyShadows() { this.root.traverse((c) => { if (c.isMesh) c.receiveShadow = false; }); }

  _shoe(an, shoeM, soleM, dress) {
    const g = this._g(an);
    this._b(g, soleM, [0.092, 0.02, 0.27], [0, -0.07, 0.05]);
    this._b(g, soleM, [0.08, 0.026, 0.07], [0, -0.06, -0.045]);
    this._e(g, shoeM, [0.047, 0.042, 0.135], [0, -0.034, 0.055]);
    this._e(g, shoeM, [0.046, 0.032, dress ? 0.085 : 0.07], [0, -0.05, dress ? 0.145 : 0.135]);
  }

  _hand(side, parent, skin) {
    const g = this._g(parent);
    this._e(g, skin, [0.014, 0.05, 0.042], [0, -0.045, 0]);
    const lens = [[0.032, 0.028], [0.040, 0.034], [0.044, 0.036], [0.040, 0.033], [0.032, 0.027]];
    const fingers = [];
    for (let i = 0; i < 5; i++) {
      const th = i === 0, r = th ? 0.0095 : 0.0085 - (i === 4 ? 0.0012 : 0);
      const pr = this._g(g);
      if (th) { pr.position.set(-side * 0.012, -0.025, 0.034); pr.rotation.set(-0.6, 0, -side * 0.3); }
      else pr.position.set(0, -0.088, 0.031 - (i - 1) * 0.0205);
      this._m(pr, limbGeo(lens[i][0] + 0.004, r, r * 0.9, 0), skin);
      const ds = this._g(pr, 0, -lens[i][0], 0);
      this._m(ds, limbGeo(lens[i][1] + 0.004, r * 0.9, r * 0.72, 0), skin);
      fingers.push({ p: pr, d: ds, base: th ? -side * 0.3 : 0, th });
    }
    return { fingers };
  }

  _buildHead(skull, skin, acc) {
    const o = this.o, M = (c, r, m, e) => this._mat(c, r, m, e);
    const lip = M(new THREE.Color(o.skin).lerp(new THREE.Color(0x9a3b3b), 0.45).getHex(), 0.5);
    const hairM = M(o.hair.color, 0.55);
    this._m(skull, headGeo(), skin);
    for (const sd of [1, -1]) this._e(skull, skin, [0.009, 0.028, 0.017], [sd * 0.081, -0.006, -0.004], [0, sd * 0.3, 0]);
    // nose
    this._e(skull, skin, [0.0085, 0.026, 0.012], [0, 0.0, headZ(0, 0) + 0.003], [0.3, 0, 0]);
    this._e(skull, skin, [0.0125, 0.011, 0.0125], [0, -0.022, headZ(0, -0.022) + 0.011]);
    for (const sd of [1, -1]) this._e(skull, skin, [0.0065, 0.007, 0.006], [sd * 0.0105, -0.025, headZ(0.0105, -0.025) + 0.006]);

    // eyes
    const eyeW = M(0xf2f0ec, 0.25), iris = M(o.eye, 0.35), pupil = M(0x050505, 0.2), glint = M(0xffffff, 0.1, 0, { emissive: 0xffffff, emissiveIntensity: 0.6 });
    this.face = { balls: [], lids: [], brows: [], eyeRoot: [] };
    for (const sd of [1, -1]) {
      const ex = sd * 0.034, ey = 0.016, ez = headZ(ex, ey) - 0.0095;
      const eg = this._g(skull, ex, ey, ez);
      const ball = this._g(eg);
      this._e(ball, eyeW, [0.0125, 0.0125, 0.0125], [0, 0, 0], null, false);
      this._e(ball, iris, [0.0072, 0.0072, 0.0035], [0, 0, 0.0108], null, false);
      this._e(ball, pupil, [0.0036, 0.0036, 0.002], [0, 0, 0.0124], null, false);
      this._e(ball, glint, [0.0016, 0.0016, 0.001], [0.0022, 0.0028, 0.0133], null, false);
      const lidGeo = new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2);
      const lid = this._m(eg, lidGeo, skin, [0, 0, 0], [0.0138, 0.0138, 0.0138], null, false);
      this.face.balls.push(ball); this.face.lids.push(lid);
      // brow
      const bg = this._g(skull, sd * 0.034, 0.052, headZ(sd * 0.034, 0.052) + 0.002);
      const curve = new THREE.CatmullRomCurve3([new V3(-sd * 0.021, -0.003, -0.003), new V3(-sd * 0.006, 0.004, 0.001), new V3(sd * 0.012, 0.004, 0.001), new V3(sd * 0.024, -0.002, -0.004)]);
      const brow = this._m(bg, new THREE.TubeGeometry(curve, 10, 0.0042, 5, false), M(new THREE.Color(o.hair.color).multiplyScalar(0.85).getHex(), 0.7), [0, 0, 0], [1, 0.8, 1], null, false);
      this.face.brows.push({ g: bg, sd, baseY: 0.052 });
    }
    // mouth
    const my = -0.052, mg = this._g(skull, 0, my, headZ(0, my) + 0.002);
    const arc = this._m(mg, new THREE.TorusGeometry(0.016, 0.0036, 6, 14, Math.PI), lip, [0, 0.004, 0], [1, 0.3, 1], [0, 0, Math.PI], false);
    const lower = this._e(mg, lip, [0.0125, 0.0042, 0.0055], [0, -0.007, -0.001], null, false);
    const cavity = this._e(mg, M(0x230808, 0.9), [0.011, 0.01, 0.004], [0, -0.004, -0.002], null, false);
    this.face.mouth = { g: mg, arc, lower, cavity };
    if (acc.mustache) this._b(skull, M(o.hair.color, 0.8), [0.034, 0.007, 0.009], [0, -0.036, headZ(0, -0.036) + 0.004], [0.2, 0, 0]);

    // hair
    this._hair(skull, hairM);

    // glasses
    if (acc.glasses) {
      const fr = M(o.outfit.type === 'suit' ? 0xb8962e : 0x16181c, 0.3, 0.7), gl = M(0x9cc7ff, 0.05, 0, { transparent: true, opacity: 0.16, side: THREE.DoubleSide });
      for (const sd of [1, -1]) {
        const gz = headZ(sd * 0.034, 0.016) + 0.014;
        this._m(skull, new THREE.TorusGeometry(0.0235, 0.0021, 6, 22), fr, [sd * 0.034, 0.016, gz], [1, 0.88, 1], null, false);
        this._m(skull, new THREE.CircleGeometry(0.0225, 20), gl, [sd * 0.034, 0.016, gz], [1, 0.88, 1], null, false);
        this._b(skull, fr, [0.0028, 0.0028, 0.108], [sd * 0.0645, 0.016, 0.047], [0, -sd * 0.317, 0], false);
      }
      this._b(skull, fr, [0.014, 0.0028, 0.0028], [0, 0.02, headZ(0, 0.02) + 0.014], null, null, false);
    }
    if (acc.headphones) {
      const hp = M(0x1d1f26, 0.5, 0.2), cu = M(0x3a3d48, 0.9);
      this._m(skull, new THREE.TorusGeometry(0.103, 0.0068, 8, 28, Math.PI), hp, [0, -0.002, 0], [1, 1.14, 1]);
      for (const sd of [1, -1]) {
        this._m(skull, new THREE.CylinderGeometry(0.036, 0.036, 0.022, 20), hp, [sd * 0.098, -0.006, -0.004], null, [0, 0, Math.PI / 2]);
        this._m(skull, new THREE.TorusGeometry(0.03, 0.007, 8, 18), cu, [sd * 0.087, -0.006, -0.004], null, [0, Math.PI / 2, 0]);
      }
    }
  }

  _hair(skull, hairM) {
    const st = this.o.hair.style;
    const cap = (sx, sy, sz, theta, tilt, y = 0.004, z = 0, bumps = 0) => {
      const g = new THREE.SphereGeometry(1, 30, 18, 0, Math.PI * 2, 0, theta);
      if (bumps) { const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), yy = p.getY(i), zz = p.getZ(i); const n = Math.sin(x * 38) * Math.sin(yy * 34 + 1.3) * Math.sin(zz * 36 + 0.7); p.setXYZ(i, x * (1 + bumps * n), yy * (1 + bumps * n), zz * (1 + bumps * n)); } g.computeVertexNormals(); }
      return this._m(skull, g, hairM, [0, y, z], [HX * sx, HY * sy, HZ * sz], [tilt, 0, 0]);
    };
    switch (st) {
      case 'bald': break;
      case 'crop': cap(1.05, 1.04, 1.06, 1.85, -0.34); break;
      case 'pomp': cap(1.05, 1.05, 1.07, 1.85, -0.32); this._e(skull, hairM, [0.07, 0.036, 0.075], [0, 0.105, 0.04], [0.35, 0, 0]); break;
      case 'slick': cap(1.04, 1.03, 1.055, 1.72, -0.18); for (const sd of [1, -1]) this._e(skull, hairM, [0.012, 0.03, 0.03], [sd * 0.079, -0.012, 0.012]); break;
      case 'bun': cap(1.05, 1.04, 1.07, 1.9, -0.4); this._e(skull, hairM, [0.05, 0.05, 0.05], [0, 0.118, -0.062]); this._m(skull, new THREE.TorusGeometry(0.05, 0.004, 6, 18), this._mat(0xb0b0b8, 0.3, 0.8), [0, 0.108, -0.062], null, [Math.PI / 2.4, 0, 0]); break;
      case 'bob': case 'long': {
        cap(1.07, 1.05, 1.09, 1.95, -0.5);
        const len = st === 'bob' ? 0.2 : 0.34, c = this._m(skull, new THREE.CylinderGeometry(0.1, 0.112, len, 22, 1, true, Math.PI / 2, Math.PI), this._mat(this.o.hair.color, 0.55, 0, { side: THREE.DoubleSide }), [0, -0.0 - len / 2 + 0.05, -0.012]);
        for (const sd of [1, -1]) this._e(skull, hairM, [0.021, len * 0.36, 0.045], [sd * 0.082, 0.0 - len * 0.2, 0.0]);
        break;
      }
      case 'curly': cap(1.2, 1.12, 1.18, 1.98, -0.42, 0.012, -0.006, 0.07); break;
      default: cap(1.05, 1.04, 1.06, 1.85, -0.34);
    }
  }

  /* ───────────── per-frame update ───────────── */
  update(dt) {
    if (!(dt > 0)) return;
    dt = Math.min(dt, 0.05);
    const o = this.o, s = this.s, t = this.t, T = (this.time += dt);
    const { hips, spine, neck, head, face } = this;
    for (const k in t) s[k] = damp(s[k], t[k], this.rate, dt);

    /* movement → walk cycle */
    const pos = this.root.position;
    if (this._first) { this._prev.copy(pos); this._first = false; }
    let raw = Math.hypot(pos.x - this._prev.x, pos.z - this._prev.z) / dt / (this.root.scale.x || 1) * o.walkSpeedScale;
    if (raw > 6) raw = 0;
    this._prev.copy(pos);
    this.speed = damp(this.speed, this.speedOverride ?? raw, 10, dt);
    const v = this.speed, sit = clamp(s.sit, 0, 1);
    const walkW = (1 - sit) * sstep(0.06, 0.4, v);
    this.walkW = walkW;
    const S = clamp(0.28 + 0.34 * v, 0.28, 0.9), duty = 0.6, TAU = Math.PI * 2;
    if (v > 0.03 && !sit) this.phase = (this.phase + dt * (v * duty / S)) % 1;
    const pL = this.phase, pR = (this.phase + 0.5) % 1;
    const idle = (1 - walkW) * (1 - sit);
    const br = Math.sin(T * 1.7 + o.seed);

    /* hips / spine */
    const hipStand = K.HIP_STAND - s.hipDrop;
    const hipY = lerp(lerp(hipStand, K.HIP_WALK, walkW), o.seatHeight, sit) + walkW * 0.02 * Math.cos(2 * TAU * (pL - 0.3)) + idle * 0.003 * br;
    const sway = walkW * 0.015 * Math.cos(TAU * (pL - 0.3)) + idle * 0.012 * Math.sin(T * 0.45 + o.seed) + sit * 0.002 * Math.sin(T * 0.6);
    const roll = -walkW * 0.035 * Math.cos(TAU * (pL - 0.8)) + idle * 0.012 * Math.sin(T * 0.45 + o.seed + 1);
    const pYaw = -walkW * 0.09 * Math.cos(TAU * pL) + sit * 0.0;
    hips.position.set(sway, hipY, -0.03 * sit);
    hips.rotation.set(0.02 * walkW, pYaw, roll);
    hips.updateMatrix();
    const spX = s.spX + 0.0045 * br + walkW * (0.04 + 0.02 * v);
    const spY = s.spY + walkW * 0.19 * Math.cos(TAU * pL) + 0.03 * Math.sin(T * 0.37 + o.seed) * (1 - walkW);
    const spZ = s.spZ - roll * 0.6 + idle * 0.006 * Math.sin(T * 0.45 + o.seed + 2);
    spine.rotation.set(spX, spY, spZ);
    spine.updateMatrix();
    this.torsoG.scale.set(1 + 0.010 * br, 1 + 0.004 * br, 1 + 0.02 * br);

    /* legs (IK, feet planted in root space) */
    this._invHips.copy(hips.matrix).invert();
    const ft = { z: 0, y: 0, pitch: 0 };
    for (const leg of this.legs) {
      const sd = leg.side, p = sd > 0 ? pL : pR;
      // standing / sitting targets
      const stX = sd * (K.HIP_W + s.stance), stZ = (sd > 0 ? 0.5 : -0.5) * s.stagger;
      const sX = sd * 0.12, sZ = 0.40;
      let x = lerp(stX, sX, sit), y = K.ANKLE, z = lerp(stZ, sZ, sit), pitch = 0;
      const yaw = sd * lerp(0.10, 0.15, sit);
      if (walkW > 0.001) {
        if (p < duty) {
          const u = p / duty;
          ft.z = lerp(S / 2, -S / 2, u); ft.y = 0.04 * sstep(0.7, 1, u);
          ft.pitch = u < 0.35 ? lerp(-0.2, 0, u / 0.35) : lerp(0, 0.5, ((u - 0.35) / 0.65) ** 2);
        } else {
          const u = (p - duty) / (1 - duty), e = u * u * (3 - 2 * u);
          ft.z = lerp(-S / 2, S / 2, e); ft.y = lerp(0.04, 0, u) + 0.07 * Math.sin(Math.PI * u);
          ft.pitch = lerp(0.5, -0.2, sstep(0, 0.9, u));
        }
        x = lerp(x, sd * 0.075, walkW); z = lerp(z, ft.z, walkW); y += ft.y * walkW; pitch = ft.pitch * walkW;
      }
      _tmp.set(x, y, z).applyMatrix4(this._invHips);
      const phi = solveLimb(leg.th, _tmp, leg.pole, 1, K.THIGH, K.SHIN);
      leg.kn.rotation.set(phi, 0, 0);
      _q1.copy(leg.th.quaternion).multiply(leg.kn.quaternion).invert();
      _q2.setFromEuler(_eu.set(pitch, yaw, 0, 'YXZ'));
      _q3.copy(hips.quaternion).invert().multiply(_q2);
      leg.an.quaternion.copy(_q1).multiply(_q3);
    }

    /* gaze, head, eyes */
    this._gazeUpdate(dt, T, hipY, spX, spY + pYaw, walkW);
    const hy = this._headYaw, hp = this._headPit;
    const wob = 0.02 * Math.sin(T * 0.8 + o.seed) + 0.012 * Math.sin(T * 1.9);
    const nod = s.talk * 0.04 * Math.sin(T * 2.7 + o.seed) + (this.talking ? 0.025 * Math.sin(T * 6.3) : 0);
    neck.rotation.set(0.35 * (hp + s.hdX) + nod * 0.4, 0.35 * hy - walkW * 0.5 * spY, 0);
    head.rotation.set(0.65 * (hp + s.hdX) + nod + 0.012 * Math.sin(T * 0.6 + 2), 0.65 * hy + wob * (1 - sit * 0.5) - walkW * 0.5 * spY, s.hdZ + 0.02 * Math.sin(T * 0.5 + o.seed) * (1 - walkW) + s.panic * 0.02 * Math.sin(T * 31));
    this._face(dt, T);

    /* arms */
    this._invSpine.multiplyMatrices(hips.matrix, spine.matrix).invert();
    for (const arm of this.arms) this._arm(arm, T, pL, pR, walkW);

    if (this.badge) this.badge.rotation.x = 0.05 * Math.sin(T * 1.3) + walkW * 0.14 * Math.sin(2 * TAU * pL);
  }

  _gazeUpdate(dt, T, hipY, spX, bodyYaw, walkW) {
    const g = this._gaze, hasT = !!this.lookTarget;
    let yaw = 0.16 * Math.sin(T * 0.31 + this.o.seed) + 0.07 * Math.sin(T * 0.83), pit = 0.03 * Math.sin(T * 0.47);
    if (hasT) {
      const tp = this.lookTarget.isObject3D ? this.lookTarget.getWorldPosition(_w) : _w.copy(this.lookTarget);
      this.root.updateWorldMatrix(true, false);
      this.root.worldToLocal(_w);
      const hy = hipY + K.SPINE_Y + K.NECK_Y + K.HEAD_Y + 0.10;
      const dx = _w.x, dy = _w.y - hy, dz = _w.z - 0.03;
      let ay = Math.atan2(dx, dz) - bodyYaw;
      ay = Math.atan2(Math.sin(ay), Math.cos(ay));
      if (Math.abs(ay) < 2.0) { yaw = ay; pit = Math.atan2(-dy, Math.hypot(dx, dz)) - spX; }
    }
    g.yaw = damp(g.yaw, yaw, 7, dt); g.pit = damp(g.pit, pit, 7, dt);
    this._headYaw = clamp(g.yaw * 0.65, -0.85, 0.85);
    this._headPit = clamp(g.pit * 0.6, -0.45, 0.55);
    // eye saccades
    const sac = this._sac; sac.next -= dt;
    if (sac.next <= 0) { sac.next = 0.5 + this.rng() * 2.2; sac.yaw = (this.rng() - 0.5) * 0.18; sac.pit = (this.rng() - 0.5) * 0.09; }
    const ey = clamp(g.yaw - this._headYaw, -0.45, 0.45) + sac.yaw;
    const ep = clamp(g.pit - this._headPit, -0.3, 0.3) + sac.pit;
    this._eyeYaw = damp(this._eyeYaw || 0, ey, 22, dt); this._eyePit = damp(this._eyePit || 0, ep, 22, dt);
  }

  _face(dt, T) {
    const s = this.s, f = this.face, bl = this._blink;
    bl.next -= dt; bl.age += dt;
    if (bl.next <= 0) { bl.age = 0; bl.next = (s.panic > 0.5 ? 0.8 : 2) + this.rng() * (s.panic > 0.5 ? 1.2 : 4); if (this.rng() < 0.15) bl.next = 0.28; }
    const blink = bl.age < 0.15 ? Math.sin(Math.PI * bl.age / 0.15) : 0;
    const open = clamp(s['e.lid'] * (1 - blink), 0, 1.3);
    for (let i = 0; i < 2; i++) {
      f.lids[i].rotation.x = 1.45 - open * 2.0;
      f.balls[i].rotation.set(this._eyePit, this._eyeYaw, 0);
    }
    for (const b of f.brows) {
      b.g.position.y = b.baseY + s['e.brow'] * 0.011 - s['e.furrow'] * 0.006;
      b.g.rotation.z = b.sd * s['e.furrow'] * 0.38 - b.sd * Math.max(0, s['e.brow']) * 0.12;
    }
    let mo = s['e.mouth'];
    if (this.talking) mo = Math.max(mo, 0.12 + 0.4 * Math.abs(Math.sin(T * 9.1) * Math.sin(T * 5.3 + 1)));
    const sm = s['e.smile'], m = f.mouth;
    const curv = Math.abs(sm) < 0.06 ? 0.06 : sm * 0.9;
    m.arc.scale.set(1 + 0.25 * sm, curv, 1);
    m.lower.position.y = -0.007 - mo * 0.012; m.lower.scale.x = 0.0125 * (1 - mo * 0.2);
    m.cavity.visible = mo > 0.04;
    m.cavity.scale.set(0.011 * (0.8 + mo * 0.4), Math.max(0.001, mo * 0.014), 0.004);
  }

  _arm(a, T, pL, pR, walkW) {
    const s = this.s, o = this.o, sd = a.side, k = sd > 0 ? 'L.' : 'R.', p = sd > 0 ? pL : pR;
    const c = Math.cos(2 * Math.PI * p), sw = s[k + 'swing'] * walkW;
    const talk = s.talk, ph = sd > 0 ? 0 : 2.1;
    const trem = s.panic * 0.025 * Math.sin(T * 33 + ph);
    let sX = s[k + 'sX'] + 0.58 * sw * c - talk * 0.28 * (0.5 + 0.5 * Math.sin(T * 1.9 + ph)) + trem;
    let sZ = s[k + 'sZ'] + talk * 0.1 * Math.sin(T * 1.3 + ph) + walkW * 0.03;
    let tw = s[k + 'tw'];
    let el = s[k + 'el'] - sw * (0.15 + 0.4 * Math.max(0, -c)) - talk * 0.45 * (0.5 + 0.5 * Math.sin(T * 2.3 + ph + 1)) + trem;
    const pro = s[k + 'pro'] + talk * 0.35 * Math.sin(T * 1.7 + ph);
    const wX = s[k + 'wX'] + talk * 0.2 * Math.sin(T * 2.9 + ph) + trem, wZ = s[k + 'wZ'];
    // idle micro motion
    sX += 0.012 * Math.sin(T * 0.9 + ph) * (1 - walkW);

    // FK
    _fk.sh.setFromEuler(_eu.set(sX, 0, sd * sZ));
    _fk.tw.setFromEuler(_eu.set(0, sd * tw, 0));
    _fk.el.setFromEuler(_eu.set(el, 0, 0));
    _fk.fa.setFromEuler(_eu.set(0, -sd * pro, 0));
    _fk.wr.setFromEuler(_eu.set(wX, 0, sd * wZ));

    // typing
    const ik = clamp(s[k + 'ik'], 0, 1);
    let tp = 0;
    const strikes = [0, 0, 0, 0, 0];
    if (s.type > 0.01) {
      const burst = sstep(-0.25, 0.35, Math.sin(T * 0.7 + o.seed * 3) + 0.4 * Math.sin(T * 2.1 + o.seed));
      tp = s.type * (0.25 + 0.75 * burst);
      for (let i = 0; i < 5; i++) strikes[i] = Math.pow(Math.max(0, Math.sin(T * (11 + i * 1.7 + sd * 0.9) + i * 2.3 + (sd > 0 ? 0 : 1.1))), 3);
    }

    let ikQ = null;
    if (ik > 0.001) {
      const kb = o.keyboard, hand = (strikes[1] + strikes[2] + strikes[3]) * 0.0035 * tp;
      _tmp.set(sd * 0.10 + 0.012 * tp * Math.sin(T * 1.7 + sd), kb[1] - hand, kb[2] - 0.055 + 0.01 * tp * Math.sin(T * 2.3 + sd * 2)).applyMatrix4(this._invSpine);
      a.pole = a.pole || new V3();
      a.pole.set(sd * 0.55, -0.35, -1);
      const phi = solveLimb(a.sh, _tmp, a.pole, -1, K.UARM, K.FARM);
      _ik.sh.copy(a.sh.quaternion);
      _ik.el.setFromAxisAngle(_X, phi);
      _q1.copy(_ik.sh).multiply(_ik.el).invert();
      _ik.wr.copy(_q1).multiply(sd > 0 ? HAND_L : HAND_R);
      ikQ = _ik;
    }
    const w = ik;
    a.sh.quaternion.copy(_fk.sh); a.tw.quaternion.copy(_fk.tw); a.el.quaternion.copy(_fk.el); a.fa.quaternion.copy(_fk.fa); a.wr.quaternion.copy(_fk.wr);
    if (ikQ) {
      a.sh.quaternion.slerp(ikQ.sh, w);
      a.tw.quaternion.slerp(_I, w); a.fa.quaternion.slerp(_I, w);
      a.el.quaternion.slerp(ikQ.el, w); a.wr.quaternion.slerp(ikQ.wr, w);
    }

    // fingers
    const base = s[k + 'curl'], pt = s[k + 'point'];
    for (let i = 0; i < 5; i++) {
      const f = a.fingers[i];
      let cu = base + tp * 0.5 * strikes[i] - (tp > 0 ? 0.0 : 0) + 0.03 * Math.sin(T * 0.7 + i + ph);
      if (i === 1) cu *= 1 - pt; else if (i > 1) cu += pt * 0.8;
      if (f.th) { f.p.rotation.z = f.base - sd * cu * 0.45; f.d.rotation.z = -sd * cu * 0.5; }
      else { f.p.rotation.z = -sd * cu * 1.15; f.d.rotation.z = -sd * cu * 0.95; }
    }
    if (this.case && sd < 0) {
      const rx = a.sh.rotation.x + a.el.rotation.x + a.wr.rotation.x;
      this.case.rotation.set(-rx * 0.85 + 0.03 * Math.sin(T * 1.1), 0, 0);
    }
  }
}

/* shared temporaries */
const NECK_BASE = () => K.NECK_Y - 0.01;
const _tmp = new V3(), _w = new V3(), _q1 = new Q(), _q2 = new Q(), _q3 = new Q(), _eu = new E(), _X = new V3(1, 0, 0), _I = new Q();
const _fk = { sh: new Q(), tw: new Q(), el: new Q(), fa: new Q(), wr: new Q() };
const _ik = { sh: new Q(), el: new Q(), wr: new Q() };
// hand orientation in spine space: fingers → +Z, palm → down, thumb inward
const HAND_L = new Q().setFromRotationMatrix(new M4().makeBasis(new V3(0, 1, 0), new V3(0, 0, -1), new V3(-1, 0, 0)));
const HAND_R = new Q().setFromRotationMatrix(new M4().makeBasis(new V3(0, -1, 0), new V3(0, 0, -1), new V3(1, 0, 0)));
