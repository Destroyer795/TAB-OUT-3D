/**
 * MathUtils.js – Pure math helpers used across the entire project.
 */

export function lerp(a, b, t) {
    return a + (b - a) * t;
}

export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

export function randomRange(min, max) {
    return Math.random() * (max - min) + min;
}

export function randomInt(min, max) {
    return Math.floor(randomRange(min, max + 1));
}

export function map(value, inMin, inMax, outMin, outMax) {
    return ((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
}

export function smoothstep(edge0, edge1, x) {
    const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
}

export function degToRad(deg) {
    return (deg * Math.PI) / 180;
}

export function radToDeg(rad) {
    return (rad * 180) / Math.PI;
}

export function distance2D(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

export function oscillate(time, frequency = 1, amplitude = 1, offset = 0) {
    return Math.sin(time * frequency * Math.PI * 2) * amplitude + offset;
}
