// Run through a real WebGL renderer and Web Audio graph, with no test dependencies.
const output = document.getElementById('qa-results');
const errors = [];
const lines = [];
const report = text => { lines.push(text); output.textContent = lines.join('\n'); console.log(text); };
const error = (...args) => { errors.push(args.map(String).join(' ')); };
window.addEventListener('error', event => error(event.message));
window.addEventListener('unhandledrejection', event => error(event.reason));
const originalError = console.error, originalWarn = console.warn;
console.error = (...args) => { error(...args); originalError(...args); };
console.warn = (...args) => { error(...args); originalWarn(...args); };
const assert = (condition, message) => { if (!condition) throw new Error(message); report(`PASS · ${message}`); };
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

try {
    const { Game } = await import('../src/core/Game.js');
    const { default: Input } = await import('../src/core/InputManager.js');
    const { default: Audio } = await import('../src/audio/AudioManager.js');
    let game = new Game();
    window.__tabout3d = game;
    report('Ready. Click RUN RUNTIME QA to unlock audio and verify.');
    document.getElementById('run-qa').onclick = async () => {
        document.getElementById('run-qa').disabled = true;
        try {
            Audio.init(); Audio.resume();
            await wait(100);
            game.auth.hide(); game.menu.hide(); game._startGame();
            // Deterministic manual frames avoid wall-clock patrol/collision races.
            game.renderer.setAnimationLoop(null);
            assert(game.fsm.current === 'PLAYING', 'Guest shift starts');
            assert(Audio.ctx?.state === 'running', 'Audio unlocks after user interaction');
            const frame = () => { game._handleInput(1 / 60); game._update(1 / 60); Input.endFrame(); };
            Input._onKeyDown({ code: 'Space', preventDefault() {} }); frame();
            assert(!game._showingArcade && game.fsm.current === 'HIDING', 'Space hides the arcade');
            game.bossSystem._nextEvent = 0; frame();
            assert(game.fsm.current === 'BOSS_WARNING', 'Boss warns while already hiding');
            for (let i = 0; i < 101; i++) frame();
            assert(game.fsm.current === 'BOSS_PRESENT' && game.boss.group.visible, 'Inspection cannot be bypassed by hiding');
            Input._onKeyUp({ code: 'Space' }); frame();
            assert(game._showingArcade && game.fsm.current === 'BOSS_PRESENT', 'Releasing Space preserves inspection');
            game.suspicion = 75;
            const previous = game.arcadeGame.score;
            Input._onKeyDown({ code: 'Space', preventDefault() {} }); frame();
            assert(game.arcadeGame.score === previous + 500, 'Close call grants exactly 500 points');
            for (let i = 0; i < 5; i++) { game._showArcade(); game.suspicion = 75; game._showSpreadsheet(); }
            assert(game.arcadeGame.score === previous + 500, 'Close call cannot be farmed during one patrol');
            game.productivity.value = 30;
            game.spreadsheet.crunchNumber();
            assert(game.spreadsheet.revenue > 0 && game.productivity.value > 30, 'Typing earns revenue and restores productivity');
            game._drinkCoffee();
            const energy = game.productivity.value;
            game._drinkCoffee();
            assert(game.productivity.value === energy && game.coffeeCooldown > 0, 'Coffee cooldown prevents duplicate rewards');
            // Raycasts use camera-projected positions of the actual desk props.
            const { Vector3 } = await import('three');
            game._startGame();
            game.bossSystem._nextEvent = 1e6;
            for (let i = 0; i < 10; i++) frame();
            game.scene.updateMatrixWorld(true);
            const rect = game.renderer.domElement.getBoundingClientRect();
            const clickWorld = point => {
                point.project(game.camera);
                game.desk._interact({ clientX: rect.left + (point.x + 1) * rect.width / 2, clientY: rect.top + (1 - point.y) * rect.height / 2, button: 0 }, true);
            };
            clickWorld(new Vector3(.64, .96, -.18));
            assert(game.desk.velocity > 0, '3D duck receives pointer raycast');
            clickWorld(new Vector3(1, .86, -.85));
            assert(game.officeScene.lampLight.intensity === 0, '3D lamp toggles warm light');
            clickWorld(new Vector3(-.9, .92, -.5));
            assert(game.coffeeCooldown > 0, '3D mug drinks coffee');
            game._togglePause();
            assert(game.isPaused, 'Pause opens');
            game._togglePause();
            assert(!game.isPaused, 'Pause resumes');
            game._goToMenu(); await wait(50);
            game._startGame();
            game.bossSystem._nextEvent = 1e6;
            game.arcadeGame.hasShield = true;
            game.arcadeGame.nitroTimer = 999;
            game._render();
            const geometries = game.renderer.info.memory.geometries;
            for (let i = 0; i < 15; i++) { game._startGame(); frame(); game._render(); await wait(0); }
            assert(game.renderer.info.memory.geometries <= geometries + 3, '15 restarts keep GPU geometry count stable');
            game._startGame();
            game.bossSystem._nextEvent = 1e6;
            game.arcadeGame.nitroTimer = 999;
            let instanced = 0;
            game.scene.traverse(object => { if (object.isInstancedMesh) instanced++; });
            report(`INFO · ${instanced} instanced batches; ${game.renderer.info.render.calls} draw calls; ${game.renderer.info.render.triangles.toLocaleString()} triangles`);
            let last = performance.now(); const samples = [];
            for (let i = 0; i < 100; i++) {
                await new Promise(requestAnimationFrame);
                const now = performance.now(); if (i > 15) samples.push(now - last); last = now;
                frame();
                game._render();
            }
            const average = samples.reduce((a, b) => a + b, 0) / samples.length;
            report(`INFO · observed ${(1000 / average).toFixed(1)} FPS (${average.toFixed(1)}ms/frame)`);
            game._goToMenu(); await wait(30);
            game.dispose();
            assert(!document.querySelector('#canvas-container canvas'), 'Dispose removes canvas and stops renderer/audio');
            assert(Audio.ctx === null, 'Audio context closes on dispose');
            game = new Game(); window.__tabout3d = game;
            await wait(100);
            game.auth.hide(); game.menu.hide(); game._startGame();
            game.bossSystem._nextEvent = 1e6;
            game.arcadeGame.nitroTimer = 999;
            assert(document.querySelectorAll('#canvas-container canvas').length === 1, 'Scene reload creates exactly one renderer');
            assert(errors.length === 0, `No runtime errors/warnings (${errors.length})`);
            report('RUNTIME QA COMPLETE');
            document.title = 'PASS · TAB-OUT 3D Runtime QA';
        } catch (err) {
            report(`FAIL · ${err.stack}`);
            if (errors.length) report(errors.join('\n'));
            document.title = 'FAIL · TAB-OUT 3D Runtime QA';
        }
    };
} catch (err) { report(`BOOT FAILED · ${err.stack}`); }
