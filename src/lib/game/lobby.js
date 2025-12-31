/**
 * @typedef {import('$lib/types').SessionAction} SessionAction
 */

import { CLIENT_TYPES, USERNAME } from '$lib/constants';
import { parseSessionRequest } from '$lib/game/helpers';
import { fail } from '@sveltejs/kit';

/**
 * Launch the game
 * @type {SessionAction}
 */
export async function launch(cookies, params, request) {
	const { sm, form } = await parseSessionRequest(cookies, params, request);
	const username = String(cookies.get(USERNAME) || '');
	const session = sm.session;
	
	// Prevent HOST client type from launching (host is display-only)
	if (session.clientTypes?.[username] === CLIENT_TYPES.HOST) {
		return fail(400, { success: false, message: 'Host cannot start the game. The first player must start the game.' });
	}
	
	// Only the host player (first player to join) can start the game
	if (session.hostPlayer && session.hostPlayer !== username) {
		return fail(400, { success: false, message: `Only ${session.hostPlayer} can start the game.` });
	}
	
	await sm.launch();
}
