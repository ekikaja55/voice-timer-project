import type { ParsedPair } from '../types/index.js';
import type { TokenEntity } from './types.js';

interface InternalPair {
	heroName: string;
	heroId?: string;
	spell: TokenEntity;
	heroToken?: TokenEntity;
	hasPyt: boolean;
	rawTokens: string[];
}

/**
 * Checks if a modifier token is scoped to a given spell or hero token.
 * A modifier is considered scoped if its index is within a distance of <= 2 tokens.
 */
function isModifierScoped(
	modifierTokens: TokenEntity[],
	targetSpell: TokenEntity,
	targetHero?: TokenEntity
): boolean {
	for (const mod of modifierTokens) {
		const distToSpell = Math.abs(mod.index - targetSpell.index);
		if (distToSpell <= 2) return true;

		if (targetHero) {
			const distToHero = Math.abs(mod.index - targetHero.index);
			if (distToHero <= 2) return true;
		}
	}
	return false;
}

/**
 * Chunks a single clause of tokens into structured ParsedPair instances.
 */
function processClause(clauseTokens: TokenEntity[]): ParsedPair[] {
	const heroes = clauseTokens.filter((t) => t.type === 'HERO');
	const spells = clauseTokens.filter((t) => t.type === 'SPELL');
	const modifiers = clauseTokens.filter((t) => t.type === 'MODIFIER');

	const pairs: InternalPair[] = [];
	const usedHeroIndices = new Set<number>();
	const usedSpellIndices = new Set<number>();

	// --- PATTERN 1: PARALLEL LIST DETECTOR ---
	// Example: [Hero 1, Hero 2] [Spell 1, Spell 2] ("chou hanabi fliker aegis")
	const isParallelHeroesThenSpells =
		heroes.length >= 2 && spells.length >= 2 && heroes[heroes.length - 1].index < spells[0].index;

	// Example: [Spell 1, Spell 2] [Hero 1, Hero 2] ("fliker aegis chou hanabi")
	const isParallelSpellsThenHeroes =
		heroes.length >= 2 && spells.length >= 2 && spells[spells.length - 1].index < heroes[0].index;

	if (isParallelHeroesThenSpells || isParallelSpellsThenHeroes) {
		const matchCount = Math.min(heroes.length, spells.length);
		for (let i = 0; i < matchCount; i++) {
			const h = heroes[i];
			const s = spells[i];
			usedHeroIndices.add(h.index);
			usedSpellIndices.add(s.index);

			const hasPyt = isModifierScoped(modifiers, s, h);
			pairs.push({
				heroName: h.hero!.name,
				heroId: h.hero!.id,
				spell: s,
				heroToken: h,
				hasPyt,
				rawTokens: [h.rawToken, s.rawToken]
			});
		}
	} else {
		// --- PATTERN 2: PROXIMITY INTERLEAVED / INVERTED INTERLEAVED ---
		// Example: "chou fliker", "fliker chou", "chou fliker hanabi aegis"
		for (const spellToken of spells) {
			if (usedSpellIndices.has(spellToken.index)) continue;

			let closestHero: TokenEntity | null = null;
			let minDistance = Infinity;

			for (const heroToken of heroes) {
				if (usedHeroIndices.has(heroToken.index)) continue;

				const dist = Math.abs(spellToken.index - heroToken.index);
				if (dist < minDistance && dist <= 3) {
					minDistance = dist;
					closestHero = heroToken;
				}
			}

			if (closestHero) {
				usedHeroIndices.add(closestHero.index);
				usedSpellIndices.add(spellToken.index);

				const hasPyt = isModifierScoped(modifiers, spellToken, closestHero);
				pairs.push({
					heroName: closestHero.hero!.name,
					heroId: closestHero.hero!.id,
					spell: spellToken,
					heroToken: closestHero,
					hasPyt,
					rawTokens: [closestHero.rawToken, spellToken.rawToken]
				});
			}
		}
	}

	// --- PATTERN 3: UNMATCHED STANDALONE SPELLS ---
	// If a player shouts just a spell (e.g. "purify!" or "fliker!")
	for (const spellToken of spells) {
		if (!usedSpellIndices.has(spellToken.index)) {
			usedSpellIndices.add(spellToken.index);
			const hasPyt = isModifierScoped(modifiers, spellToken);
			pairs.push({
				heroName: 'Musuh',
				spell: spellToken,
				hasPyt,
				rawTokens: [spellToken.rawToken]
			});
		}
	}

	return pairs.map((p) => ({
		heroName: p.heroName,
		heroId: p.heroId,
		spell: p.spell.spell!,
		hasPyt: p.hasPyt,
		rawTokens: p.rawTokens
	}));
}

/**
 * Splits token stream into clauses by SEPARATOR tokens and processes each clause.
 */
export function chunkClauses(tokens: TokenEntity[]): ParsedPair[] {
	if (tokens.length === 0) return [];

	const clauses: TokenEntity[][] = [];
	let currentClause: TokenEntity[] = [];

	for (const token of tokens) {
		if (token.type === 'SEPARATOR') {
			if (currentClause.length > 0) {
				clauses.push(currentClause);
				currentClause = [];
			}
		} else {
			currentClause.push(token);
		}
	}

	if (currentClause.length > 0) {
		clauses.push(currentClause);
	}

	const allPairs: ParsedPair[] = [];
	for (const clause of clauses) {
		const clausePairs = processClause(clause);
		allPairs.push(...clausePairs);
	}

	return allPairs;
}
