import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	getAudioContext,
	unlockAudioContext,
	setMasterVolume,
	playFlickerEarcon,
	playDefenseEarcon,
	playRetriEarcon,
	playReadyAlert,
	playUndoEarcon,
	playSpellEarcon
} from '../audio/earcons.js';
import { BATTLE_SPELLS } from '../data/spells.js';

describe('Procedural Audio Earcon Synthesizer', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('should gracefully handle SSR / headless environments without window.AudioContext', () => {
		// When no window.AudioContext exists, functions must NOT throw
		expect(getAudioContext()).toBeNull();
		expect(() => playFlickerEarcon()).not.toThrow();
		expect(() => playDefenseEarcon()).not.toThrow();
		expect(() => playRetriEarcon()).not.toThrow();
		expect(() => playReadyAlert()).not.toThrow();
		expect(() => playUndoEarcon()).not.toThrow();
	});

	it('should route each battle spell to its appropriate earcon handler via playSpellEarcon', () => {
		// Verify all 12 spells dispatch without crashing
		for (const spell of Object.values(BATTLE_SPELLS)) {
			expect(() => playSpellEarcon(spell)).not.toThrow();
		}
	});

	it('should allow setting volume safely without throwing', () => {
		expect(() => setMasterVolume(0.8)).not.toThrow();
		expect(() => setMasterVolume(-0.5)).not.toThrow();
		expect(() => setMasterVolume(1.5)).not.toThrow();
	});

	it('should allow calling unlockAudioContext safely', async () => {
		await expect(unlockAudioContext()).resolves.not.toThrow();
	});
});
