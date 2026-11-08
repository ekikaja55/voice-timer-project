<script lang="ts">
	import { Volume2, VolumeX, Radio, Play, Check, Globe } from '@lucide/svelte';
	import { voiceAnnouncer } from '../../audio/voiceAnnouncer.svelte.js';

	let {
		enabled = $bindable(true),
		language = $bindable<'en' | 'id'>('en'),
		volume = $bindable(0.85),
		warnAt10Seconds = $bindable(true),
		announceReady = $bindable(true),
		onChange = () => {}
	}: {
		enabled: boolean;
		language: 'en' | 'id';
		volume: number;
		warnAt10Seconds: boolean;
		announceReady: boolean;
		onChange?: () => void;
	} = $props();

	function handleTestCallout(): void {
		const callout = language === 'en' ? 'Chou Flicker 10 seconds' : 'Chou Flicker sepuluh';
		voiceAnnouncer.speak(callout);
	}
</script>

<div class="space-y-6">
	<!-- 1. Master Announcer Switcher -->
	<div class="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
		<div class="flex items-center justify-between">
			<div class="flex items-center space-x-3">
				<div
					class="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400"
				>
					<Radio class="h-5 w-5" />
				</div>
				<div>
					<h3 class="text-sm font-bold text-white">Tactical Esports Voice Announcer</h3>
					<p class="font-mono text-xs text-slate-400">
						Notifikasi suara ringkas (&lt; 0.7 detik) kecepatan 1.3x saat cooldown spell musuh
						kritis
					</p>
				</div>
			</div>

			<button
				type="button"
				role="switch"
				aria-checked={enabled}
				aria-label="Toggle voice announcer master"
				onclick={() => {
					enabled = !enabled;
					onChange();
				}}
				class="relative inline-flex h-7 w-12 items-center rounded-full transition-colors {enabled
					? 'bg-emerald-500'
					: 'bg-slate-750'}"
			>
				<span
					class="inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform {enabled
						? 'translate-x-6'
						: 'translate-x-1'}"
				></span>
			</button>
		</div>
	</div>

	<!-- 2. Language Selector -->
	<div class="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
		<div class="flex items-center space-x-2">
			<Globe class="h-4 w-4 text-indigo-400" />
			<h3 class="text-sm font-bold text-white">Bahasa Callout Suara</h3>
		</div>
		<p class="font-mono text-xs text-slate-400">
			Pilih bahasa artikulasi suara panggilan taktis yang Anda inginkan
		</p>

		<div class="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
			<button
				type="button"
				onclick={() => {
					if (language !== 'en') {
						language = 'en';
						onChange();
					}
				}}
				class="flex items-center justify-between rounded-xl border p-3.5 text-left transition {language ===
				'en'
					? 'border-indigo-500 bg-indigo-950/40 text-white ring-1 ring-indigo-500/50'
					: 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'}"
			>
				<div>
					<div class="text-sm font-bold text-white">English (Default)</div>
					<div class="mt-1 font-mono text-[11px] text-slate-400">
						Callout: <code class="text-indigo-300">"[Hero] [Spell] 10 seconds"</code> &
						<code class="text-emerald-300">"ready"</code>
					</div>
					<div class="mt-1 font-mono text-[10px] text-slate-500">
						Suara native OS kualitas tinggi (David, Zira, Siri, Google US)
					</div>
				</div>
				{#if language === 'en'}
					<span
						class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-white"
					>
						<Check class="h-3 w-3 stroke-[3]" />
					</span>
				{/if}
			</button>

			<button
				type="button"
				onclick={() => {
					if (language !== 'id') {
						language = 'id';
						onChange();
					}
				}}
				class="flex items-center justify-between rounded-xl border p-3.5 text-left transition {language ===
				'id'
					? 'border-indigo-500 bg-indigo-950/40 text-white ring-1 ring-indigo-500/50'
					: 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'}"
			>
				<div>
					<div class="text-sm font-bold text-white">Bahasa Indonesia</div>
					<div class="mt-1 font-mono text-[11px] text-slate-400">
						Peringatan: <code class="text-indigo-300">"[Hero] [Spell] sepuluh"</code> &
						<code class="text-emerald-300">"ready"</code>
					</div>
					<div class="mt-1 font-mono text-[10px] text-slate-500">
						Suara native OS Indonesia (Andika, Gadis, Google ID)
					</div>
				</div>
				{#if language === 'id'}
					<span
						class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-white"
					>
						<Check class="h-3 w-3 stroke-[3]" />
					</span>
				{/if}
			</button>
		</div>
	</div>

	<!-- 3. Volume and Trigger Options -->
	<div class="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
		<h3 class="text-sm font-bold text-white">Volume & Pemicu Peringatan</h3>

		<!-- Volume Slider -->
		<div class="space-y-2 rounded-xl border border-slate-800 bg-slate-950 p-4">
			<div class="flex items-center justify-between font-mono text-xs">
				<div class="flex items-center space-x-2">
					{#if volume > 0}
						<Volume2 class="h-4 w-4 text-indigo-400" />
					{:else}
						<VolumeX class="h-4 w-4 text-slate-500" />
					{/if}
					<span class="font-semibold text-slate-300">Volume Panggilan Suara</span>
				</div>
				<span class="text-sm font-bold text-indigo-400">{Math.round(volume * 100)}%</span>
			</div>
			<input
				type="range"
				min="0"
				max="1"
				step="0.05"
				bind:value={volume}
				oninput={() => onChange()}
				class="h-2.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-indigo-500"
			/>
		</div>

		<!-- Window Checkbox Options -->
		<div class="space-y-2 rounded-xl border border-slate-800 bg-slate-950 p-4">
			<span class="font-mono text-xs font-bold tracking-wider text-slate-400 uppercase">
				Momen Peringatan Audio
			</span>

			<label
				class="border-slate-850 flex cursor-pointer items-center justify-between border-b py-2"
			>
				<div>
					<span class="text-xs font-semibold text-slate-200">
						Peringatan Jendela Gank 10 Detik
					</span>
					<p class="font-mono text-[11px] text-slate-400">
						Contoh: <code class="font-mono text-amber-400"
							>{language === 'en' ? '"Chou Flicker 10 seconds"' : '"Chou Flicker sepuluh"'}</code
						>
					</p>
				</div>
				<input
					type="checkbox"
					bind:checked={warnAt10Seconds}
					onchange={() => onChange()}
					class="h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0"
				/>
			</label>

			<label class="flex cursor-pointer items-center justify-between py-2">
				<div>
					<span class="text-xs font-semibold text-slate-200">
						Peringatan Spell Ready Kembali (0 Detik)
					</span>
					<p class="font-mono text-[11px] text-slate-400">
						Contoh: <code class="font-mono text-emerald-400">"[Hero] [Spell] ready"</code> (sinkron dengan
						earcon double-ping)
					</p>
				</div>
				<input
					type="checkbox"
					bind:checked={announceReady}
					onchange={() => onChange()}
					class="h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0"
				/>
			</label>
		</div>

		<!-- Test Button -->
		<button
			type="button"
			onclick={handleTestCallout}
			class="hover:bg-slate-750 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 font-mono text-xs font-bold text-slate-200 shadow-md transition hover:text-white active:scale-[0.99]"
		>
			<Play class="h-4 w-4 text-indigo-400" />
			<span
				>Uji Suara Callout ({language.toUpperCase()}: {language === 'en'
					? '"Chou Flicker 10 seconds"'
					: '"Chou Flicker sepuluh"'})</span
			>
		</button>
	</div>
</div>
