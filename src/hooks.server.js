import crypto from 'crypto';
import { dev } from '$app/environment';
import { PLAYER_ID, TOKEN, UID } from '$lib/constants';
import { signToken, tokenIsValid } from '$lib/firebase/server';

const TWO_YEARS_SECONDS = 60 * 60 * 24 * 365 * 2;

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
	// Ensure JWT token exists (used for lightweight analytics / forms)
	if (!tokenIsValid(event.cookies.get(TOKEN) || '')) {
		const payload = { user: 'anonymous', role: 'guest', iat: Date.now() / 1000 };
		event.cookies.set(TOKEN, signToken(payload), {
			httpOnly: true,
			secure: !dev,
			path: '/',
			sameSite: 'strict',
			maxAge: TWO_YEARS_SECONDS,
		});
	}

	// Ensure a stable player identity for room re-join across refreshes/tabs.
	// We store it as both PLAYER_ID and UID (the existing code uses UID for feedback/enquiries).
	let playerId = event.cookies.get(PLAYER_ID);
	if (!playerId) {
		playerId = `p_${crypto.randomUUID()}`;
		event.cookies.set(PLAYER_ID, playerId, {
			httpOnly: true,
			secure: !dev,
			path: '/',
			sameSite: 'strict',
			maxAge: TWO_YEARS_SECONDS,
		});
	}

	if (!event.cookies.get(UID)) {
		event.cookies.set(UID, playerId, {
			httpOnly: true,
			secure: !dev,
			path: '/',
			sameSite: 'strict',
			maxAge: TWO_YEARS_SECONDS,
		});
	}

	return resolve(event);
}
