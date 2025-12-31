/**
 * @typedef {import('$lib/types').SessionAction} SessionAction
 * @typedef {import('$lib/types').Guess} Guess
 */

import { GROUP, GUESSES, ROUND_STATES, SESSION, USERNAME } from '$lib/constants';
import { parseSessionRequest } from '$lib/game/helpers';
import { client } from '$lib/analytics';

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
	const state =
		uniqueGroupCount === 1 ? ROUND_STATES.TALLY : ROUND_STATES.VOTE;
	const interruption =
		uniqueGroupCount === 1
			? 'There was only 1 distinct incorrect guess!'
			: '';
	const payload = { ...guessGroupPayload, state, interruption };
	if (interruption !== '')
		client.capture({
			event: 'interruption',
			properties: { stage: 'grouping' },
		});
	await sm.roundRef.update(payload);
}
