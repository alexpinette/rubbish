<script>
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	let roomCode = $page.url.searchParams.get('code') || '';
</script>

<main>
	<h1 class="h1 text-center pb-6">Join a Room</h1>

	{#if $page.form?.message}
		<p class="text-center text-error-600 pb-4">{$page.form.message}</p>
	{/if}

	<form method="POST" action="?/enter" use:enhance class="max-w-md mx-auto space-y-4">
		<label class="label">
			<span class="font-bold small-gap">Room Code</span>
			<input
				class="input"
				name="roomCode"
				type="text"
				placeholder="ABCD12"
				bind:value={roomCode}
				required
			/>
		</label>

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

		<button type="submit" class="btn btn-xl rounded-lg w-full">Join</button>
	</form>

	<div class="flex justify-center py-6">
		<button type="button" class="btn btn-sm variant-ringed" on:click={() => goto('/')}>Return home</button>
	</div>
</main>
