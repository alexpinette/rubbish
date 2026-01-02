<script>
	/**
	 * @typedef {import("$lib/types").Scoreboard} Scoreboard
	 */
	import { page } from '$app/stores';
	import { getContext, onMount } from 'svelte';
	import { session } from '$lib/store';
	const { scoreboard, data, limit } = session;
	import { SESSION_ID, USERNAME, CLIENT_TYPES } from '$lib/constants';
	import Score from '../parts/Score.svelte';
	import { Confetti } from 'svelte-confetti';
	import { returnHome } from '$lib/utils';
	import posthog from 'posthog-js';
	import Header from '../globals/Header.svelte';
	import PlayerName from '../parts/PlayerName.svelte';

	let user = getContext(USERNAME);
	let sessionId = $page.params.sessionId;

	// Check if this is a host/spectator view
	// Host is the creator who is not in the scoreboard, or has explicit HOST client type
	// When Summary is rendered from Host component, the creator is the host
	$: isHostView =
		$data?.clientTypes?.[user] === CLIENT_TYPES.HOST ||
		Object.keys($data?.spectators ?? {}).includes(user) ||
		($data?.creator === user && !Object.keys($data?.scoreboard ?? {}).includes(user));

	/**
	 * Get the highest scorers
	 * @param {Scoreboard} scores
	 */
	function getHighestScorers(scores) {
		let highestScore = -Infinity;
		/** @type {string[]} */ let highestScorers = [];
		for (const [username, score] of Object.entries(scores)) {
			if (score > highestScore) {
				highestScore = score;
				highestScorers = [username];
			} else if (score === highestScore) {
				highestScorers.push(username);
			}
		}
		return highestScorers;
	}
	const highestScorers = getHighestScorers($scoreboard);
	const winner = highestScorers.length === 1 ? highestScorers[0] : highestScorers.join(', ');

	onMount(() => {
		posthog.capture('game_completed');
	});
</script>

{#if isHostView}
	<!-- Host Summary Screen -->
	<div class="summary-host">
		<!-- Top Header Bar -->
		<div class="host-header-bar">
			<!-- Round Info - Top Left (shows final round) -->
			<div class="round-info">
				<span class="round-text">Round {$limit} of {$limit}</span>
			</div>

			<!-- Logo - Center -->
			<div class="header-logo">
				<Header />
			</div>

			<!-- Room Code - Top Right -->
			<div class="room-code-badge">
				<span class="room-code-label">Room Code</span>
				<span class="room-code-value">{sessionId}</span>
			</div>
		</div>

		<div class="winner-announcement">
			{#if highestScorers.length === 1}
				<h1 class="winner-title">
					The winner is <PlayerName
						player={highestScorers[0]}
						showBackground={false}
						showBorder={false}
					/>!
				</h1>
			{:else}
				<h1 class="winner-title">
					The winners are {#each highestScorers as player, i}
						<PlayerName {player} showBackground={false} showBorder={false} />{i <
						highestScorers.length - 1
							? ', '
							: ''}
					{/each}!
				</h1>
			{/if}
			<div class="confetti-container">
				<Confetti size={10} duration={5000} infinite={false} amount={100} />
			</div>
		</div>

		<div class="final-scores">
			<Score showCheatsheet={false} />
		</div>

		<div class="return-home-section">
			<button
				type="button"
				class="btn btn-lg variant-filled my-10"
				on:click={() => returnHome(USERNAME, SESSION_ID)}>Return home</button
			>
		</div>
	</div>
{:else}
	<!-- Player Summary Screen -->
	<div class="summary-player">
		<div class="thanks-message">
			<h1 class="thanks-title">Thanks for playing!</h1>
			<p class="thanks-subtitle">Check the screen for final scores</p>
		</div>
		<div class="return-home-section">
			<button
				type="button"
				class="btn btn-lg variant-filled my-10"
				on:click={() => returnHome(USERNAME, SESSION_ID)}>Return home</button
			>
		</div>
	</div>
{/if}

<style>
	/* Host Summary Styles - Full screen like other host views */
	:global(body:has(.summary-host)) {
		overflow: hidden;
		margin: 0;
		padding: 0;
	}

	:global(
			body:has(.summary-host)
				[data-sveltekit-preload-data]
				> div
				> :global(.app-shell)
				> :first-child:not(.summary-host *)
		),
	:global(
			body:has(.summary-host)
				[data-sveltekit-preload-data]
				> div
				> :global(.app-shell)
				> [slot='footer']
		),
	:global(body:has(.summary-host) header:not(.summary-host *)),
	:global(body:has(.summary-host) footer:not(.summary-host *)),
	:global(body:has(.summary-host) .logo-container:not(.summary-host .logo-container)) {
		display: none !important;
	}

	:global(body:has(.summary-host) .min-w-2xs),
	:global(body:has(.summary-host) .max-w-lg) {
		max-width: none !important;
		width: 100vw !important;
		padding: 0 !important;
		margin: 0 !important;
	}

	:global(body:has(.summary-host) [data-sveltekit-preload-data]) {
		max-width: none !important;
		width: 100vw !important;
	}

	.summary-host {
		width: 100vw;
		height: 100vh;
		@apply p-8;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-start;
		@apply bg-surface-50 dark:bg-surface-900;
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 1000;
		overflow: hidden;
		margin: 0;
		box-sizing: border-box;
		gap: 1.5rem;
		padding-top: 2rem; /* Extra space for fixed header */
		/* Lock to 16:9 aspect ratio for TV/monitor */
		aspect-ratio: 16 / 9;
		max-width: calc(100vh * 16 / 9);
		max-height: 100vh;
		margin-left: auto;
		margin-right: auto;
	}

	/* Top Header Bar - Fixed at top */
	.host-header-bar {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		width: 100%;
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		padding: 0.75rem 2rem;
		@apply bg-surface-50 dark:bg-surface-900;
		z-index: 10;
	}

	.round-info {
		@apply flex items-center;
		justify-self: start;
	}

	.header-logo {
		@apply flex items-center justify-center;
		justify-self: center;
	}

	.header-logo :global(.logo-container) {
		padding: 0.5rem 1rem;
		min-height: auto;
	}

	.header-logo :global(.roys-text) {
		font-size: 1.5rem;
		top: 0.75rem;
	}

	.header-logo :global(.rubbish-text) {
		font-size: 2.5rem;
	}

	.header-logo :global(.rubbish-r) {
		font-size: 1.5em;
	}

	.round-text {
		font-size: clamp(1rem, 2vh, 1.5rem);
		@apply font-semibold text-surface-700 dark:text-surface-300;
	}

	.room-code-badge {
		@apply flex flex-col items-end gap-1;
		padding: 0.5rem 1rem;
		@apply bg-primary-100 dark:bg-primary-900 rounded-lg border border-primary-300 dark:border-primary-700;
		box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.1);
		justify-self: end;
	}

	.room-code-label {
		font-size: clamp(0.625rem, 1vh, 0.75rem);
		@apply text-primary-600 dark:text-primary-400 font-medium;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.room-code-value {
		font-size: clamp(1.25rem, 2.5vh, 1.75rem);
		@apply font-bold text-primary-500 font-mono;
		letter-spacing: 0.15em;
	}

	.winner-announcement {
		flex-shrink: 0;
		@apply mb-2 w-full;
		max-width: 90vw;
		text-align: center;
	}

	.winner-title {
		font-size: clamp(1.75rem, 4vh, 3rem);
		@apply font-semibold mb-3;
		@apply text-primary-600 dark:text-primary-400;
	}

	.confetti-container {
		@apply flex justify-center items-center pt-2;
	}

	.final-scores {
		flex: 1;
		width: 100%;
		max-width: 90vw;
		text-align: center;
		@apply mb-2;
		display: flex;
		flex-direction: column;
		justify-content: flex-start;
		align-items: center;
		min-height: 0;
	}

	.final-scores :global(.tally-container) {
		@apply w-full;
		max-width: 100%;
	}

	.final-scores :global(.tally-columns) {
		grid-template-columns: 1fr; /* Single column for final scores */
	}

	.final-scores :global(.players-grid) {
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 2.5rem;
	}

	.return-home-section {
		flex-shrink: 0;
		@apply text-center w-full;
		@apply my-4;
	}

	/* Player Summary Styles */
	.summary-player {
		@apply w-full max-w-2xl mx-auto;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 70vh;
		padding: 3rem 1.5rem;
		gap: 2.5rem;
	}

	.thanks-message {
		@apply text-center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	.thanks-title {
		font-size: clamp(2rem, 5vh, 3rem);
		@apply font-bold text-primary-600 dark:text-primary-400;
		margin: 0;
		line-height: 1.2;
	}

	.thanks-subtitle {
		font-size: clamp(1.125rem, 2.5vh, 1.5rem);
		@apply text-surface-600 dark:text-surface-400;
		margin: 0;
		line-height: 1.5;
	}

	.summary-player .return-home-section {
		@apply mt-4;
	}
</style>
