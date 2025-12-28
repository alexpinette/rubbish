/**
 * Client-side presence checking utility
 * Periodically checks and updates connection status based on lastSeenAt timestamps
 * Note: This is a reactive version that works with Svelte's reactive statements
 */

import { getDatabase, ref, update } from 'firebase/database';
import { isPlayerOnline } from './presence';

const PRESENCE_CHECK_INTERVAL = 10000; // Check every 10 seconds
const OFFLINE_THRESHOLD = 20000; // 20 seconds without heartbeat = offline

/**
 * Start presence checking for a room
 * This will periodically mark players as offline if they haven't sent a heartbeat recently
 * @param {string} roomCode - Room code
 * @param {() => any} getRoom - Function to get current room data (reactive)
 * @param {Function} getFirebaseApp - Function to get Firebase app from context
 * @returns {() => void} - Cleanup function
 */
export function startPresenceCheck(roomCode, getRoom, getFirebaseApp) {
	if (!roomCode) {
		console.warn('Cannot start presence check: missing roomCode');
		return () => {};
	}

	let intervalId = null;
	let isActive = true;

	const checkPresence = () => {
		if (!isActive) return;

		const room = getRoom();
		if (!room) return;

		const firebaseApp = getFirebaseApp();
		if (!firebaseApp) return;

		const db = getDatabase(firebaseApp);
		const updates = {};

		// Check each player's lastSeenAt
		const players = room.players || {};
		for (const [playerId, player] of Object.entries(players)) {
			if (!player || player.status !== 'ACTIVE') continue;

			const online = isPlayerOnline(player.lastSeenAt, OFFLINE_THRESHOLD);
			const currentlyConnected = player.connected === true;

			// Update connected status if it doesn't match reality
			if (online !== currentlyConnected) {
				updates[`rooms/${roomCode}/players/${playerId}/connected`] = online;
			}
		}

		// Apply all updates at once
		if (Object.keys(updates).length > 0) {
			const rootRef = ref(db);
			update(rootRef, updates).catch((err) => {
				console.error('Failed to update presence:', err);
			});
		}
	};

	// Run immediately, then set up interval
	checkPresence();
	intervalId = setInterval(checkPresence, PRESENCE_CHECK_INTERVAL);

	return () => {
		isActive = false;
		if (intervalId) {
			clearInterval(intervalId);
			intervalId = null;
		}
	};
}

