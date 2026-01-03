<script>
	/**
	 * @typedef {import("$lib/types").Scoreboard} Scoreboard
	 */
	import { session } from '$lib/store';
	import { SESSION_STATES } from '$lib/constants';
	import { SCORE } from '$lib/score';
	import PlayerName from './PlayerName.svelte';
	import { onMount } from 'svelte';
	
	export let showCheatsheet = false;
	// Host-fit sizing without showing the cheatsheet (used on the final host summary screen)
	export let hostFit = false;
	
	const { scoreboard, state } = session;
	$: isGameFinished = $state === SESSION_STATES.FINISHED;
	$: isHostFit = hostFit || showCheatsheet;

	// ---------------------------------------------------------------------------
	// Host-fit layout (no scroll, locked 16:9 host screens)
	// Activates when showCheatsheet OR hostFit is true.
	// ---------------------------------------------------------------------------
	let /** @type {HTMLDivElement | null} */ scoreboardSectionEl = null;
	let /** @type {HTMLHeadingElement | null} */ scoreboardTitleEl = null;

	let scoreboardAvailH = 0;

	$: playerCount = Object.keys($scoreboard ?? {}).length;
	$: hostScoreCols = playerCount >= 10 ? 4 : playerCount >= 7 ? 3 : 2;
	$: hostScoreRows = Math.max(1, Math.ceil(playerCount / hostScoreCols));

	const HOST_GRID_GAP_Y = 12; // px
	$: hostCardH = isHostFit
		? Math.max(
				110,
				Math.floor((scoreboardAvailH - (hostScoreRows - 1) * HOST_GRID_GAP_Y) / hostScoreRows),
			)
		: 0;

	// Scale some typography/padding based on card height
	$: hostCardPadY = Math.max(10, Math.min(18, Math.floor(hostCardH * 0.14)));
	$: hostScoreFontPx = Math.max(22, Math.min(44, Math.floor(hostCardH * 0.42)));
	$: hostNameFontPx = Math.max(12, Math.min(18, Math.floor(hostCardH * 0.16)));
	$: hostRankFontPx = Math.max(11, Math.min(14, Math.floor(hostCardH * 0.12)));

	onMount(() => {
		if (!isHostFit) return;

		let /** @type {ResizeObserver | null} */ ro = null;
		if (typeof ResizeObserver !== 'undefined') {
			ro = new ResizeObserver(() => {
				if (scoreboardSectionEl && scoreboardTitleEl) {
					const sectionH = scoreboardSectionEl.getBoundingClientRect().height;
					const titleH = scoreboardTitleEl.getBoundingClientRect().height;
					// Small padding buffer to avoid zoom rounding cutoffs
					scoreboardAvailH = Math.max(0, Math.floor(sectionH - titleH - 16));
				}
			});
			if (scoreboardSectionEl) ro.observe(scoreboardSectionEl);
		}

		// Initial compute (in case RO doesn't fire immediately)
		setTimeout(() => {
			if (scoreboardSectionEl && scoreboardTitleEl) {
				const sectionH = scoreboardSectionEl.getBoundingClientRect().height;
				const titleH = scoreboardTitleEl.getBoundingClientRect().height;
				scoreboardAvailH = Math.max(0, Math.floor(sectionH - titleH - 16));
			}
		}, 0);

		return () => {
			if (ro) ro.disconnect();
		};
	});

	/**
	 * Sorts the scores of players in descending order
	 * @param {Scoreboard} scores
	 */
	function sortScores(scores) {
		return Object.entries(scores).sort(([, a], [, b]) => b - a);
	}

	/**
	 * Calculate the rank for a player at a given index
	 * Accounts for ties - players with the same score get the same rank
	 * @param {Array<[string, number]>} sortedScores - sorted array of [player, score] tuples
	 * @param {number} index - current index
	 * @returns {number} - the rank (1-based)
	 */
	function getRank(sortedScores, index) {
		if (index === 0) return 1;
		const currentScore = sortedScores[index][1];
		const previousScore = sortedScores[index - 1][1];
		// If tied with previous player, use their rank
		if (currentScore === previousScore) {
			return getRank(sortedScores, index - 1);
		}
		// Otherwise, rank is index + 1
		return index + 1;
	}

</script>

<div
	class="tally-container"
	class:hostfit={isHostFit}
	class:hasCheatsheet={showCheatsheet}
	style="
		--host-score-cols: {hostScoreCols};
		--host-score-gap-y: {HOST_GRID_GAP_Y}px;
		--host-card-h: {hostCardH}px;
		--host-card-pad-y: {hostCardPadY}px;
		--host-score-font: {hostScoreFontPx}px;
		--host-name-font: {hostNameFontPx}px;
		--host-rank-font: {hostRankFontPx}px;
	"
>
	<div class="tally-columns">
		<div class="scoreboard-section" bind:this={scoreboardSectionEl}>
			<h3 class="section-title" bind:this={scoreboardTitleEl}>
				{showCheatsheet ? 'Current Scores' : 'Final Scores'}
			</h3>
			<div class="players-grid">
				{#each sortScores($scoreboard) as [player, score], index}
					{@const sortedScores = sortScores($scoreboard)}
					{@const rank = getRank(sortedScores, index)}
					{@const isLeader = rank === 1 && score > 0 && isGameFinished}
					{@const isTied = index > 0 && sortedScores[index - 1][1] === score}
					<div class="player-card" class:leader={isLeader}>
						<div class="player-rank">
							{#if isTied}
								T-{rank}
							{:else}
								#{rank}
							{/if}
						</div>
						<div class="player-info">
							<div class="player-name">
								<PlayerName {player} showBackground={false} showBorder={false} />
							</div>
							<div class="player-score">{score}</div>
						</div>
					</div>
			{/each}
			</div>
		</div>

		{#if showCheatsheet}
			<div class="cheatsheet-section">
				<h3 class="section-title">Scoring Rules</h3>
				<div class="rules-container">
					<div class="rule-item">
						<div class="rule-points">+{SCORE.DASHER.UNGUESSED}</div>
						<div class="rule-text">Dasher if no one guesses correctly</div>
					</div>
					<div class="rule-item">
						<div class="rule-points">+{SCORE.CORRECT_GUESS}</div>
						<div class="rule-text">Correct answer submitted</div>
					</div>
					<div class="rule-item">
						<div class="rule-points">+{SCORE.CORRECT_VOTE}</div>
						<div class="rule-text">Voted for correct answer</div>
					</div>
					<div class="rule-item">
						<div class="rule-points">+{SCORE.VOTE_RECEIVED}</div>
						<div class="rule-text">Per vote on your phony answer</div>
					</div>
					<div class="rule-item">
						<div class="rule-points">+{SCORE.DB.POSITIVE}</div>
						<div class="rule-text">Per vote for Double Bluff</div>
					</div>
					<div class="rule-item">
						<div class="rule-points">{SCORE.DB.NEGATIVE}</div>
						<div class="rule-text">Double Bluff with 0 votes</div>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.tally-container {
		@apply w-full max-w-7xl mx-auto;
	}

	/* Host-fit mode: fill parent (HostGame is locked 16:9 + overflow hidden) */
	.tally-container.hostfit {
		height: 100%;
		max-height: 100%;
	}

	.tally-columns {
		display: grid;
		grid-template-columns: 2fr 1fr;
		gap: 3rem;
		align-items: start;
	}

	/* If there is no cheatsheet column, use the full width for scores */
	.tally-container:not(.hasCheatsheet) .tally-columns {
		grid-template-columns: 1fr;
	}

	.tally-container.hostfit .tally-columns {
		height: 100%;
		max-height: 100%;
		min-height: 0;
		gap: 1.25rem;
		align-items: stretch;
	}

	@media (max-width: 1024px) {
		.tally-columns {
			grid-template-columns: 1fr;
			gap: 2rem;
		}
	}

	.scoreboard-section,
	.cheatsheet-section {
		@apply w-full;
	}

	.tally-container.hostfit .scoreboard-section,
	.tally-container.hostfit .cheatsheet-section {
		display: flex;
		flex-direction: column;
		min-height: 0;
		overflow: hidden;
	}

	.section-title {
		@apply text-center mb-6 font-bold;
		font-size: clamp(1.5rem, 3vh, 2rem);
		@apply text-surface-700 dark:text-surface-300;
	}

	.scoreboard-section .section-title {
		font-size: clamp(1.75rem, 3.5vh, 2.5rem);
		@apply mb-8;
	}

	.tally-container.hostfit .section-title {
		margin-bottom: 0.75rem;
		font-size: clamp(1.1rem, 2.4vh, 1.6rem);
	}

	.players-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 2.5rem;
		width: 100%;
	}

	.tally-container.hostfit .players-grid {
		flex: 1;
		min-height: 0;
		width: 100%;
		grid-template-columns: repeat(var(--host-score-cols, 3), minmax(0, 1fr));
		grid-auto-rows: var(--host-card-h, 140px);
		gap: var(--host-score-gap-y, 12px) 12px;
		overflow: hidden;
		/* Center nicely when there are fewer rows; still works for many players */
		align-content: center;
		justify-content: center;
	}

	.player-card {
		@apply bg-surface-100 dark:bg-surface-800 border-2 border-surface-300 dark:border-surface-700 rounded-lg;
		position: relative;
		transition: all 0.3s ease;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		padding: 2rem 1.5rem;
	}

	.tally-container.hostfit .player-card {
		height: var(--host-card-h, 140px);
		padding: var(--host-card-pad-y, 14px) 12px;
		overflow: hidden;
	}

	.player-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.15);
	}

	.player-card.leader {
		@apply border-primary-500 bg-primary-50 dark:bg-primary-900/20;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.15), 0 2px 4px -1px rgba(0, 0, 0, 0.1);
	}

	.player-rank {
		@apply text-surface-500 dark:text-surface-400 font-bold;
		font-size: clamp(0.875rem, 1.5vh, 1rem);
		margin-bottom: 1rem;
	}

	.tally-container.hostfit .player-rank {
		font-size: var(--host-rank-font, 12px);
		margin-bottom: 6px;
	}

	.player-info {
		@apply flex-1 flex flex-col justify-center;
		width: 100%;
		gap: 1.5rem;
	}

	.tally-container.hostfit .player-info {
		gap: 8px;
	}

	.player-name {
		@apply font-semibold;
		font-size: clamp(1.125rem, 2.5vh, 1.5rem);
		@apply text-surface-900 dark:text-surface-100;
	}

	.tally-container.hostfit .player-name {
		font-size: var(--host-name-font, 14px);
	}

	.player-score {
		@apply font-bold text-primary-500;
		font-size: clamp(2.5rem, 5vh, 4rem);
		line-height: 1.1;
	}

	.tally-container.hostfit .player-score {
		font-size: var(--host-score-font, 34px);
		line-height: 1;
	}

	.player-card.leader .player-score {
		@apply text-primary-600 dark:text-primary-400;
	}

	.leader-badge {
		position: absolute;
		top: -10px;
		right: -10px;
		font-size: 1.5rem;
		background: white;
		border-radius: 50%;
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
	}

	.rules-container {
		@apply bg-surface-100 dark:bg-surface-800 border-2 border-surface-300 dark:border-surface-700 rounded-lg p-6;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
		width: 100%;
	}


	.rule-item {
		@apply flex flex-col items-start py-3 px-4 rounded-lg;
		@apply bg-surface-50 dark:bg-surface-900 mb-3;
		border-left: 4px solid transparent;
		transition: all 0.2s ease;
		gap: 0.5rem;
	}


	.rule-item:last-child {
		@apply mb-0;
	}

	.rule-item:hover {
		@apply bg-surface-200 dark:bg-surface-800;
	}

	.rule-points {
		@apply font-bold text-primary-500;
		font-size: clamp(1.5rem, 2.5vh, 1.75rem);
		line-height: 1.2;
	}


	.rule-text {
		@apply text-surface-700 dark:text-surface-300 font-medium;
		font-size: clamp(0.875rem, 1.8vh, 1rem);
		line-height: 1.5;
	}

</style>
