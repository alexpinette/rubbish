<script>
	/**
	 * @typedef {import("$lib/types").Guess} Guess
	 */

	import Prompter from '../parts/Prompter.svelte';
	import { SESSION, USERNAME } from '$lib/constants';
	import { round, session } from '$lib/store';
	import { getContext } from 'svelte';
	import { enhance } from '$app/forms';

	const { data } = session;
	const { dasher, guesses } = round;
	let user = getContext(USERNAME);
	$: userIsDasher = $dasher === user;
	const incorrectGuesses = Object.fromEntries(
		// eslint-disable-next-line no-unused-vars
		Object.entries(/** @type {Object.<string, Guess>} */ ($guesses)).filter(
			([_, guess]) => !guess.correct,
		),
	);
	const options = Object.entries(incorrectGuesses).map((_, index) => `Group ${index + 1}`);
	const defaultOptions = Object.entries(incorrectGuesses).reduce((acc, [user], index) => {
		acc[user] = options[index];
		return acc;
	}, /** @type {Object.<string, string>} */ ({}));

	// Generate color mapping for groups
	const groupColors = [
		'border-primary-500 bg-primary-50 dark:bg-primary-900/20',
		'border-secondary-500 bg-secondary-50 dark:bg-secondary-900/20',
		'border-tertiary-500 bg-tertiary-50 dark:bg-tertiary-900/20',
		'border-success-500 bg-success-50 dark:bg-success-900/20',
		'border-warning-500 bg-warning-50 dark:bg-warning-900/20',
		'border-error-500 bg-error-50 dark:bg-error-900/20',
	];

	$: getGroupColor = (groupName) => {
		const groupIndex = options.indexOf(groupName);
		return groupColors[groupIndex % groupColors.length] || 'border-surface-500 bg-surface-50 dark:bg-surface-900/20';
	};

	$: getGroupBadgeColor = (groupName) => {
		const groupIndex = options.indexOf(groupName);
		const colors = [
			'bg-primary-500 text-white',
			'bg-secondary-500 text-white',
			'bg-tertiary-500 text-white',
			'bg-success-500 text-white',
			'bg-warning-500 text-white',
			'bg-error-500 text-white',
		];
		return colors[groupIndex % colors.length] || 'bg-surface-500 text-white';
	};
</script>

<Prompter withInfo={false} />
{#if !userIsDasher}
	<p class="text-center pt-5">The dasher is grouping responses...</p>
	<p class="text-center text-xs pt-2">
		If several submissions are alike, they will be merged into a one definition
	</p>
{/if}

{#if userIsDasher}
	<p class="pt-5 text-center">Group guesses that mean the same thing</p>
	<p class="text-xs text-center">
		Assigning multiple guesses into a single dropdown category will merge them
	</p>
	<form action="?/group.continue" method="POST" use:enhance>
		<input type="text" name={SESSION} value={JSON.stringify($data)} hidden />
		{#each Object.entries(incorrectGuesses) as [user, guess]}
			<div
				class="card my-5 border-2 transition-all duration-200 {getGroupColor(defaultOptions[user])}"
			>
				<div class="card-header text-xs flex items-center justify-between">
					<span>User: {user}</span>
					<span class="badge {getGroupBadgeColor(defaultOptions[user])} font-bold">
						{defaultOptions[user]}
					</span>
				</div>
				<section class="p-5 italic text-center">{guess.response}</section>
				<label for={user} class="text-center pb-2 w-48 mx-auto block">
					<span class="text-xs text-surface-600 dark:text-surface-400 mb-2 block"
						>Assign to group:</span
					>
					<select
						name={user}
						class="select border-2 border-primary-500 focus:border-primary-600"
						bind:value={defaultOptions[user]}
					>
						{#each options as option}
							<option value={option}>{option}</option>
						{/each}
					</select>
				</label>
			</div>
		{/each}
		<button class="btn variant-filled btn-lg rounded-lg w-full" type="submit">Submit</button>
	</form>
{/if}
