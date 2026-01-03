<script>
	import { page } from '$app/stores';
	import { round, session } from '$lib/store';
	import { ROUND_STATES } from '$lib/constants';
	import { toTitleCase } from '$lib/utils';
	import Prompter from '../parts/Prompter.svelte';
	import Score from '../parts/Score.svelte';
	import RevealHost from '../round/RevealHost.svelte';
	import ReadHost from '../round/ReadHost.svelte';
	import { getCategoryWords } from '$lib/utils';
	import { faCheckCircle, faClock } from '@fortawesome/free-solid-svg-icons';
	import Fa from 'svelte-fa';
	import { onMount } from 'svelte';
	import Header from '../globals/Header.svelte';
	import PlayerName from '../parts/PlayerName.svelte';

	const { players, limit } = session;
	const { dasher, number, state, prompt, category, guesses, votes, time } = round;
	let sessionId = $page.params.sessionId;
	
	$: ({ prompt: promptLabel, response: responseLabel } = getCategoryWords($category));
	$: guessingPlayers = $players.length - 1; // Exclude dasher
	$: submittedPlayers = Object.keys($guesses);
	$: votedPlayers = Object.keys($votes);
	$: waitingForGuesses = $players.filter(p => p !== $dasher && !submittedPlayers.includes(p));
	$: waitingForVotes = $players.filter(p => p !== $dasher && !votedPlayers.includes(p) && !Object.keys($guesses).filter(player => $guesses[player].correct).includes(p));
	$: visibleStates = Object.keys(ROUND_STATES).filter((s) => s !== ROUND_STATES.UNKNOWN && s !== ROUND_STATES.LOADING);

	// Host layout compaction for large lobbies (up to 12 players)
	$: isLargeLobby = $players.length >= 10;
	// 3 columns for large lobbies, 2 for mid-size, 1 for small
	$: statusListCols = $players.length >= 10 ? 3 : $players.length >= 7 ? 2 : 1;
	
	// Timer calculation for host view
	let hostSeconds = 0;
	let timerInterval;
	
	$: allGuessesSubmitted = Object.keys($guesses).length >= guessingPlayers;
	
	$: {
		if ($time && $state === ROUND_STATES.GUESS && !allGuessesSubmitted) {
			hostSeconds = Math.max(0, Math.round(($time - new Date().getTime()) / 1000));
		} else {
			hostSeconds = 0;
		}
	}
	
	$: {
		// Clear existing interval when state changes or all guesses submitted
		if (timerInterval) {
			clearInterval(timerInterval);
			timerInterval = null;
		}
		
		// Start new interval if in GUESS state and not all guesses submitted
		if ($state === ROUND_STATES.GUESS && $time && !allGuessesSubmitted) {
			timerInterval = setInterval(() => {
				if ($time && $state === ROUND_STATES.GUESS && !allGuessesSubmitted) {
					hostSeconds = Math.max(0, Math.round(($time - new Date().getTime()) / 1000));
				} else {
					if (timerInterval) {
						clearInterval(timerInterval);
						timerInterval = null;
					}
				}
			}, 1000);
		}
	}
	
	onMount(() => {
		return () => {
			if (timerInterval) clearInterval(timerInterval);
		};
	});
</script>

<!-- Host Game: Public display screen showing game state everyone can see -->
<div class="host-game" class:compact={isLargeLobby} style="--status-list-cols: {statusListCols};">
	<!-- Top Header Bar -->
	<div class="host-header-bar">
		<!-- Round Info - Top Left -->
		<div class="round-info">
			<span class="round-text">Round {$number} of {$limit}</span>
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

	<!-- Stage Navigation -->
	<div class="logo-nav-section">
		<div class="stage-navigation">
			{#each visibleStates as possibleState, index}
				<span class:highlighted={possibleState === $state}>
					{toTitleCase(possibleState)}
				</span>
				{#if index < visibleStates.length - 1}
					<span class="text-secondary-500">&rsaquo;</span>
				{/if}
			{/each}
		</div>
	</div>

	<!-- Public Game Content -->
	<div class="game-content">
		{#if $state === ROUND_STATES.SELECT}
			<Prompter withInfo={true} isHostView={true} />
			<div class="status-message">
				<PlayerName player={$dasher} showBackground={false} showBorder={false} /> is selecting a {promptLabel}...
			</div>
		{:else if $state === ROUND_STATES.GUESS}
			<Prompter withInfo={true} isHostView={true} />
			<div class="stats-container">
				<div class="timer-info">
					<div class="timer-label">Time Remaining</div>
					<div class="timer-count">
						{hostSeconds}
					</div>
				</div>
				<div class="progress-info">
					<div class="progress-label">Guesses Submitted</div>
					<div class="progress-count">
						{Object.keys($guesses).length} / {guessingPlayers}
					</div>
				</div>
			</div>
			<div class="player-status-list">
				<div class="status-section">
					<h3 class="status-title">Submitted</h3>
					<ul class="status-list">
						{#each submittedPlayers as player}
							<li class="status-item submitted">
								<Fa icon={faCheckCircle} />
								<PlayerName {player} showBackground={false} showBorder={false} />
							</li>
						{/each}
					</ul>
				</div>
				{#if waitingForGuesses.length > 0}
					<div class="status-section">
						<h3 class="status-title">Waiting</h3>
						<ul class="status-list">
							{#each waitingForGuesses as player}
								<li class="status-item waiting">
									<Fa icon={faClock} />
									<PlayerName {player} showBackground={false} showBorder={false} />
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			</div>
		{:else if $state === ROUND_STATES.MARK}
			<Prompter withInfo={true} isHostView={true} />
			<div class="status-message">
				<PlayerName player={$dasher} showBackground={false} showBorder={false} /> is marking correct guesses...
			</div>
		{:else if $state === ROUND_STATES.GROUP}
			<Prompter withInfo={true} isHostView={true} />
			<div class="status-message">
				<PlayerName player={$dasher} showBackground={false} showBorder={false} /> is grouping similar guesses...
			</div>
		{:else if $state === ROUND_STATES.READ}
			<ReadHost />
		{:else if $state === ROUND_STATES.VOTE}
			<Prompter withInfo={false} isHostView={true} />
			<div class="progress-info vote-info">
				<div class="progress-label">Votes Cast</div>
				<div class="progress-count">
					{Object.keys($votes).length} / {guessingPlayers}
				</div>
			</div>
			<div class="player-status-list">
				<div class="status-section">
					<h3 class="status-title">Voted</h3>
					<ul class="status-list">
						{#each votedPlayers as player}
							<li class="status-item submitted">
								<Fa icon={faCheckCircle} />
								<PlayerName {player} showBackground={false} showBorder={false} />
							</li>
						{/each}
					</ul>
				</div>
				{#if waitingForVotes.length > 0}
					<div class="status-section">
						<h3 class="status-title">Waiting</h3>
						<ul class="status-list">
							{#each waitingForVotes as player}
								<li class="status-item waiting">
									<Fa icon={faClock} />
									<PlayerName {player} showBackground={false} showBorder={false} />
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			</div>
		{:else if $state === ROUND_STATES.REVEAL}
			<RevealHost />
		{:else if $state === ROUND_STATES.TALLY}
			<Score showCheatsheet={true} />
		{/if}
	</div>

	<!-- Current Dasher Info -->
	<div class="flex flex-col items-center justify-center">
		<div class="role-chip py-1 px-2 my-5 rounded-lg">
			<PlayerName player={$dasher} showBackground={false} showBorder={false} /> is the dasher
		</div>
	</div>
</div>

<style>
	/* Host screen: Full-screen display, hide header/footer */
	:global(body:has(.host-game)) {
		overflow: hidden;
		margin: 0;
		padding: 0;
	}

	/* Hide layout header/footer when host game is active */
	:global(body:has(.host-game) [data-sveltekit-preload-data] > div > :global(.app-shell) > :first-child:not(.host-game *)),
	:global(body:has(.host-game) [data-sveltekit-preload-data] > div > :global(.app-shell) > [slot="footer"]),
	:global(body:has(.host-game) header:not(.host-game *)),
	:global(body:has(.host-game) footer:not(.host-game *)),
	:global(body:has(.host-game) .logo-container:not(.host-game .logo-container)) {
		display: none !important;
	}

	:global(body:has(.host-game) .min-w-2xs),
	:global(body:has(.host-game) .max-w-lg) {
		max-width: none !important;
		width: 100vw !important;
		padding: 0 !important;
		margin: 0 !important;
	}

	:global(body:has(.host-game) [data-sveltekit-preload-data]) {
		max-width: none !important;
		width: 100vw !important;
	}

	.host-game {
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

	.logo-nav-section {
		flex-shrink: 0;
		@apply w-full flex flex-col items-center justify-center;
		margin-top: 4.5rem; /* Space for fixed header */
		margin-bottom: 1rem;
	}

	.stage-navigation {
		@apply flex justify-between items-center mx-auto;
		font-size: clamp(0.75rem, 1.2vw, 1rem);
		max-width: 80vw;
		gap: 1vw;
		padding: 0.5rem 1rem;
		@apply bg-surface-100 dark:bg-surface-800 rounded-lg;
	}

	.stage-navigation .highlighted {
		@apply text-primary-500 font-bold;
	}

	.game-content {
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

	.game-content :global(.prompter-box) {
		@apply mb-6;
		width: 100%;
		max-width: 900px;
	}

	.status-message {
		font-size: clamp(1.25rem, 2.5vh, 1.75rem);
		@apply mt-6 text-surface-700 dark:text-surface-300 font-medium;
	}

	.stats-container {
		@apply mt-6 mx-auto flex flex-wrap justify-center gap-6;
		max-width: 800px;
		width: 100%;
	}

	.progress-info {
		@apply py-6 px-8 rounded-lg bg-surface-200 dark:bg-surface-800 border border-surface-300 dark:border-surface-700;
		flex: 1;
		min-width: 250px;
		max-width: 350px;
		box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.1);
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
	}

	.progress-info.vote-info {
		flex: 0 0 auto;
		width: auto;
		min-width: auto;
		max-width: 300px;
		margin-left: auto;
		margin-right: auto;
	}

	.progress-label {
		font-size: clamp(0.875rem, 1.8vh, 1.125rem);
		@apply font-semibold mb-3 text-surface-600 dark:text-surface-400;
	}

	.progress-count {
		font-size: clamp(1.75rem, 4vh, 2.5rem);
		@apply font-bold text-primary-500;
	}

	.timer-info {
		@apply py-6 px-8 rounded-lg bg-surface-200 dark:bg-surface-800 border border-surface-300 dark:border-surface-700 text-center;
		flex: 1;
		min-width: 250px;
		max-width: 350px;
		box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.1);
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
	}

	.timer-label {
		font-size: clamp(0.875rem, 1.5vh, 1rem);
		@apply text-surface-600 dark:text-surface-400 mb-3 font-medium;
	}

	.timer-count {
		font-size: clamp(2.5rem, 5vh, 4rem);
		@apply font-normal text-surface-900 dark:text-surface-100;
		font-family: 'Quicksand', sans-serif;
		letter-spacing: -0.02em;
		line-height: 1.1;
	}

	.role-chip {
		flex-shrink: 0;
		@apply bg-surface-800 text-surface-50 dark:bg-surface-50 dark:text-surface-800 py-2 px-5 my-4 rounded-lg font-medium;
		font-size: clamp(0.875rem, 1.8vh, 1.125rem);
		box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.1);
	}

	.player-status-list {
		@apply mt-6 mx-auto;
		max-width: 900px;
		width: 100%;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
		gap: 1.25rem;
		/* Prevent overflow on the locked 16:9 host screen */
		flex: 1;
		min-height: 0;
		overflow: hidden;
		align-content: start;
		/* Center sections when there’s only one (e.g. everyone voted/submitted) */
		justify-items: center;
	}

	.status-section {
		@apply mb-4;
		min-width: 0;
		width: 100%;
		max-width: 900px;
	}

	.status-title {
		font-size: clamp(0.875rem, 1.8vh, 1.125rem);
		@apply font-semibold text-surface-700 dark:text-surface-300 mb-3;
		text-align: center;
	}

	.status-list {
		display: grid;
		/* Smaller min so 3 columns comfortably fit on 16:9 */
		grid-template-columns: repeat(var(--status-list-cols, 1), minmax(8rem, 1fr));
		gap: 0.5rem;
		/* Center the grid content within the section */
		justify-content: center;
	}

	.status-item {
		@apply flex items-center gap-2 py-2.5 px-4 rounded-lg font-medium;
		font-size: clamp(0.875rem, 1.8vh, 1.125rem);
		box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
		min-width: 0;
	}

	/* Compact host mode (10–12 players): tighten vertical spacing so lists never clip */
	.host-game.compact .game-content :global(.prompter-box) {
		margin-bottom: 1rem;
	}
	.host-game.compact .stats-container {
		margin-top: 1rem;
		gap: 1rem;
	}
	.host-game.compact .player-status-list {
		margin-top: 1rem;
		gap: 1rem;
	}
	.host-game.compact .status-item {
		padding: 0.4rem 0.7rem;
		font-size: clamp(0.8rem, 1.5vh, 1rem);
	}

	.status-item.submitted {
		@apply bg-success-100 dark:bg-success-900 text-success-800 dark:text-success-200;
	}

	.status-item.waiting {
		@apply bg-warning-100 dark:bg-warning-900 text-warning-800 dark:text-warning-200;
	}
</style>

