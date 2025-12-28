import { PLAYER_ID } from '$lib/constants';
import { getRoom, roomsRef, validateToken } from '$lib/firebase/server';
import { json } from '@sveltejs/kit';

function badRequest(message, status = 400) {
	return json({ ok: false, message }, { status });
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ cookies, params }) {
	try {
		validateToken(cookies);

		const roomCode = String(params.roomCode || '').trim().toUpperCase();
		if (!roomCode) return badRequest('Missing room code');

		const playerId = String(cookies.get(PLAYER_ID) || '').trim();
		if (!playerId) return badRequest('Missing player identity');

		const room = await getRoom(roomCode);
		if (!room) return badRequest('Room does not exist', 404);
		if (room.meta?.hostPlayerId !== playerId)
			return badRequest('Only the host can start the game', 403);

		await roomsRef.child(roomCode).child('meta').update({
			state: 'PLAYING',
			locked: true,
		});

		return json({ ok: true });
	} catch (err) {
		console.error('POST /api/rooms/:roomCode/start failed', err);
		return json(
			{ ok: false, message: 'Internal error starting game' },
			{ status: 500 },
		);
	}
}
