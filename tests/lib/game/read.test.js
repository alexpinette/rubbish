import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { createParseSessionRequestMock, setupMocks } from '../../support/mocks.js';
import { REFS, ROUND_STATES } from '$lib/constants.js';
import { next, skip } from '$lib/game/read.js';
import { dummySessionManager } from '../../support/data.js';

beforeAll(async () => {
	createParseSessionRequestMock();
});

describe('readout stage', () => {
	beforeEach(() => {
		// Reset shared dummy session mutations from other tests
		dummySessionManager.session.ais = 0;
		dummySessionManager.session.current = 1;
		// Seed a read order for the current round
		dummySessionManager.session.rounds[1].read = { order: ['Group 0', 'True Response'], index: -1 };
	});

	it('should advance to the first card (index 0)', async () => {
		const { mockCookies, mockRequest, mockParams, mockUpdate } = await setupMocks('P1', {}, REFS.ROUND);
		await next(mockCookies, mockParams, mockRequest);
		expect(mockUpdate).toHaveBeenCalledWith({
			read: { order: ['Group 0', 'True Response'], index: 0 },
		});
	});

	it('should proceed to voting when finished', async () => {
		dummySessionManager.session.rounds[1].read = { order: ['Group 0'], index: -1 };
		const { mockCookies, mockRequest, mockParams, mockUpdate } = await setupMocks('P1', {}, REFS.ROUND);
		await next(mockCookies, mockParams, mockRequest);
		// First press shows the only card (index 0)...
		expect(mockUpdate).toHaveBeenCalledWith({
			read: { order: ['Group 0'], index: 0 },
		});
		// Simulate that the DB update is now reflected in session state.
		dummySessionManager.session.rounds[1].read.index = 0;
		// ...second press finishes into voting.
		await next(mockCookies, mockParams, mockRequest);
		expect(mockUpdate).toHaveBeenLastCalledWith({
			state: ROUND_STATES.VOTE,
		});
	});

	it('should allow skipping directly to voting', async () => {
		const { mockCookies, mockRequest, mockParams, mockUpdate } = await setupMocks('P1', {}, REFS.ROUND);
		await skip(mockCookies, mockParams, mockRequest);
		expect(mockUpdate).toHaveBeenCalledWith({
			state: ROUND_STATES.VOTE,
		});
	});
});


