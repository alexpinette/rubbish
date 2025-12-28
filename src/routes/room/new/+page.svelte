<script>
	import { goto } from '$app/navigation';

	let name = '';
	let error = '';
	let busy = false;

	async function createRoom(event) {
		event.preventDefault();
		error = '';
		busy = true;

		try {
			const res = await fetch('/api/rooms', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ name })
			});

			const data = await res.json().catch(() => null);
			if (!res.ok || !data?.ok) {
				error = data?.message ?? 'Failed to create room';
				return;
			}

			await goto(`/room/${data.roomCode}`);
		} catch (e) {
			error = e?.message ?? 'Failed to create room';
		} finally {
			busy = false;
		}
	}
</script>

<main>
	<h1 class="h1 text-center pb-6">Host a Room</h1>

	{#if error}
		<p class="text-center text-error-600 pb-4">{error}</p>
	{/if}

	<form class="max-w-md mx-auto space-y-4" on:submit={createRoom}>
		<label class="label">
			<span class="font-bold small-gap">Your Name</span>
			<input class="input" name="username" type="text" placeholder="Alex" bind:value={name} required />
		</label>

		<button type="submit" class="btn btn-xl rounded-lg w-full" disabled={busy}>
			{busy ? 'Creating…' : 'Create Room'}
		</button>
	</form>

	<div class="flex justify-center py-6">
		<button type="button" class="btn btn-sm variant-ringed" on:click={() => goto('/')}>Return home</button>
	</div>
</main>
