import { describe, it, expect } from 'vitest';
import { parseVoiceTranscript } from '../nlp/index.js';

describe('MLBB Multi-Entity Burst NLP Engine', () => {
	it('should parse standard interleaved phrase: [Hero][Spell]', () => {
		const result = parseVoiceTranscript('chou fliker');
		expect(result.pairs).toHaveLength(1);
		expect(result.pairs[0].heroName).toBe('Chou');
		expect(result.pairs[0].spell.name).toBe('Flicker');
		expect(result.pairs[0].hasPyt).toBe(false);
	});

	it('should parse inverted interleaved phrase: [Spell][Hero]', () => {
		const result = parseVoiceTranscript('fliker chou');
		expect(result.pairs).toHaveLength(1);
		expect(result.pairs[0].heroName).toBe('Chou');
		expect(result.pairs[0].spell.name).toBe('Flicker');
		expect(result.pairs[0].hasPyt).toBe(false);
	});

	it('should parse continuous burst speech with multiple pairs', () => {
		const result = parseVoiceTranscript('chou fliker hanabi aegis');
		expect(result.pairs).toHaveLength(2);

		expect(result.pairs[0].heroName).toBe('Chou');
		expect(result.pairs[0].spell.name).toBe('Flicker');

		expect(result.pairs[1].heroName).toBe('Hanabi');
		expect(result.pairs[1].spell.name).toBe('Aegis');
	});

	it('should enforce SCOPED MODIFIER: only bind PYT to the local clause / entity, never leak globally', () => {
		const result = parseVoiceTranscript('chou fliker hanabi aegis natan purify pyt');
		expect(result.pairs).toHaveLength(3);

		// Chou Flicker must NOT have PYT
		expect(result.pairs[0].heroName).toBe('Chou');
		expect(result.pairs[0].spell.name).toBe('Flicker');
		expect(result.pairs[0].hasPyt).toBe(false);

		// Hanabi Aegis must NOT have PYT
		expect(result.pairs[1].heroName).toBe('Hanabi');
		expect(result.pairs[1].spell.name).toBe('Aegis');
		expect(result.pairs[1].hasPyt).toBe(false);

		// Only Natan Purify gets PYT
		expect(result.pairs[2].heroName).toBe('Natan');
		expect(result.pairs[2].spell.name).toBe('Purify');
		expect(result.pairs[2].hasPyt).toBe(true);
	});

	it('should handle parallel phrasing: [Hero 1, Hero 2] [Spell 1, Spell 2]', () => {
		const result = parseVoiceTranscript('chou hanabi fliker aegis');
		expect(result.pairs).toHaveLength(2);

		expect(result.pairs[0].heroName).toBe('Chou');
		expect(result.pairs[0].spell.name).toBe('Flicker');

		expect(result.pairs[1].heroName).toBe('Hanabi');
		expect(result.pairs[1].spell.name).toBe('Aegis');
	});

	it('should handle Indonesian slang and typo variations', () => {
		// "co pliker" -> Chou Flicker
		const r1 = parseVoiceTranscript('co pliker');
		expect(r1.pairs).toHaveLength(1);
		expect(r1.pairs[0].heroName).toBe('Chou');
		expect(r1.pairs[0].spell.name).toBe('Flicker');

		// "hanap egis" -> Hanabi Aegis
		const r2 = parseVoiceTranscript('hanap egis');
		expect(r2.pairs).toHaveLength(1);
		expect(r2.pairs[0].heroName).toBe('Hanabi');
		expect(r2.pairs[0].spell.name).toBe('Aegis');

		// "jusin flik" -> Zhuxin Flicker
		const r3 = parseVoiceTranscript('jusin flik');
		expect(r3.pairs).toHaveLength(1);
		expect(r3.pairs[0].heroName).toBe('Zhuxin');
		expect(r3.pairs[0].spell.name).toBe('Flicker');

		// "ling sawi" -> Ling Retribution
		const r4 = parseVoiceTranscript('ling sawi');
		expect(r4.pairs).toHaveLength(1);
		expect(r4.pairs[0].heroName).toBe('Ling');
		expect(r4.pairs[0].spell.name).toBe('Retribution');

		// "tigrel batu" -> Tigreal Petrify
		const r5 = parseVoiceTranscript('tigrel batu');
		expect(r5.pairs).toHaveLength(1);
		expect(r5.pairs[0].heroName).toBe('Tigreal');
		expect(r5.pairs[0].spell.name).toBe('Petrify');
	});

	it('should sanitize Indonesian filler words and stopwords', () => {
		const result = parseVoiceTranscript('eh tadi si chou fliker ya terus hanabi aegis dong');
		expect(result.pairs).toHaveLength(2);
		expect(result.pairs[0].heroName).toBe('Chou');
		expect(result.pairs[0].spell.name).toBe('Flicker');
		expect(result.pairs[1].heroName).toBe('Hanabi');
		expect(result.pairs[1].spell.name).toBe('Aegis');
	});

	it('should handle multi-word phonetic expressions like "pe ye te" and "yu zhong"', () => {
		const r1 = parseVoiceTranscript('natan purify pe ye te');
		expect(r1.pairs).toHaveLength(1);
		expect(r1.pairs[0].heroName).toBe('Natan');
		expect(r1.pairs[0].spell.name).toBe('Purify');
		expect(r1.pairs[0].hasPyt).toBe(true);

		const r2 = parseVoiceTranscript('yu zhong petrify');
		expect(r2.pairs).toHaveLength(1);
		expect(r2.pairs[0].heroName).toBe('Yu Zhong');
		expect(r2.pairs[0].spell.name).toBe('Petrify');
	});

	it('should detect Instant Undo commands', () => {
		const r1 = parseVoiceTranscript('batal');
		expect(r1.isUndo).toBe(true);
		expect(r1.pairs).toHaveLength(0);

		const r2 = parseVoiceTranscript('eh salah cancel');
		expect(r2.isUndo).toBe(true);
		expect(r2.pairs).toHaveLength(0);
	});

	it('should support standalone unmatched spells defaulting to "Musuh"', () => {
		const result = parseVoiceTranscript('purify');
		expect(result.pairs).toHaveLength(1);
		expect(result.pairs[0].heroName).toBe('Musuh');
		expect(result.pairs[0].spell.name).toBe('Purify');
	});
});
