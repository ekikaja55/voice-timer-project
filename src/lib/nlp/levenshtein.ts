/**
 * Calculates the Levenshtein distance between two strings.
 */
export function levenshtein(a: string, b: string): number {
	if (a === b) return 0;
	if (a.length === 0) return b.length;
	if (b.length === 0) return a.length;

	const matrix: number[][] = [];

	for (let i = 0; i <= b.length; i++) {
		matrix[i] = [i];
	}

	for (let j = 0; j <= a.length; j++) {
		matrix[0][j] = j;
	}

	for (let i = 1; i <= b.length; i++) {
		for (let j = 1; j <= a.length; j++) {
			if (b.charAt(i - 1) === a.charAt(j - 1)) {
				matrix[i][j] = matrix[i - 1][j - 1];
			} else {
				matrix[i][j] = Math.min(
					matrix[i - 1][j - 1] + 1, // substitution
					matrix[i][j - 1] + 1, // insertion
					matrix[i - 1][j] + 1 // deletion
				);
			}
		}
	}

	return matrix[b.length][a.length];
}

/**
 * Returns true if candidate matches target within acceptable typo tolerance:
 * - Length <= 3: exact match only (0 distance)
 * - Length 4-6: max distance 1
 * - Length > 6: max distance 2
 */
export function isFuzzyMatch(candidate: string, target: string): boolean {
	if (candidate === target) return true;

	const minLen = Math.min(candidate.length, target.length);
	if (minLen <= 3) {
		return false; // Very short words like "co", "gs", "cu" must be exact
	}

	const maxAllowedDistance = minLen <= 6 ? 1 : 2;
	const distance = levenshtein(candidate, target);

	return distance <= maxAllowedDistance;
}
