const STOPWORDS = new Set([
	'eh',
	'ya',
	'udah',
	'tadi',
	'si',
	'lah',
	'dapet',
	'dong',
	'nih',
	'tuh',
	'keknya',
	'kayaknya',
	'itu',
	'ini',
	'musuh',
	'lawan',
	'hero',
	'spell',
	'woi',
	'game',
	'mati',
	'kena'
]);

const SEPARATOR_WORDS = new Set(['terus', 'lalu', 'dan', 'sama', 'kemudian', 'abis', 'setelah']);

const MULTI_WORD_REPLACEMENTS: [RegExp, string][] = [
	[/\bpe\s+ye\s+te\b/gi, 'pyt'],
	[/\bpull\s+yourself\s+together\b/gi, 'pyt'],
	[/\bpull\s+yourself\b/gi, 'pyt'],
	[/\byu\s+zhong\b/gi, 'yu-zhong'],
	[/\bpopol\s+(and\s+)?kupa\b/gi, 'popol'],
	[/\bwan\s+wan\b/gi, 'wanwan'],
	[/\bdarah\s+putih\b/gi, 'tameng'],
	[/\battack\s+speed\b/gi, 'aspd']
];

/**
 * Normalizes and tokenizes raw speech transcript into a cleaned array of word tokens.
 */
export function tokenizeTranscript(rawText: string): string[] {
	if (!rawText || !rawText.trim()) {
		return [];
	}

	let text = rawText.toLowerCase();

	// 1. Multi-word replacements
	for (const [pattern, replacement] of MULTI_WORD_REPLACEMENTS) {
		text = text.replace(pattern, replacement);
	}

	// 2. Remove special characters except hyphens and spaces
	text = text.replace(/[^\w\s-]/g, ' ');

	// 3. Split by whitespace
	const rawWords = text.split(/\s+/).filter((w) => w.length > 0);

	// 4. Filter stopwords, but keep separators marked with a delimiter
	const cleanedTokens: string[] = [];
	for (const word of rawWords) {
		if (SEPARATOR_WORDS.has(word)) {
			cleanedTokens.push('__SEP__');
		} else if (!STOPWORDS.has(word)) {
			cleanedTokens.push(word);
		}
	}

	return cleanedTokens;
}
