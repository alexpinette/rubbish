<script>
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import { getContext, onMount } from 'svelte';
	import { getDatabase, onValue, ref } from 'firebase/database';
	import { FIREBASE } from '$lib/constants';
	import { goto } from '$app/navigation';

	/** @type {any} */ export let data;

	let room = data.room;
	let joined = data.joined;
	let me = data.me;
	let isHost = data.isHost;

	let name = me?.name || '';
	let unsubscribe = null;

	onMount(() => {
		const firebaseApp = getContext(FIREBASE);
		const db = getDatabase(firebaseApp);
		const roomRef = ref(db, `rooms/${data.roomCode}`);
		unsubscribe = onValue(roomRef, (snapshot) => {
			room = snapshot.val();
			// server load is the source of truth for joined/me/isHost initially,
			// but once realtime data arrives we can infer a bit for UI display.
		});
		return () => unsubscribe?.();
	});
</script>

<main class="max-w-2xl mx-auto">
	<h1 class="h1 text-center pb-2">Room {data.roomCode}</h1>
	<p class="text-center pb-6">
		Open the presenter screen on a TV/laptop:
		<a class="underline" href={`/room/${data.roomCode}/display`} target="_blank" rel="noreferrer">Display view</a>
	</p>

	{#if !room}
		<p class="text-center text-error-600">Room not found.</p>
		<div class="flex justify-center py-6">
			<button type="button" class="btn btn-sm variant-ringed" on:click={() => goto('/')}>Return home</button>
		</div>
	{:else}
		{#if !joined}
			<h2 class="h2 pb-4">Join this room</h2>

			{#if $page.form?.message}
				<p class="text-error-600 pb-3">{$page.form.message}</p>
			{/if}

			<form method="POST" action="?/join" use:enhance class="space-y-4">
				<label class="label">
					<span class="font-bold small-gap">Your Name</span>
					<input class="input" name="username" type="text" bind:value={name} required />
				</label>
				<button type="submit" class="btn btn-xl rounded-lg w-full">Join</button>
			</form>
		{:else}
			<div class="pb-4">
				<p class="text-center">You are <span class="font-bold">{me?.name}</span></p>
				<p class="text-center text-sm opacity-80">
					Status: {room?.meta?.state ?? 'LOBBY'}{room?.meta?.locked ? ' (locked)' : ''}
				</p>
			</div>

			<h2 class="h2 pb-2">Players</h2>
			<ul class="list-disc pl-6">
				{#each Object.entries(room?.players ?? {}) as [pid, p] (pid)}
					{#if p?.status === 'ACTIVE'}
						<li>
							{p.name}
							{#if room?.meta?.hostPlayerId === pid}<span class="text-xs opacity-70"> (host)</span>{/if}
							{#if p.connected}<span class="text-xs opacity-70"> • online</span>{:else}<span class="text-xs opacity-70"> • offline</span>{/if}
						</li>
					{/if}
				{/each}
			</ul>

			{#if isHost && room?.meta?.state === 'LOBBY'}
				<form method="POST" action="?/start" use:enhance class="pt-6">
					<button type="submit" class="btn btn-xl rounded-lg w-full">Start Game (locks room)</button>
				</form>
			{/if}
		{/if}
	{/if}

	<div class="flex justify-center py-10">
		<button type="button" class="btn btn-sm variant-ringed" on:click={() => goto('/')}>Return home</button>
	</div>
</main>
