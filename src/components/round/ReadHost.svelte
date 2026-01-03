<script>
	import { round, session } from '$lib/store';
	import { TRUE_RESPONSE } from '$lib/constants';

	const { data } = session;
	const { prompt, category, guesses, response, read, dasher } = round;

	$: order = Array.isArray($read?.order) ? $read.order : [];
	$: index = Number($read?.index ?? -1);
	$: started = index >= 0;
	$: currentGroup = started && order.length > 0 ? order[index] : '';

	$: incorrectGuesses = Object.fromEntries(Object.entries($guesses ?? {}).filter(([_, g]) => !g.correct));
	$: groupedGuesses = Object.keys(incorrectGuesses).reduce((acc, key) => {
		const { group, response: r } = incorrectGuesses[key];
		if (!acc[group]) acc[group] = { response: r };
		return acc;
	}, /** @type {Record<string, {response: string}>} */ ({}));
	// IMPORTANT: build this without mutating the groupedGuesses object so Svelte reactivity works reliably.
	$: groupedGuessesWithTrue = { ...groupedGuesses, [TRUE_RESPONSE]: { response: $response } };
	$: cardText = currentGroup ? groupedGuessesWithTrue[currentGroup]?.response ?? '' : '';

	$: progressLabel =
		order.length === 0 ? '—' : started ? `${index + 1} / ${order.length}` : `0 / ${order.length}`;
</script>

<!--
	ReadHost is rendered inside HostGame, which already provides:
	- round info (top-left)
	- stage navigation (breadcrumb)
	- room code (top-right)
	- dasher chip (bottom)

	So this component should be CONTENT-ONLY to avoid covering HostGame chrome.
-->
<div class="read-host-content">
	<div class="read-meta">
		<p class="meta-top">{$dasher} is reading the answers…</p>
		<p class="meta-sub prompt-highlight">“{$prompt}”</p>
		<p class="meta-sub small">Category: {$category}</p>
	</div>

	<div class="card-wrap">
		<div class="progress-pill">Answer {progressLabel}</div>
		<div class="answer-card">
			<div class="answer-content">
				{#if !started}
					<p class="answer-text muted">Get ready…</p>
				{:else}
					<p class="answer-text">{cardText}</p>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	.read-host-content {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 0;
		gap: 1.25rem;
	}

	.read-meta {
		text-align: center;
		@apply text-surface-700 dark:text-surface-200;
	}

	.meta-top {
		font-size: clamp(1rem, 2vh, 1.5rem);
		@apply font-semibold;
	}

	.meta-sub {
		font-size: clamp(1rem, 2.3vh, 1.75rem);
		@apply mt-2;
		max-width: 900px;
	}

	/* Make the prompt stand out (Jackbox-y) */
	.prompt-highlight {
		@apply inline-block px-4 py-2 rounded-xl;
		@apply bg-primary-100 dark:bg-primary-900/40;
		@apply text-primary-800 dark:text-primary-200;
		@apply border border-primary-300 dark:border-primary-700;
		box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
	}

	.meta-sub.small {
		font-size: clamp(0.875rem, 1.6vh, 1.125rem);
		@apply text-surface-600 dark:text-surface-400;
	}

	.card-wrap {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		min-height: 0;
		padding: 0 1rem;
	}

	.progress-pill {
		@apply inline-flex items-center justify-center px-5 py-2 rounded-lg bg-surface-100 dark:bg-surface-800 border border-surface-300 dark:border-surface-700;
		font-size: clamp(0.875rem, 1.6vh, 1.125rem);
		@apply font-semibold;
	}

	.answer-card {
		width: min(100%, 1100px);
		@apply border border-surface-300 dark:border-surface-700 rounded-2xl bg-surface-50 dark:bg-surface-900;
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
		min-height: clamp(220px, 35vh, 420px);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.answer-content {
		padding: 2rem;
		width: 100%;
	}

	.answer-text {
		font-size: clamp(1.25rem, 3.2vh, 2.4rem);
		line-height: 1.25;
		font-style: italic;
		white-space: pre-wrap;
		word-break: break-word;
		text-align: center;
	}

	.answer-text.muted {
		@apply text-surface-500 dark:text-surface-400;
	}
</style>


