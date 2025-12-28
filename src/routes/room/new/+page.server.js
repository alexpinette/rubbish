import admin from 'firebase-admin';
import config from '$lib/config';
import { PLAYER_ID, USERNAME } from '$lib/constants';
import { createNewRoomCode, roomsRef, validateToken } from '$lib/firebase/server';
import { fail, redirect } from '@sveltejs/kit';

/** @type {import('./$types').Actions} */
export const actions = {
	create: async ({ cookies, request }) => {
		validateToken(cookies);

		const form = await request.formData();
		const name = String(form.get(USERNAME) || '').trim();
		const playerId = String(cookies.get(PLAYER_ID) || '').trim();

		// Basic validation (keep it simple for MVP)
		if (!playerId) return fail(400, { success: false, message: 'Missing player identity' });
		if (!name) return fail(400, { success: false, message: 'Name is required' });
		if (name.length > config.maxUsernameLength)
			return fail(400, { success: false, message: `Name too long (max ${config.maxUsernameLength})` });

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

		throw redirect(303, `/room/${roomCode}`);
	},
};
