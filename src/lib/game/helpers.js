/**
 * @typedef {import('@sveltejs/kit').Cookies} Cookies
 * @typedef {import('../../routes/[sessionId]/$types').RouteParams} Params
 */

import { getSession, validateToken } from '$lib/firebase/server';
import { SessionManager } from '$lib/session';
import { DEFAULT_GUESS, GUESSES } from '$lib/constants';

/**
 * Action request parsing helper
 * @param {Cookies} cookies
 * @param {Params} params
 * @param {Request} request
 * @returns {Promise<{ form: FormData, sm: SessionManager }>}
 */
export async function parseSessionRequest(cookies, params, request) {
	validateToken(cookies);
	const form = await request.formData();
	let sf = form.get('session');
	const session = sf ? JSON.parse(String(sf)) : await getSession(params.sessionId);
	const sm = new SessionManager(session, params.sessionId);
	return { form, sm };
}

/**
 * Generate placeholder AI guesses.
 * Used to avoid “auto-interruption” flows when the room configuration includes AIs.
 * NOTE: callers decide whether to apply these at `roundRef` level or prefixed with `roundPath`.
 * @param {number} aiCount
 * @returns {Object<string, any>}
 */
export function generateAiGuesses(aiCount) {
	const count = Math.max(0, Number(aiCount) || 0);
	/** @type {Object<string, any>} */
	const payload = {};
	for (let i = 0; i < count; i++) {
		const key = `NPC-${i}`;
		payload[`${GUESSES}/${key}`] = {
			...DEFAULT_GUESS,
			response: `NPC ${i}`,
			group: `NPC ${i}`,
			automatic: true,
		};
	}
	return payload;
}

