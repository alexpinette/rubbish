<script>
	/**
	 * @typedef {import("$lib/types").Scoreboard} Scoreboard
	 */
	import { getContext, onMount } from 'svelte';
	import { session } from '$lib/store';
	const { scoreboard, data } = session;
	import { SESSION_ID, USERNAME, CLIENT_TYPES } from '$lib/constants';
	import Score from '../parts/Score.svelte';
	import { Confetti } from 'svelte-confetti';
	import { returnHome } from '$lib/utils';
	import posthog from 'posthog-js';
	import Header from '../globals/Header.svelte';

	let user = getContext(USERNAME);

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
	const highestScores = getHighestScorers($scoreboard).map((player) =>
		player === user ? `${player} (You)` : player,
	);
	const winner = highestScores.length === 1 ? highestScores[0] : highestScores.join(', ');

	onMount(() => {
		posthog.capture('game_completed');
	});
</script>

{#if isHostView}
	<!-- Host Summary Screen -->
	<div class="summary-host">
		<!-- Logo -->
		<div class="logo-section">
			<Header />
		</div>

		<div class="winner-announcement">
			{#if highestScores.length === 1}
				<h1 class="winner-title">The winner is {winner}!</h1>
			{:else}
				<h1 class="winner-title">The winners are {winner}!</h1>
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
		overflow-y: auto;
		margin: 0;
		box-sizing: border-box;
		gap: 1.5rem;
	}

	.logo-section {
		flex-shrink: 0;
		@apply mb-2 flex items-center justify-center;
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
