<script>
	import { page } from '$app/stores';
	import config from '$lib/config';
	import { session } from '$lib/store';
	import Header from '../globals/Header.svelte';
	import PlayerName from '../parts/PlayerName.svelte';

	const { players, host, limit, categories } = session;
	let sessionId = $page.params.sessionId;
</script>

	<!-- Host Lobby: Public display screen showing room code and player list -->
<div class="host-lobby">
	<!-- Top Header Bar (empty for lobby) -->
	<div class="host-header-bar"></div>

	<!-- Logo -->
	<div class="logo-nav-section">
		<div class="logo-section">
			<Header />
		</div>
	</div>

	<!-- Room Code - Prominently displayed for players to see -->
	<div class="room-code-section">
		<h2 class="section-title">Room Code</h2>
		<div class="room-code-box">
			<div class="room-code">{sessionId}</div>
			<p class="room-code-instructions">Players: Go to rubbish and enter this code</p>
		</div>
	</div>

	<!-- Game Details -->
	<div class="game-details-section">
		<h2 class="section-title">Game Details</h2>
		<div class="details-grid">
			<div class="detail-card">
				<div class="detail-label">Rounds</div>
				<div class="detail-value">{$limit}</div>
			</div>
			<div class="detail-card">
				<div class="detail-label">Categories</div>
				<div class="detail-value">{$categories.join(', ')}</div>
			</div>
		</div>
	</div>

	<!-- Player List - Public information -->
	<div class="players-section">
		<h2 class="section-title">Players ({$players.length})</h2>
		<div class="players-container">
			{#if $players.length === 0}
				<div class="no-players">Waiting for players to join...</div>
			{:else}
				<div class="players-list">
					{#each $players as player}
						<div class="player-item">
							<PlayerName {player} />
						</div>
					{/each}
				</div>
			{/if}
		</div>
		<div class="player-status">
			{#if $players.length < config.minPlayersRequired}
				{@const playersNeeded = config.minPlayersRequired - $players.length}
				<span class="status-warning">
					{playersNeeded} more player{playersNeeded === 1 ? '' : 's'} needed to start
				</span>
			{:else}
				<span class="status-ready">Ready to start</span>
			{/if}
		</div>
	</div>
</div>

<style>
	/* Host screen: Full-screen display, hide header/footer */
	:global(body:has(.host-lobby)) {
		overflow: hidden;
		margin: 0;
		padding: 0;
	}

	/* Hide layout header/footer when host lobby is active */
	:global(body:has(.host-lobby) [data-sveltekit-preload-data] > div > :global(.app-shell) > :first-child:not(.host-lobby *)),
	:global(body:has(.host-lobby) [data-sveltekit-preload-data] > div > :global(.app-shell) > [slot="footer"]),
	:global(body:has(.host-lobby) header:not(.host-lobby *)),
	:global(body:has(.host-lobby) footer:not(.host-lobby *)),
	:global(body:has(.host-lobby) .logo-container:not(.host-lobby .logo-container)) {
		display: none !important;
	}

	:global(body:has(.host-lobby) .min-w-2xs),
	:global(body:has(.host-lobby) .max-w-lg) {
		max-width: none !important;
		width: 100vw !important;
		padding: 0 !important;
		margin: 0 !important;
	}

	:global(body:has(.host-lobby) [data-sveltekit-preload-data]) {
		max-width: none !important;
		width: 100vw !important;
	}

	.host-lobby {
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
		gap: 1.5rem; /* Reduced gap for tighter spacing */
		padding-top: 0.5rem; /* Less space since header is empty */
		/* Lock to 16:9 aspect ratio for TV/monitor */
		aspect-ratio: 16 / 9;
		max-width: calc(100vh * 16 / 9);
		max-height: 100vh;
		margin-left: auto;
		margin-right: auto;
	}

	/* Top Header Bar - Fixed at top (empty for lobby) */
	.host-header-bar {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		width: 100%;
		height: 0;
		z-index: 10;
	}

	.logo-nav-section {
		flex-shrink: 0;
		@apply w-full flex flex-col items-center justify-center;
		margin-top: 1rem; /* Less space since header is empty */
		margin-bottom: 0.5rem;
	}

	.logo-section {
		flex-shrink: 0;
		@apply mb-2 flex items-center justify-center;
	}

	.section-title {
		font-size: clamp(1.25rem, 2.5vh, 1.75rem);
		@apply font-semibold text-surface-700 dark:text-surface-300 mb-3;
		text-align: center;
	}

	.room-code-section {
		@apply w-full text-center;
		max-width: 600px;
	}

	.room-code-box {
		@apply bg-surface-100 dark:bg-surface-800 border-2 border-primary-400 rounded-lg p-8;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
	}

	.room-code {
		font-size: clamp(2.5rem, 6vw, 4rem);
		@apply font-bold text-primary-500 mb-3;
		font-family: monospace;
		letter-spacing: 0.2em;
		line-height: 1.2;
	}

	.room-code-instructions {
		font-size: clamp(0.875rem, 1.8vh, 1.125rem);
		@apply text-surface-600 dark:text-surface-400;
	}

	.game-details-section {
		@apply w-full text-center;
		max-width: 600px;
	}

	.details-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		@apply gap-4;
	}

	.detail-card {
		@apply bg-surface-200 dark:bg-surface-800 border border-surface-300 dark:border-surface-700 rounded-lg p-5;
		text-align: left;
	}

	.detail-label {
		font-size: clamp(0.875rem, 1.5vh, 1rem);
		@apply text-surface-600 dark:text-surface-400 mb-2 font-semibold;
	}

	.detail-value {
		font-size: clamp(1rem, 2vh, 1.25rem);
		@apply text-primary-500 font-semibold;
	}

	.players-section {
		@apply w-full text-center;
		max-width: 600px;
	}

	.players-container {
		@apply mb-4;
	}

	.players-list {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		@apply gap-3;
	}

	.player-item {
		font-size: clamp(1rem, 2vh, 1.25rem);
		@apply py-3 px-4 bg-surface-200 dark:bg-surface-800 border border-surface-300 dark:border-surface-700 rounded-lg font-medium;
	}

	.no-players {
		@apply text-surface-500 dark:text-surface-400 italic py-6;
		font-size: clamp(1rem, 2vh, 1.125rem);
	}

	.player-status {
		font-size: clamp(1rem, 2vh, 1.25rem);
		@apply font-semibold mt-2;
	}

	.status-warning {
		@apply text-warning-600 dark:text-warning-400;
	}

	.status-ready {
		@apply text-success-600 dark:text-success-400;
	}
</style>

