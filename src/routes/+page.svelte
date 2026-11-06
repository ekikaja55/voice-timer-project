<script lang="ts">
	import { onMount } from 'svelte';
	import { Timer, Volume2, VolumeX, Settings, X, Activity } from '@lucide/svelte';
	import { matchStore, type EnemySlotState } from '../lib/stores/matchStore.svelte.js';
	import { timerStore } from '../lib/stores/timerStore.svelte.js';
	import { attachInputListeners } from '../lib/speech/inputHandlers.js';
	import { audioChecker } from '../lib/speech/audioChecker.svelte.js';
	import EnemyCard from '../lib/components/EnemyCard.svelte';
	import VoiceBanner from '../lib/components/VoiceBanner.svelte';
	import MatchSetupModal from '../lib/components/MatchSetupModal.svelte';
	import AudioDiagnosticModal from '../lib/components/AudioDiagnosticModal.svelte';
	import VoiceShazamOverlay from '../lib/components/VoiceShazamOverlay.svelte';
	import type { TimerInstance } from '../lib/types/index.js';

	onMount(() => {
		const cleanup = attachInputListeners();
		return () => {
			cleanup();
		};
	});

	// Find standalone timers (spells not tied to the 5 lane slots)
	let slotHeroIds = $derived(
		new Set(matchStore.slots.map((s: EnemySlotState) => s.hero.id.toLowerCase()))
	);
	let standaloneTimers = $derived(
		timerStore.timers.filter(
			(t: TimerInstance) => !slotHeroIds.has(t.heroId.toLowerCase()) && t.status !== 'READY'
		)
	);
</script>

<svelte:head>
	<title>MLBB Voice Timer • Second Device HUD</title>
</svelte:head>

<div
	class="flex min-h-screen flex-col justify-between bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white"
>
	<!-- Top Navigation HUD Bar -->
	<header
		class="border-slate-850 sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-slate-950/90 px-4 backdrop-blur sm:px-6 lg:px-8"
	>
		<!-- Left: Branding & Tagline -->
		<div class="flex items-center space-x-3">
			<div
				class="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900"
			>
				<Timer class="h-4 w-4 text-indigo-400" />
			</div>
			<div>
				<h1 class="text-sm font-black tracking-tight text-white sm:text-base">
					MLBB VOICE TIMER <span class="font-mono text-xs font-semibold text-indigo-400">HUD</span>
				</h1>
				<p class="font-mono text-[10px] text-slate-400">
					Second Device Cooldown Tracker • Physical Anti-Cheat Isolation
				</p>
			</div>
		</div>

		<!-- Right Controls -->
		<div class="flex items-center space-x-2">
			<!-- Mic Status Quick Diagnostic Pill -->
			<button
				onclick={() => audioChecker.openModal()}
				class="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 font-mono text-xs font-bold text-slate-300 transition hover:border-slate-700 hover:text-white"
				title="Buka Diagnostik Mikrofon & Audio"
			>
				<Activity
					class="h-3.5 w-3.5 {audioChecker.state.isSpeechSupported
						? 'text-emerald-400'
						: 'text-amber-400'}"
				/>
				<span class="hidden sm:inline"
					>{audioChecker.state.isSpeechSupported ? 'Mic Siap' : 'Cek Status Mic'}</span
				>
			</button>

			<!-- Audio Earcon Mute Toggle -->
			<button
				onclick={() => timerStore.setAudioEnabled(!timerStore.audioEnabled)}
				class="flex items-center gap-1.5 rounded-xl border px-3 py-1.5 font-mono text-xs font-bold transition {timerStore.audioEnabled
					? 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800'
					: 'border-rose-900/60 bg-rose-950/40 text-rose-300'}"
				title="Toggle Audio Feedback"
			>
				{#if timerStore.audioEnabled}
					<Volume2 class="h-3.5 w-3.5" />
					<span class="hidden sm:inline">Audio ON</span>
				{:else}
					<VolumeX class="h-3.5 w-3.5" />
					<span class="hidden sm:inline">Mute</span>
				{/if}
			</button>

			<!-- Reset All Button -->
			{#if timerStore.timers.length > 0}
				<button
					onclick={() => timerStore.resetAll()}
					class="rounded-xl border border-rose-900/60 bg-rose-950/40 px-3 py-1.5 font-mono text-xs font-bold text-rose-300 transition hover:bg-rose-900/60"
				>
					Reset ({timerStore.timers.length})
				</button>
			{/if}

			<!-- Match Setup Button -->
			<button
				onclick={() => matchStore.setModalOpen(true)}
				class="flex items-center gap-1.5 rounded-xl border border-indigo-500/50 bg-indigo-600/30 px-3.5 py-1.5 font-mono text-xs font-bold text-indigo-300 transition hover:bg-indigo-600/40"
			>
				<Settings class="h-3.5 w-3.5" />
				<span>Setup Match</span>
			</button>
		</div>
	</header>

	<!-- Main HUD Display Container (Scaled for 70 cm viewing distance) -->
	<main class="mx-auto w-full max-w-7xl flex-1 space-y-5 p-4 sm:p-6 lg:p-8">
		<!-- Minimalist Voice Control Bar -->
		<VoiceBanner />

		<!-- 5-Slot Enemy Lineup HUD Cards Grid -->
		<section class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
			{#each matchStore.slots as slot (slot.slotIndex)}
				<EnemyCard {slot} />
			{/each}
		</section>

		<!-- Standalone / Unassigned Enemy Spell Timers Tray -->
		{#if standaloneTimers.length > 0}
			<section class="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
				<h3
					class="flex items-center gap-2 font-mono text-xs font-bold tracking-wider text-slate-400 uppercase"
				>
					<span class="h-2 w-2 animate-ping rounded-full bg-amber-400"></span>
					Spell Tambahan / Musuh Tidak Terdaftar:
				</h3>
				<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
					{#each standaloneTimers as timer (timer.id)}
						<div
							class="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-3"
						>
							<div>
								<span class="text-sm font-bold text-white">{timer.spellName}</span>
								<span class="block text-xs text-slate-400">{timer.heroName}</span>
							</div>
							<div class="flex items-center space-x-2">
								<span class="font-mono text-2xl font-black text-rose-400"
									>{timer.remainingSeconds}s</span
								>
								<button
									onclick={() => timerStore.cancelTimer(timer.id)}
									class="flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-800 hover:text-rose-400"
									title="Cancel timer"
								>
									<X class="h-3.5 w-3.5" />
								</button>
							</div>
						</div>
					{/each}
				</div>
			</section>
		{/if}
	</main>

	<!-- Minimal Footer -->
	<footer
		class="border-t border-slate-900 px-4 py-3 text-center font-mono text-[11px] text-slate-500"
	>
		MLBB Second Device HUD • Tahan Spasi / Pedal Kaki untuk bicara • Esc untuk Instant Undo
	</footer>

	<!-- Setup Enemy Lineup Modal -->
	<MatchSetupModal />

	<!-- Audio & Microphone Diagnostic Modal -->
	<AudioDiagnosticModal />

	<!-- Fullscreen Shazam-Style Voice Overlay -->
	<VoiceShazamOverlay />
</div>
