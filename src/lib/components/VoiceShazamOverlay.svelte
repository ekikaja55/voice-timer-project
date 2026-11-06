<script lang="ts">
	import { Mic, X, Check, ArrowRight, RotateCcw } from '@lucide/svelte';
	import { speechManager } from '../speech/speechManager.svelte.js';
	import { audioChecker } from '../speech/audioChecker.svelte.js';

	// Compute ripple scale based on audio volume level (0 - 100)
	let volumePulse = $derived(1 + (audioChecker.state.audioLevel / 100) * 0.4);
</script>

{#if speechManager.isOverlayOpen}
	<!-- Fullscreen Shazam-style Listening Overlay -->
	<div
		class="fixed inset-0 z-50 flex flex-col items-center justify-between bg-slate-950/92 p-6 backdrop-blur-md transition-all duration-300 select-none sm:p-10"
	>
		<!-- Top Bar: Status and Dismiss -->
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

			<button
				onclick={() => speechManager.closeOverlay()}
				class="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-400 transition hover:bg-slate-800 hover:text-white"
				title="Tutup Overlay"
			>
				<X class="h-4 w-4" />
			</button>
		</div>

		<!-- Center: Shazam Animated Radar Waveform & Speech Visualizer -->
		<div class="my-auto flex flex-col items-center justify-center space-y-8">
			<!-- Animated Concentric Rings -->
			<div class="relative flex items-center justify-center">
				<!-- Outer Pulse Ring -->
				<div
					class="absolute h-44 w-44 rounded-full border border-indigo-500/20 bg-indigo-500/5 transition-transform duration-100 sm:h-56 sm:w-56"
					style="transform: scale({volumePulse * 1.15})"
				></div>

				<!-- Mid Pulse Ring -->
				<div
					class="absolute h-36 w-36 rounded-full border border-indigo-500/40 bg-indigo-500/10 transition-transform duration-100 sm:h-44 sm:w-44"
					style="transform: scale({volumePulse})"
				></div>

				<!-- Core Mic Circle -->
				<div
					class="relative flex h-24 w-24 items-center justify-center rounded-full border border-indigo-400/60 shadow-2xl transition-all duration-150 sm:h-28 sm:w-28 {speechManager.isListening
						? 'bg-emerald-600 text-white shadow-emerald-500/30'
						: 'bg-indigo-600 text-white shadow-indigo-500/30'}"
				>
					<Mic class="h-10 w-10 sm:h-12 sm:w-12" />
				</div>
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
			<div class="max-w-xl space-y-3 text-center">
				{#if speechManager.interimTranscript || speechManager.lastTranscript}
					<p
						class="text-2xl leading-snug font-black tracking-tight text-white sm:text-4xl lg:text-5xl"
					>
						"{speechManager.interimTranscript || speechManager.lastTranscript}"
					</p>
				{:else}
					<p class="font-mono text-lg font-bold text-slate-400 sm:text-2xl">
						Bicara sekarang... (misal: "Chou fliker")
					</p>
					<p class="font-mono text-xs text-slate-500">Tahan Spasi / Pedal Kaki selama berbicara</p>
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
				Lepaskan <strong>Spasi</strong> untuk memproses • Tekan <strong>Esc</strong> untuk membatalkan
			</p>
		</div>
	</div>
{/if}
