import { describe, it, expect, vi, beforeEach } from 'vitest';
import { voiceAnnouncer } from '../audio/voiceAnnouncer.svelte.js';

describe('Tactical Esports Voice Announcer Suite', () => {
	beforeEach(() => {
		voiceAnnouncer.stopAll();
		voiceAnnouncer.settings.enabled = true;
		voiceAnnouncer.settings.warnAt10Seconds = true;
		voiceAnnouncer.settings.announceReady = true;
	});

	it('should initialize with default esports audio settings', () => {
		expect(voiceAnnouncer.settings.enabled).toBe(true);
		expect(voiceAnnouncer.settings.rate).toBeGreaterThanOrEqual(1.2);
		expect(voiceAnnouncer.settings.volume).toBeGreaterThan(0);
		expect(voiceAnnouncer.settings.warnAt10Seconds).toBe(true);
		expect(voiceAnnouncer.settings.announceReady).toBe(true);
	});

	it('should allow modifying settings reactively', () => {
		voiceAnnouncer.settings.enabled = false;
		voiceAnnouncer.settings.volume = 0.5;
		voiceAnnouncer.settings.rate = 1.4;

		expect(voiceAnnouncer.settings.enabled).toBe(false);
		expect(voiceAnnouncer.settings.volume).toBe(0.5);
		expect(voiceAnnouncer.settings.rate).toBe(1.4);
	});

	it('should queue tactical 10s callout formatted properly for English and Indonesian', () => {
		const speakSpy = vi.spyOn(voiceAnnouncer, 'speak');

		// Default English
		voiceAnnouncer.setLanguage('en');
		voiceAnnouncer.announce10s('Chou', 'Flicker');
		expect(speakSpy).toHaveBeenCalledWith('Chou Flicker 10 seconds');

		// Indonesian
		voiceAnnouncer.setLanguage('id');
		voiceAnnouncer.announce10s('Chou', 'Flicker');
		expect(speakSpy).toHaveBeenCalledWith('Chou Flicker sepuluh');

		speakSpy.mockRestore();
	});

	it('should queue tactical ready callout formatted properly', () => {
		const speakSpy = vi.spyOn(voiceAnnouncer, 'speak');
		voiceAnnouncer.announceReady('Hanabi', 'Aegis');

		expect(speakSpy).toHaveBeenCalledWith('Hanabi Aegis ready');
		speakSpy.mockRestore();
	});

	it('should suppress 10s announcement when warnAt10Seconds is false', () => {
		voiceAnnouncer.settings.warnAt10Seconds = false;
		const speakSpy = vi.spyOn(voiceAnnouncer, 'speak');

		voiceAnnouncer.announce10s('Chou', 'Flicker');
		expect(speakSpy).not.toHaveBeenCalled();
		speakSpy.mockRestore();
	});

	it('should suppress ready announcement when announceReady is false', () => {
		voiceAnnouncer.settings.announceReady = false;
		const speakSpy = vi.spyOn(voiceAnnouncer, 'speak');

		voiceAnnouncer.announceReady('Chou', 'Flicker');
		expect(speakSpy).not.toHaveBeenCalled();
		speakSpy.mockRestore();
	});

	it('should cancel all pending speech and reset state on stopAll', () => {
		expect(() => voiceAnnouncer.stopAll()).not.toThrow();
	});
});
