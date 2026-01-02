/**
 * @typedef {import('$lib/types').SessionAction} SessionAction
 */

import {
	CORRECT,
	DASHER,
	GUESSES,
	ROUND_STATES,
	SCOREBOARD,
	STATE,
	USERNAME,
	VOTES,
} from '$lib/constants';
import { parseSessionRequest } from '$lib/game/helpers';
import { getRoundScores } from '$lib/score';

/**
 * Proceed from reveal to tally (calculate and apply scores)
 * @type {SessionAction}
 */
export async function proceed(cookies, params, request) {
	const { form, sm } = await parseSessionRequest(cookies, params, request);
	const user = String(cookies.get(USERNAME));
	
	// Only dasher (who is a player, not host) can proceed from reveal
	if (sm.round.dasher !== user) {
		throw new Error('Only the dasher can proceed from reveal');
	}
	
	const votes = JSON.parse(String(form.get(VOTES)) || '{}');
	const guesses = JSON.parse(String(form.get(GUESSES)) || '{}');
	const scoreboard = JSON.parse(String(form.get(SCOREBOARD)) || '{}');
	const correct = JSON.parse(String(form.get(CORRECT)) || '[]');
	const dasher = String(form.get(DASHER) || '');
	const scores = getRoundScores(dasher, votes, guesses, correct, scoreboard);
	await sm.sessionRef.update({
		[`${SCOREBOARD}`]: scores,
		[`${sm.roundPath.current}/${STATE}`]: ROUND_STATES.TALLY,
	});
}

