<script>
	/**
	 * @typedef {import("$lib/types").Session} Session
	 * @typedef {import("$lib/types").PlayerState} PlayerState
	 * @typedef {import("$lib/types").ClientType} ClientType
	 */

	import { page } from '$app/stores';
	import { CLIENT_TYPES, DB, FIREBASE, PLAYER_STATES, SESSION_STATES, USERNAME } from '$lib/constants';
	import { sessionData } from '$lib/store';
	import { child, getDatabase, onValue, ref } from 'firebase/database';
	import { getContext, onMount, setContext } from 'svelte';
	import Empty from '../../components/states/Empty.svelte';
	import Game from '../../components/states/Game.svelte';
	import Host from '../../components/states/Host.svelte';
	import Kicked from '../../components/states/Kicked.svelte';
	import Loading from '../../components/states/Loading.svelte';
	import Lobby from '../../components/states/Lobby.svelte';
	import Outsider from '../../components/states/Outsider.svelte';
	import Spectator from '../../components/states/Spectator.svelte';
	import Summary from '../../components/states/Summary.svelte';

	/** @type {import('./$types').PageData} */
	export let data;

	const sessionRef = child(ref(getDatabase(getContext(FIREBASE)), DB), $page.params.sessionId);
	sessionData.set(data.session);
	setContext(USERNAME, data.username);
	onMount(async () => {
		onValue(sessionRef, (snapshot) => {
			sessionData.set(snapshot.val());
		});
	});

	$: sessionState = $sessionData.state;
	$: playerState = resolvePlayerState($sessionData, data.username);
	$: clientType = resolveClientType($sessionData, data.username);
	$: isHostView = clientType === CLIENT_TYPES.HOST;

	/**
	 * Resolve client type
	 * @param {Session} session - session data
	 * @param {string} username - username
	 * @returns {ClientType} - client type
	 */
	function resolveClientType(session, username) {
		// Check explicit client type first
		const clientTypes = session?.clientTypes ?? {};
		if (clientTypes[username]) {
			return clientTypes[username];
		}
		
		// Backward compatibility: if creator is in scoreboard, treat as player
		// Otherwise, if creator, treat as host
		if (session?.creator === username) {
			// Check if creator is in scoreboard (old sessions)
			const inScoreboard = Object.keys(session?.scoreboard ?? {}).includes(username);
			return inScoreboard ? CLIENT_TYPES.PLAYER : CLIENT_TYPES.HOST;
		}
		
		// Check if in spectators
		if (Object.keys(session?.spectators ?? {}).includes(username)) {
			return CLIENT_TYPES.SPECTATOR;
		}
		
		// Check if in scoreboard (player)
		if (Object.keys(session?.scoreboard ?? {}).includes(username)) {
			return CLIENT_TYPES.PLAYER;
		}
		
		// Default to player for backward compatibility
		return CLIENT_TYPES.PLAYER;
	}

	/**
	 * Resolve player state
	 * @param {Session} session - session data
	 * @param {string} username - username
	 * @returns {PlayerState} - player state
	 */
	function resolvePlayerState(session, username) {
		const playerWasKicked = Object.keys(session?.kicked ?? {}).includes(username);
		const playerInSession = Object.keys(session?.scoreboard ?? {}).includes(username);
		const isSpectator = Object.keys(session?.spectators ?? {}).includes(username);
		const isHost = session?.creator === username && !playerInSession;
		
		return playerWasKicked
			? PLAYER_STATES.KICKED
			: !playerInSession && !isSpectator && !isHost
				? PLAYER_STATES.OUTSIDER
				: PLAYER_STATES.READY;
	}
</script>

{#if playerState === PLAYER_STATES.LOADING || sessionState === SESSION_STATES.LOADING}
	<Loading />
{:else if playerState === PLAYER_STATES.KICKED}
	<Kicked />
{:else if playerState === PLAYER_STATES.OUTSIDER}
	<Outsider />
{:else if clientType === CLIENT_TYPES.HOST}
	<!-- Host view -->
	<Host />
{:else if clientType === CLIENT_TYPES.SPECTATOR}
	<!-- Spectator view -->
	<Spectator />
{:else if sessionState === SESSION_STATES.INITIATED}
	<!-- Player lobby view -->
	<Lobby />
{:else if sessionState === SESSION_STATES.STARTED}
	<!-- Player game view -->
	<Game />
{:else if sessionState === SESSION_STATES.FINISHED}
	<!-- Player summary view -->
	<Summary />
{:else}
	<Empty />
{/if}
