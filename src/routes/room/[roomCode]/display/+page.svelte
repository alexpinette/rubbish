<script>
	import { getContext, onMount } from 'svelte';
	import { getDatabase, onValue, ref } from 'firebase/database';
	import { FIREBASE } from '$lib/constants';

	/** @type {{roomCode: string, room: any}} */ export let data;

	let room = data.room;

	onMount(() => {
		const firebaseApp = getContext(FIREBASE);
		const db = getDatabase(firebaseApp);
		const roomRef = ref(db, `rooms/${data.roomCode}`);
		const unsubscribe = onValue(roomRef, (snapshot) => {
			room = snapshot.val();
		});
		return () => unsubscribe?.();
	});
</script>

<main class="max-w-4xl mx-auto">
	<h1 class="h1 text-center pb-2">Room {data.roomCode}</h1>

	{#if !room}
		<p class="text-center text-error-600">Room not found.</p>
	{:else}
		<div class="text-center pb-6">
			<p class="text-lg">Join at:</p>
			<p class="text-3xl font-bold">/room/join</p>
			<p class="text-lg pt-2">Code:</p>
			<p class="text-6xl font-extrabold tracking-widest">{data.roomCode}</p>
		</div>

		<h2 class="h2 pb-2">Players</h2>
		<div class="grid grid-cols-2 md:grid-cols-3 gap-3">
			{#each Object.entries(room?.players ?? {}) as [pid, p] (pid)}
				{#if p?.status === 'ACTIVE'}
					<div class="card p-3">
						<div class="font-bold">{p.name}</div>
						<div class="text-xs opacity-70">
							{room?.meta?.hostPlayerId === pid ? 'Host • ' : ''}{p.connected ? 'online' : 'offline'}
						</div>
					</div>
				{/if}
			{/each}
		</div>

		<div class="pt-8 text-center opacity-80">
			State: <span class="font-semibold">{room?.meta?.state ?? 'LOBBY'}</span>
			{#if room?.meta?.locked} (locked){/if}
		</div>
	{/if}
</main>
