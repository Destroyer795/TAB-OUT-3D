/**
 * ProgressionSystem.js – Corporate career ladder promotions and achievements.
 */

import EventBus from '../core/EventBus.js';
import AudioManager from '../audio/AudioManager.js';

export const CAREER_RANKS = [
    { score: 0, title: 'Intern', code: 'LVL 01', bonus: 0, coffeeBoost: 35, coffeeCooldown: 22, perk: 'Coffee privileges' },
    { score: 1000, title: 'Junior Analyst', code: 'LVL 02', bonus: 200, coffeeBoost: 38, coffeeCooldown: 21, perk: 'Better beans · +38 energy' },
    { score: 2500, title: 'Operations Lead', code: 'LVL 03', bonus: 500, coffeeBoost: 40, coffeeCooldown: 19, perk: 'Express refill · 19s coffee' },
    { score: 5000, title: 'Senior Strategist', code: 'LVL 04', bonus: 1000, coffeeBoost: 45, coffeeCooldown: 18, perk: 'Double espresso · +45 energy' },
    { score: 10000, title: 'Executive Director', code: 'LVL 05', bonus: 2500, coffeeBoost: 50, coffeeCooldown: 16, perk: 'Executive roast · +50 energy' },
    { score: 20000, title: 'Chief Executive', code: 'LVL 06', bonus: 5000, coffeeBoost: 60, coffeeCooldown: 14, perk: 'Company card · +60 energy' },
];

export const ACHIEVEMENTS = {
    firstRun: {
        id: 'firstRun',
        title: 'System Access',
        desc: 'Started workstation terminal session',
        code: 'INIT'
    },
    closeCall: {
        id: 'closeCall',
        title: 'Evasion Master',
        desc: 'Tabbed out with >60% radar suspicion',
        code: 'EVADE'
    },
    caffeineAddict: {
        id: 'caffeineAddict',
        title: 'Hyper-Charged',
        desc: 'Recharged energy 3 times in a single session',
        code: 'NRG'
    },
    shieldMaster: {
        id: 'shieldMaster',
        title: 'Barrier Deflection',
        desc: 'Absorbed an impact with the energy shield',
        code: 'SHIELD'
    },
    nitroSmash: {
        id: 'nitroSmash',
        title: 'Kinetic Overdrive',
        desc: 'Demolished an obstacle while Overclocked',
        code: 'KINETIC'
    },
    spreadsheetSynergy: {
        id: 'spreadsheetSynergy',
        title: 'Audit Perfection',
        desc: 'Crunched 25 verified workbook records',
        code: 'AUDIT'
    },
    comboMaster: {
        id: 'comboMaster',
        title: 'Matrix Resonance',
        desc: 'Achieved a 5x multiplier streak',
        code: 'COMBO'
    }
};

export class ProgressionSystem {
    constructor() {
        this.currentRankIndex = 0;
        this.coffeeCount = 0;
        this.crunchedCount = 0;
        this.unlockedAchievements = this._loadAchievements();
        this._bindEvents();
    }

    resetRun() {
        this.currentRankIndex = 0;
        this.coffeeCount = 0;
        this.crunchedCount = 0;
    }

    _bindEvents() {
        EventBus.on('arcadeCollect', ({ combo }) => {
            if (combo >= 5) this.unlock('comboMaster');
        });

        EventBus.on('arcadeShieldUsed', () => {
            this.unlock('shieldMaster');
        });

        EventBus.on('arcadeObstacleDestroyed', () => {
            this.unlock('nitroSmash');
        });

        EventBus.on('coffeeConsumed', () => {
            this.coffeeCount++;
            if (this.coffeeCount >= 3) {
                this.unlock('caffeineAddict');
            }
        });

        EventBus.on('spreadsheetWorkDone', () => {
            this.crunchedCount++;
            if (this.crunchedCount >= 25) {
                this.unlock('spreadsheetSynergy');
            }
        });

        EventBus.on('closeCall', () => {
            this.unlock('closeCall');
        });
    }

    /**
     * Check score for career promotions.
     */
    checkScore(score) {
        const nextIndex = this.currentRankIndex + 1;
        if (nextIndex < CAREER_RANKS.length && score >= CAREER_RANKS[nextIndex].score) {
            this.currentRankIndex = nextIndex;
            const rank = CAREER_RANKS[nextIndex];
            AudioManager.playLevelUp();
            EventBus.emit('playerPromoted', rank);
            return rank;
        }
        return null;
    }

    get currentRank() {
        return CAREER_RANKS[this.currentRankIndex];
    }

    unlock(achievementId) {
        if (this.unlockedAchievements.has(achievementId)) return;
        const ach = ACHIEVEMENTS[achievementId];
        if (!ach) return;

        this.unlockedAchievements.add(achievementId);
        this._saveAchievements();
        AudioManager.playAchievement();
        EventBus.emit('achievementUnlocked', ach);
    }

    _loadAchievements() {
        try {
            const raw = localStorage.getItem('tabout3d_achievements');
            return raw ? new Set(JSON.parse(raw)) : new Set();
        } catch {
            return new Set();
        }
    }

    _saveAchievements() {
        try {
            localStorage.setItem('tabout3d_achievements', JSON.stringify([...this.unlockedAchievements]));
        } catch {}
    }
}
