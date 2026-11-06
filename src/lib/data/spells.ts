import type { BattleSpell, BattleSpellId } from '../types/index.js';

export const BATTLE_SPELLS: Record<BattleSpellId, BattleSpell> = {
	flicker: {
		id: 'flicker',
		name: 'Flicker',
		cooldown: 120,
		category: 'mobility',
		aliases: [
			'flicker',
			'fliker',
			'flik',
			'pliker',
			'pleker',
			'vlicker',
			'stiker',
			'flipper',
			'flek',
			'blik'
		],
		description: 'Teleport a short distance in a specified direction.'
	},
	purify: {
		id: 'purify',
		name: 'Purify',
		cooldown: 90,
		category: 'defense',
		aliases: ['purify', 'puri', 'pyuri', 'pure', 'pyurify', 'bebas', 'antistun'],
		description: 'Immediately removes all negative effects and grants CC immunity.'
	},
	vengeance: {
		id: 'vengeance',
		name: 'Vengeance',
		cooldown: 75,
		category: 'defense',
		aliases: ['vengeance', 'vengence', 'pengen', 'pengan', 'vengens', 'pantul', 'duri', 'bengens'],
		description: 'Reduces damage taken and reflects magic damage back to the attacker.'
	},
	retribution: {
		id: 'retribution',
		name: 'Retribution',
		cooldown: 35,
		category: 'jungle',
		aliases: ['retribution', 'retri', 'retribusi', 'sawi', 'jungler', 'jungle', 'redtri'],
		description: 'Deals true damage to nearby creeps or minions.'
	},
	sprint: {
		id: 'sprint',
		name: 'Sprint',
		cooldown: 75,
		category: 'mobility',
		aliases: ['sprint', 'suprint', 'lari', 'ngebut', 'seprint', 'gas'],
		description: 'Gains 50% extra movement speed and slow immunity.'
	},
	aegis: {
		id: 'aegis',
		name: 'Aegis',
		cooldown: 90,
		category: 'defense',
		aliases: ['aegis', 'egis', 'shield', 'darah putih', 'tameng', 'agis', 'ijis'],
		description: 'Immediately gains a shield absorbing damage.'
	},
	petrify: {
		id: 'petrify',
		name: 'Petrify',
		cooldown: 90,
		category: 'utility',
		aliases: ['petrify', 'petri', 'batu', 'petripai', 'prik'],
		description: 'Petrifies surrounding enemy targets, causing stone CC.'
	},
	flameshot: {
		id: 'flameshot',
		name: 'Flameshot',
		cooldown: 50,
		category: 'offense',
		aliases: ['flameshot', 'plemshot', 'plem', 'api', 'tembak', 'flemsot', 'dor'],
		description: 'Fires a shot of flaming magic in a targeted direction.'
	},
	revitalize: {
		id: 'revitalize',
		name: 'Revitalize',
		cooldown: 100,
		category: 'defense',
		aliases: ['revitalize', 'revital', 'heal', 'regen', 'lingkaran', 'darah'],
		description: 'Summons a Healing Spring that restores HP for nearby allies.'
	},
	inspire: {
		id: 'inspire',
		name: 'Inspire',
		cooldown: 60,
		category: 'offense',
		aliases: ['inspire', 'inspir', 'cepet', 'aspd', 'infeir', 'attack speed'],
		description: 'Greatly increases attack speed and basic attack penetration.'
	},
	execute: {
		id: 'execute',
		name: 'Execute',
		cooldown: 90,
		category: 'offense',
		aliases: ['execute', 'ekse', 'eksekusi', 'ekseku'],
		description: 'Deals true damage to a designated enemy hero based on lost HP.'
	},
	arrival: {
		id: 'arrival',
		name: 'Arrival',
		cooldown: 75,
		category: 'mobility',
		aliases: ['arrival', 'aripal', 'teleport', 'tele', 'tp'],
		description: 'Teleports to an allied minion or turret.'
	}
};

export const SPELL_LIST: BattleSpell[] = Object.values(BATTLE_SPELLS);
