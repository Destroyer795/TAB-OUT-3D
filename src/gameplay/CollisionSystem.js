/**
 * CollisionSystem.js – Simple lane-based collision detection for the arcade game.
 */

export class CollisionSystem {
    /**
     * @param {number} laneWidth   – Width of a single lane in canvas pixels.
     * @param {number} shipHeight  – Height of the ship hitbox.
     */
    constructor(laneWidth = 120, shipHeight = 30) {
        this.laneWidth  = laneWidth;
        this.shipHeight = shipHeight;
    }

    /**
     * Test whether the ship collides with any obstacle.
     * @param {{ lane: number, y: number }} ship
     * @param {{ lane: number, y: number, height: number, passed?: boolean }[]} obstacles
     * @returns {boolean}
     */
    check(ship, obstacles) {
        for (const obs of obstacles) {
            if (obs.passed) continue;
            if (obs.lane !== ship.lane) continue;

            const shipTop    = ship.y - this.shipHeight / 2;
            const shipBottom = ship.y + this.shipHeight / 2;
            const obsTop     = obs.y;
            const obsBottom  = obs.y + obs.height;

            if (shipBottom > obsTop && shipTop < obsBottom) {
                return true;
            }
        }
        return false;
    }
}
