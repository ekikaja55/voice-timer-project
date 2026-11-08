import { describe, it, expect, beforeEach } from 'vitest';
import { debugLogger } from '../utils/debugLogger.svelte.js';

describe('DebugLogger Utility', () => {
	beforeEach(() => {
		debugLogger.clear();
	});

	it('should record log entries with timestamps, levels, tags, and messages', () => {
		debugLogger.info('SPEECH', 'Test info message', { test: 123 });
		debugLogger.warn('OVERLAY', 'Test warning message');
		debugLogger.error('AUDIO', 'Test error message');

		const logs = debugLogger.getLogs();
		expect(logs.length).toBe(4); // 1 from clear() + 3 added

		const infoEntry = logs.find((l) => l.message === 'Test info message');
		expect(infoEntry).toBeDefined();
		expect(infoEntry?.level).toBe('INFO');
		expect(infoEntry?.tag).toBe('SPEECH');
		expect(infoEntry?.data).toEqual({ test: 123 });
	});

	it('should accurately log touch/pointer events', () => {
		const fakePointerEvent = {
			type: 'pointerdown',
			target: { tagName: 'BUTTON', className: 'mic-btn' },
			pointerType: 'touch',
			pointerId: 1,
			clientX: 150,
			clientY: 320
		} as unknown as PointerEvent;

		debugLogger.logTouch('OVERLAY', 'mic_button_press', fakePointerEvent, {
			customMeta: 'mobile-test'
		});

		const logs = debugLogger.getLogs();
		const touchLog = logs.find((l) => l.message.includes('mic_button_press'));
		expect(touchLog).toBeDefined();
		expect(touchLog?.level).toBe('DEBUG');
		expect(touchLog?.tag).toBe('OVERLAY');

		const data = touchLog?.data as Record<string, unknown>;
		expect(data.pointerType).toBe('touch');
		expect(data.targetTag).toBe('BUTTON');
		expect(data.clientX).toBe(150);
		expect(data.clientY).toBe(320);
		expect(data.customMeta).toBe('mobile-test');
	});

	it('should format all logs into an exportable plain text dump', () => {
		debugLogger.info('SPEECH', 'Testing export output');
		const text = debugLogger.exportAsText();

		expect(text).toContain('=== MLBB VOICE TIMER - DEBUG LOG DUMP ===');
		expect(text).toContain('[SPEECH] Testing export output');
	});

	it('should manage panel open/close state', () => {
		debugLogger.closePanel();
		expect(debugLogger.isOpen).toBe(false);

		debugLogger.openPanel();
		expect(debugLogger.isOpen).toBe(true);

		debugLogger.togglePanel();
		expect(debugLogger.isOpen).toBe(false);
	});
});
