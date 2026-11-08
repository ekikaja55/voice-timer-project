<script lang="ts">
	import { Gauge, RefreshCw, Cpu, Zap, Activity } from '@lucide/svelte';
	import { deviceBenchmarkStore, inspectHardware } from '../../benchmark/deviceBenchmark.svelte.js';

	const hardware = inspectHardware();

	async function handleRunBenchmark(): Promise<void> {
		await deviceBenchmarkStore.run();
	}
</script>

<div class="space-y-6">
	<!-- 1. Benchmark Trigger Header Card -->
	<div class="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
		<div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
			<div class="flex items-center space-x-3">
				<div
					class="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400"
				>
					<Gauge class="h-5 w-5" />
				</div>
				<div>
					<h3 class="text-sm font-bold text-white">Device Benchmark Suite</h3>
					<p class="font-mono text-xs text-slate-400">
						Uji mikro-komputasi CPU/WASM untuk mengukur kelayakan Whisper AI tanpa jeda kompetitif
					</p>
				</div>
			</div>

			<button
				type="button"
				onclick={handleRunBenchmark}
				disabled={deviceBenchmarkStore.isRunning}
				class="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 font-mono text-xs font-bold text-white shadow-md shadow-indigo-600/30 transition hover:bg-indigo-500 active:scale-[0.99] disabled:opacity-50"
			>
				<RefreshCw class="h-4 w-4 {deviceBenchmarkStore.isRunning ? 'animate-spin' : ''}" />
				<span>{deviceBenchmarkStore.isRunning ? 'Sedang Menguji...' : 'Jalankan Benchmark'}</span>
			</button>
		</div>

		{#if deviceBenchmarkStore.isRunning}
			<div class="mt-4 space-y-1.5">
				<div class="flex justify-between font-mono text-xs text-slate-300">
					<span>Kalkulasi matriks floating-point 250ms...</span>
					<span class="font-bold text-indigo-400">{deviceBenchmarkStore.progress}%</span>
				</div>
				<div class="h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
					<div
						class="h-full bg-indigo-500 transition-all duration-75"
						style="width: {deviceBenchmarkStore.progress}%"
					></div>
				</div>
			</div>
		{/if}
	</div>

	<!-- 2. Benchmark Result Card (if completed) -->
	{#if deviceBenchmarkStore.lastResult}
		{@const res = deviceBenchmarkStore.lastResult}
		<div
			class="space-y-4 rounded-2xl border p-5 {res.tier === 'HIGH'
				? 'border-emerald-500/40 bg-emerald-950/20'
				: res.tier === 'MID'
					? 'border-amber-500/40 bg-amber-950/20'
					: 'border-rose-500/40 bg-rose-950/20'}"
		>
			<div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
				<div class="flex items-center space-x-3">
					<span
						class="rounded-xl px-3 py-1.5 font-mono text-base font-black {res.tier === 'HIGH'
							? 'border border-emerald-500/30 bg-emerald-500/20 text-emerald-300'
							: res.tier === 'MID'
								? 'border border-amber-500/30 bg-amber-500/20 text-amber-300'
								: 'border border-rose-500/30 bg-rose-500/20 text-rose-300'}"
					>
						SKOR: {res.score}/100 [{res.tier}]
					</span>
					<div>
						<h4 class="text-sm font-bold text-white">{res.label}</h4>
						<p class="font-mono text-xs text-slate-300">
							Estimasi Latensi Inferensi: ~{res.estimatedLatencyMs}ms
						</p>
					</div>
				</div>

				<div class="font-mono text-xs text-slate-400">
					Throughput: <strong class="text-white"
						>{(res.opsPerSec / 1_000_000).toFixed(1)} MFLOP/s</strong
					>
				</div>
			</div>

			<p
				class="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-xs leading-relaxed text-slate-200"
			>
				{res.recommendation}
			</p>
		</div>
	{/if}

	<!-- 3. Hardware Capabilities Specs -->
	<div class="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
		<h3 class="text-sm font-bold text-white">Spesifikasi Hardware Terdeteksi</h3>
		<p class="font-mono text-xs text-slate-400">
			Parameter akselerasi komputasi yang tersedia di perangkat host ini
		</p>

		<div class="grid grid-cols-2 gap-3 pt-1 sm:grid-cols-4">
			<div class="space-y-1 rounded-xl border border-slate-800 bg-slate-950 p-3.5">
				<div class="flex items-center space-x-2 font-mono text-[11px] text-slate-400">
					<Cpu class="h-3.5 w-3.5 text-indigo-400" />
					<span>Logical Cores</span>
				</div>
				<div class="font-mono text-base font-bold text-white">
					{hardware.concurrency} Cores
				</div>
			</div>

			<div class="space-y-1 rounded-xl border border-slate-800 bg-slate-950 p-3.5">
				<div class="flex items-center space-x-2 font-mono text-[11px] text-slate-400">
					<Zap class="h-3.5 w-3.5 text-indigo-400" />
					<span>WASM SIMD</span>
				</div>
				<div
					class="font-mono text-base font-bold {hardware.hasWasmSimd
						? 'text-emerald-400'
						: 'text-slate-500'}"
				>
					{hardware.hasWasmSimd ? 'DIDUKUNG' : 'TIDAK'}
				</div>
			</div>

			<div class="space-y-1 rounded-xl border border-slate-800 bg-slate-950 p-3.5">
				<div class="flex items-center space-x-2 font-mono text-[11px] text-slate-400">
					<Activity class="h-3.5 w-3.5 text-indigo-400" />
					<span>WebGPU</span>
				</div>
				<div
					class="font-mono text-base font-bold {hardware.hasWebGPU
						? 'text-emerald-400'
						: 'text-slate-500'}"
				>
					{hardware.hasWebGPU ? 'AKTIF' : 'NONAKTIF'}
				</div>
			</div>

			<div class="space-y-1 rounded-xl border border-slate-800 bg-slate-950 p-3.5">
				<div class="flex items-center space-x-2 font-mono text-[11px] text-slate-400">
					<Gauge class="h-3.5 w-3.5 text-indigo-400" />
					<span>RAM Estimasi</span>
				</div>
				<div class="font-mono text-base font-bold text-white">
					{hardware.deviceMemoryGb ? `${hardware.deviceMemoryGb} GB` : 'N/A'}
				</div>
			</div>
		</div>
	</div>
</div>
