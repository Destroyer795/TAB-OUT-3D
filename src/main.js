/**
 * main.js – Application entry point.
 */

import { Game } from './core/Game.js';

const game = new Game();

// Expose for debugging in dev console
window.__tabout3d = game;
