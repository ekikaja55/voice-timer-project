<script lang="ts">
	import {
		Check,
		Cpu,
		Download,
		Mic,
		CheckCircle2,
		XCircle,
		RefreshCw,
		Play,
		Square,
		Volume2,
		AlertCircle
	} from '@lucide/svelte';
	import { speechManager } from '../../speech/speechManager.svelte.js';
	import { whisperEngine } from '../../speech/whisperEngine.svelte.js';
	import { audioChecker } from '../../speech/audioChecker.svelte.js';
	import type { SpeechEngineType } from '../../speech/types.js';

	let {
		selectedEngine = $bindable<'NATIVE' | 'WHISPER'>('NATIVE'),
		onChange = () => {}
	}: {
		selectedEngine: SpeechEngineType;
		onChange?: () => void;
	} = $props();

	let testTranscript = $state<string>('');
	let isTestingMic = $state<boolean>(false);

	function handleEngineSelect(engine: SpeechEngineType): void {
		if (selectedEngine !== engine) {
			selectedEngine = engine;
			onChange();
		}
	}

	async function handleLoadWhisper(): Promise<void> {
		await whisperEngine.loadModel();
		onChange();
	}

	function handleRetryMic(): void {
		audioChecker.requestAndStartAudioAnalysis().catch(() => {});
	}

	function handleTestRecognition(): void {
		if (isTestingMic) {
			isTestingMic = false;
			speechManager.stopListening('settings_test');
		} else {
			isTestingMic = true;
			testTranscript = '';
			speechManager.startListening('settings_test');
		}
	}

	$effect(() => {
		if (isTestingMic && speechManager.lastTranscript) {
			testTranscript = speechManager.lastTranscript;
		}
	});
</script>

<div class="space-y-6">
	<!-- 1. Dual-Engine Selector -->
	<div class="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
		<div class="flex items-center justify-between">
			<div>
				<h3 class="text-sm font-bold text-white">Speech Recognition Engine</h3>
				<p class="font-mono text-xs text-slate-400">
					Pilih teknologi pemroses suara yang digunakan selama pertandingan
				</p>
			</div>
			<span
				class="rounded bg-indigo-500/20 px-2.5 py-1 font-mono text-[11px] font-bold text-indigo-300"
			>
				Dual-Engine
			</span>
		</div>

		<div class="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
			<!-- Native Engine Card -->
			<button
				type="button"
				onclick={() => handleEngineSelect('NATIVE')}
				class="flex flex-col justify-between rounded-xl border p-4 text-left transition {selectedEngine ===
				'NATIVE'
					? 'border-cyan-500 bg-cyan-950/30 text-white ring-1 ring-cyan-500/50'
					: 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'}"
			>
				<div class="flex items-center justify-between">
					<div class="flex items-center space-x-2">
						<span class="text-sm font-bold text-white">Native Web Speech</span>
						<span
							class="rounded bg-cyan-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-cyan-300"
						>
							0 MB
						</span>
					</div>
					{#if selectedEngine === 'NATIVE'}
						<span
							class="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500 text-slate-950"
						>
							<Check class="h-3 w-3 stroke-[3]" />
						</span>
					{/if}
				</div>
				<p class="mt-2 text-xs leading-relaxed text-slate-300">
					Mesin native browser (Chromium & Safari). Latensi tercepat (sub-100ms) tanpa unduhan
					model.
				</p>
				<span class="mt-3 font-mono text-[10px] text-slate-400">
					Rekomendasi untuk: Google Chrome, Microsoft Edge, Brave
				</span>
			</button>

			<!-- Whisper AI Card -->
			<button
				type="button"
				onclick={() => handleEngineSelect('WHISPER')}
				class="flex flex-col justify-between rounded-xl border p-4 text-left transition {selectedEngine ===
				'WHISPER'
					? 'border-purple-500 bg-purple-950/30 text-white ring-1 ring-purple-500/50'
					: 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'}"
			>
				<div class="flex items-center justify-between">
					<div class="flex items-center space-x-2">
						<span class="text-sm font-bold text-white">Whisper AI Offline</span>
						<span
							class="rounded bg-purple-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-purple-300"
						>
							WASM SIMD
						</span>
					</div>
					{#if selectedEngine === 'WHISPER'}
						<span
							class="flex h-5 w-5 items-center justify-center rounded-full bg-purple-500 text-white"
						>
							<Check class="h-3 w-3 stroke-[3]" />
						</span>
					{/if}
				</div>
				<p class="mt-2 text-xs leading-relaxed text-slate-300">
					Neural network on-device via Transformers.js. Solusi utama untuk Firefox dan sistem
					offline.
				</p>
				<span class="mt-3 font-mono text-[10px] text-slate-400">
					Rekomendasi untuk: Mozilla Firefox, Linux, & Privasi Offline
				</span>
			</button>
		</div>

		<!-- Whisper Model Download & Status Card -->
		{#if selectedEngine === 'WHISPER'}
			<div class="mt-3 space-y-3 rounded-xl border border-purple-500/30 bg-slate-950 p-4">
				<div class="flex items-center justify-between">
					<div class="flex items-center space-x-2">
						<Cpu class="h-4 w-4 text-purple-400" />
						<span class="text-xs font-bold text-white">Model: onnx-community/whisper-tiny</span>
					</div>
					{#if whisperEngine.isLoaded}
						<span
							class="rounded bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-300"
						>
							AKTIF DI MEMORI
						</span>
					{:else if whisperEngine.isCachedLocally}
						<span
							class="rounded bg-indigo-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-indigo-300"
						>
							TERSEDIA DI CACHE LOKAL
						</span>
					{:else if whisperEngine.status === 'DOWNLOADING'}
						<span
							class="animate-pulse rounded bg-amber-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-300"
						>
							MENGUNDUH...
						</span>
					{:else}
						<span
							class="rounded bg-slate-800 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-400"
						>
							BELUM DIMUAT (~39 MB)
						</span>
					{/if}
				</div>

				<p class="text-xs text-slate-300">
					Model AI disimpan di browser Cache Storage untuk penggunaan offline tanpa kuota tambahan.
				</p>

				{#if whisperEngine.lastError}
					<div
						class="rounded-xl border border-rose-500/40 bg-rose-950/40 p-3 font-mono text-xs text-rose-300"
					>
						<div class="flex items-center space-x-1.5 font-bold">
							<AlertCircle class="h-4 w-4 text-rose-400" />
							<span>Kendala Unduh Model:</span>
						</div>
						<p class="mt-1 text-[11px] text-rose-200">{whisperEngine.lastError}</p>
					</div>
				{/if}

				{#if whisperEngine.status === 'DOWNLOADING'}
					<div class="space-y-1.5">
						<div class="flex justify-between font-mono text-[11px] text-slate-400">
							<span>{whisperEngine.downloadMessage}</span>
							<span class="font-bold text-purple-300">{whisperEngine.downloadProgress}%</span>
						</div>
						<div class="h-2 w-full overflow-hidden rounded-full bg-slate-800">
							<div
								class="h-full bg-purple-500 transition-all duration-150"
								style="width: {whisperEngine.downloadProgress}%"
							></div>
						</div>
					</div>
				{:else if !whisperEngine.isLoaded}
					<button
						type="button"
						onclick={handleLoadWhisper}
						class="flex w-full items-center justify-center space-x-2 rounded-xl bg-purple-600 px-4 py-2.5 font-mono text-xs font-bold text-white shadow-md shadow-purple-600/30 transition hover:bg-purple-500 active:scale-[0.99]"
					>
						<Download class="h-4 w-4" />
						<span>
							{whisperEngine.isCachedLocally
								? 'Muat Model dari Cache Lokal'
								: 'Unduh Model Whisper AI (~39 MB)'}
						</span>
					</button>
				{:else}
					<div class="flex items-center justify-between font-mono text-xs text-emerald-400">
						<span>Engine Whisper siap menerima perintah suara!</span>
						{#if whisperEngine.lastInferenceTimeMs > 0}
							<span class="text-slate-400"
								>Latensi terakhir: {whisperEngine.lastInferenceTimeMs}ms</span
							>
						{/if}
					</div>
				{/if}
			</div>
		{/if}
	</div>

	<!-- 2. Speech Recognition Test Sandbox -->
	<div class="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
		<div class="flex items-center justify-between">
			<div>
				<h3 class="text-sm font-bold text-white">Uji Akurasi Transkripsi Suara (Sandbox)</h3>
				<p class="font-mono text-xs text-slate-400">
					Uji kata-kata hero dan spell MLBB untuk memastikan akurasi engine yang aktif
				</p>
			</div>
			<button
				type="button"
				onclick={handleTestRecognition}
				class="flex items-center gap-1.5 rounded-xl px-4 py-2 font-mono text-xs font-bold transition {isTestingMic
					? 'animate-pulse bg-rose-600 text-white'
					: 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500'}"
			>
				<Mic class="h-3.5 w-3.5" />
				<span>{isTestingMic ? 'Selesai Tes' : 'Bicara untuk Tes'}</span>
			</button>
		</div>

		<div
			class="flex min-h-[70px] items-center justify-center rounded-xl border border-slate-800 bg-slate-950 p-4 text-center"
		>
			{#if testTranscript}
				<p class="text-lg font-black tracking-wide text-white">
					"{testTranscript}"
				</p>
			{:else}
				<p class="font-mono text-xs text-slate-500">
					{isTestingMic
						? 'Mendengarkan... Ucapkan contoh: "Chou fliker" atau "Hanabi aegis"'
						: 'Klik tombol "Bicara untuk Tes" di atas untuk mencoba pengenalan suara'}
				</p>
			{/if}
		</div>
	</div>

	<!-- 3. Hardware Mic Detection & Discord-Style Mirror Test -->
	<div class="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
		<div class="flex items-center justify-between">
			<div>
				<h3 class="text-sm font-bold text-white">Pemeriksaan Hardware & Uji Sinyal Mikrofon</h3>
				<p class="font-mono text-xs text-slate-400">
					Verifikasi koneksi fisik mikrofon dan dengarkan kualitas audio Anda
				</p>
			</div>
			<button
				type="button"
				onclick={handleRetryMic}
				class="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 font-mono text-xs font-semibold text-slate-200 transition hover:bg-slate-700"
			>
				<RefreshCw class="h-3.5 w-3.5" />
				<span>Deteksi Ulang</span>
			</button>
		</div>

		<!-- Hardware status row -->
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
			<div
				class="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-3.5"
			>
				<div class="flex items-center space-x-2.5">
					{#if audioChecker.state.hasAudioInputHardware}
						<CheckCircle2 class="h-4 w-4 text-emerald-400" />
						<span class="text-xs font-bold text-white">Hardware Mikrofon</span>
					{:else}
						<XCircle class="h-4 w-4 text-rose-400" />
						<span class="text-xs font-bold text-rose-300">Hardware Mikrofon</span>
					{/if}
				</div>
				<span
					class="rounded px-2 py-0.5 font-mono text-[10px] font-bold {audioChecker.state
						.hasAudioInputHardware
						? 'bg-emerald-500/20 text-emerald-300'
						: 'bg-rose-500/20 text-rose-300'}"
				>
					{audioChecker.state.hasAudioInputHardware ? 'CONNECTED' : 'NOT FOUND'}
				</span>
			</div>

			<div
				class="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-3.5"
			>
				<div class="flex items-center space-x-2.5">
					<span class="text-xs font-bold text-white">Izin Akses Mikrofon</span>
				</div>
				<span
					class="rounded px-2 py-0.5 font-mono text-[10px] font-bold {audioChecker.state
						.permissionStatus === 'granted'
						? 'bg-emerald-500/20 text-emerald-300'
						: audioChecker.state.permissionStatus === 'denied'
							? 'bg-rose-500/20 text-rose-300'
							: 'bg-slate-800 text-slate-400'}"
				>
					{audioChecker.state.permissionStatus.toUpperCase()}
				</span>
			</div>
		</div>

		<!-- Live Audio Signal Meter -->
		<div class="space-y-1.5 rounded-xl border border-slate-800 bg-slate-950 p-3.5">
			<div class="flex items-center justify-between font-mono text-[11px] text-slate-400">
				<span>Indikator Level Sinyal Suara:</span>
				<span class="font-bold text-indigo-400">{audioChecker.state.audioLevel}%</span>
			</div>
			<div class="h-2.5 w-full overflow-hidden rounded-full bg-slate-900">
				<div
					class="h-full rounded-full transition-all duration-75 {audioChecker.state.audioLevel > 50
						? 'bg-emerald-400'
						: 'bg-indigo-500'}"
					style="width: {audioChecker.state.audioLevel}%"
				></div>
			</div>
			<p class="font-mono text-[10px] text-slate-500">
				Bicaralah ke mikrofon untuk memverifikasi fluktuasi gelombang suara secara real-time.
			</p>
		</div>

		<!-- Discord-Style Mic Mirror Test (3s) -->
		<div class="space-y-2.5 rounded-xl border border-slate-800 bg-slate-950 p-4">
			<div class="flex items-center justify-between">
				<div>
					<h4 class="text-xs font-bold text-white">Uji Suara Mic (Mirror Test 3 Detik)</h4>
					<p class="mt-0.5 font-mono text-[11px] text-slate-400">
						Merekam 3 detik lalu memutar ulang suara Anda untuk menguji kejernihan tanpa feedback
						melengking
					</p>
				</div>
				<button
					type="button"
					onclick={() => audioChecker.startMicTest()}
					class="flex items-center gap-1.5 rounded-xl px-4 py-2 font-mono text-xs font-bold shadow-md transition {audioChecker
						.state.micTestStatus === 'RECORDING'
						? 'animate-pulse bg-rose-600 text-white'
						: audioChecker.state.micTestStatus === 'PLAYING'
							? 'animate-pulse bg-emerald-600 text-white'
							: 'bg-indigo-600 text-white shadow-indigo-600/30 hover:bg-indigo-500'}"
				>
					{#if audioChecker.state.micTestStatus === 'RECORDING'}
						<Square class="h-3.5 w-3.5" />
						<span>Merekam: {audioChecker.state.micTestCountdown}s...</span>
					{:else if audioChecker.state.micTestStatus === 'PLAYING'}
						<Volume2 class="h-3.5 w-3.5" />
						<span>Memutar Ulang...</span>
					{:else}
						<Play class="h-3.5 w-3.5" />
						<span>Uji Suara (3s)</span>
					{/if}
				</button>
			</div>

			{#if audioChecker.state.micTestStatus === 'RECORDING'}
				<div class="space-y-1">
					<div class="flex justify-between font-mono text-[10px] text-rose-300">
						<span>Bicaralah sekarang ("Chou fliker tes")...</span>
						<span>Sisa {audioChecker.state.micTestCountdown} detik</span>
					</div>
					<div class="h-1.5 w-full overflow-hidden rounded-full bg-slate-900">
						<div
							class="h-full bg-rose-500 transition-all duration-1000"
							style="width: {(audioChecker.state.micTestCountdown / 3) * 100}%"
						></div>
					</div>
				</div>
			{:else if audioChecker.state.micTestStatus === 'PLAYING'}
				<div
					class="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-950/30 p-2 font-mono text-[11px] text-emerald-300"
				>
					<span>Dengarkan suara Anda yang baru saja direkam...</span>
					<Volume2 class="h-4 w-4 animate-bounce" />
				</div>
			{/if}
		</div>
	</div>
</div>
