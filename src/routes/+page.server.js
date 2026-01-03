import { SESSION_ID, SESSION_STATES, UID, USERNAME } from '$lib/constants';
import { getSession } from '$lib/firebase/server';
import { enquire } from '$lib/contact';
import { normalizeSessionId, normalizeUsername } from '$lib/normalize';

/** @type {import('./$types').PageServerLoad} */
export async function load({ cookies }) {
	/**
	 * We wish to check whether a user belongs to an active session,
	 * if they do then they will have the option to resume their session
	 * 
	 * We check both username (for display) and uid (for device-specific validation)
	 * to ensure only devices that actually joined can resume
	 */
	const joinableStates = [SESSION_STATES.INITIATED, SESSION_STATES.STARTED];
	const username = normalizeUsername(cookies.get(USERNAME) || '');
	const sessionId = normalizeSessionId(cookies.get(SESSION_ID) || '');
	const uid = cookies.get(UID) || '';
	
	if (username === '' || sessionId === '' || uid === '') return { activeSessionId: '' };
	const session = await getSession(sessionId);
	if (!session) return { activeSessionId: '' };
	if (!joinableStates.includes(session.state)) return { activeSessionId: '' };
	// Check if user was kicked (must check before scoreboard check)
	if (Object.keys(session.kicked ?? {}).includes(username)) return { activeSessionId: '' };
	if (!Object.keys(session.scoreboard ?? {}).includes(username)) return { activeSessionId: '' };
	// Verify this specific device (uid) actually joined the session
	// Note: If uid is not in uids but username is in scoreboard, they might have joined
	// before uid tracking was added. We allow this for backwards compatibility, but
	// prioritize uid check for new sessions.
	if (Object.keys(session.uids ?? {}).length > 0 && !Object.keys(session.uids ?? {}).includes(uid)) {
		// Session has uid tracking, but this device's uid is not present
		// This could mean they're on a different device or cookies were cleared
		// For now, we allow it if username is in scoreboard (they can navigate directly)
		// but don't show Resume Game button to avoid confusion
		return { activeSessionId: '' };
	}
	return { activeSessionId: sessionId };
}

/** @type {import('./$types').Actions} */
export const actions = {
	enquire: async ({ cookies, request }) => enquire(cookies, request),
};
