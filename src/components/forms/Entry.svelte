<script>
	import config from '$lib/config';
	import { getButtonVariant, handleError } from '$lib/utils';
	import { normalizeUsername } from '$lib/normalize';
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import { getToastStore } from '@skeletonlabs/skeleton';

	const toastStore = getToastStore();
	let usernameRegex = new RegExp(`^[A-Z0-9]{1,${config.maxUsernameLength}}$`);
	export let submitButtonEnabled = true;
	export let username = '';
	export let isHost = false; // Host doesn't need username
	$: isValidUsername = isHost || usernameRegex.test(username);
	$: isButtonDisabled = !isValidUsername || !submitButtonEnabled;
	$: buttonVariant = getButtonVariant(isButtonDisabled);
	$: if ($page.form?.message) handleError(toastStore, new Error($page.form.message));

	function onUsernameInput(e) {
		username = normalizeUsername(e.currentTarget?.value ?? '');
	}
</script>

<form method="POST" action="?/enter" use:enhance on:submit={() => localStorage.clear()}>
	<!-- Username entry - only show for non-hosts -->
	{#if !isHost}
		<label class="label">
			<span class="font-bold small-gap">Your Username</span>
			<input
				class="input"
				title="username"
				name="username"
				type="text"
				placeholder="PLAYER1"
				bind:value={username}
				on:input={onUsernameInput}
				autocomplete="off"
				autocapitalize="characters"
				maxlength={config.maxUsernameLength}
				required
			/>
			{#if !isValidUsername && username.length > 0}
				<p class="text-sm italic text-tertiary-700">
					{config.maxUsernameLength} characters max. Only A–Z and 0–9.
				</p>
			{/if}
		</label>
	{:else}
		<!-- Hidden field for host - use a default or empty value -->
		<input type="hidden" name="username" value="Host" />
	{/if}
	<slot />
	<!-- Submit button -->
	<button
		type="submit"
		disabled={isButtonDisabled}
		class="{buttonVariant} btn-xl rounded-lg w-full mb-5">Go!</button
	>
	{#if isButtonDisabled && !isHost}
		<p class="text-sm italic text-center pb-2 text-tertiary-700">
			Valid username required to proceed!
		</p>
	{/if}
</form>
<div class="flex justify-center py-3">
	<button type="button" class="btn btn-sm variant-ringed" on:click={() => goto('/')}
		>Return home</button
	>
</div>

 