import config from '$lib/config';

/**
 * Normalize an input to uppercase alphanumeric only, with max length.
 * @param {string} value
 * @param {number} maxLen
 */
export function normalizeUpperAlnum(value, maxLen) {
	return String(value ?? '')
		.toUpperCase()
		.replace(/[^A-Z0-9]/g, '')
		.slice(0, Math.max(0, maxLen));
}

/**
 * Username: uppercase letters/numbers only, max length = config.maxUsernameLength.
 * @param {string} username
 */
export function normalizeUsername(username) {
	return normalizeUpperAlnum(username, config.maxUsernameLength);
}

/**
 * Room code (sessionId): uppercase letters/numbers only, fixed max length from config.
 * @param {string} sessionId
 */
export function normalizeSessionId(sessionId) {
	const len = (config.sessionId?.numCharacters ?? 4) + (config.sessionId?.numIntegers ?? 0);
	return normalizeUpperAlnum(sessionId, len);
}


