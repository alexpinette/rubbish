<script>
	import config from '$lib/config';
	import { ROUND_STATES, USERNAME } from '$lib/constants';
	import { round, session } from '$lib/store';
	import { toTitleCase } from '$lib/utils';
	import { getModalStore } from '@skeletonlabs/skeleton';
	import { getContext } from 'svelte';
	import Guess from '../round/Guess.svelte';
	import Group from '../round/Group.svelte';
	import Mark from '../round/Mark.svelte';
	import Select from '../round/Select.svelte';
	import Tally from '../round/Tally.svelte';
	import Vote from '../round/Vote.svelte';

	const { players, limit, host, data } = session;
	const { dasher, number, state } = round;
	const modalStore = getModalStore();
	const user = getContext(USERNAME);
	const removePlayer = () => modalStore.trigger({ type: 'component', component: 'kick' });
	
	// Check if user is host or spectator
	$: isHost = $host === user && !Object.keys($data.scoreboard ?? {}).includes(user);
	$: isSpectator = Object.keys($data.spectators ?? {}).includes(user);
	$: isPlayer = !isHost && !isSpectator;
	$: isDasher = $dasher === user;
	$: visibleStates = Object.keys(ROUND_STATES).filter((s) => s !== ROUND_STATES.UNKNOWN && s !== ROUND_STATES.LOADING);
	
	import Reveal from '../round/Reveal.svelte';
	
	const stateToComponent = {
		[ROUND_STATES.SELECT]: Select,
		[ROUND_STATES.GUESS]: Guess,
		[ROUND_STATES.MARK]: Mark,
		[ROUND_STATES.GROUP]: Group,
		[ROUND_STATES.VOTE]: Vote,
		[ROUND_STATES.REVEAL]: Reveal,
		[ROUND_STATES.TALLY]: Tally,
	};
</script>

<div>
	<!-- Round/Stage Info - Only for Host/Spectator -->
	{#if isHost || isSpectator}
		<h1 class="h1 text-center mb-5">Round {$number} of {$limit}</h1>
	<div class="flex justify-between items-center text-xs max-w-xs sm:max-w-lg mx-auto mb-5">
		{#each visibleStates as possibleState, index}
			<span class:highlighted={possibleState === $state}>
				{toTitleCase(possibleState)}
			</span>
			{#if index < visibleStates.length - 1}
				<span class="text-secondary-500">&rsaquo;</span>
			{/if}
		{/each}
	</div>
		{#if state !== undefined}
			<h2 class="h2 text-center py-5">Stage: {toTitleCase($state)}</h2>
		{/if}
	{/if}
	
	<!-- Content -->
	<svelte:component this={stateToComponent[$state]} />
	
	<!-- Bottom -->
	<div class="flex flex-col items-center justify-center">
		{#if isPlayer && !isDasher}
			<div class="italic text-sm mb-5">
				Playing as {user}
			</div>
			{#if $players.length > config.minPlayersRequired}
				<button class="btn btn-sm variant-ringed mb-5" type="button" on:click={removePlayer}>
					Remove player
				</button>
			{/if}
		{:else if isDasher}
			<div class="role-chip py-1 px-2 my-5 rounded-lg">
				You are the dasher
			</div>
		{:else if isHost || isSpectator}
			<div class="role-chip py-1 px-2 my-5 rounded-lg">
				{$dasher} is the dasher
			</div>
		{/if}
	</div>
</div>

<!-- eslint-disable -->
<style>
	.highlighted {
		@apply text-primary-400 font-bold;
	}
	
	.role-chip {
		@apply bg-surface-800 text-surface-50 dark:bg-surface-50 dark:text-surface-800 py-2 px-4 rounded-lg;
	}
</style>
