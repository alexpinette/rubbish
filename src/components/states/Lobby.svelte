<script>
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import config from '$lib/config';
	import { SESSION, USERNAME } from '$lib/constants';
	import { session } from '$lib/store';
	import { getButtonVariant } from '$lib/utils';
	import { faCheckCircle, faCircleExclamation } from '@fortawesome/free-solid-svg-icons';
	import { getContext } from 'svelte';
	import Fa from 'svelte-fa';
	import posthog from 'posthog-js';

	const { players, data, hostPlayer } = session;

	$: isButtonDisabled = $players.length < config.minPlayersRequired;
	$: buttonVariant = getButtonVariant(isButtonDisabled);
	$: isFirstPlayer = $hostPlayer === username && $hostPlayer !== 'UNKNOWN';

	let sessionId = $page.params.sessionId;
	let username = getContext(USERNAME);
</script>

<div class="text-center">
	<h1 class="h1 mb-6">Lobby</h1>
	<div class="lobby-card">
		<div class="room-code-section">
			<span class="session-detail">Room Code: </span>
			<span class="room-code-value">{sessionId}</span>
		</div>
		<div class="divider" />
		<h2 class="h2 mb-4">Players</h2>
		<ul class="players-list">
			{#each $players as player}
				<li class="player-list-item">
					<Fa icon={faCheckCircle} class="player-icon" />
					<span class="player-name">{player === username ? `${player} (you)` : player}</span>
				</li>
			{/each}
		</ul>
	</div>
	{#if isButtonDisabled && isFirstPlayer}
		<span class="inline-flex small-gap gap-x-1 items-center justify-center w-full mt-2">
			<span class="txt-lg"><Fa icon={faCircleExclamation} /></span>
			<span>At least {config.minPlayersRequired} are needed to begin</span>
		</span>
	{/if}
	<div class="mt-5">
		{#if isFirstPlayer}
			<form
				action="?/lobby.launch"
				method="POST"
				use:enhance={({ update }) => {
					posthog.capture('game_started');
					// Wait a bit for Firebase to update, then let SvelteKit handle the update
					return async ({ result, update: updateFn }) => {
						// Wait for Firebase listener to pick up the state change
						await new Promise(resolve => setTimeout(resolve, 500));
						await updateFn();
					};
				}}
			>
				<input type="text" name={SESSION} value={JSON.stringify($data)} hidden />
				<button
					name="start-game"
					type="submit"
					class="{buttonVariant} text-2xl button-xl rounded-lg w-full p-3 mb-2"
					disabled={isButtonDisabled}
					>Start Game
				</button>
			</form>
		{:else if $hostPlayer && $hostPlayer !== 'UNKNOWN'}
			<p class="text-tertiary-700 pb-5">Waiting for {$hostPlayer} to start the game...</p>
		{:else}
			<p class="text-tertiary-700 pb-5">Waiting for players to join...</p>
		{/if}
	</div>
</div>

<style>
	.lobby-card {
		@apply bg-surface-100 dark:bg-surface-800 border-2 border-surface-300 dark:border-surface-700 rounded-lg p-6 mb-5;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
	}

	.room-code-section {
		@apply mb-5;
	}

	.session-detail {
		@apply font-semibold text-primary-400 text-lg;
	}

	.room-code-value {
		@apply text-xl font-mono font-bold text-primary-500;
		letter-spacing: 0.1em;
	}

	.divider {
		@apply border-t border-primary-400 my-5;
	}

	.players-list {
		@apply space-y-2;
	}

	.player-list-item {
		@apply inline-flex gap-x-2 w-full items-center justify-start;
	}

	.player-icon {
		@apply text-success-600 dark:text-success-400 text-lg;
	}

	.player-name {
		@apply text-xl font-medium;
	}
</style>
