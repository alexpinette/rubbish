/**
 * Heartbeat/presence system for tracking player connections
 * Updates player's lastSeenAt timestamp periodically to indicate they're online
 */

/**
 * Start heartbeat for a player in a room
 * @param {string} roomCode - Room code
 * @param {string} playerId - Player ID
 * @param {number} intervalMs - Heartbeat interval in milliseconds (default: 5000 = 5 seconds)
 * @returns {() => void} - Cleanup function to stop the heartbeat
 */
export function startHeartbeat(roomCode, playerId, intervalMs = 5000) {
	if (!roomCode || !playerId) {
		console.warn('Cannot start heartbeat: missing roomCode or playerId');
		return () => {};
	}

	let intervalId = null;
	let isActive = true;

	// Immediate heartbeat on start
	sendHeartbeat(roomCode, playerId).catch((err) => {
		console.error('Initial heartbeat failed:', err);
	});

	// Set up periodic heartbeat
	intervalId = setInterval(() => {
		if (!isActive) return;
		sendHeartbeat(roomCode, playerId).catch((err) => {
			console.error('Heartbeat failed:', err);
		});
	}, intervalMs);

	// Also send heartbeat when page becomes visible (user switches back to tab)
	const handleVisibilityChange = () => {
		if (document.visibilityState === 'visible' && isActive) {
			sendHeartbeat(roomCode, playerId).catch((err) => {
				console.error('Visibility heartbeat failed:', err);
			});
		}
	};
	document.addEventListener('visibilitychange', handleVisibilityChange);

	// Send heartbeat before page unload
	const handleBeforeUnload = () => {
		// Use sendBeacon for reliable delivery on page unload
		if (navigator.sendBeacon) {
			const url = `/api/rooms/${encodeURIComponent(roomCode)}/heartbeat`;
			const data = JSON.stringify({ playerId });
			navigator.sendBeacon(url, data);
		} else {
			// Fallback: synchronous fetch (may not complete, but we try)
			sendHeartbeat(roomCode, playerId, true).catch(() => {});
		}
	};
	window.addEventListener('beforeunload', handleBeforeUnload);

	// Return cleanup function
	return () => {
		isActive = false;
		if (intervalId) {
			clearInterval(intervalId);
			intervalId = null;
		}
		document.removeEventListener('visibilitychange', handleVisibilityChange);
		window.removeEventListener('beforeunload', handleBeforeUnload);
	};
}

/**
 * Send a heartbeat update to the server
 * @param {string} roomCode - Room code
 * @param {string} playerId - Player ID
 * @param {boolean} sync - Whether to use synchronous request (for beforeunload)
 * @returns {Promise<void>}
 */
async function sendHeartbeat(roomCode, playerId, sync = false) {
	const url = `/api/rooms/${encodeURIComponent(roomCode)}/heartbeat`;
	
	if (sync) {
		// Synchronous request for beforeunload (may not complete)
		try {
			fetch(url, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ playerId }),
				keepalive: true, // Keep request alive even after page unload
			}).catch(() => {
				// Ignore errors on sync requests
			});
		} catch (e) {
			// Ignore errors
		}
		return;
	}

	const response = await fetch(url, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ playerId }),
	});

	if (!response.ok) {
		const error = await response.json().catch(() => ({ message: 'Heartbeat failed' }));
		throw new Error(error.message || 'Heartbeat failed');
	}
}

/**
 * Check if a player is considered online based on their lastSeenAt timestamp
 * @param {number|null|undefined} lastSeenAt - Timestamp of last seen
 * @param {number} timeoutMs - Timeout in milliseconds (default: 20000 = 20 seconds)
 * @returns {boolean} - Whether player is considered online
 */
export function isPlayerOnline(lastSeenAt, timeoutMs = 20000) {
	if (!lastSeenAt) return false;
	const now = Date.now();
	const timeSinceLastSeen = now - lastSeenAt;
	return timeSinceLastSeen < timeoutMs;
}


