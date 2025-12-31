/**
 * @typedef {import('@sveltejs/kit').Cookies} Cookies
 * @typedef {import('../../routes/[sessionId]/$types').RouteParams} Params
 */

import { getSession, validateToken } from '$lib/firebase/server';
import { SessionManager } from '$lib/session';

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

