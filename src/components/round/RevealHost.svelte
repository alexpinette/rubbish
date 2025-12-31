<script>
	import { round, session } from '$lib/store';
	import { SESSION, CORRECT, DASHER, GUESSES, SCOREBOARD, VOTES, USERNAME } from '$lib/constants';
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { getContext } from 'svelte';
	import { getCategoryWords } from '$lib/utils';

	const { players, data, scoreboard, hostPlayer } = session;
	const { guesses, dasher, votes, response, category, prompt } = round;
	$: ({ prompt: promptLabel } = getCategoryWords($category));
	const user = getContext(USERNAME);

	// Check if current user is the host player (can control progression)
	$: isHostPlayer = $hostPlayer === user && $hostPlayer !== 'UNKNOWN';

	// Get all phony answers (incorrect guesses) with their authors and voters
	// Sort by vote count (least to most fooled) so most fooled appears last
	$: phonyAnswers = Object.entries($guesses)
		.filter(([player, guess]) => player !== $dasher && !guess.correct)
		.map(([player, guess]) => {
			// Find all players who voted for this answer's group
			const voters = Object.entries($votes)
				.filter(([_, group]) => group === guess.group)
				.map(([voter]) => voter);

			return {
				player,
				response: guess.response,
				double: guess.double,
				group: guess.group,
				voters,
				voteCount: voters.length,
			};
		})
		.sort((a, b) => a.voteCount - b.voteCount); // Sort least to most fooled

	// Get correct guessers for form data
	$: correctGuessers = Object.keys($guesses).filter((player) => $guesses[player].correct);

	// Convert guesses to the format needed for scoring
	$: guessSpecs = Object.entries($guesses)
		.filter(([player]) => player !== $dasher)
		.reduce((acc, [user, guess]) => {
			acc[user] = { group: guess.group, double: guess.double };
			return acc;
		}, {});

	let showingPlayers = true;
	let revealedAnswers = [];
	let showingRealAnswer = false;
	let currentRevealIndex = 0;
	let revealInterval;

	// Reveal flow: players -> phony answers -> real answer
	onMount(() => {
		// First show players for 2 seconds
		setTimeout(() => {
			showingPlayers = false;

			// Then start revealing phony answers one by one
			if (phonyAnswers.length > 0) {
				revealInterval = setInterval(() => {
					if (currentRevealIndex < phonyAnswers.length) {
						revealedAnswers = [...revealedAnswers, phonyAnswers[currentRevealIndex]];
						currentRevealIndex++;
					} else if (!showingRealAnswer) {
						// After all phony answers, show the real answer
						showingRealAnswer = true;
						clearInterval(revealInterval);
					}
				}, 3000); // 3 seconds per answer
			} else {
				// No phony answers, show real answer immediately
				showingRealAnswer = true;
			}
		}, 2000); // Show players for 2 seconds

		return () => {
			if (revealInterval) clearInterval(revealInterval);
		};
	});
</script>

<div class="reveal-host-container">
	<h2 class="h2 text-center mb-2">Revealing answers for...</h2>
	<div class="prompt-info">
		<p class="prompt-text">{$prompt}</p>
		<p class="category-text">Category: <span class="category-name">{$category}</span></p>
	</div>

	{#if showingPlayers}
		<div class="players-preview">
			<p class="text-lg mb-4">Players:</p>
			<div class="players-list">
				{#each $players.filter((p) => p !== $dasher) as player}
					<div class="player-preview-item">{player}</div>
				{/each}
			</div>
		</div>
	{:else}
		<div class="answers-grid">
			<!-- Show all revealed phony answers -->
			{#each revealedAnswers as answer, index}
				<div
					class="answer-card phony"
					class:no-votes={answer.voteCount === 0}
					class:few-votes={answer.voteCount === 1}
					class:many-votes={answer.voteCount >= 2}
					transition:fade={{ duration: 500 }}
				>
					<div class="answer-header">
						<span class="answer-label">Phony Answer</span>
						{#if answer.double}
							<span class="double-bluff-badge">Double Bluff</span>
						{/if}
					</div>
					<div class="answer-content">
						<p class="answer-text">{answer.response}</p>
					</div>
					<div class="answer-author">
						<span class="author-label">Submitted by:</span>
						<span class="author-name">{answer.player}</span>
						{#if answer.voters.length > 0}
							<div class="voters-section">
								<span class="voters-label">Fooled:</span>
								<span class="voters-list">{answer.voters.join(', ')}</span>
							</div>
						{/if}
					</div>
				</div>
			{/each}

			<!-- Show real answer at the end -->
			{#if showingRealAnswer}
				<div class="answer-card real" transition:fade={{ duration: 500 }}>
					<div class="answer-header">
						<span class="answer-label real-label">The Real Answer</span>
					</div>
					<div class="answer-content">
						<p class="answer-text real-text">{$response}</p>
					</div>
					<div class="answer-author">
						<span class="author-label">Selected by:</span>
						<span class="author-name">{$dasher} (Dasher)</span>
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Only host player can proceed -->
	{#if showingRealAnswer && (revealedAnswers.length > 0 || phonyAnswers.length === 0)}
		{#if isHostPlayer}
			<form action="?/reveal.proceed" method="POST" use:enhance class="mt-8">
				<input type="text" name={SESSION} value={JSON.stringify($data)} hidden />
				<input name={VOTES} value={JSON.stringify($votes)} type="text" hidden />
				<input name={GUESSES} value={JSON.stringify(guessSpecs)} type="text" hidden />
				<input name={CORRECT} value={JSON.stringify(correctGuessers)} type="text" hidden />
				<input name={SCOREBOARD} value={JSON.stringify($scoreboard)} type="text" hidden />
				<input name={DASHER} value={$dasher} type="text" hidden />
				<button class="btn variant-filled btn-lg rounded-lg w-full" type="submit">
					Continue to Tally
				</button>
			</form>
		{:else}
			<p class="text-center mt-8 text-lg">
				Waiting for {$hostPlayer} to continue...
			</p>
		{/if}
	{/if}
</div>

<style>
	.reveal-host-container {
		width: 100%;
		max-width: 90vw;
		@apply mx-auto text-center;
		padding: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		min-height: 0;
	}

	.reveal-host-container :global(h2) {
		font-size: clamp(1.5rem, 3.5vh, 2.5rem);
		@apply mb-2;
	}

	.prompt-info {
		@apply mb-4 text-center;
	}

	.prompt-text {
		font-size: clamp(1.25rem, 2.5vh, 1.75rem);
		@apply font-semibold text-primary-500 mb-2;
	}

	.category-text {
		font-size: clamp(1rem, 2vh, 1.25rem);
		@apply text-surface-600 dark:text-surface-400;
	}

	.category-name {
		@apply text-primary-400 font-semibold;
	}

	.players-preview {
		margin-bottom: 4vh;
		width: 100%;
	}

	.players-list {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 2vw;
	}

	.player-preview-item {
		font-size: clamp(1.25rem, 2.5vh, 1.75rem);
		@apply font-semibold bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-lg;
		padding: 1.5vh 3vw;
	}

	.answers-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1.5rem;
		margin-bottom: 2rem;
		width: 100%;
		max-width: 85vw;
		margin-left: auto;
		margin-right: auto;
	}

	.answer-card {
		@apply bg-surface-200 dark:bg-surface-800 rounded-lg border-2;
		padding: 1.5rem;
		min-height: auto;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		transition: all 0.3s ease;
	}

	.answer-card.phony {
		@apply border-primary-500;
	}

	.answer-card.phony.no-votes {
		@apply border-surface-400 bg-surface-100 dark:bg-surface-700;
	}

	.answer-card.phony.few-votes {
		@apply border-warning-400 bg-warning-50 dark:bg-warning-900/20;
		box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.1);
	}

	.answer-card.phony.many-votes {
		@apply border-success-500 bg-success-50 dark:bg-success-900/20;
		box-shadow:
			0 4px 6px -1px rgba(0, 0, 0, 0.1),
			0 2px 4px -1px rgba(0, 0, 0, 0.06);
	}

	.answer-card.real {
		@apply border-success-500 bg-success-50 dark:bg-success-900/20;
	}

	.answer-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		@apply mb-3;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.answer-label {
		font-size: clamp(0.875rem, 1.5vh, 1.125rem);
		@apply font-semibold text-primary-600 dark:text-primary-400;
	}

	.real-label {
		@apply text-success-600 dark:text-success-400;
	}

	.double-bluff-badge {
		font-size: clamp(0.75rem, 1.2vh, 0.875rem);
		@apply bg-warning-200 dark:bg-warning-800 text-warning-800 dark:text-warning-200 rounded;
		padding: 0.25rem 0.75rem;
	}

	.answer-content {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		@apply my-4 px-2;
		min-height: 4rem;
	}

	.answer-text {
		font-size: clamp(1.25rem, 2.5vh, 1.75rem);
		@apply font-semibold text-center text-surface-900 dark:text-surface-100;
		word-wrap: break-word;
		overflow-wrap: break-word;
		line-height: 1.5;
		max-width: 100%;
	}

	.real-text {
		@apply text-success-700 dark:text-success-300;
	}

	.answer-author {
		@apply mt-4 text-center;
	}

	.author-label {
		font-size: clamp(0.875rem, 1.5vh, 1rem);
		@apply text-surface-600 dark:text-surface-400 block mb-1;
	}

	.author-name {
		font-size: clamp(1rem, 2vh, 1.5rem);
		@apply font-bold text-primary-500;
	}

	.voters-section {
		@apply mt-3 pt-3 border-t border-surface-300 dark:border-surface-600;
	}

	.voters-label {
		font-size: clamp(0.875rem, 1.5vh, 1rem);
		@apply text-surface-600 dark:text-surface-400 block mb-1;
	}

	.voters-list {
		font-size: clamp(0.9rem, 1.8vh, 1.25rem);
		@apply font-semibold text-success-600 dark:text-success-400;
	}
</style>
