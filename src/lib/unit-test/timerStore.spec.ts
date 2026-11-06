import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { timerStore } from '../stores/timerStore.svelte.js';
import { BATTLE_SPELLS } from '../data/spells.js';

describe('High-Precision Timer Engine & Svelte 5 Reactive Store', () => {
	beforeEach(() => {
		timerStore.resetAll();
		timerStore.setAudioEnabled(false); // disable audio in unit test
	});

	afterEach(() => {
		timerStore.resetAll();
	});

	it('should start a cooldown timer with standard base duration when hasPyt is false', () => {
		const flicker = BATTLE_SPELLS.flicker;
		const timer = timerStore.startTimer('Chou', flicker, false);

		expect(timer.heroName).toBe('Chou');
		expect(timer.spellName).toBe('Flicker');
		expect(timer.totalDuration).toBe(120);
		expect(timer.remainingSeconds).toBe(120);
		expect(timer.hasPyt).toBe(false);
		expect(timerStore.timers).toHaveLength(1);
	});

	it('should accurately calculate -15% cooldown reduction when hasPyt is true', () => {
		const flicker = BATTLE_SPELLS.flicker;
		const timer = timerStore.startTimer('Chou', flicker, true);

		// 120 * 0.85 = 102 seconds
		expect(timer.totalDuration).toBe(102);
		expect(timer.remainingSeconds).toBe(102);
		expect(timer.hasPyt).toBe(true);

		const purify = BATTLE_SPELLS.purify;
		const purifyTimer = timerStore.startTimer('Natan', purify, true);
		// 90 * 0.85 = 76.5 -> Math.round = 77 (or 76.5 rounded to 77)
		expect(purifyTimer.totalDuration).toBe(Math.round(90 * 0.85));
	});

	it('should handle burst dispatch from multi-entity voice pairs', () => {
		const pairs = [
			{
				heroName: 'Chou',
				spell: BATTLE_SPELLS.flicker,
				hasPyt: false,
				rawTokens: ['chou', 'fliker']
			},
			{
				heroName: 'Hanabi',
				spell: BATTLE_SPELLS.aegis,
				hasPyt: false,
				rawTokens: ['hanabi', 'aegis']
			},
			{
				heroName: 'Natan',
				spell: BATTLE_SPELLS.purify,
				hasPyt: true,
				rawTokens: ['natan', 'purify', 'pyt']
			}
		];

		const dispatched = timerStore.dispatchVoicePairs(pairs);
		expect(dispatched).toHaveLength(3);
		expect(timerStore.timers).toHaveLength(3);

		expect(dispatched[0].totalDuration).toBe(120);
		expect(dispatched[1].totalDuration).toBe(90);
		expect(dispatched[2].totalDuration).toBe(Math.round(90 * 0.85)); // 77s
	});

	it('should support Instant Undo of the last dispatched timer', () => {
		timerStore.startTimer('Chou', BATTLE_SPELLS.flicker, false);
		const secondTimer = timerStore.startTimer('Hanabi', BATTLE_SPELLS.aegis, false);

		expect(timerStore.timers).toHaveLength(2);
		expect(timerStore.lastDispatchedId).toBe(secondTimer.id);

		// Undo last (Hanabi Aegis)
		const undone = timerStore.undoLastTimer();
		expect(undone).toBe(true);
		expect(timerStore.timers).toHaveLength(1);
		expect(timerStore.timers[0].heroName).toBe('Chou');
		expect(timerStore.lastDispatchedId).toBeNull();

		// Second undo when lastDispatchedId is null returns false
		expect(timerStore.undoLastTimer()).toBe(false);
	});

	it('should cancel an individual timer by ID', () => {
		const t1 = timerStore.startTimer('Chou', BATTLE_SPELLS.flicker, false);
		const t2 = timerStore.startTimer('Ling', BATTLE_SPELLS.retribution, false);

		expect(timerStore.timers).toHaveLength(2);

		timerStore.cancelTimer(t1.id);
		expect(timerStore.timers).toHaveLength(1);
		expect(timerStore.timers[0].id).toBe(t2.id);
	});

	it('should reset all timers cleanly', () => {
		timerStore.startTimer('Chou', BATTLE_SPELLS.flicker, false);
		timerStore.startTimer('Ling', BATTLE_SPELLS.retribution, false);
		expect(timerStore.timers).toHaveLength(2);

		timerStore.resetAll();
		expect(timerStore.timers).toHaveLength(0);
		expect(timerStore.lastDispatchedId).toBeNull();
	});
});
