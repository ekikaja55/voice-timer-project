import type { BattleSpell, Hero, ParsedPair } from '../types/index.js';

export type TokenType = 'HERO' | 'SPELL' | 'MODIFIER' | 'COMMAND' | 'SEPARATOR' | 'UNKNOWN';

export interface TokenEntity {
	rawToken: string;
	index: number;
	type: TokenType;
	hero?: Hero;
	spell?: BattleSpell;
	modifier?: 'PYT';
	command?: 'UNDO' | 'RESET';
}

export interface ParseResult {
	pairs: ParsedPair[];
	isUndo: boolean;
	isReset: boolean;
	unmatchedSpells: BattleSpell[];
	rawTranscript: string;
	cleanedTokens: string[];
}
