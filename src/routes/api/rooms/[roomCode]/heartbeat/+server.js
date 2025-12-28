import admin from 'firebase-admin';
import { PLAYER_ID } from '$lib/constants';
import { getRoom, roomsRef, validateToken } from '$lib/firebase/server';
import { json } from '@sveltejs/kit';

function badRequest(message, status = 400) {
	return json({ ok: false, message }, { status });
}

/**
 * Heartbeat endpoint - updates player's lastSeenAt and connected status
 * @type {import('./$types').RequestHandler}
 */
export async function POST({ cookies, params, request }) {
	try {
		validateToken(cookies);

		const roomCode = String(params.roomCode || '').trim().toUpperCase();
		if (!roomCode) return badRequest('Missing room code');

		const playerId = String(cookies.get(PLAYER_ID) || '').trim();
		if (!playerId) return badRequest('Missing player identity');

		/** @type {{playerId?: string}} */
		const body = await request.json().catch(() => ({}));
		const bodyPlayerId = String(body?.playerId || '').trim();
		
		// Use playerId from body if provided (for sendBeacon), otherwise use cookie
		const targetPlayerId = bodyPlayerId || playerId;

		const room = await getRoom(roomCode);
		if (!room) return badRequest('Room does not exist', 404);

		// Check if player exists in room
		const player = room.players?.[targetPlayerId];
		if (!player || player.status === 'KICKED') {
			return badRequest('Player not found in room', 404);
		}

		const now = admin.database.ServerValue.TIMESTAMP;

		// Update lastSeenAt and mark as connected
		await roomsRef.child(roomCode).child('players').child(targetPlayerId).update({
			connected: true,
			lastSeenAt: now,
		});

		return json({ ok: true, timestamp: Date.now() });
	} catch (err) {
		console.error('POST /api/rooms/:roomCode/heartbeat failed', err);
		return json(
			{ ok: false, message: 'Internal error updating heartbeat' },
			{ status: 500 },
		);
	}
}


