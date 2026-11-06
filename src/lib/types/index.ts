export type BattleSpellId =
	| 'flicker'
	| 'purify'
	| 'vengeance'
	| 'retribution'
	| 'sprint'
	| 'aegis'
	| 'petrify'
	| 'flameshot'
	| 'revitalize'
	| 'inspire'
	| 'execute'
	| 'arrival';

export type SpellCategory = 'mobility' | 'defense' | 'jungle' | 'utility' | 'offense';

export interface BattleSpell {
	id: BattleSpellId;
	name: string;
	cooldown: number; // Base cooldown in seconds
	aliases: string[];
	category: SpellCategory;
	description?: string;
}

export type HeroRole = 'tank' | 'fighter' | 'assassin' | 'mage' | 'marksman' | 'support';

export interface Hero {
	id: string;
	name: string;
	role: HeroRole;
	aliases: string[];
	defaultSpell: BattleSpellId;
}

export type TimerStatus = 'COOLDOWN' | 'WARNING' | 'READY' | 'IDLE';

export interface TimerInstance {
	id: string;
	heroId: string;
	heroName: string;
	spellId: BattleSpellId;
	spellName: string;
	totalDuration: number;
	remainingSeconds: number;
	hasPyt: boolean;
	startedAt: number;
	status: TimerStatus;
}

export interface ParsedPair {
	heroName: string;
	heroId?: string;
	spell: BattleSpell;
	hasPyt: boolean;
	rawTokens: string[];
}

export interface MatchEnemySlot {
	slotIndex: number;
	hero: Hero;
	spell: BattleSpell;
	hasPytEmblem: boolean;
	activeTimer?: TimerInstance;
}
