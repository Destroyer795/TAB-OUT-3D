import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const storage = new Map();
globalThis.localStorage = {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: key => storage.delete(key),
};
globalThis.window = { innerWidth: 1280, innerHeight: 720 };
const { default: bus } = await import('../src/core/EventBus.js');
const { StateMachine, GameState } = await import('../src/core/StateMachine.js');
const { BossSystem } = await import('../src/gameplay/BossSystem.js');
const { SpreadsheetMode } = await import('../src/gameplay/SpreadsheetMode.js');
const { ArcadeGame } = await import('../src/gameplay/ArcadeGame.js');
const { default: input } = await import('../src/core/InputManager.js');
const { default: auth } = await import('../src/core/AuthSystem.js');
const { default: saves } = await import('../src/core/SaveManager.js');
const { ProgressionSystem, CAREER_RANKS } = await import('../src/gameplay/ProgressionSystem.js');
const canvas = () => ({ getContext: () => ({}) });
beforeEach(() => { bus.clear(); input.reset(); });

test('a hidden player still receives warning, inspection, and departure in order', () => {
    const fsm = new StateMachine();
    const boss = new BossSystem();
    boss._nextEvent = .01;
    const events = [];
    bus.on('bossWarning', () => { events.push('warning'); fsm.transition(GameState.BOSS_WARNING); });
    bus.on('bossPresent', () => { events.push('present'); fsm.transition(GameState.BOSS_PRESENT); });
    bus.on('bossGone', () => { events.push('gone'); fsm.transition(GameState.HIDING); });
    fsm.transition(GameState.PLAYING);
    fsm.transition(GameState.HIDING);
    boss.update(.02);
    assert.equal(fsm.current, GameState.BOSS_WARNING);
    boss.update(boss.warningTime - .1);
    assert.ok(Math.abs(boss.warningRemaining - .1) < .001);
    boss.update(.11);
    assert.equal(fsm.current, GameState.BOSS_PRESENT);
    boss._willPause = false;
    boss.update(boss.presenceTime + .1);
    assert.equal(fsm.current, GameState.HIDING);
    assert.deepEqual(events, ['warning', 'present', 'gone']);
});

test('typing earns real revenue and points, rate limits duplicates, and resets cleanly', () => {
    const sheet = new SpreadsheetMode(canvas());
    const rewards = [];
    bus.on('spreadsheetWorkDone', reward => rewards.push(reward));
    sheet.crunchNumber();
    sheet.crunchNumber();
    assert.equal(rewards.length, 1);
    for (let i = 0; i < 5; i++) { sheet.update(.12); sheet.crunchNumber(); }
    assert.equal(rewards.length, 6);
    assert.equal(sheet.revenue, rewards.reduce((sum, reward) => sum + reward.revenue, 0));
    assert.ok(rewards.at(-1).points > rewards[0].points);
    sheet.reset();
    assert.equal(sheet.revenue, 0);
    assert.equal(sheet._streak, 0);
});

test('lane steering response is consistent across 30, 60, and 144 Hz', () => {
    const positions = [30, 60, 144].map(fps => {
        const game = new ArcadeGame(canvas());
        game.moveRight();
        for (let i = 0; i < fps / 2; i++) game.update(1 / fps);
        assert.ok(Number.isFinite(game.shipVisualX));
        assert.ok(game.particles.length < 200);
        return game.shipVisualX;
    });
    assert.ok(Math.max(...positions) - Math.min(...positions) < 1);
});

test('combo expires and difficulty remains bounded during long shifts', () => {
    const game = new ArcadeGame(canvas());
    game.combo = 8; game.comboTimer = .01;
    game.elapsedTime = 3600;
    game.update(.02);
    assert.equal(game.combo, 1);
    assert.equal(game.speed, 620);
    game.reset();
    assert.equal(game.shipVelocity, 0);
});

test('form entry never becomes gameplay input and focus loss clears stuck keys', () => {
    input._onKeyDown({ code: 'KeyA', target: { matches: () => true } });
    assert.equal(input.isDown('KeyA'), false);
    input._onKeyDown({ code: 'KeyD', target: null });
    assert.equal(input.wasPressed('KeyD'), true);
    input._boundBlur();
    assert.equal(input.isDown('KeyD'), false);
    assert.equal(input.wasPressed('KeyD'), false);
});

test('guest scores persist and appear on the local leaderboard', async () => {
    await auth.playAsGuest();
    assert.equal(await saves.submitScore(3200), true);
    assert.equal(saves.highScore, 3200);
    assert.equal(await saves.submitScore(1200), false);
    const board = await auth.getLeaderboard();
    assert.ok(board.some(user => user.personalBest === 3200));
    assert.equal(JSON.parse(storage.get('tabout3d_current_user')).personalBest, 3200);
});

test('guest mode works when persistent storage is unavailable', async () => {
    const set = localStorage.setItem, get = localStorage.getItem;
    localStorage.setItem = localStorage.getItem = () => { throw new Error('Storage blocked'); };
    try {
        assert.equal((await auth.playAsGuest()).success, true);
        assert.equal(await auth.updateScore(500), true);
    } finally { localStorage.setItem = set; localStorage.getItem = get; }
});

test('career tiers provide real perks and promotion fires once per threshold', () => {
    const progression = new ProgressionSystem();
    const ranks = [];
    bus.on('playerPromoted', rank => ranks.push(rank));
    progression.checkScore(1000);
    progression.checkScore(1000);
    assert.equal(ranks.length, 1);
    assert.equal(ranks[0].code, 'LVL 02');
    assert.ok(CAREER_RANKS.at(-1).coffeeCooldown < CAREER_RANKS[0].coffeeCooldown);
    assert.ok(CAREER_RANKS.at(-1).coffeeBoost > CAREER_RANKS[0].coffeeBoost);
});
