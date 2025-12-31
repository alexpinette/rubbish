<script>
	/**
	 * @typedef {import("$lib/types").Scoreboard} Scoreboard
	 */

	import { getContext } from 'svelte';
	import { SESSION, USERNAME, CLIENT_TYPES } from '$lib/constants';
	import { round, session } from '$lib/store';
	const { dasher, interruption } = round;
	const { data } = session;
	import Score from '../parts/Score.svelte';

	let user = getContext(USERNAME);
	$: userIsDasher = $dasher === user;

	// Check if this is a host/spectator view (scores should only show on host)
	$: isHostView =
		session.data?.clientTypes?.[user] === CLIENT_TYPES.HOST ||
		Object.keys(session.data?.spectators ?? {}).includes(user);
</script>

{#if $interruption}
	<p class="text-center font-bold text-primary-500">
		This round was interrupted: {$interruption}
	</p>
{/if}

{#if isHostView}
	<Score showCheatsheet={true} />
{:else}
	<p class="text-center pt-5">Check the screen for scores</p>
{/if}

{#if userIsDasher}
	<form action="?/tally.continue" method="POST">
		<input type="text" name={SESSION} value={JSON.stringify($data)} hidden />
		<button class="mt-5 btn variant-filled btn-lg rounded-lg w-full" type="submit">Continue</button>
	</form>
{:else if !isHostView}
	<p class="text-center pt-5">Wait for the dasher to continue</p>
{/if}
