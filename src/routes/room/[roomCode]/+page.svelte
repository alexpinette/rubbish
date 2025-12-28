<script>
	import { page } from '$app/stores';
	import { getContext, onMount, onDestroy } from 'svelte';
	import { getDatabase, onValue, ref } from 'firebase/database';
	import { FIREBASE, PLAYER_ID } from '$lib/constants';
	import { goto } from '$app/navigation';
	import { startHeartbeat, isPlayerOnline } from '$lib/presence';

	/** @type {any} */ export let data;

	let room = data.room;
	let joined = data.joined;
	let me = data.me;
	let isHost = data.isHost;

	let name = me?.name || '';
	let error = '';
	let busy = false;
	let unsubscribe = null;
	let stopHeartbeat = null;
	let stopPresenceCheck = null;

	onMount(() => {
		const firebaseApp = getContext(FIREBASE);
		const db = getDatabase(firebaseApp);
		const roomRef = ref(db, `rooms/${data.roomCode}`);
		unsubscribe = onValue(roomRef, (snapshot) => {
			room = snapshot.val();
		});

		// Start heartbeat if player is joined
		if (joined && me?.status === 'ACTIVE' && data.playerId) {
			stopHeartbeat = startHeartbeat(data.roomCode, data.playerId);
		}

		// Start presence checking for all players in the room
		// Pass a function that returns the current room state
		stopPresenceCheck = startPresenceCheck(data.roomCode, () => room, () => firebaseApp);

		return () => {
			if (unsubscribe) unsubscribe();
			if (stopHeartbeat) stopHeartbeat();
			if (stopPresenceCheck) stopPresenceCheck();
		};
	});

	onDestroy(() => {
		if (stopHeartbeat) stopHeartbeat();
		if (stopPresenceCheck) stopPresenceCheck();
	});

	async function joinThisRoom(event) {
		event.preventDefault();
		error = '';
		busy = true;

		try {
			const res = await fetch(`/api/rooms/${encodeURIComponent(data.roomCode)}/join`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ name })
			});

			const out = await res.json().catch(() => null);
			if (!res.ok || !out?.ok) {
				error = out?.message ?? 'Failed to join room';
				return;
			}

			// Full navigation keeps server-load and cookies in sync.
			window.location.assign(`/room/${data.roomCode}`);
		} catch (e) {
			error = e?.message ?? 'Failed to join room';
		} finally {
			busy = false;
		}
	}

	async function startGame(event) {
		event.preventDefault();
		error = '';
		busy = true;

		try {
			const res = await fetch(`/api/rooms/${encodeURIComponent(data.roomCode)}/start`, {
				method: 'POST'
			});

			const out = await res.json().catch(() => null);
			if (!res.ok || !out?.ok) {
				error = out?.message ?? 'Failed to start game';
				return;
			}
		} catch (e) {
			error = e?.message ?? 'Failed to start game';
		} finally {
			busy = false;
		}
	}
</script>

<main class="max-w-2xl mx-auto">
	<h1 class="h1 text-center pb-2">Room {data.roomCode}</h1>
	<p class="text-center pb-6">
		Open the presenter screen on a TV/laptop:
		<a class="underline" href={`/room/${data.roomCode}/display`} target="_blank" rel="noreferrer"
			>Display view</a
		>
	</p>

	{#if !room}
		<p class="text-center text-error-600">Room not found.</p>
		<div class="flex justify-center py-6">
			<button type="button" class="btn btn-sm variant-ringed" on:click={() => goto('/')}>Return home</button>
		</div>
	{:else}
		{#if error}
			<p class="text-error-600 pb-3">{error}</p>
		{/if}

		{#if !joined}
			<h2 class="h2 pb-4">Join this room</h2>

			<form class="space-y-4" on:submit={joinThisRoom}>
				<label class="label">
					<span class="font-bold small-gap">Your Name</span>
					<input class="input" name="username" type="text" bind:value={name} required />
				</label>
				<button type="submit" class="btn btn-xl rounded-lg w-full" disabled={busy}>
					{busy ? 'Joining…' : 'Join'}
				</button>
			</form>
		{:else}
			<div class="pb-4">
				<p class="text-center">
					You are <span class="font-bold">{me?.name}</span>
				</p>
				<p class="text-center text-sm opacity-80">
					Status: {room?.meta?.state ?? 'LOBBY'}{room?.meta?.locked ? ' (locked)' : ''}
				</p>
			</div>

			<h2 class="h2 pb-2">Players</h2>
			<ul class="list-disc pl-6">
				{#each Object.entries(room?.players ?? {}) as [pid, p] (pid)}
					{#if p?.status === 'ACTIVE'}
						{@const online = isPlayerOnline(p?.lastSeenAt)}
						<li>
							{p.name}
							{#if room?.meta?.hostPlayerId === pid}<span class="text-xs opacity-70"> (host)</span>{/if}
							{#if online}
								<span class="text-xs opacity-70 text-success-500"> • online</span>
							{:else}
								<span class="text-xs opacity-70 text-error-500"> • offline</span>
							{/if}
						</li>
					{/if}
				{/each}
			</ul>

			{#if isHost && room?.meta?.state === 'LOBBY'}
				<form class="pt-6" on:submit={startGame}>
					<button type="submit" class="btn btn-xl rounded-lg w-full" disabled={busy}>
						{busy ? 'Starting…' : 'Start Game (locks room)'}
					</button>
				</form>
			{/if}
		{/if}
	{/if}

	<div class="flex justify-center py-10">
		<button type="button" class="btn btn-sm variant-ringed" on:click={() => goto('/')}>Return home</button>
	</div>
</main>
