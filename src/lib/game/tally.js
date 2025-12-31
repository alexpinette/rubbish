/**
 * @typedef {import('$lib/types').SessionAction} SessionAction
 */

import { SESSION_STATES, USERNAME } from '$lib/constants';
import { parseSessionRequest } from '$lib/game/helpers';
import admin from 'firebase-admin';
import { client } from '$lib/analytics.js';

/**
 * Proceed after tallying
 * @type {SessionAction}
 */
export async function proceed(cookies, params, request) {
	const { sm } = await parseSessionRequest(cookies, params, request);
	const user = String(cookies.get(USERNAME));
	
	// Only dasher (who is a player, not host) can proceed from tally
	if (sm.round.dasher !== user) {
		throw new Error('Only the dasher can proceed from tally');
	}
	
	if (sm.session.current === sm.session.limit) {
		client.capture({
			event: 'session_completed',
		});
	}
	const payload =
		sm.session.current === sm.session.limit
			? { state: SESSION_STATES.FINISHED }
			: {
					current: admin.database.ServerValue.increment(1),
					[sm.roundPath.next]: await sm.nextRoundPayload(),
				};
	await sm.sessionRef.update(payload);
}
