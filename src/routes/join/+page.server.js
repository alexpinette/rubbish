import {
	CLIENT_TYPES,
	DEFAULT_HOST_PLAYER,
	DEFAULT_SCORE,
	SCOREBOARD,
	SESSION_ID,
	SESSION_STATES,
	UID,
	USERNAME,
} from '$lib/constants';
import config from '$lib/config';
import { dbRef, getSession, sessionIdExists, validateToken } from '$lib/firebase/server';
import { fail, redirect } from '@sveltejs/kit';
import { enquire } from '$lib/contact.js';
import { normalizeSessionId, normalizeUsername } from '$lib/normalize';

/** @type {import('./$types').Actions} */
export const actions = {
	enquire: async ({ cookies, request }) => enquire(cookies, request),
	enter: async ({ cookies, request }) => {
		validateToken(cookies);
		const data = await request.formData();
		const username = normalizeUsername(String(data.get(USERNAME) || ''));
		const sessionId = normalizeSessionId(String(data.get(SESSION_ID) || ''));
		const uid = String(cookies.get(UID));
		const clientType = String(data.get('clientType') || CLIENT_TYPES.PLAYER);
		const isSpectator = clientType === CLIENT_TYPES.SPECTATOR;

		const sessionIdLen = (config.sessionId?.numCharacters ?? 4) + (config.sessionId?.numIntegers ?? 0);
		if (username.length < 1) return fail(400, { success: false, message: 'Invalid username' });
		if (sessionId.length !== sessionIdLen)
			return fail(400, { success: false, message: 'Invalid room code' });

		if (!(await sessionIdExists(sessionId)))
			return fail(400, { success: false, message: 'Session does not exist' });
		const session = await getSession(sessionId);
		const players = Object.prototype.hasOwnProperty.call(session, SCOREBOARD)
			? Object.keys(session.scoreboard)
			: [];
		const spectators = Object.keys(session.spectators ?? {});

		// Check if username already exists as player or spectator
		if (players.includes(username) || spectators.includes(username))
			return fail(400, { success: false, message: 'Username already exists' });

		// Check if this device (uid) is already in the session
		if (
			Object.keys(session.uids ?? {}).includes(uid) &&
			!players.includes(username) &&
			!spectators.includes(username)
		) {
			return fail(400, {
				success: false,
				message:
					'This device is already associated with this session. You cannot rejoin with a different username.',
			});
		}

		if (session.state !== SESSION_STATES.INITIATED)
			return fail(400, { success: false, message: 'Session has already started' });

		// Update session based on client type
		const updates = {
			[`uids/${uid}`]: true,
			[`clientTypes/${username}`]: clientType,
		};

		if (isSpectator) {
			// Add to spectators, not scoreboard
			updates[`spectators/${username}`] = true;
		} else {
			// Add to scoreboard as player
			updates[`${SCOREBOARD}/${username}`] = DEFAULT_SCORE;

			// Assign a deterministic join-order color (cycles through 12 colors)
			const colorIndex = players.length % 12;
			updates[`playerColors/${username}`] = colorIndex;

			// First player becomes hostPlayer if hostPlayer isn't set
			const isFirstPlayer = Object.keys(session.scoreboard ?? {}).length === 0;
			const hostPlayerNotSet =
				!session.hostPlayer ||
				session.hostPlayer === DEFAULT_HOST_PLAYER ||
				session.hostPlayer === 'UNKNOWN';
			if (isFirstPlayer && hostPlayerNotSet) updates['hostPlayer'] = username;
		}

		await dbRef.child(sessionId).update(updates);
		cookies.set(USERNAME, username, { path: '/' });
		cookies.set(SESSION_ID, sessionId, { path: '/' });
		throw redirect(303, `/${sessionId}`);
	},
};


