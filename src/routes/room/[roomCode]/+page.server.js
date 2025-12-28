import admin from 'firebase-admin';
import config from '$lib/config';
import { PLAYER_ID, USERNAME } from '$lib/constants';
import { getRoom, roomsRef, validateToken } from '$lib/firebase/server';
import { fail } from '@sveltejs/kit';

function activePlayerNames(players = {}) {
	return Object.values(players)
		.filter((p) => p && p.status === 'ACTIVE')
		.map((p) => p.name);
}

/** @type {import('./$types').PageServerLoad} */
export async function load({ cookies, params }) {
	const roomCode = String(params.roomCode || '').toUpperCase();
	const room = await getRoom(roomCode);
	const playerId = String(cookies.get(PLAYER_ID) || '');

	const me = room?.players?.[playerId] ?? null;
	const joined = Boolean(me && me.status !== 'KICKED');

	return {
		roomCode,
		room,
		joined,
		me,
		isHost: joined && room?.meta?.hostPlayerId === playerId,
	};
}

/** @type {import('./$types').Actions} */
export const actions = {
	join: async ({ cookies, params, request }) => {
		validateToken(cookies);

		const roomCode = String(params.roomCode || '').toUpperCase();
		const form = await request.formData();
		const name = String(form.get(USERNAME) || '').trim();
		const playerId = String(cookies.get(PLAYER_ID) || '').trim();

		if (!playerId) return fail(400, { success: false, message: 'Missing player identity' });
		if (!name) return fail(400, { success: false, message: 'Name is required' });
		if (name.length > config.maxUsernameLength)
			return fail(400, { success: false, message: `Name too long (max ${config.maxUsernameLength})` });

		const room = await getRoom(roomCode);
		if (!room) return fail(404, { success: false, message: 'Room does not exist' });

		const players = room.players || {};
		const existing = players[playerId];
		const now = admin.database.ServerValue.TIMESTAMP;

		if (existing && existing.status !== 'KICKED') {
			await roomsRef.child(roomCode).child('players').child(playerId).update({
				name,
				connected: true,
				lastSeenAt: now,
			});
			return { success: true };
		}

		if (room.meta?.locked) return fail(400, { success: false, message: 'Game already started (room is locked)' });

		const takenNames = new Set(activePlayerNames(players));
		if (takenNames.has(name)) return fail(400, { success: false, message: 'That name is already taken in this room' });

		await roomsRef.child(roomCode).child('players').child(playerId).set({
			name,
			joinedAt: now,
			isHost: false,
			status: 'ACTIVE',
			connected: true,
			lastSeenAt: now,
			score: 0,
		});

		return { success: true };
	},

	start: async ({ cookies, params }) => {
		validateToken(cookies);

		const roomCode = String(params.roomCode || '').toUpperCase();
		const playerId = String(cookies.get(PLAYER_ID) || '').trim();
		if (!playerId) return fail(400, { success: false, message: 'Missing player identity' });

		const room = await getRoom(roomCode);
		if (!room) return fail(404, { success: false, message: 'Room does not exist' });
		if (room.meta?.hostPlayerId !== playerId) return fail(403, { success: false, message: 'Only the host can start the game' });

		await roomsRef.child(roomCode).child('meta').update({
			state: 'PLAYING',
			locked: true,
		});

		return { success: true };
	},
};
