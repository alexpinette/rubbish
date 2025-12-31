<script>
	import { RadioGroup, RadioItem } from '@skeletonlabs/skeleton';
	import { SESSION, USERNAME } from '$lib/constants';
	import { round, session } from '$lib/store';
	import { getContext } from 'svelte';
	import { getCategoryWords } from '$lib/utils';
	import Prompter from '../parts/Prompter.svelte';
	import Fa from 'svelte-fa';
	import { faXmarkCircle, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
	import { enhance } from '$app/forms';
	const { dasher, guesses, category } = round;
	const { data } = session;
	let user = getContext(USERNAME);
	const userSelections = Object.entries($guesses).reduce((acc, [user, guess]) => {
		acc[user] = guess.correct ? 1 : 0;
		return acc;
	}, /** @type {Object.<string, number>} */ ({}));
	$: userIsDasher = $dasher === user;
	$: ({ response } = getCategoryWords($category));
</script>

{#if userIsDasher}
	<Prompter withInfo={true} />
{/if}
{#if !userIsDasher}
	<p class="text-center pt-5">The dasher is marking responses...</p>
	<p class="text-center pt-5 text-sm">
		If your response is close enough to the official answer, it will be marked by the dasher as
		correct and you will be awarded points for it!
	</p>
{/if}
{#if userIsDasher}
	<p class="text-center pt-5">Mark correct responses</p>
	<p class="text-center text-sm">
		Only if the {response} is close enough to the official version given above, then mark it as correct
	</p>
	<form action="?/mark.continue" method="POST" use:enhance>
		<input type="text" name={SESSION} value={JSON.stringify($data)} hidden />
		{#each Object.entries($guesses) as [user, guess]}
			<div
				class="card my-5 border-2 transition-all duration-200 {userSelections[user] === 1
					? 'border-success-500 bg-success-50 dark:bg-success-900/20'
					: 'border-error-500 bg-error-50 dark:bg-error-900/20'}"
			>
				<div class="card-header text-xs">User: {user}</div>
				<section class="p-4 italic">{guess.response}</section>
				<div class="mx-auto text-center">
					<RadioGroup active="variant-filled-secondary" class="mb-5 flex gap-4 justify-center">
						<RadioItem
							bind:group={userSelections[user]}
							name={user}
							value={1}
							class="transition-all duration-200 {userSelections[user] === 1
								? 'ring-2 ring-success-500 ring-offset-2 rounded-full'
								: ''}"
						>
							<Fa
								icon={faCheckCircle}
								size="lg"
								class={userSelections[user] === 1
									? 'text-success-600 dark:text-success-400'
									: 'text-surface-600 dark:text-surface-400'}
							/>
						</RadioItem>
						<RadioItem
							bind:group={userSelections[user]}
							name={user}
							value={0}
							class="transition-all duration-200 {userSelections[user] === 0
								? 'ring-2 ring-error-500 ring-offset-2 rounded-full'
								: ''}"
						>
							<Fa
								icon={faXmarkCircle}
								size="lg"
								class={userSelections[user] === 0
									? 'text-error-600 dark:text-error-400'
									: 'text-surface-600 dark:text-surface-400'}
							/>
						</RadioItem>
					</RadioGroup>
					{#if userSelections[user] === 1}
						<p class="text-xs text-success-600 dark:text-success-400 font-semibold mt-2">
							Marked as Correct
						</p>
					{:else if userSelections[user] === 0}
						<p class="text-xs text-error-600 dark:text-error-400 font-semibold mt-2">
							Marked as Incorrect
						</p>
					{/if}
				</div>
			</div>
		{/each}
		<button class="btn variant-filled btn-lg rounded-lg w-full" type="submit">Submit</button>
	</form>
{/if}
