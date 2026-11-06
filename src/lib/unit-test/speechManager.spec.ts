import { describe, it, expect, beforeEach, vi } from 'vitest';
import { speechManager } from '../speech/speechManager.svelte.js';
import { timerStore } from '../stores/timerStore.svelte.js';
import {
	isInputElement,
	handleGlobalKeyDown,
	handleGlobalKeyUp,
	setFootPedalKey
} from '../speech/inputHandlers.js';

describe('Speech & Hardware Input Ingestion Pipeline', () => {
	beforeEach(() => {
		timerStore.resetAll();
		timerStore.setAudioEnabled(false);
	});

	it('should route simulated speech transcript directly to TimerStore', () => {
		const result = speechManager.simulateTranscript('chou fliker');

		expect(result.pairs).toHaveLength(1);
		expect(timerStore.timers).toHaveLength(1);
		expect(timerStore.timers[0].heroName).toBe('Chou');
		expect(timerStore.timers[0].spellName).toBe('Flicker');
		expect(timerStore.timers[0].totalDuration).toBe(120);
	});

	it('should handle burst speech through speechManager with scoped modifiers', () => {
		speechManager.simulateTranscript('chou fliker hanabi aegis natan purify pyt');

		expect(timerStore.timers).toHaveLength(3);

		const chouTimer = timerStore.timers.find((t) => t.heroName === 'Chou');
		const hanabiTimer = timerStore.timers.find((t) => t.heroName === 'Hanabi');
		const natanTimer = timerStore.timers.find((t) => t.heroName === 'Natan');

		expect(chouTimer?.totalDuration).toBe(120);
		expect(chouTimer?.hasPyt).toBe(false);

		expect(hanabiTimer?.totalDuration).toBe(90);
		expect(hanabiTimer?.hasPyt).toBe(false);

		expect(natanTimer?.totalDuration).toBe(Math.round(90 * 0.85)); // 77s
		expect(natanTimer?.hasPyt).toBe(true);
	});

	it('should execute Instant Undo when voice transcript contains "batal"', () => {
		speechManager.simulateTranscript('chou fliker');
		speechManager.simulateTranscript('hanabi aegis');
		expect(timerStore.timers).toHaveLength(2);

		// Voice Undo
		const undoResult = speechManager.simulateTranscript('batal');
		expect(undoResult.isUndo).toBe(true);

		// Hanabi Aegis was undone
		expect(timerStore.timers).toHaveLength(1);
		expect(timerStore.timers[0].heroName).toBe('Chou');
	});

	it('should accurately detect input elements to prevent keyboard shortcuts during typing', () => {
		expect(isInputElement(null)).toBe(false);

		const fakeDiv = { tagName: 'DIV', isContentEditable: false } as unknown as HTMLElement;
		expect(isInputElement(fakeDiv)).toBe(false);

		const fakeInput = { tagName: 'INPUT', isContentEditable: false } as unknown as HTMLElement;
		expect(isInputElement(fakeInput)).toBe(true);

		const fakeTextarea = {
			tagName: 'TEXTAREA',
			isContentEditable: false
		} as unknown as HTMLElement;
		expect(isInputElement(fakeTextarea)).toBe(true);
	});

	it('should trigger Instant Undo on Escape / Backspace keydown', () => {
		speechManager.simulateTranscript('chou fliker');
		expect(timerStore.timers).toHaveLength(1);

		const fakeEvent = {
			code: 'Escape',
			target: null,
			preventDefault: vi.fn()
		} as unknown as KeyboardEvent;

		handleGlobalKeyDown(fakeEvent);
		expect(timerStore.timers).toHaveLength(0);
	});

	it('should support custom USB Foot Pedal key binding', () => {
		setFootPedalKey('KeyB');

		const startSpy = vi.spyOn(speechManager, 'startListening');
		const stopSpy = vi.spyOn(speechManager, 'stopListening');

		const pedalDown = {
			code: 'KeyB',
			repeat: false,
			target: null,
			preventDefault: vi.fn()
		} as unknown as KeyboardEvent;

		const pedalUp = {
			code: 'KeyB',
			target: null,
			preventDefault: vi.fn()
		} as unknown as KeyboardEvent;

		handleGlobalKeyDown(pedalDown);
		expect(startSpy).toHaveBeenCalled();

		handleGlobalKeyUp(pedalUp);
		expect(stopSpy).toHaveBeenCalled();
	});
});
