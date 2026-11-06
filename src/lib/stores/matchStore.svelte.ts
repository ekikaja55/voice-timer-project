import { HERO_MAP } from '../data/heroes.js';
import { BATTLE_SPELLS } from '../data/spells.js';
import type { Hero, BattleSpell, MatchEnemySlot } from '../types/index.js';
import { timerStore } from './timerStore.svelte.js';

export type LaneRole = 'EXP' | 'JUNGLE' | 'MID' | 'GOLD' | 'ROAM';

export interface EnemySlotState extends MatchEnemySlot {
	lane: LaneRole;
}

const DEFAULT_SLOTS: EnemySlotState[] = [
	{
		slotIndex: 0,
		lane: 'EXP',
		hero: HERO_MAP.get('chou')!,
		spell: BATTLE_SPELLS.flicker,
		hasPytEmblem: false
	},
	{
		slotIndex: 1,
		lane: 'JUNGLE',
		hero: HERO_MAP.get('ling')!,
		spell: BATTLE_SPELLS.retribution,
		hasPytEmblem: false
	},
	{
		slotIndex: 2,
		lane: 'MID',
		hero: HERO_MAP.get('zhuxin')!,
		spell: BATTLE_SPELLS.flicker,
		hasPytEmblem: false
	},
	{
		slotIndex: 3,
		lane: 'GOLD',
		hero: HERO_MAP.get('hanabi')!,
		spell: BATTLE_SPELLS.aegis,
		hasPytEmblem: false
	},
	{
		slotIndex: 4,
		lane: 'ROAM',
		hero: HERO_MAP.get('tigreal')!,
		spell: BATTLE_SPELLS.flicker,
		hasPytEmblem: true // Roamer often runs PYT talent
	}
];

class MatchStore {
	slots = $state<EnemySlotState[]>(DEFAULT_SLOTS);
	isSetupModalOpen = $state<boolean>(false);

	/**
	 * Updates an individual slot configuration.
	 */
	updateSlot(
		slotIndex: number,
		updates: {
			hero?: Hero;
			spell?: BattleSpell;
			hasPytEmblem?: boolean;
		}
	): void {
		this.slots = this.slots.map((s) => {
			if (s.slotIndex === slotIndex) {
				const hero = updates.hero || s.hero;
				// If hero changed and no spell was explicitly passed, use hero default
				const spell = updates.spell || (updates.hero ? BATTLE_SPELLS[hero.defaultSpell] : s.spell);
				const hasPytEmblem =
					updates.hasPytEmblem !== undefined ? updates.hasPytEmblem : s.hasPytEmblem;
				return {
					...s,
					hero,
					spell,
					hasPytEmblem
				};
			}
			return s;
		});
	}

	/**
	 * Toggles the PYT Emblem modifier for a given slot.
	 */
	toggleSlotPyt(slotIndex: number): void {
		this.slots = this.slots.map((s) => {
			if (s.slotIndex === slotIndex) {
				return { ...s, hasPytEmblem: !s.hasPytEmblem };
			}
			return s;
		});
	}

	/**
	 * Quick One-Touch Trigger: Starts the timer for the given slot immediately without voice.
	 */
	triggerSlotTimer(slotIndex: number): void {
		const slot = this.slots.find((s) => s.slotIndex === slotIndex);
		if (!slot) return;

		timerStore.startTimer(slot.hero.name, slot.spell, slot.hasPytEmblem, slot.hero.id);
	}

	/**
	 * Resets match slots to default tournament lineup.
	 */
	resetToDefaults(): void {
		this.slots = DEFAULT_SLOTS;
	}

	/**
	 * Toggles Match Setup Modal visibility.
	 */
	setModalOpen(open: boolean): void {
		this.isSetupModalOpen = open;
	}
}

export const matchStore = new MatchStore();
