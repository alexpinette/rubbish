import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SessionManager } from '$lib/session.js';
import { ROUND_STATES, SESSION_STATES, UNKNOWN } from '$lib/constants.js';

function makeSession({ current, rounds }) {
	return {
		state: SESSION_STATES.STARTED,
		creator: 'HOST',
		limit: 10,
		current,
		ais: 0,
		uids: {},
		categories: ['Rare words'],
		scoreboard: { P1: 0, P2: 0, P3: 0 },
		rounds,
		kicked: {},
		clientTypes: {},
		spectators: {},
		hostPlayer: UNKNOWN,
	};
}

describe('SessionManager.getNextDasher', () => {
	/** @type {ReturnType<typeof vi.spyOn>} */
	let rand;

	beforeEach(() => {
		// Deterministic picks: always choose index 0 from remaining.
		rand = vi.spyOn(Math, 'random').mockReturnValue(0);
	});

	afterEach(() => {
		rand?.mockRestore();
	});

	it('should not repeat the same dasher on the next round when others are available', () => {
		const sm = new SessionManager(
			makeSession({
				current: 1,
				rounds: {
					1: { dasher: 'P1', state: ROUND_STATES.GUESS },
				},
			}),
			'ABCD',
		);

		// Remaining should exclude P1, so deterministic pick is P2.
		expect(sm.getNextDasher()).toBe('P2');
	});

	it('should not repeat until everyone has been dasher, then reset', () => {
		const sm = new SessionManager(
			makeSession({
				current: 3,
				rounds: {
					1: { dasher: 'P1', state: ROUND_STATES.GUESS },
					2: { dasher: 'P2', state: ROUND_STATES.GUESS },
					3: { dasher: 'P3', state: ROUND_STATES.GUESS },
				},
			}),
			'ABCD',
		);

		// Cycle completed at round 3; reset eligibility, but avoid back-to-back (exclude P3).
		// Deterministic pick becomes P1.
		expect(sm.getNextDasher()).toBe('P1');
	});
});


