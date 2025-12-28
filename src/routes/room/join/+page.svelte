<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	let roomCode = $page.url.searchParams.get('code') || '';
	let name = '';
	let error = '';
	let busy = false;

	function normalize(code) {
		return String(code || '').trim().toUpperCase();
	}

	async function joinRoom(event) {
		event.preventDefault();
		error = '';
		busy = true;

		const code = normalize(roomCode);

		try {
			const res = await fetch(`/api/rooms/${encodeURIComponent(code)}/join`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ name })
			});

			const data = await res.json().catch(() => null);
			if (!res.ok || !data?.ok) {
				error = data?.message ?? 'Failed to join room';
				return;
			}

			// Full navigation keeps server-load and cookies in sync.
			window.location.assign(`/room/${code}`);
		} catch (e) {
			error = e?.message ?? 'Failed to join room';
		} finally {
			busy = false;
		}
	}
</script>

<main>
	<h1 class="h1 text-center pb-6">Join a Room</h1>

	{#if error}
		<p class="text-center text-error-600 pb-4">{error}</p>
	{/if}

	<form class="max-w-md mx-auto space-y-4" on:submit={joinRoom}>
		<label class="label">
			<span class="font-bold small-gap">Room Code</span>
			<input class="input" name="roomCode" type="text" placeholder="ABCD12" bind:value={roomCode} required />
		</label>

		<label class="label">
			<span class="font-bold small-gap">Your Name</span>
			<input class="input" name="username" type="text" placeholder="Alex" bind:value={name} required />
		</label>

		<button type="submit" class="btn btn-xl rounded-lg w-full" disabled={busy}>
			{busy ? 'Joining…' : 'Join'}
		</button>
	</form>

	<div class="flex justify-center py-6">
		<button type="button" class="btn btn-sm variant-ringed" on:click={() => goto('/')}>Return home</button>
	</div>
</main>
