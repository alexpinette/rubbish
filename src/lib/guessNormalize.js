/**
 * Normalize a player's guess for display/readability without changing meaning.
 * Intended to reduce tells like missing capitalization/terminal punctuation.
 *
 * Rules:
 * - whitespace cleanup (trim + collapse)
 * - normalize repeated punctuation (!!! -> !, ??? -> ?, .... -> …)
 * - sentence casing (capitalize first letter)
 * - ensure terminal punctuation (., !, ?, …) before trailing quotes/parens
 *
 * @param {string} input
 * @param {number} [maxLen]
 * @returns {string}
 */
export function normalizeGuess(input, maxLen = Infinity) {
	let s = String(input ?? '');

	// Normalize whitespace
	s = s.replace(/\s+/g, ' ').trim();
	if (!s) return '';

	// Remove spaces before punctuation
	s = s.replace(/\s+([,.;:!?])/g, '$1');

	// Normalize ellipses and repeated punctuation
	s = s.replace(/\.{3,}/g, '…');
	s = s.replace(/!{2,}/g, '!');
	s = s.replace(/\?{2,}/g, '?');
	// Reduce long mixed runs like "?!?!" to 2 chars max
	s = s.replace(/([!?]){3,}/g, (m) => (m.includes('?') && m.includes('!') ? '?!' : m[0]));

	// Sentence casing: uppercase first alphabetical char (after common leading punctuation)
	s = s.replace(/^([“"'\(\[\{]*\s*)([a-z])/, (_, lead, ch) => `${lead}${ch.toUpperCase()}`);

	// Ensure terminal punctuation (before trailing quotes/parens)
	const trailingMatch = s.match(/([”"'\)\]\}]+)$/);
	const trailing = trailingMatch ? trailingMatch[1] : '';
	let core = trailing ? s.slice(0, -trailing.length) : s;

	if (core && !/[.!?…]$/.test(core)) {
		// If it ends with a weak terminator, replace with period.
		if (/[,:;]$/.test(core)) core = core.slice(0, -1);
		core = `${core}.`;
	}

	s = core + trailing;

	if (Number.isFinite(maxLen) && s.length > maxLen) {
		s = s.slice(0, Math.max(0, maxLen)).trimEnd();
	}

	return s;
}


