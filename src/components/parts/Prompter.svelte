<script>
	import { USERNAME } from '$lib/constants';
	import { round } from '$lib/store';
	import { getContext } from 'svelte';
	import Fa from 'svelte-fa';
	import { faCircleExclamation } from '@fortawesome/free-solid-svg-icons';
	import { getCategoryWords } from '$lib/utils';

	$: ({ response: responseDescriptor } = getCategoryWords($category));
	const {
		dasher,
		category,
		prompt: roundPrompt,
		response: roundResponse,
		custom: isCustomPrompt,
	} = round;

	/** @type {boolean} */ export let withInfo;
	/** @type {boolean} */ export let isHostView = false;
	let user = getContext(USERNAME);
	$: userIsDasher = $dasher === user;
</script>

<div class="prompter-box" class:host-view={isHostView}>
	{#if $isCustomPrompt}
		<p class="custom-badge">Custom Prompt</p>
	{/if}
	<h2 class="prompt-text">{$roundPrompt}</h2>
	{#if userIsDasher && withInfo}
		<div class="response-text">{$roundResponse}</div>
	{/if}
	{#if withInfo}
		<div class="info-text">
			<Fa icon={faCircleExclamation} />
			{#if userIsDasher}
				<span>As <span class="text-primary-400">dasher</span> only you can see the {responseDescriptor}</span>
			{:else}
				<span>Only <span class="text-primary-400">dasher</span> can see the {responseDescriptor}</span>
			{/if}
		</div>
	{/if}
	<div class="category-text">
		<span>Category: </span>
		<span class="category-name">{$category}</span>
	</div>
</div>

<!-- eslint-disable -->
<style>
	.prompter-box {
		@apply bg-surface-100 dark:bg-surface-800 border-2 border-primary-500 rounded-lg text-center;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
		max-width: 100%;
		margin: 0 auto;
		padding: 1.5rem 1.25rem;
		position: relative;
	}

	.prompter-box.host-view {
		box-shadow: 0 8px 12px -2px rgba(0, 0, 0, 0.15), 0 4px 6px -1px rgba(0, 0, 0, 0.1);
		max-width: 800px;
		padding: 3rem 2.5rem;
	}

	.custom-badge {
		@apply text-xs underline italic mb-2 text-surface-500 dark:text-surface-400;
	}

	.prompter-box.host-view .custom-badge {
		@apply mb-3;
	}

	.prompt-text {
		@apply text-primary-600 dark:text-primary-400 font-bold mb-3;
		font-size: clamp(1.25rem, 2.5vh, 1.5rem);
		line-height: 1.3;
		letter-spacing: -0.01em;
	}

	.prompter-box.host-view .prompt-text {
		font-size: clamp(1.75rem, 4vh, 2.5rem);
		letter-spacing: -0.02em;
		@apply mb-4;
	}

	.response-text {
		@apply text-surface-800 dark:text-surface-200 italic mb-3;
		font-size: clamp(1rem, 2vh, 1.125rem);
		line-height: 1.4;
		font-weight: 500;
	}

	.prompter-box.host-view .response-text {
		font-size: clamp(1.25rem, 2.5vh, 1.75rem);
		@apply mb-4;
	}

	.info-text {
		@apply inline-flex gap-x-2 items-center justify-center w-full text-xs mb-3 text-surface-600 dark:text-surface-400;
		padding-top: 0.75rem;
	}

	.prompter-box.host-view .info-text {
		@apply mb-5;
		padding-top: 1rem;
	}

	.category-text {
		@apply text-sm text-surface-600 dark:text-surface-400 pt-3 border-t border-surface-300 dark:border-surface-700;
		margin-top: 0.75rem;
	}

	.prompter-box.host-view .category-text {
		@apply pt-4 border-t-2 border-primary-300 dark:border-primary-700;
		margin-top: 1rem;
	}

	.category-name {
		@apply text-primary-500 dark:text-primary-400 font-semibold;
		font-size: clamp(0.875rem, 1.8vh, 1rem);
	}

	.prompter-box.host-view .category-name {
		@apply font-bold;
		font-size: clamp(1rem, 2vh, 1.25rem);
	}
</style>
