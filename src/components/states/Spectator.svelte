<script>
	import { SESSION_STATES } from '$lib/constants';
	import { session } from '$lib/store';
	import Host from './Host.svelte';
	import HostLobby from './HostLobby.svelte';
	import Summary from './Summary.svelte';
	import Loading from './Loading.svelte';

	const { state } = session;
</script>

<!-- Spectator mirrors Host view -->
{#if $state === SESSION_STATES.LOADING}
	<Loading />
{:else if $state === SESSION_STATES.INITIATED}
	<HostLobby />
{:else if $state === SESSION_STATES.STARTED}
	<Host />
{:else if $state === SESSION_STATES.FINISHED}
	<Summary />
{/if}



