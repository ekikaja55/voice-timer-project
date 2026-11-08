<script lang="ts">
	import { Mic, Undo2, Flame, Shuffle, RotateCcw, Activity, Radio, Bug } from '@lucide/svelte';
	import { speechManager } from '../speech/speechManager.svelte.js';
	import { timerStore } from '../stores/timerStore.svelte.js';
	import { audioChecker } from '../speech/audioChecker.svelte.js';
	import { debugLogger } from '../utils/debugLogger.svelte.js';

	function handlePreset(phrase: string): void {
		speechManager.simulateTranscript(phrase);
	}

	function handleUndo(): void {
		timerStore.undoLastTimer();
	}

	let ignoreClickUntil = 0;

	function handleBannerPointerDown(e: PointerEvent): void {
		debugLogger.logTouch('BANNER', 'mic_button_pointerdown', e);
	}

	function handleBannerClick(): void {
		if (performance.now() < ignoreClickUntil) return;
		debugLogger.info('BANNER', 'mic_button_click -> toggleListening');
		speechManager.toggleListening('banner_click');
	}
</script>

<div
	class="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-sm select-none"
>
	<!-- Top Row: Mic Action & Undo -->
	<div class="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
		<!-- Mic Trigger Button -->
		<div class="flex items-center space-x-3">
			<button
				type="button"
				onpointerdown={handleBannerPointerDown}
				onclick={handleBannerClick}
				class="flex h-12 items-center space-x-2.5 rounded-xl border px-4 font-mono text-xs font-bold transition select-none active:scale-95 {speechManager.isListening
					? 'animate-pulse border-emerald-500 bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
					: 'hover:bg-slate-750 border-slate-700 bg-slate-800 text-slate-200 hover:border-indigo-500/80'}"
				title="Klik untuk bicara (atau Tahan Spasi / Pedal Kaki)"
				style="touch-action: manipulation; -webkit-tap-highlight-color: transparent;"
			>
				{#if speechManager.isListening}
					<Radio class="h-4 w-4 animate-ping text-emerald-200" />
					<span>MENDENGARKAN (KETUK UNTUK BERHENTI)</span>
				{:else}
					<Mic class="h-4 w-4 text-indigo-400" />
					<span>KETUK / TAHAN SPASI</span>
				{/if}
			</button>

			<!-- Mic Diagnostic Status Link -->
			<a
				href="/settings"
				class="hidden items-center space-x-1.5 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 font-mono text-[11px] font-semibold text-slate-400 transition hover:border-slate-700 hover:text-slate-200 sm:flex"
				title="Diagnostik Audio & Mikrofon"
			>
				<Activity
					class="h-3.5 w-3.5 {audioChecker.state.isSpeechSupported
						? 'text-emerald-400'
						: 'text-amber-400'}"
				/>
				<span>{audioChecker.state.isSpeechSupported ? 'Mic Siap' : 'Cek Status Mic'}</span>
			</a>

			<!-- Debug Logger Shortcut Button -->
			<button
				onclick={() => debugLogger.openPanel()}
				class="flex items-center space-x-1.5 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 font-mono text-[11px] font-semibold text-slate-400 transition hover:border-slate-700 hover:text-indigo-300"
				title="Buka Debug Log Viewer"
			>
				<Bug class="h-3.5 w-3.5 text-indigo-400" />
				<span class="hidden sm:inline">Debug Log</span>
			</button>
		</div>

		<!-- Instant Undo Button -->
		<button
			onclick={handleUndo}
			class="flex items-center justify-center space-x-2 rounded-xl border border-rose-900/60 bg-rose-950/40 px-4 py-2.5 font-mono text-xs font-bold text-rose-300 transition hover:bg-rose-900/40 active:scale-95"
			title="Batalkan timer terakhir (Pintasan: Esc)"
		>
			<Undo2 class="h-3.5 w-3.5" />
			<span>BATALKAN TERAKHIR (Esc)</span>
		</button>
	</div>

	<!-- Bottom Row: Quick Simulation Presets -->
	<div class="flex flex-wrap items-center gap-2 border-t border-slate-800/60 pt-2.5">
		<span class="font-mono text-[11px] text-slate-400">Simulasi Cepat:</span>
		<button
			onclick={() => handlePreset('chou fliker')}
			class="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 font-mono text-xs text-slate-300 transition hover:border-slate-700 hover:text-white"
		>
			"Chou fliker"
		</button>
		<button
			onclick={() => handlePreset('chou fliker hanabi aegis natan purify pyt')}
			class="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 font-mono text-xs text-slate-300 transition hover:border-slate-700 hover:text-white"
		>
			<Flame class="h-3.5 w-3.5 text-amber-400" />
			<span>Burst 3 Hero + PYT</span>
		</button>
		<button
			onclick={() => handlePreset('chou hanabi fliker aegis')}
			class="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 font-mono text-xs text-slate-300 transition hover:border-slate-700 hover:text-white"
		>
			<Shuffle class="h-3.5 w-3.5 text-indigo-400" />
			<span>Pola Paralel</span>
		</button>
		<button
			onclick={() => handlePreset('batal')}
			class="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 font-mono text-xs text-slate-300 transition hover:border-rose-900/80 hover:text-rose-300"
		>
			<RotateCcw class="h-3.5 w-3.5 text-rose-400" />
			<span>Voice "Batal"</span>
		</button>
	</div>
</div>
