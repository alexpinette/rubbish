import admin from 'firebase-admin';
import config from '$lib/config';
import { PLAYER_ID, USERNAME } from '$lib/constants';
import { getRoom, roomsRef, validateToken } from '$lib/firebase/server';
import { fail, redirect } from '@sveltejs/kit';

function normalizeRoomCode(code) {
	return String(code || '').trim().toUpperCase();
}

function activePlayerNames(players = {}) {
	return Object.values(players)
		.filter((p) => p && p.status === 'ACTIVE')
		.map((p) => p.name);
}

/** @type {import('./$types').Actions} */
export const actions = {
	enter: async ({ cookies, request }) => {
		validateToken(cookies);

		const form = await request.formData();
		const name = String(form.get(USERNAME) || '').trim();
		const roomCode = normalizeRoomCode(form.get('roomCode'));
		const playerId = String(cookies.get(PLAYER_ID) || '').trim();

		if (!playerId) return fail(400, { success: false, message: 'Missing player identity' });
		if (!roomCode) return fail(400, { success: false, message: 'Room code is required' });
		if (!name) return fail(400, { success: false, message: 'Name is required' });
		if (name.length > config.maxUsernameLength)
			return fail(400, { success: false, message: `Name too long (max ${config.maxUsernameLength})` });

		const room = await getRoom(roomCode);
		if (!room) return fail(404, { success: false, message: 'Room does not exist' });

		const players = room.players || {};
		const existing = players[playerId];
		const now = admin.database.ServerValue.TIMESTAMP;

		// Re-join path: playerId already in room (allowed even after start)
		if (existing && existing.status !== 'KICKED') {
			await roomsRef.child(roomCode).child('players').child(playerId).update({
				name,
				connected: true,
				lastSeenAt: now,
			});
			throw redirect(303, `/room/${roomCode}`);
		}

		// New join path
		if (room.meta?.locked) {
			return fail(400, { success: false, message: 'Game already started (room is locked)' });
		}

		// Enforce name uniqueness among active players (optional but feels Jackbox-y)
		const takenNames = new Set(activePlayerNames(players));
		if (takenNames.has(name)) {
			return fail(400, { success: false, message: 'That name is already taken in this room' });
		}

		await roomsRef.child(roomCode).child('players').child(playerId).set({
			name,
			joinedAt: now,
			isHost: false,
			status: 'ACTIVE',
			connected: true,
			lastSeenAt: now,
			score: 0,
		});

		throw redirect(303, `/room/${roomCode}`);
	},
};
