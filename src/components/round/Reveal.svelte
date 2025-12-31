<script>
	import { round, session } from '$lib/store';
	import { ROUND_STATES, SESSION, CORRECT, DASHER, GUESSES, SCOREBOARD, VOTES, USERNAME } from '$lib/constants';
	import { getContext } from 'svelte';
	import { enhance } from '$app/forms';

	const { state } = round;
	const { data, scoreboard, hostPlayer } = session;
	const { guesses, dasher, votes, response } = round;
	const user = getContext(USERNAME);
	
	// Check if current user is the host player (can control progression)
	$: isHostPlayer = $hostPlayer === user && $hostPlayer !== 'UNKNOWN';
	
	// Get correct guessers for form data
	$: correctGuessers = Object.keys($guesses).filter((player) => $guesses[player].correct);
	
	// Convert guesses to the format needed for scoring
	$: guessSpecs = Object.entries($guesses)
		.filter(([player]) => player !== $dasher)
		.reduce((acc, [user, guess]) => {
			acc[user] = { group: guess.group, double: guess.double };
			return acc;
		}, {});
</script>

<div class="reveal-container">
	<h2 class="h2 text-center mb-5">Revealing Answers</h2>
	<p class="text-center text-lg mb-8">
		The answers are being revealed on the screen. Watch to see whose phony answers were whose!
	</p>
	
	<!-- Only host player can proceed -->
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
		<p class="text-center text-lg">
			Waiting for {$hostPlayer} to continue...
		</p>
	{/if}
</div>

<style>
	.reveal-container {
		@apply max-w-2xl mx-auto text-center py-8;
	}
</style>

