<script lang="ts">
	import { Mic, X, Check, ArrowRight, RotateCcw, Bug, RefreshCw } from '@lucide/svelte';
	import { speechManager } from '../speech/speechManager.svelte.js';
	import { whisperEngine } from '../speech/whisperEngine.svelte.js';
	import { audioChecker } from '../speech/audioChecker.svelte.js';
	import { debugLogger } from '../utils/debugLogger.svelte.js';

	// Compute ripple scale based on audio volume level (0 - 100)
	let volumePulse = $derived(1 + (audioChecker.state.audioLevel / 100) * 0.4);

	let pointerStartTime = 0;
	let isPointerHeld = false;
	let holdTimer: ReturnType<typeof setTimeout> | null = null;
	let ignoreSyntheticClickUntil = 0;

	function handlePointerDown(e: PointerEvent): void {
		debugLogger.logTouch('OVERLAY', 'mic_pointerdown', e);
		pointerStartTime = performance.now();
		isPointerHeld = false;

		// Timer to detect hold (> 300ms)
		holdTimer = setTimeout(() => {
			isPointerHeld = true;
			debugLogger.info('OVERLAY', 'Hold threshold exceeded (>300ms) -> Aktifkan mode Hold-to-Talk');
			if (!speechManager.isListening) {
				speechManager.startListening('overlay_hold');
			}
		}, 300);
	}

	function handlePointerUp(e: PointerEvent): void {
		const elapsed = performance.now() - pointerStartTime;
		debugLogger.logTouch('OVERLAY', 'mic_pointerup', e, {
			elapsedMs: Math.round(elapsed),
			isPointerHeld
		});

		if (holdTimer) {
			clearTimeout(holdTimer);
			holdTimer = null;
		}

		ignoreSyntheticClickUntil = performance.now() + 450;

		if (isPointerHeld) {
			// Released from Hold-to-Talk mode -> stop listening
			debugLogger.info('OVERLAY', 'Hold-to-talk dilepas -> Stop listening');
			isPointerHeld = false;
			speechManager.stopListening('overlay_hold_release');
		} else {
			// Quick Tap (< 300ms) -> Toggle Listening
			debugLogger.info('OVERLAY', 'Quick Tap terdeteksi -> Toggle listening');
			speechManager.toggleListening('overlay_tap');
		}
	}

	function handlePointerCancel(e: PointerEvent): void {
		debugLogger.logTouch('OVERLAY', 'mic_pointercancel', e);
		if (holdTimer) {
			clearTimeout(holdTimer);
			holdTimer = null;
		}
		isPointerHeld = false;
		if (speechManager.isListening) {
			speechManager.stopListening('overlay_pointer_cancel');
		}
	}

	function handleClick(): void {
		if (performance.now() < ignoreSyntheticClickUntil) {
			debugLogger.debug('OVERLAY', 'Synthetic click diabaikan (sudah ditangani pointer event)');
			return;
		}
		debugLogger.info('OVERLAY', 'Fallback click handler dipicu');
		speechManager.toggleListening('overlay_click');
	}

	function handleBackdropClick(e: MouseEvent): void {
		if (e.target === e.currentTarget) {
			debugLogger.info('OVERLAY', 'Backdrop clicked -> closeOverlay');
			speechManager.closeOverlay('backdrop');
		}
	}
</script>

{#if speechManager.isOverlayOpen}
	<!-- Fullscreen Shazam-style Listening Overlay with Backdrop Click dismiss -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		onclick={handleBackdropClick}
		class="fixed inset-0 z-50 flex flex-col items-center justify-between bg-slate-950/94 p-5 backdrop-blur-md transition-all duration-300 select-none sm:p-10"
	>
		<!-- Top Bar: Status, Debug Log Trigger, and Dismiss -->
		<div class="flex w-full max-w-2xl items-center justify-between">
			<div class="flex items-center space-x-2.5">
				<span
					class="h-3 w-3 rounded-full {speechManager.isListening
						? 'animate-ping bg-emerald-400'
						: 'bg-indigo-400'}"
				></span>
				<span class="font-mono text-xs font-bold tracking-widest text-slate-300 uppercase">
					{speechManager.isListening ? 'MENDENGARKAN SUARA AKTIF' : 'TRANSKRIP DIPROSES'}
				</span>
			</div>

			<div class="flex items-center space-x-2">
				<!-- Quick Debug Logger Trigger from inside Overlay -->
				<button
					onclick={() => debugLogger.openPanel()}
					class="flex h-9 items-center space-x-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 text-slate-400 transition hover:bg-slate-800 hover:text-white"
					title="Buka Debug Log"
				>
					<Bug class="h-4 w-4 text-indigo-400" />
					<span class="hidden font-mono text-xs font-semibold sm:inline">Debug Log</span>
				</button>

				<!-- Dismiss Overlay Button -->
				<button
					onclick={() => speechManager.closeOverlay('close_button')}
					class="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-400 transition hover:bg-slate-800 hover:text-white"
					title="Tutup Overlay"
				>
					<X class="h-4 w-4" />
				</button>
			</div>
		</div>

		<!-- Center: Shazam Animated Radar Waveform & Speech Visualizer -->
		<div class="my-auto flex flex-col items-center justify-center space-y-6 sm:space-y-8">
			<!-- Animated Concentric Rings & Interactive Mic Button -->
			<div class="relative flex items-center justify-center">
				<!-- Outer Pulse Ring -->
				<div
					class="pointer-events-none absolute h-48 w-48 rounded-full border border-indigo-500/20 bg-indigo-500/5 transition-transform duration-100 sm:h-64 sm:w-64"
					style="transform: scale({volumePulse * 1.15})"
				></div>

				<!-- Mid Pulse Ring -->
				<div
					class="pointer-events-none absolute h-36 w-36 rounded-full border border-indigo-500/40 bg-indigo-500/10 transition-transform duration-100 sm:h-48 sm:w-48"
					style="transform: scale({volumePulse})"
				></div>

				<!-- Core Interactive Mic Button (Touch & Pointer Optimized for Mobile) -->
				<button
					type="button"
					aria-label={speechManager.isListening ? 'Berhenti mendengarkan' : 'Mulai bicara'}
					onpointerdown={handlePointerDown}
					onpointerup={handlePointerUp}
					onpointercancel={handlePointerCancel}
					onclick={handleClick}
					class="relative flex h-28 w-28 cursor-pointer items-center justify-center rounded-full border shadow-2xl transition-all duration-150 active:scale-95 sm:h-32 sm:w-32 {speechManager.isListening
						? 'border-emerald-400 bg-emerald-600 text-white ring-4 shadow-emerald-500/40 ring-emerald-500/30'
						: 'border-indigo-400/80 bg-indigo-600 text-white shadow-indigo-500/40 hover:bg-indigo-500'}"
					style="touch-action: manipulation; -webkit-tap-highlight-color: transparent;"
				>
					<Mic class="h-12 w-12 sm:h-14 sm:w-14" />
				</button>
			</div>

			<!-- Mobile Hint below mic button -->
			<div class="text-center">
				<p class="font-mono text-xs font-semibold text-slate-300">
					{speechManager.isListening
						? 'Mendengarkan... Ketuk tombol untuk selesai'
						: 'Ketuk tombol mic untuk bicara'}
				</p>
			</div>

			<!-- Real-time Audio Level Bar Indicator -->
			{#if audioChecker.state.isAudioStreaming}
				<div class="flex items-center space-x-1.5">
					{#each [15, 30, 45, 60, 75, 90] as threshold (threshold)}
						<div
							class="w-1.5 rounded-full transition-all duration-75 {audioChecker.state.audioLevel >=
							threshold
								? 'h-6 bg-emerald-400'
								: 'h-2 bg-slate-800'}"
						></div>
					{/each}
				</div>
			{/if}

			<!-- Big Live Transcript Display -->
			<div class="max-w-xl space-y-3 px-4 text-center">
				{#if whisperEngine.status === 'TRANSCRIBING'}
					<div
						class="flex animate-pulse items-center justify-center space-x-2 font-mono text-base text-indigo-400"
					>
						<RefreshCw class="h-5 w-5 animate-spin" />
						<span>Whisper AI sedang memproses inferensi suara...</span>
					</div>
				{:else if speechManager.interimTranscript || speechManager.lastTranscript}
					<p
						class="text-2xl leading-snug font-black tracking-tight text-white sm:text-4xl lg:text-5xl"
					>
						"{speechManager.interimTranscript || speechManager.lastTranscript}"
					</p>
				{:else}
					<p class="font-mono text-base font-bold text-slate-400 sm:text-2xl">
						Bicara sekarang... (misal: "Chou fliker")
					</p>
					<p class="font-mono text-xs text-slate-500">
						Desktop: Tahan Spasi • Mobile: Ketuk tombol mikrofon
					</p>
				{/if}

				{#if audioChecker.state.isFirefox && speechManager.selectedEngine !== 'WHISPER'}
					<div
						class="mt-2 rounded-xl border border-amber-500/40 bg-amber-950/40 p-2.5 text-center font-mono text-[11px] text-amber-200"
					>
						<strong>Perhatian Firefox:</strong> Engine Web Speech di Firefox belum mendukung bahasa
						Indonesia. Silakan gunakan <strong>Whisper AI Offline</strong> di menu Diagnostik.
					</div>
				{/if}
			</div>

			<!-- Parsed Action Result Feedback Chips -->
			{#if speechManager.lastParsedResult}
				<div
					class="animate-in fade-in zoom-in-95 flex flex-wrap justify-center gap-2.5 duration-200"
				>
					{#if speechManager.lastParsedResult.isUndo}
						<div
							class="flex items-center gap-1.5 rounded-xl border border-rose-500/60 bg-rose-950/80 px-4 py-2 font-mono text-xs font-bold text-rose-300 shadow-lg"
						>
							<RotateCcw class="h-4 w-4" />
							<span>TIMER TERAKHIR DIBATALKAN</span>
						</div>
					{:else if speechManager.lastParsedResult.isReset}
						<div
							class="flex items-center gap-1.5 rounded-xl border border-rose-500/60 bg-rose-950/80 px-4 py-2 font-mono text-xs font-bold text-rose-300 shadow-lg"
						>
							<RotateCcw class="h-4 w-4" />
							<span>SELURUH TIMER DIRESET</span>
						</div>
					{:else if speechManager.lastParsedResult.pairs.length > 0}
						{#each speechManager.lastParsedResult.pairs as pair, index (`${pair.heroId || 'enemy'}-${pair.spell.id}-${index}`)}
							<div
								class="flex items-center gap-2 rounded-xl border border-emerald-500/60 bg-emerald-950/80 px-4 py-2 font-mono text-xs font-bold text-emerald-300 shadow-lg shadow-emerald-950/50"
							>
								<Check class="h-4 w-4 text-emerald-400" />
								<span>{pair.heroName}</span>
								<ArrowRight class="h-3.5 w-3.5 text-slate-400" />
								<span>{pair.spell.name}</span>
								{#if pair.hasPyt}
									<span class="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-300"
										>PYT -15%</span
									>
								{/if}
							</div>
						{/each}
					{/if}
				</div>
			{/if}
		</div>

		<!-- Bottom Hint -->
		<div class="text-center">
			<p class="font-mono text-xs text-slate-500">
				Ketuk di luar area untuk menutup • Tekan <strong>Esc</strong> untuk membatalkan
			</p>
		</div>
	</div>
{/if}
