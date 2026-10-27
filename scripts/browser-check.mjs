// Dependency-free headless Chrome integration runner for the local QA page.
import { spawn } from 'node:child_process';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const profile = resolve(`.qa/chrome-profile-${Date.now()}`);
await mkdir(profile, { recursive: true });
const chrome = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const characters = process.argv.includes('--characters');
const pageURL = `http://localhost:8080/tests/${characters ? 'characters' : 'runtime'}.html`;
const browser = spawn(chrome, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--window-size=1440,1000', 'about:blank'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
browser.stderr.on('data', chunk => { void writeFile('.qa/chrome-stderr.txt', chunk, { flag: 'a' }); });
let socket;
const pending = new Map();
let id = 0;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
try {
    let port;
    for (let i = 0; i < 60; i++) {
        try { port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; if (port) break; } catch {}
        await wait(250);
    }
    if (!port) throw new Error('Chrome did not open a debugging endpoint');
    const target = await (await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(pageURL)}`, { method: 'PUT' })).json();
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    socket.onmessage = event => {
        const data = JSON.parse(event.data);
        if (data.method === 'Runtime.exceptionThrown') console.log('Browser exception:', JSON.stringify(data.params.exceptionDetails));
        if (data.method === 'Runtime.consoleAPICalled') console.log('Browser:', data.params.args.map(arg => arg.value || arg.description).join(' '));
        if (data.id && pending.has(data.id)) {
            const { resolve, reject, timer } = pending.get(data.id);
            clearTimeout(timer); pending.delete(data.id);
            if (data.error) reject(new Error(JSON.stringify(data.error))); else resolve(data.result);
        }
    };
    const command = (method, params = {}) => new Promise((resolve, reject) => {
        const token = ++id;
        const timer = setTimeout(() => { pending.delete(token); reject(new Error(`${method} timed out`)); }, 55000);
        pending.set(token, { resolve, reject, timer });
        socket.send(JSON.stringify({ id: token, method, params }));
    });
    const evaluate = async expression => (await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result.value;
    await command('Runtime.enable');
    console.log('Chrome connected. Loading the WebGL scene.');
    let ready = false;
    for (let i = 0; i < 100; i++) {
        ready = await evaluate('!!window.__tabout3d');
        if (ready) break;
        await wait(250);
    }
    if (!ready) throw new Error(await evaluate('document.getElementById("qa-results")?.textContent || "Game did not initialize"'));
    const clickX = characters ? 240 : 100;
    await command('Input.dispatchMouseEvent', { type: 'mousePressed', x: clickX, y: 30, button: 'left', clickCount: 1 });
    await command('Input.dispatchMouseEvent', { type: 'mouseReleased', x: clickX, y: 30, button: 'left', clickCount: 1 });
    let status;
    for (let i = 0; i < 120; i++) {
        status = await evaluate('document.title');
        if (status.startsWith('PASS') || status.startsWith('FAIL')) break;
        await wait(250);
    }
    const results = await evaluate('document.getElementById("qa-results").textContent');
    console.log(results);
    await writeFile(`.qa/${characters ? 'character' : 'runtime'}-results.txt`, results);
    const screenshot = await command('Page.captureScreenshot', { format: 'png' });
    await writeFile(`.qa/${characters ? 'character' : 'runtime'}.png`, Buffer.from(screenshot.data, 'base64'));
    await evaluate('document.getElementById("qa-results").style.display="none"; document.getElementById("run-qa").style.display="none"; window.__tabout3d.isPaused=true; true');
    const scene = await command('Page.captureScreenshot', { format: 'png' });
    await writeFile(`.qa/${characters ? 'characters' : 'workstation'}.png`, Buffer.from(scene.data, 'base64'));
    if (characters) {
        for (const pose of ['walk', 'sitType', 'sitTalk', 'sitAlert']) {
            await evaluate(`window.__tabout3d.isPaused=false; window.__characterLab.applyPose('${pose}'); true`);
            await wait(1400);
            const shot = await command('Page.captureScreenshot', { format: 'png' });
            await writeFile(`.qa/characters-${pose}.png`, Buffer.from(shot.data, 'base64'));
        }
        await evaluate("window.__characterLab.applyPose('stand'); document.getElementById('face-view').click(); true");
        await wait(300);
        const face = await command('Page.captureScreenshot', { format: 'png' });
        await writeFile('.qa/character-face.png', Buffer.from(face.data, 'base64'));
    }
    if (!status.startsWith('PASS')) process.exitCode = 1;
} catch (error) { console.error(error); process.exitCode = 1; }
finally {
    for (const entry of pending.values()) clearTimeout(entry.timer);
    socket?.close();
    browser.kill();
}
