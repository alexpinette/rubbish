/**
 * @typedef {import('$lib/types').SessionAction} SessionAction
 */

import { ROUND_STATES, USERNAME } from '$lib/constants';
import { parseSessionRequest } from '$lib/game/helpers';

/**
 * Proceed to the next readout card, or finish into VOTE.
 * Only the dasher (a player) can control the readout stage.
 * @type {SessionAction}
 */
export async function next(cookies, params, request) {
	const { sm } = await parseSessionRequest(cookies, params, request);
	const user = String(cookies.get(USERNAME));

	if (sm.round.dasher !== user) {
		throw new Error('Only the dasher can control readout');
	}

	const order = Array.isArray(sm.round.read?.order) ? sm.round.read.order : [];
	const currentIndex = Number(sm.round.read?.index ?? -1);
	const nextIndex = currentIndex + 1;

	// If we somehow have no order, just proceed to voting.
	if (order.length === 0 || nextIndex >= order.length) {
		await sm.roundRef.update({ state: ROUND_STATES.VOTE });
		return;
	}

	await sm.roundRef.update({ read: { order, index: nextIndex } });
}

/**
 * Skip readout and proceed directly to voting.
 * @type {SessionAction}
 */
export async function skip(cookies, params, request) {
	const { sm } = await parseSessionRequest(cookies, params, request);
	const user = String(cookies.get(USERNAME));

	if (sm.round.dasher !== user) {
		throw new Error('Only the dasher can control readout');
	}

	await sm.roundRef.update({ state: ROUND_STATES.VOTE });
}


