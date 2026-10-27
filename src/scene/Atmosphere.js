import * as THREE from 'three';

// One draw call, fixed particle buffer, no textures or per-frame allocations.
export class Atmosphere {
    constructor(scene) {
        this.scene = scene;
        const positions = new Float32Array(180 * 3);
        for (let i = 0; i < positions.length; i += 3) {
            positions[i] = (Math.random() - 0.5) * 15;
            positions[i + 1] = Math.random() * 4.8;
            positions[i + 2] = -Math.random() * 14;
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const material = new THREE.ShaderMaterial({
            transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
            uniforms: { time: { value: 0 }, pixelRatio: { value: Math.min(devicePixelRatio, 1.5) } },
            vertexShader: `uniform float time; uniform float pixelRatio; varying float glow;
                void main() {
                    vec3 p = position;
                    p.x += sin(time * .16 + p.z) * .18;
                    p.y = mod(p.y + time * .035, 4.8);
                    vec4 mv = modelViewMatrix * vec4(p, 1.);
                    gl_Position = projectionMatrix * mv;
                    gl_PointSize = clamp(19. * pixelRatio / -mv.z, 1., 5.);
                    float cone = max(0., 1. - abs(p.x) / (1. + (5. - p.y) * .65));
                    glow = .09 + cone * .34;
                }`,
            fragmentShader: `varying float glow;
                void main() {
                    float a = smoothstep(.5, .06, length(gl_PointCoord - .5));
                    gl_FragColor = vec4(.72, .88, 1., a * glow);
                }`,
        });
        this.points = new THREE.Points(geometry, material);
        scene.add(this.points);
    }
    update(dt) { this.points.material.uniforms.time.value += dt; }
    dispose() {
        this.scene.remove(this.points);
        this.points.geometry.dispose();
        this.points.material.dispose();
    }
}
