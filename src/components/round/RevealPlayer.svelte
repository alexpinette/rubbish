<script>
	import { round } from '$lib/store';
	import { ROUND_STATES } from '$lib/constants';

	const { state } = round;
</script>

<div class="reveal-player-container">
	<h2 class="h2 text-center mb-5">Revealing Answers</h2>
	<p class="text-center text-lg">
		The answers are being revealed on the screen. Watch to see whose phony answers were whose!
	</p>
</div>

<style>
	.reveal-player-container {
		@apply max-w-2xl mx-auto text-center py-8;
	}
</style>

