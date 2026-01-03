/**
 * @typedef {import('$lib/types').SessionAction} SessionAction
 * @typedef {import('$lib/types').Guess} Guess
 */

import { GROUP, GUESSES, ROUND_STATES, SESSION, TRUE_RESPONSE, USERNAME } from '$lib/constants';
import { generateAiGuesses, parseSessionRequest } from '$lib/game/helpers';
import { client } from '$lib/analytics';

/**
 * Shuffle array in-place (server-safe)
 * @template T
 * @param {T[]} array
 * @returns {T[]}
 */
function shuffleInPlace(array) {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
	return array;
}

/**
 * Proceed after grouping
 * @type {SessionAction}
 */
export async function proceed(cookies, params, request) {
	const { form, sm } = await parseSessionRequest(cookies, params, request);
	const user = String(cookies.get(USERNAME));
	
	// Only dasher (who is a player, not host) can group guesses
	if (sm.round.dasher !== user) {
		throw new Error('Only the dasher can group guesses');
	}
	
	const guesses = Object.entries(Object.fromEntries(form.entries())).filter(
		([key]) => key !== SESSION,
	);
	const guessGroupPayload = Object.fromEntries(
		guesses.map(([key, value]) => [`${GUESSES}/${key}/${GROUP}`, value]),
	);
	const uniqueGroupCount = new Set(Object.values(guessGroupPayload)).size;

	// If AIs are enabled, allow continuation even if there is only 1 distinct human group.
	const aiCount = Number(sm.session.ais ?? 0);
	const aiGuesses = uniqueGroupCount === 1 && aiCount > 0 ? generateAiGuesses(aiCount) : {};
	const hasAis = Object.keys(aiGuesses).length > 0;
	const shouldInterrupt = uniqueGroupCount === 1 && !hasAis;

	const state = shouldInterrupt ? ROUND_STATES.TALLY : ROUND_STATES.READ;
	const interruption = shouldInterrupt ? 'There was only 1 distinct incorrect guess!' : '';

	/** @type {any} */
	const payload = { ...aiGuesses, ...guessGroupPayload, state, interruption };

	// Only initialize readout when we actually enter READ.
	if (!shouldInterrupt) {
		const groups = [
			...new Set(Object.values(guessGroupPayload).map((g) => String(g ?? '').trim()).filter(Boolean)),
		];
		const aiGroups = Object.values(aiGuesses).map((g) => String(g?.group ?? '').trim()).filter(Boolean);
		const order = shuffleInPlace([...new Set([...groups, ...aiGroups]), TRUE_RESPONSE]);
		payload.read = { order, index: -1 };
	}
	if (interruption !== '')
		client.capture({
			event: 'interruption',
			properties: { stage: 'grouping' },
		});
	await sm.roundRef.update(payload);
}
