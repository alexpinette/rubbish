/**
 * @typedef {import("$lib/types").Category} Category
 * @typedef {import("@skeletonlabs/skeleton").ToastStore} ToastStore
 */

import { goto } from '$app/navigation';
import config from '$lib/config';

/** @param {boolean} disabled */
export const getButtonVariant = (disabled) => (disabled ? 'variant-ghost' : 'variant-filled');

/**
 * Get appropriate prompt and response names for a given category
 * @param {Category} category
 */
export function getCategoryWords(category) {
	let targetCategory = config.categories.find((cat) => cat.name === category);
	let prompt = targetCategory?.promptName || '';
	let response = targetCategory?.responseName || '';
	return { prompt, response };
}

/**
 * Convert snake_case to TitleCase
 * @param {string} str
 */
export function toTitleCase(str) {
	return str
		.toLowerCase()
		.split('_')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
}

/** @param array {any[]} */
export function shuffle(array) {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
	return array;
}

/**
 * Handle error
 * @param {ToastStore} store
 * @param {Error} error
 * @throws {Error} - rethrows the error
 */
export function handleError(store, error) {
	store.trigger({
		message: error.message,
		timeout: config.toastTimeout,
		background: 'variant-filled-error',
	});
}

/**
 * Handle info
 * @param {ToastStore} store
 * @param {string} message
 */
export function handleInfo(store, message) {
	store.trigger({
		message,
		timeout: config.toastTimeout,
		background: 'variant-filled-success',
	});
}

/**
 * Return back home and reset cookies
 * @param {string} username - username
 * @param {string} sessionId - session ID
 */
export function returnHome(username, sessionId) {
	document.cookie = `${username}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'`;
	document.cookie = `${sessionId}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'`;
	localStorage.clear();
	goto('/');
}

/**
 * Color palette for player identities
 * Colors chosen for good contrast on both light and dark backgrounds
 * @type {Array<{bg: string, text: string, border: string}>}
 */
const PLAYER_COLORS = [
	{ bg: '#3B82F6', text: '#FFFFFF', border: '#2563EB' }, // Blue
	{ bg: '#EF4444', text: '#FFFFFF', border: '#DC2626' }, // Red
	{ bg: '#10B981', text: '#FFFFFF', border: '#059669' }, // Green
	{ bg: '#F59E0B', text: '#FFFFFF', border: '#D97706' }, // Amber
	{ bg: '#8B5CF6', text: '#FFFFFF', border: '#7C3AED' }, // Purple
	{ bg: '#EC4899', text: '#FFFFFF', border: '#DB2777' }, // Pink
	{ bg: '#06B6D4', text: '#FFFFFF', border: '#0891B2' }, // Cyan
	{ bg: '#F97316', text: '#FFFFFF', border: '#EA580C' }, // Orange
	{ bg: '#6366F1', text: '#FFFFFF', border: '#4F46E5' }, // Indigo
	{ bg: '#14B8A6', text: '#FFFFFF', border: '#0D9488' }, // Teal
	{ bg: '#A855F7', text: '#FFFFFF', border: '#9333EA' }, // Violet
	{ bg: '#E11D48', text: '#FFFFFF', border: '#BE123C' }, // Rose
];

/**
 * Generate a deterministic color for a player based on their username
 * @param {string} username - The player's username
 * @param {number} colorCount - Number of colors in the palette
 * @returns {number} - Index in the color palette
 */
export function getPlayerColorIndex(username, colorCount = PLAYER_COLORS.length) {
	let hash = 0;
	for (let i = 0; i < username.length; i++) {
		hash = username.charCodeAt(i) + ((hash << 5) - hash);
	}
	return Math.abs(hash) % colorCount;
}

/**
 * Get the color for a player
 * @param {string} username - The player's username
 * @returns {{bg: string, text: string, border: string}} - Color object
 */
export function getPlayerColor(username) {
	const index = getPlayerColorIndex(username);
	return PLAYER_COLORS[index];
}

/**
 * Get all player colors from session data
 * @param {Object<string, string|number>} playerColors - Map of username to color index
 * @param {string[]} players - List of all players
 * @returns {Object<string, {bg: string, text: string, border: string}>} - Map of username to color
 */
export function getAllPlayerColors(playerColors, players) {
	const colors = {};
	const usedIndices = new Set();
	
	// First pass: assign colors to players who already have them
	for (const player of players) {
		if (playerColors && playerColors[player] !== undefined) {
			const index = parseInt(playerColors[player], 10);
			const colorIndex = Math.abs(index) % PLAYER_COLORS.length;
			colors[player] = PLAYER_COLORS[colorIndex];
			usedIndices.add(colorIndex);
		}
	}
	
	// Second pass: assign unique colors to players without colors (backwards compatibility)
	// Assign sequentially to ensure uniqueness
	let nextIndex = 0;
	for (const player of players) {
		if (!colors[player]) {
			// Find next available color index
			while (usedIndices.has(nextIndex % PLAYER_COLORS.length)) {
				nextIndex++;
			}
			const colorIndex = nextIndex % PLAYER_COLORS.length;
			colors[player] = PLAYER_COLORS[colorIndex];
			usedIndices.add(colorIndex);
			nextIndex++;
		}
	}
	
	return colors;
}