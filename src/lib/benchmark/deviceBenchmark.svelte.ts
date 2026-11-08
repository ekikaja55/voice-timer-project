/**
 * Device Benchmark Suite for MLBB Voice Timer HUD
 * Evaluates hardware floating-point and WASM performance to determine
 * whether on-device Whisper AI is suitable without competitive delay.
 */

import { debugLogger } from '../utils/debugLogger.svelte.js';

export type BenchmarkTier = 'HIGH' | 'MID' | 'LOW';

export interface HardwareCapabilities {
	concurrency: number;
	deviceMemoryGb: number | null;
	hasWebGPU: boolean;
	hasWasmSimd: boolean;
}

export interface BenchmarkResult {
	score: number; // 0 - 100
	tier: BenchmarkTier;
	label: string;
	color: 'emerald' | 'amber' | 'rose';
	recommendation: string;
	estimatedLatencyMs: number;
	opsPerSec: number;
	durationMs: number;
	hardware: HardwareCapabilities;
}

/**
 * Validates WebAssembly SIMD support using minimal byte sequence.
 */
export function checkWasmSimd(): boolean {
	if (typeof WebAssembly === 'undefined' || !WebAssembly.validate) {
		return false;
	}
	try {
		// Valid minimal WASM module with SIMD v128 instruction
		return WebAssembly.validate(
			new Uint8Array([
				0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 125, 0, 0,
				0, 0, 11
			])
		);
	} catch {
		return false;
	}
}

/**
 * Inspects host device hardware capabilities.
 */
export function inspectHardware(): HardwareCapabilities {
	const nav = typeof navigator !== 'undefined' ? navigator : null;
	const concurrency = nav?.hardwareConcurrency || 4;
	const deviceMemoryGb =
		nav && 'deviceMemory' in nav ? ((nav as { deviceMemory?: number }).deviceMemory ?? null) : null;
	const isFirefox = typeof nav !== 'undefined' && nav !== null && /Firefox/i.test(nav.userAgent);
	const hasWebGPU =
		!isFirefox &&
		typeof nav !== 'undefined' &&
		nav !== null &&
		'gpu' in nav &&
		!!(nav as { gpu?: unknown }).gpu;
	const hasWasmSimd = checkWasmSimd();

	return {
		concurrency,
		deviceMemoryGb,
		hasWebGPU,
		hasWasmSimd
	};
}

/**
 * Runs a 250ms matrix computation benchmark loop.
 * Yields progress updates via callback to avoid blocking the UI thread.
 */
export async function runMicroBenchmark(
	targetDurationMs = 250,
	onProgress?: (percent: number) => void
): Promise<BenchmarkResult> {
	const hardware = inspectHardware();
	const startTime = performance.now();
	let opsCount = 0;

	// Warm-up phase
	const size = 32;
	const matrixA = new Float32Array(size * size);
	const matrixB = new Float32Array(size * size);
	const matrixC = new Float32Array(size * size);

	for (let i = 0; i < size * size; i++) {
		matrixA[i] = Math.random() * 2.0 - 1.0;
		matrixB[i] = Math.random() * 2.0 - 1.0;
	}

	const batchDuration = 25; // 25ms per time slice
	let elapsed = 0;

	while (elapsed < targetDurationMs) {
		const sliceStart = performance.now();
		while (performance.now() - sliceStart < batchDuration) {
			// Square Matrix Multiply: 2 * size^3 FLOPs
			for (let i = 0; i < size; i++) {
				for (let j = 0; j < size; j++) {
					let sum = 0;
					for (let k = 0; k < size; k++) {
						sum += matrixA[i * size + k] * matrixB[k * size + j];
					}
					matrixC[i * size + j] = sum;
				}
			}
			opsCount += 2 * size * size * size;
		}

		elapsed = performance.now() - startTime;
		if (onProgress) {
			const percent = Math.min(100, Math.round((elapsed / targetDurationMs) * 100));
			onProgress(percent);
		}

		// Yield event loop briefly for smooth UI
		await new Promise((resolve) => setTimeout(resolve, 0));
	}

	const totalTime = performance.now() - startTime;
	const opsPerSec = (opsCount / totalTime) * 1000;

	// Scoring logic:
	// 50,000,000 FLOP/s is typical mid baseline.
	// Boost score if WebGPU and WASM SIMD are present.
	const rawComputeScore = Math.min(80, (opsPerSec / 60_000_000) * 80);
	let featureBonus = 0;
	if (hardware.hasWasmSimd) featureBonus += 10;
	if (hardware.hasWebGPU) featureBonus += 10;
	if (hardware.concurrency >= 8) featureBonus += 5;

	const finalScore = Math.min(100, Math.max(5, Math.round(rawComputeScore + featureBonus)));

	let tier: BenchmarkTier = 'LOW';
	let label = 'Low Performance (Gunakan Native / HUD)';
	let color: 'emerald' | 'amber' | 'rose' = 'rose';
	let recommendation =
		'Hardware tidak disarankan untuk Whisper AI offline karena latensi inferensi dapat melebihi 3 detik. Gunakan Native Web Speech API atau 1-Tap Touch HUD.';
	let estimatedLatencyMs = 3500;

	if (finalScore >= 70) {
		tier = 'HIGH';
		label = 'High Performance (Siap Whisper AI)';
		color = 'emerald';
		recommendation =
			'Hardware sangat mumpuni untuk menjalankan Whisper AI offline dengan latensi rendah (< 600ms). Cocok untuk mode ranked.';
		estimatedLatencyMs = 450;
	} else if (finalScore >= 40) {
		tier = 'MID';
		label = 'Medium Performance (Perlu Konfirmasi)';
		color = 'amber';
		recommendation =
			'Hardware berkemampuan sedang dengan estimasi latensi 1.2s - 2.0s. Dapat digunakan dengan jeda tanggap wajar.';
		estimatedLatencyMs = 1500;
	}

	const result: BenchmarkResult = {
		score: finalScore,
		tier,
		label,
		color,
		recommendation,
		estimatedLatencyMs,
		opsPerSec: Math.round(opsPerSec),
		durationMs: Math.round(totalTime),
		hardware
	};

	debugLogger.info('SYS', `Benchmark selesai: Skor ${finalScore} [${tier}]`, {
		opsPerSec: result.opsPerSec,
		hardware
	});

	return result;
}

/**
 * Reactive benchmark state manager for Svelte 5.
 */
class DeviceBenchmarkStore {
	isRunning = $state(false);
	progress = $state(0);
	lastResult = $state<BenchmarkResult | null>(null);

	async run(): Promise<BenchmarkResult> {
		this.isRunning = true;
		this.progress = 0;
		try {
			const res = await runMicroBenchmark(280, (p) => {
				this.progress = p;
			});
			this.lastResult = res;
			return res;
		} finally {
			this.isRunning = false;
			this.progress = 100;
		}
	}
}

export const deviceBenchmarkStore = new DeviceBenchmarkStore();
