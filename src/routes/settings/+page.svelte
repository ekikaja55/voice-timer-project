<script lang="ts">
	import { onMount } from 'svelte';
	import { beforeNavigate, goto } from '$app/navigation';
	import { ArrowLeft, Check, Sparkles, Mic, Radio, Gauge, Timer } from '@lucide/svelte';
	import { speechManager } from '../../lib/speech/speechManager.svelte.js';
	import { voiceAnnouncer } from '../../lib/audio/voiceAnnouncer.svelte.js';
	import { timerStore } from '../../lib/stores/timerStore.svelte.js';
	import type { SpeechEngineType } from '../../lib/speech/types.js';

	import SpeechDiagnosticsTab from '../../lib/components/settings/SpeechDiagnosticsTab.svelte';
	import VoiceAnnouncerTab from '../../lib/components/settings/VoiceAnnouncerTab.svelte';
	import DeviceBenchmarkTab from '../../lib/components/settings/DeviceBenchmarkTab.svelte';
	import UnsavedChangesModal from '../../lib/components/settings/UnsavedChangesModal.svelte';

	type SettingsTab = 'speech' | 'announcer' | 'benchmark';

	let activeTab = $state<SettingsTab>('speech');
	let isDirty = $state<boolean>(false);
	let isConfirmModalOpen = $state<boolean>(false);
	let pendingNavUrl = $state<string | null>(null);
	let saveSuccessToast = $state<boolean>(false);

	// Baseline snapshot
	let initialEngine = $state<SpeechEngineType>(speechManager.selectedEngine);
	let initialAnnouncerEnabled = $state<boolean>(voiceAnnouncer.settings.enabled);
	let initialAnnouncerLang = $state<'en' | 'id'>(voiceAnnouncer.settings.language);
	let initialAnnouncerVolume = $state<number>(voiceAnnouncer.settings.volume);
	let initialAnnouncer10s = $state<boolean>(voiceAnnouncer.settings.warnAt10Seconds);
	let initialAnnouncerReady = $state<boolean>(voiceAnnouncer.settings.announceReady);

	// Draft state
	let draftEngine = $state<SpeechEngineType>(speechManager.selectedEngine);
	let draftAnnouncerEnabled = $state<boolean>(voiceAnnouncer.settings.enabled);
	let draftAnnouncerLang = $state<'en' | 'id'>(voiceAnnouncer.settings.language);
	let draftAnnouncerVolume = $state<number>(voiceAnnouncer.settings.volume);
	let draftAnnouncer10s = $state<boolean>(voiceAnnouncer.settings.warnAt10Seconds);
	let draftAnnouncerReady = $state<boolean>(voiceAnnouncer.settings.announceReady);

	// Active running timers in background
	let activeTimers = $derived(timerStore.timers.filter((t) => t.status !== 'READY'));

	function checkDirty(): void {
		isDirty =
			draftEngine !== initialEngine ||
			draftAnnouncerEnabled !== initialAnnouncerEnabled ||
			draftAnnouncerLang !== initialAnnouncerLang ||
			Math.abs(draftAnnouncerVolume - initialAnnouncerVolume) > 0.01 ||
			draftAnnouncer10s !== initialAnnouncer10s ||
			draftAnnouncerReady !== initialAnnouncerReady;
	}

	function handleSave(): void {
		// Commit draft to services
		speechManager.setEngine(draftEngine);
		voiceAnnouncer.settings.enabled = draftAnnouncerEnabled;
		voiceAnnouncer.setLanguage(draftAnnouncerLang);
		voiceAnnouncer.settings.volume = draftAnnouncerVolume;
		voiceAnnouncer.settings.warnAt10Seconds = draftAnnouncer10s;
		voiceAnnouncer.settings.announceReady = draftAnnouncerReady;

		// Update baseline
		initialEngine = draftEngine;
		initialAnnouncerEnabled = draftAnnouncerEnabled;
		initialAnnouncerLang = draftAnnouncerLang;
		initialAnnouncerVolume = draftAnnouncerVolume;
		initialAnnouncer10s = draftAnnouncer10s;
		initialAnnouncerReady = draftAnnouncerReady;

		isDirty = false;
		saveSuccessToast = true;
		setTimeout(() => {
			saveSuccessToast = false;
		}, 2500);
	}

	function handleDiscard(): void {
		// Reset draft back to baseline
		draftEngine = initialEngine;
		draftAnnouncerEnabled = initialAnnouncerEnabled;
		draftAnnouncerLang = initialAnnouncerLang;
		draftAnnouncerVolume = initialAnnouncerVolume;
		draftAnnouncer10s = initialAnnouncer10s;
		draftAnnouncerReady = initialAnnouncerReady;

		isDirty = false;
		isConfirmModalOpen = false;

		if (pendingNavUrl) {
			const target = pendingNavUrl;
			pendingNavUrl = null;
			goto(target);
		}
	}

	function handleSaveAndExit(): void {
		handleSave();
		isConfirmModalOpen = false;
		if (pendingNavUrl) {
			const target = pendingNavUrl;
			pendingNavUrl = null;
			goto(target);
		}
	}

	function handleCancelExit(): void {
		isConfirmModalOpen = false;
		pendingNavUrl = null;
	}

	function handleBackClick(): void {
		if (isDirty) {
			pendingNavUrl = '/';
			isConfirmModalOpen = true;
		} else {
			goto('/');
		}
	}

	// Intercept internal SvelteKit client-side navigation if dirty
	beforeNavigate((navigation) => {
		if (isDirty && !isConfirmModalOpen) {
			navigation.cancel();
			pendingNavUrl = navigation.to?.url.pathname || '/';
			isConfirmModalOpen = true;
		}
	});

	// Hook browser window unload / reload
	onMount(() => {
		const handleBeforeUnload = (e: BeforeUnloadEvent) => {
			if (isDirty) {
				e.preventDefault();
				e.returnValue = '';
			}
		};

		window.addEventListener('beforeunload', handleBeforeUnload);
		return () => {
			window.removeEventListener('beforeunload', handleBeforeUnload);
		};
	});
</script>

<svelte:head>
	<title>Pengaturan • MLBB Voice Timer HUD</title>
</svelte:head>

<div
	class="flex min-h-screen flex-col justify-between bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white"
>
	<!-- Top Navigation Header -->
	<header
		class="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 px-4 py-3.5 backdrop-blur sm:px-6 lg:px-8"
	>
		<div class="mx-auto flex max-w-5xl items-center justify-between">
			<!-- Left: Back Button & Title -->
			<div class="flex items-center space-x-3.5">
				<button
					type="button"
					onclick={handleBackClick}
					class="flex h-9 items-center space-x-2 rounded-xl border border-slate-800 bg-slate-900 px-3 text-slate-300 transition hover:bg-slate-800 hover:text-white"
					title="Kembali ke Layar Pertandingan"
				>
					<ArrowLeft class="h-4 w-4" />
					<span class="hidden font-mono text-xs font-bold sm:inline">Kembali ke HUD</span>
				</button>

				<div>
					<h1 class="text-sm font-black tracking-tight text-white sm:text-base">
						PENGATURAN HUD & SUARA
					</h1>
					<p class="font-mono text-[10px] text-slate-400">
						Konfigurasi Speech Engine, Voice Announcer, & Benchmark
					</p>
				</div>
			</div>

			<!-- Right: Active Timers Warning & Save Button -->
			<div class="flex items-center space-x-2.5">
				<!-- Active Background Timers Pill -->
				{#if activeTimers.length > 0}
					<div
						class="flex animate-pulse items-center space-x-1.5 rounded-xl border border-amber-500/40 bg-amber-950/30 px-3 py-1.5 font-mono text-xs font-bold text-amber-300"
						title="Timer cooldown tetap aktif di background"
					>
						<Timer class="h-3.5 w-3.5" />
						<span>{activeTimers.length} Timers Aktif</span>
					</div>
				{/if}

				<!-- Save Changes Button -->
				<button
					type="button"
					onclick={handleSave}
					disabled={!isDirty}
					class="flex items-center gap-1.5 rounded-xl px-4 py-1.5 font-mono text-xs font-bold shadow-md transition {isDirty
						? 'animate-pulse bg-indigo-600 text-white shadow-indigo-600/30 hover:bg-indigo-500'
						: 'cursor-not-allowed border border-slate-800 bg-slate-900 text-slate-500 opacity-60'}"
				>
					<Check class="h-3.5 w-3.5" />
					<span>{isDirty ? 'Simpan Perubahan' : 'Tersimpan'}</span>
				</button>
			</div>
		</div>
	</header>

	<!-- Main Settings Container -->
	<main class="mx-auto w-full max-w-5xl flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
		<!-- Success Toast -->
		{#if saveSuccessToast}
			<div
				class="animate-in fade-in slide-in-from-top-2 flex items-center justify-center space-x-2 rounded-xl border border-emerald-500/40 bg-emerald-950/80 p-3 text-center font-mono text-xs font-bold text-emerald-300 shadow-lg"
			>
				<Sparkles class="h-4 w-4" />
				<span>Pengaturan Berhasil Disimpan & Diterapkan ke Seluruh Sistem!</span>
			</div>
		{/if}

		<!-- Tabs Bar -->
		<div class="flex space-x-2 overflow-x-auto border-b border-slate-800 pb-1">
			<button
				type="button"
				onclick={() => (activeTab = 'speech')}
				class="flex items-center space-x-2 border-b-2 px-4 py-2.5 font-mono text-xs font-bold whitespace-nowrap transition {activeTab ===
				'speech'
					? 'rounded-t-lg border-indigo-500 bg-indigo-950/20 text-indigo-400'
					: 'border-transparent text-slate-400 hover:text-slate-200'}"
			>
				<Mic class="h-4 w-4" />
				<span>1. Speech Engine & Mic</span>
			</button>

			<button
				type="button"
				onclick={() => (activeTab = 'announcer')}
				class="flex items-center space-x-2 border-b-2 px-4 py-2.5 font-mono text-xs font-bold whitespace-nowrap transition {activeTab ===
				'announcer'
					? 'rounded-t-lg border-indigo-500 bg-indigo-950/20 text-indigo-400'
					: 'border-transparent text-slate-400 hover:text-slate-200'}"
			>
				<Radio class="h-4 w-4" />
				<span>2. Tactical Voice Callout</span>
			</button>

			<button
				type="button"
				onclick={() => (activeTab = 'benchmark')}
				class="flex items-center space-x-2 border-b-2 px-4 py-2.5 font-mono text-xs font-bold whitespace-nowrap transition {activeTab ===
				'benchmark'
					? 'rounded-t-lg border-indigo-500 bg-indigo-950/20 text-indigo-400'
					: 'border-transparent text-slate-400 hover:text-slate-200'}"
			>
				<Gauge class="h-4 w-4" />
				<span>3. Device Benchmark</span>
			</button>
		</div>

		<!-- Tab Content Panes -->
		{#if activeTab === 'speech'}
			<SpeechDiagnosticsTab bind:selectedEngine={draftEngine} onChange={checkDirty} />
		{:else if activeTab === 'announcer'}
			<VoiceAnnouncerTab
				bind:enabled={draftAnnouncerEnabled}
				bind:language={draftAnnouncerLang}
				bind:volume={draftAnnouncerVolume}
				bind:warnAt10Seconds={draftAnnouncer10s}
				bind:announceReady={draftAnnouncerReady}
				onChange={checkDirty}
			/>
		{:else if activeTab === 'benchmark'}
			<DeviceBenchmarkTab />
		{/if}
	</main>

	<!-- Footer -->
	<footer
		class="border-t border-slate-900 px-4 py-3 text-center font-mono text-[11px] text-slate-500"
	>
		MLBB Second Device HUD • Settings Module • Single-Page Architecture
	</footer>

	<!-- Unsaved Changes Guard Confirmation Modal -->
	<UnsavedChangesModal
		isOpen={isConfirmModalOpen}
		onCancel={handleCancelExit}
		onDiscard={handleDiscard}
		onSaveAndExit={handleSaveAndExit}
	/>
</div>
