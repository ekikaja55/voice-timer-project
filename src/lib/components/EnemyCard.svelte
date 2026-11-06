<script lang="ts">
	import { Zap, X, AlertTriangle } from '@lucide/svelte';
	import type { EnemySlotState } from '../stores/matchStore.svelte.js';
	import { timerStore } from '../stores/timerStore.svelte.js';
	import { matchStore } from '../stores/matchStore.svelte.js';

	interface Props {
		slot: EnemySlotState;
	}

	let { slot }: Props = $props();

	// Find the most relevant active timer for this slot's hero
	let activeTimer = $derived(
		timerStore.timers.find(
			(t) =>
				t.heroId.toLowerCase() === slot.hero.id.toLowerCase() ||
				t.heroName.toLowerCase() === slot.hero.name.toLowerCase()
		)
	);

	let isCooldown = $derived(activeTimer && activeTimer.status !== 'READY');
	let isWarning = $derived(activeTimer && activeTimer.status === 'WARNING');
	let isReady = $derived(!activeTimer || activeTimer.status === 'READY');

	function handleCardTouch(): void {
		if (!isCooldown) {
			matchStore.triggerSlotTimer(slot.slotIndex);
		}
	}

	function handleCancelTimer(e: MouseEvent): void {
		e.stopPropagation();
		if (activeTimer) {
			timerStore.cancelTimer(activeTimer.id);
		}
	}

	function handleTogglePyt(e: MouseEvent): void {
		e.stopPropagation();
		matchStore.toggleSlotPyt(slot.slotIndex);
	}
</script>

<div
	onclick={handleCardTouch}
	onkeydown={(e) => e.key === 'Enter' && handleCardTouch()}
	role="button"
	tabindex="0"
	class="relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border p-4.5 transition-all select-none sm:p-5 {isWarning
		? 'border-amber-500/80 bg-amber-950/20'
		: isCooldown
			? 'border-rose-900/80 bg-slate-900/90'
			: 'border-slate-800 bg-slate-900/70 hover:border-slate-700'}"
>
	<!-- Lane & Modifier Header -->
	<div class="mb-3 flex items-center justify-between">
		<span
			class="rounded px-2 py-0.5 font-mono text-[10px] font-black tracking-wider uppercase {slot.lane ===
			'EXP'
				? 'border border-purple-800/60 bg-purple-950/80 text-purple-300'
				: slot.lane === 'JUNGLE'
					? 'border border-emerald-800/60 bg-emerald-950/80 text-emerald-300'
					: slot.lane === 'MID'
						? 'border border-blue-800/60 bg-blue-950/80 text-blue-300'
						: slot.lane === 'GOLD'
							? 'border border-amber-800/60 bg-amber-950/80 text-amber-300'
							: 'border border-cyan-800/60 bg-cyan-950/80 text-cyan-300'}"
		>
			{slot.lane}
		</span>

		<button
			onclick={handleTogglePyt}
			title="Toggle Talent Pull Yourself Together (-15% Cooldown)"
			class="rounded border px-2 py-0.5 font-mono text-[10px] font-bold transition {slot.hasPytEmblem
				? 'border-amber-500/60 bg-amber-500/20 text-amber-300'
				: 'border-slate-800 bg-slate-950 text-slate-500 hover:text-slate-300'}"
		>
			PYT {slot.hasPytEmblem ? '(-15%)' : 'OFF'}
		</button>
	</div>

	<!-- Hero & Spell Identification -->
	<div class="mb-3 flex items-center space-x-3">
		<!-- Hero Badge Initial -->
		<div
			class="flex h-11 w-11 items-center justify-center rounded-xl border font-mono text-sm font-black {isWarning
				? 'border-amber-500/40 bg-amber-950/50 text-amber-300'
				: isCooldown
					? 'border-rose-900/60 bg-rose-950/30 text-rose-300'
					: 'border-slate-800 bg-slate-950 text-slate-300'}"
		>
			{slot.hero.name.substring(0, 2).toUpperCase()}
		</div>

		<div class="min-w-0 flex-1">
			<h3 class="truncate text-base font-black text-white">
				{slot.hero.name}
			</h3>
			<p class="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-slate-400">
				<span class="h-1.5 w-1.5 rounded-full {isReady ? 'bg-emerald-400' : 'bg-rose-400'}"></span>
				<span class="text-slate-300">{slot.spell.name}</span>
				<span class="font-mono text-[10px] text-slate-500">
					({slot.hasPytEmblem ? Math.round(slot.spell.cooldown * 0.85) : slot.spell.cooldown}s)
				</span>
			</p>
		</div>
	</div>

	<!-- Giant Glanceable Center Countdown / Ready Status -->
	<div class="my-auto py-3 text-center">
		{#if activeTimer && activeTimer.remainingSeconds > 0}
			<div class="space-y-1">
				<span
					class="block font-mono text-5xl font-black tracking-tighter tabular-nums sm:text-6xl {isWarning
						? 'text-amber-300'
						: 'text-rose-400'}"
				>
					{activeTimer.remainingSeconds}s
				</span>
				<span
					class="inline-flex items-center rounded px-2 py-0.5 font-mono text-[10px] font-bold tracking-widest uppercase {isWarning
						? 'bg-amber-500/20 text-amber-300'
						: 'bg-rose-500/10 text-rose-400'}"
				>
					{#if isWarning}
						<AlertTriangle class="mr-1 h-3 w-3" />
						<span>GANK WINDOW</span>
					{:else}
						<span>COOLDOWN AKTIF</span>
					{/if}
				</span>
			</div>
		{:else}
			<div class="py-2">
				<span
					class="block font-mono text-4xl font-black tracking-tight text-emerald-400 sm:text-5xl"
				>
					READY
				</span>
				<span class="mt-1 block font-mono text-[11px] text-slate-500">
					1-Tap Sentuh untuk Catat
				</span>
			</div>
		{/if}
	</div>

	<!-- Footer Action Bar -->
	<div class="mt-3 border-t border-slate-800/80 pt-3">
		{#if activeTimer && activeTimer.remainingSeconds > 0}
			<div class="flex items-center justify-between gap-2">
				<div class="h-2 w-full overflow-hidden rounded-full bg-slate-950">
					<div
						class="h-full transition-all duration-300 {isWarning ? 'bg-amber-400' : 'bg-rose-500'}"
						style="width: {(activeTimer.remainingSeconds / activeTimer.totalDuration) * 100}%"
					></div>
				</div>
				<button
					onclick={handleCancelTimer}
					class="flex items-center rounded border border-rose-900/60 bg-rose-950/60 px-2 py-0.5 font-mono text-[11px] font-bold text-rose-400 transition hover:bg-rose-900/40 hover:text-rose-200"
				>
					<X class="mr-1 h-3 w-3" />
					<span>Batal</span>
				</button>
			</div>
		{:else}
			<button
				onclick={handleCardTouch}
				class="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950 py-2 font-mono text-xs font-bold text-slate-300 transition hover:border-emerald-500/50 hover:bg-emerald-950/20 hover:text-emerald-300"
			>
				<Zap class="h-3.5 w-3.5 text-emerald-400" />
				<span>Catat Cooldown</span>
			</button>
		{/if}
	</div>
</div>
