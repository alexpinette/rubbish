import { getRoom } from '$lib/firebase/server';

/** @type {import('./$types').PageServerLoad} */
export async function load({ params }) {
	const roomCode = String(params.roomCode || '').toUpperCase();
	const room = await getRoom(roomCode);
	return { roomCode, room };
}
