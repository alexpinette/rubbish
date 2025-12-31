<script>
	import { SESSION_STATES } from '$lib/constants';
	import { session } from '$lib/store';
	import HostLobby from './HostLobby.svelte';
	import HostGame from './HostGame.svelte';
	import Summary from './Summary.svelte';
	import Loading from './Loading.svelte';

	const { state } = session;
</script>

{#if $state === SESSION_STATES.LOADING}
	<Loading />
{:else if $state === SESSION_STATES.INITIATED}
	<!-- Host Lobby - TV Display Screen -->
	<HostLobby />
{:else if $state === SESSION_STATES.STARTED}
	<!-- Host Game View - Shows public game state -->
	<HostGame />
{:else if $state === SESSION_STATES.FINISHED}
	<!-- Summary View -->
	<Summary />
{/if}


