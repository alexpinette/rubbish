import admin from 'firebase-admin';
import config from '$lib/config';
import { PLAYER_ID } from '$lib/constants';
import { getRoom, roomsRef, validateToken } from '$lib/firebase/server';
import { json } from '@sveltejs/kit';

function badRequest(message, status = 400) {
	return json({ ok: false, message }, { status });
}

function activePlayerNames(players = {}) {
	return Object.values(players)
		.filter((p) => p && p.status === 'ACTIVE')
		.map((p) => p.name);
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ cookies, params, request }) {
	try {
		validateToken(cookies);

		const roomCode = String(params.roomCode || '').trim().toUpperCase();
		if (!roomCode) return badRequest('Missing room code');

		const playerId = String(cookies.get(PLAYER_ID) || '').trim();
		if (!playerId) return badRequest('Missing player identity');

		/** @type {{name?: string}} */
		const body = await request.json().catch(() => ({}));
		const name = String(body?.name || '').trim();
		if (!name) return badRequest('Name is required');
		if (name.length > config.maxUsernameLength)
			return badRequest(`Name too long (max ${config.maxUsernameLength})`);

		const room = await getRoom(roomCode);
		if (!room) return badRequest('Room does not exist', 404);

		const players = room.players || {};
		const existing = players[playerId];
		const now = admin.database.ServerValue.TIMESTAMP;

		// Re-join (same playerId cookie) even if room locked.
		if (existing && existing.status !== 'KICKED') {
			await roomsRef.child(roomCode).child('players').child(playerId).update({
				name,
				connected: true,
				lastSeenAt: now,
			});
			return json({ ok: true, rejoined: true });
		}

		if (room.meta?.locked)
			return badRequest('Game already started (room is locked)', 400);

		const takenNames = new Set(activePlayerNames(players));
		if (takenNames.has(name))
			return badRequest('That name is already taken in this room', 400);

		await roomsRef.child(roomCode).child('players').child(playerId).set({
			name,
			joinedAt: now,
			isHost: false,
			status: 'ACTIVE',
			connected: true,
			lastSeenAt: now,
			score: 0,
		});

		return json({ ok: true });
	} catch (err) {
		console.error('POST /api/rooms/:roomCode/join failed', err);
		return json(
			{ ok: false, message: 'Internal error joining room' },
			{ status: 500 },
		);
	}
}
