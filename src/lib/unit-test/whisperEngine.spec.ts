import { describe, it, expect } from 'vitest';
import { whisperEngine } from '../speech/whisperEngine.svelte.js';

describe('Whisper-Tiny ONNX Engine Suite', () => {
	it('should initialize with IDLE status and not loaded by default', () => {
		expect(whisperEngine.status).toBe('IDLE');
		expect(whisperEngine.isLoaded).toBe(false);
		expect(whisperEngine.downloadProgress).toBe(0);
	});

	it('should handle abort cleanly without errors', () => {
		expect(() => whisperEngine.abort()).not.toThrow();
		expect(whisperEngine.status).toBe('IDLE');
	});

	it('should support checkCachedModel without throwing in test environment', async () => {
		const cached = await whisperEngine.checkCachedModel();
		expect(typeof cached).toBe('boolean');
	});
});
