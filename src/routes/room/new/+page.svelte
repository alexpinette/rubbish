<script>
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
</script>

<main>
	<h1 class="h1 text-center pb-6">Host a Room</h1>

	{#if $page.form?.message}
		<p class="text-center text-error-600 pb-4">{$page.form.message}</p>
	{/if}

	<form method="POST" action="?/create" use:enhance class="max-w-md mx-auto space-y-4">
		<label class="label">
			<span class="font-bold small-gap">Your Name</span>
			<input
				class="input"
				name="username"
				type="text"
				placeholder="Alex"
				required
			/>
		</label>

		<button type="submit" class="btn btn-xl rounded-lg w-full">Create Room</button>
	</form>

	<div class="flex justify-center py-6">
		<button type="button" class="btn btn-sm variant-ringed" on:click={() => goto('/')}>Return home</button>
	</div>
</main>
