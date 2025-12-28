<script>
	import { goto } from '$app/navigation';
	/** @type {import('./$types').PageData} */
	export let data;
</script>

<div class="flex flex-col items-center justify-center mx-auto">
	<!-- Top -->
	<div class="py-5 text-center">
		<h2 class="h2 py-2">Rubbish</h2>
		<p class="text-sm text-surface-600 dark:text-surface-400 italic mt-2">
			Based on the classic Balderdash board game
		</p>
	</div>
	<!-- Buttons -->
	<div class="flex flex-col items-center justify-center space-y-5 p-10">
		<h1 class="h1">Menu</h1>
		<button
			name="start-game"
			type="button"
			class="variant-filled action-button"
			on:click={() => goto('/new')}>Start Game</button
		>
		<button
			name="new-game"
			type="button"
			class="variant-filled action-button"
			on:click={() => goto('/join')}>Join Game</button
		>
		{#if data.activeSessionId !== ''}
			<button
				name="resume-game"
				type="button"
				class="variant-filled action-button"
				on:click={() => goto(`/${data.activeSessionId}`)}>Resume Game</button
			>
		{/if}
	</div>
	<!-- Description -->
	<p class="my-5 text-center max-w-lg px-5 mx-auto">
		The iconic party game of bluffing and trivia! Based on the classic Balderdash board game, 
		guess or craft clever definitions for a mix of obscure words, people, and more! 
		Perfect for 4-8 players seeking a fun, brain-teasing challenge!
	</p>
</div>

<style>
	.action-button {
		@apply btn-xl rounded-lg w-full;
	}
</style>
