import { SPELL_LIST } from '../data/spells.js';
import { HERO_LIST } from '../data/heroes.js';
import type { BattleSpell, Hero } from '../types/index.js';
import type { TokenEntity } from './types.js';
import { isFuzzyMatch, levenshtein } from './levenshtein.js';

const UNDO_ALIASES = new Set(['batal', 'cancel', 'undo', 'salah', 'kebatal']);
const RESET_ALIASES = new Set(['reset', 'ulang', 'bersihkan']);
const PYT_ALIASES = new Set(['pyt', 'talent', 'emblem']);

/**
 * Searches for a matching spell from the MLBB dictionary.
 */
function findSpell(token: string): BattleSpell | undefined {
	// 1. Exact alias match
	for (const spell of SPELL_LIST) {
		if (spell.aliases.includes(token)) {
			return spell;
		}
	}

	// 2. Fuzzy match with minimum distance
	let bestSpell: BattleSpell | undefined;
	let lowestDist = Infinity;

	for (const spell of SPELL_LIST) {
		for (const alias of spell.aliases) {
			if (isFuzzyMatch(token, alias)) {
				const dist = levenshtein(token, alias);
				if (dist < lowestDist) {
					lowestDist = dist;
					bestSpell = spell;
				}
			}
		}
	}

	return bestSpell;
}

/**
 * Searches for a matching hero from the MLBB dictionary.
 */
function findHero(token: string): Hero | undefined {
	// 1. Exact alias match
	for (const hero of HERO_LIST) {
		if (hero.aliases.includes(token)) {
			return hero;
		}
	}

	// 2. Fuzzy match with minimum distance
	let bestHero: Hero | undefined;
	let lowestDist = Infinity;

	for (const hero of HERO_LIST) {
		for (const alias of hero.aliases) {
			if (isFuzzyMatch(token, alias)) {
				const dist = levenshtein(token, alias);
				if (dist < lowestDist) {
					lowestDist = dist;
					bestHero = hero;
				}
			}
		}
	}

	return bestHero;
}

/**
 * Matches a list of token strings into typed TokenEntity objects.
 */
export function matchTokens(tokens: string[]): TokenEntity[] {
	return tokens.map((token, index) => {
		// 1. Check Separator
		if (token === '__SEP__') {
			return { rawToken: token, index, type: 'SEPARATOR' };
		}

		// 2. Check Command
		if (UNDO_ALIASES.has(token)) {
			return { rawToken: token, index, type: 'COMMAND', command: 'UNDO' };
		}
		if (RESET_ALIASES.has(token)) {
			return { rawToken: token, index, type: 'COMMAND', command: 'RESET' };
		}

		// 3. Check Modifier
		if (PYT_ALIASES.has(token)) {
			return { rawToken: token, index, type: 'MODIFIER', modifier: 'PYT' };
		}

		// 4. Check Spell
		const spell = findSpell(token);
		if (spell) {
			return { rawToken: token, index, type: 'SPELL', spell };
		}

		// 5. Check Hero
		const hero = findHero(token);
		if (hero) {
			return { rawToken: token, index, type: 'HERO', hero };
		}

		// 6. Unknown
		return { rawToken: token, index, type: 'UNKNOWN' };
	});
}
