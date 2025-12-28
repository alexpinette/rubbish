import admin from 'firebase-admin';
import config from '$lib/config';
import { PLAYER_ID } from '$lib/constants';
import { createNewRoomCode, roomsRef, validateToken } from '$lib/firebase/server';
import { json } from '@sveltejs/kit';

function badRequest(message) {
	return json({ ok: false, message }, { status: 400 });
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ cookies, request }) {
	try {
		validateToken(cookies);

		const playerId = String(cookies.get(PLAYER_ID) || '').trim();
		if (!playerId) return badRequest('Missing player identity');

		/** @type {{name?: string}} */
		const body = await request.json().catch(() => ({}));
		const name = String(body?.name || '').trim();
		if (!name) return badRequest('Name is required');
		if (name.length > config.maxUsernameLength)
			return badRequest(`Name too long (max ${config.maxUsernameLength})`);

		const roomCode = await createNewRoomCode();
		const now = admin.database.ServerValue.TIMESTAMP;

		const room = {
			meta: {
				createdAt: now,
				hostPlayerId: playerId,
				state: 'LOBBY',
				locked: false,
				version: 1,
			},
			config: {
				maxPlayers: 12,
			},
			players: {
				[playerId]: {
					name,
					joinedAt: now,
					isHost: true,
					status: 'ACTIVE',
					connected: true,
					lastSeenAt: now,
					score: 0,
				},
			},
			displays: {},
			game: null,
		};

		await roomsRef.child(roomCode).set(room);

		return json({ ok: true, roomCode });
	} catch (err) {
		console.error('POST /api/rooms failed', err);
		return json(
			{ ok: false, message: 'Internal error creating room' },
			{ status: 500 },
		);
	}
}
