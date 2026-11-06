<script lang="ts">
	import { Settings, X } from '@lucide/svelte';
	import { matchStore } from '../stores/matchStore.svelte.js';
	import { HERO_LIST } from '../data/heroes.js';
	import { SPELL_LIST, BATTLE_SPELLS } from '../data/spells.js';

	// Sort heroes alphabetically for dropdown
	const sortedHeroes = [...HERO_LIST].sort((a, b) => a.name.localeCompare(b.name));

	function handleHeroChange(slotIndex: number, heroId: string): void {
		const found = HERO_LIST.find((h) => h.id === heroId);
		if (found) {
			matchStore.updateSlot(slotIndex, { hero: found });
		}
	}

	function handleSpellChange(slotIndex: number, spellId: string): void {
		const spell = BATTLE_SPELLS[spellId as keyof typeof BATTLE_SPELLS];
		if (spell) {
			matchStore.updateSlot(slotIndex, { spell });
		}
	}
</script>

{#if matchStore.isSetupModalOpen}
	<!-- Modal Backdrop -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm"
	>
		<div
			class="animate-in fade-in zoom-in-95 w-full max-w-2xl space-y-6 rounded-2xl border border-slate-700/80 bg-slate-900 p-6 text-slate-100 shadow-2xl duration-200"
		>
			<!-- Header -->
			<div class="flex items-center justify-between border-b border-slate-800 pb-4">
				<div class="flex items-center space-x-2.5">
					<Settings class="h-5 w-5 text-indigo-400" />
					<div>
						<h2 class="text-lg font-black text-white sm:text-xl">Setup Tim Musuh (Enemy Lineup)</h2>
						<p class="mt-0.5 text-xs text-slate-400">
							Pilih 5 hero musuh dan battle spell bawaan sebelum pertandingan dimulai.
						</p>
					</div>
				</div>
				<button
					onclick={() => matchStore.setModalOpen(false)}
					class="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-400 transition hover:bg-slate-700 hover:text-white"
					title="Close"
				>
					<X class="h-4 w-4" />
				</button>
			</div>

			<!-- 5 Lanes Setup List -->
			<div class="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
				{#each matchStore.slots as slot (slot.slotIndex)}
					<div
						class="flex flex-col justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 sm:flex-row sm:items-center"
					>
						<!-- Lane Label -->
						<div class="flex min-w-[90px] items-center space-x-2.5">
							<span
								class="rounded px-2 py-0.5 font-mono text-[10px] font-black tracking-wider uppercase {slot.lane ===
								'EXP'
									? 'border border-purple-800 bg-purple-950 text-purple-300'
									: slot.lane === 'JUNGLE'
										? 'border border-emerald-800 bg-emerald-950 text-emerald-300'
										: slot.lane === 'MID'
											? 'border border-blue-800 bg-blue-950 text-blue-300'
											: slot.lane === 'GOLD'
												? 'border border-amber-800 bg-amber-950 text-amber-300'
												: 'border border-cyan-800 bg-cyan-950 text-cyan-300'}"
							>
								{slot.lane}
							</span>
						</div>

						<!-- Hero Dropdown -->
						<div class="min-w-[150px] flex-1">
							<label
								for="hero-select-{slot.slotIndex}"
								class="mb-1 block font-mono text-[10px] text-slate-400">Hero:</label
							>
							<select
								id="hero-select-{slot.slotIndex}"
								value={slot.hero.id}
								onchange={(e) => handleHeroChange(slot.slotIndex, e.currentTarget.value)}
								class="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white focus:border-indigo-500 focus:outline-none"
							>
								{#each sortedHeroes as h (h.id)}
									<option value={h.id}>{h.name} ({h.role})</option>
								{/each}
							</select>
						</div>

						<!-- Spell Dropdown -->
						<div class="min-w-[140px] flex-1">
							<label
								for="spell-select-{slot.slotIndex}"
								class="mb-1 block font-mono text-[10px] text-slate-400">Battle Spell:</label
							>
							<select
								id="spell-select-{slot.slotIndex}"
								value={slot.spell.id}
								onchange={(e) => handleSpellChange(slot.slotIndex, e.currentTarget.value)}
								class="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white focus:border-indigo-500 focus:outline-none"
							>
								{#each SPELL_LIST as sp (sp.id)}
									<option value={sp.id}>{sp.name} ({sp.cooldown}s)</option>
								{/each}
							</select>
						</div>

						<!-- PYT Toggle Checkbox -->
						<div class="flex min-w-[80px] items-center justify-center pt-1 sm:flex-col">
							<span class="mb-1 font-mono text-[10px] text-slate-400">PYT (-15%):</span>
							<button
								onclick={() => matchStore.toggleSlotPyt(slot.slotIndex)}
								class="rounded border px-2.5 py-1 font-mono text-xs font-bold transition {slot.hasPytEmblem
									? 'border-amber-500/50 bg-amber-500/20 text-amber-300'
									: 'border-slate-700 bg-slate-800 text-slate-500'}"
							>
								{slot.hasPytEmblem ? 'ON' : 'OFF'}
							</button>
						</div>
					</div>
				{/each}
			</div>

			<!-- Footer Buttons -->
			<div class="flex items-center justify-between border-t border-slate-800 pt-4">
				<button
					onclick={() => matchStore.resetToDefaults()}
					class="font-mono text-xs text-slate-400 underline hover:text-slate-200"
				>
					Reset Default S35
				</button>

				<button
					onclick={() => matchStore.setModalOpen(false)}
					class="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-500"
				>
					Simpan & Tutup
				</button>
			</div>
		</div>
	</div>
{/if}
