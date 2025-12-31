/**
 * @typedef {import("$lib/types").Session} Session
 * @typedef {import("$lib/types").Round} Round
 */

import { CLIENT_TYPES, INITIAL_SESSION_STATE } from '$lib/constants';
import { derived, writable } from 'svelte/store';

export const sessionData = writable(INITIAL_SESSION_STATE);
const currentRound = derived(
	sessionData,
	/** @param {Session} $data */
	($data) => $data.rounds[$data.current],
);

export const session = {
	data: derived(
		sessionData,
		/** @param {Session} $data */
		($data) => $data,
	),
	state: derived(
		sessionData,
		/** @param {Session} $data */
		($data) => $data.state,
	),
	host: derived(
		sessionData,
		/** @param {Session} $data */
		($data) => $data.creator,
	),
	players: derived(
		sessionData,
		/** @param {Session} $data */
		($data) => {
			const scoreboardPlayers = Object.keys($data.scoreboard ?? {});
			const clientTypes = $data.clientTypes ?? {};
			// Filter out display-only HOST client types from players list
			return scoreboardPlayers.filter((player) => clientTypes[player] !== CLIENT_TYPES.HOST);
		},
	),
	scoreboard: derived(
		sessionData,
		/** @param {Session} $data */
		($data) => $data.scoreboard,
	),
	limit: derived(
		sessionData,
		/** @param {Session} $data */
		($data) => $data.limit,
	),
	categories: derived(
		sessionData,
		/** @param {Session} $data */
		($data) => $data.categories,
	),
	kicked: derived(
		sessionData,
		/** @param {Session} $data */
		($data) => $data.kicked,
	),
	hostPlayer: derived(
		sessionData,
		/** @param {Session} $data */
		($data) => $data.hostPlayer,
	),
};

export const round = {
	number: derived(
		sessionData,
		/** @param {Session} $data */
		($data) => $data.current,
	),
	state: derived(
		currentRound,
		/** @param {Round} $round */
		($round) => $round.state,
	),
	dasher: derived(
		currentRound,
		/** @param {Round} $round */
		($round) => $round.dasher,
	),
	category: derived(
		currentRound,
		/** @param {Round} $round */
		($round) => $round.category,
	),
	prompt: derived(
		currentRound,
		/** @param {Round} $round */
		($round) => $round.prompt,
	),
	response: derived(
		currentRound,
		/** @param {Round} $round */
		($round) => $round.response,
	),
	custom: derived(
		currentRound,
		/** @param {Round} $round */
		($round) => $round.custom,
	),
	guesses: derived(
		currentRound,
		/** @param {Round} $round */
		($round) => $round?.guesses ?? {},
	),
	votes: derived(
		currentRound,
		/** @param {Round} $round */
		($round) => $round?.votes ?? {},
	),
	time: derived(
		currentRound,
		/** @param {Round} $round */
		($round) => $round.time,
	),
	interruption: derived(
		currentRound,
		/** @param {Round} $round */
		($round) => $round.interruption ?? '',
	),
};
