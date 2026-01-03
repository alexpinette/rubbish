<script>
	/**
	 * @typedef {import('@fortawesome/free-solid-svg-icons').IconDefinition} IconDefinition
	 * @typedef {Object.<string, {icon: IconDefinition, color: string, label: string}>} PlayerInfo
	 */
	import config from '$lib/config';
	import { DOUBLE_BLUFF, GUESS, SESSION, USERNAME } from '$lib/constants';
	import { session, round } from '$lib/store';
	import { getButtonVariant } from '$lib/utils';
	import { normalizeGuess } from '$lib/guessNormalize';
	import { enhance } from '$app/forms';
	import {
		faCheckCircle,
		faXmark,
		faCircleExclamation,
		faHourglassHalf,
	} from '@fortawesome/free-solid-svg-icons';
	import { SlideToggle } from '@skeletonlabs/skeleton';
	import { getContext, onMount } from 'svelte';
	import Fa from 'svelte-fa';
	import Prompter from '../parts/Prompter.svelte';
	import { getCategoryWords } from '$lib/utils';

	const { players, data } = session;
	const { dasher, guesses, time, category } = round;
	$: ({ prompt, response } = getCategoryWords($category));
	const user = getContext(USERNAME);
	let seconds = Math.round(($time - new Date().getTime()) / 1000);
	let guess = '';
	let /** @type {HTMLFormElement} */ form;
	let doubleBluff = false;
	let lastNormalized = '';
	let lastOriginal = '';
	let lastChanged = false;
	$: submitButtonIsDisabled = guess.length < config.customPrompt.minResponseLength;
	$: buttonVariant = getButtonVariant(submitButtonIsDisabled);
	$: isDasher = $dasher === user;
	$: submittedGuess = $guesses[user]?.response ?? '';
	$: normalizedPreview = normalizeGuess(guess, config.customPrompt.maxResponseLength);
	$: willChange = guess.trim().length > 0 && normalizedPreview !== guess.trim();
	$: guessing = $players.length - Object.keys($guesses).length - 1;
	$: guessers = $players
		.filter((player) => player !== $dasher)
		.reduce((acc, player) => {
			const guessed = player in $guesses;
			acc[player] = {
				icon: guessed ? faCheckCircle : seconds > 0 ? faHourglassHalf : faXmark,
				color: guessed ? 'text-success-800' : seconds > 0 ? 'text-warning-800' : 'text-error-800',
				label: player === user ? `${player} (you)` : player,
			};
			return acc;
		}, /** @type {PlayerInfo} */ ({}));
	$: submitted = Object.keys($guesses).includes(user);
	$: message = isDasher
		? 'Wait for guesser submissions...'
		: `Guess the ${response} of the ${prompt} shown on the screen`;
	onMount(() => setInterval(() => seconds--, 1000));

	function enhanceGuessSubmit() {
		// Snapshot local values at submit-time (in case user edits quickly)
		const pendingOriginal = guess;
		const pendingNormalized = normalizedPreview;
		return async ({ result }) => {
			if (result.type === 'success') {
				const data = result.data ?? {};
				lastOriginal = String(data.original ?? pendingOriginal);
				lastNormalized = String(data.normalized ?? pendingNormalized);
				lastChanged = Boolean(data.changed ?? (lastOriginal !== lastNormalized));
			}
		};
	}
</script>

<p class="text-lg text-center pb-5">{message}</p>
{#if isDasher}
	<Prompter withInfo={true} />
{/if}
<form
	bind:this={form}
	class="text-center py-2 px-5"
	id="guessing"
	method="POST"
	action="?/guess.submit"
	use:enhance={enhanceGuessSubmit}
>
	<input type="text" name="session" value={JSON.stringify($data)} hidden />
	<!-- Input area -->
	{#if !isDasher && submitted}
		<p class="font-bold py-2">Guess submitted</p>
		<p class="italic">Your guess: "{submittedGuess}"</p>
		{#if lastChanged && lastNormalized}
			<p class="text-sm mt-3 text-primary-500">
				Note: we cleaned it up to match standard punctuation/casing:
				<span class="italic">"{lastNormalized}"</span>
			</p>
		{/if}
	{/if}
	{#if !isDasher && seconds > 0 && !submitted}
		<!-- Timer -->
		<div class="text-lg text-center mb-4">
			<span>Time remaining: </span>
			<span class="font-bold">{seconds} seconds</span>
			<p class="text-xs py-2 text-primary-400">
				If you fail to submit a guess in time, your guess will not be included in this round.
			</p>
		</div>
		<textarea
			bind:value={guess}
			class="textarea mt-5 mb-5"
			name={GUESS}
			id="guess"
			rows="3"
			placeholder="Your guess..."
			minlength={config.customPrompt.minResponseLength}
			maxlength={config.customPrompt.maxResponseLength}
			required
		/>
		{#if willChange}
			<p class="text-xs text-primary-500 -mt-3 mb-4">
				Will be submitted as: <span class="italic">"{normalizedPreview}"</span>
			</p>
		{/if}
		<br />
		<SlideToggle
			size="sm"
			name={DOUBLE_BLUFF}
			class="text-lg"
			active="bg-primary-500"
			bind:checked={doubleBluff}>Double Bluff Toggle</SlideToggle
		>
		<span class="inline-flex small-gap gap-x-1 items-center justify-center w-full">
			<span class="txt-lg"><Fa icon={faCircleExclamation} /></span>
			<span>See the rules for Double Bluff info</span>
		</span>
		<button
			disabled={submitButtonIsDisabled}
			type="submit"
			class="btn btn-lg {buttonVariant} my-5 rounded-lg w-full">Submit</button
		>
	{:else}
		<!-- Dasher view -->
		<div class="border border-surface-400 my-2" />
		<p class="text-lg">Player status</p>
		<ul>
			{#each Object.entries(guessers) as [_player, info]}
				<li class="inline-flex gap-x-2 w-full items-center">
					<span class="text-xl {info.color}"><Fa icon={info.icon} /></span>
					<span class="text-2xl"> {info.label}</span>
				</li>
			{/each}
		</ul>
	{/if}
</form>
<div class="text-lg text-center pt-5">
	{#if guessing === 0}
		<p class="font-bold">All guesses submitted!</p>
		<p>Wait for the dasher to continue</p>
	{:else if seconds <= 0}
		<p class="font-bold">Time is up!</p>
	{/if}
	{#if isDasher && (guessing === 0 || seconds <= 0)}
		<form method="POST" action="?/guess.continue">
			<input type="text" name={SESSION} value={JSON.stringify($data)} hidden />
			<button type="submit" class="btn variant-filled btn-lg my-5 rounded-lg w-full"
				>Continue</button
			>
		</form>
	{/if}
</div>
