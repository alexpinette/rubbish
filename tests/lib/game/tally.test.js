import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { createParseSessionRequestMock, setupMocks } from '../../support/mocks.js';
import { REFS, ROUND_STATES, SESSION_STATES } from '$lib/constants.js';
import { proceed } from '$lib/game/tally';
import { dummySessionManager } from '../../support/data.js';

beforeAll(async () => {
	createParseSessionRequestMock();
});

describe('tally stage', () => {
	beforeEach(() => {
		// Reset shared dummy session mutations from other tests
		dummySessionManager.session.ais = 0;
		dummySessionManager.session.current = 1;
		dummySessionManager.session.limit = 4;
	});

	it('should continue to the next round', async () => {
		const { mockCookies, mockRequest, mockParams, mockUpdate } = await setupMocks(
			'P1',
			{},
			REFS.SESSION,
		);
		await proceed(mockCookies, mockParams, mockRequest);
		expect(mockUpdate).toHaveBeenCalledWith({
			current: { '.sv': { increment: 1 } },
			'rounds/2': {
				category: expect.anything(),
				custom: false,
				dasher: expect.anything(),
				guesses: [],
				prompt: expect.anything(),
				response: expect.anything(),
				state: ROUND_STATES.SELECT,
				timer: expect.anything(),
			},
		});
	});
	it('should end the game', async () => {
		// End game when current === limit, while keeping a valid current round in dummy data.
		dummySessionManager.session.limit = dummySessionManager.session.current;
		const { mockCookies, mockRequest, mockParams, mockUpdate } = await setupMocks(
			'P1',
			{},
			REFS.SESSION,
		);
		await proceed(mockCookies, mockParams, mockRequest);
		expect(mockUpdate).toHaveBeenCalledWith({
			state: SESSION_STATES.FINISHED,
		});
	});
});
