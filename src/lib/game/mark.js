/**
 * @typedef {import('$lib/types').SessionAction} SessionAction
 */

import { CORRECT, GUESSES, INTERRUPTION, ROUND_STATES, SESSION, STATE, TRUE_RESPONSE, USERNAME } from '$lib/constants';
import { generateAiGuesses, parseSessionRequest } from '$lib/game/helpers';
import { getRoundScores } from '$lib/score';
import { client } from '$lib/analytics.js';

/**
 * Shuffle array in-place (server-safe, no browser-only imports)
 * @template T
 * @param {T[]} array
 * @returns {T[]}
 */
function shuffleInPlace(array) {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
	return array;
}

/**
 * Build a readout payload from current round guesses (grouped keys + TRUE_RESPONSE)
 * @param {import('$lib/session').SessionManager} sm
 * @param {Object<string, any>} extraGuessesPayload - optional payload of additional guesses (e.g. AI guesses) keyed by `${GUESSES}/...`
 */
function buildReadPayload(sm, incorrectUsers = [], extraGuessesPayload = {}) {
	const guesses = sm.round.guesses ?? {};
	const incorrectGroups = incorrectUsers
		.map((u) => guesses?.[u])
		.filter(Boolean)
		.map((g) => String(g.group ?? '').trim())
		.filter(Boolean);

	// Include any extra guesses (e.g. AI) not yet present in round state
	const extraGroups = Object.values(extraGuessesPayload)
		.map((g) => String(g?.group ?? '').trim())
		.filter(Boolean);

	const uniqueGroups = [...new Set([...incorrectGroups, ...extraGroups])];
	const order = shuffleInPlace([...uniqueGroups, TRUE_RESPONSE]);
	return { read: { order, index: -1 } };
}

/**
 * Proceed after mark submission
 * @type {SessionAction}
 */
export async function proceed(cookies, params, request) {
	const { form, sm } = await parseSessionRequest(cookies, params, request);
	const user = String(cookies.get(USERNAME));
	
	// Only dasher (who is a player, not host) can mark guesses
	if (sm.round.dasher !== user) {
		throw new Error('Only the dasher can mark guesses');
	}
	
	const activeGuesses = sm.players.length - 1;
	const submissions = Array.from(form.entries()).filter(([key]) => key !== SESSION);
	const correctUsers = submissions.filter(([_, value]) => value === '1').map(([key]) => key);
	const correctPayload = correctUsers.reduce(
		(acc, user) => ({ ...acc, [`${sm.roundPath.current}/${GUESSES}/${user}/${CORRECT}`]: true }),
		{},
	);
	const fewerThanTwoIncorrectGuesses = correctUsers.length >= activeGuesses - 1;
	const allGuessedCorrectly = correctUsers.length === activeGuesses;
	const incorrectCount = submissions.length - correctUsers.length;
	const singleSubmission = submissions.length === 1;

	// If AIs are enabled, allow continuation with exactly 1 incorrect human guess by injecting AI guesses.
	const aiCount = Number(sm.session.ais ?? 0);
	const allowAiContinuation = aiCount > 0 && incorrectCount === 1 && !allGuessedCorrectly && !singleSubmission;
	const terminate = allGuessedCorrectly || singleSubmission || (fewerThanTwoIncorrectGuesses && !allowAiContinuation);

	const payload = terminate
		? getTerminationPayload(sm, correctUsers, correctPayload)
		: await getContinuationPayload(sm, correctPayload, incorrectCount);
	if (terminate)
		client.capture({
			event: 'interruption',
			properties: { stage: 'marking' },
		});
	await sm.sessionRef.update(payload);
}

/**
 * Get the termination payload
 * @param {SessionManager} sm - session manager
 * @param {string[]} correctUsers - list of correct users
 * @param {Object<string, any>} correctPayload - correct payload
 */
function getTerminationPayload(sm, correctUsers, correctPayload) {
	const interruptionReason = '1 or fewer incorrect guesses were submitted';
	const scores = getRoundScores(sm.round.dasher, {}, {}, correctUsers, sm.session.scoreboard);
	return {
		...correctPayload,
		scoreboard: scores,
		[`${sm.roundPath.current}/${STATE}`]: ROUND_STATES.TALLY,
		[`${sm.roundPath.current}/${INTERRUPTION}`]: interruptionReason,
	};
}

/**
 * Get continuation payload
 * @param {SessionManager} sm - session manager
 * @param {Object<string, any>} correctPayload - correct payload
 * @param {number} incorrectCount - number of incorrect guesses
 */
async function getContinuationPayload(sm, correctPayload, incorrectCount) {
	const roundPath = sm.roundPath.current;
	const aiCount = Number(sm.session.ais ?? 0);
	const aiGuesses = incorrectCount === 1 && aiCount > 0 ? generateAiGuesses(aiCount) : {};
	const nextState = incorrectCount === 1 ? ROUND_STATES.READ : ROUND_STATES.GROUP;

	// Infer which users are incorrect from the round snapshot + marking payload.
	// This ensures readout matches vote options (only incorrect answers + TRUE_RESPONSE + optional AIs).
	const incorrectUsers = Object.keys(sm.round.guesses ?? {}).filter((u) => {
		// Only consider non-dasher players that were part of the marking submission set.
		// If a user is not in correctPayload, they remain incorrect (in this transition).
		return u !== sm.round.dasher && !correctPayload[`${roundPath}/${GUESSES}/${u}/${CORRECT}`];
	});

	const readPayload = incorrectCount === 1 ? buildReadPayload(sm, incorrectUsers, aiGuesses) : {};

	// If we generated AIs, prefix their keys with the round path (mark updates sessionRef)
	const prefixedAi = Object.fromEntries(
		Object.entries(aiGuesses).map(([k, v]) => [`${roundPath}/${k}`, v]),
	);

	return {
		...correctPayload,
		...prefixedAi,
		...(readPayload.read ? { [`${roundPath}/read`]: readPayload.read } : {}),
		[`${roundPath}/${STATE}`]: nextState,
	};
}
