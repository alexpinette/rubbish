<script>
	/**
	 * @typedef {import("$lib/types").Scoreboard} Scoreboard
	 */
	import { session } from '$lib/store';
	import { SESSION_STATES } from '$lib/constants';
	import { SCORE } from '$lib/score';
	
	export let showCheatsheet = false;
	
	const { scoreboard, state } = session;
	$: isGameFinished = $state === SESSION_STATES.FINISHED;

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

<div class="tally-container">
	<div class="tally-columns">
		<div class="scoreboard-section">
			<h3 class="section-title">{showCheatsheet ? 'Current Scores' : 'Final Scores'}</h3>
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
							<div class="player-name">{player}</div>
							<div class="player-score">{score}</div>
						</div>
						{#if isLeader}
							<div class="leader-badge">🏆</div>
						{/if}
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

	.tally-columns {
		display: grid;
		grid-template-columns: 2fr 1fr;
		gap: 3rem;
		align-items: start;
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

	.section-title {
		@apply text-center mb-6 font-bold;
		font-size: clamp(1.5rem, 3vh, 2rem);
		@apply text-surface-700 dark:text-surface-300;
	}

	.scoreboard-section .section-title {
		font-size: clamp(1.75rem, 3.5vh, 2.5rem);
		@apply mb-8;
	}

	.players-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 2.5rem;
		width: 100%;
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

	.player-info {
		@apply flex-1 flex flex-col justify-center;
		width: 100%;
		gap: 1.5rem;
	}

	.player-name {
		@apply font-semibold;
		font-size: clamp(1.125rem, 2.5vh, 1.5rem);
		@apply text-surface-900 dark:text-surface-100;
	}

	.player-score {
		@apply font-bold text-primary-500;
		font-size: clamp(2.5rem, 5vh, 4rem);
		line-height: 1.1;
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
