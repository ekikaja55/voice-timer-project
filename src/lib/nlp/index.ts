import { tokenizeTranscript } from './tokenizer';
import { matchTokens } from './matcher';
import { chunkClauses } from './clauseChunker';
import type { ParseResult } from './types';

export * from './types';
export * from './tokenizer';
export * from './matcher';
export * from './clauseChunker';
export * from './levenshtein';

/**
 * Main NLP Entry Point:
 * Parses a raw voice transcript into structured command events and entity pairs.
 */
export function parseVoiceTranscript(rawTranscript: string): ParseResult {
	const cleanedTokens = tokenizeTranscript(rawTranscript);
	const taggedTokens = matchTokens(cleanedTokens);

	// 1. Check for immediate command intents (Undo / Reset)
	const undoToken = taggedTokens.find((t) => t.type === 'COMMAND' && t.command === 'UNDO');
	const resetToken = taggedTokens.find((t) => t.type === 'COMMAND' && t.command === 'RESET');

	if (undoToken) {
		return {
			pairs: [],
			isUndo: true,
			isReset: false,
			unmatchedSpells: [],
			rawTranscript,
			cleanedTokens
		};
	}

	if (resetToken) {
		return {
			pairs: [],
			isUndo: false,
			isReset: true,
			unmatchedSpells: [],
			rawTranscript,
			cleanedTokens
		};
	}

	// 2. Extract pairs using Clause Chunker & Syntax Recognition
	const pairs = chunkClauses(taggedTokens);

	return {
		pairs,
		isUndo: false,
		isReset: false,
		unmatchedSpells: [],
		rawTranscript,
		cleanedTokens
	};
}
