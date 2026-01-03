<script>
	import { round, session } from '$lib/store';
	import { TRUE_RESPONSE, USERNAME } from '$lib/constants';
	import { getContext } from 'svelte';
	import { enhance } from '$app/forms';
	import Prompter from '../parts/Prompter.svelte';

	const { data } = session;
	const { dasher, guesses, response, read } = round;
	const user = getContext(USERNAME);

	$: isDasher = $dasher === user && $dasher !== 'UNKNOWN';
	$: order = Array.isArray($read?.order) ? $read.order : [];
	$: index = Number($read?.index ?? -1);
	$: started = index >= 0;
	$: finished = order.length > 0 && index >= order.length - 1;
	$: currentGroup = started && order.length > 0 ? order[index] : '';

	/**
	 * Rebuild the grouped vote options (same structure Vote.svelte uses)
	 * so the readout matches exactly what players will vote on.
	 */
	$: incorrectGuesses = Object.fromEntries(Object.entries($guesses ?? {}).filter(([_, g]) => !g.correct));
	$: groupedGuesses = Object.keys(incorrectGuesses).reduce((acc, key) => {
		const { group, response: r } = incorrectGuesses[key];
		if (!acc[group]) acc[group] = { response: r };
		return acc;
	}, /** @type {Record<string, {response: string}>} */ ({}));
	// IMPORTANT: build this without mutating the groupedGuesses object so Svelte reactivity works reliably.
	$: groupedGuessesWithTrue = { ...groupedGuesses, [TRUE_RESPONSE]: { response: $response } };

	$: cardText = currentGroup ? groupedGuessesWithTrue[currentGroup]?.response ?? '' : '';
	// Use a reactive label (not a function call) so Svelte updates the UI reliably on index changes.
	$: stepLabel = !started ? `0 of ${order.length}` : `${index + 1} of ${order.length}`;
</script>

<div class="readout-container">
	<h2 class="h2 text-center mb-4">Readout</h2>

	{#if isDasher}
		<Prompter withInfo={false} />
		<p class="text-center text-sm italic mt-3">
			Read each answer out loud. Tap <strong>Next</strong> to advance.
		</p>

		<div class="progress-chip mt-4">
			Answer {stepLabel}
		</div>

		<div class="answer-card mt-5">
			<div class="answer-content">
				{#if !started}
					<p class="answer-text muted">Ready when you are…</p>
				{:else}
					<p class="answer-text">{cardText}</p>
				{/if}
			</div>
		</div>

		<div class="controls mt-6">
			<form action="?/read.next" method="POST" use:enhance class="w-full">
				<button class="btn variant-filled btn-lg rounded-lg w-full" type="submit">
					{#if !started}
						Start
					{:else if finished}
						Finish → Voting
					{:else}
						Next
					{/if}
				</button>
			</form>

			<form action="?/read.skip" method="POST" use:enhance class="w-full mt-3">
				<button class="btn variant-ringed btn-lg rounded-lg w-full" type="submit">
					Skip readout
				</button>
			</form>
		</div>
	{:else}
		<p class="text-center text-lg mt-6">
			Watch the TV while <strong>{$dasher}</strong> reads the answers…
		</p>
		<p class="text-center text-sm italic mt-2">
			Voting starts when they finish.
		</p>
	{/if}
</div>

<style>
	.readout-container {
		@apply max-w-2xl mx-auto text-center py-6;
	}

	.progress-chip {
		@apply inline-flex items-center justify-center px-4 py-2 rounded-lg bg-surface-200 dark:bg-surface-800 border border-surface-300 dark:border-surface-700;
		@apply text-surface-700 dark:text-surface-200 font-semibold;
	}

	/* Simple “answer card” visual language, inspired by RevealHost */
	.answer-card {
		@apply w-full border border-surface-300 dark:border-surface-700 rounded-xl bg-surface-50 dark:bg-surface-900;
		box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
		min-height: 180px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.answer-content {
		padding: 1.25rem;
		width: 100%;
	}

	.answer-text {
		font-size: 1.35rem;
		line-height: 1.35;
		font-style: italic;
		white-space: pre-wrap;
		word-break: break-word;
	}

	.answer-text.muted {
		@apply text-surface-500 dark:text-surface-400;
	}
</style>


