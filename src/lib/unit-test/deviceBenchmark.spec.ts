import { describe, it, expect } from 'vitest';
import {
	checkWasmSimd,
	inspectHardware,
	runMicroBenchmark,
	deviceBenchmarkStore
} from '../benchmark/deviceBenchmark.svelte.js';

describe('Device Benchmark Suite', () => {
	it('checkWasmSimd executes safely and returns boolean', () => {
		const result = checkWasmSimd();
		expect(typeof result).toBe('boolean');
	});

	it('inspectHardware returns hardware capabilities structure', () => {
		const hw = inspectHardware();
		expect(typeof hw.concurrency).toBe('number');
		expect(hw.concurrency).toBeGreaterThan(0);
		expect(typeof hw.hasWebGPU).toBe('boolean');
		expect(typeof hw.hasWasmSimd).toBe('boolean');
	});

	it('runMicroBenchmark produces a valid score, tier, and opsPerSec', async () => {
		const res = await runMicroBenchmark(50); // fast 50ms test for CI

		expect(res.score).toBeGreaterThanOrEqual(0);
		expect(res.score).toBeLessThanOrEqual(100);
		expect(['HIGH', 'MID', 'LOW']).toContain(res.tier);
		expect(['emerald', 'amber', 'rose']).toContain(res.color);
		expect(res.opsPerSec).toBeGreaterThan(0);
		expect(res.estimatedLatencyMs).toBeGreaterThan(0);
	});

	it('deviceBenchmarkStore runs and populates lastResult', async () => {
		expect(deviceBenchmarkStore.isRunning).toBe(false);

		const promise = deviceBenchmarkStore.run();
		expect(deviceBenchmarkStore.isRunning).toBe(true);

		const result = await promise;
		expect(deviceBenchmarkStore.isRunning).toBe(false);
		expect(deviceBenchmarkStore.lastResult).toBe(result);
		expect(result.score).toBeGreaterThanOrEqual(0);
	});
});
